import yfinance as yf
import httpx
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Tuple
import hashlib
import os
import pickle

CACHE_DIR = os.path.join(os.path.dirname(__file__), ".cache")
os.makedirs(CACHE_DIR, exist_ok=True)

_memory_cache: dict = {}

# ---------------------------------------------------------------------------
# MOEX ISS (Moscow Exchange Information & Statistical Server)
# Public API, no auth required. Docs: https://iss.moex.com/iss/reference/
# ---------------------------------------------------------------------------
_MOEX_HISTORY_URL = (
    "https://iss.moex.com/iss/history/engines/stock/markets/shares"
    "/boards/TQBR/securities/{symbol}.json"
)
_MOEX_PAGE_SIZE = 100   # ISS returns max 100 rows per request


def _load_moex(ticker_me: str, start: str, end: str) -> pd.DataFrame:
    """
    Fetch daily close prices from the Moscow Exchange (MOEX ISS API).
    Handles pagination automatically (ISS caps at 100 rows / request).

    ticker_me: ticker with optional .ME suffix, e.g. 'SBER.ME' or 'SBER'
    start / end: ISO date strings 'YYYY-MM-DD'
    """
    symbol = ticker_me.upper().replace(".ME", "")
    url = _MOEX_HISTORY_URL.format(symbol=symbol)

    all_rows: list = []
    offset = 0

    # Увеличенный таймаут: connect=15s, read=60s — ISS бывает медленным
    _timeout = httpx.Timeout(60.0, connect=15.0)

    with httpx.Client(timeout=_timeout, verify=True) as client:
        while True:
            params = {
                "from":     start,
                "till":     end,
                "start":    offset,
                "iss.meta": "off",
                "iss.only": "history",
            }
            resp = client.get(url, params=params)
            resp.raise_for_status()
            js = resp.json()

            history = js.get("history", {})
            columns = history.get("columns", [])
            rows    = history.get("data",    [])

            if not rows:
                break

            all_rows.extend(rows)

            if len(rows) < _MOEX_PAGE_SIZE:
                break          # last page
            offset += len(rows)

    if not all_rows:
        raise ValueError(
            f"Нет данных MOEX для тикера {symbol} за период {start}–{end}. "
            "Проверьте правильность тикера (используйте обозначение без '.ME', "
            "например: SBER, GAZP, LKOH)."
        )

    col_idx   = {c: i for i, c in enumerate(columns)}
    date_col  = col_idx["TRADEDATE"]
    close_col = col_idx["CLOSE"]

    records = [
        (r[date_col], r[close_col])
        for r in all_rows
        if r[close_col] is not None
    ]

    df = pd.DataFrame(records, columns=["Date", "Close"])
    df["Date"]  = pd.to_datetime(df["Date"])
    df["Close"] = df["Close"].astype(float)
    df = df.set_index("Date").sort_index().dropna()

    if df.empty:
        raise ValueError(
            f"MOEX вернул данные, но все значения Close равны None для {symbol}."
        )

    return df


# ---------------------------------------------------------------------------
# Generic helpers
# ---------------------------------------------------------------------------

def _cache_key(ticker: str, start: str, end: str) -> str:
    raw = f"{ticker}_{start}_{end}"
    return hashlib.md5(raw.encode()).hexdigest()


def _disk_cache_path(key: str) -> str:
    return os.path.join(CACHE_DIR, f"{key}.pkl")


def _is_moex_ticker(ticker: str) -> bool:
    """Return True for Moscow Exchange tickers (end with .ME or no dot and known MOEX symbols)."""
    return ticker.upper().endswith(".ME")


def load_data(ticker: str, start: str, end: str) -> pd.DataFrame:
    key      = _cache_key(ticker, start, end)

    if key in _memory_cache:
        return _memory_cache[key]

    disk_path = _disk_cache_path(key)
    if os.path.exists(disk_path):
        with open(disk_path, "rb") as f:
            df = pickle.load(f)
        _memory_cache[key] = df
        return df

    # --- Choose data source ---
    if _is_moex_ticker(ticker):
        try:
            df = _load_moex(ticker, start, end)
        except Exception as moex_err:
            # Fallback: yfinance тоже поддерживает .ME тикеры (через Yahoo Finance)
            import logging
            logging.warning(
                f"MOEX ISS недоступен для {ticker} ({moex_err}), "
                "переключаюсь на yfinance..."
            )
            df = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=True)
            if df.empty:
                raise ValueError(
                    f"Нет данных для {ticker}: MOEX ISS timeout, yfinance тоже вернул пустой ответ."
                ) from moex_err
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.droplevel(1)
            df = df[["Close"]].copy()
            df.index = pd.to_datetime(df.index)
            df = df.dropna()
    else:
        df = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=True)
        if df.empty:
            raise ValueError(f"Нет данных для тикера {ticker} за период {start}–{end}.")

        # newer yfinance returns MultiIndex columns (Price, Ticker) — flatten
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.droplevel(1)

        df = df[["Close"]].copy()
        df.index = pd.to_datetime(df.index)
        df = df.dropna()

    with open(disk_path, "wb") as f:
        pickle.dump(df, f)
    _memory_cache[key] = df
    return df


def get_price_series(ticker: str, start: str, end: str) -> Tuple[list, list]:
    df     = load_data(ticker, start, end)
    dates  = [d.strftime("%Y-%m-%d") for d in df.index]
    prices = [round(float(p), 4) for p in df["Close"].values]
    return dates, prices


def train_test_split_series(df: pd.DataFrame, test_ratio: float = 0.2):
    n     = len(df)
    split = int(n * (1 - test_ratio))
    return df.iloc[:split], df.iloc[split:]
