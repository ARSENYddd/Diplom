import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceDot,
} from 'recharts'
import DrawingLayer from './DrawingLayer'
import DrawingToolbar from './DrawingToolbar'
import { IconBear, IconBull, IconLineDown, IconLineFlat, IconLineUp } from './Icons'

// ─── Tooltip ────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs shadow-xl max-w-[220px]">
      <p className="text-muted mb-1 font-medium">{label}</p>
      {payload.map(p => p.value != null && (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  )
}

const SCENARIO_LABELS = {
  'Медвежий':      { icon: <IconBear     size={14}/>, desc: 'Негативный сценарий' },
  'Умеренный':     { icon: <IconLineDown size={14}/>, desc: 'Умеренное снижение'  },
  'Базовый':       { icon: <IconLineFlat size={14}/>, desc: 'Базовый прогноз'     },
  'Оптимистичный': { icon: <IconLineUp   size={14}/>, desc: 'Умеренный рост'      },
  'Бычий':         { icon: <IconBull     size={14}/>, desc: 'Позитивный сценарий' },
}

// ─── Scrollbar (нативный range slider + zoom buttons) ───────────────────────
function Scrollbar({ vsIdx, veIdx, totalLen, onRange, onZoom }) {
  const range    = veIdx - vsIdx
  const maxStart = Math.max(0, totalLen - 1 - range)
  const isZoomed = range < totalLen - 1
  const pct      = totalLen > 0 ? Math.round((range + 1) / totalLen * 100) : 100

  return (
    <div className="px-1 space-y-0.5">
      {/* Info row */}
      <div className="flex justify-between text-[10px] text-muted/60">
        <span>{`${vsIdx + 1} – ${veIdx + 1}`}</span>
        <span>{`из ${totalLen} баров (${pct}%)`}</span>
      </div>

      {/* Slider + zoom buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onZoom('out')}
          disabled={!isZoomed}
          className="flex-shrink-0 w-6 h-6 rounded bg-[var(--surface)] border border-[var(--border)] text-muted
                     hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-default
                     flex items-center justify-center text-sm font-bold transition-all"
          title="Уменьшить масштаб"
        >−</button>

        <input
          type="range"
          min={0}
          max={Math.max(maxStart, 1)}
          step={1}
          value={vsIdx}
          onChange={e => {
            const ns = parseInt(e.target.value, 10)
            onRange(ns, ns + range)
          }}
          className="flex-1 h-2 cursor-pointer"
          style={{ accentColor: '#f59e0b' }}
        />

        <button
          onClick={() => onZoom('in')}
          disabled={range <= 10}
          className="flex-shrink-0 w-6 h-6 rounded bg-[var(--surface)] border border-[var(--border)] text-muted
                     hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-default
                     flex items-center justify-center text-sm font-bold transition-all"
          title="Увеличить масштаб"
        >+</button>
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
  compact,
  signalDots,  // массив { date, price, type } — только BUY/SELL в видимом диапазоне
}) {
  return (
    <ResponsiveContainer width="100%" height={compact ? 280 : 380}>
      <ComposedChart data={visibleData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2418" />
        <XAxis
          dataKey="date" ticks={xTicks}
          tick={{ fill: '#7a6a4a', fontSize: 11 }}
          axisLine={{ stroke: '#2a2418' }} tickLine={false}
        />
        <YAxis
          domain={yDomain}
          tick={{ fill: '#7a6a4a', fontSize: 11 }}
          axisLine={{ stroke: '#2a2418' }} tickLine={false}
          tickFormatter={v => Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'k' : Number(v).toFixed(0)}
          width={68}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={val => <span style={{ color: '#e8d5a3' }}>{val}</span>}
        />

        {futureSplitDate && (
          <ReferenceLine
            x={futureSplitDate} stroke="#4ade80" strokeWidth={1.5} strokeDasharray="4 2"
            label={{ value: 'Сегодня', fill: '#4ade80', fontSize: 10, position: 'insideTopRight' }}
          />
        )}

        <Line type="monotoneX" dataKey="Реальные"
          stroke="#e8d5a3" strokeWidth={2} dot={false}
          activeDot={{ r: 4, fill: '#e8d5a3' }} connectNulls={true} isAnimationActive={false} />

        <Line type="linear" dataKey="Прогноз"
          stroke="#f59e0b" strokeWidth={2} dot={false}
          strokeDasharray="6 3" activeDot={{ r: 4, fill: '#f59e0b' }} connectNulls={true} isAnimationActive={false} />

        {hasFuture && (
          <Line type="linear" dataKey="Базовый"
            stroke="#f59e0b" strokeWidth={2.5} dot={false}
            activeDot={{ r: 5, fill: '#f59e0b' }} connectNulls={true} isAnimationActive={false} />
        )}

        {hasFuture && showScenarios && scenarios.map(sc =>
          !hiddenScenarios.has(sc.name) && (
            <Line key={sc.name} type="linear" dataKey={sc.name}
              stroke={sc.color} strokeWidth={1.5} dot={false}
              strokeDasharray="4 3" strokeOpacity={0.7}
              activeDot={{ r: 4 }} connectNulls={true} isAnimationActive={false} />
          )
        )}

        {/* Маркеры торговых сигналов BUY / SELL */}
        {signalDots?.map((dot, i) => (
          <ReferenceDot
            key={i}
            x={dot.date}
            y={dot.price}
            r={6}
            fill={dot.type === 'BUY' ? '#22c55e' : '#ef4444'}
            stroke={dot.type === 'BUY' ? '#16a34a' : '#dc2626'}
            strokeWidth={2}
            label={{
              value: dot.type === 'BUY' ? '▲' : '▼',
              position: dot.type === 'BUY' ? 'top' : 'bottom',
              fill: dot.type === 'BUY' ? '#22c55e' : '#ef4444',
              fontSize: 10,
            }}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  )
})

// ─── Main component ──────────────────────────────────────────────────────────
export default function ForecastChart({ data, compact = false, signals = null }) {
  // ── All hooks must be called unconditionally (Rules of Hooks) ──────────────
  const [drawTool,        setDrawTool]        = useState('cursor')
  const [drawings,        setDrawings]        = useState([])
  const [hiddenScenarios, setHiddenScenarios] = useState(new Set())
  const [showScenarios,   setShowScenarios]   = useState(true)
  const [showSignals,     setShowSignals]     = useState(true)  // toggle сигналов BUY/SELL
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

      // "Прогноз" extends ONE point into the future zone so it bridges
      // the gap between backtest line and "Базовый" future line.
      const isFutureZone = hasFuture && i >= futureFrom
      const row = {
        date:     d,
        Реальные: actual,
        Прогноз:  (i >= testFrom && (!hasFuture || i <= futureFrom)) ? predicted : null,
        Базовый:  isFutureZone ? predicted : null,
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

  // Reset view whenever new data arrives — start zoomed to last 80% so scrollbar is usable
  useEffect(() => {
    if (!data || totalLen === 0) return
    const defaultRange = Math.max(20, Math.round(totalLen * 0.8))
    const startIdx     = Math.max(0, totalLen - defaultRange)
    setViewStart(startIdx)
    setViewEnd(totalLen - 1)
    vsRef.current       = startIdx
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

  // Точки сигналов BUY/SELL — только видимый диапазон, только если toggle включён
  const signalDots = useMemo(() => {
    if (!signals?.dates?.length || !showSignals) return []
    // Строим Map { date → { price, type } } только для BUY/SELL
    const sigMap = new Map()
    signals.dates.forEach((d, i) => {
      const type = signals.signals?.[i]
      if (type === 'BUY' || type === 'SELL') {
        sigMap.set(d, { price: signals.actual?.[i] ?? null, type })
      }
    })
    if (!sigMap.size) return []
    // Фильтруем по visibleData — автоматически учитывает vsIdx/veIdx
    return visibleData
      .filter(row => sigMap.has(row.date))
      .map(row => {
        const sig = sigMap.get(row.date)
        return {
          date:  row.date,
          price: sig.price ?? row['Реальные'],  // fallback на реальную цену из chartData
          type:  sig.type,
        }
      })
  }, [signals, showSignals, visibleData])

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

  // Zoom via buttons
  const handleZoom = useCallback((dir) => {
    const vs  = vsRef.current
    const ve  = veRef.current
    const len = totalLenRef.current
    if (len === 0) return
    const count = ve - vs + 1
    const step  = Math.max(5, Math.round(count * 0.15))
    let newStart, newEnd
    if (dir === 'in') {
      newStart = Math.min(vs + step, ve - 10)
      newEnd   = Math.max(ve - step, newStart + 10)
    } else {
      newStart = Math.max(0, vs - step)
      newEnd   = Math.min(len - 1, ve + step)
    }
    setViewStart(newStart)
    setViewEnd(newEnd >= len - 1 ? null : newEnd)
  }, [])

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
    <div className={`flex items-center justify-center ${compact ? 'h-48' : 'bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 h-72'}`}>
      <p className="text-muted text-sm">Запустите прогноз для отображения графика</p>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  const futureSplitDate    = hasFuture ? data.dates[futureFrom] : null
  const visibleFutureSplit = futureSplitDate && visibleData.some(d => d.date === futureSplitDate)
    ? futureSplitDate : null
  const zoomPct = totalLen > 0 ? Math.round(((veIdx - vsIdx + 1) / totalLen) * 100) : 100

  return (
    <div className={`space-y-2 ${compact ? '' : 'bg-slate-900 border border-slate-700 rounded-xl p-5'}`}>

      {/* Header — only in standalone mode */}
      {!compact && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            Реальные vs Предсказанные значения{hasFuture && ' + сценарии'}
          </h2>
          <div className="flex items-center gap-2">
            {zoomPct < 99 && (
              <button
                onClick={() => { setViewStart(0); setViewEnd(totalLen - 1) }}
                className="text-xs px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-muted hover:text-white hover:border-slate-500 transition-all flex items-center gap-1"
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
      )}

      {/* Scenario toggles + signals toggle */}
      {(hasFuture && scenarios.length > 0 || signals) && (
        <div className="flex items-center gap-2 flex-wrap">

          {/* Сценарии */}
          {hasFuture && scenarios.length > 0 && (
            <>
              <span className="text-xs text-muted">Сценарии:</span>
              <button
                onClick={() => setShowScenarios(v => !v)}
                className={`text-xs px-2 py-0.5 rounded border transition-all ${
                  showScenarios
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                    : 'border-slate-600 text-muted hover:border-slate-500'
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
                      hidden ? 'border-slate-700 text-muted/60' : 'border-slate-600 text-slate-300 hover:border-slate-400'
                    }`}
                    style={{ borderColor: hidden ? undefined : sc.color + '88' }}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: hidden ? '#475569' : sc.color }} />
                    <span className="inline-flex items-center gap-1">{meta.icon} {sc.name}</span>
                  </button>
                )
              })}
              {/* Разделитель если есть и сценарии и сигналы */}
              {signals && <span className="text-slate-700 text-xs">|</span>}
            </>
          )}

          {/* Кнопка сигналов BUY/SELL */}
          {signals && (
            <button
              onClick={() => setShowSignals(v => !v)}
              className={`text-xs px-2 py-0.5 rounded border transition-all flex items-center gap-1.5 ${
                showSignals
                  ? 'bg-emerald-900/30 border-emerald-700/60 text-emerald-300'
                  : 'border-slate-600 text-muted hover:border-slate-500'
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${showSignals ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              Сигналы
            </button>
          )}
        </div>
      )}

      {/* Drawing toolbar */}
      <DrawingToolbar
        tool={drawTool} onToolChange={setDrawTool}
        onUndo={handleUndo} onClear={handleClear}
        drawingCount={drawings.length}
      />

      {/* Hint */}
      <p className="text-xs text-muted/60 flex items-center gap-1">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
        </svg>
        Колесо / щипок / кнопки ± — масштаб · Ползунок / свайп / перетаскивание — прокрутка
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
            compact={compact}
            signalDots={signalDots}
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
          onZoom={handleZoom}
        />
      )}

      {/* Legend */}
      <div className="flex gap-4 flex-wrap text-xs text-muted">
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
        {/* Легенда сигналов — только если бэктест вернул данные */}
        {signals && showSignals && (
          <>
            <span><span className="text-green-400">●</span> BUY сигнал</span>
            <span><span className="text-red-400">●</span> SELL сигнал</span>
          </>
        )}
        <span className="ml-auto text-muted/60">↑ Инструменты рисования</span>
      </div>
    </div>
  )
}
