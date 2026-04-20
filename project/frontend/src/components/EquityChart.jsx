import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-mono font-medium">
          {p.name}: {Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  )
}

export default function EquityChart({ equityCurve, dates, initialCapital = 10000 }) {
  const data = useMemo(() => {
    if (!equityCurve?.length || !dates?.length) return []
    const n = Math.min(equityCurve.length, dates.length)
    return Array.from({ length: n }, (_, i) => ({
      date:   dates[i],
      Equity: parseFloat(equityCurve[i].toFixed(2)),
    }))
  }, [equityCurve, dates])

  const xTicks = useMemo(() => {
    const every = Math.max(1, Math.floor(data.length / 6))
    return data.filter((_, i) => i % every === 0).map(d => d.date)
  }, [data])

  if (!data.length) return null

  const finalEquity = data[data.length - 1]?.Equity ?? initialCapital
  const totalReturn = ((finalEquity - initialCapital) / initialCapital * 100).toFixed(2)
  const isPositive  = finalEquity >= initialCapital

  return (
    <div className="px-3 pb-2">
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
          Equity Curve
        </h3>
        <span className={`text-xs font-mono font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{totalReturn}%
          <span className="text-slate-500 font-normal ml-1">({finalEquity.toFixed(0)})</span>
        </span>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 20, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date" ticks={xTicks}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#334155' }} tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#334155' }} tickLine={false}
            width={60}
            tickFormatter={v => Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Линия безубыточности */}
          <ReferenceLine
            y={initialCapital}
            stroke="#475569" strokeDasharray="4 3" strokeWidth={1}
            label={{ value: 'старт', fill: '#475569', fontSize: 9, position: 'insideRight' }}
          />
          <Line
            type="monotone" dataKey="Equity" name="Капитал"
            stroke="#818cf8" strokeWidth={2} dot={false}
            activeDot={{ r: 3, fill: '#818cf8' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
