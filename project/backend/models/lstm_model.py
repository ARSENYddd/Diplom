import numpy as np
from sklearn.preprocessing import MinMaxScaler
from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all
from services.forecast_utils import future_trading_dates, bootstrap_future, bootstrap_scenarios
from models._common import (
    HAS_TF, _build_sequences_1d, build_lstm_1d, make_early_stopping, get_seed,
)


def run_lstm(ticker: str, start: str, end: str, window: int = 60, n_future: int = 0, interval: str = "1d") -> dict:
    if not HAS_TF:
        raise RuntimeError("TensorFlow is not installed")

    df = load_data(ticker, start, end, interval)
    train_df, test_df = train_test_split_series(df)

    train_prices = train_df["Close"].values.astype(float).flatten()
    test_prices  = test_df["Close"].values.astype(float).flatten()

    # Auto-reduce window if training data is too short
    window = min(window, max(5, len(train_prices) // 3))
    if len(train_prices) <= window:
        raise ValueError(
            f"Недостаточно данных: {len(train_prices)} точек, окно={window}. "
            "Увеличьте период или уменьшите окно."
        )

    # --- Train model ---
    scaler = MinMaxScaler(feature_range=(0, 1))
    train_scaled = scaler.fit_transform(train_prices.reshape(-1, 1))

    X_train, y_train = _build_sequences_1d(train_scaled, window)
    X_train = X_train.reshape(X_train.shape[0], window, 1)

    # Adjust batch_size for small datasets
    batch_size = min(32, max(1, len(X_train) // 4))
    val_split  = 0.1 if len(X_train) >= 20 else 0.0

    model = build_lstm_1d(window)
    es    = make_early_stopping(val_split)
    model.fit(X_train, y_train, epochs=50, batch_size=batch_size,
              validation_split=val_split, callbacks=[es], verbose=0)

    # --- Backtest: walk-forward on test set ---
    all_prices = np.concatenate([train_prices, test_prices])
    all_scaled = scaler.transform(all_prices.reshape(-1, 1))
    n_train    = len(train_prices)

    test_pred_scaled = []
    for i in range(len(test_prices)):
        x = all_scaled[n_train + i - window: n_train + i].reshape(1, window, 1)
        test_pred_scaled.append(model.predict(x, verbose=0)[0, 0])

    test_pred = scaler.inverse_transform(
        np.array(test_pred_scaled).reshape(-1, 1)
    ).flatten()

    metrics   = compute_all(test_prices, test_pred)
    residuals = test_prices - test_pred

    train_dates = [d.strftime("%Y-%m-%d") for d in train_df.index]
    test_dates  = [d.strftime("%Y-%m-%d") for d in test_df.index]

    all_dates  = train_dates + test_dates
    all_actual = train_prices.tolist() + test_prices.tolist()
    all_pred   = [None] * len(train_dates) + test_pred.tolist()
    test_from  = len(train_dates)
    future_from = len(all_dates)

    # --- Future forecast: autoregressive + bootstrap scenarios ---
    seed = get_seed(ticker)
    scenarios = []
    if n_future > 0:
        rolling = list(all_scaled[-window:, 0])
        base_scaled = []
        for _ in range(n_future):
            x = np.array(rolling[-window:]).reshape(1, window, 1)
            pred = model.predict(x, verbose=0)[0, 0]
            base_scaled.append(pred)
            rolling.append(pred)

        base_prices  = scaler.inverse_transform(
            np.array(base_scaled).reshape(-1, 1)
        ).flatten()
        future_dates = future_trading_dates(test_dates[-1], n_future, interval)
        all_dates   += future_dates
        all_actual  += [None] * n_future
        all_pred    += bootstrap_future(base_prices, residuals, seed=seed).tolist()
        scenarios    = bootstrap_scenarios(base_prices, residuals, base_seed=seed)

    return {
        "dates": all_dates,
        "actual": all_actual,
        "predicted": all_pred,
        "scenarios": scenarios,
        "test_from_index": test_from,
        "future_from_index": future_from if n_future > 0 else None,
        "metrics": metrics,
        "model_info": {
            "name": "LSTM",
            "architecture": "2×LSTM(64) + Dropout(0.2)",
            "window": window,
            "description": "LSTM walk-forward backtest"
            + (f" + {n_future}-day bootstrap forecast" if n_future else ""),
        },
    }
