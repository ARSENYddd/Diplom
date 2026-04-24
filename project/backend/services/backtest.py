"""
Честный бэктест с комиссиями и проскальзыванием.

Ключевые принципы реализации:
  - Сигнал на actual[i] → исполнение на actual[i+1] (нет look-ahead bias)
  - Комиссия списывается при открытии И при закрытии позиции
  - Проскальзывание: цена исполнения хуже рыночной на slippage
  - Уже в long → BUY игнорируется (позиция не удваивается)
  - SELL без позиции и allow_short=False → HOLD
  - Последняя открытая позиция принудительно закрывается по последней цене
  - reinvest=True: каждая сделка торгует текущим equity × position_size
  - reinvest=False: каждая сделка торгует initial_capital × position_size
"""

import logging
import numpy as np
from services.trading_metrics import compute_trading_metrics

logger = logging.getLogger(__name__)


# ── Вспомогательные функции ───────────────────────────────────────────────────

def _make_trade(
    entry_date: str,
    exit_date: str,
    entry_price: float,
    exit_price: float,
    direction: str,
    position_size: float,
    gross_pnl: float,
    commission_paid: float,
    net_pnl: float,
    trade_capital: float,          # знаменатель для return_pct
) -> dict:
    """Сформировать dict записи о закрытой сделке."""
    return_pct = (net_pnl / trade_capital) if trade_capital > 0 else 0.0
    return {
        "entry_date":     entry_date,
        "exit_date":      exit_date,
        "entry_price":    round(entry_price, 4),
        "exit_price":     round(exit_price, 4),
        "direction":      direction,
        "position_size":  round(position_size, 4),
        "gross_pnl":      round(gross_pnl, 4),
        "commission_paid": round(commission_paid, 4),
        "net_pnl":        round(net_pnl, 4),
        "return_pct":     round(return_pct, 6),
    }


# ── Основная функция ──────────────────────────────────────────────────────────

def run_backtest(
    signals_output: dict,
    initial_capital: float = 10_000.0,
    commission: float = 0.001,      # 0.1% от стоимости сделки (берётся при открытии и закрытии)
    slippage: float = 0.0005,       # 0.05% проскальзывание цены исполнения
    allow_short: bool = False,      # разрешать ли короткие продажи
    reinvest: bool = True,          # реинвестировать прибыль (True) или фикс. размер (False)
    risk_free_rate: float = 0.0,    # годовая безрисковая ставка для коэффициента Шарпа
) -> dict:
    """
    Провести бэктест по сигналам из generate_signals.

    Параметры
    ---------
    signals_output  : dict из generate_signals()
    initial_capital : начальный капитал
    commission      : ставка комиссии (доля от стоимости сделки, применяется 2×)
    slippage        : проскальзывание (доля от цены; BUY дороже, SELL дешевле)
    allow_short     : разрешить открытие коротких позиций по сигналу SELL
    reinvest        : True — торгуем equity × position_size, False — initial × position_size
    risk_free_rate  : безрисковая ставка, передаётся в compute_trading_metrics

    Возвращает
    ----------
    dict с ключами: dates, equity_curve, returns, trades, metrics, params
    """
    dates          = signals_output["dates"]
    actual         = signals_output["actual"]
    signals        = signals_output["signals"]
    position_sizes = signals_output["position_size"]

    n = len(dates)
    if n == 0:
        return {
            "dates": [], "equity_curve": [], "returns": [],
            "trades": [], "metrics": compute_trading_metrics(
                np.array([]), np.array([]), [], risk_free_rate=risk_free_rate,
            ),
            "params": {
                "initial_capital": initial_capital, "commission": commission,
                "slippage": slippage, "allow_short": allow_short,
                "reinvest": reinvest, "risk_free_rate": risk_free_rate,
            },
        }

    # ── Состояние портфеля ────────────────────────────────────────────────────
    cash     = float(initial_capital)
    shares   = 0.0           # кол-во акций в позиции (>0 для лонга, >0 для шорта тоже)
    position = "none"        # "none" | "long" | "short"

    # Параметры открытой сделки (заполняются при открытии, сбрасываются при закрытии)
    entry_date      = ""
    entry_price     = 0.0
    entry_comm      = 0.0    # комиссия при открытии
    entry_psize     = 0.0    # position_size в момент открытия
    entry_capital   = 0.0   # shares × entry_price (знаменатель для return_pct)

    equity_curve: list[float] = []
    trades:        list[dict]  = []

    # ── Основной цикл ─────────────────────────────────────────────────────────
    for i in range(n):
        price = float(actual[i])

        # Mark-to-market: текущий equity по рыночной цене
        if position == "long":
            equity = cash + shares * price
        elif position == "short":
            # При шорте: cash увеличен на proceeds от продажи, но есть обязательство вернуть акции
            equity = cash - shares * price
        else:
            equity = cash

        equity_curve.append(equity)

        # Исполнение сигнала[i] происходит на цене actual[i+1] (следующий день)
        if i >= n - 1:
            continue  # на последнем баре нечего исполнять (нет следующей цены)

        sig   = signals[i]
        psize = float(position_sizes[i])
        exec_raw = float(actual[i + 1])  # цена исполнения (следующий торговый день)

        # ── BUY ───────────────────────────────────────────────────────────────
        if sig == "BUY":
            if position == "long":
                # Уже в long → не удваиваемся, пропускаем
                pass

            elif position == "short":
                # Закрываем шорт перед открытием лонга
                close_price = exec_raw * (1 + slippage)   # выкупаем дороже
                close_comm  = shares * close_price * commission
                gross       = shares * (entry_price - close_price)
                net         = gross - entry_comm - close_comm
                cash       -= shares * close_price + close_comm   # тратим cash на выкуп
                trades.append(_make_trade(
                    entry_date, dates[i + 1],
                    entry_price, close_price, "short",
                    entry_psize, gross, entry_comm + close_comm, net, entry_capital,
                ))
                shares = 0.0
                position = "none"
                equity = cash   # пересчитываем equity после закрытия шорта

                # Открываем лонг (ниже)

            if position == "none":
                # Открываем лонг
                exec_price   = exec_raw * (1 + slippage)   # платим дороже
                capital_base = equity if reinvest else float(initial_capital)
                trade_cap    = capital_base * psize
                open_comm    = trade_cap * commission
                shares       = trade_cap / exec_price
                cash         = equity - trade_cap - open_comm
                entry_date   = dates[i + 1]
                entry_price  = exec_price
                entry_comm   = open_comm
                entry_psize  = psize
                entry_capital = trade_cap    # = shares × entry_price (до вычета комиссии)
                position     = "long"

        # ── SELL ──────────────────────────────────────────────────────────────
        elif sig == "SELL":
            if position == "long":
                # Закрываем лонг
                exec_price = exec_raw * (1 - slippage)    # продаём дешевле
                close_val  = shares * exec_price
                close_comm = close_val * commission
                gross      = shares * (exec_price - entry_price)
                net        = gross - entry_comm - close_comm
                cash      += close_val - close_comm
                trades.append(_make_trade(
                    entry_date, dates[i + 1],
                    entry_price, exec_price, "long",
                    entry_psize, gross, entry_comm + close_comm, net, entry_capital,
                ))
                shares   = 0.0
                position = "none"

            elif position == "none":
                if allow_short:
                    # Открываем шорт
                    exec_price   = exec_raw * (1 - slippage)   # продаём дешевле
                    capital_base = equity if reinvest else float(initial_capital)
                    trade_cap    = capital_base * psize
                    open_comm    = trade_cap * commission
                    shares       = trade_cap / exec_price
                    # Получаем proceeds от продажи заимствованных акций
                    cash         = equity + trade_cap - open_comm
                    entry_date   = dates[i + 1]
                    entry_price  = exec_price
                    entry_comm   = open_comm
                    entry_psize  = psize
                    entry_capital = trade_cap
                    position     = "short"
                else:
                    # SELL без позиции и allow_short=False → пропускаем
                    pass

            elif position == "short":
                # Уже в шорте → не удваиваемся, пропускаем
                pass

    # ── Принудительное закрытие открытой позиции в конце периода ─────────────
    if position != "none":
        last_price = float(actual[-1])
        # Закрываем по последней цене (без slippage, но с комиссией)
        logger.info("Принудительное закрытие позиции '%s' в конце периода по цене %.4f",
                    position, last_price)

        if position == "long":
            close_val  = shares * last_price
            close_comm = close_val * commission
            gross      = shares * (last_price - entry_price)
            net        = gross - entry_comm - close_comm
            cash      += close_val - close_comm
            trades.append(_make_trade(
                entry_date, dates[-1],
                entry_price, last_price, "long",
                entry_psize, gross, entry_comm + close_comm, net, entry_capital,
            ))

        elif position == "short":
            close_cost = shares * last_price
            close_comm = close_cost * commission
            gross      = shares * (entry_price - last_price)
            net        = gross - entry_comm - close_comm
            cash      -= close_cost + close_comm
            trades.append(_make_trade(
                entry_date, dates[-1],
                entry_price, last_price, "short",
                entry_psize, gross, entry_comm + close_comm, net, entry_capital,
            ))

        # Обновляем последнюю точку equity_curve (вычитаем exit-комиссию)
        equity_curve[-1] = cash

    # ── Дневные доходности ────────────────────────────────────────────────────
    eq_arr  = np.array(equity_curve, dtype=float)
    returns = np.zeros(n)
    for j in range(1, n):
        prev = eq_arr[j - 1]
        returns[j] = (eq_arr[j] - prev) / prev if prev > 0 else 0.0

    # ── Торговые метрики ──────────────────────────────────────────────────────
    metrics = compute_trading_metrics(
        returns     = returns,
        equity_curve= eq_arr,
        trades      = trades,
        risk_free_rate = risk_free_rate,
    )

    return {
        "dates":        dates,
        "equity_curve": equity_curve,
        "returns":      returns.tolist(),
        "trades":       trades,
        "metrics":      metrics,
        "params": {
            "initial_capital": initial_capital,
            "commission":      commission,
            "slippage":        slippage,
            "allow_short":     allow_short,
            "reinvest":        reinvest,
            "risk_free_rate":  risk_free_rate,
        },
    }
