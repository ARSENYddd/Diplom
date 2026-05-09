"""
Взвешенный ансамбль (Weighted Ensemble).

Ансамбль с весами по точности снижает дисперсию итогового прогноза:
чем точнее модель на валидации, тем больший вес она получает.

Алгоритм:
  1. Обучить 4 компонентные модели: ARIMA, LSTM, ARIMA+LSTM, ARIMA+GARCH+LSTM
  2. Вычислить RMSE каждой на val-подвыборке (последние 10% train)
  3. Веса: wᵢ = (1/RMSEᵢ) / Σ(1/RMSEⱼ)   — обратная пропорциональность ошибке
  4. Walk-forward backtest на тестовой выборке с взвешенным ансамблем
  5. ŷ_ensemble = Σ wᵢ · ŷᵢ
"""
import numpy as np
from pmdarima import auto_arima
from sklearn.preprocessing import MinMaxScaler
from services.data_service import load_data, train_test_split_series
from services.metrics import compute_all
from services.forecast_utils import future_trading_dates, bootstrap_future, bootstrap_scenarios
from models._common import (
    HAS_TF, _build_sequences_1d, _build_sequences_2d,
    build_lstm_1d, build_lstm_2d, fit_garch_cond_var,
    make_early_stopping, get_seed,
)


# ── Вспомогательные функции ────────────────────────────────────────────────────

def _fit_and_predict_arima(train: np.ndarray, val: np.ndarray):
    """Обучить ARIMA на train, walk-forward предсказать val."""
    m = auto_arima(train, seasonal=False, information_criterion="aic",
                   stepwise=True, suppress_warnings=True, error_action="ignore",
                   max_p=5, max_q=5, d=1)
    preds = []
    for actual in val:
        preds.append(float(m.predict(1)[0]))
        m.update([float(actual)])
    return np.array(preds), m


def _fit_and_predict_lstm(train: np.ndarray, val: np.ndarray, window: int):
    """Обучить LSTM на train, скользящее окно предсказать val."""
    scaler  = MinMaxScaler(feature_range=(0, 1))
    tr_sc   = scaler.fit_transform(train.reshape(-1, 1))
    X, y    = _build_sequences_1d(tr_sc, window)
    X       = X.reshape(X.shape[0], window, 1)
    bs      = min(32, max(1, len(X) // 4))
    vs      = 0.1 if len(X) >= 20 else 0.0
    lstm    = build_lstm_1d(window)
    es      = make_early_stopping(vs)
    lstm.fit(X, y, epochs=50, batch_size=bs, validation_split=vs,
             callbacks=[es], verbose=0)
    # Скользящее окно по val (не walk-forward для скорости)
    all_p   = np.concatenate([train, val])
    all_sc  = scaler.transform(all_p.reshape(-1, 1))
    n_tr    = len(train)
    preds_sc = []
    for i in range(len(val)):
        x = all_sc[n_tr + i - window: n_tr + i].reshape(1, window, 1)
        preds_sc.append(lstm.predict(x, verbose=0)[0, 0])
    preds = scaler.inverse_transform(np.array(preds_sc).reshape(-1, 1)).flatten()
    return preds, lstm, scaler


def _fit_and_predict_hybrid(train: np.ndarray, val: np.ndarray, window: int):
    """ARIMA+LSTM гибрид: обучить на train, walk-forward на val.

    Возвращает val_residuals — остатки e_t = actual_t − own_arima_fc_t,
    вычисленные на шагах val через собственный ARIMA-объект этой модели.
    Используется в run_ensemble для корректной инициализации истории остатков
    перед test walk-forward.
    """
    arima = auto_arima(train, seasonal=False, information_criterion="aic",
                       stepwise=True, suppress_warnings=True, error_action="ignore",
                       max_p=5, max_q=5, d=1)
    ins  = arima.predict_in_sample()
    n    = len(ins)
    res  = train[-n:] - ins

    res_sc = MinMaxScaler(feature_range=(-1, 1))
    res_scaled = res_sc.fit_transform(res.reshape(-1, 1))
    X, y = _build_sequences_1d(res_scaled, window)
    X    = X.reshape(X.shape[0], window, 1)
    bs   = min(32, max(1, len(X) // 4))
    vs   = 0.1 if len(X) >= 20 else 0.0
    lstm = build_lstm_1d(window)
    es   = make_early_stopping(vs)
    lstm.fit(X, y, epochs=50, batch_size=bs, validation_split=vs,
             callbacks=[es], verbose=0)

    hist_res      = list(res)
    preds         = []
    val_residuals = []   # e_t = actual - own_arima_fc, собранные за val

    for actual in val:
        fc   = float(arima.predict(1)[0])
        own_resid = float(actual) - fc          # остаток относительно ЭТОГО ARIMA
        w    = np.array(hist_res[-window:]).reshape(-1, 1)
        w_sc = res_sc.transform(w).reshape(1, window, 1)
        corr = float(res_sc.inverse_transform([[lstm.predict(w_sc, verbose=0)[0, 0]]])[0, 0])
        preds.append(fc + corr)
        hist_res.append(own_resid)
        val_residuals.append(own_resid)
        arima.update([float(actual)])

    return np.array(preds), arima, lstm, res_sc, val_residuals


def _fit_and_predict_triple(train: np.ndarray, val: np.ndarray, window: int):
    """ARIMA+GARCH+LSTM тройной гибрид: train→ обучить, val → walk-forward.

    Возвращает val_residuals — остатки e_t = actual_t − own_arima_fc_t,
    вычисленные на шагах val через собственный ARIMA-объект этой модели.
    Используется в run_ensemble для корректной инициализации истории остатков
    перед test walk-forward.
    """
    arima = auto_arima(train, seasonal=False, information_criterion="aic",
                       stepwise=True, suppress_warnings=True, error_action="ignore",
                       max_p=5, max_q=5, d=1)
    ins  = arima.predict_in_sample()
    n    = len(ins)
    res  = train[-n:] - ins
    var  = fit_garch_cond_var(res)

    res_sc = MinMaxScaler(feature_range=(-1, 1))
    var_sc = MinMaxScaler(feature_range=(0, 1))
    r_sc   = res_sc.fit_transform(res.reshape(-1, 1))
    v_sc   = var_sc.fit_transform(var.reshape(-1, 1))
    train_2d = np.hstack([r_sc, v_sc])

    X, y = _build_sequences_2d(train_2d, window)
    bs   = min(32, max(1, len(X) // 4))
    vs   = 0.1 if len(X) >= 20 else 0.0
    lstm = build_lstm_2d(window)
    es   = make_early_stopping(vs)
    lstm.fit(X, y, epochs=50, batch_size=bs, validation_split=vs,
             callbacks=[es], verbose=0)

    hist_res      = list(res)
    preds         = []
    val_residuals = []   # e_t = actual - own_arima_fc, собранные за val

    for actual in val:
        fc        = float(arima.predict(1)[0])
        own_resid = float(actual) - fc          # остаток относительно ЭТОГО ARIMA
        ha  = np.array(hist_res)
        try:
            sv = float(fit_garch_cond_var(ha)[-1])
        except Exception:
            sv = float(np.var(ha[-window:]))
        wr  = np.array(hist_res[-window:]).reshape(-1, 1)
        wv  = np.full((window, 1), sv)
        wr2 = np.hstack([res_sc.transform(wr), var_sc.transform(wv)]).reshape(1, window, 2)
        corr_sc = float(lstm.predict(wr2, verbose=0)[0, 0])
        corr    = float(res_sc.inverse_transform([[corr_sc]])[0, 0])
        preds.append(fc + corr)
        hist_res.append(own_resid)
        val_residuals.append(own_resid)
        arima.update([float(actual)])

    return np.array(preds), arima, lstm, res_sc, var_sc, val_residuals


# ── Главная функция ────────────────────────────────────────────────────────────

def run_ensemble(ticker: str, start: str, end: str, window: int = 60, n_future: int = 0, interval: str = "1d") -> dict:
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

    # ── Валидационная подвыборка (последние 10% train) ─────────────────────────
    n_val        = max(10, len(train_prices) // 10)
    train_core   = train_prices[:-n_val]
    val_prices   = train_prices[-n_val:]

    # ── Получить val-предсказания для каждой компонентной модели ──────────────
    val_preds = {}
    states    = {}  # сохраняем обученные объекты для walk-forward на test

    val_preds["arima"], states["arima_model"] = \
        _fit_and_predict_arima(train_core, val_prices)

    val_preds["lstm"], states["lstm_model"], states["lstm_scaler"] = \
        _fit_and_predict_lstm(train_core, val_prices, window)

    (val_preds["hybrid"], states["hybrid_arima"], states["hybrid_lstm"],
     states["hybrid_res_sc"], states["hybrid_val_residuals"]) = \
        _fit_and_predict_hybrid(train_core, val_prices, window)

    (val_preds["triple"], states["triple_arima"], states["triple_lstm"],
     states["triple_res_sc"], states["triple_var_sc"],
     states["triple_val_residuals"]) = \
        _fit_and_predict_triple(train_core, val_prices, window)

    # ── Веса: wᵢ = (1/RMSEᵢ) / Σ(1/RMSEⱼ) ───────────────────────────────────
    from services.metrics import rmse as _rmse
    rmse_vals = {name: _rmse(val_prices[:len(p)], p) for name, p in val_preds.items()}
    inv_rmse  = {name: 1.0 / max(r, 1e-6) for name, r in rmse_vals.items()}
    total_inv = sum(inv_rmse.values())
    weights   = {name: v / total_inv for name, v in inv_rmse.items()}

    # ── Walk-forward backtest на тестовой выборке ──────────────────────────────
    test_pred_each = {name: [] for name in weights}

    # ARIMA — продолжаем модель из val
    arima_m = states["arima_model"]
    for actual in test_prices:
        test_pred_each["arima"].append(float(arima_m.predict(1)[0]))
        arima_m.update([float(actual)])

    # LSTM — скользящее окно по всем ценам
    all_prices_full = np.concatenate([train_prices, test_prices])
    lstm_scaler     = states["lstm_scaler"]
    lstm_m          = states["lstm_model"]
    all_sc          = lstm_scaler.transform(all_prices_full.reshape(-1, 1))
    n_tr            = len(train_prices)
    for i in range(len(test_prices)):
        x = all_sc[n_tr + i - window: n_tr + i].reshape(1, window, 1)
        p = float(lstm_scaler.inverse_transform([[lstm_m.predict(x, verbose=0)[0, 0]]])[0, 0])
        test_pred_each["lstm"].append(p)

    # Hybrid — продолжаем от val
    hybrid_arima      = states["hybrid_arima"]
    hybrid_lstm       = states["hybrid_lstm"]
    hybrid_res_sc     = states["hybrid_res_sc"]
    # Используем собственные остатки hybrid-ARIMA за val (исправление Phase 1.5)
    hybrid_history_res = list(states["hybrid_val_residuals"])
    for actual in test_prices:
        fc  = float(hybrid_arima.predict(1)[0])
        w   = np.array(hybrid_history_res[-window:]).reshape(-1, 1)
        w_sc = hybrid_res_sc.transform(w).reshape(1, window, 1)
        corr = float(hybrid_res_sc.inverse_transform(
            [[hybrid_lstm.predict(w_sc, verbose=0)[0, 0]]]
        )[0, 0])
        pred = fc + corr
        test_pred_each["hybrid"].append(pred)
        hybrid_history_res.append(float(actual) - fc)
        hybrid_arima.update([float(actual)])

    # Triple — продолжаем от val
    triple_arima      = states["triple_arima"]
    triple_lstm       = states["triple_lstm"]
    triple_res_sc     = states["triple_res_sc"]
    triple_var_sc     = states["triple_var_sc"]
    # Используем собственные остатки triple-ARIMA за val (исправление Phase 1.5)
    triple_history_res = list(states["triple_val_residuals"])
    for actual in test_prices:
        fc   = float(triple_arima.predict(1)[0])
        ha   = np.array(triple_history_res)
        try:
            sv = float(fit_garch_cond_var(ha)[-1])
        except Exception:
            sv = float(np.var(ha[-window:]))
        wr   = np.array(triple_history_res[-window:]).reshape(-1, 1)
        wv   = np.full((window, 1), sv)
        wr2  = np.hstack([triple_res_sc.transform(wr), triple_var_sc.transform(wv)]).reshape(1, window, 2)
        corr_sc = float(triple_lstm.predict(wr2, verbose=0)[0, 0])
        corr    = float(triple_res_sc.inverse_transform([[corr_sc]])[0, 0])
        pred    = fc + corr
        test_pred_each["triple"].append(pred)
        triple_history_res.append(float(actual) - fc)
        triple_arima.update([float(actual)])

    # ── Взвешенный ансамбль ────────────────────────────────────────────────────
    n_test    = len(test_prices)
    test_pred = np.zeros(n_test)
    for name, w in weights.items():
        preds = np.array(test_pred_each[name][:n_test])
        test_pred += w * preds

    metrics   = compute_all(test_prices, test_pred)
    residuals = test_prices - test_pred

    train_dates = [d.strftime("%Y-%m-%d") for d in train_df.index]
    test_dates  = [d.strftime("%Y-%m-%d") for d in test_df.index]

    all_dates  = train_dates + test_dates
    all_actual = train_prices.tolist() + test_prices.tolist()
    all_pred   = [None] * len(train_dates) + test_pred.tolist()
    test_from  = len(train_dates)
    future_from = len(all_dates)

    # ── Future forecast — взвешенное усреднение базовых прогнозов ─────────────
    seed = get_seed(ticker)
    scenarios = []
    if n_future > 0:
        future_preds_each = {}

        # ARIMA
        arima_base = arima_m.predict(n_periods=n_future).tolist()
        future_preds_each["arima"] = np.array(arima_base)

        # LSTM
        rolling_sc = list(all_sc[-window:, 0])
        lstm_base  = []
        for _ in range(n_future):
            x   = np.array(rolling_sc[-window:]).reshape(1, window, 1)
            p   = float(lstm_m.predict(x, verbose=0)[0, 0])
            lstm_base.append(float(lstm_scaler.inverse_transform([[p]])[0, 0]))
            rolling_sc.append(p)
        future_preds_each["lstm"] = np.array(lstm_base)

        # Hybrid
        arima_fut  = hybrid_arima.predict(n_periods=n_future)
        h_res_hist = list(hybrid_history_res[-window:])
        hybrid_base = []
        for i in range(n_future):
            w   = np.array(h_res_hist[-window:]).reshape(-1, 1)
            w_sc = hybrid_res_sc.transform(w).reshape(1, window, 1)
            corr = float(hybrid_res_sc.inverse_transform(
                [[hybrid_lstm.predict(w_sc, verbose=0)[0, 0]]]
            )[0, 0])
            hybrid_base.append(float(arima_fut[i]) + corr)
            h_res_hist.append(corr)
        future_preds_each["hybrid"] = np.array(hybrid_base)

        # Triple
        triple_fut  = triple_arima.predict(n_periods=n_future)
        t_res_hist  = list(triple_history_res[-window:])
        triple_base = []
        for i in range(n_future):
            ha  = np.array(t_res_hist)
            try:
                sv = float(fit_garch_cond_var(ha)[-1])
            except Exception:
                sv = float(np.var(ha[-window:]))
            wr  = np.array(t_res_hist[-window:]).reshape(-1, 1)
            wv  = np.full((window, 1), sv)
            wr2 = np.hstack([triple_res_sc.transform(wr), triple_var_sc.transform(wv)]).reshape(1, window, 2)
            corr_sc = float(triple_lstm.predict(wr2, verbose=0)[0, 0])
            corr    = float(triple_res_sc.inverse_transform([[corr_sc]])[0, 0])
            p       = float(triple_fut[i]) + corr
            triple_base.append(p)
            t_res_hist.append(corr)
        future_preds_each["triple"] = np.array(triple_base)

        # Взвешенный базовый прогноз
        base_prices = sum(weights[n] * future_preds_each[n] for n in weights)
        future_dates = future_trading_dates(test_dates[-1], n_future)
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
            "name": "Ensemble",
            "components": ["ARIMA", "LSTM", "ARIMA+LSTM", "ARIMA+GARCH+LSTM"],
            "weights": {name: round(w, 4) for name, w in weights.items()},
            "val_rmse": {name: round(r, 2) for name, r in rmse_vals.items()},
            "window": window,
            "description": "Взвешенный ансамбль 4 моделей (wᵢ ∝ 1/RMSE_val)"
            + (f" + {n_future}-day прогноз" if n_future else ""),
        },
    }


def get_weights(ticker: str, start: str, end: str, window: int = 60) -> dict:
    """Вернуть только веса ансамбля без полного backtest."""
    result = run_ensemble(ticker, start, end, window, n_future=0)
    return result["model_info"]["weights"]
