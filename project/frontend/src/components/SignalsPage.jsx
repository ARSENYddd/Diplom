import { useState, useCallback } from 'react'
import { fetchBacktest } from '../api/client'
import TradingMetricsCards from './TradingMetricsCards'
import EquityChart from './EquityChart'
import TradesTable from './TradesTable'
import { IconLineUp, IconBarChart, IconWarning } from './Icons'

// ─── Конфигурация ────────────────────────────────────────────────────────────
const TICKER_GROUPS = [
  {
    group: 'США — Индексы',
    tickers: [
      { value: '^GSPC',  label: 'S&P 500' },
      { value: '^DJI',   label: 'Dow Jones' },
      { value: '^IXIC',  label: 'NASDAQ' },
    ],
  },
  {
    group: 'MOEX — Нефтяной сектор',
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
    group: 'MOEX — Другие секторы',
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
    group: 'Нефть и газ',
    tickers: [
      { value: 'XOM',  label: 'ExxonMobil' },
      { value: 'CVX',  label: 'Chevron' },
      { value: 'SHEL', label: 'Shell' },
      { value: 'BP',   label: 'BP' },
    ],
  },
  {
    group: 'Сырьё и товары',
    tickers: [
      { value: 'CL=F', label: 'WTI (фьюч.)' },
      { value: 'BZ=F', label: 'Brent (фьюч.)' },
      { value: 'GC=F', label: 'Золото' },
      { value: 'NG=F', label: 'Газ' },
    ],
  },
  {
    group: 'США — Технологии',
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

const STRATEGIES = [
  { value: 'momentum',      label: 'Momentum', desc: 'Следование тренду по последовательным прогнозам' },
  { value: 'threshold',     label: 'Threshold', desc: 'Сигнал при превышении порога ожидаемой доходности' },
  { value: 'mean_reversion',label: 'Mean Reversion', desc: 'Возврат к среднему при отклонении от MA' },
]

const sel = 'bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors px-2 py-1.5'

// ─── Сводка сигналов ─────────────────────────────────────────────────────────
function SignalSummary({ signals }) {
  if (!signals?.signals?.length) return null
  const counts = signals.signals.reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-slate-500">Сигналов:</span>
      <span className="flex items-center gap-1 text-emerald-400 font-mono">
        <span>▲</span> BUY {counts.BUY ?? 0}
      </span>
      <span className="flex items-center gap-1 text-red-400 font-mono">
        <span>▼</span> SELL {counts.SELL ?? 0}
      </span>
      <span className="text-slate-500 font-mono">
        HOLD {counts.HOLD ?? 0}
      </span>
    </div>
  )
}

// ─── Таблица сигналов ─────────────────────────────────────────────────────────
function SignalsTable({ signals }) {
  const [expanded, setExpanded] = useState(false)
  if (!signals?.dates?.length) return null

  const rows = signals.dates
    .map((d, i) => ({ date: d, signal: signals.signals?.[i], price: signals.actual?.[i] }))
    .filter(r => r.signal === 'BUY' || r.signal === 'SELL')

  if (!rows.length) return (
    <p className="text-xs text-slate-500 px-1">Нет сигналов BUY/SELL за выбранный период</p>
  )

  const shown = expanded ? rows : rows.slice(0, 8)

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-2 transition-colors"
      >
        <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Сигналы BUY/SELL ({rows.length})
      </button>

      {(expanded || rows.length <= 8) && (
        <div className="overflow-x-auto rounded-lg border border-slate-700/60">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/60">
                <th className="text-left px-3 py-2 text-slate-500 font-medium">Дата</th>
                <th className="text-center px-3 py-2 text-slate-500 font-medium">Сигнал</th>
                <th className="text-right px-3 py-2 text-slate-500 font-medium">Цена</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="px-3 py-1.5 text-slate-400 font-mono">{r.date}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      r.signal === 'BUY'
                        ? 'bg-emerald-900/40 text-emerald-400'
                        : 'bg-red-900/40 text-red-400'
                    }`}>
                      {r.signal === 'BUY' ? '▲ BUY' : '▼ SELL'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right text-slate-300 font-mono">
                    {r.price != null ? r.price.toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!expanded && rows.length > 8 && (
            <div className="text-center py-1.5">
              <button onClick={() => setExpanded(true)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                Показать все {rows.length} сигналов ↓
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Таблица будущих сигналов (нет actual цены — только прогнозная) ──────────
function FutureSignalsTable({ signals }) {
  const [expanded, setExpanded] = useState(false)
  if (!signals?.dates?.length) return null

  const rows = signals.dates
    .map((d, i) => ({ date: d, signal: signals.signals?.[i], price: signals.predicted?.[i] }))
    .filter(r => r.signal === 'BUY' || r.signal === 'SELL')

  if (!rows.length) return (
    <p className="text-xs text-slate-500 px-1">Нет сигналов BUY/SELL в будущем периоде</p>
  )

  const shown = expanded ? rows : rows.slice(0, 8)

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-2 transition-colors"
      >
        <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Прогнозные BUY/SELL ({rows.length})
      </button>

      {(expanded || rows.length <= 8) && (
        <div className="overflow-x-auto rounded-lg border border-emerald-800/40">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700 bg-emerald-900/10">
                <th className="text-left px-3 py-2 text-slate-500 font-medium">Дата (прогноз)</th>
                <th className="text-center px-3 py-2 text-slate-500 font-medium">Сигнал</th>
                <th className="text-right px-3 py-2 text-slate-500 font-medium">Прогноз цены</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="px-3 py-1.5 text-emerald-400/70 font-mono">{r.date}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      r.signal === 'BUY'
                        ? 'bg-emerald-900/40 text-emerald-400'
                        : 'bg-red-900/40 text-red-400'
                    }`}>
                      {r.signal === 'BUY' ? '▲ BUY' : '▼ SELL'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right text-slate-400 font-mono italic">
                    ~{r.price != null ? r.price.toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!expanded && rows.length > 8 && (
            <div className="text-center py-1.5">
              <button onClick={() => setExpanded(true)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                Показать все {rows.length} сигналов ↓
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Главный компонент страницы ───────────────────────────────────────────────
export default function SignalsPage() {
  const [ticker,   setTicker]   = useState('^GSPC')
  const [model,    setModel]    = useState('arima_lstm')
  const [start,    setStart]    = useState('2018-01-01')
  const [end,      setEnd]      = useState('2024-01-01')
  const [strategy, setStrategy] = useState('momentum')
  const [commission,      setCommission]      = useState(0.001)
  const [initialCapital,  setInitialCapital]  = useState(10000)

  const [result,  setResult]  = useState(null)   // { forecast, signals, backtest, warning }
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    const today = new Date().toISOString().slice(0, 10)
    try {
      const data = await fetchBacktest({
        ticker, model, start, end,
        window: 60, today,
        strategy,
        commission,
        initial_capital: initialCapital,
        slippage: 0.0005,
        reinvest: true,
        risk_free_rate: 0.0,
      })
      setResult(data)
    } catch (e) {
      const detail = e.response?.data?.detail
      setError(
        typeof detail === 'object'
          ? (detail.error || JSON.stringify(detail))
          : (detail || e.message || 'Ошибка запроса')
      )
    } finally {
      setLoading(false)
    }
  }, [ticker, model, start, end, strategy, commission, initialCapital])

  // Определяем режим: будущее или история
  const isFuture = new Date(end) > new Date()

  const metrics       = result?.backtest?.metrics
  const equity        = result?.backtest?.equity_curve
  const trades        = result?.backtest?.trades
  const signals       = result?.signals
  const futureSignals = result?.future_signals
  const dates         = signals?.dates

  return (
    <div className="p-4 space-y-4">

      {/* ── Форма запуска ── */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
            Параметры анализа
          </h2>
          {/* Бейдж режима */}
          {isFuture ? (
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/40 border border-emerald-700/60 text-emerald-300">
              <IconLineUp size={12} className="inline-block mr-1"/> прогноз в будущее
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
              <IconBarChart size={12} className="inline-block mr-1"/> исторический бэктест
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-end">
          {/* Тикер */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">Инструмент</label>
            <select value={ticker} onChange={e => setTicker(e.target.value)} className={sel}>
              {TICKER_GROUPS.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.tickers.map(t => (
                    <option key={t.value} value={t.value}>{t.value} — {t.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Модель */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">Модель</label>
            <select value={model} onChange={e => setModel(e.target.value)} className={sel}>
              {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {/* Даты */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">Начало</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} className={sel + ' w-36'} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">
              {isFuture ? 'Прогноз до' : 'Конец'}
            </label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)}
              className={sel + ' w-36' + (isFuture ? ' border-emerald-700/60' : '')} />
          </div>

          {/* Стратегия */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">Стратегия</label>
            <select value={strategy} onChange={e => setStrategy(e.target.value)} className={sel}>
              {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Комиссия */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">Комиссия</label>
            <input
              type="number" step="0.0001" min="0" max="0.05"
              value={commission}
              onChange={e => setCommission(parseFloat(e.target.value))}
              className={sel + ' w-24'}
            />
          </div>

          {/* Капитал */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">Капитал $</label>
            <input
              type="number" step="1000" min="100"
              value={initialCapital}
              onChange={e => setInitialCapital(parseInt(e.target.value))}
              className={sel + ' w-28'}
            />
          </div>

          {/* Кнопка */}
          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Анализируется…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                </svg>
                Запустить анализ
              </>
            )}
          </button>
        </div>

        {/* Подсказка + описание стратегии */}
        <div className="mt-2 flex items-start justify-between gap-4">
          <p className="text-[11px] text-slate-500">
            {STRATEGIES.find(s => s.value === strategy)?.desc}
          </p>
          {isFuture && (
            <p className="text-[11px] text-emerald-600 shrink-0">
              Дата конца &gt; сегодня → будут показаны прогнозные сигналы
            </p>
          )}
        </div>
      </div>

      {/* ── Ошибка ── */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-900/30 border border-red-700 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ── Результаты ── */}
      {result && (
        <div className="space-y-4">

          {/* Предупреждение */}
          {result.warning && (
            <div className="px-4 py-3 rounded-xl bg-amber-900/20 border border-amber-700/50 text-sm text-amber-300">
              <IconWarning size={13} className="inline-block mr-1.5"/> {result.warning}
            </div>
          )}

          {/* ── БЛОК БУДУЩИХ СИГНАЛОВ (появляется только при isFuture) ── */}
          {result.future_signals !== undefined && (
            <div className="bg-slate-900 border border-emerald-800/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Прогнозные сигналы
                  <span className="text-xs font-normal text-emerald-600 ml-1">
                    (будущий период — без реальных цен)
                  </span>
                </h2>
                <div className="flex items-center gap-2">
                  {/* Какая стратегия применена */}
                  {futureSignals?.strategy_used && futureSignals.strategy_used !== strategy && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 border border-amber-700/50 text-amber-400">
                      <IconWarning size={10} className="inline-block mr-0.5"/> mean_reversion → threshold для будущего
                    </span>
                  )}
                  <SignalSummary signals={futureSignals} />
                </div>
              </div>

              {/* Таблица будущих сигналов */}
              {futureSignals?.signals?.length > 0
                ? <FutureSignalsTable signals={futureSignals} />
                : <p className="text-xs text-slate-500">Нет прогнозных сигналов — попробуйте другую модель или увеличьте период</p>
              }
            </div>
          )}

          {/* ── Исторические сигналы (тестовый период) ── */}
          {signals?.signals?.length > 0 && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                  Исторические сигналы
                  <span className="text-xs font-normal text-slate-500 ml-1">(тестовый период)</span>
                </h2>
                <SignalSummary signals={signals} />
              </div>
              <SignalsTable signals={signals} />
            </div>
          )}

          {/* Метрики бэктеста */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl">
            <div className="px-4 pt-4 pb-2">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                Метрики бэктеста
                <span className="text-xs font-normal text-slate-500 ml-1">
                  Sharpe {metrics?.sharpe?.toFixed(3) ?? '—'} · {metrics?.n_trades ?? 0} сделок
                </span>
              </h2>
            </div>
            <TradingMetricsCards metrics={metrics} warning={null} />
          </div>

          {/* Equity curve */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
              Кривая капитала
              <span className="text-xs font-normal text-slate-500 ml-1">(исторический период)</span>
            </h2>
            <EquityChart
              equityCurve={equity}
              dates={dates}
              initialCapital={initialCapital}
            />
          </div>

          {/* Список сделок */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
              Список сделок
            </h2>
            <TradesTable trades={trades} />
          </div>
        </div>
      )}

      {/* Заглушка до первого запуска */}
      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600">
          <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm">Выберите параметры и нажмите «Запустить анализ»</p>
          <p className="text-xs mt-1">Поставьте дату конца в будущем — получите прогнозные сигналы</p>
        </div>
      )}
    </div>
  )
}
