const TOOLS = [
  {
    key: 'cursor',
    label: 'Курсор',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M5 3l14 9-7 1-4 7L5 3z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'line',
    label: 'Линия тренда',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
        <line x1="5" y1="19" x2="19" y2="5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'hline',
    label: 'Горизонталь',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
        <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: 'vline',
    label: 'Вертикаль',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
        <line x1="12" y1="3" x2="12" y2="21" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: 'rect',
    label: 'Прямоугольник',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="4" y="6" width="16" height="12" rx="1" />
      </svg>
    ),
  },
]

export default function DrawingToolbar({ tool, onToolChange, onUndo, onClear, drawingCount }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Tool buttons */}
      <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
        {TOOLS.map(t => (
          <button
            key={t.key}
            title={t.label}
            onClick={() => onToolChange(t.key)}
            className={`p-1.5 rounded transition-all ${
              tool === t.key
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {t.icon}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-700 mx-1" />

      {/* Undo */}
      <button
        title="Отменить последнее (Ctrl+Z)"
        onClick={onUndo}
        disabled={drawingCount === 0}
        className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M9 14L4 9l5-5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4 9h10.5a5.5 5.5 0 010 11H11" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Clear all */}
      <button
        title="Очистить всё"
        onClick={onClear}
        disabled={drawingCount === 0}
        className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Active tool hint */}
      {tool !== 'cursor' && (
        <span className="ml-2 text-xs text-indigo-300 bg-indigo-900/30 border border-indigo-800 px-2 py-0.5 rounded-full">
          {TOOLS.find(t => t.key === tool)?.label} — кликни на графике
        </span>
      )}

      {drawingCount > 0 && tool === 'cursor' && (
        <span className="ml-2 text-xs text-slate-500">
          {drawingCount} {drawingCount === 1 ? 'объект' : drawingCount < 5 ? 'объекта' : 'объектов'}
        </span>
      )}
    </div>
  )
}
