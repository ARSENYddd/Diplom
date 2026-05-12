"""
XGBoost with engineered lag + rolling features.
Features: lag(1,2,3,5,10,20,60), rolling mean/std (5,10,20,60),
          momentum(5,20), target = next-day price.
Walk-forward backtest (no refit — predict one step at a time from history).
"""
import numpy as np
import pandas as pd

from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all
from services.forecast_utils import future_trading_dates, bootstrap_future, bootstrap_scenarios
from models._common import get_seed


def _make_features(prices: np.ndarray) -> pd.DataFrame:
    """Create lag + rolling features. Returns DataFrame, first ~60 rows have NaN."""
    s = pd.Series(prices)
    feats = {}
    for lag in [1, 2, 3, 5, 10, 20, 60]:
        feats[f"lag_{lag}"] = s.shift(lag)
    for win in [5, 10, 20, 60]:
        feats[f"roll_mean_{win}"] = s.rolling(win).mean()
        feats[f"roll_std_{win}"]  = s.rolling(win).std()
    feats["mom_5"]  = s.pct_change(5)
    feats["mom_20"] = s.pct_change(20)
    return pd.DataFrame(feats)


def run_xgboost(ticker: str, start: str, end: str,
                window: int = 60, n_future: int = 0, interval: str = "1d") -> dict:
    import xgboost as xgb

    df = load_data(ticker, start, end, interval)
    train_df, test_df = train_test_split_series(df)

    all_prices = df["Close"].values.astype(float).flatten()
    n_train    = len(train_df)
    n_test     = len(test_df)

    date_fmt    = "%Y-%m-%d %H:%M" if interval in ("1h", "6h", "12h") else "%Y-%m-%d"
    train_dates = [d.strftime(date_fmt) for d in train_df.index]
    test_dates  = [d.strftime(date_fmt) for d in test_df.index]

    train_prices = all_prices[:n_train]
    test_prices  = all_prices[n_train:]

    # Build features on full series to avoid look-ahead leak
    feat_df = _make_features(all_prices)
    feat_df["target"] = pd.Series(all_prices).shift(-1)  # next price
    feat_df = feat_df.dropna()

    # Align indices: features at index i predict price at i+1
    # We need rows where both features (up to index i) and target (i+1) exist
    feat_cols = [c for c in feat_df.columns if c != "target"]

    # Training data: rows within train region (after NaN warmup)
    train_mask = feat_df.index < n_train - 1  # -1 because target is shifted
    X_train = feat_df.loc[train_mask, feat_cols].values
    y_train = feat_df.loc[train_mask, "target"].values

    model = xgb.XGBRegressor(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        random_state=42,
        verbosity=0,
    )
    model.fit(X_train, y_train)

    # Walk-forward on test set: use model to predict each next price
    # Input features are built from history (no future leak)
    test_pred = []
    history   = list(all_prices[:n_train])
    for i in range(n_test):
        feat_row = _make_features(np.array(history))
        feat_row = feat_row.dropna()
        if len(feat_row) == 0:
            test_pred.append(history[-1])
        else:
            x = feat_row.iloc[-1][feat_cols].values.reshape(1, -1)
            test_pred.append(float(model.predict(x)[0]))
        history.append(float(test_prices[i]))  # teacher forcing

    test_pred = np.array(test_pred)
    metrics   = compute_all(test_prices, test_pred)
    residuals = test_prices - test_pred
    seed      = get_seed(ticker)

    all_dates   = train_dates + test_dates
    all_actual  = train_prices.tolist() + test_prices.tolist()
    all_pred    = [None] * len(train_dates) + test_pred.tolist()
    test_from   = len(train_dates)
    future_from = len(all_dates)

    scenarios = []
    if n_future > 0:
        future_history = list(all_prices)
        base = []
        for _ in range(n_future):
            feat_row = _make_features(np.array(future_history)).dropna()
            if len(feat_row) == 0:
                pred = future_history[-1]
            else:
                x    = feat_row.iloc[-1][feat_cols].values.reshape(1, -1)
                pred = float(model.predict(x)[0])
            base.append(pred)
            future_history.append(pred)

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
            "name":        "XGBoost",
            "description": (
                "Gradient boosting on lag + rolling features: "
                "lag(1,2,3,5,10,20,60), rolling mean/std (5,10,20,60), momentum(5,20). "
                "Strong tabular baseline, no temporal architecture required"
                + (f" + {n_future}-step autoregressive forecast" if n_future else "")
            ),
        },
    }
