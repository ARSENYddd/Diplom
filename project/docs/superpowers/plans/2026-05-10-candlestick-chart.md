# Candlestick Chart with Technical Indicators — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Свечи" tab to ChartPanel that renders an interactive OHLCV candlestick chart (via lightweight-charts) with MA(20/50/200), Bollinger Bands, RSI(14), and volume overlays.

**Architecture:** Backend gains a `load_ohlcv()` function + `/api/ohlcv` GET endpoint that returns OHLCV arrays without touching existing model runners. Frontend adds a `CandlestickChart.jsx` component (lightweight-charts imperative API, wrapped in React useEffect), a `utils/indicators.js` file for client-side MA/BB/RSI computation, and extends ChartPanel's mode toggle with a third "Свечи" option.

**Tech Stack:** Python/FastAPI (backend), React 18, lightweight-charts v4 (TradingView library), Tailwind CSS.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `project/backend/services/data_service.py` | Add `_load_moex_candles_ohlcv`, `_load_moex_ohlcv`, `load_ohlcv`, `get_ohlcv_series` |
| Modify | `project/backend/main.py` | Add `GET /api/ohlcv` endpoint |
| Modify | `project/frontend/src/api/client.js` | Add `fetchOHLCV` |
| Create | `project/frontend/src/utils/indicators.js` | `computeMA`, `computeBollingerBands`, `computeRSI`, `computeVolume` |
| Create | `project/frontend/src/components/CandlestickChart.jsx` | Full chart component using lightweight-charts |
| Modify | `project/frontend/src/components/ChartPanel.jsx` | Import CandlestickChart, add 'candles' mode |

---

## Task 1: Backend — OHLCV data functions

**Files:**
- Modify: `project/backend/services/data_service.py`

### Context

`data_service.py` has three data-loading paths:
1. `_load_moex_candles` — intraday/weekly/monthly MOEX (ISS Candles API, columns: `open,close,high,low,value,volume,begin,end`)
2. `_load_moex` — daily MOEX (ISS History API, columns: `TRADEDATE,OPEN,HIGH,LOW,CLOSE,VOLUME,...`)
3. `load_data` (yfinance path) — uses `yf.download(..., auto_adjust=True)` which returns `Open,High,Low,Close,Volume`

`load_data()` currently keeps only `["Close"]`. We must **not** change it — model runners depend on it. Instead we add a parallel `load_ohlcv()` with a separate cache key suffix `_ohlcv`.

### Steps

- [ ] **Step 1: Add `_load_moex_candles_ohlcv` at line ~100 in data_service.py (after `_load_moex_candles`)**

```python
def _load_moex_candles_ohlcv(ticker_me: str, start: str, end: str, interval: str) -> pd.DataFrame:
    """
    Fetch full OHLCV candles from MOEX ISS Candles API.
    Returns DataFrame with columns Open, High, Low, Close, Volume indexed by datetime.
    """
    symbol   = ticker_me.upper().replace(".ME", "")
    moex_iv  = _MOEX_CANDLE_INTERVAL[interval]
    url      = _MOEX_CANDLES_URL.format(symbol=symbol)
    _timeout = httpx.Timeout(60.0, connect=15.0)

    all_rows: list = []
    offset = 0

    with httpx.Client(timeout=_timeout, verify=True) as client:
        while True:
            params = {
                "from":     start,
                "till":     end,
                "interval": moex_iv,
                "start":    offset,
                "iss.meta": "off",
                "iss.only": "candles",
            }
            resp = client.get(url, params=params)
            resp.raise_for_status()
            js = resp.json()

            candles = js.get("candles", {})
            columns = candles.get("columns", [])
            rows    = candles.get("data",    [])

            if not rows:
                break

            all_rows.extend(rows)

            if len(rows) < _MOEX_CANDLES_PAGE:
                break
            offset += len(rows)

    if not all_rows:
        raise ValueError(
            f"Нет OHLCV данных MOEX Candles для {symbol} (interval={moex_iv}) "
            f"за период {start}–{end}."
        )

    col_idx = {c: i for i, c in enumerate(columns)}
    records = []
    for r in all_rows:
        if r[col_idx["close"]] is None:
            continue
        records.append((
            r[col_idx["begin"]],
            r[col_idx["open"]],
            r[col_idx["high"]],
            r[col_idx["low"]],
            r[col_idx["close"]],
            r[col_idx.get("volume", -1)] or 0,
        ))

    df = pd.DataFrame(records, columns=["Date", "Open", "High", "Low", "Close", "Volume"])
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.set_index("Date").sort_index().dropna(subset=["Close"])

    if interval == "6h":
        df = df.resample("6h").agg(
            {"Open": "first", "High": "max", "Low": "min", "Close": "last", "Volume": "sum"}
        ).dropna(subset=["Close"])
    elif interval == "12h":
        df = df.resample("12h").agg(
            {"Open": "first", "High": "max", "Low": "min", "Close": "last", "Volume": "sum"}
        ).dropna(subset=["Close"])

    return df
```

- [ ] **Step 2: Add `_load_moex_ohlcv` (daily) right after `_load_moex_candles_ohlcv`**

```python
def _load_moex_ohlcv(ticker_me: str, start: str, end: str) -> pd.DataFrame:
    """
    Fetch daily OHLCV from MOEX ISS History API.
    Returns DataFrame with columns Open, High, Low, Close, Volume indexed by date.
    """
    symbol = ticker_me.upper().replace(".ME", "")
    url    = _MOEX_HISTORY_URL.format(symbol=symbol)

    all_rows: list = []
    offset = 0
    _timeout = httpx.Timeout(60.0, connect=15.0)

    with httpx.Client(timeout=_timeout, verify=True) as client:
        while True:
            params = {
                "from":     start,
                "till":     end,
                "start":    offset,
                "iss.meta": "off",
                "iss.only": "history",
            }
            resp = client.get(url, params=params)
            resp.raise_for_status()
            js = resp.json()

            history = js.get("history", {})
            columns = history.get("columns", [])
            rows    = history.get("data",    [])

            if not rows:
                break

            all_rows.extend(rows)

            if len(rows) < _MOEX_PAGE_SIZE:
                break
            offset += len(rows)

    if not all_rows:
        raise ValueError(
            f"Нет OHLCV данных MOEX History для тикера {symbol} за период {start}–{end}."
        )

    col_idx   = {c: i for i, c in enumerate(columns)}
    date_col  = col_idx["TRADEDATE"]
    open_col  = col_idx.get("OPEN",   -1)
    high_col  = col_idx.get("HIGH",   -1)
    low_col   = col_idx.get("LOW",    -1)
    close_col = col_idx["CLOSE"]
    vol_col   = col_idx.get("VOLUME", -1)

    records = []
    for r in all_rows:
        if r[close_col] is None:
            continue
        o = r[open_col]  if open_col  >= 0 else r[close_col]
        h = r[high_col]  if high_col  >= 0 else r[close_col]
        l = r[low_col]   if low_col   >= 0 else r[close_col]
        v = r[vol_col]   if vol_col   >= 0 else 0
        records.append((r[date_col], o or r[close_col], h or r[close_col],
                        l or r[close_col], r[close_col], v or 0))

    df = pd.DataFrame(records, columns=["Date", "Open", "High", "Low", "Close", "Volume"])
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.set_index("Date").sort_index().dropna(subset=["Close"])

    return df
```

- [ ] **Step 3: Add `load_ohlcv` and `get_ohlcv_series` at the bottom of data_service.py (after the existing `get_price_series`)**

```python
def load_ohlcv(ticker: str, start: str, end: str, interval: str = "1d") -> pd.DataFrame:
    """
    Load OHLCV DataFrame (Open, High, Low, Close, Volume).
    Uses a separate cache key (_ohlcv suffix) so it never collides with load_data().
    """
    interval = interval or "1d"
    key      = _cache_key(ticker, start, end, interval) + "_ohlcv"

    if key in _memory_cache:
        return _memory_cache[key]

    disk_path = _disk_cache_path(key)
    if os.path.exists(disk_path):
        with open(disk_path, "rb") as f:
            df = pickle.load(f)
        _memory_cache[key] = df
        return df

    if _is_moex_ticker(ticker):
        if interval in _INTRADAY_INTERVALS or interval in ("1wk", "1mo"):
            df = _load_moex_candles_ohlcv(ticker, start, end, interval)
        else:
            try:
                df = _load_moex_ohlcv(ticker, start, end)
            except Exception as moex_err:
                import logging
                logging.warning(
                    f"MOEX ISS OHLCV недоступен для {ticker} ({moex_err}), "
                    "переключаюсь на yfinance..."
                )
                df = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=True)
                if df.empty:
                    raise ValueError(f"Нет OHLCV данных для {ticker}.") from moex_err
                if isinstance(df.columns, pd.MultiIndex):
                    df.columns = df.columns.droplevel(1)
                df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
                df.index = pd.to_datetime(df.index)
                df = df.dropna(subset=["Close"])
    else:
        yf_interval = _YF_INTERVAL_MAP.get(interval, "1d")
        df = yf.download(
            ticker, start=start, end=end,
            interval=yf_interval,
            progress=False, auto_adjust=True,
        )
        if df.empty:
            raise ValueError(f"Нет OHLCV данных для тикера {ticker} за период {start}–{end}.")
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.droplevel(1)
        df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
        df.index = pd.to_datetime(df.index)
        df = df.dropna(subset=["Close"])

        if interval in _RESAMPLE_MAP:
            df = df.resample(_RESAMPLE_MAP[interval]).agg({
                "Open":   "first",
                "High":   "max",
                "Low":    "min",
                "Close":  "last",
                "Volume": "sum",
            }).dropna(subset=["Close"])

    with open(disk_path, "wb") as f:
        pickle.dump(df, f)
    _memory_cache[key] = df
    return df


def get_ohlcv_series(ticker: str, start: str, end: str, interval: str = "1d") -> list:
    """
    Return list of OHLCV dicts suitable for lightweight-charts.
    - Daily/weekly/monthly: time = "YYYY-MM-DD" string
    - Intraday (1h/6h/12h):  time = Unix timestamp (integer seconds)
    """
    df = load_ohlcv(ticker, start, end, interval)
    is_intraday = interval in _INTRADAY_INTERVALS
    result = []
    for idx, row in df.iterrows():
        time_val = int(idx.timestamp()) if is_intraday else idx.strftime("%Y-%m-%d")
        result.append({
            "time":   time_val,
            "open":   round(float(row["Open"]),   4),
            "high":   round(float(row["High"]),   4),
            "low":    round(float(row["Low"]),    4),
            "close":  round(float(row["Close"]),  4),
            "volume": int(row["Volume"]) if not pd.isna(row["Volume"]) else 0,
        })
    return result
```

- [ ] **Step 4: Smoke-test the new functions in a Python shell**

```bash
cd /Users/arsendreman/Documents/GitHub/Diplom/project/backend
python - <<'EOF'
from services.data_service import get_ohlcv_series
data = get_ohlcv_series("^GSPC", "2024-01-01", "2024-06-01", "1d")
print(f"rows={len(data)}, first={data[0]}, last={data[-1]}")
assert len(data) > 0
assert all(k in data[0] for k in ("time","open","high","low","close","volume"))
print("OK")
EOF
```

Expected output:
```
rows=124, first={'time': '2024-01-02', 'open': ..., ...}, last={...}
OK
```

- [ ] **Step 5: Commit**

```bash
cd /Users/arsendreman/Documents/GitHub/Diplom/project
git add backend/services/data_service.py
git commit -m "feat(backend): add OHLCV data loading + get_ohlcv_series for candlestick chart"
```

---

## Task 2: Backend — /api/ohlcv endpoint

**Files:**
- Modify: `project/backend/main.py`

### Steps

- [ ] **Step 1: Add the import at the top of main.py (line ~10, after existing data_service import)**

Replace:
```python
from services.data_service import get_price_series
```
With:
```python
from services.data_service import get_price_series, get_ohlcv_series
```

- [ ] **Step 2: Add the endpoint after the existing `GET /api/data` handler**

```python
@app.get("/api/ohlcv")
async def get_ohlcv(
    ticker:   str = Query("^GSPC"),
    start:    str = Query("2015-01-01"),
    end:      str = Query("2024-01-01"),
    interval: str = Query("1d"),
    today:    str = Query(""),
):
    try:
        data_end = min(end, today) if today else end
        ohlcv = get_ohlcv_series(ticker, start, data_end, interval)
        return {"ohlcv": ohlcv, "interval": interval}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

- [ ] **Step 3: Start the backend and test the endpoint**

```bash
cd /Users/arsendreman/Documents/GitHub/Diplom/project/backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
sleep 3
curl -s "http://localhost:8000/api/ohlcv?ticker=%5EGSPC&start=2024-01-01&end=2024-03-01&interval=1d" | python3 -m json.tool | head -30
```

Expected: JSON with `{"ohlcv": [{"time": "2024-01-02", "open": ..., ...}, ...], "interval": "1d"}`

- [ ] **Step 4: Commit**

```bash
cd /Users/arsendreman/Documents/GitHub/Diplom/project
git add backend/main.py
git commit -m "feat(backend): add GET /api/ohlcv endpoint"
```

---

## Task 3: Frontend — install lightweight-charts + fetchOHLCV

**Files:**
- Modify: `project/frontend/package.json` (via npm install)
- Modify: `project/frontend/src/api/client.js`

### Steps

- [ ] **Step 1: Install lightweight-charts**

```bash
cd /Users/arsendreman/Documents/GitHub/Diplom/project/frontend
npm install lightweight-charts@4
```

Expected: `added 1 package` (or similar), no errors.

- [ ] **Step 2: Add `fetchOHLCV` to client.js**

Current content of `project/frontend/src/api/client.js`:
```javascript
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const fetchData = (ticker, start, end) =>
  api.get('/data', { params: { ticker, start, end } }).then(r => r.data)

export const fetchForecast = (body) =>
  api.post('/forecast', body).then(r => r.data)

export const fetchComparison = (ticker, start, end) =>
  api.get('/compare', { params: { ticker, start, end } }).then(r => r.data)

export const fetchBacktest = (body) =>
  api.post('/backtest', body).then(r => r.data)
```

Add at the end:
```javascript
export const fetchOHLCV = (ticker, start, end, interval = '1d') =>
  api.get('/ohlcv', { params: { ticker, start, end, interval } }).then(r => r.data)
```

- [ ] **Step 3: Commit**

```bash
cd /Users/arsendreman/Documents/GitHub/Diplom/project
git add frontend/package.json frontend/package-lock.json frontend/src/api/client.js
git commit -m "feat(frontend): install lightweight-charts, add fetchOHLCV API client"
```

---

## Task 4: Frontend — indicators utility

**Files:**
- Create: `project/frontend/src/utils/indicators.js`

### Steps

- [ ] **Step 1: Create `project/frontend/src/utils/indicators.js`**

```javascript
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
```

- [ ] **Step 2: Quick sanity check in browser console (paste after frontend starts)**

```javascript
// Open browser console at http://localhost:5173 and paste:
import('/src/utils/indicators.js').then(m => {
  const data = Array.from({length: 30}, (_, i) => ({ time: `2024-01-${String(i+1).padStart(2,'0')}`, value: 100 + i }))
  console.log('MA5:', m.computeMA(data, 5).slice(0, 3))
  console.log('RSI14 length:', m.computeRSI(data, 14).length)
  const bb = m.computeBollingerBands(data, 5, 2)
  console.log('BB upper[0]:', bb.upper[0])
})
```

Expected: MA5 values around 102-103, RSI14 length = 16 (30 - 14), BB upper > BB middle > BB lower.

- [ ] **Step 3: Commit**

```bash
cd /Users/arsendreman/Documents/GitHub/Diplom/project
git add frontend/src/utils/indicators.js
git commit -m "feat(frontend): add client-side technical indicator utilities (MA, BB, RSI, Volume)"
```

---

## Task 5: Frontend — CandlestickChart component

**Files:**
- Create: `project/frontend/src/components/CandlestickChart.jsx`

### Context

`lightweight-charts` uses an **imperative** API — you call `createChart(domElement, options)`, get a chart object back, and add series to it. This must be done inside `useEffect` with proper cleanup. The component receives the same `ticker`, `start`, `end`, `interval` props that ChartPanel already manages, so no new state is needed in the parent.

The component renders:
1. **Main chart** — candlestick + optional volume (bottom 20%) + optional MA lines + optional Bollinger Bands
2. **RSI sub-chart** — below main chart, time axis hidden, synced scroll/zoom via `subscribeVisibleLogicalRangeChange`
3. **Indicator toolbar** — checkboxes for MA20, MA50, MA200, BB, RSI, Volume

### Steps

- [ ] **Step 1: Create `project/frontend/src/components/CandlestickChart.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react'
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts'
import { fetchOHLCV } from '../api/client'
import {
  computeMA,
  computeBollingerBands,
  computeRSI,
  computeVolume,
} from '../utils/indicators'

// ── Shared chart theme matching the app's dark palette ─────────────────────
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
  rightPriceScale: { borderColor: '#1e293b' },
  timeScale: {
    borderColor: '#1e293b',
    timeVisible: true,
    secondsVisible: false,
  },
}

// ── Indicator defaults ──────────────────────────────────────────────────────
const DEFAULT_INDICATORS = {
  ma20:   true,
  ma50:   true,
  ma200:  false,
  bb:     false,
  rsi:    false,
  volume: true,
}

export default function CandlestickChart({ ticker, start, end, interval = '1d' }) {
  const mainRef    = useRef(null)   // DOM node for main chart
  const rsiRef     = useRef(null)   // DOM node for RSI chart
  const chartRef   = useRef(null)   // lightweight-charts main instance
  const rsiChartRef = useRef(null)  // lightweight-charts RSI instance

  const [ohlcv,      setOhlcv]      = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [indicators, setIndicators] = useState(DEFAULT_INDICATORS)

  // ── Fetch OHLCV whenever params change ─────────────────────────────────
  useEffect(() => {
    if (!ticker || !start || !end) return
    setLoading(true)
    setError(null)
    fetchOHLCV(ticker, start, end, interval)
      .then(data => setOhlcv(data.ohlcv))
      .catch(e => setError(e.response?.data?.detail ?? e.message ?? 'Ошибка загрузки данных'))
      .finally(() => setLoading(false))
  }, [ticker, start, end, interval])

  // ── Build / rebuild charts whenever ohlcv data or indicators toggle ────
  useEffect(() => {
    if (!ohlcv || !mainRef.current) return

    // Destroy old instances first
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
      upColor:        '#4ade80',
      downColor:      '#f87171',
      borderUpColor:  '#4ade80',
      borderDownColor:'#f87171',
      wickUpColor:    '#4ade80',
      wickDownColor:  '#f87171',
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

    // Close prices for indicator computations
    const closes = ohlcv.map(d => ({ time: d.time, value: d.close }))

    // MA lines
    const maConfig = [
      { key: 'ma20',  period: 20,  color: '#f59e0b' },
      { key: 'ma50',  period: 50,  color: '#60a5fa' },
      { key: 'ma200', period: 200, color: '#c084fc' },
    ]
    for (const { key, period, color } of maConfig) {
      if (!indicators[key]) continue
      const series = chart.addLineSeries({
        color,
        lineWidth: 1,
        title: `MA${period}`,
        lastValueVisible: true,
        priceLineVisible: false,
      })
      series.setData(computeMA(closes, period))
    }

    // Bollinger Bands
    if (indicators.bb) {
      const bb = computeBollingerBands(closes, 20, 2)
      const bbLineOpts = {
        lineWidth:        1,
        lineStyle:        LineStyle.Dashed,
        lastValueVisible: false,
        priceLineVisible: false,
      }
      chart.addLineSeries({ ...bbLineOpts, color: '#60a5fa', title: 'BB Upper' })
            .setData(bb.upper)
      chart.addLineSeries({ ...bbLineOpts, color: '#64748b', title: 'BB Mid' })
            .setData(bb.middle)
      chart.addLineSeries({ ...bbLineOpts, color: '#60a5fa', title: 'BB Lower' })
            .setData(bb.lower)
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

      // RSI line
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

      // Sync scrolling / zooming
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

    // ── ResizeObserver for responsive width ───────────────────────────────
    const ro = new ResizeObserver(() => {
      if (chartRef.current && mainRef.current) {
        chartRef.current.applyOptions({ width: mainRef.current.clientWidth })
      }
      if (rsiChartRef.current && rsiRef.current) {
        rsiChartRef.current.applyOptions({ width: rsiRef.current.clientWidth })
      }
    })
    ro.observe(mainRef.current)

    return () => {
      ro.disconnect()
      if (chartRef.current)    { chartRef.current.remove();    chartRef.current    = null }
      if (rsiChartRef.current) { rsiChartRef.current.remove(); rsiChartRef.current = null }
    }
  }, [ohlcv, indicators])

  const toggle = key => setIndicators(prev => ({ ...prev, [key]: !prev[key] }))

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-0">

      {/* Indicator toolbar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[var(--border)] flex-wrap">
        <span className="text-[11px] text-muted uppercase tracking-[1px]">Индикаторы</span>
        {[
          { key: 'ma20',   label: 'MA 20',  color: '#f59e0b' },
          { key: 'ma50',   label: 'MA 50',  color: '#60a5fa' },
          { key: 'ma200',  label: 'MA 200', color: '#c084fc' },
          { key: 'bb',     label: 'Bollinger', color: '#60a5fa' },
          { key: 'rsi',    label: 'RSI 14', color: '#f59e0b' },
          { key: 'volume', label: 'Объём',  color: '#4ade80' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md border transition-all
              ${indicators[key]
                ? 'border-transparent text-black font-semibold'
                : 'border-[var(--border)] text-muted hover:text-warm'}`}
            style={indicators[key] ? { background: color } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading / error */}
      {loading && (
        <div className="flex items-center justify-center h-48 gap-2 text-muted text-sm">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Загрузка свечных данных…
        </div>
      )}
      {!loading && error && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-red-900/30 border border-red-700 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Chart containers */}
      {!loading && !error && (
        <>
          <div ref={mainRef} className="w-full" />
          {indicators.rsi && (
            <>
              <div className="border-t border-[var(--border)] mx-3 my-0" />
              <div ref={rsiRef} className="w-full" />
            </>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/arsendreman/Documents/GitHub/Diplom/project
git add frontend/src/components/CandlestickChart.jsx
git commit -m "feat(frontend): add CandlestickChart component with lightweight-charts"
```

---

## Task 6: Frontend — ChartPanel integration

**Files:**
- Modify: `project/frontend/src/components/ChartPanel.jsx`

### Context

ChartPanel has a mode toggle (lines 357–370 of the current file) with two options:
```jsx
[
  { key: 'simple',   label: 'Сводка' },
  { key: 'advanced', label: 'График' },
]
```
And content rendering (lines 430–441):
```jsx
{viewMode === 'simple' ? (
  <SimpleView ... />
) : (
  <div className="p-2"><ForecastChart data={data} compact signals={signals} /></div>
)}
```

We add a third mode `'candles'` and render `CandlestickChart` for it.

### Steps

- [ ] **Step 1: Add import at the top of ChartPanel.jsx (after the existing ForecastChart import)**

Current line 2:
```jsx
import ForecastChart from './ForecastChart'
```

Replace with:
```jsx
import ForecastChart from './ForecastChart'
import CandlestickChart from './CandlestickChart'
```

- [ ] **Step 2: Extend the mode toggle array (lines ~358–361)**

Current code:
```jsx
{[
  { key: 'simple',   label: 'Сводка' },
  { key: 'advanced', label: 'График' },
].map(({ key, label }) => (
```

Replace with:
```jsx
{[
  { key: 'simple',   label: 'Сводка' },
  { key: 'advanced', label: 'График' },
  { key: 'candles',  label: 'Свечи' },
].map(({ key, label }) => (
```

- [ ] **Step 3: Replace the content rendering block (lines ~430–441)**

Current code:
```jsx
      {/* ── Content ── */}
      <div className="flex-1 min-w-0">
        {viewMode === 'simple' ? (
          <SimpleView
            data={data}
            tickerLabel={tickerLabel}
            modelLabel={MODELS.find(m => m.value === model)?.label ?? model}
          />
        ) : (
          <div className="p-2">
            <ForecastChart data={data} compact signals={signals} />
          </div>
        )}
      </div>
```

Replace with:
```jsx
      {/* ── Content ── */}
      <div className="flex-1 min-w-0">
        {viewMode === 'simple' ? (
          <SimpleView
            data={data}
            tickerLabel={tickerLabel}
            modelLabel={MODELS.find(m => m.value === model)?.label ?? model}
          />
        ) : viewMode === 'candles' ? (
          <CandlestickChart
            ticker={ticker}
            start={start}
            end={end}
            interval={interval}
          />
        ) : (
          <div className="p-2">
            <ForecastChart data={data} compact signals={signals} />
          </div>
        )}
      </div>
```

- [ ] **Step 4: Verify in browser**

1. Start backend: `cd project/backend && uvicorn main:app --reload`
2. Start frontend: `cd project/frontend && npm run dev`
3. Open `http://localhost:5173`
4. Navigate to a ChartPanel — confirm three tabs appear: "Сводка", "График", "Свечи"
5. Click "Свечи" — verify candlestick chart loads for `^GSPC` (or current ticker)
6. Toggle MA 20 on/off — chart should rebuild with/without the MA line
7. Toggle RSI — verify RSI sub-panel appears below and scrolling is synchronized
8. Toggle Bollinger — verify dashed upper/lower bands appear on the chart
9. Change ticker to `SBER.ME` — verify MOEX data loads correctly
10. Change interval to `1h` — verify intraday candles load (time axis shows hours)

- [ ] **Step 5: Commit**

```bash
cd /Users/arsendreman/Documents/GitHub/Diplom/project
git add frontend/src/components/ChartPanel.jsx
git commit -m "feat(frontend): add Свечи tab to ChartPanel with candlestick chart and indicator toggles"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Candlestick OHLCV view — Task 5 (`CandlestickChart.jsx`)
- ✅ MA(20/50/200) overlays — Task 5, `computeMA` + loop
- ✅ Bollinger Bands — Task 5, `computeBollingerBands`
- ✅ RSI(14) sub-panel — Task 5, `computeRSI` + separate chart
- ✅ Volume bars — Task 5, `computeVolume` + histogram series
- ✅ Backend OHLCV endpoint — Tasks 1–2
- ✅ Tab integration — Task 6

**No placeholders present.**

**Type consistency:**
- `get_ohlcv_series` returns `list[dict]` — used directly as `data.ohlcv` in `fetchOHLCV`
- `computeMA(closes, period)` where `closes = ohlcv.map(d => ({time, value: d.close}))` — consistent throughout Task 5
- `computeVolume(ohlcv)` accepts raw `ohlcv` array (not closes) — consistent with Task 5 call site
- `_load_moex_candles_ohlcv` is called from `load_ohlcv` — names match

**Potential gotcha:** lightweight-charts requires time values in strictly ascending order. The backend `get_ohlcv_series` sorts by index (`sort_index()`) so this is guaranteed. ✅
