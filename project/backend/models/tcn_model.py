"""
TCN — Temporal Convolutional Network.
Residual blocks with dilated causal Conv1D (dilation=1,2,4,8).
No recurrence → parallelizable, no vanishing gradient.
"""
import numpy as np
from sklearn.preprocessing import MinMaxScaler

from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all
from services.forecast_utils import future_trading_dates, bootstrap_future, bootstrap_scenarios
from models._common import HAS_TF, get_seed


def _build_tcn(window: int, filters: int = 64, kernel_size: int = 3,
               dilations=(1, 2, 4, 8), dropout: float = 0.2):
    """Stacked dilated causal Conv1D residual blocks → Dense(1)."""
    import tensorflow as tf
    from tensorflow.keras.models import Model
    from tensorflow.keras.layers import (
        Input, Conv1D, Dropout, Add, LayerNormalization, Dense, Lambda
    )
    from tensorflow.keras.optimizers import Adam

    inp = Input(shape=(window, 1))
    x = inp

    for d in dilations:
        residual = x
        # First causal conv
        h = Conv1D(filters, kernel_size, dilation_rate=d,
                   padding="causal", activation="relu")(x)
        h = Dropout(dropout)(h)
        # Second causal conv
        h = Conv1D(filters, kernel_size, dilation_rate=d,
                   padding="causal", activation="relu")(h)
        h = Dropout(dropout)(h)
        # 1×1 conv to match channels if first block
        if residual.shape[-1] != filters:
            residual = Conv1D(filters, 1, padding="same")(residual)
        x = Add()([h, residual])
        x = LayerNormalization()(x)

    # Take the last time step
    x = Lambda(lambda t: t[:, -1, :])(x)
    out = Dense(1)(x)

    model = Model(inp, out)
    model.compile(optimizer=Adam(1e-3), loss="huber")
    return model


def run_tcn(ticker: str, start: str, end: str,
            window: int = 60, n_future: int = 0, interval: str = "1d") -> dict:
    if not HAS_TF:
        raise RuntimeError("TensorFlow is not installed")

    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

    df = load_data(ticker, start, end, interval)
    train_df, test_df = train_test_split_series(df)

    train_prices = train_df["Close"].values.astype(float).flatten()
    test_prices  = test_df["Close"].values.astype(float).flatten()
    n_train      = len(train_prices)
    n_test       = len(test_prices)

    date_fmt    = "%Y-%m-%d %H:%M" if interval in ("1h", "6h", "12h") else "%Y-%m-%d"
    train_dates = [d.strftime(date_fmt) for d in train_df.index]
    test_dates  = [d.strftime(date_fmt) for d in test_df.index]

    window = min(window, max(5, n_train // 3))

    scaler = MinMaxScaler(feature_range=(0, 1))
    train_scaled = scaler.fit_transform(train_prices.reshape(-1, 1))
    all_prices   = np.concatenate([train_prices, test_prices])
    all_scaled   = scaler.transform(all_prices.reshape(-1, 1))

    # Build training sequences
    X_train, y_train = [], []
    for i in range(window, n_train):
        X_train.append(all_scaled[i - window:i])
        y_train.append(all_scaled[i, 0])
    X_train = np.array(X_train)
    y_train = np.array(y_train)

    batch_size = min(32, max(1, len(X_train) // 4))
    val_split  = 0.1 if len(X_train) >= 20 else 0.0
    monitor    = "val_loss" if val_split > 0 else "loss"

    model = _build_tcn(window)
    model.fit(
        X_train, y_train,
        epochs=100, batch_size=batch_size,
        validation_split=val_split,
        callbacks=[
            EarlyStopping(monitor=monitor, patience=10, restore_best_weights=True),
            ReduceLROnPlateau(monitor=monitor, factor=0.5, patience=5, min_lr=1e-6),
        ],
        verbose=0,
    )

    # Walk-forward backtest on test set
    test_pred = []
    for i in range(n_test):
        x = all_scaled[n_train + i - window: n_train + i].reshape(1, window, 1)
        pred_s = float(model.predict(x, verbose=0)[0, 0])
        pred_p = float(scaler.inverse_transform([[pred_s]])[0, 0])
        test_pred.append(pred_p)

    test_pred = np.array(test_pred)
    metrics   = compute_all(test_prices, test_pred)
    residuals = test_prices - test_pred
    seed      = get_seed(ticker)

    all_dates   = train_dates + test_dates
    all_actual  = train_prices.tolist() + test_prices.tolist()
    all_pred    = [None] * n_train + test_pred.tolist()
    test_from   = n_train
    future_from = len(all_dates)

    scenarios = []
    if n_future > 0:
        future_buf = list(all_scaled.flatten())
        base = []
        for _ in range(n_future):
            x      = np.array(future_buf[-window:]).reshape(1, window, 1)
            pred_s = float(model.predict(x, verbose=0)[0, 0])
            pred_p = float(scaler.inverse_transform([[pred_s]])[0, 0])
            base.append(pred_p)
            future_buf.append(pred_s)

        base         = np.array(base)
        future_dates = future_trading_dates(test_dates[-1], n_future, interval)
        all_dates   += future_dates
        all_actual  += [None] * n_future
        all_pred    += bootstrap_future(base, residuals, seed=seed).tolist()
        scenarios    = bootstrap_scenarios(base, residuals, base_seed=seed)

    return {
        "dates":             all_dates,
        "actual":            all_actual,
        "predicted":         all_pred,
        "scenarios":         scenarios,
        "test_from_index":   test_from,
        "future_from_index": future_from if n_future > 0 else None,
        "metrics":           metrics,
        "model_info": {
            "name":        "TCN",
            "window":      window,
            "description": (
                "Temporal Convolutional Network — dilated causal Conv1D residual blocks "
                "(dilation=1,2,4,8). Parallelizable, no vanishing gradient"
                + (f" + {n_future}-step bootstrap forecast" if n_future else "")
            ),
        },
    }
