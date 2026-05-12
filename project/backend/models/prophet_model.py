"""
Prophet (Meta, 2017) — additive trend + seasonality + changepoints.
Fast MAP estimation (no MCMC).
"""
import numpy as np
import pandas as pd

from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all
from services.forecast_utils import future_trading_dates, bootstrap_future, bootstrap_scenarios
from models._common import get_seed


def run_prophet(ticker: str, start: str, end: str,
                window: int = 60, n_future: int = 0, interval: str = "1d") -> dict:
    from prophet import Prophet  # lazy import — slow to load

    df = load_data(ticker, start, end, interval)
    train_df, test_df = train_test_split_series(df)

    train_prices = train_df["Close"].values.astype(float).flatten()
    test_prices  = test_df["Close"].values.astype(float).flatten()

    date_fmt    = "%Y-%m-%d %H:%M" if interval in ("1h", "6h", "12h") else "%Y-%m-%d"
    train_dates = [d.strftime(date_fmt) for d in train_df.index]
    test_dates  = [d.strftime(date_fmt) for d in test_df.index]

    # Prophet requires tz-naive datetime column 'ds'
    train_ds = pd.to_datetime(train_df.index).tz_localize(None)
    test_ds  = pd.to_datetime(test_df.index).tz_localize(None)

    prophet_train = pd.DataFrame({"ds": train_ds, "y": train_prices})

    # Seasonality depends on interval
    yearly  = interval in ("1d", "1wk", "1mo")
    weekly  = interval in ("1d", "1h", "6h", "12h")
    daily   = interval in ("1h",)

    m = Prophet(
        yearly_seasonality=yearly,
        weekly_seasonality=weekly,
        daily_seasonality=daily,
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10.0,
    )
    m.fit(prophet_train)

    # Predict on test dates
    test_future = pd.DataFrame({"ds": test_ds})
    test_forecast = m.predict(test_future)
    test_pred = test_forecast["yhat"].values.astype(float)

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
        # Extend dataframe into the future
        future_df    = m.make_future_dataframe(periods=n_future, freq="B" if interval == "1d" else "H")
        future_df    = future_df.tail(n_future)  # only future rows
        future_fc    = m.predict(future_df)
        base         = future_fc["yhat"].values.astype(float)
        future_dates = future_trading_dates(test_dates[-1], n_future, interval)
        # Align lengths (Prophet may return different count due to calendar)
        n = min(len(base), len(future_dates), n_future)
        base         = base[:n]
        future_dates = future_dates[:n]
        all_dates   += future_dates
        all_actual  += [None] * n
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
            "name":        "Prophet",
            "description": (
                "Meta Prophet — additive decomposition: trend + seasonality + changepoints. "
                "Interpretable, handles missing data and outliers well"
                + (f" + {n_future}-step bootstrap forecast" if n_future else "")
            ),
        },
    }
