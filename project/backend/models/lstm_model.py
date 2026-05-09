"""
Improved LSTM: CNN-BiLSTM + 6 technical features + better training.

Improvements over the baseline:
  1. restore_best_weights=True  in EarlyStopping
  2. ReduceLROnPlateau           adaptive learning rate
  3. Bidirectional LSTM          reads sequences both ways
  4. Log-return normalisation    stationary inputs
  5. CNN feature extractor       local pattern detection
  6. 6 technical indicators      MA-ratio x2, rolling-vol, RSI, momentum
"""
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all
from services.forecast_utils import future_trading_dates, bootstrap_future, bootstrap_scenarios
from models._common import HAS_TF, get_seed

# ── Feature definitions ──────────────────────────────────────────────────────
FEATURE_COLS = ['log_ret', 'ma_r5', 'ma_r20', 'vol10', 'rsi', 'mom5']
N_FEATURES   = len(FEATURE_COLS)


def _make_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute 6 technical features aligned to df's DatetimeIndex.
    Returns DataFrame with columns ['close'] + FEATURE_COLS.
    First ~20 rows are dropped (NaN from rolling windows).
    """
    prices   = df['Close'].astype(float)
    log_ret  = np.log(prices / prices.shift(1))
    ma_r5    = prices.rolling(5).mean()  / prices - 1
    ma_r20   = prices.rolling(20).mean() / prices - 1
    vol10    = log_ret.rolling(10).std()

    delta    = prices.diff()
    gain     = delta.clip(lower=0).rolling(14).mean()
    loss     = (-delta.clip(upper=0)).rolling(14).mean()
    rsi_norm = (100 - 100 / (1 + gain / (loss + 1e-10))) / 50 - 1   # -> [-1, 1]

    mom5 = prices.pct_change(5)

    return pd.DataFrame({
        'close':   prices,
        'log_ret': log_ret,
        'ma_r5':   ma_r5,
        'ma_r20':  ma_r20,
        'vol10':   vol10,
        'rsi':     rsi_norm,
        'mom5':    mom5,
    }, index=df.index).dropna()


def _features_from_prices(prices: np.ndarray) -> np.ndarray:
    """Same features from raw 1-D price array (for autoregressive future steps)."""
    return _make_features(pd.DataFrame({'Close': prices}))[FEATURE_COLS].values


def _build_sequences(X: np.ndarray, y: np.ndarray, window: int):
    Xs, ys = [], []
    for i in range(window, len(X)):
        Xs.append(X[i - window:i])
        ys.append(y[i])
    return np.array(Xs), np.array(ys)


def _build_model(window: int, n_features: int):
    """
    Architecture: Causal Conv1D x2  ->  Bidirectional LSTM(64)
                  ->  Bidirectional LSTM(32)  ->  Dense(1).
    Huber loss is robust to price spikes / outliers.
    """
    from tensorflow.keras.models import Model
    from tensorflow.keras.layers import Input, Conv1D, Dropout, Bidirectional, LSTM, Dense
    from tensorflow.keras.optimizers import Adam

    inp = Input(shape=(window, n_features))
    x   = Conv1D(64, kernel_size=3, padding='causal', activation='relu')(inp)
    x   = Conv1D(32, kernel_size=3, padding='causal', activation='relu')(x)
    x   = Dropout(0.1)(x)
    x   = Bidirectional(LSTM(64, return_sequences=True))(x)
    x   = Dropout(0.2)(x)
    x   = Bidirectional(LSTM(32))(x)
    x   = Dropout(0.2)(x)
    out = Dense(1)(x)

    model = Model(inp, out)
    model.compile(optimizer=Adam(learning_rate=1e-3), loss='huber')
    return model


# ── Main entry point ─────────────────────────────────────────────────────────

def run_lstm(ticker: str, start: str, end: str,
             window: int = 60, n_future: int = 0, interval: str = "1d") -> dict:
    if not HAS_TF:
        raise RuntimeError("TensorFlow is not installed")

    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

    # ── 1. Load & engineer features ──────────────────────────────────────────
    df      = load_data(ticker, start, end, interval)
    feat_df = _make_features(df)       # DatetimeIndex-aligned, NaN rows dropped

    n_total = len(feat_df)
    n_train = int(n_total * 0.8)
    n_test  = n_total - n_train

    if n_train < 30 or n_test < 5:
        raise ValueError(
            f"Недостаточно данных: {n_total} точек после feature-engineering. "
            "Увеличьте период обучения."
        )

    train_feat   = feat_df[FEATURE_COLS].values[:n_train]
    test_feat    = feat_df[FEATURE_COLS].values[n_train:]   # noqa: F841
    train_prices = feat_df['close'].values[:n_train]
    test_prices  = feat_df['close'].values[n_train:]

    date_fmt    = "%Y-%m-%d %H:%M" if interval in ("1h", "6h", "12h") else "%Y-%m-%d"
    train_dates = [d.strftime(date_fmt) for d in feat_df.index[:n_train]]
    test_dates  = [d.strftime(date_fmt) for d in feat_df.index[n_train:]]

    # ── 2. Scale ──────────────────────────────────────────────────────────────
    window = min(window, max(5, n_train // 3))
    if n_train <= window:
        raise ValueError(f"Недостаточно данных: {n_train} строк, окно={window}.")

    feat_scaler  = StandardScaler().fit(train_feat)
    price_scaler = StandardScaler().fit(train_prices.reshape(-1, 1))

    all_feat_scaled   = feat_scaler.transform(feat_df[FEATURE_COLS].values)
    train_feat_scaled = all_feat_scaled[:n_train]

    X_train, y_raw = _build_sequences(train_feat_scaled, train_prices, window)
    y_train        = price_scaler.transform(y_raw.reshape(-1, 1)).flatten()

    # ── 3. Train ──────────────────────────────────────────────────────────────
    batch_size = min(32, max(1, len(X_train) // 4))
    val_split  = 0.1 if len(X_train) >= 20 else 0.0
    monitor    = 'val_loss' if val_split > 0 else 'loss'

    model = _build_model(window, N_FEATURES)
    model.fit(
        X_train, y_train,
        epochs=100,
        batch_size=batch_size,
        validation_split=val_split,
        callbacks=[
            EarlyStopping(monitor=monitor, patience=10, restore_best_weights=True),
            ReduceLROnPlateau(monitor=monitor, factor=0.5, patience=5, min_lr=1e-6),
        ],
        verbose=0,
    )

    # ── 4. Walk-forward backtest on test set ──────────────────────────────────
    test_pred_scaled = []
    for i in range(n_test):
        x = all_feat_scaled[n_train + i - window: n_train + i].reshape(1, window, N_FEATURES)
        test_pred_scaled.append(float(model.predict(x, verbose=0)[0, 0]))

    test_pred = price_scaler.inverse_transform(
        np.array(test_pred_scaled).reshape(-1, 1)
    ).flatten()

    metrics   = compute_all(test_prices, test_pred)
    residuals = test_prices - test_pred
    seed      = get_seed(ticker)

    # ── 5. Assemble base arrays ───────────────────────────────────────────────
    all_dates   = train_dates + test_dates
    all_actual  = train_prices.tolist() + test_prices.tolist()
    all_pred    = [None] * n_train + test_pred.tolist()
    test_from   = n_train
    future_from = len(all_dates)

    # ── 6. Autoregressive future forecast ─────────────────────────────────────
    scenarios = []
    if n_future > 0:
        price_buffer = list(feat_df['close'].values)
        base_prices  = []

        for _ in range(n_future):
            needed   = window + 25         # enough for rolling(20) + window rows
            buf_feat = _features_from_prices(np.array(price_buffer[-needed:]))
            if len(buf_feat) < window:
                break
            x      = feat_scaler.transform(buf_feat[-window:]).reshape(1, window, N_FEATURES)
            pred_s = float(model.predict(x, verbose=0)[0, 0])
            pred_p = float(price_scaler.inverse_transform([[pred_s]])[0, 0])
            base_prices.append(pred_p)
            price_buffer.append(pred_p)

        base_arr     = np.array(base_prices)
        future_dates = future_trading_dates(test_dates[-1], len(base_arr), interval)
        all_dates   += future_dates
        all_actual  += [None] * len(base_arr)
        all_pred    += bootstrap_future(base_arr, residuals, seed=seed).tolist()
        scenarios    = bootstrap_scenarios(base_arr, residuals, base_seed=seed)

    return {
        "dates":             all_dates,
        "actual":            all_actual,
        "predicted":         all_pred,
        "scenarios":         scenarios,
        "test_from_index":   test_from,
        "future_from_index": future_from if n_future > 0 else None,
        "metrics":           metrics,
        "model_info": {
            "name":         "LSTM (CNN-BiLSTM)",
            "architecture": "Conv1D x2 -> BiLSTM(64) -> BiLSTM(32) -> Dense",
            "window":       window,
            "n_features":   N_FEATURES,
            "features":     FEATURE_COLS,
            "description": (
                "Causal CNN extracts local candle patterns; "
                "Bidirectional LSTM captures long-range temporal dependencies; "
                "6 technical features: log-return, MA-ratio x2, "
                "rolling volatility, RSI, momentum"
                + (f"; {n_future}-step bootstrap scenarios" if n_future else "")
            ),
        },
    }
