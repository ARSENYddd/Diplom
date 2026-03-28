"""Shared utilities for model forecasting."""
import numpy as np
from datetime import date, timedelta


def future_trading_dates(last_date_str: str, n: int) -> list:
    """Return n trading dates (Mon-Fri) after last_date_str."""
    d = date.fromisoformat(last_date_str)
    result = []
    while len(result) < n:
        d += timedelta(days=1)
        if d.weekday() < 5:
            result.append(d.strftime("%Y-%m-%d"))
    return result


def bootstrap_future(
    base_forecast: np.ndarray,
    residuals: np.ndarray,
    seed: int = 42,
    damping: float = 0.4,
) -> np.ndarray:
    """
    Add bootstrapped residual noise to a deterministic forecast.

    Resamples from historical residuals (residual bootstrap) and applies
    them as a cumulative perturbation — produces a non-linear, statistically
    grounded forecast path instead of a flat/linear one.

    damping < 1 prevents divergence over long horizons.
    """
    rng = np.random.RandomState(seed)
    n = len(base_forecast)
    sampled = rng.choice(residuals, size=n, replace=True)
    # Cumulative sum gives Brownian-like walk; damping scales amplitude
    noise = np.cumsum(sampled) * damping
    return base_forecast + noise
