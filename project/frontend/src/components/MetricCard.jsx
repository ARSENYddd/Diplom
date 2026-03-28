import { useState } from 'react'

const META = {
  mae: {
    name: 'MAE',
    full: 'Mean Absolute Error',
    unit: 'pts',
    color: 'blue',
    explanation: 'Среднее абсолютное отклонение прогноза от реальных значений. Выражается в пунктах индекса — чем меньше, тем точнее модель.',
    formula: 'MAE = (1/n) · Σ |yₜ − ŷₜ|',
  },
  rmse: {
    name: 'RMSE',
    full: 'Root Mean Square Error',
    unit: 'pts',
    color: 'violet',
    explanation: 'Среднеквадратическая ошибка. Сильнее штрафует за крупные отклонения благодаря квадратичному члену — чувствительна к выбросам.',
    formula: 'RMSE = √( (1/n) · Σ (yₜ − ŷₜ)² )',
  },
  mape: {
    name: 'MAPE',
    full: 'Mean Absolute Percentage Error',
    unit: '%',
    color: 'emerald',
    explanation: 'Относительная ошибка в процентах. Удобна для сравнения моделей на разных активах и временных периодах.',
    formula: 'MAPE = (100/n) · Σ |(yₜ − ŷₜ) / yₜ|',
  },
}

const BASELINE = { mae: 38.6, rmse: 56.4, mape: 1.34 }

const colorMap = {
  blue:    { bg: 'bg-blue-900/20',   border: 'border-blue-700',   text: 'text-blue-300',   badge: 'bg-blue-800/50 text-blue-300' },
  violet:  { bg: 'bg-violet-900/20', border: 'border-violet-700', text: 'text-violet-300', badge: 'bg-violet-800/50 text-violet-300' },
  emerald: { bg: 'bg-emerald-900/20',border: 'border-emerald-700',text: 'text-emerald-300',badge: 'bg-emerald-800/50 text-emerald-300' },
}

export default function MetricCard({ metricKey, value }) {
  const [open, setOpen] = useState(false)
  const meta = META[metricKey]
  const c = colorMap[meta.color]
  const baseline = BASELINE[metricKey]
  const isBetter = value !== null && value < baseline
  const pct = value !== null ? Math.round(Math.abs((value - baseline) / baseline) * 100) : null

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4 flex flex-col gap-2`}>
      <div className="flex items-start justify-between">
        <div>
          <span className={`text-xs font-semibold uppercase tracking-wider ${c.text}`}>{meta.name}</span>
          <p className="text-xs text-slate-500 mt-0.5">{meta.full}</p>
        </div>
        {value !== null && pct !== null && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isBetter ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
          }`}>
            {isBetter ? `▼ ${pct}%` : `▲ ${pct}%`}
          </span>
        )}
      </div>

      <div className={`text-3xl font-bold ${c.text}`}>
        {value !== null ? `${value}` : '—'}
        <span className="text-lg font-normal text-slate-400 ml-1">{meta.unit}</span>
      </div>

      {value !== null && (
        <div className="text-xs text-slate-500">
          baseline (LSTM): {baseline} {meta.unit}
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        className="text-xs text-slate-400 hover:text-slate-200 text-left flex items-center gap-1 mt-1 transition-colors"
      >
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {open ? 'Скрыть' : 'Что означает?'}
      </button>

      {open && (
        <div className="text-xs text-slate-300 space-y-2 border-t border-slate-700 pt-2 mt-1">
          <p>{meta.explanation}</p>
          <code className="block bg-slate-800 rounded px-2 py-1 font-mono text-indigo-300">{meta.formula}</code>
        </div>
      )}
    </div>
  )
}
