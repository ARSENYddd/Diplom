import { useState, useCallback } from 'react'
import ForecastChart from './ForecastChart'
import TradingControls from './TradingControls'
import TradingMetricsCards from './TradingMetricsCards'
import EquityChart from './EquityChart'
import TradesTable from './TradesTable'
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

const sel = 'bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors px-2 py-1.5'

export default function ChartPanel({ panelId, onRemove, defaultParams = {} }) {
  const [ticker,  setTicker]  = useState(defaultParams.ticker  ?? '^GSPC')
  const [model,   setModel]   = useState(defaultParams.model   ?? 'arima_lstm')
  const [start,   setStart]   = useState(defaultParams.start   ?? '2018-01-01')
  const [end,     setEnd]     = useState(defaultParams.end     ?? '2024-01-01')

  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // Состояние торгового слоя
  const [btConfig,   setBtConfig]   = useState({ strategy: 'momentum', commission: 0.001, initial_capital: 10000 })
  const [btData,     setBtData]     = useState(null)
  const [btLoading,  setBtLoading]  = useState(false)
  const [btError,    setBtError]    = useState(null)
  const [showTrading, setShowTrading] = useState(false)

  const isFuture = new Date(end) > new Date()
  const modelColor = MODEL_COLORS[model] ?? '#94a3b8'
  const tickerLabel = TICKER_GROUPS.flatMap(g => g.tickers).find(t => t.value === ticker)?.label ?? ticker

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    // Сброс бэктеста при новом прогнозе — данные устарели
    setBtData(null)
    setBtError(null)
    const today = new Date().toISOString().slice(0, 10)
    try {
      const result = await fetchForecast({ ticker, model, start, end, window: 60, today })
      setData(result)
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Ошибка запроса')
    } finally {
      setLoading(false)
    }
  }, [ticker, model, start, end])

  const runBacktest = useCallback(async () => {
    if (!data) return
    setBtLoading(true)
    setBtError(null)
    const today = new Date().toISOString().slice(0, 10)
    try {
      const result = await fetchBacktest({
        ticker, model, start, end, window: 60, today,
        strategy:        btConfig.strategy,
        commission:      btConfig.commission,
        initial_capital: btConfig.initial_capital,
        slippage:        0.0005,
        reinvest:        true,
        risk_free_rate:  0.0,
      })
      setBtData(result)
    } catch (e) {
      const detail = e.response?.data?.detail
      setBtError(
        typeof detail === 'object'
          ? (detail.error || JSON.stringify(detail))
          : (detail || e.message || 'Ошибка бэктеста')
      )
    } finally {
      setBtLoading(false)
    }
  }, [ticker, model, start, end, btConfig, data])

  const handleBtConfigChange = useCallback((field, value) => {
    setBtConfig(prev => ({ ...prev, [field]: value }))
  }, [])

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl flex flex-col overflow-hidden">

      {/* ── Panel header / controls ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-900/80 flex-wrap">

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
        <span className="text-slate-600 text-xs">→</span>
        <input type="date" value={end} onChange={e => setEnd(e.target.value)}
          className={sel + ' w-36'} title="Конец / дата прогноза" />

        {/* Future badge */}
        {isFuture && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/40 border border-emerald-700/60 text-emerald-300 flex-shrink-0">
            📈 прогноз
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Metrics inline (after run) */}
        {data?.metrics && !loading && (
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">MAE <span className="text-white">{data.metrics.mae}</span></span>
            <span className="text-slate-400">RMSE <span className="text-white">{data.metrics.rmse}</span></span>
            <span className="text-slate-400">MAPE <span className="text-emerald-400">{data.metrics.mape}%</span></span>
          </div>
        )}

        {/* Run button */}
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors flex-shrink-0"
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
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors flex-shrink-0"
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

      {/* ── Chart ── */}
      <div className="flex-1 min-w-0 p-2">
        <ForecastChart data={data} compact signals={btData?.signals ?? null} />
      </div>

      {/* ── Торговый анализ (показывается когда есть прогноз) ── */}
      {data && (
        <div className="border-t border-slate-700/60">

          {/* Контролы бэктеста */}
          <TradingControls
            config={btConfig}
            onChange={handleBtConfigChange}
            onRun={runBacktest}
            loading={btLoading}
            disabled={!data}
          />

          {/* Ошибка бэктеста */}
          {btError && (
            <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-red-900/30 border border-red-700 text-xs text-red-300">
              {btError}
            </div>
          )}

          {/* Результаты бэктеста */}
          {btData && (
            <div>
              {/* Переключатель секции */}
              <button
                onClick={() => setShowTrading(v => !v)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <svg className={`w-3 h-3 transition-transform ${showTrading ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  Торговые метрики — {btConfig.strategy}
                </span>
                <span className="font-mono text-slate-500">
                  Sharpe {btData.backtest?.metrics?.sharpe?.toFixed(3) ?? '—'}
                  {' · '}
                  {btData.backtest?.metrics?.n_trades ?? 0} сделок
                </span>
              </button>

              {showTrading && (
                <div className="border-t border-slate-800">
                  <TradingMetricsCards
                    metrics={btData.backtest?.metrics}
                    warning={btData.warning}
                  />
                  <EquityChart
                    equityCurve={btData.backtest?.equity_curve}
                    dates={btData.signals?.dates}
                    initialCapital={btConfig.initial_capital}
                  />
                  <TradesTable trades={btData.backtest?.trades} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
