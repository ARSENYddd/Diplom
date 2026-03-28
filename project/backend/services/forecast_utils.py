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
    Produces a non-linear, statistically grounded forecast path.
    """
    rng = np.random.RandomState(seed)
    n = len(base_forecast)
    sampled = rng.choice(residuals, size=n, replace=True)
    noise = np.cumsum(sampled) * damping
    return base_forecast + noise


# Scenario definitions: (name_ru, seed_offset, damping, bias_factor)
# bias_factor < 1 → bearish tilt, > 1 → bullish tilt
SCENARIOS = [
    {"name": "Медвежий",      "color": "#f87171", "seed_offset": 1,  "damping": 0.55, "bias": -1.2},
    {"name": "Умеренный",     "color": "#fb923c", "seed_offset": 2,  "damping": 0.35, "bias": -0.4},
    {"name": "Базовый",       "color": "#60a5fa", "seed_offset": 0,  "damping": 0.40, "bias":  0.0},
    {"name": "Оптимистичный", "color": "#a3e635", "seed_offset": 3,  "damping": 0.35, "bias":  0.4},
    {"name": "Бычий",         "color": "#4ade80", "seed_offset": 4,  "damping": 0.55, "bias":  1.2},
]


def bootstrap_scenarios(
    base_forecast: np.ndarray,
    residuals: np.ndarray,
    base_seed: int = 42,
) -> list:
    """
    Generate 5 scenario forecast paths (bearish → bullish).

    Each scenario uses a different random seed + residual bias to produce
    distinct non-linear trajectories around the base forecast.

    Returns list of dicts:
      [{"name": str, "color": str, "values": [float, ...]}, ...]
    """
    result = []
    residual_std = np.std(residuals)

    for sc in SCENARIOS:
        rng = np.random.RandomState(base_seed + sc["seed_offset"])
        n = len(base_forecast)

        # Sample residuals and apply directional bias
        sampled = rng.choice(residuals, size=n, replace=True)
        # bias shifts the residual distribution up (bullish) or down (bearish)
        biased = sampled + sc["bias"] * residual_std * 0.5
        noise = np.cumsum(biased) * sc["damping"]

        values = (base_forecast + noise).tolist()
        result.append({
            "name":   sc["name"],
            "color":  sc["color"],
            "values": values,
        })

    return result
