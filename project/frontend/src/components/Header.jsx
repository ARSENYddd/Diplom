export default function Header() {
  return (
    <header className="bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white leading-none">Financial Forecast</h1>
          <p className="text-xs text-slate-400 mt-0.5">ARIMA · GARCH · LSTM · Hybrid</p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
        <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">S&P 500 Analysis</span>
        <span className="px-2 py-1 rounded bg-indigo-900/40 border border-indigo-700 text-indigo-300">
          Бакалаврская работа · МТУСИ
        </span>
      </div>
    </header>
  )
}
