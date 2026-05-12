"""
SARIMA — Seasonal ARIMA with auto-selection of (p,d,q)(P,D,Q)[m].
Uses pmdarima.auto_arima with seasonal=True.
Seasonal period m is chosen by interval:
  1h → 24, 6h → 4, 12h → 2, 1d → 5 (weekly), 1wk → 52, 1mo → 12
"""
import numpy as np
from pmdarima import auto_arima

from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all
from services.forecast_utils import future_trading_dates, bootstrap_future, bootstrap_scenarios
from models._common import get_seed

_SEASONAL_M = {
    "1h":  24,
    "6h":  4,
    "12h": 2,
    "1d":  5,
    "1wk": 52,
    "1mo": 12,
}


def run_sarima(ticker: str, start: str, end: str,
               window: int = 60, n_future: int = 0, interval: str = "1d") -> dict:
    df = load_data(ticker, start, end, interval)
    train_df, test_df = train_test_split_series(df)

    train_prices = train_df["Close"].values.astype(float).flatten()
    test_prices  = test_df["Close"].values.astype(float).flatten()

    m = _SEASONAL_M.get(interval, 5)

    date_fmt    = "%Y-%m-%d %H:%M" if interval in ("1h", "6h", "12h") else "%Y-%m-%d"
    train_dates = [d.strftime(date_fmt) for d in train_df.index]
    test_dates  = [d.strftime(date_fmt) for d in test_df.index]

    # Fit SARIMA — cap complexity for speed
    model = auto_arima(
        train_prices,
        seasonal=True, m=m,
        information_criterion="aic",
        stepwise=True, suppress_warnings=True, error_action="ignore",
        max_p=2, max_q=2, max_P=1, max_Q=1, d=1, D=1,
    )

    # Walk-forward backtest on test set
    test_pred = []
    for i in range(len(test_prices)):
        fc = model.predict(n_periods=1)[0]
        test_pred.append(float(fc))
        model.update([float(test_prices[i])])
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
        base         = model.predict(n_periods=n_future)
        future_dates = future_trading_dates(test_dates[-1], n_future, interval)
        all_dates   += future_dates
        all_actual  += [None] * n_future
        all_pred    += bootstrap_future(base, residuals, seed=seed).tolist()
        scenarios    = bootstrap_scenarios(base, residuals, base_seed=seed)

    order          = list(model.order)
    seasonal_order = list(model.seasonal_order)

    return {
        "dates":             all_dates,
        "actual":            all_actual,
        "predicted":         all_pred,
        "scenarios":         scenarios,
        "test_from_index":   test_from,
        "future_from_index": future_from if n_future > 0 else None,
        "metrics":           metrics,
        "model_info": {
            "name":           "SARIMA",
            "order":          order,
            "seasonal_order": seasonal_order,
            "seasonal_m":     m,
            "description":    (
                f"SARIMA{tuple(order)}×{tuple(seasonal_order)}[{m}] "
                "walk-forward backtest — seasonal ARIMA captures weekly/annual cycles"
                + (f" + {n_future}-step bootstrap forecast" if n_future else "")
            ),
        },
    }
