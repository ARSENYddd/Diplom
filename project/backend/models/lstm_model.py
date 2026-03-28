import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all

os_environ_set = False
try:
    import os
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
    import tensorflow as tf
    tf.get_logger().setLevel("ERROR")
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout, Input
    from tensorflow.keras.callbacks import EarlyStopping
    HAS_TF = True
except ImportError:
    HAS_TF = False


def build_sequences(data: np.ndarray, window: int):
    X, y = [], []
    for i in range(window, len(data)):
        X.append(data[i - window: i, 0])
        y.append(data[i, 0])
    return np.array(X), np.array(y)


def run_lstm(ticker: str, start: str, end: str, window: int = 60) -> dict:
    if not HAS_TF:
        raise RuntimeError("TensorFlow is not installed")

    df = load_data(ticker, start, end)
    train_df, test_df = train_test_split_series(df)

    scaler = MinMaxScaler(feature_range=(0, 1))
    train_scaled = scaler.fit_transform(train_df[["Close"]].values)

    X_train, y_train = build_sequences(train_scaled, window)
    X_train = X_train.reshape(X_train.shape[0], X_train.shape[1], 1)

    model = Sequential([
        Input(shape=(window, 1)),
        LSTM(64, return_sequences=True),
        Dropout(0.2),
        LSTM(64, return_sequences=False),
        Dropout(0.2),
        Dense(1),
    ])
    model.compile(optimizer="adam", loss="mean_squared_error")
    es = EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True)

    model.fit(
        X_train, y_train,
        epochs=50,
        batch_size=32,
        validation_split=0.1,
        callbacks=[es],
        verbose=0,
    )

    # Predict on test set using sliding window
    test_prices = test_df["Close"].values.astype(float)
    all_prices = np.concatenate([train_df["Close"].values, test_prices])
    all_scaled = scaler.transform(all_prices.reshape(-1, 1))

    predictions_scaled = []
    n_train = len(train_df)
    for i in range(len(test_prices)):
        x = all_scaled[n_train + i - window: n_train + i, 0]
        x = x.reshape(1, window, 1)
        pred = model.predict(x, verbose=0)[0, 0]
        predictions_scaled.append(pred)

    predictions_scaled = np.array(predictions_scaled).reshape(-1, 1)
    predictions = scaler.inverse_transform(predictions_scaled).flatten()

    metrics = compute_all(test_prices, predictions)
    dates = [d.strftime("%Y-%m-%d") for d in test_df.index]

    return {
        "dates": dates,
        "actual": test_prices.tolist(),
        "predicted": predictions.tolist(),
        "metrics": metrics,
        "model_info": {
            "name": "LSTM",
            "architecture": "2×LSTM(64) + Dropout(0.2)",
            "window": window,
            "description": "Standalone LSTM trained directly on MinMaxScaled prices",
        },
    }
