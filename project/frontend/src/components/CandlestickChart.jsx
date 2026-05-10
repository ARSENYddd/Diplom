import { useEffect, useRef, useState } from 'react'
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts'
import { fetchOHLCV } from '../api/client'
import {
  computeMA,
  computeBollingerBands,
  computeRSI,
  computeVolume,
} from '../utils/indicators'

// ── Chart theme matching the app dark palette ───────────────────────────────
const CHART_THEME = {
  layout: {
    background: { color: '#0f172a' },
    textColor: '#94a3b8',
    fontSize: 11,
  },
  grid: {
    vertLines: { color: '#1e293b' },
    horzLines: { color: '#1e293b' },
  },
  crosshair: { mode: CrosshairMode.Normal },
  rightPriceScale: { borderColor: '#334155' },
  timeScale: {
    borderColor: '#334155',
    timeVisible: true,
    secondsVisible: false,
  },
}

const DEFAULT_INDICATORS = {
  ma20:   true,
  ma50:   true,
  ma200:  false,
  bb:     false,
  rsi:    false,
  volume: true,
}

export default function CandlestickChart({ ticker, start, end, interval = '1d' }) {
  const mainRef     = useRef(null)
  const rsiRef      = useRef(null)
  const chartRef    = useRef(null)
  const rsiChartRef = useRef(null)

  const [ohlcv,      setOhlcv]      = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [indicators, setIndicators] = useState(DEFAULT_INDICATORS)

  // ── Fetch OHLCV whenever params change ─────────────────────────────────
  useEffect(() => {
    if (!ticker || !start || !end) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setOhlcv(null)
    fetchOHLCV(ticker, start, end, interval)
      .then(data  => { if (!cancelled) setOhlcv(data.ohlcv) })
      .catch(e    => { if (!cancelled) setError(e.response?.data?.detail ?? e.message ?? 'Ошибка загрузки данных') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [ticker, start, end, interval])

  // ── Build / rebuild charts whenever ohlcv data or indicators change ────
  useEffect(() => {
    if (!ohlcv || !mainRef.current) return

    // Destroy old instances
    if (chartRef.current)    { chartRef.current.remove();    chartRef.current    = null }
    if (rsiChartRef.current) { rsiChartRef.current.remove(); rsiChartRef.current = null }

    // ── Main chart ────────────────────────────────────────────────────────
    const mainHeight = indicators.rsi ? 280 : 380
    const chart = createChart(mainRef.current, {
      ...CHART_THEME,
      width:  mainRef.current.clientWidth,
      height: mainHeight,
    })
    chartRef.current = chart

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor:         '#4ade80',
      downColor:       '#f87171',
      borderUpColor:   '#4ade80',
      borderDownColor: '#f87171',
      wickUpColor:     '#4ade80',
      wickDownColor:   '#f87171',
    })
    candleSeries.setData(ohlcv)

    // Volume histogram — separate price scale at bottom 20%
    if (indicators.volume) {
      const volSeries = chart.addHistogramSeries({
        color:        '#26a69a',
        priceFormat:  { type: 'volume' },
        priceScaleId: 'volume',
      })
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      })
      volSeries.setData(computeVolume(ohlcv))
    }

    // Close price array for indicators
    const closes = ohlcv.map(d => ({ time: d.time, value: d.close }))

    // MA lines
    const maConfig = [
      { key: 'ma20',  period: 20,  color: '#f59e0b' },
      { key: 'ma50',  period: 50,  color: '#60a5fa' },
      { key: 'ma200', period: 200, color: '#c084fc' },
    ]
    for (const { key, period, color } of maConfig) {
      if (!indicators[key]) continue
      chart.addLineSeries({
        color,
        lineWidth: 1,
        title: `MA${period}`,
        lastValueVisible: true,
        priceLineVisible: false,
      }).setData(computeMA(closes, period))
    }

    // Bollinger Bands
    if (indicators.bb) {
      const bb = computeBollingerBands(closes, 20, 2)
      const bbOpts = {
        lineWidth:        1,
        lineStyle:        LineStyle.Dashed,
        lastValueVisible: false,
        priceLineVisible: false,
      }
      chart.addLineSeries({ ...bbOpts, color: '#60a5fa', title: 'BB Upper' }).setData(bb.upper)
      chart.addLineSeries({ ...bbOpts, color: '#475569', title: 'BB Mid'   }).setData(bb.middle)
      chart.addLineSeries({ ...bbOpts, color: '#60a5fa', title: 'BB Lower' }).setData(bb.lower)
    }

    chart.timeScale().fitContent()

    // ── RSI sub-chart ─────────────────────────────────────────────────────
    if (indicators.rsi && rsiRef.current) {
      const rsiChart = createChart(rsiRef.current, {
        ...CHART_THEME,
        width:  rsiRef.current.clientWidth,
        height: 120,
        timeScale: { ...CHART_THEME.timeScale, visible: false },
        rightPriceScale: {
          ...CHART_THEME.rightPriceScale,
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
      })
      rsiChartRef.current = rsiChart

      rsiChart.addLineSeries({
        color: '#f59e0b', lineWidth: 1, title: 'RSI(14)',
        lastValueVisible: true, priceLineVisible: false,
      }).setData(computeRSI(closes, 14))

      // Overbought / oversold reference lines
      const refTimes = closes.map(d => d.time)
      rsiChart.addLineSeries({
        color: '#f87171', lineWidth: 1, lineStyle: LineStyle.Dashed,
        lastValueVisible: false, priceLineVisible: false,
      }).setData(refTimes.map(t => ({ time: t, value: 70 })))

      rsiChart.addLineSeries({
        color: '#4ade80', lineWidth: 1, lineStyle: LineStyle.Dashed,
        lastValueVisible: false, priceLineVisible: false,
      }).setData(refTimes.map(t => ({ time: t, value: 30 })))

      rsiChart.timeScale().fitContent()

      // Sync scroll/zoom between main and RSI charts
      let syncing = false
      chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (syncing || !range) return
        syncing = true
        rsiChart.timeScale().setVisibleLogicalRange(range)
        syncing = false
      })
      rsiChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (syncing || !range) return
        syncing = true
        chart.timeScale().setVisibleLogicalRange(range)
        syncing = false
      })
    }

    // ── Responsive resize ─────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      if (chartRef.current && mainRef.current) {
        chartRef.current.applyOptions({ width: mainRef.current.clientWidth })
      }
      if (rsiChartRef.current && rsiRef.current) {
        rsiChartRef.current.applyOptions({ width: rsiRef.current.clientWidth })
      }
    })
    ro.observe(mainRef.current)
    if (rsiRef.current) ro.observe(rsiRef.current)

    return () => {
      ro.disconnect()
      if (chartRef.current)    { chartRef.current.remove();    chartRef.current    = null }
      if (rsiChartRef.current) { rsiChartRef.current.remove(); rsiChartRef.current = null }
    }
  }, [ohlcv, indicators])

  const toggle = key => setIndicators(prev => ({ ...prev, [key]: !prev[key] }))

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">

      {/* Indicator toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] flex-wrap">
        <span className="text-[11px] text-muted uppercase tracking-[1px] mr-1">Индикаторы</span>
        {[
          { key: 'ma20',   label: 'MA 20',     color: '#f59e0b' },
          { key: 'ma50',   label: 'MA 50',     color: '#60a5fa' },
          { key: 'ma200',  label: 'MA 200',    color: '#c084fc' },
          { key: 'bb',     label: 'Bollinger', color: '#60a5fa' },
          { key: 'rsi',    label: 'RSI 14',    color: '#f59e0b' },
          { key: 'volume', label: 'Объём',     color: '#4ade80' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`text-[11px] px-2 py-0.5 rounded-md border transition-all font-medium
              ${indicators[key]
                ? 'border-transparent text-black'
                : 'border-[var(--border)] text-muted hover:text-warm'}`}
            style={indicators[key] ? { background: color } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-muted text-sm" style={{ height: 380 }}>
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Загрузка свечных данных…
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-red-900/30 border border-red-700 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Empty state (no data fetched yet) */}
      {!loading && !error && !ohlcv && (
        <div className="flex items-center justify-center text-muted text-sm" style={{ height: 380 }}>
          Нет данных
        </div>
      )}

      {/* Chart containers */}
      {!loading && !error && ohlcv && (
        <>
          <div ref={mainRef} className="w-full" />
          {indicators.rsi && (
            <>
              <div className="border-t border-[var(--border)]" />
              <div ref={rsiRef} className="w-full" />
            </>
          )}
        </>
      )}
    </div>
  )
}
