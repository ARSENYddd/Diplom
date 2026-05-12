"""
Transformer — multi-head self-attention encoder for time series.
Encoder-only: positional encoding + 2 × (MHA + FFN) layers → pool last token → Dense(1).
Huber loss, Adam(1e-3), EarlyStopping(patience=10).
"""
import numpy as np
from sklearn.preprocessing import MinMaxScaler

from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all
from services.forecast_utils import future_trading_dates, bootstrap_future, bootstrap_scenarios
from models._common import HAS_TF, get_seed

D_MODEL  = 64
N_HEADS  = 4
DFF      = 128
N_LAYERS = 2
DROPOUT  = 0.1


def _positional_encoding(seq_len: int, d_model: int):
    """Sinusoidal positional encoding — shape (1, seq_len, d_model)."""
    pos  = np.arange(seq_len)[:, None]
    dims = np.arange(d_model)[None, :]
    angles = pos / np.power(10000.0, (2 * (dims // 2)) / d_model)
    angles[:, 0::2] = np.sin(angles[:, 0::2])
    angles[:, 1::2] = np.cos(angles[:, 1::2])
    return angles[None].astype("float32")   # (1, seq_len, d_model)


def _build_transformer(window: int, d_model: int = D_MODEL, n_heads: int = N_HEADS,
                        dff: int = DFF, n_layers: int = N_LAYERS, dropout: float = DROPOUT):
    import tensorflow as tf
    from tensorflow.keras.models import Model
    from tensorflow.keras.layers import (
        Input, Dense, Dropout as KDropout,
        MultiHeadAttention, LayerNormalization, Lambda
    )
    from tensorflow.keras.optimizers import Adam

    pos_enc = tf.constant(_positional_encoding(window, d_model))  # (1, window, d_model)

    inp = Input(shape=(window, 1))
    x   = Dense(d_model)(inp)              # project to d_model
    x   = x + pos_enc                      # add positional encoding

    for _ in range(n_layers):
        # Multi-head self-attention sublayer
        attn_out = MultiHeadAttention(num_heads=n_heads, key_dim=d_model // n_heads)(x, x)
        attn_out = KDropout(dropout)(attn_out)
        x        = LayerNormalization(epsilon=1e-6)(x + attn_out)

        # Feed-forward sublayer
        ffn      = Dense(dff, activation="relu")(x)
        ffn      = Dense(d_model)(ffn)
        ffn      = KDropout(dropout)(ffn)
        x        = LayerNormalization(epsilon=1e-6)(x + ffn)

    # Use last time step for prediction
    x   = Lambda(lambda t: t[:, -1, :])(x)
    out = Dense(1)(x)

    model = Model(inp, out)
    model.compile(optimizer=Adam(1e-3), loss="huber")
    return model


def run_transformer(ticker: str, start: str, end: str,
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

    model = _build_transformer(window)
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
            "name":        "Transformer",
            "window":      window,
            "d_model":     D_MODEL,
            "n_heads":     N_HEADS,
            "n_layers":    N_LAYERS,
            "description": (
                f"Transformer encoder: {N_LAYERS}×(MHA({N_HEADS} heads) + FFN({DFF})), "
                f"d_model={D_MODEL}, sinusoidal positional encoding. "
                "Full-window attention — no recurrence, captures long-range dependencies"
                + (f" + {n_future}-step bootstrap forecast" if n_future else "")
            ),
        },
    }
