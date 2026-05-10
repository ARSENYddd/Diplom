import { IconWarning } from './Icons'

function MetricCard({ label, value, sub, color = 'text-white', warn }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-lg px-3 py-2 min-w-[100px]">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-base font-mono font-semibold ${color}`}>{value}</p>
      {sub  && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
      {warn && (
        <p className="text-[10px] text-amber-500 mt-0.5 flex items-center gap-1">
          <IconWarning size={11}/> {warn}
        </p>
      )}
    </div>
  )
}

export default function TradingMetricsCards({ metrics, warning }) {
  if (!metrics) return null

  const { sharpe, max_drawdown, winrate, profit_factor,
          n_trades, total_return, insufficient_trades, low_confidence } = metrics

  const fmtPct = v => v != null ? (v * 100).toFixed(2) + '%' : '—'
  const fmtN   = v => v != null ? v.toFixed(3) : '—'

  const sharpeColor = sharpe > 1 ? 'text-emerald-400' : sharpe > 0 ? 'text-yellow-400' : 'text-red-400'
  const ddColor     = max_drawdown > -0.1 ? 'text-emerald-400' : max_drawdown > -0.2 ? 'text-yellow-400' : 'text-red-400'
  const retColor    = total_return > 0 ? 'text-emerald-400' : 'text-red-400'
  const wrColor     = winrate > 0.5 ? 'text-emerald-400' : winrate > 0.4 ? 'text-yellow-400' : 'text-red-400'

  const confidenceWarn = insufficient_trades ? 'мало сделок' : low_confidence ? 'Sharpe ненадёжен' : null

  return (
    <div className="px-3 py-2 space-y-2">
      {/* Предупреждения */}
      {warning && (
        <div className="px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/50 text-xs text-amber-300">
          {warning}
        </div>
      )}

      {/* Карточки */}
      <div className="flex flex-wrap gap-2">
        <MetricCard
          label="Sharpe"
          value={fmtN(sharpe)}
          color={sharpeColor}
          warn={confidenceWarn}
        />
        <MetricCard
          label="Max Drawdown"
          value={fmtPct(max_drawdown)}
          color={ddColor}
        />
        <MetricCard
          label="Win Rate"
          value={fmtPct(winrate)}
          color={wrColor}
        />
        <MetricCard
          label="Profit Factor"
          value={fmtN(profit_factor)}
          color={profit_factor > 1 ? 'text-emerald-400' : 'text-red-400'}
        />
        <MetricCard
          label="Сделок"
          value={n_trades ?? '—'}
          sub={insufficient_trades ? 'недостаточно' : undefined}
          color={n_trades > 0 ? 'text-white' : 'text-slate-500'}
        />
        <MetricCard
          label="Total Return"
          value={fmtPct(total_return)}
          color={retColor}
        />
      </div>
    </div>
  )
}
