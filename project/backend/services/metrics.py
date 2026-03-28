import numpy as np


def mae(actual: np.ndarray, predicted: np.ndarray) -> float:
    return float(np.mean(np.abs(actual - predicted)))


def rmse(actual: np.ndarray, predicted: np.ndarray) -> float:
    return float(np.sqrt(np.mean((actual - predicted) ** 2)))


def mape(actual: np.ndarray, predicted: np.ndarray) -> float:
    mask = actual != 0
    return float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100)


def compute_all(actual: np.ndarray, predicted: np.ndarray) -> dict:
    return {
        "mae": round(mae(actual, predicted), 2),
        "rmse": round(rmse(actual, predicted), 2),
        "mape": round(mape(actual, predicted), 4),
    }
