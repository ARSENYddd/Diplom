export default function Header({ page, onNavigate }) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-4 px-6 h-[56px]
                       border-b border-[var(--border)]
                       bg-[var(--bg)]/90 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-[28px] h-[28px] rounded-[7px] flex items-center justify-center
                        text-black font-extrabold text-[13px]
                        bg-gradient-to-br from-amber-500 to-amber-400
                        shadow-[0_0_10px_rgba(245,158,11,0.35)]">
          α
        </div>
        <span className="text-[15px] font-bold text-white tracking-tight">AlphaSignal</span>
      </div>

      {/* Nav tabs */}
      <div className="flex items-center gap-0 ml-4 border-l border-[var(--border)] pl-4">
        {[
          { key: 'forecast', label: 'Прогноз' },
          { key: 'signals',  label: 'Сигналы' },
        ].map(tab => (
          <button key={tab.key} onClick={() => onNavigate(tab.key)}
            className={`px-4 py-1.5 text-[13px] font-medium rounded-lg transition-all
              ${page === tab.key
                ? 'text-amber-400 bg-amber-400/10'
                : 'text-muted hover:text-warm'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2 text-[12px] text-muted">
        <span className="px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)]">
          S&P 500 Analysis
        </span>
        <span className="px-2 py-1 rounded bg-amber-400/10 border border-amber-400/25 text-amber-400">
          МТУСИ · 2025
        </span>
      </div>
    </header>
  )
}
