"""
Hybrid ARIMA + LSTM model.
  ŷ_t = ŷ_ARIMA_t + ŷ_LSTM(e_t)   where  e_t = y_t − ŷ_ARIMA_t
"""
import numpy as np
from pmdarima import auto_arima
from sklearn.preprocessing import MinMaxScaler
from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all
from services.forecast_utils import future_trading_dates, bootstrap_future, bootstrap_scenarios

import os
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
try:
    import tensorflow as tf
    tf.get_logger().setLevel("ERROR")
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout, Input
    from tensorflow.keras.callbacks import EarlyStopping
    HAS_TF = True
except ImportError:
    HAS_TF = False


def _build_sequences(data: np.ndarray, window: int):
    X, y = [], []
    for i in range(window, len(data)):
        X.append(data[i - window: i, 0])
        y.append(data[i, 0])
    return np.array(X), np.array(y)


def _build_lstm(window: int):
    m = Sequential([
        Input(shape=(window, 1)),
        LSTM(64, return_sequences=True),
        Dropout(0.2),
        LSTM(64, return_sequences=False),
        Dropout(0.2),
        Dense(1),
    ])
    m.compile(optimizer="adam", loss="mean_squared_error")
    return m


def run_hybrid(ticker: str, start: str, end: str, window: int = 60, n_future: int = 0) -> dict:
    if not HAS_TF:
        raise RuntimeError("TensorFlow is not installed")

    df = load_data(ticker, start, end)
    train_df, test_df = train_test_split_series(df)

    train_prices = train_df["Close"].values.astype(float).flatten()
    test_prices  = test_df["Close"].values.astype(float).flatten()

    # --- Step 1: ARIMA on training data ---
    arima = auto_arima(
        train_prices, seasonal=False, information_criterion="aic",
        stepwise=True, suppress_warnings=True, error_action="ignore",
        max_p=5, max_q=5, d=1,
    )
    arima_insample = arima.predict_in_sample()
    n_fitted       = len(arima_insample)
    train_aligned  = train_prices[-n_fitted:]
    train_residuals = train_aligned - arima_insample

    # --- Step 2: Train LSTM on residuals ---
    res_scaler = MinMaxScaler(feature_range=(-1, 1))
    res_scaled = res_scaler.fit_transform(train_residuals.reshape(-1, 1))

    X_res, y_res = _build_sequences(res_scaled, window)
    X_res = X_res.reshape(X_res.shape[0], X_res.shape[1], 1)

    lstm = _build_lstm(window)
    es   = EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True)
    lstm.fit(X_res, y_res, epochs=50, batch_size=32,
             validation_split=0.1, callbacks=[es], verbose=0)

    # --- Step 3: Walk-forward backtest on test set ---
    history_res = list(train_residuals)
    test_pred   = []

    for i in range(len(test_prices)):
        arima_fc = float(arima.predict(n_periods=1)[0])

        res_window = np.array(history_res[-window:]).reshape(-1, 1)
        res_w_sc   = res_scaler.transform(res_window).reshape(1, window, 1)
        lstm_corr  = float(res_scaler.inverse_transform(
            [[lstm.predict(res_w_sc, verbose=0)[0, 0]]]
        )[0, 0])

        test_pred.append(arima_fc + lstm_corr)

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

    # --- Future forecast: ARIMA base + LSTM residual correction + bootstrap scenarios ---
    scenarios = []
    if n_future > 0:
        arima_future = arima.predict(n_periods=n_future)

        rolling_res = list(res_scaled[-window:, 0])
        base_prices = []
        for i in range(n_future):
            x = np.array(rolling_res[-window:]).reshape(1, window, 1)
            lstm_corr_sc = float(lstm.predict(x, verbose=0)[0, 0])
            lstm_corr    = float(res_scaler.inverse_transform([[lstm_corr_sc]])[0, 0])
            base_prices.append(float(arima_future[i]) + lstm_corr)
            rolling_res.append(lstm_corr_sc)

        base_prices  = np.array(base_prices)
        future_dates = future_trading_dates(test_dates[-1], n_future)
        all_dates   += future_dates
        all_actual  += [None] * n_future
        all_pred    += bootstrap_future(base_prices, residuals, seed=hash(ticker) % 2**31).tolist()
        scenarios    = bootstrap_scenarios(base_prices, residuals, base_seed=hash(ticker) % 2**31)

    return {
        "dates": all_dates,
        "actual": all_actual,
        "predicted": all_pred,
        "scenarios": scenarios,
        "test_from_index": test_from,
        "future_from_index": future_from if n_future > 0 else None,
        "metrics": metrics,
        "model_info": {
            "name": "ARIMA+LSTM",
            "arima_order": list(arima.order),
            "lstm_architecture": "2×LSTM(64) + Dropout(0.2)",
            "window": window,
            "description": "Hybrid walk-forward backtest"
            + (f" + {n_future}-day bootstrap forecast" if n_future else ""),
        },
    }
