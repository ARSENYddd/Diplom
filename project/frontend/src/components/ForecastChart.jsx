import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Brush
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value?.toFixed(2)}
        </p>
      ))}
    </div>
  )
}

export default function ForecastChart({ data }) {
  if (!data) return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 flex items-center justify-center h-72">
      <p className="text-slate-500 text-sm">Запустите прогноз для отображения графика</p>
    </div>
  )

  const chartData = data.dates.map((d, i) => ({
    date: d,
    Реальные: data.actual[i],
    Прогноз: data.predicted[i],
  }))

  // Show every Nth label to avoid crowding
  const tickEvery = Math.max(1, Math.floor(chartData.length / 12))
  const ticks = chartData
    .filter((_, i) => i % tickEvery === 0)
    .map(d => d.date)

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
        Рисунок 9 — Реальные vs Предсказанные значения
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            ticks={ticks}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
            tickFormatter={v => v.toFixed(0)}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={val => <span style={{ color: '#cbd5e1' }}>{val}</span>}
          />
          <Brush dataKey="date" height={20} stroke="#334155" fill="#0f172a" travellerWidth={8} />
          <Line
            type="monotone" dataKey="Реальные"
            stroke="#60a5fa" strokeWidth={1.5} dot={false}
            activeDot={{ r: 4, fill: '#60a5fa' }}
          />
          <Line
            type="monotone" dataKey="Прогноз"
            stroke="#f87171" strokeWidth={1.5} dot={false}
            activeDot={{ r: 4, fill: '#f87171' }}
            strokeDasharray="4 2"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
