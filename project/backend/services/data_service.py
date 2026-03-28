import yfinance as yf
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


def _cache_key(ticker: str, start: str, end: str) -> str:
    raw = f"{ticker}_{start}_{end}"
    return hashlib.md5(raw.encode()).hexdigest()


def _disk_cache_path(key: str) -> str:
    return os.path.join(CACHE_DIR, f"{key}.pkl")


def load_data(ticker: str, start: str, end: str) -> pd.DataFrame:
    key = _cache_key(ticker, start, end)

    if key in _memory_cache:
        return _memory_cache[key]

    disk_path = _disk_cache_path(key)
    if os.path.exists(disk_path):
        with open(disk_path, "rb") as f:
            df = pickle.load(f)
        _memory_cache[key] = df
        return df

    df = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=True)
    if df.empty:
        raise ValueError(f"No data returned for ticker={ticker} from {start} to {end}")

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
    df = load_data(ticker, start, end)
    dates = [d.strftime("%Y-%m-%d") for d in df.index]
    prices = [round(float(p), 2) for p in df["Close"].values]
    return dates, prices


def train_test_split_series(df: pd.DataFrame, test_ratio: float = 0.2):
    n = len(df)
    split = int(n * (1 - test_ratio))
    return df.iloc[:split], df.iloc[split:]
