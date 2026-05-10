/**
 * Client-side technical indicator computations.
 * All functions accept/return lightweight-charts-compatible data arrays:
 *   [{time, value}] for line/histogram series
 */

/**
 * Simple Moving Average
 * @param {Array<{time, value}>} data - close price series
 * @param {number} period
 * @returns {Array<{time, value}>}
 */
export function computeMA(data, period) {
  const result = []
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += data[j].value
    result.push({ time: data[i].time, value: sum / period })
  }
  return result
}

/**
 * Bollinger Bands (MA ± stdDev*σ)
 * @param {Array<{time, value}>} data - close price series
 * @param {number} period - default 20
 * @param {number} stdDev - default 2
 * @returns {{ upper, middle, lower }} — each is Array<{time, value}>
 */
export function computeBollingerBands(data, period = 20, stdDev = 2) {
  const upper = [], middle = [], lower = []
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1).map(d => d.value)
    const mean  = slice.reduce((a, b) => a + b, 0) / period
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period
    const sd   = Math.sqrt(variance)
    const time = data[i].time
    upper.push({ time, value: mean + stdDev * sd })
    middle.push({ time, value: mean })
    lower.push({ time, value: mean - stdDev * sd })
  }
  return { upper, middle, lower }
}

/**
 * RSI using Wilder's smoothing (EMA-based)
 * @param {Array<{time, value}>} data - close price series
 * @param {number} period - default 14
 * @returns {Array<{time, value}>}
 */
export function computeRSI(data, period = 14) {
  if (data.length < period + 1) return []
  const result = []

  // Seed: simple average of first `period` changes
  let avgGain = 0, avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const delta = data[i].value - data[i - 1].value
    if (delta > 0) avgGain += delta
    else           avgLoss -= delta
  }
  avgGain /= period
  avgLoss /= period

  // First RSI value
  const rs0 = avgLoss === 0 ? 100 : avgGain / avgLoss
  result.push({ time: data[period].time, value: 100 - 100 / (1 + rs0) })

  // Subsequent values — Wilder smoothing
  for (let i = period + 1; i < data.length; i++) {
    const delta = data[i].value - data[i - 1].value
    const gain  = delta > 0 ? delta : 0
    const loss  = delta < 0 ? -delta : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    result.push({ time: data[i].time, value: 100 - 100 / (1 + rs) })
  }

  return result
}

/**
 * Volume histogram data with up/down coloring.
 * @param {Array<{time, open, close, volume}>} ohlcv
 * @returns {Array<{time, value, color}>}
 */
export function computeVolume(ohlcv) {
  return ohlcv.map(d => ({
    time:  d.time,
    value: d.volume,
    color: d.close >= d.open ? 'rgba(74, 222, 128, 0.4)' : 'rgba(248, 113, 113, 0.4)',
  }))
}
