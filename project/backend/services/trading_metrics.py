"""
Торговые метрики — количественная оценка качества торговой стратегии.

Все функции принимают numpy-массивы или списки dict (для сделок).
Граничные случаи обрабатываются без исключений: возвращается 0.0 или 100.0.
"""

import numpy as np
from typing import Any


# ── Атомарные метрики ─────────────────────────────────────────────────────────

def sharpe_ratio(
    returns: np.ndarray,
    risk_free_rate: float = 0.0,
    periods_per_year: int = 252,
) -> float:
    """
    Коэффициент Шарпа: отношение избыточной доходности к волатильности.

    Формула: √T · (μ_excess) / σ_excess,
    где μ_excess = mean(returns) - risk_free_rate / T,
        σ_excess = std(returns),
        T = periods_per_year.

    При нулевой дисперсии → 0.0.
    """
    r = np.array(returns, dtype=float)
    rf_per_period = risk_free_rate / periods_per_year
    excess = r - rf_per_period
    std = float(np.std(excess, ddof=1)) if len(excess) > 1 else 0.0
    if std == 0.0:
        return 0.0
    return float(np.sqrt(periods_per_year) * np.mean(excess) / std)


def max_drawdown(equity_curve: np.ndarray) -> float:
    """
    Максимальная просадка: наибольшее падение от пика до последующего минимума.

    Возвращает число от -1 до 0 (например, -0.23 = просадка 23%).
    """
    eq = np.array(equity_curve, dtype=float)
    if len(eq) < 2:
        return 0.0

    peak     = eq[0]
    max_dd   = 0.0
    for v in eq:
        if v > peak:
            peak = v
        dd = (v - peak) / peak if peak > 0 else 0.0
        if dd < max_dd:
            max_dd = dd
    return float(max_dd)


def calmar_ratio(
    equity_curve: np.ndarray,
    periods_per_year: int = 252,
) -> float:
    """
    Коэффициент Кальмара: аннуализированная доходность / |max drawdown|.

    При нулевой просадке → ограничиваем до 100.0.
    При отрицательной аннуализированной доходности → отрицательное значение.
    """
    eq = np.array(equity_curve, dtype=float)
    if len(eq) < 2 or eq[0] <= 0:
        return 0.0

    # Аннуализированная доходность: (V_final / V_initial) ^ (T/n) − 1
    n = len(eq)
    total_return = eq[-1] / eq[0]
    ann_return = total_return ** (periods_per_year / n) - 1.0

    mdd = abs(max_drawdown(eq))
    if mdd == 0.0:
        return 100.0  # нет просадки → ограничиваем сверху
    return float(min(ann_return / mdd, 100.0))


def winrate(trades: list[dict]) -> float:
    """
    Доля прибыльных сделок (net_pnl > 0).

    При пустом списке → 0.0.
    """
    if not trades:
        return 0.0
    profitable = sum(1 for t in trades if t.get("net_pnl", 0.0) > 0)
    return float(profitable / len(trades))


def profit_factor(trades: list[dict]) -> float:
    """
    Profit factor: gross_profit / gross_loss (по net_pnl).

    При нулевых убытках → ограничиваем до 100.0.
    При пустом списке или нулевой прибыли → 0.0.
    """
    if not trades:
        return 0.0
    gross_profit = sum(t.get("net_pnl", 0.0) for t in trades if t.get("net_pnl", 0.0) > 0)
    gross_loss   = abs(sum(t.get("net_pnl", 0.0) for t in trades if t.get("net_pnl", 0.0) < 0))

    if gross_loss == 0.0:
        return 100.0 if gross_profit > 0 else 0.0
    if gross_profit == 0.0:
        return 0.0
    return float(min(gross_profit / gross_loss, 100.0))


# ── Агрегированная функция ─────────────────────────────────────────────────────

def compute_trading_metrics(
    returns: np.ndarray,
    equity_curve: np.ndarray,
    trades: list[dict],
    periods_per_year: int = 252,
    risk_free_rate: float = 0.0,
) -> dict[str, Any]:
    """
    Вычислить полный набор торговых метрик.

    Параметры
    ---------
    returns       : дневные доходности (не логарифмические, обычные r = ΔP/P)
    equity_curve  : кривая капитала (абсолютные значения)
    trades        : список закрытых сделок (dict с полями net_pnl, return_pct и т.д.)
    periods_per_year: торговых дней в году (252 для акций, 365 для крипто)
    risk_free_rate: безрисковая ставка годовая (0.0 = без вычета rf)

    Возвращает dict с:
      sharpe, max_drawdown, calmar, winrate, profit_factor,
      total_return, n_trades, avg_trade_return, best_trade, worst_trade
      + флаги insufficient_trades и/или low_confidence при малом числе сделок
    """
    eq  = np.array(equity_curve, dtype=float)
    ret = np.array(returns, dtype=float)
    n_trades = len(trades)

    # Полная доходность
    if len(eq) >= 2 and eq[0] > 0:
        total_return = float((eq[-1] - eq[0]) / eq[0])
    else:
        total_return = 0.0

    # Метрики по сделкам
    trade_returns = [t.get("return_pct", 0.0) for t in trades]
    avg_trade_ret  = float(np.mean(trade_returns)) if trade_returns else 0.0
    best_trade     = float(max(trade_returns))     if trade_returns else 0.0
    worst_trade    = float(min(trade_returns))     if trade_returns else 0.0

    result: dict[str, Any] = {
        "sharpe":          round(sharpe_ratio(ret, risk_free_rate, periods_per_year), 4),
        "max_drawdown":    round(max_drawdown(eq), 4),
        "calmar":          round(calmar_ratio(eq, periods_per_year), 4),
        "winrate":         round(winrate(trades), 4),
        "profit_factor":   round(profit_factor(trades), 4),
        "total_return":    round(total_return, 4),
        "n_trades":        n_trades,
        "avg_trade_return": round(avg_trade_ret, 6),
        "best_trade":      round(best_trade, 6),
        "worst_trade":     round(worst_trade, 6),
    }

    # Флаги предупреждений о надёжности
    if n_trades < 5:
        result["insufficient_trades"] = True
    if n_trades < 30:
        result["low_confidence"] = True

    return result
