"""
Торговый слой — генерация сигналов BUY/SELL/HOLD.

Принимает dict, который возвращают run_* функции моделей, и строит
торговые сигналы для тестового периода (где есть реальные цены actual)
и опционально для future-периода (только прогноз, без PnL).
"""

import logging
import numpy as np
from typing import Any

logger = logging.getLogger(__name__)

# Допустимые стратегии и методы позиционирования
_STRATEGIES       = ["threshold", "momentum", "mean_reversion"]
_POSITION_METHODS = ["fixed", "volatility_scaled", "confidence"]


# ── Публичные вспомогательные функции ─────────────────────────────────────────

def available_strategies() -> list[str]:
    """Вернуть список доступных стратегий генерации сигналов."""
    return list(_STRATEGIES)


# ── Внутренние вспомогательные функции ────────────────────────────────────────

def _extract_test_slice(model_output: dict) -> tuple[list, list, list]:
    """
    Нарезать тестовый период из output модели.

    Возвращает (dates, actual, predicted) только для тестовых точек —
    там, где все значения float (не None).
    """
    i_test   = model_output["test_from_index"]
    i_future = model_output.get("future_from_index")  # None если n_future=0

    dates     = model_output["dates"][i_test:i_future]
    actual    = model_output["actual"][i_test:i_future]
    predicted = model_output["predicted"][i_test:i_future]

    # Выровнять длины на случай edge-cases (напр. garch_lstm)
    n = min(len(actual), len(predicted))
    if len(actual) != len(predicted):
        logger.warning(
            "actual (%d) и predicted (%d) имеют разную длину — обрезаем до %d",
            len(actual), len(predicted), n,
        )
    return dates[:n], actual[:n], predicted[:n]


def _rolling_volatility(actual: list, vol_window: int) -> tuple[np.ndarray, float]:
    """
    Вычислить скользящую волатильность (std лог-доходностей) для каждой точки.

    Возвращает (vols, σ_mean):
      vols[i] — волатильность на шаге i (для i=0 равна 0.0)
      σ_mean  — среднее по всем ненулевым значениям vols
    """
    arr     = np.array(actual, dtype=float)
    n       = len(arr)
    returns = np.diff(np.log(np.where(arr > 0, arr, 1e-8)))  # безопасный log

    vols = np.zeros(n)
    for i in range(1, n):
        window_returns = returns[max(0, i - vol_window): i]
        if len(window_returns) > 1:
            vols[i] = float(np.std(window_returns))

    nonzero = vols[vols > 0]
    sigma_mean = float(np.mean(nonzero)) if len(nonzero) > 0 else 0.0
    return vols, sigma_mean


def _position_size(
    signal: str,
    expected_return: float,
    threshold_pct: float,
    max_position: float,
    method: str,
    vol_current: float,
    vol_mean: float,
) -> float:
    """
    Вычислить размер позиции в зависимости от метода.

    Возвращает float в диапазоне [0.0, max_position].
    Для HOLD всегда 0.0.
    """
    if signal == "HOLD":
        return 0.0

    if method == "fixed":
        return max_position

    if method == "volatility_scaled":
        if vol_mean > 0 and vol_current > 0:
            size = max_position * (vol_mean / vol_current)
        else:
            size = max_position
        return float(np.clip(size, 0.1, max_position))

    if method == "confidence":
        if threshold_pct > 0:
            size = max_position * min(abs(expected_return) / threshold_pct, 1.0)
        else:
            size = max_position
        return float(np.clip(size, 0.0, max_position))

    # Неизвестный метод → fixed
    logger.warning("Неизвестный position_sizing '%s', используем 'fixed'", method)
    return max_position


# ── Стратегии ─────────────────────────────────────────────────────────────────

def _strategy_threshold(
    i: int,
    actual: list,
    predicted: list,
    expected_returns: list,
    threshold_pct: float,
) -> str:
    """
    Стратегия 'threshold': сигнал основан на ожидаемой доходности.

    BUY  если ожидаемая доходность > threshold_pct
    SELL если ожидаемая доходность < -threshold_pct
    HOLD иначе (или для первой точки без предыдущей цены)
    """
    if i == 0:
        return "HOLD"
    er = expected_returns[i]
    if er > threshold_pct:
        return "BUY"
    if er < -threshold_pct:
        return "SELL"
    return "HOLD"


def _strategy_momentum(
    i: int,
    predicted: list,
    lookback: int = 5,
    min_agree: int = 3,
) -> str:
    """
    Стратегия 'momentum': следование тренду по динамике прогнозов.

    BUY  если min_agree из последних lookback прогнозов растут
    SELL если min_agree из последних lookback прогнозов падают
    HOLD иначе (или недостаточно истории)
    """
    if i < lookback:
        return "HOLD"

    # Считаем сколько раз прогноз вырос/упал среди последних lookback шагов
    up_count   = 0
    down_count = 0
    for k in range(i - lookback + 1, i + 1):
        if predicted[k] > predicted[k - 1]:
            up_count += 1
        elif predicted[k] < predicted[k - 1]:
            down_count += 1

    if up_count >= min_agree:
        return "BUY"
    if down_count >= min_agree:
        return "SELL"
    return "HOLD"


def _strategy_mean_reversion(
    i: int,
    actual: list,
    vol_window: int,
    z_threshold: float = 1.5,
) -> str:
    """
    Стратегия 'mean_reversion': торговля на возврат к скользящему среднему.

    BUY  если actual[i] < MA - z_threshold * σ  (цена сильно ниже среднего)
    SELL если actual[i] > MA + z_threshold * σ  (цена сильно выше среднего)
    HOLD иначе или при недостаточной истории (нужно ≥ 2 точки в окне)
    """
    if i < 1:
        return "HOLD"

    window_slice = actual[max(0, i - vol_window + 1): i + 1]
    if len(window_slice) < 2:
        return "HOLD"

    arr    = np.array(window_slice, dtype=float)
    ma     = float(np.mean(arr))
    sigma  = float(np.std(arr))
    price  = float(actual[i])

    if sigma == 0:
        return "HOLD"

    if price < ma - z_threshold * sigma:
        return "BUY"
    if price > ma + z_threshold * sigma:
        return "SELL"
    return "HOLD"


# ── Основная публичная функция ─────────────────────────────────────────────────

def generate_signals(
    model_output: dict,
    strategy: str = "threshold",
    threshold_pct: float = 0.003,
    vol_filter: bool = True,
    vol_window: int = 20,
    vol_multiplier: float = 1.5,
    position_sizing: str = "fixed",
    max_position: float = 1.0,
) -> dict:
    """
    Сгенерировать торговые сигналы для тестового периода.

    Принимает dict, который возвращают run_* функции (run_arima, run_lstm, ...).
    Работает только с тестовым периодом (там есть реальные цены для PnL).

    Параметры
    ---------
    model_output    : dict из run_* функции модели
    strategy        : "threshold" | "momentum" | "mean_reversion"
    threshold_pct   : минимальная ожидаемая доходность для BUY (0.003 = 0.3%)
    vol_filter      : фильтровать сигналы при высокой волатильности
    vol_window      : окно для расчёта текущей волатильности
    vol_multiplier  : порог: если σ_current > vol_multiplier * σ_mean → HOLD
    position_sizing : "fixed" | "volatility_scaled" | "confidence"
    max_position    : максимальный размер позиции (1.0 = 100% депозита)

    Возвращает
    ----------
    dict с ключами:
      dates, actual, predicted, signals, position_size, expected_return,
      strategy, params
    """
    if strategy not in _STRATEGIES:
        raise ValueError(
            f"Неизвестная стратегия '{strategy}'. Доступные: {_STRATEGIES}"
        )
    if position_sizing not in _POSITION_METHODS:
        raise ValueError(
            f"Неизвестный position_sizing '{position_sizing}'. Доступные: {_POSITION_METHODS}"
        )

    # Нарезаем тестовый период
    dates, actual, predicted = _extract_test_slice(model_output)
    n = len(actual)

    if n == 0:
        logger.warning("Тестовый период пустой — возвращаем пустой результат")
        return {
            "dates": [], "actual": [], "predicted": [],
            "signals": [], "position_size": [], "expected_return": [],
            "strategy": strategy,
            "params": {
                "threshold_pct": threshold_pct, "vol_filter": vol_filter,
                "vol_window": vol_window, "vol_multiplier": vol_multiplier,
                "position_sizing": position_sizing, "max_position": max_position,
            },
        }

    # Скользящая волатильность
    vols, sigma_mean = _rolling_volatility(actual, vol_window)

    # Отключить vol_filter если данных меньше окна
    effective_vol_filter = vol_filter
    if vol_filter and n < vol_window:
        logger.warning(
            "Тестовый период (%d точек) короче vol_window (%d) — vol_filter отключён",
            n, vol_window,
        )
        effective_vol_filter = False

    # Ожидаемая доходность для каждой точки
    # expected_return[i] = (predicted[i] - actual[i-1]) / actual[i-1]
    # Для i=0 ставим 0.0 (нет предыдущей цены)
    expected_returns = [0.0] * n
    for i in range(1, n):
        prev = float(actual[i - 1])
        if prev != 0:
            expected_returns[i] = (float(predicted[i]) - prev) / prev

    # Генерация сигналов
    signals       = []
    position_sizes = []

    for i in range(n):
        # Сырой сигнал из стратегии
        if strategy == "threshold":
            raw_signal = _strategy_threshold(i, actual, predicted, expected_returns, threshold_pct)
        elif strategy == "momentum":
            raw_signal = _strategy_momentum(i, predicted)
        else:  # mean_reversion
            raw_signal = _strategy_mean_reversion(i, actual, vol_window)

        # Фильтр волатильности
        if effective_vol_filter and raw_signal != "HOLD" and sigma_mean > 0:
            if vols[i] > vol_multiplier * sigma_mean:
                raw_signal = "HOLD"

        # Размер позиции
        psize = _position_size(
            signal=raw_signal,
            expected_return=expected_returns[i],
            threshold_pct=threshold_pct,
            max_position=max_position,
            method=position_sizing,
            vol_current=vols[i],
            vol_mean=sigma_mean,
        )

        signals.append(raw_signal)
        position_sizes.append(round(psize, 6))

    return {
        "dates":           dates,
        "actual":          [float(v) for v in actual],
        "predicted":       [float(v) for v in predicted],
        "signals":         signals,
        "position_size":   position_sizes,
        "expected_return": [round(er, 6) for er in expected_returns],
        "strategy":        strategy,
        "params": {
            "threshold_pct":  threshold_pct,
            "vol_filter":     effective_vol_filter,
            "vol_window":     vol_window,
            "vol_multiplier": vol_multiplier,
            "position_sizing": position_sizing,
            "max_position":   max_position,
        },
    }


# ── Future-сигналы (без PnL) ───────────────────────────────────────────────────

def generate_future_signals(
    model_output: dict,
    strategy: str = "threshold",
    threshold_pct: float = 0.003,
    vol_window: int = 20,
    **kwargs: Any,
) -> dict:
    """
    Сгенерировать сигнальный план для future-периода (без реальных цен, без PnL).

    Использует только прогнозные значения predicted в диапазоне
    [future_from_index, конец]. Для mean_reversion возвращает только HOLD
    (нет реальных цен actual для расчёта отклонения от MA).

    Возвращает dict с ключами: dates, predicted, signals
    """
    future_from = model_output.get("future_from_index")

    if future_from is None:
        logger.info("future_from_index=None — модель не содержит future-прогноза")
        return {"dates": [], "predicted": [], "signals": [], "strategy": strategy}

    dates     = model_output["dates"][future_from:]
    predicted = model_output["predicted"][future_from:]

    # Убрать None на случай если они попали в future
    pairs = [(d, p) for d, p in zip(dates, predicted) if p is not None]
    if not pairs:
        return {"dates": [], "predicted": [], "signals": [], "strategy": strategy}

    dates, predicted = zip(*pairs)
    dates     = list(dates)
    predicted = list(predicted)
    n         = len(predicted)

    signals = []
    for i in range(n):
        if strategy == "threshold":
            # Ожидаемая доходность: шаг прогноза относительно предыдущего прогноза
            if i == 0:
                signals.append("HOLD")
            else:
                prev = float(predicted[i - 1])
                er   = (float(predicted[i]) - prev) / prev if prev != 0 else 0.0
                if er > threshold_pct:
                    signals.append("BUY")
                elif er < -threshold_pct:
                    signals.append("SELL")
                else:
                    signals.append("HOLD")

        elif strategy == "momentum":
            signals.append(_strategy_momentum(i, predicted))

        else:
            # mean_reversion требует actual — в future только HOLD
            signals.append("HOLD")

    return {
        "dates":     dates,
        "predicted": [float(v) for v in predicted],
        "signals":   signals,
        "strategy":  strategy,
    }
