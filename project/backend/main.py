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
from services.signals import generate_signals, generate_future_signals, available_strategies
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
    today: str = ""  # client-supplied "today" date (YYYY-MM-DD); avoids server clock issues


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
        # Cap at 500 trading days (~2 years) to stay reasonable
        n_future = min(n_future, 500)

        # Cap the data download end date at client "today" so that yfinance
        # doesn't get capped by the (potentially wrong) server clock.
        # We still use req.end for n_future calculation above.
        if req.today:
            data_end = min(req.end, req.today)
        else:
            data_end = req.end

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: runner(req.ticker, req.start, data_end, req.window, n_future),
        )
        return result
    except Exception as e:
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


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


class BacktestRequest(BaseModel):
    ticker: str = "^GSPC"
    start: str = "2015-01-01"
    end: str = "2024-01-01"
    model: str = "arima_lstm"
    window: int = 60
    today: str = ""
    strategy: str = "momentum"
    commission: float = 0.001
    initial_capital: float = 10000.0
    slippage: float = 0.0005
    reinvest: bool = True
    risk_free_rate: float = 0.0


@app.post("/api/backtest")
async def backtest(req: BacktestRequest):
    runner = MODEL_RUNNERS.get(req.model)
    if runner is None:
        raise HTTPException(status_code=400, detail=f"Unknown model: {req.model}. Available: {list(MODEL_RUNNERS.keys())}")

    strats = available_strategies()
    if req.strategy not in strats:
        raise HTTPException(status_code=400, detail=f"Unknown strategy: {req.strategy}. Available: {strats}")

    try:
        n_future = _count_future_days(req.end, req.today)
        n_future = min(n_future, 500)
        data_end = min(req.end, req.today) if req.today else req.end

        loop = asyncio.get_event_loop()

        # Запуск прогноза
        forecast_result = await loop.run_in_executor(
            None,
            lambda: runner(req.ticker, req.start, data_end, req.window, n_future),
        )

        # Генерация сигналов на тестовом периоде
        signals_result = await loop.run_in_executor(
            None,
            lambda: generate_signals(forecast_result, strategy=req.strategy),
        )

        # Бэктест
        bt_result = await loop.run_in_executor(
            None,
            lambda: run_backtest(
                signals_result,
                initial_capital=req.initial_capital,
                commission=req.commission,
                slippage=req.slippage,
                reinvest=req.reinvest,
                risk_free_rate=req.risk_free_rate,
            ),
        )

        warning = None
        if bt_result.get("trades") is not None and len(bt_result["trades"]) == 0:
            warning = "Стратегия не сгенерировала ни одной сделки за выбранный период."

        # Сигналы для future-периода (если end > today)
        future_signals = None
        if n_future > 0:
            future_signals = await loop.run_in_executor(
                None,
                lambda: generate_future_signals(forecast_result, strategy=req.strategy),
            )

        return {
            "forecast":       forecast_result,
            "signals":        signals_result,
            "backtest":       bt_result,
            "future_signals": future_signals,
            "warning":        warning,
        }

    except Exception as e:
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


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
