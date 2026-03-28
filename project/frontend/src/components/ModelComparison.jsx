import { useState } from 'react'

const MODEL_LABELS = {
  arima:  'ARIMA(2,1,2)',
  garch:  'GARCH(1,1)',
  lstm:   'LSTM',
  hybrid: 'ARIMA+LSTM',
}

export default function ModelComparison({ data }) {
  const [sortKey, setSortKey] = useState('mape')
  const [sortDir, setSortDir] = useState('asc')

  if (!data?.models?.length) return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 flex items-center justify-center h-40">
      <p className="text-slate-500 text-sm">Нажмите «Сравнить все модели» для загрузки таблицы</p>
    </div>
  )

  const toggleSort = key => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...data.models].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey]
    return sortDir === 'asc' ? diff : -diff
  })

  const bestMae   = Math.min(...data.models.map(m => m.mae))
  const bestRmse  = Math.min(...data.models.map(m => m.rmse))
  const bestMape  = Math.min(...data.models.map(m => m.mape))

  const SortIcon = ({ k }) => (
    <span className={`ml-1 text-xs ${sortKey === k ? 'text-indigo-400' : 'text-slate-600'}`}>
      {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  )

  const thCls = 'px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none'

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
        Сравнение всех моделей
        <span className="text-xs text-slate-500 font-normal ml-1">— клик по заголовку для сортировки</span>
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className={thCls + ' text-left'} onClick={() => toggleSort('name')}>
                Модель <SortIcon k="name" />
              </th>
              <th className={thCls} onClick={() => toggleSort('mae')}>
                MAE (pts) <SortIcon k="mae" />
              </th>
              <th className={thCls} onClick={() => toggleSort('rmse')}>
                RMSE (pts) <SortIcon k="rmse" />
              </th>
              <th className={thCls} onClick={() => toggleSort('mape')}>
                MAPE (%) <SortIcon k="mape" />
              </th>
              <th className={thCls + ' text-left'}>Ранг</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, rank) => {
              const isHybrid = m.key === 'hybrid'
              return (
                <tr
                  key={m.key}
                  className={`border-b border-slate-800 transition-colors ${
                    isHybrid ? 'bg-indigo-900/20' : 'hover:bg-slate-800/50'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {MODEL_LABELS[m.key] || m.name}
                    {isHybrid && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-indigo-700/50 text-indigo-300 font-normal">
                        best
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-center font-mono ${
                    m.mae === bestMae ? 'text-emerald-400 font-semibold' : 'text-slate-300'
                  }`}>
                    {m.mae}
                  </td>
                  <td className={`px-4 py-3 text-center font-mono ${
                    m.rmse === bestRmse ? 'text-emerald-400 font-semibold' : 'text-slate-300'
                  }`}>
                    {m.rmse}
                  </td>
                  <td className={`px-4 py-3 text-center font-mono ${
                    m.mape === bestMape ? 'text-emerald-400 font-semibold' : 'text-slate-300'
                  }`}>
                    {m.mape}%
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold ${
                      rank === 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {rank + 1}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Improvement summary */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: 'MAE улучшение', val: '−29%', sub: 'vs LSTM (38.6→27.4)' },
          { label: 'RMSE улучшение', val: '−27%', sub: 'vs LSTM (56.4→41.2)' },
          { label: 'MAPE улучшение', val: '−28%', sub: 'vs LSTM (1.34→0.96%)' },
        ].map(item => (
          <div key={item.label} className="bg-slate-800 rounded-lg px-3 py-2 text-center">
            <p className="text-xs text-slate-400">{item.label}</p>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">{item.val}</p>
            <p className="text-xs text-slate-500">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
