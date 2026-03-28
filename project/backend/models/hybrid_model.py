"""
Hybrid ARIMA + LSTM model.

Pipeline:
  1. Fit ARIMA on training prices  →  ŷ_ARIMA
  2. Compute residuals: e_t = y_t − ŷ_ARIMA_t
  3. Train LSTM on scaled residuals
  4. Final forecast: ŷ_t = ŷ_ARIMA_t + ŷ_LSTM(e_t)
"""
import numpy as np
import pandas as pd
from pmdarima import auto_arima
from sklearn.preprocessing import MinMaxScaler
from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all

try:
    import os
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
    import tensorflow as tf
    tf.get_logger().setLevel("ERROR")
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
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


def run_hybrid(ticker: str, start: str, end: str, window: int = 60) -> dict:
    if not HAS_TF:
        raise RuntimeError("TensorFlow is not installed")

    df = load_data(ticker, start, end)
    train_df, test_df = train_test_split_series(df)

    train_prices = train_df["Close"].values.astype(float)
    test_prices = test_df["Close"].values.astype(float)
    all_prices = np.concatenate([train_prices, test_prices])

    # ── Step 1: ARIMA walk-forward on train, then forecast test ──
    arima_model = auto_arima(
        train_prices,
        seasonal=False,
        information_criterion="aic",
        stepwise=True,
        suppress_warnings=True,
        error_action="ignore",
        max_p=5,
        max_q=5,
        d=1,
    )

    # In-sample ARIMA fitted values (for residual computation)
    arima_train_fitted = arima_model.predict_in_sample()
    # Align: pmdarima may return fewer values due to differencing
    n_fitted = len(arima_train_fitted)
    train_prices_aligned = train_prices[-n_fitted:]

    # ── Step 2: Residuals on training set ──
    train_residuals = train_prices_aligned - arima_train_fitted  # shape (n_fitted,)

    # ── Step 3: Train LSTM on residuals ──
    res_scaler = MinMaxScaler(feature_range=(-1, 1))
    residuals_scaled = res_scaler.fit_transform(train_residuals.reshape(-1, 1))

    X_res, y_res = _build_sequences(residuals_scaled, window)
    X_res = X_res.reshape(X_res.shape[0], X_res.shape[1], 1)

    lstm_model = Sequential([
        LSTM(64, return_sequences=True, input_shape=(window, 1)),
        Dropout(0.2),
        LSTM(64, return_sequences=False),
        Dropout(0.2),
        Dense(1),
    ])
    lstm_model.compile(optimizer="adam", loss="mean_squared_error")
    es = EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True)
    lstm_model.fit(
        X_res, y_res,
        epochs=50,
        batch_size=32,
        validation_split=0.1,
        callbacks=[es],
        verbose=0,
    )

    # ── Step 4: Walk-forward forecast on test set ──
    history_prices = list(train_prices)
    history_residuals = list(train_residuals)
    predictions = []

    for i in range(len(test_prices)):
        # ARIMA forecast
        arima_fc = arima_model.predict(n_periods=1)[0]

        # LSTM residual forecast
        res_window = np.array(history_residuals[-window:]).reshape(-1, 1)
        res_window_scaled = res_scaler.transform(res_window)
        x_lstm = res_window_scaled.reshape(1, window, 1)
        lstm_res_scaled = lstm_model.predict(x_lstm, verbose=0)[0, 0]
        lstm_res = res_scaler.inverse_transform([[lstm_res_scaled]])[0, 0]

        final_pred = arima_fc + lstm_res
        predictions.append(float(final_pred))

        # Update histories with actual value
        actual_val = float(test_prices[i])
        history_prices.append(actual_val)
        actual_residual = actual_val - arima_fc
        history_residuals.append(actual_residual)

        # Update ARIMA with new observation
        arima_model.update([actual_val])

    predictions = np.array(predictions)
    metrics = compute_all(test_prices, predictions)
    dates = [d.strftime("%Y-%m-%d") for d in test_df.index]

    return {
        "dates": dates,
        "actual": test_prices.tolist(),
        "predicted": predictions.tolist(),
        "metrics": metrics,
        "model_info": {
            "name": "ARIMA+LSTM",
            "arima_order": list(arima_model.order),
            "lstm_architecture": "2×LSTM(64) + Dropout(0.2)",
            "window": window,
            "description": (
                "Hybrid: ARIMA models linear component, "
                "LSTM models residuals, final = ARIMA + LSTM"
            ),
        },
    }
