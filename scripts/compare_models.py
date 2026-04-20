"""
Сравнение всех 8 моделей прогноза по торговым метрикам.

Запуск:
  python3 scripts/compare_models.py --ticker AAPL --start 2022-01-01 --end 2023-12-31
  python3 scripts/compare_models.py --ticker SBER.ME --start 2021-01-01 --end 2023-12-31 \
      --strategy momentum --commission 0.0003 --risk-free-rate 0.16

Выводит сравнительную таблицу (Sharpe по убыванию) и сохраняет JSON в results/.
"""

import sys
import os
import time
import json
import argparse
from datetime import date

# Добавляем project/backend в sys.path (все модели и сервисы оттуда)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "project", "backend"))

import numpy as np

from services.data_service import load_data
from services.signals import generate_signals
from services.backtest import run_backtest
from services.trading_metrics import sharpe_ratio, max_drawdown

# ── Реестр моделей (порядок = порядок запуска) ────────────────────────────────
# Ключ совпадает с MODEL_RUNNERS в main.py
MODEL_REGISTRY: list[tuple[str, str]] = [
    ("arima",          "ARIMA"),
    ("garch",          "GARCH(1,1)"),
    ("lstm",           "LSTM"),
    ("hybrid",         "ARIMA+LSTM"),
    ("arima_gru",      "ARIMA+GRU"),
    ("garch_lstm",     "GARCH+LSTM"),
    ("triple_hybrid",  "ARIMA+GARCH+LSTM"),
    ("ensemble",       "Ансамбль"),
]


def _load_runner(model_key: str):
    """
    Лениво импортировать run_* функцию для модели.
    Возвращает функцию или None при ошибке импорта (например, нет TensorFlow).
    """
    try:
        if model_key == "arima":
            from models.arima_model import run_arima
            return run_arima
        if model_key == "garch":
            from models.garch_model import run_garch
            return run_garch
        if model_key == "lstm":
            from models.lstm_model import run_lstm
            return run_lstm
        if model_key == "hybrid":
            from models.hybrid_model import run_hybrid
            return run_hybrid
        if model_key == "arima_gru":
            from models.arima_gru_model import run_arima_gru
            return run_arima_gru
        if model_key == "garch_lstm":
            from models.garch_lstm_model import run_garch_lstm
            return run_garch_lstm
        if model_key == "triple_hybrid":
            from models.triple_hybrid_model import run_triple_hybrid
            return run_triple_hybrid
        if model_key == "ensemble":
            from models.ensemble_model import run_ensemble
            return run_ensemble
    except Exception as e:
        return None
    return None


def _compute_bh(
    actual: list,
    initial_capital: float,
    commission: float,
    slippage: float,
    risk_free_rate: float,
) -> dict:
    """Buy & Hold: купить в начале тестового периода, держать до конца."""
    if len(actual) < 2:
        return {}

    buy_price  = float(actual[0])  * (1 + slippage)
    sell_price = float(actual[-1]) * (1 - slippage)

    open_comm  = initial_capital * commission
    shares     = (initial_capital - open_comm) / buy_price
    close_val  = shares * sell_price
    close_comm = close_val * commission
    final_cap  = close_val - close_comm

    # Пропорциональная кривая капитала (без комиссий внутри)
    eq_curve = [initial_capital * (float(p) / float(actual[0])) for p in actual]
    eq_curve[-1] = final_cap   # скорректировать финал на exit-комиссию

    daily_ret = np.zeros(len(actual))
    for j in range(1, len(actual)):
        prev = eq_curve[j - 1]
        daily_ret[j] = (eq_curve[j] - prev) / prev if prev > 0 else 0.0

    total_ret = (final_cap - initial_capital) / initial_capital

    return {
        "model_name":   "Buy & Hold",
        "rmse":          None,
        "sharpe":        round(sharpe_ratio(daily_ret, risk_free_rate=risk_free_rate), 4),
        "max_drawdown":  round(max_drawdown(np.array(eq_curve)), 4),
        "winrate":       None,
        "profit_factor": None,
        "n_trades":      1,
        "total_return":  round(total_ret, 4),
        "insufficient":  False,
        "error":         None,
        "elapsed_sec":   0.0,
    }


# ── Форматирование таблицы ─────────────────────────────────────────────────────

def _fmt_pct(v, decimals: int = 2) -> str:
    if v is None:
        return "      —"
    return f"{v*100:>+7.{decimals}f}%"


def _fmt_float(v, width: int = 7, decimals: int = 3) -> str:
    if v is None:
        return " " * width + "—"
    return f"{v:>{width}.{decimals}f}"


def _print_table(rows: list[dict], show_timing: bool = True) -> None:
    """Вывести сравнительную таблицу строк результатов."""
    header = (
        f"  {'Модель':<22} {'RMSE':>7}  {'Sharpe':>7}  {'MaxDD':>9}  "
        f"{'WinRate':>8}  {'ProfFact':>8}  {'N_trades':>9}  {'TotalRet':>9}"
    )
    if show_timing:
        header += f"  {'Время':>6}"

    sep = "─" * len(header)
    print()
    print(sep)
    print(header)
    print(sep)

    for r in rows:
        name = r["model_name"]
        err  = r.get("error")

        if err:
            print(f"  {name:<22}  {'ERROR: ' + str(err)[:55]}")
            continue

        n     = r["n_trades"]
        zero  = (n == 0)
        insuf = r.get("insufficient", False)
        n_str = "       0" if zero else (f"{n:>8}!" if insuf else f"{n:>8} ")

        rmse_str = "      —" if r["rmse"] is None else f"{r['rmse']:>7.2f}"
        wr_str   = "       —" if (r["winrate"] is None or zero) else f"{r['winrate']*100:>7.1f}%"
        pf_str   = "        —" if (r["profit_factor"] is None or zero) else f"{r['profit_factor']:>8.3f}"
        sh_str   = "       —" if zero else f"{r['sharpe']:>7.3f}"
        dd_str   = "      —%" if zero else f"{r['max_drawdown']*100:>+8.2f}%"
        tr_str   = "       —" if zero else f"{r['total_return']*100:>+8.2f}%"

        line = (
            f"  {name:<22} {rmse_str}  {sh_str}  {dd_str}  "
            f"{wr_str}  {pf_str}  {n_str}  {tr_str}"
        )
        if show_timing:
            t = r.get("elapsed_sec", 0.0)
            line += f"  {t:>5.1f}s"
        print(line)

    print(sep)
    if any(r.get("insufficient") for r in rows):
        print("  Обозначения: ! = n_trades < 5 (метрики ненадёжны)")


# ── Главная функция ───────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Сравнение 8 моделей прогноза по торговым метрикам"
    )
    parser.add_argument("--ticker",          required=True,  help="Тикер (AAPL, SBER.ME, ...)")
    parser.add_argument("--start",           required=True,  help="Начало периода YYYY-MM-DD")
    parser.add_argument("--end",             required=True,  help="Конец периода YYYY-MM-DD")
    parser.add_argument("--strategy",        default="momentum",
                        choices=["threshold", "momentum", "mean_reversion"],
                        help="Стратегия сигналов (дефолт: momentum)")
    parser.add_argument("--commission",      default=0.001,  type=float,
                        help="Ставка комиссии (дефолт: 0.001 = 0.1%%)")
    parser.add_argument("--risk-free-rate",  default=0.0,    type=float, dest="rfr",
                        help="Безрисковая ставка годовая для Sharpe (дефолт: 0.0)")
    parser.add_argument("--initial-capital", default=10_000.0, type=float,
                        help="Начальный капитал (дефолт: 10000)")
    parser.add_argument("--slippage",        default=0.0005, type=float,
                        help="Проскальзывание (дефолт: 0.0005)")
    args = parser.parse_args()

    print("═" * 74)
    print(f"  СРАВНЕНИЕ МОДЕЛЕЙ | {args.ticker} | {args.start} → {args.end}")
    print(f"  Стратегия: {args.strategy} | Комиссия: {args.commission*100:.2f}% | rf: {args.rfr:.2%}")
    print("═" * 74)

    # Предзагрузка данных (кешируется — все модели используют один и тот же df)
    print(f"\nЗагружаем данные для {args.ticker} ...")
    try:
        df = load_data(args.ticker, args.start, args.end)
        print(f"  {len(df)} торговых дней загружено\n")
    except Exception as e:
        print(f"  ОШИБКА загрузки данных: {e}")
        sys.exit(1)

    rows: list[dict] = []

    # ── Прогон каждой модели ──────────────────────────────────────────────────
    for model_key, model_name in MODEL_REGISTRY:
        print(f"  [{model_name:<22}] запуск ...", end="", flush=True)
        t_start = time.perf_counter()

        runner = _load_runner(model_key)
        if runner is None:
            elapsed = time.perf_counter() - t_start
            print(f" ОШИБКА импорта ({elapsed:.1f}s)")
            rows.append({
                "model_name": model_name, "model_key": model_key,
                "rmse": None, "sharpe": None, "max_drawdown": None,
                "winrate": None, "profit_factor": None,
                "n_trades": 0, "total_return": None,
                "insufficient": False, "error": "import error",
                "elapsed_sec": elapsed,
            })
            continue

        try:
            # Прогноз (n_future=0 — нужен только тестовый период)
            model_out = runner(args.ticker, args.start, args.end, n_future=0)
            rmse      = model_out.get("metrics", {}).get("rmse")

            # Сигналы
            sig_out = generate_signals(
                model_out,
                strategy=args.strategy,
            )

            # Бэктест
            bt = run_backtest(
                sig_out,
                initial_capital=args.initial_capital,
                commission=args.commission,
                slippage=args.slippage,
                risk_free_rate=args.rfr,
            )
            m = bt["metrics"]

            elapsed = time.perf_counter() - t_start
            n       = m["n_trades"]
            print(f" {n} сделок, Sharpe={m['sharpe']:.3f} ({elapsed:.1f}s)")

            rows.append({
                "model_name":   model_name,
                "model_key":    model_key,
                "rmse":         rmse,
                "sharpe":       m["sharpe"],
                "max_drawdown": m["max_drawdown"],
                "winrate":      m["winrate"],
                "profit_factor": m["profit_factor"],
                "n_trades":     n,
                "total_return": m["total_return"],
                "insufficient": m.get("insufficient_trades", False),
                "low_confidence": m.get("low_confidence", False),
                "error":        None,
                "elapsed_sec":  round(elapsed, 2),
                # Полные метрики для JSON
                "full_metrics": m,
            })

        except Exception as exc:
            elapsed = time.perf_counter() - t_start
            print(f" ОШИБКА: {exc} ({elapsed:.1f}s)")
            rows.append({
                "model_name": model_name, "model_key": model_key,
                "rmse": None, "sharpe": None, "max_drawdown": None,
                "winrate": None, "profit_factor": None,
                "n_trades": 0, "total_return": None,
                "insufficient": False, "error": str(exc)[:80],
                "elapsed_sec": round(elapsed, 2),
            })

    # ── Buy & Hold baseline ───────────────────────────────────────────────────
    print(f"  [{'Buy & Hold':<22}] расчёт ...", end="", flush=True)
    try:
        # Берём тестовый период из первой успешной модели
        test_actual = None
        for r in rows:
            if r.get("error") is None and r.get("full_metrics") is not None:
                # Восстанавливаем actual тестового периода через загрузку
                break

        # Нужны цены тестового периода — берём из сигналов последней успешной модели
        # Проще: пересчитать через сплит 80/20 напрямую
        n_total = len(df)
        n_train = int(n_total * 0.8)
        test_prices = df["Close"].values[n_train:].tolist()

        bh = _compute_bh(
            actual=test_prices,
            initial_capital=args.initial_capital,
            commission=args.commission,
            slippage=args.slippage,
            risk_free_rate=args.rfr,
        )
        rows.append(bh)
        print(f" Sharpe={bh['sharpe']:.3f}")
    except Exception as e:
        print(f" ОШИБКА: {e}")
        rows.append({
            "model_name": "Buy & Hold", "rmse": None,
            "sharpe": None, "max_drawdown": None,
            "winrate": None, "profit_factor": None,
            "n_trades": 1, "total_return": None,
            "insufficient": False, "error": str(e), "elapsed_sec": 0.0,
        })

    # ── Сортировка по Sharpe (ошибки и нулевые сделки — в конец) ─────────────
    def sort_key(r: dict) -> float:
        if r.get("error"):
            return -999.0
        if r["n_trades"] == 0:
            return -998.0
        return r.get("sharpe") or -997.0

    # B&H — выносим отдельно, чтобы всегда быть последней строкой
    bh_row     = rows[-1]
    model_rows = sorted(rows[:-1], key=sort_key, reverse=True)
    sorted_rows = model_rows + [bh_row]

    # ── Вывод таблицы ─────────────────────────────────────────────────────────
    print("\n" + "═" * 74)
    print(f"  РЕЗУЛЬТАТЫ — {args.ticker} | {args.strategy} | rf={args.rfr:.2%}")
    _print_table(sorted_rows, show_timing=True)

    # ── Ключевые наблюдения ───────────────────────────────────────────────────
    valid_rows = [r for r in model_rows if not r.get("error") and r.get("n_trades", 0) > 0]

    if valid_rows:
        best_sharpe = max(valid_rows, key=lambda r: r.get("sharpe") or -999)
        best_rmse   = min(
            [r for r in valid_rows if r.get("rmse") is not None],
            key=lambda r: r["rmse"],
            default=None,
        )
        print(f"\n  ★ Лучший по Sharpe:  {best_sharpe['model_name']} "
              f"(Sharpe={best_sharpe['sharpe']:.3f})")
        if best_rmse:
            print(f"  ★ Лучший по RMSE:    {best_rmse['model_name']} "
                  f"(RMSE={best_rmse['rmse']:.2f})")
        bh_sharpe = bh_row.get("sharpe") or 0.0
        beats = best_sharpe.get("sharpe", 0.0) > bh_sharpe
        print(f"  {'✓' if beats else '✗'} Лучшая модель {'бьёт' if beats else 'НЕ бьёт'} "
              f"Buy & Hold по Sharpe ({best_sharpe.get('sharpe', 0):.3f} vs {bh_sharpe:.3f})")

    # ── Сохранение JSON ───────────────────────────────────────────────────────
    results_dir = os.path.join(os.path.dirname(__file__), "..", "results")
    os.makedirs(results_dir, exist_ok=True)
    today_str  = date.today().isoformat()
    fname      = f"comparison_{args.ticker.replace('.', '_')}_{today_str}.json"
    fpath      = os.path.join(results_dir, fname)

    # Убираем non-serializable объекты из full_metrics (numpy floats → float)
    def _clean(obj):
        if isinstance(obj, dict):
            return {k: _clean(v) for k, v in obj.items()}
        if isinstance(obj, (np.floating, np.integer)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return obj

    output_json = {
        "ticker":        args.ticker,
        "start":         args.start,
        "end":           args.end,
        "strategy":      args.strategy,
        "commission":    args.commission,
        "slippage":      args.slippage,
        "risk_free_rate": args.rfr,
        "initial_capital": args.initial_capital,
        "run_date":      today_str,
        "results":       [_clean(r) for r in sorted_rows],
    }

    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(output_json, f, ensure_ascii=False, indent=2)

    print(f"\n  Результаты сохранены: {fpath}")
    print()


if __name__ == "__main__":
    main()
