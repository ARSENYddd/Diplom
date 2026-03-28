import MetricCard from './MetricCard'

export default function MetricsPanel({ metrics }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
        Метрики качества
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <MetricCard metricKey="mae"  value={metrics?.mae  ?? null} />
        <MetricCard metricKey="rmse" value={metrics?.rmse ?? null} />
        <MetricCard metricKey="mape" value={metrics?.mape ?? null} />
      </div>
    </div>
  )
}
