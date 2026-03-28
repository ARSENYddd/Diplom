import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import DrawingLayer from './DrawingLayer'
import DrawingToolbar from './DrawingToolbar'

// ─── Tooltip ────────────────────────────────────────────────────────────────
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

// ─── Memoized chart core ─────────────────────────────────────────────────────
// Receives ONLY chart-data props — never drawTool.
// Result: switching drawing tools does NOT re-render the chart.
const ChartCore = memo(function ChartCore({
  visibleData, yDomain, xTicks,
  hasFuture, futureSplitDate,
  scenarios, hiddenScenarios, showScenarios,
}) {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <ComposedChart data={visibleData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="date"
          ticks={xTicks}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: '#334155' }}
          tickLine={false}
        />
        <YAxis
          domain={yDomain}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: '#334155' }}
          tickLine={false}
          tickFormatter={v => Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'k' : Number(v).toFixed(0)}
          width={68}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={val => <span style={{ color: '#cbd5e1' }}>{val}</span>}
        />

        {futureSplitDate && (
          <ReferenceLine
            x={futureSplitDate}
            stroke="#4ade80" strokeWidth={1.5} strokeDasharray="4 2"
            label={{ value: 'Сегодня', fill: '#4ade80', fontSize: 10, position: 'insideTopRight' }}
          />
        )}

        {/* Historical actual */}
        <Line type="monotone" dataKey="Реальные"
          stroke="#60a5fa" strokeWidth={1.5} dot={false}
          activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />

        {/* Backtest prediction */}
        <Line type="monotone" dataKey="Прогноз"
          stroke="#f87171" strokeWidth={1.5} dot={false}
          strokeDasharray="5 2" activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />

        {/* Base future forecast */}
        {hasFuture && (
          <Line type="monotone" dataKey="Базовый"
            stroke="#60a5fa" strokeWidth={2.5} dot={false}
            strokeDasharray="6 3" activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
        )}

        {/* Scenario lines */}
        {hasFuture && showScenarios && scenarios.map(sc =>
          !hiddenScenarios.has(sc.name) && (
            <Line
              key={sc.name} type="monotone" dataKey={sc.name}
              stroke={sc.color} strokeWidth={1.5} dot={false}
              strokeDasharray="4 3" strokeOpacity={0.75}
              activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false}
            />
          )
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
})

// ─── Main component ──────────────────────────────────────────────────────────
export default function ForecastChart({ data }) {
  // Drawing state
  const [drawTool,        setDrawTool]        = useState('cursor')
  const [drawings,        setDrawings]        = useState([])
  const [hiddenScenarios, setHiddenScenarios] = useState(new Set())
  const [showScenarios,   setShowScenarios]   = useState(true)

  // View window (which slice of chartData is visible)
  const [viewStart, setViewStart] = useState(0)
  const [viewEnd,   setViewEnd]   = useState(null) // null = show all

  // Refs for stable handlers (avoid re-creating callbacks on every render)
  const containerRef  = useRef(null)
  const chartAreaRef  = useRef(null)
  const drawToolRef   = useRef('cursor')
  const vsRef         = useRef(0)
  const veRef         = useRef(0)
  const totalLenRef   = useRef(0)
  const isDragging    = useRef(false)
  const dragData      = useRef({ x: 0, startIdx: 0, endIdx: 0 })

  // Keep refs in sync
  useEffect(() => { drawToolRef.current = drawTool }, [drawTool])
  useEffect(() => { vsRef.current = viewStart },      [viewStart])

  // Ctrl+Z undo
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z')
        setDrawings(p => p.slice(0, -1))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const handleUndo  = useCallback(() => setDrawings(p => p.slice(0, -1)), [])
  const handleClear = useCallback(() => setDrawings([]), [])

  const toggleScenario = (name) =>
    setHiddenScenarios(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!data) return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 flex items-center justify-center h-72">
      <p className="text-slate-500 text-sm">Запустите прогноз для отображения графика</p>
    </div>
  )

  const testFrom   = data.test_from_index  ?? 0
  const futureFrom = data.future_from_index ?? null
  const hasFuture  = futureFrom !== null
  const scenarios  = data.scenarios ?? []

  // ── Build flat chart data array ────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const chartData = useMemo(() => data.dates.map((d, i) => {
    const actual    = data.actual?.[i]    ?? null
    const predicted = data.predicted?.[i] ?? null
    const row = {
      date:      d,
      Реальные:  actual,
      Прогноз:   (i >= testFrom && (!hasFuture || i < futureFrom)) ? predicted : null,
      Базовый:   (hasFuture && i >= futureFrom) ? predicted : null,
    }
    if (hasFuture && scenarios.length > 0) {
      scenarios.forEach(sc => {
        const idx = i - futureFrom
        row[sc.name] = (i >= futureFrom && idx < sc.values.length) ? sc.values[idx] : null
      })
    }
    return row
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data])

  const totalLen = chartData.length

  // Reset view whenever new data arrives
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setViewStart(0)
    setViewEnd(null)
    vsRef.current       = 0
    veRef.current       = totalLen - 1
    totalLenRef.current = totalLen
  }, [data, totalLen])

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    veRef.current       = viewEnd ?? totalLen - 1
    totalLenRef.current = totalLen
  }, [viewEnd, totalLen])

  // Computed indices
  const vsIdx = viewStart
  const veIdx = viewEnd ?? totalLen - 1

  // Visible slice & derived values
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const visibleData = useMemo(
    () => chartData.slice(vsIdx, veIdx + 1),
    [chartData, vsIdx, veIdx]
  )

  // Y domain auto-scaled to visible data
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const yDomain = useMemo(() => {
    const keys = ['Реальные', 'Прогноз', 'Базовый', ...scenarios.map(s => s.name)]
    const vals  = visibleData
      .flatMap(d => keys.map(k => d[k]))
      .filter(v => v != null && isFinite(v))
    if (!vals.length) return ['auto', 'auto']
    const mn  = Math.min(...vals)
    const mx  = Math.max(...vals)
    const pad = Math.max((mx - mn) * 0.05, Math.abs(mn) * 0.005)
    return [mn - pad, mx + pad]
  }, [visibleData, scenarios])

  // X-axis ticks — at most 8 labels
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const xTicks = useMemo(() => {
    const every = Math.max(1, Math.floor(visibleData.length / 8))
    return visibleData.filter((_, i) => i % every === 0).map(d => d.date)
  }, [visibleData])

  const futureSplitDate = hasFuture ? data.dates[futureFrom] : null
  // Only show the reference line if the split date is currently visible
  const visibleFutureSplit =
    futureSplitDate && visibleData.some(d => d.date === futureSplitDate)
      ? futureSplitDate
      : null

  // Zoom % for UI indicator
  const zoomPct = Math.round(((veIdx - vsIdx + 1) / totalLen) * 100)

  // ── Wheel zoom (passive:false required to call preventDefault) ─────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const el = chartAreaRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const vs    = vsRef.current
      const ve    = veRef.current
      const len   = totalLenRef.current
      const count = ve - vs + 1

      // 12% of visible range per tick, min 5 bars
      const step   = Math.max(5, Math.round(count * 0.12))
      const zoomIn = e.deltaY < 0

      // Zoom relative to mouse cursor X position
      const rect  = el.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))

      const dL = Math.round(step * ratio)
      const dR = step - dL

      let newStart, newEnd
      if (zoomIn) {
        newStart = Math.min(vs + dL, ve - 10)
        newEnd   = Math.max(ve - dR, newStart + 10)
      } else {
        newStart = Math.max(0, vs - dL)
        newEnd   = Math.min(len - 1, ve + dR)
      }

      setViewStart(newStart)
      setViewEnd(newEnd >= len - 1 ? null : newEnd)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, []) // stable — reads values from refs

  // ── Pan drag (cursor mode only) ────────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    if (drawToolRef.current !== 'cursor' || e.button !== 0) return
    isDragging.current = true
    dragData.current   = {
      x:        e.clientX,
      startIdx: vsRef.current,
      endIdx:   veRef.current,
    }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current || drawToolRef.current !== 'cursor') return
    const el = chartAreaRef.current
    if (!el) return
    const rect        = el.getBoundingClientRect()
    const { x, startIdx, endIdx } = dragData.current
    const pixPerBar   = rect.width / Math.max(1, endIdx - startIdx + 1)
    const shift       = Math.round(-(e.clientX - x) / pixPerBar)
    const range       = endIdx - startIdx
    const len         = totalLenRef.current
    const newStart    = Math.max(0, Math.min(len - 1 - range, startIdx + shift))
    const newEnd      = newStart + range
    setViewStart(newStart)
    setViewEnd(newEnd >= len - 1 ? null : newEnd)
  }, [])

  const handleMouseUp = useCallback(() => { isDragging.current = false }, [])

  // ── Render ─────────────────────────────────────────────────────────────────
  const isCursor = drawTool === 'cursor'

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
          Рисунок 9 — Реальные vs Предсказанные значения{hasFuture && ' + сценарии'}
        </h2>
        <div className="flex items-center gap-2">
          {/* Zoom indicator + reset */}
          {zoomPct < 99 && (
            <button
              onClick={() => { setViewStart(0); setViewEnd(null) }}
              className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-all flex items-center gap-1"
              title="Сбросить масштаб"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 3v5h5M21 21v-5h-5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.05 9A9 9 0 1115 3.05" strokeLinecap="round"/>
              </svg>
              {zoomPct}%
            </button>
          )}
          {hasFuture && (
            <span className="text-xs px-2 py-1 rounded bg-emerald-900/40 border border-emerald-700 text-emerald-300">
              Прогноз с {futureSplitDate}
            </span>
          )}
        </div>
      </div>

      {/* Scenario toggles */}
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
                  hidden ? 'border-slate-700 text-slate-600' : 'border-slate-600 text-slate-300 hover:border-slate-400'
                }`}
                style={{ borderColor: hidden ? undefined : sc.color + '88' }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: hidden ? '#475569' : sc.color }} />
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

      {/* Zoom hint */}
      <p className="text-xs text-slate-600 flex items-center gap-1 -mt-1">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
        </svg>
        Колесо мыши — масштаб · Перетащи — прокрутка
      </p>

      {/* Chart + drawing overlay */}
      <div ref={containerRef} style={{ position: 'relative' }}>
        {/* Pan / wheel target */}
        <div
          ref={chartAreaRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            position: 'relative',
            cursor:   isCursor ? (isDragging.current ? 'grabbing' : 'grab') : 'default',
            userSelect: 'none',
          }}
        >
          <ChartCore
            visibleData={visibleData}
            yDomain={yDomain}
            xTicks={xTicks}
            hasFuture={hasFuture}
            futureSplitDate={visibleFutureSplit}
            scenarios={scenarios}
            hiddenScenarios={hiddenScenarios}
            showScenarios={showScenarios}
          />
          <DrawingLayer
            tool={drawTool}
            drawings={drawings}
            onDrawingsChange={setDrawings}
            containerRef={containerRef}
          />
        </div>
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
