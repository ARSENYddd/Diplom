import numpy as np
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


def _build_model(window: int):
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


def run_lstm(ticker: str, start: str, end: str, window: int = 60, n_future: int = 0) -> dict:
    if not HAS_TF:
        raise RuntimeError("TensorFlow is not installed")

    df = load_data(ticker, start, end)
    train_df, test_df = train_test_split_series(df)

    train_prices = train_df["Close"].values.astype(float).flatten()
    test_prices  = test_df["Close"].values.astype(float).flatten()

    # --- Train model ---
    scaler = MinMaxScaler(feature_range=(0, 1))
    train_scaled = scaler.fit_transform(train_prices.reshape(-1, 1))

    X_train, y_train = _build_sequences(train_scaled, window)
    X_train = X_train.reshape(X_train.shape[0], X_train.shape[1], 1)

    model = _build_model(window)
    es = EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True)
    model.fit(X_train, y_train, epochs=50, batch_size=32,
              validation_split=0.1, callbacks=[es], verbose=0)

    # --- Backtest: walk-forward on test set ---
    all_prices = np.concatenate([train_prices, test_prices])
    all_scaled = scaler.transform(all_prices.reshape(-1, 1))
    n_train    = len(train_prices)

    test_pred_scaled = []
    for i in range(len(test_prices)):
        x = all_scaled[n_train + i - window: n_train + i].reshape(1, window, 1)
        test_pred_scaled.append(model.predict(x, verbose=0)[0, 0])

    test_pred = scaler.inverse_transform(
        np.array(test_pred_scaled).reshape(-1, 1)
    ).flatten()

    metrics   = compute_all(test_prices, test_pred)
    residuals = test_prices - test_pred

    train_dates = [d.strftime("%Y-%m-%d") for d in train_df.index]
    test_dates  = [d.strftime("%Y-%m-%d") for d in test_df.index]

    all_dates  = train_dates + test_dates
    all_actual = train_prices.tolist() + test_prices.tolist()
    all_pred   = [None] * len(train_dates) + test_pred.tolist()
    test_from  = len(train_dates)
    future_from = len(all_dates)

    # --- Future forecast: autoregressive + bootstrap scenarios ---
    scenarios = []
    if n_future > 0:
        rolling = list(all_scaled[-window:, 0])
        base_scaled = []
        for _ in range(n_future):
            x = np.array(rolling[-window:]).reshape(1, window, 1)
            pred = model.predict(x, verbose=0)[0, 0]
            base_scaled.append(pred)
            rolling.append(pred)

        base_prices  = scaler.inverse_transform(
            np.array(base_scaled).reshape(-1, 1)
        ).flatten()
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
            "name": "LSTM",
            "architecture": "2×LSTM(64) + Dropout(0.2)",
            "window": window,
            "description": "LSTM walk-forward backtest"
            + (f" + {n_future}-day bootstrap forecast" if n_future else ""),
        },
    }
