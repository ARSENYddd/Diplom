import numpy as np
import pandas as pd
from datetime import date, timedelta
from arch import arch_model
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


def run_garch(ticker: str, start: str, end: str, window: int = 60, n_future: int = 0) -> dict:
    df = load_data(ticker, start, end)

    if n_future > 0:
        # Future mode: fit on all data, forecast n_future steps
        all_prices = df["Close"].values.astype(float).flatten()
        returns = np.diff(np.log(all_prices)) * 100
        m = arch_model(returns, vol="Garch", p=1, q=1, dist="normal")
        res = m.fit(disp="off", show_warning=False)
        fc = res.forecast(horizon=n_future)
        mean_returns = fc.mean.iloc[-1].values / 100  # shape: (n_future,)

        future_prices = []
        last_price = all_prices[-1]
        for r in mean_returns:
            last_price = last_price * np.exp(r)
            future_prices.append(float(last_price))

        future_dates = _future_dates(df.index[-1].strftime("%Y-%m-%d"), n_future)
        hist_dates = [d.strftime("%Y-%m-%d") for d in df.index]
        hist_prices = all_prices.tolist()
        return {
            "dates": hist_dates + future_dates,
            "actual": hist_prices + [None] * n_future,
            "predicted": [None] * len(hist_prices) + future_prices,
            "future_from_index": len(hist_prices),
            "metrics": None,
            "model_info": {
                "name": "GARCH",
                "order": [1, 1],
                "mode": f"future forecast ({n_future} days)",
            },
        }

    # Historical backtest mode
    train_df, test_df = train_test_split_series(df)
    train_prices = train_df["Close"].values.astype(float).flatten()
    test_prices = test_df["Close"].values.astype(float).flatten()

    train_returns = np.diff(np.log(train_prices)) * 100
    all_prices = np.concatenate([train_prices, test_prices])
    all_returns = np.diff(np.log(all_prices)) * 100
    n_train = len(train_returns)

    predictions = []
    for i in range(len(test_prices)):
        window_returns = all_returns[: n_train + i]
        m = arch_model(window_returns, vol="Garch", p=1, q=1, dist="normal")
        r = m.fit(disp="off", show_warning=False)
        fc = r.forecast(horizon=1)
        next_return = float(fc.mean.iloc[-1, 0]) / 100
        last_price = all_prices[n_train + i - 1]  # previous known price
        pred_price = last_price * np.exp(next_return)
        predictions.append(float(pred_price))

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
            "name": "GARCH",
            "order": [1, 1],
            "description": "GARCH(1,1) walk-forward backtest",
        },
    }
