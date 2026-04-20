"""
Smoke-test для services/signals.py.

Запуск из корня проекта:
  python scripts/test_signals.py

Что делает:
  1. Загружает данные через load_data
  2. Прогоняет run_arima
  3. Прогоняет generate_signals с каждой из 3 стратегий
  4. Выводит distribution BUY/SELL/HOLD для каждой стратегии
  5. Выводит первые 10 строк в табличном виде
"""

import sys
import os

# Добавляем project/backend в sys.path, чтобы импорты работали как в продакшене
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "project", "backend"))

from services.data_service import load_data
from services.signals import generate_signals, available_strategies
from models.arima_model import run_arima

# ── Параметры теста ────────────────────────────────────────────────────────────
TICKER = "AAPL"
START  = "2022-01-01"
END    = "2023-12-31"
WINDOW = 30


def print_separator(char: str = "─", width: int = 72) -> None:
    print(char * width)


def print_distribution(strategy: str, signals: list) -> None:
    """Вывести количество и долю каждого сигнала."""
    total = len(signals)
    counts = {s: signals.count(s) for s in ["BUY", "SELL", "HOLD"]}
    print(f"\n  Стратегия: {strategy.upper()!r}  (всего точек: {total})")
    for sig, cnt in counts.items():
        pct  = cnt / total * 100 if total > 0 else 0
        bar  = "█" * int(pct / 2)
        print(f"    {sig:<5}  {cnt:>4}  ({pct:5.1f}%)  {bar}")


def print_table(signals_output: dict, n_rows: int = 10) -> None:
    """Вывести первые n_rows строк в табличном виде."""
    dates    = signals_output["dates"]
    actual   = signals_output["actual"]
    pred     = signals_output["predicted"]
    sigs     = signals_output["signals"]
    pos      = signals_output["position_size"]
    exp_ret  = signals_output["expected_return"]

    header = f"{'Дата':<12} {'Actual':>10} {'Predicted':>10} {'Signal':<6} {'PosSz':>6} {'ExpRet':>9}"
    print_separator()
    print(header)
    print_separator()
    for i in range(min(n_rows, len(dates))):
        print(
            f"{dates[i]:<12} "
            f"{actual[i]:>10.2f} "
            f"{pred[i]:>10.2f} "
            f"{sigs[i]:<6} "
            f"{pos[i]:>6.3f} "
            f"{exp_ret[i]:>+9.5f}"
        )
    print_separator()


def main() -> None:
    print_separator("═")
    print("  SMOKE-TEST: signals.py")
    print_separator("═")

    # 1. Доступные стратегии
    print(f"\nДоступные стратегии: {available_strategies()}")

    # 2. Загрузка данных
    print(f"\nЗагружаем данные: {TICKER} {START} → {END} ...")
    df = load_data(TICKER, START, END)
    print(f"  Загружено {len(df)} торговых дней")

    # 3. ARIMA прогноз
    print(f"\nЗапускаем run_arima (window={WINDOW}) ...")
    model_output = run_arima(TICKER, START, END, window=WINDOW, n_future=0)
    i_test  = model_output["test_from_index"]
    i_total = len(model_output["dates"])
    print(f"  Всего дат: {i_total}  |  Тестовый период: {i_total - i_test} точек")
    print(f"  Метрики модели: {model_output['metrics']}")

    # 4. Сигналы для каждой стратегии
    strategies    = available_strategies()
    all_outputs   = {}
    position_methods = ["fixed", "volatility_scaled", "confidence"]

    print("\n" + "═" * 72)
    print("  DISTRIBUTION СИГНАЛОВ")
    print("═" * 72)

    for strat in strategies:
        out = generate_signals(
            model_output,
            strategy=strat,
            threshold_pct=0.003,
            vol_filter=True,
            vol_window=20,
            vol_multiplier=1.5,
            position_sizing="fixed",
            max_position=1.0,
        )
        all_outputs[strat] = out
        print_distribution(strat, out["signals"])

    # 5. Таблица первых 10 строк — threshold стратегия
    print("\n" + "═" * 72)
    print("  ПЕРВЫЕ 10 СТРОК — стратегия 'threshold' (position_sizing=fixed)")
    print("═" * 72)
    print_table(all_outputs["threshold"], n_rows=10)

    # 6. Сравнение методов position sizing на threshold стратегии
    print("\n" + "═" * 72)
    print("  СРАВНЕНИЕ POSITION SIZING (стратегия 'threshold')")
    print("═" * 72)
    for method in position_methods:
        out = generate_signals(
            model_output,
            strategy="threshold",
            position_sizing=method,
        )
        buy_sizes = [
            out["position_size"][i]
            for i in range(len(out["signals"]))
            if out["signals"][i] == "BUY"
        ]
        avg_size = sum(buy_sizes) / len(buy_sizes) if buy_sizes else 0.0
        print(f"  {method:<20}  BUY-сделок: {len(buy_sizes):>4}  "
              f"Средний размер: {avg_size:.4f}")

    print("\n✓ Smoke-test завершён успешно\n")


if __name__ == "__main__":
    main()
