"""
Hybrid ARIMA + LSTM model.

Historical mode:
  1. Fit ARIMA on training prices  →  ŷ_ARIMA
  2. Compute residuals: e_t = y_t − ŷ_ARIMA_t
  3. Train LSTM on scaled residuals
  4. Walk-forward: ŷ_t = ŷ_ARIMA_t + ŷ_LSTM(e_t)

Future mode:
  - Train on ALL available data
  - ARIMA forecasts n_future prices
  - LSTM predicts residual corrections using last known residuals
  - Final = ARIMA_future + LSTM_residual_correction
"""
import numpy as np
import pandas as pd
from datetime import date, timedelta
from pmdarima import auto_arima
from sklearn.preprocessing import MinMaxScaler
from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all

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


def _future_dates(last_date_str: str, n: int) -> list:
    d = date.fromisoformat(last_date_str)
    result = []
    while len(result) < n:
        d += timedelta(days=1)
        if d.weekday() < 5:
            result.append(d.strftime("%Y-%m-%d"))
    return result


def _build_sequences(data: np.ndarray, window: int):
    X, y = [], []
    for i in range(window, len(data)):
        X.append(data[i - window: i, 0])
        y.append(data[i, 0])
    return np.array(X), np.array(y)


def _build_lstm(window: int):
    model = Sequential([
        Input(shape=(window, 1)),
        LSTM(64, return_sequences=True),
        Dropout(0.2),
        LSTM(64, return_sequences=False),
        Dropout(0.2),
        Dense(1),
    ])
    model.compile(optimizer="adam", loss="mean_squared_error")
    return model


def run_hybrid(ticker: str, start: str, end: str, window: int = 60, n_future: int = 0) -> dict:
    if not HAS_TF:
        raise RuntimeError("TensorFlow is not installed")

    df = load_data(ticker, start, end)

    if n_future > 0:
        # ── Future mode ──
        all_prices = df["Close"].values.astype(float).flatten()

        # ARIMA on all data
        arima_model = auto_arima(
            all_prices, seasonal=False, information_criterion="aic",
            stepwise=True, suppress_warnings=True, error_action="ignore",
            max_p=5, max_q=5, d=1,
        )
        arima_insample = arima_model.predict_in_sample()
        n_fitted = len(arima_insample)
        prices_aligned = all_prices[-n_fitted:]
        residuals = prices_aligned - arima_insample

        # Train LSTM on residuals
        res_scaler = MinMaxScaler(feature_range=(-1, 1))
        res_scaled = res_scaler.fit_transform(residuals.reshape(-1, 1))
        if len(res_scaled) > window:
            X_res, y_res = _build_sequences(res_scaled, window)
            X_res = X_res.reshape(X_res.shape[0], X_res.shape[1], 1)
            lstm_model = _build_lstm(window)
            es = EarlyStopping(monitor="loss", patience=5, restore_best_weights=True)
            lstm_model.fit(X_res, y_res, epochs=50, batch_size=32, callbacks=[es], verbose=0)
            has_lstm = True
        else:
            has_lstm = False

        # Forecast future
        arima_future = arima_model.predict(n_periods=n_future)
        rolling_res = list(res_scaled[-window:, 0])
        future_prices = []
        for i in range(n_future):
            arima_fc = float(arima_future[i])
            lstm_corr = 0.0
            if has_lstm:
                x = np.array(rolling_res[-window:]).reshape(1, window, 1)
                pred_scaled = lstm_model.predict(x, verbose=0)[0, 0]
                lstm_corr = float(res_scaler.inverse_transform([[pred_scaled]])[0, 0])
                rolling_res.append(pred_scaled)
            future_prices.append(arima_fc + lstm_corr)

        future_dates = _future_dates(df.index[-1].strftime("%Y-%m-%d"), n_future)
        hist_dates = [d.strftime("%Y-%m-%d") for d in df.index]
        hist_prices = all_prices.tolist()
        return {
            "dates": hist_dates + future_dates,
            "actual": hist_prices + [None] * n_future,
            "predicted": [None] * len(hist_prices) + future_prices,
            "future_from_index": len(hist_prices),
            "metrics": None,
            "model_info": {
                "name": "ARIMA+LSTM",
                "arima_order": list(arima_model.order),
                "lstm_architecture": "2×LSTM(64) + Dropout(0.2)",
                "window": window,
                "mode": f"future forecast ({n_future} days)",
            },
        }

    # ── Historical backtest mode ──
    train_df, test_df = train_test_split_series(df)
    train_prices = train_df["Close"].values.astype(float).flatten()
    test_prices = test_df["Close"].values.astype(float).flatten()

    arima_model = auto_arima(
        train_prices, seasonal=False, information_criterion="aic",
        stepwise=True, suppress_warnings=True, error_action="ignore",
        max_p=5, max_q=5, d=1,
    )

    arima_train_fitted = arima_model.predict_in_sample()
    n_fitted = len(arima_train_fitted)
    train_prices_aligned = train_prices[-n_fitted:]
    train_residuals = train_prices_aligned - arima_train_fitted

    res_scaler = MinMaxScaler(feature_range=(-1, 1))
    residuals_scaled = res_scaler.fit_transform(train_residuals.reshape(-1, 1))

    X_res, y_res = _build_sequences(residuals_scaled, window)
    X_res = X_res.reshape(X_res.shape[0], X_res.shape[1], 1)

    lstm_model = _build_lstm(window)
    es = EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True)
    lstm_model.fit(X_res, y_res, epochs=50, batch_size=32,
                   validation_split=0.1, callbacks=[es], verbose=0)

    history_residuals = list(train_residuals)
    predictions = []

    for i in range(len(test_prices)):
        arima_fc = arima_model.predict(n_periods=1)[0]

        res_window = np.array(history_residuals[-window:]).reshape(-1, 1)
        res_window_scaled = res_scaler.transform(res_window)
        x_lstm = res_window_scaled.reshape(1, window, 1)
        lstm_res_scaled = lstm_model.predict(x_lstm, verbose=0)[0, 0]
        lstm_res = float(res_scaler.inverse_transform([[lstm_res_scaled]])[0, 0])

        final_pred = float(arima_fc) + lstm_res
        predictions.append(final_pred)

        actual_val = float(test_prices[i])
        actual_residual = actual_val - float(arima_fc)
        history_residuals.append(actual_residual)
        arima_model.update([actual_val])

    predictions = np.array(predictions)
    metrics = compute_all(test_prices, predictions)
    dates = [d.strftime("%Y-%m-%d") for d in test_df.index]

    return {
        "dates": dates,
        "actual": test_prices.tolist(),
        "predicted": predictions.tolist(),
        "future_from_index": None,
        "metrics": metrics,
        "model_info": {
            "name": "ARIMA+LSTM",
            "arima_order": list(arima_model.order),
            "lstm_architecture": "2×LSTM(64) + Dropout(0.2)",
            "window": window,
            "description": "Hybrid walk-forward backtest",
        },
    }
