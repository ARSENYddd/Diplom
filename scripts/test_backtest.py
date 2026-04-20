"""
Smoke-test для services/backtest.py и services/trading_metrics.py.

Запуск из корня проекта:
  python3 scripts/test_backtest.py

Что делает:
  1. run_arima → generate_signals(momentum) → run_backtest
  2. ASCII equity curve (40 символов)
  3. Таблица метрик
  4. Сравнительная таблица по всем 3 стратегиям
  5. Строка Buy & Hold baseline
"""

import sys
import os
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "project", "backend"))

from services.data_service import load_data
from services.signals import generate_signals, available_strategies
from services.backtest import run_backtest
from services.trading_metrics import sharpe_ratio, max_drawdown
from models.arima_model import run_arima

# ── Параметры теста ────────────────────────────────────────────────────────────
TICKER          = "AAPL"
START           = "2022-01-01"
END             = "2023-12-31"
WINDOW          = 30
INITIAL_CAPITAL = 10_000.0
COMMISSION      = 0.001
SLIPPAGE        = 0.0005


# ── Утилиты вывода ────────────────────────────────────────────────────────────

def sep(char: str = "─", width: int = 74) -> None:
    print(char * width)


def ascii_equity_curve(
    equity_curve: list,
    width: int = 40,
    height: int = 10,
    char: str = "*",
) -> None:
    """Нарисовать линейный ASCII-график кривой капитала."""
    eq = list(equity_curve)
    if len(eq) < 2:
        print("  (недостаточно данных для графика)")
        return

    min_eq = min(eq)
    max_eq = max(eq)

    if max_eq == min_eq:
        mid = height // 2
        for r in range(height):
            prefix = f"  {max_eq:>10.2f} │" if r == mid else f"  {'':>10}  │"
            print(prefix + ("─" * width if r == mid else " " * width) + "│")
        print(f"  {'':>10}  └{'─' * width}┘")
        return

    # Нормализуем и прореживаем до width точек
    sampled = []
    for col in range(width):
        idx = int(col * (len(eq) - 1) / (width - 1))
        sampled.append(eq[idx])

    def to_row(v: float) -> int:
        norm = (v - min_eq) / (max_eq - min_eq)
        return height - 1 - int(norm * (height - 1))

    rows = [to_row(v) for v in sampled]

    for r in range(height):
        line = "".join(char if rows[c] == r else " " for c in range(width))
        if r == 0:
            prefix = f"  {max_eq:>10.2f} │"
        elif r == height - 1:
            prefix = f"  {min_eq:>10.2f} │"
        else:
            prefix = f"  {'':>10}  │"
        print(prefix + line + "│")

    print(f"  {'':>10}  └{'─' * width}┘")
    print(f"  {'':>10}   Start{' ' * (width - 11)}End")


def print_metrics_table(metrics: dict, label: str = "") -> None:
    """Вывести одну строку метрик."""
    sharpe  = metrics.get("sharpe", 0.0)
    mdd     = metrics.get("max_drawdown", 0.0) * 100
    wr      = metrics.get("winrate", 0.0) * 100
    pf      = metrics.get("profit_factor", 0.0)
    n       = metrics.get("n_trades", 0)
    total_r = metrics.get("total_return", 0.0) * 100
    flags   = []
    if metrics.get("insufficient_trades"):
        flags.append("!")
    if metrics.get("low_confidence"):
        flags.append("~")
    flag_str = "".join(flags)

    print(
        f"  {label:<22} {sharpe:>7.3f}  {mdd:>8.2f}%  {wr:>7.1f}%  "
        f"{pf:>9.3f}  {n:>8}  {total_r:>11.2f}%  {flag_str}"
    )


def compute_bh_metrics(actual: list, initial_capital: float, commission: float, slippage: float) -> dict:
    """Buy & Hold метрики: купить в начале, держать до конца."""
    if len(actual) < 2:
        return {}

    # Цена покупки (с проскальзыванием) и продажи (с проскальзыванием)
    buy_price  = actual[0]  * (1 + slippage)
    sell_price = actual[-1] * (1 - slippage)
    open_comm  = initial_capital * commission
    shares_bh  = (initial_capital - open_comm) / buy_price
    close_val  = shares_bh * sell_price
    close_comm = close_val * commission
    final_cap  = close_val - close_comm

    # Кривая капитала: proportional к цене актива
    eq_curve = [initial_capital * (p / actual[0]) for p in actual]
    eq_curve[-1] = final_cap  # скорректировать на exit-комиссию

    # Дневные доходности
    daily_ret = np.zeros(len(actual))
    for j in range(1, len(actual)):
        prev = eq_curve[j - 1]
        daily_ret[j] = (eq_curve[j] - prev) / prev if prev > 0 else 0.0

    return {
        "sharpe":       round(sharpe_ratio(daily_ret), 4),
        "max_drawdown": round(max_drawdown(np.array(eq_curve)), 4),
        "winrate":      None,   # не применимо для B&H
        "profit_factor": None,
        "n_trades":     1,
        "total_return": round((final_cap - initial_capital) / initial_capital, 4),
        "equity_curve": eq_curve,
    }


def main() -> None:
    sep("═")
    print("  SMOKE-TEST: backtest.py + trading_metrics.py")
    sep("═")

    # 1. Загрузка данных и ARIMA прогноз
    print(f"\nЗагружаем {TICKER} {START} → {END} и запускаем run_arima ...")
    model_output = run_arima(TICKER, START, END, window=WINDOW, n_future=0)
    i_test = model_output["test_from_index"]
    n_test = len(model_output["dates"]) - i_test
    print(f"  Тестовый период: {n_test} точек  |  Метрики ARIMA: {model_output['metrics']}")

    # 2. Бэктест по стратегии momentum (ARIMA threshold даёт 100% HOLD, не интересно)
    print("\n" + "═" * 74)
    print("  ДЕТАЛЬНЫЙ БЭКТЕСТ: стратегия 'momentum'")
    sep("═")

    sig_momentum = generate_signals(model_output, strategy="momentum")
    bt_momentum  = run_backtest(
        sig_momentum,
        initial_capital=INITIAL_CAPITAL,
        commission=COMMISSION,
        slippage=SLIPPAGE,
    )
    m = bt_momentum["metrics"]
    print(f"\n  Начальный капитал: {INITIAL_CAPITAL:,.2f}")
    print(f"  Конечный капитал:  {bt_momentum['equity_curve'][-1]:,.2f}")
    print(f"  Сделок: {m['n_trades']}  |  WinRate: {m['winrate']*100:.1f}%")
    if m.get("low_confidence"):
        print("  ⚠  Мало сделок — Sharpe ненадёжен (< 30)")

    # ASCII equity curve
    print("\n  Equity curve (стратегия 'momentum'):")
    ascii_equity_curve(bt_momentum["equity_curve"])

    # Первые 3 сделки
    if bt_momentum["trades"]:
        print("\n  Первые сделки:")
        sep()
        print(f"  {'Вход':<12} {'Выход':<12} {'Dir':<6} {'Entry':>8} {'Exit':>8} "
              f"{'Gross':>9} {'Comm':>7} {'Net':>9} {'Ret%':>8}")
        sep()
        for t in bt_momentum["trades"][:5]:
            print(
                f"  {t['entry_date']:<12} {t['exit_date']:<12} {t['direction']:<6} "
                f"{t['entry_price']:>8.2f} {t['exit_price']:>8.2f} "
                f"{t['gross_pnl']:>+9.2f} {t['commission_paid']:>7.2f} "
                f"{t['net_pnl']:>+9.2f} {t['return_pct']*100:>+7.3f}%"
            )
        sep()

    # 3. Сравнительная таблица по всем стратегиям + Buy & Hold
    print("\n" + "═" * 74)
    print("  СРАВНИТЕЛЬНАЯ ТАБЛИЦА (все стратегии + Buy & Hold)")
    sep("═")
    print(
        f"\n  {'Стратегия':<22} {'Sharpe':>7}  {'MaxDD':>9}  {'WinRate':>7}  "
        f"{'ProfFact':>9}  {'N_trades':>8}  {'TotalRet':>11}"
    )
    sep()

    for strat in available_strategies():
        sigs = generate_signals(model_output, strategy=strat)
        bt   = run_backtest(
            sigs,
            initial_capital=INITIAL_CAPITAL,
            commission=COMMISSION,
            slippage=SLIPPAGE,
        )
        print_metrics_table(bt["metrics"], label=strat)

    # Buy & Hold baseline
    actual_prices = model_output["actual"][i_test:]
    bh = compute_bh_metrics(actual_prices, INITIAL_CAPITAL, COMMISSION, SLIPPAGE)

    # Форматируем строку B&H вручную (некоторые поля не применимы)
    bh_wr_str  = "      —"
    bh_pf_str  = "        —"
    print(
        f"  {'Buy & Hold':<22} {bh['sharpe']:>7.3f}  "
        f"{bh['max_drawdown']*100:>8.2f}%  "
        f"{bh_wr_str}  {bh_pf_str}  "
        f"{bh['n_trades']:>8}  "
        f"{bh['total_return']*100:>11.2f}%"
    )
    sep()
    print("\n  Обозначения: ! = insufficient_trades (<5),  ~ = low_confidence (<30)")

    # 4. Тест reinvest=False
    print("\n" + "═" * 74)
    print("  ТЕСТ reinvest=False (фиксированный размер позиции)")
    sep("═")
    sig_m2 = generate_signals(model_output, strategy="momentum")
    bt_fixed = run_backtest(
        sig_m2,
        initial_capital=INITIAL_CAPITAL,
        commission=COMMISSION,
        slippage=SLIPPAGE,
        reinvest=False,
    )
    print(f"  reinvest=True  → final equity: {bt_momentum['equity_curve'][-1]:>10.2f}")
    print(f"  reinvest=False → final equity: {bt_fixed['equity_curve'][-1]:>10.2f}")

    print("\n✓ Smoke-test завершён успешно\n")


if __name__ == "__main__":
    main()
