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
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map(p => p.value != null && (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  )
}

export default function ForecastChart({ data }) {
  const [drawTool,    setDrawTool]    = useState('cursor')
  const [drawings,    setDrawings]    = useState([])
  const containerRef  = useRef(null)

  // Ctrl+Z → undo
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        setDrawings(prev => prev.slice(0, -1))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleUndo  = useCallback(() => setDrawings(p => p.slice(0, -1)), [])
  const handleClear = useCallback(() => setDrawings([]), [])

  if (!data) return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 flex items-center justify-center h-72">
      <p className="text-slate-500 text-sm">Запустите прогноз для отображения графика</p>
    </div>
  )

  const testFrom   = data.test_from_index  ?? 0
  const futureFrom = data.future_from_index ?? null
  const hasFuture  = futureFrom !== null

  const chartData = data.dates.map((d, i) => {
    const actual    = data.actual?.[i]    ?? null
    const predicted = data.predicted?.[i] ?? null
    return {
      date: d,
      Реальные:  actual,
      Прогноз:   (i >= testFrom && (!hasFuture || i < futureFrom)) ? predicted : null,
      Будущее:   (hasFuture && i >= futureFrom) ? predicted : null,
    }
  })

  const futureSplitDate = hasFuture ? data.dates[futureFrom] : null
  const tickEvery = Math.max(1, Math.floor(chartData.length / 14))
  const ticks = chartData.filter((_, i) => i % tickEvery === 0).map(d => d.date)

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
          Рисунок 9 — Реальные vs Предсказанные значения
          {hasFuture && ' + прогноз'}
        </h2>
        {hasFuture && (
          <span className="text-xs px-2 py-1 rounded bg-emerald-900/40 border border-emerald-700 text-emerald-300">
            Прогноз с {futureSplitDate}
          </span>
        )}
      </div>

      {/* Drawing toolbar */}
      <div className="mb-3">
        <DrawingToolbar
          tool={drawTool}
          onToolChange={setDrawTool}
          onUndo={handleUndo}
          onClear={handleClear}
          drawingCount={drawings.length}
        />
      </div>

      {/* Chart + drawing overlay */}
      <div ref={containerRef} style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={320}>
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
            {/* Tooltip only works in cursor mode */}
            {drawTool === 'cursor' && <Tooltip content={<CustomTooltip />} />}
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={val => <span style={{ color: '#cbd5e1' }}>{val}</span>}
            />
            <Brush dataKey="date" height={20} stroke="#334155" fill="#0f172a" travellerWidth={8} />

            {futureSplitDate && (
              <ReferenceLine
                x={futureSplitDate} stroke="#4ade80" strokeWidth={1.5} strokeDasharray="4 2"
                label={{ value: 'Сегодня', fill: '#4ade80', fontSize: 10, position: 'insideTopRight' }}
              />
            )}

            <Line type="monotone" dataKey="Реальные"
              stroke="#60a5fa" strokeWidth={1.5} dot={false}
              activeDot={{ r: 4 }} connectNulls={false} />

            <Line type="monotone" dataKey="Прогноз"
              stroke="#f87171" strokeWidth={1.5} dot={false}
              strokeDasharray="5 2" activeDot={{ r: 4 }} connectNulls={false} />

            {hasFuture && (
              <Line type="monotone" dataKey="Будущее"
                stroke="#4ade80" strokeWidth={2} dot={false}
                strokeDasharray="6 3" activeDot={{ r: 5 }} connectNulls={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* SVG drawing layer */}
        <DrawingLayer
          tool={drawTool}
          drawings={drawings}
          onDrawingsChange={setDrawings}
          containerRef={containerRef}
        />
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-2 text-xs text-slate-500">
        <span><span className="text-blue-400">━</span> Реальные цены</span>
        <span><span className="text-red-400">╌</span> Прогноз (бэктест)</span>
        {hasFuture && <span><span className="text-emerald-400">╌</span> Будущее (bootstrap)</span>}
        <span className="ml-auto text-slate-600">Инструменты рисования ↑</span>
      </div>
    </div>
  )
}
