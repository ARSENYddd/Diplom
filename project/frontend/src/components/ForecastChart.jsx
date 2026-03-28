import { useState, useRef, useCallback, useEffect } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush, ReferenceLine
} from 'recharts'
import DrawingLayer from './DrawingLayer'
import DrawingToolbar from './DrawingToolbar'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl max-w-[220px]">
      <p className="text-slate-400 mb-1 font-medium">{label}</p>
      {payload.map(p => p.value != null && (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  )
}

const SCENARIO_LABELS = {
  'Медвежий':      { emoji: '🐻', desc: 'Негативный сценарий' },
  'Умеренный':     { emoji: '📉', desc: 'Умеренное снижение' },
  'Базовый':       { emoji: '📊', desc: 'Базовый прогноз' },
  'Оптимистичный': { emoji: '📈', desc: 'Умеренный рост' },
  'Бычий':         { emoji: '🐂', desc: 'Позитивный сценарий' },
}

export default function ForecastChart({ data }) {
  const [drawTool,         setDrawTool]         = useState('cursor')
  const [drawings,         setDrawings]         = useState([])
  const [hiddenScenarios,  setHiddenScenarios]  = useState(new Set())
  const [showScenarios,    setShowScenarios]    = useState(true)
  const containerRef = useRef(null)

  // Ctrl+Z → undo drawing
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z')
        setDrawings(prev => prev.slice(0, -1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleUndo  = useCallback(() => setDrawings(p => p.slice(0, -1)), [])
  const handleClear = useCallback(() => setDrawings([]), [])

  const toggleScenario = (name) => {
    setHiddenScenarios(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  if (!data) return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 flex items-center justify-center h-72">
      <p className="text-slate-500 text-sm">Запустите прогноз для отображения графика</p>
    </div>
  )

  const testFrom   = data.test_from_index  ?? 0
  const futureFrom = data.future_from_index ?? null
  const hasFuture  = futureFrom !== null
  const scenarios  = data.scenarios ?? []

  // Build unified chart data
  const chartData = data.dates.map((d, i) => {
    const actual    = data.actual?.[i]    ?? null
    const predicted = data.predicted?.[i] ?? null
    const row = {
      date: d,
      Реальные: actual,
      Прогноз:  (i >= testFrom && (!hasFuture || i < futureFrom)) ? predicted : null,
      Базовый:  (hasFuture && i >= futureFrom) ? predicted : null,
    }
    // Add each scenario value for future range
    if (hasFuture && scenarios.length > 0) {
      scenarios.forEach(sc => {
        const scIdx = i - futureFrom
        row[sc.name] = (i >= futureFrom && scIdx < sc.values.length) ? sc.values[scIdx] : null
      })
    }
    return row
  })

  const futureSplitDate = hasFuture ? data.dates[futureFrom] : null
  const tickEvery = Math.max(1, Math.floor(chartData.length / 14))
  const ticks = chartData.filter((_, i) => i % tickEvery === 0).map(d => d.date)

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
          Рисунок 9 — Реальные vs Предсказанные значения
          {hasFuture && ' + сценарии'}
        </h2>
        {hasFuture && (
          <span className="text-xs px-2 py-1 rounded bg-emerald-900/40 border border-emerald-700 text-emerald-300">
            Прогноз с {futureSplitDate}
          </span>
        )}
      </div>

      {/* Scenario toggles — only in future mode */}
      {hasFuture && scenarios.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">Сценарии:</span>
          <button
            onClick={() => setShowScenarios(v => !v)}
            className={`text-xs px-2 py-0.5 rounded border transition-all ${
              showScenarios
                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                : 'border-slate-600 text-slate-500 hover:border-slate-500'
            }`}
          >
            {showScenarios ? 'Скрыть все' : 'Показать все'}
          </button>
          {showScenarios && scenarios.map(sc => {
            const hidden = hiddenScenarios.has(sc.name)
            const meta   = SCENARIO_LABELS[sc.name] ?? {}
            return (
              <button
                key={sc.name}
                onClick={() => toggleScenario(sc.name)}
                title={meta.desc}
                className={`text-xs px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
                  hidden
                    ? 'border-slate-700 text-slate-600'
                    : 'border-slate-600 text-slate-300 hover:border-slate-400'
                }`}
                style={{ borderColor: hidden ? undefined : sc.color + '88' }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: hidden ? '#475569' : sc.color }}
                />
                {meta.emoji} {sc.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Drawing toolbar */}
      <DrawingToolbar
        tool={drawTool}
        onToolChange={setDrawTool}
        onUndo={handleUndo}
        onClear={handleClear}
        drawingCount={drawings.length}
      />

      {/* Chart + SVG drawing overlay */}
      <div ref={containerRef} style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date" ticks={ticks}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }} tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }} tickLine={false}
              tickFormatter={v => v.toFixed(0)} width={62}
            />
            {drawTool === 'cursor' && <Tooltip content={<CustomTooltip />} />}
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={val => <span style={{ color: '#cbd5e1' }}>{val}</span>}
            />
            <Brush dataKey="date" height={20} stroke="#334155" fill="#0f172a" travellerWidth={8} />

            {futureSplitDate && (
              <ReferenceLine
                x={futureSplitDate} stroke="#4ade80" strokeWidth={1.5} strokeDasharray="4 2"
                label={{ value: 'Сегодня', fill: '#4ade80', fontSize: 10, position: 'insideTopRight' }}
              />
            )}

            {/* Historical actual */}
            <Line type="monotone" dataKey="Реальные"
              stroke="#60a5fa" strokeWidth={1.5} dot={false}
              activeDot={{ r: 4 }} connectNulls={false} />

            {/* Backtest prediction */}
            <Line type="monotone" dataKey="Прогноз"
              stroke="#f87171" strokeWidth={1.5} dot={false}
              strokeDasharray="5 2" activeDot={{ r: 4 }} connectNulls={false} />

            {/* Base future forecast */}
            {hasFuture && (
              <Line type="monotone" dataKey="Базовый"
                stroke="#60a5fa" strokeWidth={2.5} dot={false}
                strokeDasharray="6 3" activeDot={{ r: 5 }} connectNulls={false} />
            )}

            {/* Scenario lines */}
            {hasFuture && showScenarios && scenarios.map(sc =>
              !hiddenScenarios.has(sc.name) && (
                <Line
                  key={sc.name}
                  type="monotone"
                  dataKey={sc.name}
                  stroke={sc.color}
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 3"
                  strokeOpacity={0.75}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
              )
            )}
          </ComposedChart>
        </ResponsiveContainer>

        <DrawingLayer
          tool={drawTool}
          drawings={drawings}
          onDrawingsChange={setDrawings}
          containerRef={containerRef}
        />
      </div>

      {/* Bottom legend */}
      <div className="flex gap-4 flex-wrap text-xs text-slate-500">
        <span><span className="text-blue-400">━</span> Реальные цены</span>
        <span><span className="text-red-400">╌</span> Прогноз (бэктест)</span>
        {hasFuture && <span><span className="text-blue-400">╌ ╌</span> Базовый сценарий</span>}
        {hasFuture && scenarios.length > 0 && (
          <span>
            <span className="text-red-400">╌</span>
            <span className="text-orange-400">╌</span>
            <span className="text-green-400">╌</span>
            <span className="text-emerald-400">╌</span> Сценарии: медвежий → бычий
          </span>
        )}
        <span className="ml-auto text-slate-600">↑ Инструменты рисования</span>
      </div>
    </div>
  )
}
