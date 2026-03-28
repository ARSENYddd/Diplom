import numpy as np
import pandas as pd
from datetime import date, timedelta
from pmdarima import auto_arima
from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all


def _future_dates(last_date_str: str, n: int) -> list:
    d = date.fromisoformat(last_date_str)
    result = []
    while len(result) < n:
        d += timedelta(days=1)
        if d.weekday() < 5:
            result.append(d.strftime("%Y-%m-%d"))
    return result


def run_arima(ticker: str, start: str, end: str, window: int = 60, n_future: int = 0) -> dict:
    df = load_data(ticker, start, end)

    if n_future > 0:
        # Future mode: train on ALL available data, then forecast ahead
        all_prices = df["Close"].values.astype(float).flatten()
        model = auto_arima(
            all_prices, seasonal=False, information_criterion="aic",
            stepwise=True, suppress_warnings=True, error_action="ignore",
            max_p=5, max_q=5, d=1,
        )
        future_preds = model.predict(n_periods=n_future).tolist()
        future_dates = _future_dates(df.index[-1].strftime("%Y-%m-%d"), n_future)
        hist_dates = [d.strftime("%Y-%m-%d") for d in df.index]
        hist_prices = all_prices.tolist()
        return {
            "dates": hist_dates + future_dates,
            "actual": hist_prices + [None] * n_future,
            "predicted": [None] * len(hist_prices) + future_preds,
            "future_from_index": len(hist_prices),
            "metrics": None,
            "model_info": {
                "name": "ARIMA",
                "order": list(model.order),
                "mode": f"future forecast ({n_future} days)",
            },
        }

    # Historical backtest mode
    train_df, test_df = train_test_split_series(df)
    train_prices = train_df["Close"].values.astype(float).flatten()
    test_prices = test_df["Close"].values.astype(float).flatten()

    model = auto_arima(
        train_prices, seasonal=False, information_criterion="aic",
        stepwise=True, suppress_warnings=True, error_action="ignore",
        max_p=5, max_q=5, d=1,
    )

    predictions = []
    for i in range(len(test_prices)):
        fc = model.predict(n_periods=1)[0]
        predictions.append(float(fc))
        model.update([float(test_prices[i])])

    predictions = np.array(predictions)
    metrics = compute_all(test_prices, predictions)
    dates = [d.strftime("%Y-%m-%d") for d in test_df.index]

    return {
        "dates": dates,
        "actual": test_prices.tolist(),
        "predicted": predictions.tolist(),
        "future_from_index": None,
        "metrics": metrics,
        "model_info": {
            "name": "ARIMA",
            "order": list(model.order),
            "description": f"ARIMA{model.order} walk-forward backtest",
        },
    }
