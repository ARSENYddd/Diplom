import { useState, useCallback, useMemo } from 'react'
import ForecastChart from './ForecastChart'
import { fetchForecast, fetchBacktest } from '../api/client'
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
} from 'recharts'

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

// ── Simple view: cards + mini sparkline ─────────────────────────────────────
function SimpleView({ data, tickerLabel, modelLabel }) {
  const sparkData = useMemo(() => {
    if (!data) return []
    const last = Math.min(data.dates.length, 60)
    const from = data.dates.length - last
    return data.dates.slice(from).map((d, i) => ({
      date: d,
      price: data.actual?.[from + i] ?? null,
      forecast: data.predicted?.[from + i] ?? null,
    }))
  }, [data])

  if (!data) return (
    <div className="flex items-center justify-center h-48 text-muted text-sm">
      Запустите прогноз для отображения
    </div>
  )

  // Last real price
  const realPrices = data.actual?.filter(v => v != null) ?? []
  const currentPrice = realPrices[realPrices.length - 1] ?? null

  // Last forecast value
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
    <div className="p-4 space-y-4">
      {/* Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-[11px] text-muted uppercase tracking-[1px] mb-1">Текущая цена</p>
          <p className="text-[22px] font-bold text-warm">{fmt(currentPrice)}</p>
          <p className="text-[11px] text-muted mt-1">{tickerLabel}</p>
        </div>
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-[11px] text-muted uppercase tracking-[1px] mb-1">Прогноз</p>
          <p className="text-[22px] font-bold text-amber-400">{fmt(lastForecast)}</p>
          <p className="text-[11px] text-muted mt-1">{modelLabel}</p>
        </div>
        <div className={`rounded-xl p-4 border ${isUp ? 'bg-green-950/30 border-green-800/40' : 'bg-red-950/30 border-red-800/40'}`}>
          <p className="text-[11px] text-muted uppercase tracking-[1px] mb-1">Изменение</p>
          <p className={`text-[22px] font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            {changePct !== null ? `${isUp ? '+' : ''}${changePct.toFixed(2)}%` : '—'}
          </p>
          <p className="text-[11px] text-muted mt-1">{isUp ? '↑ Рост' : '↓ Снижение'}</p>
        </div>
      </div>

      {/* MAPE */}
      {data.metrics?.mape && (
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <span>Точность модели:</span>
          <span className="text-green-400 font-semibold">MAPE {data.metrics.mape}%</span>
          <span className="text-muted/60">· MAE {data.metrics.mae} · RMSE {data.metrics.rmse}</span>
        </div>
      )}

      {/* Mini sparkline */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3">
        <p className="text-[11px] text-muted mb-2">Последние 60 точек</p>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={sparkData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <Tooltip
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#7a6a4a' }}
              formatter={(v, name) => [v?.toFixed(2), name]}
            />
            <Line type="monotone" dataKey="price" stroke="#e8d5a3" strokeWidth={1.5}
              dot={false} connectNulls={true} isAnimationActive={false} name="Реальные" />
            <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={1.5}
              dot={false} connectNulls={true} isAnimationActive={false} name="Прогноз" strokeDasharray="5 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function ChartPanel({ panelId, onRemove, defaultParams = {} }) {
  const [ticker,  setTicker]  = useState(defaultParams.ticker  ?? '^GSPC')
  const [model,   setModel]   = useState(defaultParams.model   ?? 'arima_lstm')
  const [start,   setStart]   = useState(defaultParams.start   ?? '2018-01-01')
  const [end,     setEnd]     = useState(defaultParams.end     ?? '2024-01-01')

  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [viewMode, setViewMode] = useState('simple') // 'simple' | 'advanced'

  // Торговые сигналы — подгружаются автоматически после прогноза
  const [signals, setSignals] = useState(null)

  const isFuture = new Date(end) > new Date()
  const modelColor = MODEL_COLORS[model] ?? '#94a3b8'
  const tickerLabel = TICKER_GROUPS.flatMap(g => g.tickers).find(t => t.value === ticker)?.label ?? ticker

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSignals(null)  // сбрасываем старые сигналы до прихода новых
    const today = new Date().toISOString().slice(0, 10)
    try {
      const result = await fetchForecast({ ticker, model, start, end, window: 60, today })
      setData(result)

      // Автоматически запрашиваем сигналы после успешного прогноза
      try {
        const bt = await fetchBacktest({
          ticker, model, start, end,
          window: 60, today,
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
  }, [ticker, model, start, end])

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

        {/* Dates */}
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
