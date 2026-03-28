import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value ?? 0
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      <p style={{ color: val >= 0 ? '#34d399' : '#f87171' }} className="font-medium">
        Остаток: {val.toFixed(2)} pts
      </p>
    </div>
  )
}

export default function ResidualChart({ data }) {
  if (!data) return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 flex items-center justify-center h-56">
      <p className="text-slate-500 text-sm">График остатков появится после прогноза</p>
    </div>
  )

  // Downsample for performance: show max 200 bars
  const raw = data.dates.map((d, i) => ({
    date: d,
    residual: data.actual[i] - data.predicted[i],
  }))
  const step = Math.max(1, Math.floor(raw.length / 200))
  const chartData = raw.filter((_, i) => i % step === 0)

  const tickEvery = Math.max(1, Math.floor(chartData.length / 8))
  const ticks = chartData.filter((_, i) => i % tickEvery === 0).map(d => d.date)

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
        Рисунок 10 — График остатков (actual − predicted)
      </h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date" ticks={ticks}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={{ stroke: '#334155' }} tickLine={false}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={{ stroke: '#334155' }} tickLine={false}
            tickFormatter={v => v.toFixed(0)} width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
          <Bar
            dataKey="residual" maxBarSize={6}
            fill="#818cf8"
            radius={[1, 1, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
