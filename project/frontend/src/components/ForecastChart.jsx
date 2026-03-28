import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Brush, ReferenceLine
} from 'recharts'

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
  if (!data) return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 flex items-center justify-center h-72">
      <p className="text-slate-500 text-sm">Запустите прогноз для отображения графика</p>
    </div>
  )

  const futureFrom = data.future_from_index ?? null
  const isFutureMode = futureFrom !== null

  const chartData = data.dates.map((d, i) => ({
    date: d,
    Реальные: data.actual?.[i] ?? null,
    Прогноз: (!isFutureMode || i < futureFrom) ? (data.predicted?.[i] ?? null) : null,
    Будущее: (isFutureMode && i >= futureFrom) ? (data.predicted?.[i] ?? null) : null,
  }))

  // First date of future section for reference line
  const futureSplitDate = isFutureMode ? data.dates[futureFrom] : null

  const tickEvery = Math.max(1, Math.floor(chartData.length / 12))
  const ticks = chartData.filter((_, i) => i % tickEvery === 0).map(d => d.date)

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
          {isFutureMode ? 'Прогноз в будущее' : 'Рисунок 9 — Реальные vs Предсказанные'}
        </h2>
        {isFutureMode && (
          <span className="text-xs px-2 py-1 rounded bg-emerald-900/40 border border-emerald-700 text-emerald-300">
            Прогноз с {futureSplitDate}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={300}>
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
            tickFormatter={v => v.toFixed(0)} width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={val => <span style={{ color: '#cbd5e1' }}>{val}</span>}
          />
          <Brush dataKey="date" height={20} stroke="#334155" fill="#0f172a" travellerWidth={8} />

          {futureSplitDate && (
            <ReferenceLine
              x={futureSplitDate} stroke="#4ade80" strokeDasharray="4 2"
              label={{ value: 'Сегодня', fill: '#4ade80', fontSize: 10, position: 'top' }}
            />
          )}

          <Line
            type="monotone" dataKey="Реальные"
            stroke="#60a5fa" strokeWidth={1.5} dot={false}
            activeDot={{ r: 4 }} connectNulls={false}
          />
          {!isFutureMode && (
            <Line
              type="monotone" dataKey="Прогноз"
              stroke="#f87171" strokeWidth={1.5} dot={false}
              strokeDasharray="4 2" activeDot={{ r: 4 }} connectNulls={false}
            />
          )}
          {isFutureMode && (
            <Line
              type="monotone" dataKey="Будущее"
              stroke="#4ade80" strokeWidth={2} dot={false}
              strokeDasharray="6 3" activeDot={{ r: 5 }} connectNulls={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      {isFutureMode && (
        <p className="text-xs text-slate-500 mt-2 text-center">
          Синяя линия — исторические данные · Зелёная — прогноз модели
        </p>
      )}
    </div>
  )
}
