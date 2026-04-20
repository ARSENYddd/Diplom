# TRADING_LAYER_NOTES.md
Документ для планирования и фиксации решений по торговому слою.

---

## 1. ТЕКУЩАЯ СТРУКТУРА

### project/backend/services/

| Файл | Назначение |
|---|---|
| `data_service.py` | Загрузка цен из yfinance / MOEX ISS, кеш (память + диск pickle), `load_data`, `get_price_series`, `train_test_split_series` |
| `metrics.py` | Статистические метрики прогноза: `mae`, `rmse`, `mape`, `compute_all` |
| `forecast_utils.py` | Утилиты для future-прогноза: `future_trading_dates`, `bootstrap_future`, `bootstrap_scenarios`, константа `SCENARIOS` (5 сценариев) |

### Точная структура dict, которую возвращают все run_* функции

```python
{
    # --- Временной ряд ---
    "dates":    list[str],          # все даты: train + test + future, формат "YYYY-MM-DD"
    "actual":   list[float | None], # реальные цены; None для future-части
    "predicted":list[float | None], # прогнозы;      None для train-части (0..test_from_index-1)

    # --- Сценарии будущего ---
    "scenarios": list[dict],        # 5 сценариев (пустой список если n_future=0)
    # каждый сценарий: {"name": str, "color": str, "values": list[float]}

    # --- Индексы разрезов ---
    "test_from_index":   int,       # первый индекс тестового периода
    "future_from_index": int | None,# первый индекс future (None если n_future=0)

    # --- Статистические метрики ---
    "metrics": {
        "mae":  float,  # средняя абсолютная ошибка
        "rmse": float,  # корень из среднеквадратичной ошибки
        "mape": float,  # средняя абсолютная процентная ошибка (%)
    },

    # --- Мета-информация модели ---
    "model_info": {
        "name":        str,       # "ARIMA", "GARCH", "LSTM", "Hybrid", "Ensemble" ...
        "description": str,       # текстовое описание
        "window":      int,       # размер скользящего окна (для нейросетей)
        # для Ensemble — дополнительно:
        "components": list[str],  # ["ARIMA", "LSTM", "ARIMA+LSTM", "ARIMA+GARCH+LSTM"]
        "weights":    dict,       # {"arima": 0.31, "lstm": 0.22, ...}
        "val_rmse":   dict,       # RMSE каждой компоненты на val-выборке
    },
}
```

**Пример реальных размеров** (AAPL 2022-01-01–2023-12-31, 80/20 сплит):
- `dates`: ~503 элемента (402 train + 101 test)
- `predicted`: 402 × None + 101 × float
- `actual`: 503 × float (нет None, т.к. n_future=0)

### Как модели вызываются из API

`project/backend/main.py` — FastAPI-приложение:

```python
POST /api/forecast
Body: ForecastRequest(ticker, start, end, model, window, today)
→ MODEL_RUNNERS[model](ticker, start, data_end, window, n_future)
→ возвращает dict напрямую как JSON
```

```python
MODEL_RUNNERS = {
    "arima": run_arima, "garch": run_garch, "lstm": run_lstm,
    "hybrid": run_hybrid, "arima_lstm": run_hybrid,
    "arima_gru": run_arima_gru, "garch_lstm": run_garch_lstm,
    "triple_hybrid": run_triple_hybrid, "ensemble": run_ensemble,
}
```

---

## 2. ПЛАН ИНТЕГРАЦИИ

### Поток данных

```
run_*(ticker, start, end, window, n_future)
    → model_output: dict          ← signals.py принимает ЭТО

generate_signals(model_output, strategy, ...)
    → signals_output: dict        ← backtest.py принимает ЭТО

run_backtest(signals_output, initial_capital, commission, ...)
    → backtest_result: dict       ← API возвращает ЭТО
```

### signals.py — источник данных

Принимает **dict модели целиком** (`model_output`), а не цены напрямую.

Причины:
1. Из dict легко извлечь `test_from_index` — граница train/test
2. `predicted` уже фильтрован (None = train, float = test)
3. Не нужно повторно загружать данные

Внутри функции извлекаем тестовый период:
```python
i = model_output["test_from_index"]
dates     = model_output["dates"][i:future_from]     # только тест
actual    = model_output["actual"][i:future_from]    # реальные цены
predicted = model_output["predicted"][i:future_from] # прогнозы (все float)
```

### backtest.py — источник данных

Принимает `signals_output` (output `generate_signals`).  
Не знает о модели — работает только с сигналами и реальными ценами.

### Интеграция в API

**Вариант A (рекомендуемый):** Новый эндпоинт `POST /api/backtest`

```
POST /api/backtest
Body: { ticker, start, end, model, window, strategy, commission, slippage, allow_short, initial_capital }
Response: { model_output, signals_output, backtest_result }
```

Плюсы: не ломает существующий `/api/forecast`, явное разделение ответственности.

**Вариант B:** Опциональный параметр `include_signals=true` в `/api/forecast`

Добавляется в ответ ключ `"trading"` с базовыми торговыми метриками.  
Используется для облегчённой интеграции во фронт без нового роута.

В Финальной фазе реализуем оба варианта.

---

## 3. ГРАНИЧНЫЕ СЛУЧАИ

### None в predicted (train-период)
**Норма.** Все run_* функции возвращают `None` для train-части.  
Решение в signals.py: нарезать тестовый период через `test_from_index` и `future_from_index`.  
None никогда не попадают в торговую логику.

### Разная длина predicted и actual
В `garch_lstm` и похожих моделях `predicted` и `actual` теоретически могут иметь разную длину из-за обрезки окна в начале тестового периода (первые `window` точек могут быть без предсказания).  
Решение: в `generate_signals` выравнивать длины через `min(len(actual), len(predicted))`.

### Недостаточно данных для Sharpe
Sharpe ненадёжен при N < 30 торговых дней доходностей.  
Решение в `trading_metrics.py`:
- `n_trades < 5` → добавить флаг `"insufficient_trades": True`  
- `n_trades < 30` → добавить флаг `"low_confidence": True`  
- Сам Sharpe всё равно считается, но пользователь предупреждён

### vol_filter при коротком тестовом периоде
Если тестовых точек меньше `vol_window` (дефолт 20) → `vol_filter` отключается автоматически с `logging.warning`.

### SELL без открытой позиции (allow_short=False)
В `backtest.py` сигнал SELL при `allow_short=False` и отсутствии открытой позиции → исполняется как HOLD.

### Последняя открытая позиция
В конце тестового периода открытая позиция принудительно закрывается по последней доступной цене (без слиппажа, но с комиссией).

---

## 4. ВОПРОСЫ

**Вопрос 1: risk-free rate для Sharpe**  
Для российских акций (MOEX) логичен рублёвый risk-free (ключевая ставка ЦБ ~16%), для USD-тикеров — T-bill (~5%).  
Использовать единый дефолт `risk_free_rate=0.0` (excess return Sharpe) или параметризовать?

**Вопрос 2: торговля future-прогнозом**  
Сигналы генерировать только на тестовом периоде (есть реальные `actual` для PnL) или также строить "сигнальный план" на future-периоде (только предсказательно, без PnL)?

**Вопрос 3: реинвестирование**  
В `backtest.py` — реинвестировать прибыль (equity растёт, следующая сделка использует весь счёт) или торговать фиксированным размером позиции (`initial_capital * position_size` всегда)?

---

## 5. ВЫВОДЫ — Phase 3 (compare_models.py)

### Условия эксперимента
- Тикер: AAPL, период: 2022-01-01 → 2023-12-31 (501 торговый день)
- Тест: 20% = 101 точка (август–декабрь 2023)
- Стратегия сигналов: `momentum`, комиссия 0.1%, slippage 0.05%
- Начальный капитал: 10 000, `reinvest=True`

### Сравнительная таблица

| Модель | RMSE | Sharpe | MaxDD | WinRate | ProfFact | N_trades | TotalRet |
|---|---|---|---|---|---|---|---|
| **ARIMA+GRU** | 2.18 | **1.754** | -8.63% | 50.0% | 4.893 | 8 | +10.23% |
| ARIMA | **2.07** | 1.570 | -8.63% | 50.0% | 3.488 | 8 | +9.08% |
| GARCH(1,1) | **2.07** | 1.570 | -8.63% | 50.0% | 3.488 | 8 | +9.08% |
| ARIMA+LSTM | 2.21 | 1.570 | -8.63% | 50.0% | 3.488 | 8 | +9.08% |
| ARIMA+GARCH+LSTM | 2.38 | 1.570 | -8.63% | 50.0% | 3.488 | 8 | +9.08% |
| GARCH+LSTM | 5.51 | -1.976 | -14.78% | 33.3% | 0.302 | 3! | -10.07% |
| LSTM | 5.83 | -2.334 | -14.89% | 25.0% | 0.325 | 4! | -11.30% |
| Ансамбль | — | ERROR | — | — | — | — | — |
| **Buy & Hold** | — | 1.015 | -12.02% | — | — | 1 | +7.04% |

### Ключевые наблюдения

**1. Лучший по Sharpe ≠ лучший по RMSE**
- Лучший по Sharpe: **ARIMA+GRU** (1.754)
- Лучший по RMSE: **ARIMA = GARCH(1,1)** (2.07 — одинаково)
- ARIMA+GRU имеет RMSE 2.18 (хуже!), но лучший торговый результат.
- Вывод: **минимизация статистической ошибки прогноза ≠ максимизация торговой доходности**.

**2. Всё ARIMA-семейство генерирует одинаковые сигналы**
- ARIMA, GARCH, ARIMA+LSTM, ARIMA+GARCH+LSTM — одинаковый Sharpe (1.570), MaxDD, TotalRet.
- Причина: стратегия `momentum` смотрит на динамику predicted; у всех ARIMA-моделей
  walk-forward предсказания очень похожи (приближение случайного блуждания).
- ARIMA+GRU выделяется — GRU добавляет другую инерцию к остаткам.

**3. Standalone deep learning — хуже Buy & Hold**
- LSTM (Sharpe -2.334) и GARCH+LSTM (Sharpe -1.976) хуже B&H (Sharpe 1.015).
- Мало сделок (3–4, флаги !), метрики статистически ненадёжны.

**4. Лучшая модель бьёт Buy & Hold**
- ARIMA+GRU: Sharpe 1.754 vs B&H 1.015 (+73% по Sharpe)
- ARIMA+GRU: MaxDD -8.63% vs B&H -12.02% (просадка меньше на 28%)
- ARIMA+GRU: TotalRet +10.23% vs B&H +7.04%

**5. Pre-existing баг в Ансамбле**
- Ансамбль падает: "cannot reshape array of size 40 into shape (1,60,1)"
- Причина: `n_val=40` (10% от train), LSTM ожидает окно `window=60`.
  `hybrid_val_residuals` содержит 40 элементов — меньше размера окна.
- Баг в `ensemble_model.py`, не в торговом слое. Требует отдельного исправления.

### Вывод для диплома
На данном периоде (AAPL 2022–2023) ARIMA+GRU — оптимальная модель по
risk/reward. Выборка мала (8 сделок) — для статистически значимых выводов
нужно тестирование на более длинных периодах и разных тикерах.

---

## 6. ЧТО СДЕЛАНО — финальный список

### Новые файлы

| Файл | Назначение |
|---|---|
| `project/backend/services/signals.py` | Генерация сигналов BUY/SELL/HOLD: 3 стратегии × 3 метода position sizing, vol_filter, generate_future_signals |
| `project/backend/services/backtest.py` | Честный бэктест с комиссиями, слиппеджем, шортами, reinvest режимами |
| `project/backend/services/trading_metrics.py` | Sharpe, MaxDrawdown, Calmar, WinRate, ProfitFactor, compute_trading_metrics |
| `scripts/test_signals.py` | Smoke-test: ARIMA → 3 стратегии, distribution + таблица |
| `scripts/test_backtest.py` | Smoke-test: ARIMA → momentum → бэктест, ASCII equity curve, сравнение стратегий |
| `scripts/compare_models.py` | Сравнение 8 моделей: CLI --ticker/--start/--end/--strategy/--commission/--risk-free-rate, таблица + JSON |
| `results/comparison_AAPL_2026-04-20.json` | Первый прогон результатов |
| `TRADING_LAYER_NOTES.md` | Этот документ |

### Изменённые файлы

| Файл | Что изменено |
|---|---|
| `project/backend/main.py` | +2 импорта, +`BacktestRequest` схема, +поле `include_signals` в `ForecastRequest`, расширен хендлер `POST /api/forecast`, добавлен `POST /api/backtest` |

### Новые/изменённые эндпоинты

| Метод | URL | Что делает |
|---|---|---|
| `POST` | `/api/backtest` | **Новый.** Полный цикл: модель → сигналы → бэктест. Тело: `BacktestRequest`. Ответ: `{forecast, signals, backtest}` |
| `POST` | `/api/forecast` | **Расширен.** Добавлен опциональный параметр `include_signals: bool = false`. При `true` добавляет `signals` и `trading_metrics` (Sharpe, MaxDD, WinRate, N_trades) |

### Коды ошибок `/api/backtest`

| Ситуация | HTTP |
|---|---|
| Неизвестная модель | 400 + `{"available": [...]}` |
| Неизвестная стратегия | 400 + `{"available": [...]}` |
| Ошибка модели (нет TF, мало данных) | 422 + `{"error": "Model failed", "detail": "..."}` |
| Ошибка торгового слоя | 422 + `{"error": "Trading layer failed", "detail": "..."}` |
| 0 сделок после бэктеста | 200 + поле `"warning"` в ответе |

### Известные ограничения

1. **Баг ансамбля** (`ensemble_model.py`): при `window=60` и коротком датасете `n_val < window` — ошибка reshape. Нужен отдельный фикс в `ensemble_model.py` (не в торговом слое).

2. **`threshold` + ARIMA = 0 сделок**: ARIMA walk-forward возвращает `predicted[i] ≈ actual[i-1]`, ожидаемая доходность ≈ 0, порог 0.3% не преодолевается. Решение: использовать `momentum` или `mean_reversion`. В `include_signals` зашито `strategy="momentum"` именно по этой причине.

3. **Малая выборка сделок**: тестовый период ~100 точек даёт 3–8 сделок. Sharpe/Calmar ненадёжны (флаг `low_confidence`). Для статистически значимых выводов нужны периоды 3–5 лет.

4. **Шорты не тестировались на реальных данных**: логика реализована (`allow_short=True`), но из-за `allow_short=False` по умолчанию в тестах не прогонялась. Требует отдельной валидации.

5. **Нет интеграции сигналов с фронтом**: API готов, фронт (`project/frontend/`) не менялся по условию задачи.
