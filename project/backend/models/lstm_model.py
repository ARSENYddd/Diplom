import numpy as np
import pandas as pd
from datetime import date, timedelta
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


def _build_model(window: int):
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


def run_lstm(ticker: str, start: str, end: str, window: int = 60, n_future: int = 0) -> dict:
    if not HAS_TF:
        raise RuntimeError("TensorFlow is not installed")

    df = load_data(ticker, start, end)

    if n_future > 0:
        # Future mode: train on ALL data, then roll forward n_future steps
        all_prices = df["Close"].values.astype(float).flatten()
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled = scaler.fit_transform(all_prices.reshape(-1, 1))

        X, y = _build_sequences(scaled, window)
        X = X.reshape(X.shape[0], X.shape[1], 1)

        model = _build_model(window)
        es = EarlyStopping(monitor="loss", patience=5, restore_best_weights=True)
        model.fit(X, y, epochs=50, batch_size=32, callbacks=[es], verbose=0)

        # Auto-regressive future prediction
        rolling = list(scaled[-window:, 0])
        future_scaled = []
        for _ in range(n_future):
            x = np.array(rolling[-window:]).reshape(1, window, 1)
            pred = model.predict(x, verbose=0)[0, 0]
            future_scaled.append(pred)
            rolling.append(pred)

        future_prices = scaler.inverse_transform(
            np.array(future_scaled).reshape(-1, 1)
        ).flatten().tolist()

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
                "name": "LSTM",
                "architecture": "2×LSTM(64) + Dropout(0.2)",
                "window": window,
                "mode": f"future forecast ({n_future} days, autoregressive)",
            },
        }

    # Historical backtest mode
    train_df, test_df = train_test_split_series(df)
    train_prices = train_df["Close"].values.astype(float).flatten()
    test_prices = test_df["Close"].values.astype(float).flatten()

    scaler = MinMaxScaler(feature_range=(0, 1))
    train_scaled = scaler.fit_transform(train_prices.reshape(-1, 1))

    X_train, y_train = _build_sequences(train_scaled, window)
    X_train = X_train.reshape(X_train.shape[0], X_train.shape[1], 1)

    model = _build_model(window)
    es = EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True)
    model.fit(X_train, y_train, epochs=50, batch_size=32,
              validation_split=0.1, callbacks=[es], verbose=0)

    all_prices = np.concatenate([train_prices, test_prices])
    all_scaled = scaler.transform(all_prices.reshape(-1, 1))
    n_train = len(train_df)

    predictions_scaled = []
    for i in range(len(test_prices)):
        x = all_scaled[n_train + i - window: n_train + i, 0].reshape(1, window, 1)
        predictions_scaled.append(model.predict(x, verbose=0)[0, 0])

    predictions = scaler.inverse_transform(
        np.array(predictions_scaled).reshape(-1, 1)
    ).flatten()

    metrics = compute_all(test_prices, predictions)
    dates = [d.strftime("%Y-%m-%d") for d in test_df.index]

    return {
        "dates": dates,
        "actual": test_prices.tolist(),
        "predicted": predictions.tolist(),
        "future_from_index": None,
        "metrics": metrics,
        "model_info": {
            "name": "LSTM",
            "architecture": "2×LSTM(64) + Dropout(0.2)",
            "window": window,
            "description": "Standalone LSTM walk-forward backtest",
        },
    }
