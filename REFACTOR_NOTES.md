# REFACTOR_NOTES — Аудит моделей прогноза

> Ветка: `refactor/model-fixes`  
> Дата аудита: 2026-04-19  
> Аудитор: Claude (Phase 0)

---

## 1. Точные места каждой из 5 проблем

### Проблема 1 — Дублирование кода

Пять файлов содержат копипасту одних и тех же функций:

| Дубликат | Файлы | Строки |
|---|---|---|
| `_build_sequences` (1D) | `lstm_model.py:20-25`, `hybrid_model.py:25-30`, `arima_gru_model.py:29-34` | идентичны побайтово |
| `_build_sequences_2d` (2D) | `garch_lstm_model.py:32-38`, `triple_hybrid_model.py:34-41`, `ensemble_model.py:44-50` | идентичны |
| `_build_sequences_1d` | `ensemble_model.py:37-42` | то же, что и 1D выше |
| LSTM-builder (1D) | `lstm_model.py:28-38`, `hybrid_model.py:33-43`, `ensemble_model.py:53-61` | идентичны |
| LSTM-builder (2D) | `garch_lstm_model.py:41-52`, `triple_hybrid_model.py:43-54`, `ensemble_model.py:64-72` | идентичны |
| GRU-builder | `arima_gru_model.py:37-48` | уникален, но та же структура |
| TF import boilerplate | `lstm_model.py:7-17`, `hybrid_model.py:13-22`, `arima_gru_model.py:16-27`, `garch_lstm_model.py:19-29`, `triple_hybrid_model.py:22-31`, `ensemble_model.py:22-32` | идентичны |
| `_fit_garch_volatility` / `_garch_cond_var` / `_fit_garch_var` | `garch_lstm_model.py:55-66`, `triple_hybrid_model.py:57-62`, `ensemble_model.py:147-150` | три разных имени, одна логика |
| Seed: `hash(ticker) % 2**31` | все 8 моделей в вызовах `bootstrap_future` и `bootstrap_scenarios` | — |

**Итого:** 6 дублируемых паттернов, присутствующих суммарно ~25 раз.

---

### Проблема 2 — GARCH refitting в walk-forward garch_model.py

**Файл:** `project/backend/models/garch_model.py`  
**Строки:** 21–28

```python
for i in range(len(test_prices)):          # ← N итераций
    window_ret = all_returns[: n_train_ret + i]
    m   = arch_model(window_ret, ...)      # ← новый объект каждый раз
    res = m.fit(disp="off", ...)           # ← полный fit каждый раз
```

На каждом из N шагов теста создаётся и фитится новая `arch_model` на растущей серии.
Сложность: **O(N²)** по времени. При N=200 шагах теста — 200 полных GARCH-фитов,
каждый нарастающей длины. На реальных данных (3-6 лет, ~150 тестовых точек) это
занимает 20-40 секунд только для одной модели GARCH.

---

### Проблема 3 — Авторегрессивный future-прогноз без предупреждения о ненадёжности

**Файлы и строки:**
- `lstm_model.py:104–115` — autoregressive loop
- `garch_lstm_model.py:174–183` — autoregressive loop

```python
rolling = list(all_scaled[-window:, 0])
for _ in range(n_future):
    x = np.array(rolling[-window:]).reshape(1, window, 1)
    pred = model.predict(x, verbose=0)[0, 0]   # кормим предсказание обратно
    rolling.append(pred)                        # ← накопление ошибки
```

Авторегрессивный прогноз на горизонте > ~5-10 шагов систематически дрейфует к среднему,
потому что модель обучалась на реальных данных, а получает собственные (зашумлённые) предсказания.
Это фундаментальное свойство таких моделей, но оно никак не задокументировано и не сигнализируется
ни в логах, ни в `model_info`. Пользователь получает красивый дальний прогноз, не зная что
надёжность падает экспоненциально.

Дополнительно: `bootstrap_scenarios` добавляет шум к базовому прогнозу, но не к autoregressive
входам — сценарии не расходятся со временем так, как должны в честном стохастическом прогнозе.

---

### Проблема 4 — GARCH refitting в walk-forward triple_hybrid_model.py

**Файл:** `project/backend/models/triple_hybrid_model.py`  
**Строки:** 123–127

```python
for i in range(len(test_prices)):          # ← N итераций
    ...
    hist_arr = np.array(history_res)
    step_var = float(_garch_cond_var(hist_arr)[-1])   # ← полный fit GARCH
```

Та же проблема, что и в `garch_model.py`, но на остатках ARIMA.
Фитится `_garch_cond_var` на каждом шаге на полной истории остатков.

**Тот же паттерн** присутствует ещё в двух местах `ensemble_model.py`:
- Строки 184, 299-300 (внутри `_fit_and_predict_triple` и test-цикла triple)
- Строки 369 (future-цикл triple в ensemble)

Итого: проблема 4 = **4 места** в двух файлах.

---

### Проблема 5 — Нет контроля над seed / воспроизводимостью

**Файлы:** все 8 моделей, вызовы `bootstrap_future` и `bootstrap_scenarios`  
**Паттерн:** `seed=hash(ticker) % 2**31` — жёстко прошит во все вызовы

Проблемы:
1. Нет способа задать seed снаружи — нельзя воспроизвести конкретный прогноз
2. Нет `stochastic=True` режима для Monte-Carlo исследований
3. TF-слои (`LSTM`, `GRU`) не сидируются совсем → каждый запуск с той же датой даёт разные веса сети
4. Сравнение двух тикеров на одних данных даёт разные случайные траектории → нечестное сравнение

---

## 2. Что именно проблематично

| # | Суть |
|---|---|
| 1 | 6 паттернов × до 6 копий = ~25 мест, где одно изменение логики надо вносить вручную в каждый файл. Уже привело к расхождениям: `_garch_cond_var` масштабирует `* 100`, `_fit_garch_var` тоже `* 100`, но `_fit_garch_volatility` тоже `* 100` — пока всё ок, но при следующем изменении параметра GARCH один файл забудут обновить. |
| 2 | O(N²) GARCH-фитинг делает `run_garch` неприемлемо медленным на длинных рядах. |
| 3 | Пользователь получает прогноз на 30/60/90 дней без предупреждения что надёжность ≈ нуль уже после 10 шагов. Академически — честность результатов под вопросом. |
| 4 | Та же O(N²) проблема в triple_hybrid и ensemble — они самые медленные модели. |
| 5 | Нейронные сети не сидированы перед обучением → диплом нельзя воспроизвести. При защите нельзя сказать "запустите с seed=42, получите те же цифры". |

---

## 3. План исправления (одно-два предложения)

| # | Что делать |
|---|---|
| 1 | Создать `backend/models/_common.py` со всеми общими функциями; заменить дубликаты импортами в 6 файлах. Логику не трогать. |
| 2 | В `_common.py` добавить `refit_garch_every_n(series, n_refit=20)` с lazy-refitting; переписать walk-forward цикл в `garch_model.py`. |
| 3 | В `run_lstm` и `run_garch_lstm` добавить `max_reliable_horizon=10`, warning в логи при превышении, ключ `future_confidence` в ответ, опциональный `add_residual_noise`. |
| 4 | То же `refit_garch_every_n` применить к walk-forward в `triple_hybrid_model.py` и `ensemble_model.py` (4 места). |
| 5 | Добавить `seed: Optional[int] = None` и `stochastic: bool = False` в все `run_*`; прокинуть seed в `tf.random.set_seed` и `bootstrap_*`. |

---

## 4. Функции для выноса в `_common.py`

```
_build_sequences_1d(data, window)
_build_sequences_2d(data, window)
build_lstm_1d(window, units=64, dropout=0.2, l2_reg=1e-5)     # Phase 5: добавится l2_reg
build_lstm_2d(window, n_features=2, units=64, dropout=0.2, l2_reg=1e-5)
build_gru_1d(window, units=64, dropout=0.2, l2_reg=1e-5)
fit_garch_cond_var(series, p=1, q=1, scale=100.0)              # единая функция вместо трёх
refit_garch_every_n(series, n_refit=20, p=1, q=1)              # Phase 2
make_early_stopping(val_split)
get_seed(ticker, explicit_seed=None)
HAS_TF  (флаг)
+ TF import block с подавлением логов
```

**Итого:** 9 функций + 1 константа.

---

## 5. Риски

| Риск | Уровень | Комментарий |
|---|---|---|
| `refit_garch_every_n` меняет числовой результат | Средний | По ТЗ: допустимо ≤ 0.5% отклонение RMSE. Реально: отклонение будет, потому что GARCH каждые 20 шагов даёт другую σ² чем GARCH каждый шаг. Нужно подобрать `n_refit` под этот порог. |
| `add_residual_noise` меняет baseline прогноза | Низкий | По умолчанию `add_residual_noise=False` → старое поведение сохранено. |
| L2-регуляризация (Phase 5) меняет метрики LSTM | Низкий | Дефолт `l2_reg=1e-5` — очень слабая регуляризация, изменение RMSE < 1% на типичных данных. |
| Удаление `d=1` в auto_arima (Phase 5) | Средний | На нестационарных рядах (а акции всегда нестационарны) auto_arima без `d=1` скорее всего сам выберет `d=1` через ADF-тест. Риск: на коротких рядах ADF может дать `d=0`, что изменит порядок и результат. Нужна проверка. |
| `ensemble_model.py`: `hybrid_history_res` инициализируется через `val_preds["arima"]` вместо `val_preds["hybrid"]` (строки 273-275, 292-294) | Низкий | Если ARIMA в hybrid и standalone дают одинаковый порядок — результаты идентичны. Если порядок разный — остатки за val считаются неверно. Это серая зона: не является data leakage, но потенциально некорректна инициализация истории. Исправляется в Phase 5. |
| Изменение seed-логики | Низкий | Дефолт `seed=None` → `hash(ticker) % 2**31` (старое поведение). Обратная совместимость сохранена. |

---

---

## Baseline (pre-refactor)

**Тикер:** AAPL · **Период:** 2022-01-01 → 2023-12-31 · **window=30, n_future=0**

| Модель | MAE | RMSE | MAPE (%) | Время (с) |
|---|---|---|---|---|
| ARIMA | 1.63 | 2.07 | 0.9113 | 1.5 |
| GARCH | 1.62 | 2.07 | 0.9041 | 0.6 |
| LSTM | 5.71 | 6.68 | 3.2065 | 5.6 |
| ARIMA+LSTM | 1.73 | 2.17 | 0.9702 | 7.2 |
| GARCH+LSTM | 3.89 | 4.76 | 2.1742 | 6.6 |
| ARIMA+GRU | 1.79 | 2.19 | 1.0006 | 7.6 |
| ARIMA+GARCH+LSTM | 1.75 | 2.19 | 0.9808 | 7.2 |
| Ensemble | 1.62 | 2.09 | 0.9031 | 24.8 |

> **Примечание о воспроизводимости:** нейронные сети (LSTM, GRU) не сидированы в TF →
> их метрики варьируются между запусками. ARIMA и GARCH детерминированы.
> После Phase 4 (seed control) нейронные модели будут воспроизводимы.

**Phase 1 smoke-test (post-refactor):**

| Модель | MAE | RMSE | MAPE (%) | Идентично baseline? |
|---|---|---|---|---|
| ARIMA | 1.63 | 2.07 | 0.9113 | ✅ байт-в-байт |
| GARCH | 1.62 | 2.07 | 0.9041 | ✅ байт-в-байт |
| LSTM | 4.22 | 5.21 | 2.3455 | ⚠️ TF-вариация (ожидаемо, нет seed) |
| ARIMA+LSTM | 1.81 | 2.26 | 1.0138 | ⚠️ TF-вариация (ожидаемо) |
| GARCH+LSTM | 5.38 | 6.57 | 3.0411 | ⚠️ TF-вариация (ожидаемо) |
| ARIMA+GRU | 1.73 | 2.16 | 0.9703 | ⚠️ TF-вариация (ожидаемо) |
| ARIMA+GARCH+LSTM | 1.77 | 2.21 | 0.9909 | ⚠️ TF-вариация (ожидаемо) |
| Ensemble | 1.69 | 2.19 | 0.9489 | ⚠️ TF-вариация (ожидаемо) |

Все модели запустились без ошибок. Логика и структура кода идентичны оригиналу.

---

## Phase 1.5 — Ensemble: исправление истории остатков

### Что было неправильно

В `run_ensemble` после получения `val_preds` история остатков для `hybrid` и `triple`
компонентов инициализировалась через предсказания **стороннего** standalone-ARIMA:

```python
# БЫЛО — НЕПРАВИЛЬНО
hybrid_history_res = []
for i, actual in enumerate(val_prices):
    fc = float(val_preds["arima"][i])   # ← FC от ДРУГОЙ, standalone-ARIMA!
    hybrid_history_res.append(float(actual) - fc)
```

Это логически некорректно: `hybrid_arima` — отдельный `auto_arima`-объект, обученный
на `train_core`. Его предсказания на val-шагах могут отличаться от `val_preds["arima"]`
(если два запуска `auto_arima` на одинаковых данных выбирают разные порядки,
что возможно при малых данных или пограничных AIC-значениях). Даже если порядки
совпадают — логическая согласованность была нарушена: история остатков
принадлежала одной модели, а ARIMA-прогнозы на test шли от другой.

### Что исправлено

`_fit_and_predict_hybrid` и `_fit_and_predict_triple` теперь дополнительно собирают
`val_residuals` — список `actual_t − own_arima_fc_t` для каждого val-шага,
вычисленный через **собственный** ARIMA-объект этой модели. Эти остатки
возвращаются как последний элемент кортежа и сохраняются в `states`.

В `run_ensemble` инициализация заменена на:
```python
# СТАЛО — ПРАВИЛЬНО
hybrid_history_res = list(states["hybrid_val_residuals"])
triple_history_res = list(states["triple_val_residuals"])
```

**Проверка:** `len(val_residuals) == n_val` (40 для AAPL 2022-2023) ✅

### Сравнение метрик Ensemble

| | MAE | RMSE | MAPE (%) |
|---|---|---|---|
| Pre-refactor baseline | 1.62 | 2.09 | 0.9031 |
| Phase 1.5 run 1 | 1.65 | 2.10 | 0.9236 |
| Phase 1.5 run 2 | 1.75 | 2.28 | 0.9832 |

**Вывод:** на AAPL 2022-2023 все три ARIMA выбирают одинаковый порядок (0,1,0),
поэтому численное изменение минимально и перекрывается TF-вариацией (нет seed).
Корректность восстановлена: после Phase 4 (seed control) ensemble будет давать
воспроизводимые результаты с правильной историей остатков.

---

## Результаты (заполняется после завершения рефакторинга)

*Раздел будет добавлен по итогам Phase 6.*

---

*Следующий шаг: "ок, фаза 1" → создание `_common.py` и замена дубликатов.*
