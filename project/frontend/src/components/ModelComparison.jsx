import { useState } from 'react'

const MODEL_META = {
  arima:         { label: 'ARIMA',            color: '#94a3b8', tier: 'Базовые' },
  garch:         { label: 'GARCH(1,1)',        color: '#94a3b8', tier: 'Базовые' },
  lstm:          { label: 'LSTM',             color: '#60a5fa', tier: 'Нейросетевые' },
  arima_lstm:    { label: 'ARIMA+LSTM',       color: '#818cf8', tier: 'Гибридные' },
  arima_gru:     { label: 'ARIMA+GRU',        color: '#a78bfa', tier: 'Гибридные' },
  garch_lstm:    { label: 'GARCH+LSTM',       color: '#c084fc', tier: 'Гибридные' },
  triple_hybrid: { label: 'ARIMA+GARCH+LSTM', color: '#f472b6', tier: 'Продвинутые' },
  ensemble:      { label: 'Ансамбль',         color: '#4ade80', tier: 'Продвинутые' },
}

export default function ModelComparison({ data }) {
  const [sortKey, setSortKey] = useState('mape')
  const [sortDir, setSortDir] = useState('asc')

  if (!data?.models?.length) return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 flex items-center justify-center h-40">
      <p className="text-slate-500 text-sm">Нажмите «Сравнить все модели»</p>
    </div>
  )

  const toggleSort = key => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...data.models].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey]
    if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
    return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
  })

  const bestMae   = Math.min(...data.models.map(m => m.mae))
  const bestRmse  = Math.min(...data.models.map(m => m.rmse))
  const bestMape  = Math.min(...data.models.map(m => m.mape))
  const worstMape = Math.max(...data.models.map(m => m.mape))
  const mapeRange = worstMape - bestMape || 1

  const SortIcon = ({ k }) => (
    <span className={`ml-1 text-xs ${sortKey === k ? 'text-indigo-400' : 'text-slate-600'}`}>
      {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  )

  const thCls = 'px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none'

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
        Сравнение моделей
        <span className="text-xs text-slate-500 font-normal ml-1">↕ по заголовку</span>
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className={thCls + ' text-left'} onClick={() => toggleSort('name')}>Модель <SortIcon k="name" /></th>
              <th className={thCls} onClick={() => toggleSort('mae')}>MAE <SortIcon k="mae" /></th>
              <th className={thCls} onClick={() => toggleSort('rmse')}>RMSE <SortIcon k="rmse" /></th>
              <th className={thCls + ' min-w-[140px]'} onClick={() => toggleSort('mape')}>MAPE% <SortIcon k="mape" /></th>
              <th className={thCls + ' text-left'}>Ранг</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, rank) => {
              const meta = MODEL_META[m.key] ?? { label: m.name, color: '#94a3b8', tier: '—' }
              const isTop = rank === 0
              const barPct = Math.max(5, (1 - (m.mape - bestMape) / mapeRange) * 100)
              const barColor = m.mape === bestMape ? '#4ade80'
                             : m.mape <= bestMape * 1.15 ? '#a3e635'
                             : m.mape <= bestMape * 1.4  ? '#facc15'
                             : '#f87171'
              return (
                <tr key={m.key} className={`border-b border-slate-800/70 transition-colors ${
                  isTop ? 'bg-emerald-900/10' : 'hover:bg-slate-800/40'
                }`}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                      <div>
                        <span className="font-medium text-white text-xs">{meta.label}</span>
                        <div className="text-[10px] text-slate-500">{meta.tier}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-3 py-2.5 text-center font-mono text-xs ${m.mae === bestMae ? 'text-emerald-400 font-semibold' : 'text-slate-300'}`}>
                    {m.mae}
                  </td>
                  <td className={`px-3 py-2.5 text-center font-mono text-xs ${m.rmse === bestRmse ? 'text-emerald-400 font-semibold' : 'text-slate-300'}`}>
                    {m.rmse}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs w-12 text-right flex-shrink-0 ${m.mape === bestMape ? 'text-emerald-400 font-semibold' : 'text-slate-300'}`}>
                        {m.mape}%
                      </span>
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${barPct}%`, background: barColor, opacity: 0.85 }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold ${
                      rank === 0 ? 'bg-yellow-500/20 text-yellow-400'
                    : rank === 1 ? 'bg-slate-300/10 text-slate-400'
                    : rank === 2 ? 'bg-orange-800/20 text-orange-500'
                    : 'bg-slate-800 text-slate-600'
                    }`}>{rank + 1}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Improvement summary vs LSTM baseline */}
      {data.models.length >= 2 && (() => {
        const base = data.models.find(m => m.key === 'lstm') ?? data.models[0]
        const best = [...data.models].sort((a, b) => a.mape - b.mape)[0]
        const pct = v => base[v] > 0 ? ((base[v] - best[v]) / base[v] * 100).toFixed(0) : '—'
        return (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'MAE',  val: `−${pct('mae')}%`,  sub: `LSTM→${best.key}` },
              { label: 'RMSE', val: `−${pct('rmse')}%`, sub: `${base.rmse}→${best.rmse}` },
              { label: 'MAPE', val: `−${pct('mape')}%`, sub: `${base.mape}→${best.mape}%` },
            ].map(item => (
              <div key={item.label} className="bg-slate-800 rounded-lg px-3 py-2 text-center">
                <p className="text-xs text-slate-400">{item.label} улучшение</p>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">{item.val}</p>
                <p className="text-xs text-slate-500">{item.sub}</p>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
