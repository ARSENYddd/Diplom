import { useState } from 'react'

// MOEX tickers: Yahoo Finance stopped providing data after 2022-05-24 due to sanctions.
// We mark them and auto-set dates accordingly.
const MOEX_LAST_DATE = '2022-05-01'
const MOEX_START_DATE = '2015-01-01'

const TICKER_GROUPS = [
  {
    group: '🇺🇸 США — Индексы',
    tickers: [
      { value: '^GSPC',  label: 'S&P 500' },
      { value: '^DJI',   label: 'Dow Jones' },
      { value: '^IXIC',  label: 'NASDAQ Composite' },
    ],
  },
  {
    group: '🇷🇺 Нефтяной сектор РФ (MOEX)',
    moex: true,
    tickers: [
      { value: 'GAZP.ME', label: 'Газпром' },
      { value: 'LKOH.ME', label: 'Лукойл' },
      { value: 'ROSN.ME', label: 'Роснефть' },
      { value: 'NVTK.ME', label: 'Новатэк' },
      { value: 'TATN.ME', label: 'Татнефть' },
      { value: 'SNGS.ME', label: 'Сургутнефтегаз' },
      { value: 'BANE.ME', label: 'Башнефть' },
      { value: 'RNFT.ME', label: 'РуссНефть' },
    ],
  },
  {
    group: '🇷🇺 Другие секторы РФ (MOEX)',
    moex: true,
    tickers: [
      { value: 'SBER.ME', label: 'Сбербанк' },
      { value: 'VTBR.ME', label: 'ВТБ' },
      { value: 'GMKN.ME', label: 'Норникель' },
      { value: 'MGNT.ME', label: 'Магнит' },
      { value: 'YNDX.ME', label: 'Яндекс' },
      { value: 'ALRS.ME', label: 'АЛРОСА' },
      { value: 'NLMK.ME', label: 'НЛМК' },
      { value: 'MTSS.ME', label: 'МТС' },
    ],
  },
  {
    group: '🌍 Нефть и газ — международные',
    tickers: [
      { value: 'XOM',  label: 'ExxonMobil' },
      { value: 'CVX',  label: 'Chevron' },
      { value: 'SHEL', label: 'Shell' },
      { value: 'BP',   label: 'BP' },
      { value: 'TTE',  label: 'TotalEnergies' },
      { value: 'COP',  label: 'ConocoPhillips' },
      { value: 'HAL',  label: 'Halliburton' },
      { value: 'SLB',  label: 'Schlumberger' },
    ],
  },
  {
    group: '📦 Сырьё и фьючерсы',
    tickers: [
      { value: 'CL=F', label: 'Нефть WTI (фьюч.)' },
      { value: 'BZ=F', label: 'Нефть Brent (фьюч.)' },
      { value: 'GC=F', label: 'Золото (фьюч.)' },
      { value: 'NG=F', label: 'Природный газ (фьюч.)' },
      { value: 'SI=F', label: 'Серебро (фьюч.)' },
    ],
  },
  {
    group: '🇺🇸 США — Технологии',
    tickers: [
      { value: 'AAPL',  label: 'Apple' },
      { value: 'MSFT',  label: 'Microsoft' },
      { value: 'NVDA',  label: 'NVIDIA' },
      { value: 'GOOGL', label: 'Alphabet (Google)' },
      { value: 'AMZN',  label: 'Amazon' },
      { value: 'META',  label: 'Meta' },
      { value: 'TSLA',  label: 'Tesla' },
    ],
  },
]

// Build flat map: ticker value → { label, moex }
const TICKER_META = Object.fromEntries(
  TICKER_GROUPS.flatMap(g => g.tickers.map(t => [t.value, { label: t.label, moex: !!g.moex }]))
)

const MODELS = [
  { key: 'arima',  label: 'ARIMA',      desc: 'Авторегрессионная' },
  { key: 'garch',  label: 'GARCH',      desc: 'Волатильность' },
  { key: 'lstm',   label: 'LSTM',       desc: 'Нейронная сеть' },
  { key: 'hybrid', label: 'ARIMA+LSTM', desc: 'Гибридная' },
]

export default function ControlPanel({ onForecast, onCompare, loading }) {
  const [ticker,      setTicker]      = useState('^GSPC')
  const [customTicker,setCustomTicker]= useState('')
  const [useCustom,   setUseCustom]   = useState(false)
  const [start,       setStart]       = useState('2015-01-01')
  const [end,         setEnd]         = useState('2024-01-01')
  const [model,       setModel]       = useState('hybrid')
  const [window,      setWindow]      = useState(60)

  const activeTicker = useCustom ? customTicker.trim().toUpperCase() : ticker
  const meta         = TICKER_META[activeTicker]
  const tickerLabel  = meta?.label ?? activeTicker
  const isMoex       = meta?.moex ?? activeTicker.endsWith('.ME')

  // When user picks a MOEX ticker from the list, auto-adjust dates
  const handleTickerChange = (val) => {
    setTicker(val)
    const m = TICKER_META[val]
    if (m?.moex) {
      setStart(MOEX_START_DATE)
      setEnd(MOEX_LAST_DATE)
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  const handleForecast = () => {
    if (!activeTicker) return
    onForecast({ ticker: activeTicker, start, end, model, window, today })
  }
  const handleCompare = () => {
    if (!activeTicker) return
    onCompare(activeTicker, start, end)
  }

  const inputCls = 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors'
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1.5'

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-5">
      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
        Параметры прогноза
      </h2>

      {/* Ticker selector */}
      <div>
        <label className={labelCls}>
          Тикер
          {activeTicker && (
            <span className="ml-2 text-slate-500 font-normal">{tickerLabel}</span>
          )}
        </label>

        {/* Toggle: list vs custom */}
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setUseCustom(false)}
            className={`flex-1 text-xs py-1 rounded-md border transition-all ${
              !useCustom
                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                : 'border-slate-700 text-slate-500 hover:border-slate-600'
            }`}
          >
            Из списка
          </button>
          <button
            onClick={() => setUseCustom(true)}
            className={`flex-1 text-xs py-1 rounded-md border transition-all ${
              useCustom
                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                : 'border-slate-700 text-slate-500 hover:border-slate-600'
            }`}
          >
            Свой тикер
          </button>
        </div>

        {useCustom ? (
          <input
            type="text"
            value={customTicker}
            onChange={e => setCustomTicker(e.target.value)}
            placeholder="напр. AAPL, SBER.ME, BZ=F"
            className={inputCls + ' font-mono'}
          />
        ) : (
          <select
            value={ticker}
            onChange={e => handleTickerChange(e.target.value)}
            className={inputCls}
          >
            {TICKER_GROUPS.map(g => (
              <optgroup key={g.group} label={g.group}>
                {g.tickers.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.value} — {t.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}

        {/* MOEX warning */}
        {isMoex && (
          <p className="mt-2 text-xs text-amber-400 flex items-start gap-1.5">
            <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Yahoo Finance не публикует данные MOEX после мая 2022 г. (санкции). Даты скорректированы автоматически.
          </p>
        )}
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Начало</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Конец</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className={inputCls} />
        </div>
      </div>
      {new Date(end) > new Date() && !isMoex && (
        <p className="text-xs text-emerald-400 -mt-3 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Режим прогноза в будущее — покажет 5 сценариев
        </p>
      )}

      {/* Window slider */}
      <div>
        <label className={labelCls}>Окно (дней): {window}</label>
        <input
          type="range" min={20} max={120} step={5} value={window}
          onChange={e => setWindow(+e.target.value)}
          className="w-full accent-indigo-500"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>20</span><span>60 — стандарт</span><span>120</span>
        </div>
      </div>

      {/* Model selector */}
      <div>
        <label className={labelCls}>Модель</label>
        <div className="grid grid-cols-2 gap-2">
          {MODELS.map(m => (
            <button
              key={m.key}
              onClick={() => setModel(m.key)}
              className={`rounded-lg p-2.5 text-left border transition-all ${
                model === m.key
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                  : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500'
              }`}
            >
              <div className="text-xs font-semibold">{m.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-1">
        <button
          onClick={handleForecast}
          disabled={loading || !activeTicker}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Вычисляется…
            </>
          ) : `Запустить прогноз${activeTicker ? ` (${activeTicker})` : ''}`}
        </button>
        <button
          onClick={handleCompare}
          disabled={loading || !activeTicker}
          className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
        >
          Сравнить все модели
        </button>
      </div>
    </div>
  )
}
