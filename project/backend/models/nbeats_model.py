"""
N-BEATS — Neural Basis Expansion Analysis for Time Series (2020).
Generic N-BEATS: stacks of MLP blocks with backcast/forecast outputs.
Each block learns to explain a portion of the input; residual is passed
to the next block. Final forecast = sum of all blocks' forecasts.
"""
import numpy as np
from sklearn.preprocessing import MinMaxScaler

from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all
from services.forecast_utils import future_trading_dates, bootstrap_future, bootstrap_scenarios
from models._common import HAS_TF, get_seed

N_STACKS  = 2
N_BLOCKS  = 3
UNITS     = 256
N_THETA   = 64


def _build_nbeats(window: int, n_forecast: int = 1,
                  n_stacks: int = N_STACKS, n_blocks: int = N_BLOCKS,
                  units: int = UNITS, n_theta: int = N_THETA):
    """
    Build N-BEATS generic model.
    Stacks of MLP blocks; each block outputs:
      - backcast: predict the input window (subtracted as residual)
      - forecast: contribution to the final prediction
    """
    import tensorflow as tf
    from tensorflow.keras.models import Model
    from tensorflow.keras.layers import Input, Dense, Lambda, Add
    from tensorflow.keras.optimizers import Adam

    inp = Input(shape=(window,), name="input")

    all_forecasts = []
    residual      = inp  # start with full input

    for stack_idx in range(n_stacks):
        for block_idx in range(n_blocks):
            # MLP body: 4 × Dense(units, relu)
            x = residual
            for _ in range(4):
                x = Dense(units, activation="relu")(x)

            # Theta for backcast and forecast
            theta = Dense(n_theta, activation="linear")(x)

            # Backcast: reconstruct input window
            backcast = Dense(window, activation="linear", name=f"bc_s{stack_idx}_b{block_idx}")(theta)

            # Forecast: one-step ahead prediction
            forecast = Dense(n_forecast, activation="linear", name=f"fc_s{stack_idx}_b{block_idx}")(theta)

            # Update residual: input minus what this block explained
            residual = tf.keras.layers.Subtract()([residual, backcast])
            all_forecasts.append(forecast)

    # Final forecast = sum of all block forecasts
    if len(all_forecasts) == 1:
        output = all_forecasts[0]
    else:
        output = Add()(all_forecasts)

    model = Model(inputs=inp, outputs=output, name="nbeats")
    model.compile(optimizer=Adam(1e-3), loss="huber")
    return model


def run_nbeats(ticker: str, start: str, end: str,
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
    scaler.fit(train_prices.reshape(-1, 1))
    all_prices = np.concatenate([train_prices, test_prices])
    all_scaled = scaler.transform(all_prices.reshape(-1, 1)).flatten()

    # Build training sequences — N-BEATS takes flat windows (not 3D)
    X_train, y_train = [], []
    for i in range(window, n_train):
        X_train.append(all_scaled[i - window:i])
        y_train.append(all_scaled[i])
    X_train = np.array(X_train)  # (N, window)
    y_train = np.array(y_train).reshape(-1, 1)

    batch_size = min(32, max(1, len(X_train) // 4))
    val_split  = 0.1 if len(X_train) >= 20 else 0.0
    monitor    = "val_loss" if val_split > 0 else "loss"

    model = _build_nbeats(window)
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

    # Walk-forward backtest
    test_pred = []
    for i in range(n_test):
        x      = all_scaled[n_train + i - window: n_train + i].reshape(1, window)
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
        future_buf = list(all_scaled)
        base = []
        for _ in range(n_future):
            x      = np.array(future_buf[-window:]).reshape(1, window)
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
            "name":        "N-BEATS",
            "window":      window,
            "stacks":      N_STACKS,
            "blocks":      N_BLOCKS,
            "description": (
                "N-BEATS generic — MLP stacks with backcast/forecast decomposition. "
                f"{N_STACKS} stacks × {N_BLOCKS} blocks × 4×Dense({UNITS}). "
                "Pure MLP, no recurrence, interpretable residual decomposition"
                + (f" + {n_future}-step bootstrap forecast" if n_future else "")
            ),
        },
    }
