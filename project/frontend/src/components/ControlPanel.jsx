import { useState } from 'react'

const TICKERS = ['^GSPC', 'AAPL', 'MSFT']
const MODELS = [
  { key: 'arima',  label: 'ARIMA',       desc: 'Авторегрессионная' },
  { key: 'garch',  label: 'GARCH',       desc: 'Волатильность' },
  { key: 'lstm',   label: 'LSTM',        desc: 'Нейронная сеть' },
  { key: 'hybrid', label: 'ARIMA+LSTM',  desc: 'Гибридная' },
]

export default function ControlPanel({ onForecast, onCompare, loading }) {
  const [ticker, setTicker] = useState('^GSPC')
  const [start, setStart] = useState('2015-01-01')
  const [end, setEnd] = useState('2024-01-01')
  const [model, setModel] = useState('hybrid')
  const [window, setWindow] = useState(60)

  const handleForecast = () => onForecast({ ticker, start, end, model, window })
  const handleCompare  = () => onCompare(ticker, start, end)

  const inputCls = 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors'
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1.5'

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-5">
      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
        Параметры прогноза
      </h2>

      {/* Ticker */}
      <div>
        <label className={labelCls}>Тикер</label>
        <select value={ticker} onChange={e => setTicker(e.target.value)} className={inputCls}>
          {TICKERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
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

      {/* Window */}
      <div>
        <label className={labelCls}>Окно (дней): {window}</label>
        <input
          type="range" min={20} max={120} step={5} value={window}
          onChange={e => setWindow(+e.target.value)}
          className="w-full accent-indigo-500"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>20</span><span>120</span>
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
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Вычисляется…
            </>
          ) : 'Запустить прогноз'}
        </button>
        <button
          onClick={handleCompare}
          disabled={loading}
          className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
        >
          Сравнить все модели
        </button>
      </div>
    </div>
  )
}
