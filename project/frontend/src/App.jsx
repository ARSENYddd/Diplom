import { useState } from 'react'
import Header from './components/Header'
import ChartPanel from './components/ChartPanel'
import SignalsPage from './components/SignalsPage'
import LandingPage from './components/LandingPage'

let nextId = 2

export default function App() {
  const [page,   setPage]   = useState('landing')
  const [panels, setPanels] = useState([
    { id: 1, defaults: { ticker: '^GSPC', model: 'arima_lstm', start: '2018-01-01', end: '2024-01-01' } },
  ])
  const [layout, setLayout] = useState('single')

  // Show landing page
  if (page === 'landing') {
    return <LandingPage onLaunch={() => setPage('forecast')} />
  }

  const addPanel = (defaults = {}) => {
    setPanels(prev => [...prev, { id: nextId++, defaults }])
    if (panels.length >= 1) setLayout('double')
    if (panels.length >= 2) setLayout('triple')
  }

  const removePanel = (id) => {
    setPanels(prev => {
      const next = prev.filter(p => p.id !== id)
      if (next.length <= 1) setLayout('single')
      else if (next.length <= 2) setLayout('double')
      return next
    })
  }

  const gridClass =
    layout === 'triple' ? 'grid grid-cols-2 gap-4' :
    layout === 'double' ? 'grid grid-cols-2 gap-4' :
    'flex flex-col'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Header page={page} onNavigate={setPage} />

      {/* Forecast toolbar */}
      {page === 'forecast' && (
        <div className="px-4 py-2 border-b border-[var(--border)] flex items-center gap-3">
          <span className="text-[12px] text-muted">Панели:</span>
          <span className="text-[12px] font-medium text-white">{panels.length}</span>
          <div className="flex-1" />

          {panels.length > 1 && (
            <div className="flex items-center gap-1 bg-[var(--surface)] rounded-lg p-1 border border-[var(--border)]">
              {[
                { key: 'double', icon: (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="1" y="1" width="6" height="14" rx="1"/><rect x="9" y="1" width="6" height="14" rx="1"/>
                  </svg>
                ), title: '2 колонки' },
                { key: 'single', icon: (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="1" y="1" width="14" height="14" rx="1"/>
                  </svg>
                ), title: 'Одна колонка' },
              ].map(({ key, icon, title }) => (
                <button key={key} title={title} onClick={() => setLayout(key)}
                  className={`p-1.5 rounded transition-all
                    ${layout === key
                      ? 'bg-amber-400/20 text-amber-400'
                      : 'text-muted hover:text-warm'}`}>
                  {icon}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted">Добавить график:</span>
            {[
              { label: 'S&P 500',  defaults: { ticker: '^GSPC',   model: 'arima_lstm',    start: '2018-01-01', end: '2024-01-01' } },
              { label: 'SBER.ME',  defaults: { ticker: 'SBER.ME', model: 'arima_lstm',    start: '2018-01-01', end: '2024-01-01' } },
              { label: 'LKOH.ME', defaults: { ticker: 'LKOH.ME', model: 'triple_hybrid', start: '2018-01-01', end: '2024-01-01' } },
              { label: 'Brent',    defaults: { ticker: 'BZ=F',   model: 'garch',          start: '2018-01-01', end: '2024-01-01' } },
              { label: 'Пустой',   defaults: {} },
            ].map(({ label, defaults }) => (
              <button key={label} onClick={() => addPanel(defaults)}
                className="text-[12px] px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)]
                           text-muted hover:border-amber-400/50 hover:text-warm transition-all">
                + {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Signals page */}
      {page === 'signals' && (
        <main className="flex-1"><SignalsPage /></main>
      )}

      {/* Forecast panels */}
      {page === 'forecast' && (
        <main className="flex-1 p-4">
          <div className={gridClass}>
            {panels.map(p => (
              <ChartPanel key={p.id} panelId={p.id}
                defaultParams={p.defaults}
                onRemove={panels.length > 1 ? () => removePanel(p.id) : null} />
            ))}
          </div>
        </main>
      )}
    </div>
  )
}
