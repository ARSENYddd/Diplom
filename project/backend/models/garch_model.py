import numpy as np
import pandas as pd
from arch import arch_model
from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all


def run_garch(ticker: str, start: str, end: str, window: int = 60) -> dict:
    df = load_data(ticker, start, end)
    train_df, test_df = train_test_split_series(df)

    train_prices = train_df["Close"].values.astype(float)
    test_prices = test_df["Close"].values.astype(float)

    # GARCH works on returns, then we reconstruct price levels
    train_returns = np.diff(np.log(train_prices)) * 100  # log returns in %

    model = arch_model(train_returns, vol="Garch", p=1, q=1, dist="normal")
    res = model.fit(disp="off", show_warning=False)

    # Walk-forward prediction
    all_prices = np.concatenate([train_prices, test_prices])
    all_returns = np.diff(np.log(all_prices)) * 100
    n_train = len(train_returns)

    predictions = []
    for i in range(len(test_prices)):
        window_returns = all_returns[: n_train + i]
        m = arch_model(window_returns, vol="Garch", p=1, q=1, dist="normal")
        r = m.fit(disp="off", show_warning=False)
        # Forecast next return (mean component)
        fc = r.forecast(horizon=1)
        next_return = float(fc.mean.iloc[-1, 0]) / 100  # back to decimal
        last_price = all_prices[n_train + i - 1]  # previous known price (not current!)
        pred_price = last_price * np.exp(next_return)
        predictions.append(float(pred_price))

    predictions = np.array(predictions)
    metrics = compute_all(test_prices, predictions)
    dates = [d.strftime("%Y-%m-%d") for d in test_df.index]

    return {
        "dates": dates,
        "actual": test_prices.tolist(),
        "predicted": predictions.tolist(),
        "metrics": metrics,
        "model_info": {
            "name": "GARCH",
            "order": [1, 1],
            "description": "GARCH(1,1) on log-returns, price reconstructed via exponentiation",
        },
    }
