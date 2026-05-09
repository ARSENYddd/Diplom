"""
Тройной гибрид: ARIMA + GARCH + LSTM.

Самый полный гибрид — три уровня моделирования:
  1. ARIMA(auto, AIC)  → линейный тренд  →  остатки e¹_t = y_t − ŷ_ARIMA_t
  2. GARCH(1,1) на e¹  → условная дисперсия σ²_t (режим волатильности остатков)
  3. LSTM принимает [e¹(t), σ²(t)] за window дней → предсказывает e¹_t
  4. Итог:  ŷ_t = ŷ_ARIMA_t + ŷ_LSTM(остатки)

ARIMA захватывает линейный тренд, GARCH определяет режим волатильности,
а LSTM устраняет нелинейные паттерны в остатках с учётом волатильности.
"""
import numpy as np
from pmdarima import auto_arima
from sklearn.preprocessing import MinMaxScaler
from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all
from services.forecast_utils import future_trading_dates, bootstrap_future, bootstrap_scenarios
from models._common import (
    HAS_TF, _build_sequences_2d, build_lstm_2d, fit_garch_cond_var,
    make_early_stopping, get_seed,
)
from arch import arch_model


def run_triple_hybrid(ticker: str, start: str, end: str, window: int = 60, n_future: int = 0, interval: str = "1d") -> dict:
    if not HAS_TF:
        raise RuntimeError("TensorFlow is not installed")

    df = load_data(ticker, start, end, interval)
    train_df, test_df = train_test_split_series(df)

    train_prices = train_df["Close"].values.astype(float).flatten()
    test_prices  = test_df["Close"].values.astype(float).flatten()

    window = min(window, max(5, len(train_prices) // 3))
    if len(train_prices) <= window:
        raise ValueError(
            f"Недостаточно данных: {len(train_prices)} точек, окно={window}."
        )

    # ── Уровень 1: ARIMA → остатки ─────────────────────────────────────────────
    arima = auto_arima(
        train_prices, seasonal=False, information_criterion="aic",
        stepwise=True, suppress_warnings=True, error_action="ignore",
        max_p=5, max_q=5, d=1,
    )
    arima_insample  = arima.predict_in_sample()
    n_fitted        = len(arima_insample)
    train_aligned   = train_prices[-n_fitted:]
    train_residuals = train_aligned - arima_insample  # e¹_t

    # ── Уровень 2: GARCH на остатках → σ²_t ───────────────────────────────────
    res_cond_var = fit_garch_cond_var(train_residuals)   # len = len(train_residuals)

    # ── Уровень 3: LSTM на [e¹_t, σ²_t] ──────────────────────────────────────
    res_scaler = MinMaxScaler(feature_range=(-1, 1))
    var_scaler = MinMaxScaler(feature_range=(0, 1))

    res_sc  = res_scaler.fit_transform(train_residuals.reshape(-1, 1))
    var_sc  = var_scaler.fit_transform(res_cond_var.reshape(-1, 1))
    train_2d = np.hstack([res_sc, var_sc])   # (N, 2)

    X_train, y_train = _build_sequences_2d(train_2d, window)

    batch_size = min(32, max(1, len(X_train) // 4))
    val_split  = 0.1 if len(X_train) >= 20 else 0.0

    lstm = build_lstm_2d(window)
    es   = make_early_stopping(val_split)
    lstm.fit(X_train, y_train, epochs=50, batch_size=batch_size,
             validation_split=val_split, callbacks=[es], verbose=0)

    # ── Walk-forward backtest ──────────────────────────────────────────────────
    # Сохраняем историю остатков и волатильности для скользящего окна
    history_res = list(train_residuals)
    test_pred   = []

    for i in range(len(test_prices)):
        # ARIMA: прогноз на 1 шаг
        arima_fc = float(arima.predict(n_periods=1)[0])

        # GARCH на текущей истории остатков → σ² последнего шага
        hist_arr = np.array(history_res)
        try:
            step_var = float(fit_garch_cond_var(hist_arr)[-1])
        except Exception:
            step_var = float(np.var(hist_arr[-window:]))

        # Окно из history
        win_res = np.array(history_res[-window:]).reshape(-1, 1)
        win_var = np.full((window, 1), step_var)

        win_res_sc = res_scaler.transform(win_res)
        win_var_sc = var_scaler.transform(win_var)
        win_2d     = np.hstack([win_res_sc, win_var_sc]).reshape(1, window, 2)

        lstm_corr_sc = float(lstm.predict(win_2d, verbose=0)[0, 0])
        lstm_corr    = float(res_scaler.inverse_transform([[lstm_corr_sc]])[0, 0])

        pred = arima_fc + lstm_corr
        test_pred.append(pred)

        actual_res = float(test_prices[i]) - arima_fc
        history_res.append(actual_res)
        arima.update([float(test_prices[i])])

    test_pred = np.array(test_pred)
    metrics   = compute_all(test_prices, test_pred)
    residuals = test_prices - test_pred

    train_dates = [d.strftime("%Y-%m-%d") for d in train_df.index]
    test_dates  = [d.strftime("%Y-%m-%d") for d in test_df.index]

    all_dates  = train_dates + test_dates
    all_actual = train_prices.tolist() + test_prices.tolist()
    all_pred   = [None] * len(train_dates) + test_pred.tolist()
    test_from  = len(train_dates)
    future_from = len(all_dates)

    # ── Future forecast ────────────────────────────────────────────────────────
    seed = get_seed(ticker)
    scenarios = []
    if n_future > 0:
        arima_future = arima.predict(n_periods=n_future)

        # GARCH forecast для будущих σ² остатков
        hist_res_arr = np.array(history_res)
        try:
            gm   = arch_model(hist_res_arr * 100, vol="Garch", p=1, q=1, dist="normal")
            gres = gm.fit(disp="off", show_warning=False)
            gfc  = gres.forecast(horizon=n_future)
            future_var = gfc.variance.iloc[-1].values
        except Exception:
            future_var = np.full(n_future, float(np.var(hist_res_arr[-window:])))

        rolling = list(train_2d[-window:])
        base_prices = []

        for i in range(n_future):
            x = np.array(rolling[-window:]).reshape(1, window, 2)
            lstm_corr_sc = float(lstm.predict(x, verbose=0)[0, 0])
            lstm_corr    = float(res_scaler.inverse_transform([[lstm_corr_sc]])[0, 0])
            base_prices.append(float(arima_future[i]) + lstm_corr)

            next_var_sc = float(var_scaler.transform([[future_var[i]]])[0, 0])
            rolling.append([lstm_corr_sc, next_var_sc])

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
            "name": "ARIMA+GARCH+LSTM",
            "arima_order": list(arima.order),
            "garch_order": [1, 1],
            "lstm_architecture": "2×LSTM(64) + Dropout(0.2)",
            "input_features": ["остатки ARIMA e¹", "σ² остатков (GARCH)"],
            "window": window,
            "description": "Тройной гибрид: линейный тренд + режим волатильности + нелинейность"
            + (f" + {n_future}-day прогноз" if n_future else ""),
        },
    }
