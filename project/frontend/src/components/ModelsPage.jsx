// ModelsPage.jsx — Подробная страница всех 8 моделей
import { useState } from 'react'
import {
  IconTrendLine, IconVolatility, IconNeuralNet,
  IconBolt, IconMerge, IconWave, IconTriple, IconStar,
  IconCheck, IconCross,
} from './Icons'

const MODELS = [
  {
    id: 'arima',
    icon: <IconTrendLine size={22}/>,
    name: 'ARIMA',
    full: 'AutoRegressive Integrated Moving Average',
    color: '#94a3b8',
    mape: '1.24%',
    speed: 'Быстро',
    speedColor: 'text-green-400',
    complexity: 'Базовая',
    tags: ['Трендовые рынки', 'Стабильные активы', 'Классика'],
    description: `ARIMA — фундаментальная статистическая модель для анализа временных рядов, разработанная Боксом и Дженкинсом в 1970 году. Модель состоит из трёх компонент: авторегрессионной (AR), интегрирующей (I) и скользящего среднего (MA).

AR-компонента описывает зависимость текущего значения от предыдущих наблюдений. I-компонента приводит ряд к стационарности через взятие разностей. MA-компонента моделирует зависимость от ошибок прогноза в прошлом.

Параметры (p, d, q) подбираются автоматически через минимизацию информационного критерия AIC.`,
    strengths: [
      'Интерпретируемость — можно объяснить каждый компонент',
      'Работает на малых датасетах (от 1 года)',
      'Очень быстрый расчёт — секунды',
      'Стандарт индустрии с десятилетиями применения',
    ],
    weaknesses: [
      'Только линейные зависимости',
      'Не учитывает кластеры волатильности',
      'Плохо справляется с резкими разворотами',
    ],
    bestFor: 'Стабильные тренды: фондовые индексы, крупные голубые фишки.',
    notFor: 'Острые новостные реакции, сырьё с высокой волатильностью.',
    assets: ['S&P 500', 'Dow Jones', 'Сбербанк', 'Норникель'],
    refs: [
      {
        authors: 'Box, G. E. P., Jenkins, G. M.',
        year: 1970,
        title: 'Time Series Analysis: Forecasting and Control',
        venue: 'Holden-Day',
        url: 'https://www.wiley.com/en-us/Time+Series+Analysis%3A+Forecasting+and+Control%2C+5th+Edition-p-9781118675021',
      },
      {
        authors: 'Hyndman, R. J., Athanasopoulos, G.',
        year: 2021,
        title: 'Forecasting: Principles and Practice (3rd ed.)',
        venue: 'OTexts',
        url: 'https://otexts.com/fpp3/',
      },
    ],
  },
  {
    id: 'garch',
    icon: <IconVolatility size={22}/>,
    name: 'GARCH',
    full: 'Generalized AutoRegressive Conditional Heteroskedasticity',
    color: '#64748b',
    mape: '1.15%',
    speed: 'Быстро',
    speedColor: 'text-green-400',
    complexity: 'Средняя',
    tags: ['Волатильность', 'Риск-менеджмент', 'Сырьё'],
    description: `GARCH — модель условной гетероскедастичности, разработанная Болерслевом в 1986 году как обобщение ARCH-модели Энгла. Ключевая идея: волатильность финансовых рядов не постоянна — она кластеризуется (периоды высокой волатильности сменяют периоды низкой).

GARCH(p,q) моделирует условную дисперсию σ²ₜ как функцию прошлых квадратов ошибок и прошлых дисперсий. Это позволяет предсказывать будущий риск даже без точного прогноза направления цены.

В AlphaSignal GARCH используется для оценки "коридора неопределённости" вокруг прогнозной линии.`,
    strengths: [
      'Точно передаёт кластеры волатильности',
      'Лучший инструмент для риск-менеджмента',
      'Устойчив к выбросам',
      'Базовый стандарт в финансовом риск-анализе',
    ],
    weaknesses: [
      'Не даёт прямой прогноз цены — только волатильности',
      'Хуже на тихих трендовых рынках',
      'Требует ARCH-эффекта в данных',
    ],
    bestFor: 'Активы с переменной волатильностью: нефть, газ, валюты.',
    notFor: 'Стабильные рынки без кластеров волатильности.',
    assets: ['Brent', 'WTI', 'Газ (NG=F)', 'Газпром', 'Татнефть'],
    refs: [
      {
        authors: 'Bollerslev, T.',
        year: 1986,
        title: 'Generalized Autoregressive Conditional Heteroskedasticity',
        venue: 'Journal of Econometrics, 31(3), 307–327',
        url: 'https://doi.org/10.1016/0304-4076(86)90063-1',
      },
      {
        authors: 'Engle, R. F.',
        year: 1982,
        title: 'Autoregressive Conditional Heteroscedasticity with Estimates of the Variance of United Kingdom Inflation',
        venue: 'Econometrica, 50(4), 987–1007',
        url: 'https://doi.org/10.2307/1912773',
      },
    ],
  },
  {
    id: 'lstm',
    icon: <IconNeuralNet size={22}/>,
    name: 'LSTM',
    full: 'Long Short-Term Memory',
    color: '#60a5fa',
    mape: '1.05%',
    speed: 'Среднее',
    speedColor: 'text-amber-400',
    complexity: 'Высокая',
    tags: ['Нейросеть', 'Нелинейность', 'Технологии'],
    description: `LSTM — рекуррентная нейронная сеть с механизмом избирательной памяти, предложенная Хохрайтером и Шмидхубером в 1997 году. Решает проблему затухающего градиента в классических RNN, позволяя сохранять важную информацию на длинных горизонтах.

Каждая ячейка LSTM имеет три вентиля: forget (что забыть), input (что запомнить) и output (что выдать). Это позволяет сети самой решать, какие паттерны из далёкого прошлого релевантны для текущего прогноза.

В финансовом контексте LSTM особенно эффективен для активов с долгосрочными зависимостями и нелинейными режимами.`,
    strengths: [
      'Улавливает сложные нелинейные паттерны',
      'Хранит долгосрочные зависимости (месяцы)',
      'Адаптируется к смене рыночных режимов',
      'Лучший среди чистых нейросетей',
    ],
    weaknesses: [
      'Требует больших данных (2+ лет)',
      '"Чёрный ящик" — сложно интерпретировать',
      'Дольше обучается, чем статистические модели',
    ],
    bestFor: 'Нелинейные паттерны: технологические акции, NASDAQ, активы с momentum-эффектом.',
    notFor: 'Малые датасеты (менее 1 года). Чисто зашумлённые ряды.',
    assets: ['NVIDIA', 'Apple', 'Tesla', 'NASDAQ', 'Яндекс'],
    refs: [
      {
        authors: 'Hochreiter, S., Schmidhuber, J.',
        year: 1997,
        title: 'Long Short-Term Memory',
        venue: 'Neural Computation, 9(8), 1735–1780',
        url: 'https://doi.org/10.1162/neco.1997.9.8.1735',
      },
      {
        authors: 'Fischer, T., Krauss, C.',
        year: 2018,
        title: 'Deep learning with long short-term memory networks for financial market predictions',
        venue: 'European Journal of Operational Research, 270(2), 654–669',
        url: 'https://doi.org/10.1016/j.ejor.2017.11.054',
      },
    ],
  },
  {
    id: 'arima_lstm',
    icon: <IconBolt size={22}/>,
    name: 'ARIMA + LSTM',
    full: 'Hybrid ARIMA + Long Short-Term Memory',
    color: '#818cf8',
    mape: '0.98%',
    speed: 'Среднее',
    speedColor: 'text-amber-400',
    complexity: 'Высокая',
    tags: ['Гибрид', 'Индексы', 'Топ-3'],
    description: `Гибридная модель на основе подхода Чжана (2003). Идея: ARIMA извлекает линейную компоненту временного ряда, а LSTM обучается на остатках — нелинейной части, которую классика не способна уловить.

Этапы: 1) ARIMA строит прогноз и вычисляет остатки; 2) LSTM обучается предсказывать эти остатки; 3) итоговый прогноз = ARIMA + LSTM.

Такой подход "разделяй и властвуй" позволяет каждой модели работать в своей области компетенции, не мешая другой.`,
    strengths: [
      'Баланс интерпретируемости и мощи нейросети',
      'Стабильный топ-3 по MAPE на большинстве активов',
      'Хорошо обобщает на новых данных',
      'Меньше переобучение, чем у чистого LSTM',
    ],
    weaknesses: [
      'Два этапа обучения усложняют пайплайн',
      'Сложнее в настройке гиперпараметров',
    ],
    bestFor: 'Смешанные рынки с трендом и нелинейностью: фондовые индексы, голубые фишки.',
    notFor: 'Чисто хаотичные ряды без линейной компоненты.',
    assets: ['S&P 500', 'Сбербанк', 'Лукойл', 'Яндекс'],
    refs: [
      {
        authors: 'Zhang, G. P.',
        year: 2003,
        title: 'Time series forecasting using a hybrid ARIMA and neural network model',
        venue: 'Neurocomputing, 50, 159–175',
        url: 'https://doi.org/10.1016/S0925-2312(01)00702-0',
      },
      {
        authors: 'Khashei, M., Bijari, M.',
        year: 2011,
        title: 'A novel hybridization of artificial neural networks and ARIMA models for time series forecasting',
        venue: 'Applied Soft Computing, 11(2), 2664–2675',
        url: 'https://doi.org/10.1016/j.asoc.2010.10.015',
      },
    ],
  },
  {
    id: 'arima_gru',
    icon: <IconMerge size={22}/>,
    name: 'ARIMA + GRU',
    full: 'Hybrid ARIMA + Gated Recurrent Unit',
    color: '#a78bfa',
    mape: '1.02%',
    speed: 'Среднее',
    speedColor: 'text-amber-400',
    complexity: 'Высокая',
    tags: ['Гибрид', 'Эффективность', 'MOEX'],
    description: `Аналог ARIMA+LSTM, но нейросетевая компонента заменена на GRU (Gated Recurrent Unit) — упрощённую рекуррентную архитектуру, предложенную Чо и соавторами в 2014 году.

GRU имеет два вентиля (reset и update) вместо трёх в LSTM, что даёт меньше параметров при сопоставимой производительности. На многих финансовых задачах GRU сравнима с LSTM, но быстрее обучается.

Схема такая же: ARIMA → остатки → GRU → суммирование прогнозов.`,
    strengths: [
      'Быстрее ARIMA+LSTM при схожей точности',
      'Меньше параметров — меньше риск переобучения',
      'Хорош на данных среднего объёма (1–3 года)',
    ],
    weaknesses: [
      'Чуть менее мощный на очень длинных зависимостях',
      'Те же сложности пайплайна что и ARIMA+LSTM',
    ],
    bestFor: 'Те же задачи что ARIMA+LSTM, когда важна скорость.',
    notFor: 'Очень долгосрочные зависимости (>5 лет), где LSTM превосходит GRU.',
    assets: ['Лукойл', 'Роснефть', 'Норникель', 'МТС'],
    refs: [
      {
        authors: 'Cho, K., et al.',
        year: 2014,
        title: 'Learning Phrase Representations using RNN Encoder-Decoder for Statistical Machine Translation',
        venue: 'arXiv:1406.1078',
        url: 'https://arxiv.org/abs/1406.1078',
      },
      {
        authors: 'Chung, J., et al.',
        year: 2014,
        title: 'Empirical Evaluation of Gated Recurrent Neural Networks on Sequence Modeling',
        venue: 'arXiv:1412.3555',
        url: 'https://arxiv.org/abs/1412.3555',
      },
    ],
  },
  {
    id: 'garch_lstm',
    icon: <IconWave size={22}/>,
    name: 'GARCH + LSTM',
    full: 'Volatility-Aware GARCH + Long Short-Term Memory',
    color: '#c084fc',
    mape: '0.95%',
    speed: 'Среднее',
    speedColor: 'text-amber-400',
    complexity: 'Высокая',
    tags: ['Волатильность', 'Нейросеть', 'Сырьё'],
    description: `Гибридная модель, где GARCH не просто анализирует волатильность сам по себе, а её предсказания встраиваются как дополнительный признак в LSTM. Это позволяет нейросети явно "знать" о текущем уровне риска.

Схема: 1) GARCH оценивает условную дисперсию; 2) предсказанная волатильность добавляется к ценовому ряду как признак; 3) LSTM прогнозирует цену с учётом этой информации.

Такой подход особенно эффективен на сырьевых рынках, где волатильность и направление цены тесно взаимосвязаны.`,
    strengths: [
      'Объединяет риск-моделирование и нелинейность',
      'Лучший для сырьевых и волатильных активов',
      'Устойчивее к ценовым скачкам',
    ],
    weaknesses: [
      'Двухэтапный пайплайн сложнее настраивать',
      'Чувствителен к выбору окна GARCH',
    ],
    bestFor: 'Высоковолатильные активы: нефть, газ, акции с новостными скачками.',
    notFor: 'Стабильные активы без волатильных кластеров.',
    assets: ['Brent', 'WTI', 'Газ', 'Сургутнефтегаз', 'Роснефть'],
    refs: [
      {
        authors: 'Bauwens, L., Laurent, S., Rombouts, J.',
        year: 2006,
        title: 'Multivariate GARCH models: A survey',
        venue: 'Journal of Applied Econometrics, 21(1), 79–109',
        url: 'https://doi.org/10.1002/jae.842',
      },
      {
        authors: 'Shen, G., et al.',
        year: 2021,
        title: 'Stock market volatility forecasting using GARCH-LSTM hybrid model',
        venue: 'Expert Systems with Applications',
        url: 'https://www.sciencedirect.com/science/article/pii/S0957417421002694',
      },
    ],
  },
  {
    id: 'triple',
    icon: <IconTriple size={22}/>,
    name: 'Triple Hybrid',
    full: 'ARIMA + GARCH + LSTM',
    color: '#f472b6',
    mape: '0.87%',
    speed: 'Медленно',
    speedColor: 'text-red-400',
    complexity: 'Очень высокая',
    tags: ['Комплексный', 'MOEX', 'Топ-2'],
    description: `Трёхкомпонентный гибрид объединяет сильные стороны всех предшественников: линейный тренд (ARIMA), волатильность (GARCH) и нелинейные паттерны (LSTM) — в единой архитектуре.

Схема: 1) ARIMA строит базовый прогноз; 2) GARCH оценивает волатильность остатков; 3) LSTM прогнозирует нелинейную компоненту с учётом волатильности как признака; 4) результаты взвешенно суммируются.

Это самая комплексная одиночная модель в платформе — фактически ансамбль внутри одной архитектуры.`,
    strengths: [
      'Охватывает линейное, волатильное и нелинейное',
      'Топ-2 по точности после Ensemble',
      'Робастный на разных режимах рынка',
    ],
    weaknesses: [
      'Самая медленная одиночная модель',
      'Много гиперпараметров',
      'Риск переобучения на малых датасетах',
    ],
    bestFor: 'Сложные рынки со множеством режимов: российские акции, развивающиеся рынки.',
    notFor: 'Быстрый прогноз в реальном времени. Малые данные (<2 лет).',
    assets: ['Газпром', 'Татнефть', 'Магнит', 'ВТБ', 'Новатэк'],
    refs: [
      {
        authors: 'Adebiyi, A. A., Adewumi, A. O., Ayo, C. K.',
        year: 2014,
        title: 'Comparison of ARIMA and Artificial Neural Networks Models for Stock Price Prediction',
        venue: 'Journal of Applied Mathematics',
        url: 'https://doi.org/10.1155/2014/614342',
      },
      {
        authors: 'Shumway, R. H., Stoffer, D. S.',
        year: 2017,
        title: 'Time Series Analysis and Its Applications (4th ed.)',
        venue: 'Springer',
        url: 'https://doi.org/10.1007/978-3-319-52452-8',
      },
    ],
  },
  {
    id: 'ensemble',
    icon: <IconStar size={22}/>,
    name: 'Ensemble',
    full: 'Weighted Ensemble of All Models',
    color: '#f59e0b',
    mape: '0.78%',
    speed: 'Медленно',
    speedColor: 'text-red-400',
    complexity: 'Максимальная',
    tags: ['Лучший MAPE', 'Универсальный', 'Финальный'],
    description: `Ансамблевая модель запускает все 7 моделей и строит взвешенное среднее их предсказаний. Веса подбираются по обратной ошибке на валидационной выборке: более точная модель получает больший вес.

Теоретическое обоснование: при условии независимости ошибок моделей, ансамбль снижает дисперсию предсказания без увеличения смещения. На практике ошибки частично коррелированы, но диверсификация всё равно работает.

Ensemble — это "страховой" прогноз: даже если одна модель ошибается в конкретной ситуации, другие её компенсируют.`,
    strengths: [
      'Лучший MAPE 0.78% — #1 среди всех моделей',
      'Усредняет и компенсирует ошибки отдельных моделей',
      'Работает на любых типах активов',
      'Наиболее стабильный результат',
    ],
    weaknesses: [
      'Самый медленный — запускает все 7 моделей',
      'Сложнее объяснить итоговый прогноз',
      'Тяжелее по вычислительным ресурсам',
    ],
    bestFor: 'Финальный прогноз перед принятием решения. Любые активы.',
    notFor: 'Интерактивный анализ в реальном времени — используй когда важна точность.',
    assets: ['Все инструменты', 'S&P 500', 'Сбербанк', 'Brent', 'NVIDIA'],
    refs: [
      {
        authors: 'Dietterich, T. G.',
        year: 2000,
        title: 'Ensemble Methods in Machine Learning',
        venue: 'Multiple Classifier Systems, LNCS 1857, 1–15',
        url: 'https://doi.org/10.1007/3-540-45014-9_1',
      },
      {
        authors: 'Makridakis, S., et al.',
        year: 2018,
        title: 'The M4 Competition: 100,000 time series and 61 forecasting methods',
        venue: 'International Journal of Forecasting, 36(1), 54–74',
        url: 'https://doi.org/10.1016/j.ijforecast.2019.04.014',
      },
    ],
  },
]

const SPEED_ORDER = { 'Быстро': 0, 'Среднее': 1, 'Медленно': 2 }

export default function ModelsPage() {
  const [active, setActive] = useState(MODELS[0])
  const [filter, setFilter] = useState('all') // 'all' | 'fast' | 'medium' | 'slow'

  const filtered = filter === 'all' ? MODELS : MODELS.filter(m => {
    if (filter === 'fast')   return m.speed === 'Быстро'
    if (filter === 'medium') return m.speed === 'Среднее'
    if (filter === 'slow')   return m.speed === 'Медленно'
    return true
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div className="max-w-[1300px] mx-auto px-8 py-10">

        {/* Page header */}
        <div className="mb-10">
          <p className="text-[11px] font-bold tracking-[2px] uppercase text-amber-400 mb-3">
            Документация
          </p>
          <h1 className="text-[clamp(28px,3.5vw,48px)] font-extrabold text-white tracking-[-1.5px] leading-[1.1] mb-4">
            8 ML-моделей AlphaSignal
          </h1>
          <p className="text-[16px] text-muted max-w-[600px] leading-[1.7]">
            Подробное описание каждой модели — алгоритм, применение, ограничения и научные источники.
          </p>
        </div>

        {/* Comparison bar */}
        <div className="grid grid-cols-8 gap-2 mb-8 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
          {MODELS.map(m => (
            <button key={m.id} onClick={() => setActive(m)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all
                ${active.id === m.id
                  ? 'bg-amber-400/15 border border-amber-400/40'
                  : 'hover:bg-[var(--bg)] border border-transparent'}`}>
              <span className="text-lg">{m.icon}</span>
              <span className="text-[10px] font-semibold text-center leading-tight"
                style={{ color: active.id === m.id ? '#f59e0b' : '#7a6a4a' }}>
                {m.name}
              </span>
              <span className="text-[10px] text-amber-400 font-mono">{m.mape}</span>
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-[320px_1fr] gap-6">

          {/* Left sidebar — model list */}
          <div className="space-y-2">
            {/* Filter */}
            <div className="flex gap-1 mb-3">
              {[['all', 'Все'], ['fast', 'Быстрые'], ['medium', 'Средние'], ['slow', 'Медленные']].map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg transition-all
                    ${filter === key
                      ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                      : 'text-muted hover:text-warm border border-transparent'}`}>
                  {label}
                </button>
              ))}
            </div>

            {filtered.map(m => (
              <button key={m.id} onClick={() => setActive(m)}
                className={`w-full text-left p-4 rounded-xl border transition-all
                  ${active.id === m.id
                    ? 'bg-amber-400/8 border-amber-400/35'
                    : 'bg-[var(--surface)] border-[var(--border)] hover:border-amber-400/25'}`}>
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-base">{m.icon}</span>
                  <span className={`text-[13px] font-bold ${active.id === m.id ? 'text-amber-400' : 'text-white'}`}>
                    {m.name}
                  </span>
                  <span className={`ml-auto text-[11px] font-mono font-semibold ${m.speedColor}`}>
                    {m.speed}
                  </span>
                </div>
                <p className="text-[11px] text-muted leading-[1.5] line-clamp-2">{m.full}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-amber-400 font-mono">MAPE {m.mape}</span>
                  <span className="text-[10px] text-muted">{m.complexity}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Right — detail panel */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 h-fit sticky top-[76px]">

            {/* Model header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: active.color + '20', border: `1px solid ${active.color}40` }}>
                {active.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-[22px] font-extrabold text-white">{active.name}</h2>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${active.speedColor}`}
                    style={{ borderColor: 'currentColor', background: 'currentColor', color: 'var(--bg)', opacity: 0.9 }}>
                    {active.speed}
                  </span>
                </div>
                <p className="text-[13px] text-muted">{active.full}</p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {active.tags.map(t => (
                    <span key={t} className="text-[10px] font-semibold bg-amber-400/10 border border-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[11px] text-muted uppercase tracking-[1px] mb-1">MAPE</p>
                <p className="text-[28px] font-extrabold text-amber-400 leading-none">{active.mape}</p>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[1px] text-muted mb-3">Как работает</p>
              <div className="text-[14px] text-warm leading-[1.8] whitespace-pre-line">
                {active.description}
              </div>
            </div>

            {/* When to use */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-[11px] font-bold uppercase tracking-[1px] text-muted mb-2">Лучше всего для</p>
                <p className="text-[13px] text-warm leading-[1.6]">{active.bestFor}</p>
              </div>
              <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4">
                <p className="text-[11px] font-bold uppercase tracking-[1px] text-red-400 mb-2">Когда не использовать</p>
                <p className="text-[13px] text-warm/80 leading-[1.6]">{active.notFor}</p>
              </div>
            </div>

            {/* Strengths / Weaknesses */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[1px] text-green-400 mb-3">Преимущества</p>
                <ul className="space-y-2">
                  {active.strengths.map(s => (
                    <li key={s} className="flex items-start gap-2 text-[13px] text-warm">
                      <IconCheck size={14} className="flex-shrink-0 mt-0.5"/>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[1px] text-red-400 mb-3">Ограничения</p>
                <ul className="space-y-2">
                  {active.weaknesses.map(w => (
                    <li key={w} className="flex items-start gap-2 text-[13px] text-warm">
                      <IconCross size={14} className="flex-shrink-0 mt-0.5"/>{w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Example assets */}
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[1px] text-muted mb-3">Примеры активов</p>
              <div className="flex flex-wrap gap-2">
                {active.assets.map(a => (
                  <span key={a} className="text-[12px] text-warm bg-[var(--bg)] border border-[var(--border)] px-3 py-1 rounded-lg">
                    {a}
                  </span>
                ))}
              </div>
            </div>

            {/* References */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[1px] text-muted mb-3">Научные источники</p>
              <div className="space-y-3">
                {active.refs.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                    className="block bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4
                               hover:border-amber-400/30 transition-colors no-underline group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-warm group-hover:text-amber-400 transition-colors leading-[1.4] mb-1">
                          {r.title}
                        </p>
                        <p className="text-[11px] text-muted">{r.authors} · {r.year}</p>
                        <p className="text-[11px] text-muted/70 mt-0.5">{r.venue}</p>
                      </div>
                      <span className="text-amber-400 text-[18px] flex-shrink-0 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        ↗
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
