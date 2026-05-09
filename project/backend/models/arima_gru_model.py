"""
Гибридная модель ARIMA + GRU.
  ŷ_t = ŷ_ARIMA_t + ŷ_GRU(e_t)   где  e_t = y_t − ŷ_ARIMA_t

GRU обучается быстрее LSTM за счёт упрощённой структуры врат:
вместо трёх (input/forget/output) используются только update и reset,
что сокращает число параметров и ускоряет сходимость.
"""
import numpy as np
from pmdarima import auto_arima
from sklearn.preprocessing import MinMaxScaler
from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all
from services.forecast_utils import future_trading_dates, bootstrap_future, bootstrap_scenarios
from models._common import (
    HAS_TF, _build_sequences_1d, build_gru_1d, make_early_stopping, get_seed,
)


def run_arima_gru(ticker: str, start: str, end: str, window: int = 60, n_future: int = 0, interval: str = "1d") -> dict:
    if not HAS_TF:
        raise RuntimeError("TensorFlow is not installed")

    df = load_data(ticker, start, end, interval)
    train_df, test_df = train_test_split_series(df)

    train_prices = train_df["Close"].values.astype(float).flatten()
    test_prices  = test_df["Close"].values.astype(float).flatten()

    window = min(window, max(5, len(train_prices) // 3))
    if len(train_prices) <= window:
        raise ValueError(
            f"Недостаточно данных: {len(train_prices)} точек, окно={window}."
        )

    # ── Step 1: ARIMA — линейный тренд ────────────────────────────────────────
    arima = auto_arima(
        train_prices, seasonal=False, information_criterion="aic",
        stepwise=True, suppress_warnings=True, error_action="ignore",
        max_p=5, max_q=5, d=1,
    )
    arima_insample  = arima.predict_in_sample()
    n_fitted        = len(arima_insample)
    train_aligned   = train_prices[-n_fitted:]
    train_residuals = train_aligned - arima_insample

    # ── Step 2: GRU — нелинейная коррекция остатков ───────────────────────────
    res_scaler = MinMaxScaler(feature_range=(-1, 1))
    res_scaled = res_scaler.fit_transform(train_residuals.reshape(-1, 1))

    X_res, y_res = _build_sequences_1d(res_scaled, window)
    X_res = X_res.reshape(X_res.shape[0], window, 1)

    batch_size = min(32, max(1, len(X_res) // 4))
    val_split  = 0.1 if len(X_res) >= 20 else 0.0

    gru = build_gru_1d(window)
    es  = make_early_stopping(val_split)
    gru.fit(X_res, y_res, epochs=50, batch_size=batch_size,
            validation_split=val_split, callbacks=[es], verbose=0)

    # ── Step 3: Walk-forward backtest на тестовой выборке ─────────────────────
    history_res = list(train_residuals)
    test_pred   = []

    for i in range(len(test_prices)):
        arima_fc = float(arima.predict(n_periods=1)[0])

        res_win = np.array(history_res[-window:]).reshape(-1, 1)
        res_sc  = res_scaler.transform(res_win).reshape(1, window, 1)
        gru_corr = float(res_scaler.inverse_transform(
            [[gru.predict(res_sc, verbose=0)[0, 0]]]
        )[0, 0])

        test_pred.append(arima_fc + gru_corr)

        actual_res = float(test_prices[i]) - arima_fc
        history_res.append(actual_res)
        arima.update([float(test_prices[i])])

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

    # ── Future forecast ────────────────────────────────────────────────────────
    seed = get_seed(ticker)
    scenarios = []
    if n_future > 0:
        arima_future = arima.predict(n_periods=n_future)
        rolling_res  = list(res_scaled[-window:, 0])
        base_prices  = []

        for i in range(n_future):
            x = np.array(rolling_res[-window:]).reshape(1, window, 1)
            gru_sc = float(gru.predict(x, verbose=0)[0, 0])
            gru_corr = float(res_scaler.inverse_transform([[gru_sc]])[0, 0])
            base_prices.append(float(arima_future[i]) + gru_corr)
            rolling_res.append(gru_sc)

        base_prices  = np.array(base_prices)
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
            "name": "ARIMA+GRU",
            "arima_order": list(arima.order),
            "gru_architecture": "2×GRU(64) + Dropout(0.2)",
            "window": window,
            "description": "Гибрид: ARIMA (тренд) + GRU (нелинейные остатки)"
            + (f" + {n_future}-day прогноз" if n_future else ""),
        },
    }
