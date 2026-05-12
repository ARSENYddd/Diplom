"""
TFT — Temporal Fusion Transformer (Google, 2021), simplified implementation.
Architecture: LSTM local encoder → temporal self-attention → GLU gate → Dense(1).
Captures both short-range recurrent patterns and long-range attention dependencies.
"""
import numpy as np
from sklearn.preprocessing import MinMaxScaler

from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all
from services.forecast_utils import future_trading_dates, bootstrap_future, bootstrap_scenarios
from models._common import HAS_TF, get_seed

D_MODEL    = 64
N_HEADS    = 4
LSTM_UNITS = 64
DROPOUT    = 0.1


def _build_tft(window: int, d_model: int = D_MODEL, n_heads: int = N_HEADS,
               lstm_units: int = LSTM_UNITS, dropout: float = DROPOUT):
    """
    Simplified TFT:
      Input(window,1) → LSTM(lstm_units, return_seq) → Dense(d_model) → LayerNorm
      → MHA(self-attention) → LayerNorm + residual
      → GLU gate (sigmoid * linear)
      → last token → Dense(1)
    """
    from tensorflow.keras.models import Model
    from tensorflow.keras.layers import (
        Input, LSTM, Dense, Dropout as KDropout,
        MultiHeadAttention, LayerNormalization,
        Multiply, Lambda
    )
    from tensorflow.keras.optimizers import Adam

    inp = Input(shape=(window, 1))

    # Local context with LSTM
    lstm_out = LSTM(lstm_units, return_sequences=True)(inp)
    lstm_out = KDropout(dropout)(lstm_out)

    # Project to d_model for attention
    x = Dense(d_model)(lstm_out)
    x = LayerNormalization(epsilon=1e-6)(x)

    # Temporal self-attention (static enrichment)
    attn = MultiHeadAttention(num_heads=n_heads, key_dim=d_model // n_heads)(x, x)
    attn = KDropout(dropout)(attn)
    x    = LayerNormalization(epsilon=1e-6)(x + attn)

    # GLU gating: gate branch (sigmoid) × value branch (linear)
    gate  = Dense(d_model, activation="sigmoid")(x)
    value = Dense(d_model, activation="linear")(x)
    x     = Multiply()([gate, value])

    # Take last time step
    x   = Lambda(lambda t: t[:, -1, :])(x)
    out = Dense(1)(x)

    model = Model(inp, out)
    model.compile(optimizer=Adam(1e-3), loss="huber")
    return model


def run_tft(ticker: str, start: str, end: str,
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
    all_scaled = scaler.transform(all_prices.reshape(-1, 1))

    X_train, y_train = [], []
    for i in range(window, n_train):
        X_train.append(all_scaled[i - window:i])
        y_train.append(all_scaled[i, 0])
    X_train = np.array(X_train)
    y_train = np.array(y_train)

    batch_size = min(32, max(1, len(X_train) // 4))
    val_split  = 0.1 if len(X_train) >= 20 else 0.0
    monitor    = "val_loss" if val_split > 0 else "loss"

    model = _build_tft(window)
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

    test_pred = []
    for i in range(n_test):
        x      = all_scaled[n_train + i - window: n_train + i].reshape(1, window, 1)
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
            "name":        "TFT",
            "window":      window,
            "description": (
                "Temporal Fusion Transformer (Google 2021) — simplified: "
                f"LSTM({LSTM_UNITS}) local encoder + MHA({N_HEADS} heads) "
                "temporal attention + GLU gating. "
                "State-of-the-art architecture for multi-horizon forecasting"
                + (f" + {n_future}-step bootstrap forecast" if n_future else "")
            ),
        },
    }
