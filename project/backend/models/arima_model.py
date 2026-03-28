import numpy as np
from pmdarima import auto_arima
from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all
from services.forecast_utils import future_trading_dates, bootstrap_future


def run_arima(ticker: str, start: str, end: str, window: int = 60, n_future: int = 0) -> dict:
    df = load_data(ticker, start, end)
    train_df, test_df = train_test_split_series(df)

    train_prices = train_df["Close"].values.astype(float).flatten()
    test_prices  = test_df["Close"].values.astype(float).flatten()

    # --- Backtest: walk-forward on test set ---
    model = auto_arima(
        train_prices, seasonal=False, information_criterion="aic",
        stepwise=True, suppress_warnings=True, error_action="ignore",
        max_p=5, max_q=5, d=1,
    )
    test_pred = []
    for i in range(len(test_prices)):
        fc = model.predict(n_periods=1)[0]
        test_pred.append(float(fc))
        model.update([float(test_prices[i])])
    test_pred = np.array(test_pred)

    metrics   = compute_all(test_prices, test_pred)
    residuals = test_prices - test_pred   # for bootstrap

    train_dates = [d.strftime("%Y-%m-%d") for d in train_df.index]
    test_dates  = [d.strftime("%Y-%m-%d") for d in test_df.index]

    # Build response arrays (train period: no predictions)
    all_dates   = train_dates + test_dates
    all_actual  = train_prices.tolist() + test_prices.tolist()
    all_pred    = [None] * len(train_dates) + test_pred.tolist()
    test_from   = len(train_dates)
    future_from = len(all_dates)

    # --- Future forecast ---
    future_dates = []
    if n_future > 0:
        base = model.predict(n_periods=n_future)
        stochastic = bootstrap_future(base, residuals, seed=hash(ticker) % 2**31)
        future_dates = future_trading_dates(test_dates[-1], n_future)
        all_dates   += future_dates
        all_actual  += [None] * n_future
        all_pred    += stochastic.tolist()

    return {
        "dates": all_dates,
        "actual": all_actual,
        "predicted": all_pred,
        "test_from_index": test_from,
        "future_from_index": future_from if n_future > 0 else None,
        "metrics": metrics,
        "model_info": {
            "name": "ARIMA",
            "order": list(model.order),
            "description": f"ARIMA{model.order} walk-forward backtest"
            + (f" + {n_future}-day bootstrap forecast" if n_future else ""),
        },
    }
