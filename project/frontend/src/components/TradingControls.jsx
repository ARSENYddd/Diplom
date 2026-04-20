const sel = 'bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors px-2 py-1.5'

const STRATEGIES = [
  { value: 'momentum',       label: 'Momentum',       desc: 'Следование тренду прогнозов' },
  { value: 'mean_reversion', label: 'Mean Reversion', desc: 'Возврат к среднему' },
  { value: 'threshold',      label: 'Threshold',      desc: 'Порог ожидаемой доходности' },
]

export default function TradingControls({ config, onChange, onRun, loading, disabled }) {
  return (
    <div className="flex items-center gap-2 flex-wrap px-3 py-2 bg-slate-800/40 border-t border-slate-700/60">

      {/* Иконка */}
      <span className="text-slate-400 text-xs font-medium flex-shrink-0 flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        Бэктест:
      </span>

      {/* Стратегия */}
      <select
        value={config.strategy}
        onChange={e => onChange('strategy', e.target.value)}
        className={sel}
        disabled={disabled || loading}
        title="Стратегия генерации сигналов"
      >
        {STRATEGIES.map(s => (
          <option key={s.value} value={s.value} title={s.desc}>{s.label}</option>
        ))}
      </select>

      {/* Комиссия */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-500 flex-shrink-0">Комиссия</span>
        <input
          type="number" min="0" max="0.05" step="0.0001"
          value={config.commission}
          onChange={e => onChange('commission', parseFloat(e.target.value) || 0)}
          className={sel + ' w-20 text-right'}
          disabled={disabled || loading}
          title="Ставка комиссии (0.001 = 0.1%)"
        />
      </div>

      {/* Капитал */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-500 flex-shrink-0">Капитал</span>
        <input
          type="number" min="100" step="1000"
          value={config.initial_capital}
          onChange={e => onChange('initial_capital', parseFloat(e.target.value) || 10000)}
          className={sel + ' w-24 text-right'}
          disabled={disabled || loading}
          title="Начальный капитал"
        />
      </div>

      {/* Кнопка */}
      <button
        onClick={onRun}
        disabled={disabled || loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white text-xs font-medium transition-colors flex-shrink-0"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Считаю…
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Запустить бэктест
          </>
        )}
      </button>
    </div>
  )
}
