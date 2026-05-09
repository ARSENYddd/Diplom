"""
Гибридная модель GARCH + LSTM.

GARCH обогащает LSTM информацией о текущем режиме волатильности:
вместо одномерного входа [цена(t)] модель получает двумерный вход
[цена(t), σ²(t)], где σ²(t) — условная дисперсия из GARCH(1,1).
Это позволяет нейронной сети адаптировать прогноз к периодам высокой
и низкой волатильности.

Архитектура LSTM: 2×LSTM(64) + Dropout(0.2) + Dense(1), input_shape=(window, 2)
"""
import numpy as np
from arch import arch_model
from sklearn.preprocessing import MinMaxScaler
from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all
from services.forecast_utils import future_trading_dates, bootstrap_future, bootstrap_scenarios
from models._common import (
    HAS_TF, _build_sequences_2d, build_lstm_2d, fit_garch_cond_var,
    make_early_stopping, get_seed,
)


def _fit_garch_volatility(prices: np.ndarray) -> np.ndarray:
    """
    Обучить GARCH(1,1) на лог-доходностях цен и вернуть
    условную дисперсию σ²_t для каждого шага (aligned with prices[1:]).
    """
    log_returns = np.diff(np.log(prices)) * 100
    # log_returns уже масштабированы (*100), поэтому scale=1.0
    return fit_garch_cond_var(log_returns, scale=1.0)


def run_garch_lstm(ticker: str, start: str, end: str, window: int = 60, n_future: int = 0, interval: str = "1d") -> dict:
    if not HAS_TF:
        raise RuntimeError("TensorFlow is not installed")

    df = load_data(ticker, start, end, interval)
    train_df, test_df = train_test_split_series(df)

    train_prices = train_df["Close"].values.astype(float).flatten()
    test_prices  = test_df["Close"].values.astype(float).flatten()

    window = min(window, max(5, len(train_prices) // 3))
    if len(train_prices) <= window + 1:
        raise ValueError(
            f"Недостаточно данных: {len(train_prices)} точек, окно={window}."
        )

    # ── Step 1: GARCH — условная волатильность на обучающей выборке ───────────
    train_cond_var = _fit_garch_volatility(train_prices)
    # Сдвиг: cond_var[i] соответствует prices[i+1], уравниваем размеры
    # train_cond_var имеет len(train_prices)-1 элементов → берём с индекса 1
    prices_aligned = train_prices[1:]
    var_aligned    = train_cond_var            # (N-1,)

    # ── Step 2: Масштабирование обеих колонок ──────────────────────────────────
    price_scaler = MinMaxScaler(feature_range=(0, 1))
    var_scaler   = MinMaxScaler(feature_range=(0, 1))

    prices_sc = price_scaler.fit_transform(prices_aligned.reshape(-1, 1))
    var_sc    = var_scaler.fit_transform(var_aligned.reshape(-1, 1))

    # Двумерный вход: [scaled_price, scaled_var]
    train_2d = np.hstack([prices_sc, var_sc])   # (N-1, 2)

    X_train, y_train = _build_sequences_2d(train_2d, window)

    batch_size = min(32, max(1, len(X_train) // 4))
    val_split  = 0.1 if len(X_train) >= 20 else 0.0

    lstm = build_lstm_2d(window, n_features=2)
    es   = make_early_stopping(val_split)
    lstm.fit(X_train, y_train, epochs=50, batch_size=batch_size,
             validation_split=val_split, callbacks=[es], verbose=0)

    # ── Step 3: Walk-forward backtest ─────────────────────────────────────────
    all_prices = np.concatenate([train_prices, test_prices])

    # Пересчитаем GARCH на всём периоде сразу для простоты
    all_cond_var = _fit_garch_volatility(all_prices)  # len = len(all_prices)-1

    # Индекс: all_cond_var[i] → all_prices[i+1]
    # Для теста нам нужны all_prices[n_train], ..., all_prices[n_train+n_test-1]
    # Индексы в all_cond_var: n_train-1, ..., n_train+n_test-2
    n_train = len(train_prices)

    # Составим выровненные массивы для всего ряда (начиная с prices[1])
    prices_all_aligned = all_prices[1:]          # len = len(all_prices)-1
    var_all_aligned    = all_cond_var            # len = len(all_prices)-1

    prices_all_sc = price_scaler.transform(prices_all_aligned.reshape(-1, 1))
    var_all_sc    = var_scaler.transform(var_all_aligned.reshape(-1, 1))
    data_all_2d   = np.hstack([prices_all_sc, var_all_sc])

    # Тест начинается с индекса n_train в all_prices → n_train-1 в aligned
    test_start_aligned = n_train - 1

    test_pred_sc = []
    for i in range(len(test_prices)):
        # Окно заканчивается на aligned-индексе test_start_aligned + i (не включительно)
        win_end   = test_start_aligned + i
        win_start = win_end - window
        if win_start < 0:
            break
        x = data_all_2d[win_start: win_end].reshape(1, window, 2)
        test_pred_sc.append(lstm.predict(x, verbose=0)[0, 0])

    n_pred = len(test_pred_sc)
    test_prices_used = test_prices[:n_pred]

    test_pred = price_scaler.inverse_transform(
        np.array(test_pred_sc).reshape(-1, 1)
    ).flatten()

    metrics   = compute_all(test_prices_used, test_pred)
    residuals = test_prices_used - test_pred

    train_dates = [d.strftime("%Y-%m-%d") for d in train_df.index]
    test_dates  = [d.strftime("%Y-%m-%d") for d in test_df.index[:n_pred]]

    all_dates  = train_dates + test_dates
    all_actual = train_prices.tolist() + test_prices_used.tolist()
    all_pred   = [None] * len(train_dates) + test_pred.tolist()
    test_from  = len(train_dates)
    future_from = len(all_dates)

    # ── Future forecast ────────────────────────────────────────────────────────
    seed = get_seed(ticker)
    scenarios = []
    if n_future > 0:
        # GARCH forecast для будущих волатильностей
        full_log_ret = np.diff(np.log(all_prices)) * 100
        gm    = arch_model(full_log_ret, vol="Garch", p=1, q=1, dist="normal")
        gres  = gm.fit(disp="off", show_warning=False)
        gfc   = gres.forecast(horizon=n_future)
        future_var = (gfc.variance.iloc[-1].values)  # σ²

        rolling = list(data_all_2d[-window:])
        base_prices = []
        for i in range(n_future):
            x = np.array(rolling[-window:]).reshape(1, window, 2)
            pred_sc = float(lstm.predict(x, verbose=0)[0, 0])
            pred_price = float(price_scaler.inverse_transform([[pred_sc]])[0, 0])
            base_prices.append(pred_price)
            # следующий шаг: predicted price + future volatility
            next_var_sc = float(var_scaler.transform([[future_var[i]]])[0, 0])
            rolling.append([pred_sc, next_var_sc])

        base_prices  = np.array(base_prices)
        future_dates = future_trading_dates(test_dates[-1], n_future)
        all_dates   += future_dates
        all_actual  += [None] * n_future
        all_pred    += bootstrap_future(base_prices, residuals, seed=seed).tolist()
        scenarios    = bootstrap_scenarios(base_prices, residuals, base_seed=seed)

    return {
        "dates": all_dates,
        "actual": all_actual,
        "predicted": all_pred,
        "scenarios": scenarios,
        "test_from_index": test_from,
        "future_from_index": future_from if n_future > 0 else None,
        "metrics": metrics,
        "model_info": {
            "name": "GARCH+LSTM",
            "garch_order": [1, 1],
            "lstm_architecture": "2×LSTM(64) + Dropout(0.2)",
            "input_features": ["цена", "условная дисперсия σ²"],
            "window": window,
            "description": "GARCH(1,1) даёт σ² как признак для LSTM"
            + (f" + {n_future}-day прогноз" if n_future else ""),
        },
    }
