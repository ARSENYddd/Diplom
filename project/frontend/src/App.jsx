import { useState } from 'react'
import Header from './components/Header'
import ControlPanel from './components/ControlPanel'
import ForecastChart from './components/ForecastChart'
import ResidualChart from './components/ResidualChart'
import MetricsPanel from './components/MetricsPanel'
import ModelComparison from './components/ModelComparison'
import { fetchForecast, fetchComparison } from './api/client'

export default function App() {
  const [loading, setLoading] = useState(false)
  const [forecastData, setForecastData] = useState(null)
  const [comparisonData, setComparisonData] = useState(null)
  const [error, setError] = useState(null)
  const [modelInfo, setModelInfo] = useState(null)

  const handleForecast = async (params) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchForecast(params)
      setForecastData(result)
      setModelInfo(result.model_info)
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Ошибка при выполнении прогноза')
    } finally {
      setLoading(false)
    }
  }

  const handleCompare = async (ticker, start, end) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchComparison(ticker, start, end)
      setComparisonData(result)
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Ошибка при сравнении')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />

      <main className="flex-1 p-5 grid grid-cols-[300px_1fr] gap-5">
        {/* Left sidebar */}
        <div className="space-y-4">
          <ControlPanel onForecast={handleForecast} onCompare={handleCompare} loading={loading} />

          {modelInfo && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-xs space-y-1.5">
              <p className="font-semibold text-white text-sm">Информация о модели</p>
              {Object.entries(modelInfo).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-slate-500 capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="text-slate-300 text-right font-mono">
                    {Array.isArray(v) ? v.join(', ') : String(v)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="space-y-5 min-w-0">
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300 flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <MetricsPanel metrics={forecastData?.metrics ?? null} />

          <ForecastChart data={forecastData} />

          <div className="grid grid-cols-2 gap-5">
            <ResidualChart data={forecastData} />
            <ModelComparison data={comparisonData} />
          </div>
        </div>
      </main>
    </div>
  )
}
