import numpy as np
import pandas as pd
from pmdarima import auto_arima
from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all


def run_arima(ticker: str, start: str, end: str, window: int = 60) -> dict:
    df = load_data(ticker, start, end)
    train_df, test_df = train_test_split_series(df)

    train_prices = train_df["Close"].values.astype(float)
    test_prices = test_df["Close"].values.astype(float)

    model = auto_arima(
        train_prices,
        seasonal=False,
        information_criterion="aic",
        stepwise=True,
        suppress_warnings=True,
        error_action="ignore",
        max_p=5,
        max_q=5,
        d=1,
    )

    order = model.order
    predictions = []
    history = list(train_prices)

    for i in range(len(test_prices)):
        model_fit = model.fit(np.array(history))
        fc = model_fit.predict(n_periods=1)[0]
        predictions.append(float(fc))
        history.append(float(test_prices[i]))

    predictions = np.array(predictions)
    metrics = compute_all(test_prices, predictions)
    dates = [d.strftime("%Y-%m-%d") for d in test_df.index]

    return {
        "dates": dates,
        "actual": test_prices.tolist(),
        "predicted": predictions.tolist(),
        "metrics": metrics,
        "model_info": {
            "name": "ARIMA",
            "order": list(order),
            "description": f"ARIMA{order} fitted with auto_arima (AIC criterion)",
        },
    }
