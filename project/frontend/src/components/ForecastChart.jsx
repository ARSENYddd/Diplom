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

// ─── Scrollbar ───────────────────────────────────────────────────────────────
function Scrollbar({ vsIdx, veIdx, totalLen, onRange }) {
  const trackRef   = useRef(null)
  const isDragging = useRef(false)
  const startState = useRef({ clientX: 0, vs: 0, range: 0 })
  const [active, setActive] = useState(false)

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

  const thumbLeft  = totalLen > 0 ? vsIdx / totalLen : 0
  const thumbWidth = totalLen > 0 ? Math.max((veIdx - vsIdx + 1) / totalLen, 0.04) : 1

  // Click on track (not thumb) → jump to position
  const onTrackMouseDown = (e) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio  = (e.clientX - rect.left) / rect.width
    const range  = veIdx - vsIdx
    const mid    = Math.round(ratio * totalLen)
    const ns     = clamp(mid - Math.round(range / 2), 0, totalLen - 1 - range)
    onRange(ns, ns + range)
  }

  // Drag the thumb
  const onThumbMouseDown = (e) => {
    e.stopPropagation()
    e.preventDefault()
    isDragging.current = true
    setActive(true)
    startState.current = { clientX: e.clientX, vs: vsIdx, range: veIdx - vsIdx }

    const onMove = (ev) => {
      if (!isDragging.current) return
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect) return
      const { clientX, vs, range } = startState.current
      const pxPerBar = rect.width / totalLen
      const shift    = Math.round((ev.clientX - clientX) / pxPerBar)
      const ns       = clamp(vs + shift, 0, totalLen - 1 - range)
      onRange(ns, ns + range)
    }

    const onUp = () => {
      isDragging.current = false
      setActive(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const isZoomed = thumbWidth < 0.99

  return (
    <div className="space-y-1">
      {/* Label */}
      <div className="flex justify-between text-[10px] text-slate-600 px-1">
        <span>◀ прокрутка</span>
        <span className="text-slate-500">
          {isZoomed
            ? `${vsIdx + 1}–${veIdx + 1} из ${totalLen}`
            : `Все ${totalLen} баров — прокрутите мышью для масштаба`}
        </span>
        <span>▶</span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onMouseDown={onTrackMouseDown}
        className="relative h-6 bg-slate-800 rounded border border-slate-700 cursor-pointer select-none"
      >
        {/* Thumb */}
        <div
          onMouseDown={onThumbMouseDown}
          title="Перетащи для прокрутки"
          className={`absolute top-0 bottom-0 rounded flex items-center justify-center group
            ${active
              ? 'bg-indigo-500 cursor-grabbing'
              : 'bg-indigo-600/70 hover:bg-indigo-500 cursor-grab'
            } border border-indigo-400/60`}
          style={{
            left:  `${thumbLeft  * 100}%`,
            width: `${thumbWidth * 100}%`,
            minWidth: 24,
            transition: active ? 'none' : 'background-color 0.15s',
          }}
        >
          {/* Grip lines — only shown when thumb is wide enough */}
          {thumbWidth > 0.08 && (
            <div className="flex gap-0.5 opacity-60 group-hover:opacity-100 pointer-events-none">
              {[0,1,2].map(i => (
                <div key={i} className="w-px h-3 bg-white/60 rounded-full" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Memoized chart core ─────────────────────────────────────────────────────
// Does NOT receive drawTool → switching tools never re-renders or re-animates the chart
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
          dataKey="date" ticks={xTicks}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: '#334155' }} tickLine={false}
        />
        <YAxis
          domain={yDomain}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: '#334155' }} tickLine={false}
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
            x={futureSplitDate} stroke="#4ade80" strokeWidth={1.5} strokeDasharray="4 2"
            label={{ value: 'Сегодня', fill: '#4ade80', fontSize: 10, position: 'insideTopRight' }}
          />
        )}

        <Line type="monotone" dataKey="Реальные"
          stroke="#60a5fa" strokeWidth={1.5} dot={false}
          activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />

        <Line type="monotone" dataKey="Прогноз"
          stroke="#f87171" strokeWidth={1.5} dot={false}
          strokeDasharray="5 2" activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />

        {hasFuture && (
          <Line type="monotone" dataKey="Базовый"
            stroke="#60a5fa" strokeWidth={2.5} dot={false}
            strokeDasharray="6 3" activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
        )}

        {hasFuture && showScenarios && scenarios.map(sc =>
          !hiddenScenarios.has(sc.name) && (
            <Line key={sc.name} type="monotone" dataKey={sc.name}
              stroke={sc.color} strokeWidth={1.5} dot={false}
              strokeDasharray="4 3" strokeOpacity={0.75}
              activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
          )
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
})

// ─── Main component ──────────────────────────────────────────────────────────
export default function ForecastChart({ data }) {
  // ── All hooks must be called unconditionally (Rules of Hooks) ──────────────
  const [drawTool,        setDrawTool]        = useState('cursor')
  const [drawings,        setDrawings]        = useState([])
  const [hiddenScenarios, setHiddenScenarios] = useState(new Set())
  const [showScenarios,   setShowScenarios]   = useState(true)
  const [viewStart,       setViewStart]       = useState(0)
  const [viewEnd,         setViewEnd]         = useState(null) // null = show all

  const containerRef = useRef(null)
  const chartAreaRef = useRef(null)
  const drawToolRef  = useRef('cursor')
  const vsRef        = useRef(0)
  const veRef        = useRef(0)
  const totalLenRef  = useRef(0)
  const isDragging   = useRef(false)
  const dragData     = useRef({ x: 0, startIdx: 0, endIdx: 0 })

  // Sync mutable refs
  useEffect(() => { drawToolRef.current = drawTool }, [drawTool])
  useEffect(() => { vsRef.current = viewStart },      [viewStart])
  useEffect(() => { veRef.current = viewEnd ?? totalLenRef.current - 1 }, [viewEnd])

  // Ctrl+Z undo
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z')
        setDrawings(p => p.slice(0, -1))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // Derive chart-level constants (safe with data=null via optional chaining)
  const testFrom   = data?.test_from_index  ?? 0
  const futureFrom = data?.future_from_index ?? null
  const hasFuture  = futureFrom !== null
  const scenarios  = data?.scenarios ?? []

  // Build unified flat data array (empty when no data)
  const chartData = useMemo(() => {
    if (!data) return []
    return data.dates.map((d, i) => {
      const actual    = data.actual?.[i]    ?? null
      const predicted = data.predicted?.[i] ?? null
      const row = {
        date:     d,
        Реальные: actual,
        Прогноз:  (i >= testFrom && (!hasFuture || i < futureFrom)) ? predicted : null,
        Базовый:  (hasFuture && i >= futureFrom) ? predicted : null,
      }
      if (hasFuture && scenarios.length > 0) {
        scenarios.forEach(sc => {
          const idx = i - futureFrom
          row[sc.name] = (i >= futureFrom && idx < sc.values.length) ? sc.values[idx] : null
        })
      }
      return row
    })
  }, [data, testFrom, futureFrom, hasFuture, scenarios])

  const totalLen = chartData.length

  // Reset view whenever new data arrives
  useEffect(() => {
    if (!data) return
    setViewStart(0)
    setViewEnd(null)
    vsRef.current       = 0
    veRef.current       = totalLen - 1
    totalLenRef.current = totalLen
  }, [data, totalLen])

  // Keep totalLenRef in sync when it changes
  useEffect(() => { totalLenRef.current = totalLen }, [totalLen])

  // Visible slice indices
  const vsIdx = viewStart
  const veIdx = viewEnd ?? Math.max(0, totalLen - 1)

  const visibleData = useMemo(
    () => chartData.slice(vsIdx, veIdx + 1),
    [chartData, vsIdx, veIdx]
  )

  // Y domain — auto-scaled to visible data
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

  // X ticks — at most 8 labels
  const xTicks = useMemo(() => {
    const every = Math.max(1, Math.floor(visibleData.length / 8))
    return visibleData.filter((_, i) => i % every === 0).map(d => d.date)
  }, [visibleData])

  // Wheel: vertical = zoom, horizontal (trackpad swipe) = pan
  useEffect(() => {
    const el = chartAreaRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const vs  = vsRef.current
      const ve  = veRef.current
      const len = totalLenRef.current
      if (len === 0) return

      // Horizontal swipe (trackpad) → pan
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const count    = ve - vs + 1
        const pxPerBar = el.getBoundingClientRect().width / Math.max(1, count)
        const shift    = Math.round(e.deltaX / pxPerBar)
        const range    = ve - vs
        const newStart = Math.max(0, Math.min(len - 1 - range, vs + shift))
        const newEnd   = newStart + range
        setViewStart(newStart)
        setViewEnd(newEnd >= len - 1 ? null : newEnd)
        return
      }

      // Vertical scroll → zoom around cursor
      const count  = ve - vs + 1
      const step   = Math.max(5, Math.round(count * 0.12))
      const zoomIn = e.deltaY < 0
      const rect   = el.getBoundingClientRect()
      const ratio  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const dL     = Math.round(step * ratio)
      const dR     = step - dL

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
  }, [])

  // Pan (drag in cursor mode)
  const handleMouseDown = useCallback((e) => {
    if (drawToolRef.current !== 'cursor' || e.button !== 0) return
    isDragging.current = true
    dragData.current   = { x: e.clientX, startIdx: vsRef.current, endIdx: veRef.current }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current || drawToolRef.current !== 'cursor') return
    const el = chartAreaRef.current
    if (!el) return
    const rect      = el.getBoundingClientRect()
    const { x, startIdx, endIdx } = dragData.current
    const pxPerBar  = rect.width / Math.max(1, endIdx - startIdx + 1)
    const shift     = Math.round(-(e.clientX - x) / pxPerBar)
    const range     = endIdx - startIdx
    const len       = totalLenRef.current
    const newStart  = Math.max(0, Math.min(len - 1 - range, startIdx + shift))
    const newEnd    = newStart + range
    setViewStart(newStart)
    setViewEnd(newEnd >= len - 1 ? null : newEnd)
  }, [])

  const handleMouseUp = useCallback(() => { isDragging.current = false }, [])

  const handleUndo  = useCallback(() => setDrawings(p => p.slice(0, -1)), [])
  const handleClear = useCallback(() => setDrawings([]), [])

  const toggleScenario = useCallback((name) => {
    setHiddenScenarios(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }, [])

  // ── Early return AFTER all hooks ───────────────────────────────────────────
  if (!data) return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 flex items-center justify-center h-72">
      <p className="text-slate-500 text-sm">Запустите прогноз для отображения графика</p>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  const futureSplitDate    = hasFuture ? data.dates[futureFrom] : null
  const visibleFutureSplit = futureSplitDate && visibleData.some(d => d.date === futureSplitDate)
    ? futureSplitDate : null
  const zoomPct = totalLen > 0 ? Math.round(((veIdx - vsIdx + 1) / totalLen) * 100) : 100

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
          Рисунок 9 — Реальные vs Предсказанные значения{hasFuture && ' + сценарии'}
        </h2>
        <div className="flex items-center gap-2">
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
              <button key={sc.name} onClick={() => toggleScenario(sc.name)}
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
        tool={drawTool} onToolChange={setDrawTool}
        onUndo={handleUndo} onClear={handleClear}
        drawingCount={drawings.length}
      />

      {/* Hint */}
      <p className="text-xs text-slate-600 flex items-center gap-1">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
        </svg>
        Колесо / щипок — масштаб · Свайп двумя пальцами или перетащи — прокрутка
      </p>

      {/* Chart area */}
      <div ref={containerRef} style={{ position: 'relative' }}>
        <div
          ref={chartAreaRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ position: 'relative', userSelect: 'none',
            cursor: drawTool === 'cursor' ? 'grab' : 'default' }}
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
            tool={drawTool} drawings={drawings}
            onDrawingsChange={setDrawings} containerRef={containerRef}
          />
        </div>
      </div>

      {/* Scrollbar */}
      {totalLen > 0 && (
        <Scrollbar
          vsIdx={vsIdx} veIdx={veIdx} totalLen={totalLen}
          onRange={(s, e) => { setViewStart(s); setViewEnd(e >= totalLen - 1 ? null : e) }}
        />
      )}

      {/* Legend */}
      <div className="flex gap-4 flex-wrap text-xs text-slate-500">
        <span><span className="text-blue-400">━</span> Реальные цены</span>
        <span><span className="text-red-400">╌</span> Прогноз (бэктест)</span>
        {hasFuture && <span><span className="text-blue-400">╌ ╌</span> Базовый сценарий</span>}
        {hasFuture && scenarios.length > 0 && (
          <span>
            <span className="text-red-400">╌</span><span className="text-orange-400">╌</span>
            <span className="text-green-400">╌</span><span className="text-emerald-400">╌</span>
            {' '}Сценарии: медвежий → бычий
          </span>
        )}
        <span className="ml-auto text-slate-600">↑ Инструменты рисования</span>
      </div>
    </div>
  )
}
