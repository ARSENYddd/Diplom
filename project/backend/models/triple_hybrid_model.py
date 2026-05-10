"""
Тройной гибрид v2: ARIMA + GARCH + LSTM.

Архитектура (три уровня):
  1. ARIMA(auto, AIC)  → линейный тренд  → остатки e¹_t
  2. GARCH(1,1) на e¹  → условная волатильность σ_t
  3. CNN-BiLSTM принимает [e¹_t, σ_t, z_t = e¹/σ] за window шагов → ŷ_e¹_t
  4. Итог: ŷ_t = ŷ_ARIMA_t + ŷ_LSTM(остатки)

Исправления v2 (относительно v1):
  1. GARCH fit один раз → rolling GARCH-рекурсия O(n) вместо O(n²) ре-фита
  2. win_var → реальный rolling window σ²_t, а не константа
  3. StandardScaler вместо MinMaxScaler (устойчив к выбросам в остатках)
  4. 3 признака: [e¹_t, σ_t, z_t = e¹/σ] — z-score волатильности
  5. CNN-BiLSTM + Huber loss + ReduceLROnPlateau; epochs=100, patience=10
  6. Поддержка intraday дат (%Y-%m-%d %H:%M)
  7. Clip предсказанных residuals в future-буфере (предотвращает взрыв σ²)
"""
import numpy as np
from pmdarima import auto_arima
from sklearn.preprocessing import StandardScaler
from arch import arch_model as _arch_model

from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all
from services.forecast_utils import future_trading_dates, bootstrap_future, bootstrap_scenarios
from models._common import HAS_TF, get_seed

# ── Константы ─────────────────────────────────────────────────────────────────
N_FEATURES   = 3          # [residual, volatility, standardised z]
GARCH_SCALE  = 100.0      # ARCH-библиотека стабильнее на данных в % масштабе


# ── GARCH helpers ──────────────────────────────────────────────────────────────

def _fit_garch(residuals: np.ndarray) -> tuple:
    """
    Обучить GARCH(1,1) один раз на train-остатках.
    Возвращает (result, omega, alpha, beta).
    Все параметры — в масштабе (residuals * GARCH_SCALE).
    """
    gm  = _arch_model(residuals * GARCH_SCALE, vol="Garch", p=1, q=1, dist="normal")
    res = gm.fit(disp="off", show_warning=False)
    omega = float(res.params["omega"])
    alpha = float(res.params["alpha[1]"])
    beta  = float(res.params["beta[1]"])
    return res, omega, alpha, beta


def _garch_step(omega: float, alpha: float, beta: float,
                eps_orig: float, sigma2_sc: float) -> float:
    """
    Один шаг GARCH-рекурсии в масштабированном пространстве:
        σ²_{t+1,sc} = ω + α·(ε_t·scale)² + β·σ²_{t,sc}

    eps_orig  — остаток в оригинальных единицах
    sigma2_sc — σ² в масштабированных единицах (residuals*GARCH_SCALE)²
    Возвращает новый sigma2_sc.
    """
    eps_sc = eps_orig * GARCH_SCALE
    return omega + alpha * eps_sc ** 2 + beta * sigma2_sc


# ── LSTM architecture ──────────────────────────────────────────────────────────

def _build_model(window: int, n_features: int = N_FEATURES):
    """
    Causal Conv1D x2 → Bidirectional LSTM(64) → Bidirectional LSTM(32) → Dense(1).
    Huber loss устойчив к редким выбросам в остатках ARIMA.
    """
    from tensorflow.keras.models import Model
    from tensorflow.keras.layers import Input, Conv1D, Dropout, Bidirectional, LSTM, Dense
    from tensorflow.keras.optimizers import Adam

    inp = Input(shape=(window, n_features))
    x   = Conv1D(32, kernel_size=3, padding="causal", activation="relu")(inp)
    x   = Dropout(0.1)(x)
    x   = Bidirectional(LSTM(64, return_sequences=True))(x)
    x   = Dropout(0.2)(x)
    x   = Bidirectional(LSTM(32))(x)
    x   = Dropout(0.2)(x)
    out = Dense(1)(x)

    m = Model(inp, out)
    m.compile(optimizer=Adam(1e-3), loss="huber")
    return m


# ── Feature matrix ─────────────────────────────────────────────────────────────

def _feature_matrix(res_arr: np.ndarray, vol_arr: np.ndarray) -> np.ndarray:
    """
    Собрать матрицу (N, 3) из:
      col 0: e¹_t — остаток ARIMA
      col 1: σ_t  — условная волатильность GARCH (std, не variance)
      col 2: z_t  = e¹_t / (σ_t + ε) — стандартизованный остаток
    """
    z = res_arr / (vol_arr + 1e-10)
    return np.column_stack([res_arr, vol_arr, z])


def _scale_window(win_res, win_vol, res_sc, vol_sc, z_sc):
    """Масштабировать одно окно (window,) → (window, 3)."""
    z_arr = win_res / (win_vol + 1e-10)
    return np.hstack([
        res_sc.transform(win_res.reshape(-1, 1)),
        vol_sc.transform(win_vol.reshape(-1, 1)),
        z_sc.transform(z_arr.reshape(-1, 1)),
    ])


# ── Main ───────────────────────────────────────────────────────────────────────

def run_triple_hybrid(ticker: str, start: str, end: str,
                      window: int = 60, n_future: int = 0,
                      interval: str = "1d") -> dict:
    if not HAS_TF:
        raise RuntimeError("TensorFlow is not installed")

    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

    # ── 1. Данные ──────────────────────────────────────────────────────────────
    df = load_data(ticker, start, end, interval)
    train_df, test_df = train_test_split_series(df)

    train_prices = train_df["Close"].values.astype(float).flatten()
    test_prices  = test_df["Close"].values.astype(float).flatten()
    n_test       = len(test_prices)

    window = min(window, max(5, len(train_prices) // 3))
    if len(train_prices) <= window:
        raise ValueError(
            f"Недостаточно данных: {len(train_prices)} точек, окно={window}."
        )

    # ── 2. ARIMA → остатки e¹_t ────────────────────────────────────────────────
    arima = auto_arima(
        train_prices,
        seasonal=False, information_criterion="aic",
        stepwise=True, suppress_warnings=True, error_action="ignore",
        max_p=3, max_q=3, d=1,          # cap: скорость vs. качество
    )
    arima_insample  = arima.predict_in_sample()
    n_fitted        = len(arima_insample)
    train_aligned   = train_prices[-n_fitted:]
    train_residuals = train_aligned - arima_insample  # e¹_t, shape (n_fitted,)

    # ── 3. GARCH(1,1) — fit ONE TIME на train-остатках ────────────────────────
    gres, omega, alpha, beta = _fit_garch(train_residuals)

    # Условная волатильность в оригинальных единицах (std, не variance)
    cond_vol_train = gres.conditional_volatility / GARCH_SCALE   # σ_t, (n_fitted,)
    cond_var_train = cond_vol_train ** 2                          # σ²_t, (n_fitted,)

    # σ²_{T+0,sc} — первый тест-шаг; считается из последнего обучающего остатка
    sigma2_sc = _garch_step(
        omega, alpha, beta,
        train_residuals[-1],
        float(gres.conditional_volatility[-1] ** 2),  # σ²_{T-1,sc}
    )

    # ── 4. CNN-BiLSTM на [e¹, σ, z] ───────────────────────────────────────────
    feat_train = _feature_matrix(train_residuals, cond_vol_train)  # (n_fitted, 3)

    res_scaler = StandardScaler().fit(feat_train[:, 0:1])
    vol_scaler = StandardScaler().fit(feat_train[:, 1:2])
    z_scaler   = StandardScaler().fit(feat_train[:, 2:3])

    feat_train_sc = np.hstack([
        res_scaler.transform(feat_train[:, 0:1]),
        vol_scaler.transform(feat_train[:, 1:2]),
        z_scaler.transform(feat_train[:, 2:3]),
    ])

    # Строим скользящие окна: X = feat[i-window:i], y = scaled_residual[i]
    X_list, y_list = [], []
    for i in range(window, n_fitted):
        X_list.append(feat_train_sc[i - window: i])
        y_list.append(feat_train_sc[i, 0])   # цель — первый признак (scaled residual)
    X_train = np.array(X_list)   # (n_seq, window, 3)
    y_train = np.array(y_list)   # (n_seq,)

    batch_size = min(32, max(1, len(X_train) // 4))
    val_split  = 0.1 if len(X_train) >= 20 else 0.0
    monitor    = "val_loss" if val_split > 0 else "loss"

    lstm = _build_model(window, N_FEATURES)
    lstm.fit(
        X_train, y_train,
        epochs=100,
        batch_size=batch_size,
        validation_split=val_split,
        callbacks=[
            EarlyStopping(monitor=monitor, patience=10, restore_best_weights=True),
            ReduceLROnPlateau(monitor=monitor, factor=0.5, patience=5, min_lr=1e-6),
        ],
        verbose=0,
    )

    # ── 5. Walk-forward backtest ───────────────────────────────────────────────
    #
    # Ключевые историй (в оригинальных единицах):
    #   history_res  — e¹_t: все обучающие + наблюдённые тест-остатки
    #   history_var  — σ²_t: все σ² (train + по одному на каждый тест-шаг)
    #
    # sigma2_sc    — σ²_{current,sc}: ГОТОВ перед каждым шагом, НЕ в history_var
    # После шага:  history_var получает sigma2_sc/scale² ; sigma2_sc обновляется
    #              из НАБЛЮДЁННОГО остатка.
    #
    history_res = list(train_residuals)    # len = n_fitted
    history_var = list(cond_var_train)     # len = n_fitted, σ² в orig. единицах
    test_pred   = []

    for i in range(n_test):
        # ARIMA 1-step forecast
        arima_fc = float(arima.predict(n_periods=1)[0])

        # LSTM-вход: history[-window:] — окно ДО текущего шага
        # history_var[-window:] = [σ²_{i-window}, ..., σ²_{i-1}]  ← правильно
        win_res = np.array(history_res[-window:])
        win_var = np.array(history_var[-window:])
        win_vol = np.sqrt(win_var)

        win_sc    = _scale_window(win_res, win_vol, res_scaler, vol_scaler, z_scaler)
        win_input = win_sc.reshape(1, window, N_FEATURES)

        lstm_sc   = float(lstm.predict(win_input, verbose=0)[0, 0])
        lstm_corr = float(res_scaler.inverse_transform([[lstm_sc]])[0, 0])

        test_pred.append(arima_fc + lstm_corr)

        # Наблюдаем реальный остаток
        actual_res = float(test_prices[i]) - arima_fc
        arima.update([float(test_prices[i])])

        # Добавляем σ²_i (= sigma2_sc/scale²) в историю ДО обновления
        history_res.append(actual_res)
        history_var.append(sigma2_sc / GARCH_SCALE ** 2)

        # GARCH rolling update: σ²_{i+1} из НАБЛЮДЁННОГО остатка
        sigma2_sc = _garch_step(omega, alpha, beta, actual_res, sigma2_sc)

    test_pred = np.array(test_pred)
    metrics   = compute_all(test_prices, test_pred)
    residuals = test_prices - test_pred

    # ── 6. Дата-форматирование (с поддержкой intraday) ─────────────────────────
    date_fmt    = "%Y-%m-%d %H:%M" if interval in ("1h", "6h", "12h") else "%Y-%m-%d"
    train_dates = [d.strftime(date_fmt) for d in train_df.index]
    test_dates  = [d.strftime(date_fmt) for d in test_df.index]

    all_dates  = train_dates + test_dates
    all_actual = train_prices.tolist() + test_prices.tolist()
    all_pred   = [None] * len(train_dates) + test_pred.tolist()
    test_from  = len(train_dates)
    future_from = len(all_dates)

    # ── 7. Future forecast (авторегрессивный) ─────────────────────────────────
    seed = get_seed(ticker)
    scenarios = []

    if n_future > 0:
        arima_future = arima.predict(n_periods=n_future)

        # Rolling буферы для future — инициализируются последним test-окном
        roll_res = list(history_res[-window:])    # (window,) в orig. единицах
        roll_var = list(history_var[-window:])    # (window,) σ² в orig. единицах
        roll_sigma2_sc = sigma2_sc                # σ²_{T+N,sc} → первый future-шаг

        # Клиппинг предсказанного residual предотвращает экспоненциальный рост σ²
        res_std = float(np.std(train_residuals))

        base_prices = []

        for j in range(n_future):
            win_res = np.array(roll_res[-window:])
            win_vol = np.sqrt(np.array(roll_var[-window:]))

            win_sc    = _scale_window(win_res, win_vol, res_scaler, vol_scaler, z_scaler)
            win_input = win_sc.reshape(1, window, N_FEATURES)

            lstm_sc   = float(lstm.predict(win_input, verbose=0)[0, 0])
            lstm_corr = float(res_scaler.inverse_transform([[lstm_sc]])[0, 0])

            base_prices.append(float(arima_future[j]) + lstm_corr)

            # Для обновления GARCH используем клиппированный residual
            # (цена прогнозируется без клиппинга)
            corr_clipped = float(np.clip(lstm_corr, -3 * res_std, 3 * res_std))

            roll_res.append(corr_clipped)
            roll_var.append(roll_sigma2_sc / GARCH_SCALE ** 2)
            roll_sigma2_sc = _garch_step(omega, alpha, beta, corr_clipped, roll_sigma2_sc)

        base_prices  = np.array(base_prices)
        future_dates = future_trading_dates(test_dates[-1], n_future, interval)
        all_dates   += future_dates
        all_actual  += [None] * n_future
        all_pred    += bootstrap_future(base_prices, residuals, seed=seed).tolist()
        scenarios    = bootstrap_scenarios(base_prices, residuals, base_seed=seed)

    return {
        "dates":             all_dates,
        "actual":            all_actual,
        "predicted":         all_pred,
        "scenarios":         scenarios,
        "test_from_index":   test_from,
        "future_from_index": future_from if n_future > 0 else None,
        "metrics":           metrics,
        "model_info": {
            "name":           "ARIMA+GARCH+LSTM (v2)",
            "arima_order":    list(arima.order),
            "garch_order":    [1, 1],
            "garch_params":   {
                "omega": round(omega, 6),
                "alpha": round(alpha, 4),
                "beta":  round(beta, 4),
            },
            "architecture":   "CausalConv1D(32) → BiLSTM(64) → BiLSTM(32) → Dense",
            "input_features": [
                "e¹_t — остаток ARIMA",
                "σ_t  — волатильность GARCH",
                "z_t  = e¹/σ — стандартизованный остаток",
            ],
            "n_features":     N_FEATURES,
            "window":         window,
            "description": (
                "ARIMA извлекает линейный тренд; GARCH отслеживает режим волатильности; "
                "CNN-BiLSTM корректирует нелинейные остатки по [residual, σ, z-score]"
                + (f"; {n_future}-step bootstrap прогноз" if n_future else "")
            ),
        },
    }
