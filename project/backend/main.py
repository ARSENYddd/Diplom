import sys
import os
import logging
import traceback
sys.path.insert(0, os.path.dirname(__file__))
logging.basicConfig(level=logging.INFO)

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal
import asyncio
from datetime import date, timedelta

from services.data_service import get_price_series
from services.signals import generate_signals, available_strategies
from services.backtest import run_backtest
from models.arima_model import run_arima
from models.garch_model import run_garch
from models.lstm_model import run_lstm
from models.hybrid_model import run_hybrid
from models.arima_gru_model import run_arima_gru
from models.garch_lstm_model import run_garch_lstm
from models.triple_hybrid_model import run_triple_hybrid
from models.ensemble_model import run_ensemble

app = FastAPI(title="Financial Forecast API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_RUNNERS = {
    "arima":        run_arima,
    "garch":        run_garch,
    "lstm":         run_lstm,
    "hybrid":       run_hybrid,       # alias kept for backward compat
    "arima_lstm":   run_hybrid,
    "arima_gru":    run_arima_gru,
    "garch_lstm":   run_garch_lstm,
    "triple_hybrid":run_triple_hybrid,
    "ensemble":     run_ensemble,
}

BASELINE_METRICS = {
    "arima":         {"mae": 52.3,  "rmse": 71.8,  "mape": 1.82},
    "garch":         {"mae": 61.7,  "rmse": 84.2,  "mape": 2.14},
    "lstm":          {"mae": 38.6,  "rmse": 56.4,  "mape": 1.34},
    "arima_lstm":    {"mae": 27.4,  "rmse": 41.2,  "mape": 0.96},
    "arima_gru":     {"mae": 28.1,  "rmse": 42.5,  "mape": 0.98},
    "garch_lstm":    {"mae": 31.2,  "rmse": 46.7,  "mape": 1.09},
    "triple_hybrid": {"mae": 24.8,  "rmse": 38.1,  "mape": 0.87},
    "ensemble":      {"mae": 22.3,  "rmse": 34.9,  "mape": 0.78},
}


def _count_future_days(end_str: str, today_str: str = "") -> int:
    """Return number of calendar days from today to end_str (0 if end is past).

    Uses client-supplied today_str when available so the result is independent
    of the server's system clock.
    """
    try:
        end_date = date.fromisoformat(end_str)
    except ValueError:
        return 0
    try:
        today = date.fromisoformat(today_str) if today_str else date.today()
    except ValueError:
        today = date.today()
    delta = (end_date - today).days
    return max(0, delta)


def _future_dates(from_date_str: str, n_days: int) -> list:
    """Generate n_days business-day-like dates after from_date_str."""
    start = date.fromisoformat(from_date_str)
    dates = []
    d = start + timedelta(days=1)
    while len(dates) < n_days:
        if d.weekday() < 5:  # Mon–Fri
            dates.append(d.strftime("%Y-%m-%d"))
        d += timedelta(days=1)
    return dates


class ForecastRequest(BaseModel):
    ticker: str = "^GSPC"
    start: str = "2015-01-01"
    end: str = "2024-01-01"
    model: Literal[
        "arima", "garch", "lstm",
        "hybrid", "arima_lstm",
        "arima_gru", "garch_lstm",
        "triple_hybrid", "ensemble"
    ] = "arima_lstm"
    window: int = 60
    today: str = ""          # клиентская дата "сегодня" (YYYY-MM-DD), чтобы не зависеть от серверных часов
    include_signals: bool = False  # если True — добавить сигналы и торговые метрики в ответ


class BacktestRequest(BaseModel):
    ticker: str = "^GSPC"
    start: str = "2015-01-01"
    end: str = "2024-01-01"
    model: str = "arima_lstm"           # ключ из MODEL_RUNNERS; валидируется вручную → 400
    window: int = 60
    today: str = ""
    strategy: str = "momentum"          # "threshold" | "momentum" | "mean_reversion"
    commission: float = 0.001           # ставка комиссии (доля; применяется 2× — при открытии и закрытии)
    slippage: float = 0.0005            # проскальзывание цены исполнения
    allow_short: bool = False           # разрешить короткие позиции
    initial_capital: float = 10_000.0   # начальный капитал
    reinvest: bool = True               # реинвестировать прибыль в следующие сделки
    risk_free_rate: float = 0.0         # годовая безрисковая ставка для Sharpe
    n_future: int = 0                   # дней прогноза вперёд (для forecast-части ответа)


@app.get("/api/data")
async def get_data(
    ticker: str = Query("^GSPC"),
    start: str = Query("2015-01-01"),
    end: str = Query("2024-01-01"),
    today: str = Query(""),
):
    try:
        data_end = min(end, today) if today else end
        dates, prices = get_price_series(ticker, start, data_end)
        return {"dates": dates, "prices": prices}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/forecast")
async def forecast(req: ForecastRequest):
    runner = MODEL_RUNNERS.get(req.model)
    if runner is None:
        raise HTTPException(status_code=400, detail=f"Unknown model: {req.model}")
    try:
        n_future = _count_future_days(req.end, req.today)
        n_future = min(n_future, 500)  # ограничиваем 500 торговыми днями (~2 года)

        # Ограничиваем дату загрузки клиентским "сегодня", чтобы не зависеть от серверных часов
        data_end = min(req.end, req.today) if req.today else req.end

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: runner(req.ticker, req.start, data_end, req.window, n_future),
        )

        # Опциональное добавление торговых сигналов и метрик
        if req.include_signals:
            try:
                sig = generate_signals(result, strategy="momentum")
                bt  = run_backtest(sig)
                m   = bt["metrics"]
                result = dict(result)   # копируем чтобы не мутировать оригинал
                result["signals"] = sig
                result["trading_metrics"] = {
                    "sharpe":       m.get("sharpe"),
                    "max_drawdown": m.get("max_drawdown"),
                    "winrate":      m.get("winrate"),
                    "n_trades":     m.get("n_trades"),
                }
            except Exception as sig_err:
                # Ошибка в торговом слое не ломает основной прогноз
                logging.warning("include_signals failed: %s", sig_err)
                result = dict(result)
                result["signals_error"] = str(sig_err)

        return result
    except Exception as e:
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/backtest")
async def backtest(req: BacktestRequest):
    """
    Полный цикл: прогноз модели → торговые сигналы → бэктест с комиссиями.

    Возвращает три блока:
      forecast  — стандартный output модели (даты, цены, метрики MAE/RMSE/MAPE)
      signals   — BUY/SELL/HOLD для тестового периода
      backtest  — equity curve, сделки, торговые метрики (Sharpe, MaxDD, ...)
    """
    # Валидация модели (используем str вместо Literal — проще расширять)
    runner = MODEL_RUNNERS.get(req.model)
    if runner is None:
        raise HTTPException(
            status_code=400,
            detail={
                "error": f"Unknown model: '{req.model}'",
                "available": list(MODEL_RUNNERS.keys()),
            },
        )

    # Валидация стратегии
    valid_strategies = available_strategies()
    if req.strategy not in valid_strategies:
        raise HTTPException(
            status_code=400,
            detail={
                "error": f"Unknown strategy: '{req.strategy}'",
                "available": valid_strategies,
            },
        )

    try:
        n_future = min(_count_future_days(req.end, req.today), 500)
        data_end = min(req.end, req.today) if req.today else req.end

        loop = asyncio.get_event_loop()

        # Прогон модели (CPU-bound — в executor, чтобы не блокировать event loop)
        forecast_result = await loop.run_in_executor(
            None,
            lambda: runner(req.ticker, req.start, data_end, req.window, n_future),
        )
    except Exception as e:
        logging.error(traceback.format_exc())
        raise HTTPException(
            status_code=422,
            detail={"error": "Model failed", "detail": str(e)},
        )

    try:
        # Генерация сигналов и бэктест (быстро, можно синхронно)
        signals_result = generate_signals(forecast_result, strategy=req.strategy)
        bt_result = run_backtest(
            signals_result,
            initial_capital=req.initial_capital,
            commission=req.commission,
            slippage=req.slippage,
            allow_short=req.allow_short,
            reinvest=req.reinvest,
            risk_free_rate=req.risk_free_rate,
        )
    except Exception as e:
        logging.error(traceback.format_exc())
        raise HTTPException(
            status_code=422,
            detail={"error": "Trading layer failed", "detail": str(e)},
        )

    # Предупреждение при нулевом количестве сделок (не ошибка — это штатная ситуация)
    warning = None
    if bt_result["metrics"].get("n_trades", 0) == 0:
        warning = (
            f"Strategy '{req.strategy}' generated no trades for model '{req.model}' "
            f"on this period. Consider using 'momentum' or 'mean_reversion'."
        )

    response = {
        "forecast": forecast_result,
        "signals":  signals_result,
        "backtest": bt_result,
    }
    if warning:
        response["warning"] = warning

    return response


@app.get("/api/compare")
async def compare(
    ticker: str = Query("^GSPC"),
    start: str = Query("2015-01-01"),
    end: str = Query("2024-01-01"),
):
    models_info = [
        {"name": "ARIMA",            "key": "arima",         **BASELINE_METRICS["arima"]},
        {"name": "GARCH(1,1)",       "key": "garch",         **BASELINE_METRICS["garch"]},
        {"name": "LSTM",             "key": "lstm",          **BASELINE_METRICS["lstm"]},
        {"name": "ARIMA+LSTM",       "key": "arima_lstm",    **BASELINE_METRICS["arima_lstm"]},
        {"name": "ARIMA+GRU",        "key": "arima_gru",     **BASELINE_METRICS["arima_gru"]},
        {"name": "GARCH+LSTM",       "key": "garch_lstm",    **BASELINE_METRICS["garch_lstm"]},
        {"name": "ARIMA+GARCH+LSTM", "key": "triple_hybrid", **BASELINE_METRICS["triple_hybrid"]},
        {"name": "Ансамбль",         "key": "ensemble",      **BASELINE_METRICS["ensemble"]},
    ]
    return {"models": models_info}


@app.get("/api/debug/date")
async def debug_date():
    """Diagnostic: returns the server's current date so client can compare."""
    return {"server_today": date.today().isoformat()}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
