import { useState } from 'react'

export default function TradesTable({ trades }) {
  const [expanded, setExpanded] = useState(false)

  if (!trades?.length) return null

  const shown = expanded ? trades : trades.slice(0, 5)

  return (
    <div className="px-3 pb-3">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-2 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Сделки ({trades.length})
      </button>

      {(expanded || trades.length <= 5) && (
        <div className="overflow-x-auto rounded-lg border border-slate-700/60">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/60">
                <th className="text-left px-2 py-1.5 text-slate-500 font-medium">Вход</th>
                <th className="text-left px-2 py-1.5 text-slate-500 font-medium">Выход</th>
                <th className="text-center px-2 py-1.5 text-slate-500 font-medium">Dir</th>
                <th className="text-right px-2 py-1.5 text-slate-500 font-medium">Цена вх.</th>
                <th className="text-right px-2 py-1.5 text-slate-500 font-medium">Цена вых.</th>
                <th className="text-right px-2 py-1.5 text-slate-500 font-medium">Net PnL</th>
                <th className="text-right px-2 py-1.5 text-slate-500 font-medium">Доход.%</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((t, i) => {
                const isProfit = t.net_pnl > 0
                return (
                  <tr
                    key={i}
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-2 py-1.5 text-slate-400 font-mono">{t.entry_date}</td>
                    <td className="px-2 py-1.5 text-slate-400 font-mono">{t.exit_date}</td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        t.direction === 'long'
                          ? 'bg-emerald-900/40 text-emerald-400'
                          : 'bg-red-900/40 text-red-400'
                      }`}>
                        {t.direction === 'long' ? '▲ L' : '▼ S'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-300 font-mono">
                      {t.entry_price.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-300 font-mono">
                      {t.exit_price.toFixed(2)}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-mono font-medium ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isProfit ? '+' : ''}{t.net_pnl.toFixed(2)}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-mono ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(t.return_pct * 100).toFixed(3)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!expanded && trades.length > 5 && (
            <div className="text-center py-1.5">
              <button
                onClick={() => setExpanded(true)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Показать все {trades.length} сделок ↓
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
