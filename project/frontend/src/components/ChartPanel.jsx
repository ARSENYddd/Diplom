import { useState, useCallback, useEffect } from 'react'
import ForecastChart from './ForecastChart'
import { fetchForecast, fetchBacktest } from '../api/client'

const TICKER_GROUPS = [
  {
    group: '🇺🇸 США — Индексы',
    tickers: [
      { value: '^GSPC',  label: 'S&P 500' },
      { value: '^DJI',   label: 'Dow Jones' },
      { value: '^IXIC',  label: 'NASDAQ' },
    ],
  },
  {
    group: '🇷🇺 Нефтяной сектор (MOEX)',
    tickers: [
      { value: 'GAZP.ME', label: 'Газпром' },
      { value: 'LKOH.ME', label: 'Лукойл' },
      { value: 'ROSN.ME', label: 'Роснефть' },
      { value: 'NVTK.ME', label: 'Новатэк' },
      { value: 'TATN.ME', label: 'Татнефть' },
      { value: 'SNGS.ME', label: 'Сургутнефтегаз' },
    ],
  },
  {
    group: '🇷🇺 Другие секторы (MOEX)',
    tickers: [
      { value: 'SBER.ME', label: 'Сбербанк' },
      { value: 'VTBR.ME', label: 'ВТБ' },
      { value: 'GMKN.ME', label: 'Норникель' },
      { value: 'MGNT.ME', label: 'Магнит' },
      { value: 'YNDX.ME', label: 'Яндекс' },
      { value: 'MTSS.ME', label: 'МТС' },
    ],
  },
  {
    group: '🌍 Нефть и газ',
    tickers: [
      { value: 'XOM',  label: 'ExxonMobil' },
      { value: 'CVX',  label: 'Chevron' },
      { value: 'SHEL', label: 'Shell' },
      { value: 'BP',   label: 'BP' },
    ],
  },
  {
    group: '📦 Сырьё',
    tickers: [
      { value: 'CL=F', label: 'WTI (фьюч.)' },
      { value: 'BZ=F', label: 'Brent (фьюч.)' },
      { value: 'GC=F', label: 'Золото' },
      { value: 'NG=F', label: 'Газ' },
    ],
  },
  {
    group: '🇺🇸 Технологии',
    tickers: [
      { value: 'AAPL',  label: 'Apple' },
      { value: 'MSFT',  label: 'Microsoft' },
      { value: 'NVDA',  label: 'NVIDIA' },
      { value: 'GOOGL', label: 'Google' },
      { value: 'AMZN',  label: 'Amazon' },
      { value: 'TSLA',  label: 'Tesla' },
    ],
  },
]

const MODELS = [
  { value: 'arima',         label: 'ARIMA' },
  { value: 'garch',         label: 'GARCH' },
  { value: 'lstm',          label: 'LSTM' },
  { value: 'arima_lstm',    label: 'ARIMA+LSTM' },
  { value: 'arima_gru',     label: 'ARIMA+GRU' },
  { value: 'garch_lstm',    label: 'GARCH+LSTM' },
  { value: 'triple_hybrid', label: 'ARIMA+GARCH+LSTM' },
  { value: 'ensemble',      label: 'Ансамбль' },
]

const MODEL_COLORS = {
  arima:         '#94a3b8',
  garch:         '#64748b',
  lstm:          '#60a5fa',
  arima_lstm:    '#818cf8',
  arima_gru:     '#a78bfa',
  garch_lstm:    '#c084fc',
  triple_hybrid: '#f472b6',
  ensemble:      '#4ade80',
}

const sel = 'bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-warm focus:outline-none focus:border-amber-400 transition-colors px-2 py-1.5'

const TIMEFRAMES = [
  // nPredict: steps to forecast ahead
  // 1h  → 24 steps = 24 hours  ≈ 1 торговый день
  // 6h  → 12 steps = 72 hours  ≈ 3 дня
  // 12h → 14 steps = 168 hours ≈ 1 неделя
  { key: '1h',  label: '1ч',   intraday: true,  defaultDays: 90,  maxDays: 729, nPredict: 24, horizon: '1 день'    },
  { key: '6h',  label: '6ч',   intraday: true,  defaultDays: 180, maxDays: 729, nPredict: 12, horizon: '3 дня'     },
  { key: '12h', label: '12ч',  intraday: true,  defaultDays: 365, maxDays: 729, nPredict: 14, horizon: '1 неделя'  },
  { key: '1d',  label: '1д',   intraday: false },
  { key: '1wk', label: '1н',   intraday: false },
  { key: '1mo', label: '1мес', intraday: false },
]

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// ── Simple view: summary cards only ─────────────────────────────────────────
function SimpleView({ data, tickerLabel, modelLabel }) {
  if (!data) return (
    <div className="flex items-center justify-center h-48 text-muted text-sm">
      Запустите прогноз для отображения
    </div>
  )

  const realPrices = data.actual?.filter(v => v != null) ?? []
  const currentPrice = realPrices[realPrices.length - 1] ?? null
  const predicted = data.predicted ?? []
  const lastForecast = predicted[predicted.length - 1] ?? null

  const changePct = currentPrice && lastForecast
    ? ((lastForecast - currentPrice) / currentPrice) * 100
    : null
  const isUp = changePct !== null && changePct >= 0

  const fmt = v => {
    if (v == null) return '—'
    return v >= 1000 ? v.toLocaleString('ru', { maximumFractionDigits: 0 }) : v.toFixed(2)
  }

  return (
    <div className="p-5 space-y-4">
      {/* 3 cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5">
          <p className="text-[11px] text-muted uppercase tracking-[1px] mb-2">Текущая цена</p>
          <p className="text-[28px] font-bold text-warm leading-none">{fmt(currentPrice)}</p>
          <p className="text-[11px] text-muted mt-2">{tickerLabel}</p>
        </div>

        <div className="bg-[var(--bg)] border border-amber-400/25 rounded-xl p-5">
          <p className="text-[11px] text-muted uppercase tracking-[1px] mb-2">Прогноз модели</p>
          <p className="text-[28px] font-bold text-amber-400 leading-none">{fmt(lastForecast)}</p>
          <p className="text-[11px] text-muted mt-2">{modelLabel}</p>
        </div>

        <div className={`rounded-xl p-5 border ${isUp ? 'bg-green-950/30 border-green-800/40' : 'bg-red-950/30 border-red-800/40'}`}>
          <p className="text-[11px] text-muted uppercase tracking-[1px] mb-2">Изменение</p>
          <p className={`text-[28px] font-bold leading-none ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            {changePct !== null ? `${isUp ? '+' : ''}${changePct.toFixed(2)}%` : '—'}
          </p>
          <p className={`text-[11px] mt-2 ${isUp ? 'text-green-400/70' : 'text-red-400/70'}`}>
            {isUp ? '↑ Ожидается рост' : '↓ Ожидается снижение'}
          </p>
        </div>
      </div>

      {/* Metrics row */}
      {data.metrics?.mape && (
        <div className="flex items-center gap-4 px-1 text-[12px]">
          <span className="text-muted">Точность:</span>
          <span className="text-green-400 font-semibold">MAPE {data.metrics.mape}%</span>
          <span className="text-muted/60">MAE {data.metrics.mae}</span>
          <span className="text-muted/60">RMSE {data.metrics.rmse}</span>
        </div>
      )}
    </div>
  )
}

export default function ChartPanel({ panelId, onRemove, defaultParams = {} }) {
  const [ticker,   setTicker]   = useState(defaultParams.ticker   ?? '^GSPC')
  const [model,    setModel]    = useState(defaultParams.model    ?? 'arima_lstm')
  const [interval, setInterval] = useState(defaultParams.interval ?? '1d')
  const [start,    setStart]    = useState(defaultParams.start    ?? '2018-01-01')
  const [end,      setEnd]      = useState(defaultParams.end      ?? '2024-01-01')

  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [viewMode, setViewMode] = useState('simple') // 'simple' | 'advanced'

  // Торговые сигналы — подгружаются автоматически после прогноза
  const [signals, setSignals] = useState(null)

  const tf = TIMEFRAMES.find(t => t.key === interval) ?? TIMEFRAMES[3]

  // When switching to/between intraday intervals — always reset both dates
  useEffect(() => {
    if (tf.intraday) {
      setEnd(today())
      setStart(daysAgo(tf.defaultDays))
    }
  }, [interval]) // eslint-disable-line react-hooks/exhaustive-deps

  const isFuture = !tf.intraday && new Date(end) > new Date()
  const modelColor = MODEL_COLORS[model] ?? '#94a3b8'
  const tickerLabel = TICKER_GROUPS.flatMap(g => g.tickers).find(t => t.value === ticker)?.label ?? ticker

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSignals(null)  // сбрасываем старые сигналы до прихода новых
    const today = new Date().toISOString().slice(0, 10)
    try {
      const n_predict = tf.nPredict ?? 0
      const result = await fetchForecast({ ticker, model, start, end, window: 60, today, interval, n_predict })
      setData(result)

      // Автоматически запрашиваем сигналы после успешного прогноза
      try {
        const bt = await fetchBacktest({
          ticker, model, start, end,
          window: 60, today, interval, n_predict,
          strategy: 'momentum',
          commission: 0.001,
          initial_capital: 10000,
          slippage: 0.0005,
          reinvest: true,
          risk_free_rate: 0.0,
        })
        setSignals(bt.signals ?? null)
      } catch {
        // Бэктест упал (например GARCH без достаточных данных) — не ломаем прогноз
        setSignals(null)
      }
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Ошибка запроса')
    } finally {
      setLoading(false)
    }
  }, [ticker, model, start, end, interval])

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl flex flex-col overflow-hidden">

      {/* ── Panel header / controls ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--surface)]/80 flex-wrap">

        {/* Color dot + model badge */}
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: modelColor }} />

        {/* Ticker */}
        <select value={ticker} onChange={e => setTicker(e.target.value)} className={sel} title="Инструмент">
          {TICKER_GROUPS.map(g => (
            <optgroup key={g.group} label={g.group}>
              {g.tickers.map(t => (
                <option key={t.value} value={t.value}>{t.value} — {t.label}</option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Model */}
        <select value={model} onChange={e => setModel(e.target.value)} className={sel} title="Модель">
          {MODELS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {/* Timeframe selector */}
        <div className="flex items-center gap-0.5 bg-[var(--bg)] rounded-lg p-0.5 border border-[var(--border)]">
          {TIMEFRAMES.map(({ key, label }) => (
            <button key={key} onClick={() => setInterval(key)}
              className={`text-[11px] font-medium px-2 py-1 rounded-md transition-all
                ${interval === key
                  ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40'
                  : 'text-muted hover:text-warm'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Dates */}
        {tf.intraday ? (
          /* Intraday: editable but bounded, with a clear label */
          <div className="flex items-center gap-1.5">
            <input type="date" value={start} onChange={e => setStart(e.target.value)}
              min={daysAgo(tf.maxDays)} max={end}
              className={sel + ' w-36'} title="Начало периода" />
            <span className="text-[var(--muted)] text-xs">→</span>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)}
              min={start} max={today()}
              className={sel + ' w-36'} title="Конец периода (не позже сегодня)" />
            <span className="text-[11px] text-blue-400 bg-blue-900/30 border border-blue-700/40 px-2 py-1 rounded-lg flex-shrink-0"
              title={`Данные: последние ${tf.defaultDays} дней → сейчас. Прогноз: ${tf.nPredict} свечей вперёд (${tf.horizon})`}>
              ⚡ прогноз: {tf.horizon}
            </span>
          </div>
        ) : (
          <>
            <input type="date" value={start} onChange={e => setStart(e.target.value)}
              className={sel + ' w-36'} title="Начало периода" />
            <span className="text-[var(--muted)] text-xs">→</span>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)}
              className={sel + ' w-36'} title="Конец / дата прогноза" />
            {/* Future badge */}
            {isFuture && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/40 border border-emerald-700/60 text-emerald-300 flex-shrink-0">
                📈 прогноз
              </span>
            )}
          </>
        )}

        {/* Mode toggle */}
        <div className="flex items-center gap-0.5 bg-[var(--bg)] rounded-lg p-0.5 border border-[var(--border)]">
          {[
            { key: 'simple',   label: 'Сводка' },
            { key: 'advanced', label: 'График' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setViewMode(key)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-all
                ${viewMode === key
                  ? 'bg-amber-400 text-black'
                  : 'text-muted hover:text-warm'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Metrics inline (after run) */}
        {data?.metrics && !loading && (
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-[var(--muted)]">MAE <span className="text-[var(--text)]">{data.metrics.mae}</span></span>
            <span className="text-[var(--muted)]">RMSE <span className="text-[var(--text)]">{data.metrics.rmse}</span></span>
            <span className="text-[var(--muted)]">MAPE <span className="text-emerald-400">{data.metrics.mape}%</span></span>
          </div>
        )}

        {/* Run button */}
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black text-xs font-medium transition-colors flex-shrink-0"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Вычисляется…
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
              </svg>
              Запустить
            </>
          )}
        </button>

        {/* Close */}
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-400 hover:bg-red-900/20 transition-colors flex-shrink-0"
            title="Закрыть панель"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-red-900/30 border border-red-700 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 min-w-0">
        {viewMode === 'simple' ? (
          <SimpleView
            data={data}
            tickerLabel={tickerLabel}
            modelLabel={MODELS.find(m => m.value === model)?.label ?? model}
          />
        ) : (
          <div className="p-2">
            <ForecastChart data={data} compact signals={signals} />
          </div>
        )}
      </div>
    </div>
  )
}
