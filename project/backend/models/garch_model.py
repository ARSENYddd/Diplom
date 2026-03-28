import numpy as np
from arch import arch_model
from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all
from services.forecast_utils import future_trading_dates, bootstrap_future


def run_garch(ticker: str, start: str, end: str, window: int = 60, n_future: int = 0) -> dict:
    df = load_data(ticker, start, end)
    train_df, test_df = train_test_split_series(df)

    train_prices = train_df["Close"].values.astype(float).flatten()
    test_prices  = test_df["Close"].values.astype(float).flatten()

    # --- Backtest: walk-forward on test set ---
    all_prices  = np.concatenate([train_prices, test_prices])
    all_returns = np.diff(np.log(all_prices)) * 100
    n_train_ret = len(train_prices) - 1

    test_pred = []
    for i in range(len(test_prices)):
        window_ret = all_returns[: n_train_ret + i]
        m   = arch_model(window_ret, vol="Garch", p=1, q=1, dist="normal")
        res = m.fit(disp="off", show_warning=False)
        fc  = res.forecast(horizon=1)
        next_return = float(fc.mean.iloc[-1, 0]) / 100
        last_price  = all_prices[n_train_ret + i]   # previous known price
        test_pred.append(float(last_price * np.exp(next_return)))
    test_pred = np.array(test_pred)

    metrics   = compute_all(test_prices, test_pred)
    residuals = test_prices - test_pred

    train_dates = [d.strftime("%Y-%m-%d") for d in train_df.index]
    test_dates  = [d.strftime("%Y-%m-%d") for d in test_df.index]

    all_dates  = train_dates + test_dates
    all_actual = train_prices.tolist() + test_prices.tolist()
    all_pred   = [None] * len(train_dates) + test_pred.tolist()
    test_from  = len(train_dates)
    future_from = len(all_dates)

    # --- Future forecast ---
    if n_future > 0:
        full_returns = np.diff(np.log(all_prices)) * 100
        m   = arch_model(full_returns, vol="Garch", p=1, q=1, dist="normal")
        res = m.fit(disp="off", show_warning=False)
        fc  = res.forecast(horizon=n_future)
        mean_returns = fc.mean.iloc[-1].values / 100

        base_prices = []
        last_p = all_prices[-1]
        for r in mean_returns:
            last_p = last_p * np.exp(r)
            base_prices.append(last_p)
        base_prices = np.array(base_prices)
        stochastic  = bootstrap_future(base_prices, residuals, seed=hash(ticker) % 2**31)

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
            "name": "GARCH",
            "order": [1, 1],
            "description": "GARCH(1,1) walk-forward backtest"
            + (f" + {n_future}-day bootstrap forecast" if n_future else ""),
        },
    }
