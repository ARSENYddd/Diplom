# Landing Page Redesign — AlphaSignal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the academic-style Financial Forecast app with a commercial "AlphaSignal" platform: Monochrome & Amber design system, animated landing page (ticker tape, floating dashboard, scroll-reveal sections), and a redesigned in-app header.

**Architecture:** A new `LandingPage.jsx` component is shown when `page === 'landing'` in `App.jsx`. Clicking any CTA sets `page = 'forecast'` to enter the existing app. All animations are pure CSS (keyframes in `index.css`). The amber color palette replaces indigo throughout.

**Tech Stack:** React 18, Vite, Tailwind CSS 3, no new dependencies.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `project/frontend/tailwind.config.js` | Amber palette, animation keyframes |
| Modify | `project/frontend/src/index.css` | CSS custom props, keyframes, scrollbar |
| Create | `project/frontend/src/components/LandingPage.jsx` | Full landing page (Nav → Footer) |
| Modify | `project/frontend/src/components/Header.jsx` | Commercial in-app header |
| Modify | `project/frontend/src/App.jsx` | Add `'landing'` state, wire LandingPage |

---

## Task 1: Tailwind config + CSS foundations

**Files:**
- Modify: `project/frontend/tailwind.config.js`
- Modify: `project/frontend/src/index.css`

- [ ] **Step 1: Replace tailwind.config.js**

```js
// project/frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        amber: {
          300: '#fcd34d',
          400: '#f59e0b',
          500: '#d97706',
          600: '#b45309',
        },
        surface: { DEFAULT: '#1a1710', 2: '#111008' },
        border:  { DEFAULT: '#2a2418' },
        muted:   { DEFAULT: '#7a6a4a' },
        warm:    { DEFAULT: '#e8d5a3' },
      },
      animation: {
        'float':          'float 6s ease-in-out infinite',
        'pulse-amber':    'pulse-amber 3s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'shimmer':        'shimmer 2.5s ease-in-out infinite',
        'scanline':       'scanline 4s linear infinite',
        'ticker':         'scroll-ticker 24s linear infinite',
        'fade-up':        'fadeUp 0.7s ease both',
        'draw-line':      'draw-line 2s ease 0.5s forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-8px)' },
        },
        'pulse-amber': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245,158,11,0)' },
          '50%':       { boxShadow: '0 0 24px 4px rgba(245,158,11,0.25)' },
        },
        'gradient-shift': {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        scanline: {
          '0%':   { top: '-2px' },
          '100%': { top: '100%' },
        },
        'scroll-ticker': {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(-50%)' },
        },
        'draw-line': {
          from: { strokeDashoffset: '800' },
          to:   { strokeDashoffset: '0' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(28px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundSize: { '200': '200% 200%' },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Replace index.css**

```css
/* project/frontend/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg:      #0d0b08;
  --surface: #1a1710;
  --border:  #2a2418;
  --amber:   #f59e0b;
  --amber2:  #d97706;
  --amber3:  #fcd34d;
  --text:    #e8d5a3;
  --muted:   #7a6a4a;
  --dim:     #3a3020;
}

body {
  background-color: var(--bg);
  color: var(--text);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* Scrollbar */
::-webkit-scrollbar        { width: 6px; height: 6px; }
::-webkit-scrollbar-track  { background: var(--surface); }
::-webkit-scrollbar-thumb  { background: var(--amber2); border-radius: 3px; }

/* Scroll-reveal utility */
.reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Gradient text */
.text-gradient-amber {
  background: linear-gradient(135deg, var(--amber2), var(--amber), var(--amber3));
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-shift 3s ease infinite;
}

/* SVG draw-on */
.svg-draw {
  stroke-dasharray: 800;
  stroke-dashoffset: 800;
  animation: draw-line 2s ease 0.5s forwards;
}
```

- [ ] **Step 3: Start dev server and confirm Tailwind compiles**

```bash
cd project/frontend && npm run dev
```

Expected: server starts on http://localhost:5173, no Tailwind errors in console.

- [ ] **Step 4: Commit**

```bash
git add project/frontend/tailwind.config.js project/frontend/src/index.css
git commit -m "feat: amber design system tokens and animation keyframes"
```

---

## Task 2: LandingPage — Nav + TickerTape + Hero

**Files:**
- Create: `project/frontend/src/components/LandingPage.jsx` (partial — first 3 sections)

- [ ] **Step 1: Create the file with Nav and TickerTape**

```jsx
// project/frontend/src/components/LandingPage.jsx
import { useEffect, useRef } from 'react'

// ── Data ──────────────────────────────────────────────────────────────────────
const TICKERS = [
  { symbol: 'S&P 500', price: '5 248.49', change: '+0.82%', up: true },
  { symbol: 'SBER',    price: '309.12',   change: '+1.24%', up: true },
  { symbol: 'LKOH',    price: '7 621.00', change: '−0.31%', up: false },
  { symbol: 'BRENT',   price: '83.14',    change: '+0.55%', up: true },
  { symbol: 'AAPL',    price: '189.30',   change: '−0.18%', up: false },
  { symbol: 'NVDA',    price: '867.40',   change: '+2.11%', up: true },
  { symbol: 'GOLD',    price: '2 341.80', change: '+0.44%', up: true },
  { symbol: 'NASDAQ',  price: '16 380',   change: '+1.03%', up: true },
  { symbol: 'GAZP',    price: '163.45',   change: '−0.72%', up: false },
  { symbol: 'WTI',     price: '79.22',    change: '−0.22%', up: false },
]

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav({ onLaunch }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center gap-6 px-12 h-[60px]
                    bg-[var(--bg)]/85 border-b border-[var(--border)] backdrop-blur-xl">
      <a href="#" className="flex items-center gap-2.5 text-white font-bold text-[17px] tracking-tight no-underline">
        <div className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center
                        text-black font-extrabold text-[14px]
                        bg-gradient-to-br from-amber-500 to-amber-400
                        shadow-[0_0_14px_rgba(245,158,11,0.4)] animate-pulse-amber">
          α
        </div>
        AlphaSignal
      </a>

      <div className="flex items-center gap-1 ml-6">
        {['Прогноз', 'Сигналы', 'Модели', 'Цены'].map(l => (
          <span key={l}
            className="text-[13px] text-muted px-3 py-1.5 rounded-md cursor-pointer
                       hover:text-warm transition-colors">
            {l}
          </span>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <span className="text-[13px] text-muted px-3 cursor-pointer hover:text-warm transition-colors">
          Войти
        </span>
        <button onClick={onLaunch}
          className="text-[13px] font-semibold text-black bg-amber-400
                     px-4 py-1.5 rounded-lg cursor-pointer
                     hover:bg-amber-300 hover:scale-[1.02] transition-all">
          Попробовать бесплатно →
        </button>
      </div>
    </nav>
  )
}

// ── TickerTape ────────────────────────────────────────────────────────────────
function TickerTape() {
  const items = [...TICKERS, ...TICKERS] // duplicate for seamless loop
  return (
    <div className="overflow-hidden h-9 flex items-center
                    bg-black/30 border-b border-[var(--border)]">
      <div className="flex gap-12 animate-ticker whitespace-nowrap">
        {items.map((t, i) => (
          <div key={i} className="flex items-center gap-2 flex-shrink-0 text-[11px]
                                   font-[number:tabular-nums]">
            <span className="text-warm font-semibold">{t.symbol}</span>
            <span className="text-muted">{t.price}</span>
            <span className={t.up ? 'text-green-400' : 'text-red-400'}>{t.change}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add Hero section to the same file**

Append after TickerTape, before the default export:

```jsx
// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ onLaunch }) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center
                        px-12 pt-[120px] pb-20 text-center overflow-hidden">
      {/* Grid bg */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(245,158,11,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,158,11,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }} />

      {/* Radial glow */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(245,158,11,0.12) 0%, transparent 70%)' }} />

      {/* Badge */}
      <div className="relative inline-flex items-center gap-1.5 text-[11px] font-bold
                      tracking-[1.2px] uppercase text-amber-400 mb-7
                      px-3.5 py-1.5 rounded-full overflow-hidden
                      bg-amber-400/10 border border-amber-400/25
                      animate-fade-up [animation-delay:0ms]">
        <span>⚡</span> ML-прогнозирование финансовых рынков
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent
                        animate-shimmer" />
      </div>

      {/* Title */}
      <h1 className="text-[clamp(40px,6vw,72px)] font-extrabold leading-[1.08]
                     tracking-[-2px] text-white mb-6
                     animate-fade-up [animation-delay:100ms]">
        Предсказывай рынки<br />
        с точностью{' '}
        <span className="text-gradient-amber">ансамблевых</span><br />
        нейросетей
      </h1>

      {/* Sub */}
      <p className="text-[18px] text-muted max-w-[560px] leading-[1.6] mb-10
                    animate-fade-up [animation-delay:200ms]">
        8 моделей — ARIMA, GARCH, LSTM и гибриды — дают прогноз, торговые сигналы
        и бэктест для любого актива: S&P 500, MOEX, нефть, золото.
      </p>

      {/* CTAs */}
      <div className="flex items-center gap-3.5 mb-16
                      animate-fade-up [animation-delay:300ms]">
        <button onClick={onLaunch}
          className="inline-flex items-center gap-2 text-[15px] font-bold text-black
                     bg-gradient-to-br from-amber-500 to-amber-400
                     px-7 py-3.5 rounded-xl cursor-pointer
                     shadow-[0_4px_24px_rgba(245,158,11,0.3)]
                     hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(245,158,11,0.4)]
                     transition-all">
          Открыть платформу →
        </button>
        <button className="inline-flex items-center gap-2 text-[15px] text-muted
                           border border-[var(--border)] px-6 py-3.5 rounded-xl cursor-pointer
                           hover:border-[var(--dim)] hover:text-warm transition-all">
          ▶ Смотреть демо
        </button>
      </div>

      {/* Dashboard mockup */}
      <HeroDashboard />
    </section>
  )
}

function HeroDashboard() {
  return (
    <div className="relative w-full max-w-[900px] rounded-2xl overflow-hidden
                    bg-[var(--surface)] border border-[var(--border)]
                    shadow-[0_32px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(245,158,11,0.1)]
                    animate-fade-up animate-float [animation-delay:400ms]">
      {/* Top amber line */}
      <div className="absolute top-0 left-0 right-0 h-px
                      bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
      {/* Scanline */}
      <div className="absolute left-0 right-0 h-0.5 pointer-events-none animate-scanline
                      bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

      {/* Window bar */}
      <div className="flex items-center gap-1.5 px-4 py-3
                      bg-black/30 border-b border-[var(--border)]">
        <div className="w-2 h-2 rounded-full bg-red-400" />
        <div className="w-2 h-2 rounded-full bg-yellow-400" />
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <span className="ml-2 text-[12px] text-muted font-mono">
          AlphaSignal — Forecast Dashboard
        </span>
        <span className="ml-auto text-[10px] font-semibold text-amber-400
                         bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
          ● LIVE
        </span>
      </div>

      {/* Body */}
      <div className="grid grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <div className="border-r border-[var(--border)] p-3 flex flex-col gap-2">
          <div className="text-[9px] font-bold tracking-[1.2px] uppercase text-[var(--dim)] mb-1 px-2">
            Активы
          </div>
          {[
            { dot: '#4ade80', ticker: '^GSPC',   model: 'Ансамбль',     val: '+34.2%', active: true },
            { dot: '#818cf8', ticker: 'SBER.ME',  model: 'ARIMA+LSTM',   val: '+18.7%', active: false },
            { dot: '#f472b6', ticker: 'LKOH.ME',  model: 'Triple Hybrid',val: '+22.1%', active: false },
            { dot: '#fcd34d', ticker: 'BZ=F',     model: 'GARCH',        val: '+9.4%',  active: false },
          ].map(item => (
            <div key={item.ticker}
              className={`flex items-center gap-2 px-2 py-2 rounded-lg
                ${item.active
                  ? 'bg-amber-400/10 border border-amber-400/15'
                  : ''}`}>
              <div className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{ background: item.dot }} />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-white">{item.ticker}</div>
                <div className="text-[10px] text-muted">{item.model}</div>
              </div>
              <div className="ml-auto text-[11px] font-semibold text-amber-400">{item.val}</div>
            </div>
          ))}

          <div className="text-[9px] font-bold tracking-[1.2px] uppercase text-[var(--dim)] mt-2 mb-1 px-2">
            Модели
          </div>
          <div className="text-[10px] text-muted px-2 leading-[2]">
            ARIMA · GARCH · LSTM<br />
            ARIMA+LSTM · ARIMA+GRU<br />
            GARCH+LSTM · Triple Hybrid<br />
            <span className="text-amber-400">★ Ensemble</span>
          </div>
        </div>

        {/* Main */}
        <div className="p-4">
          {/* Metrics row */}
          <div className="grid grid-cols-4 gap-3 mb-3.5">
            {[
              { label: 'MAPE',       val: '0.78%', color: 'text-amber-400', sub: 'Ensemble · S&P' },
              { label: 'Sharpe',     val: '1.87',  color: 'text-amber-400', sub: 'momentum' },
              { label: 'Доходность', val: '+34.2%',color: 'text-green-400', sub: 'vs B&H +21%' },
              { label: 'Max DD',     val: '−8.3%', color: 'text-red-400',   sub: 'max drawdown' },
            ].map(m => (
              <div key={m.label} className="bg-black/20 border border-[var(--border)] rounded-lg px-3 py-2">
                <div className="text-[9px] text-muted uppercase tracking-[0.8px] mb-1">{m.label}</div>
                <div className={`text-[18px] font-bold ${m.color} font-[number:tabular-nums]`}>{m.val}</div>
                <div className="text-[9px] text-muted mt-0.5">{m.sub}</div>
              </div>
            ))}
          </div>

          {/* SVG chart */}
          <svg viewBox="0 0 620 130" className="w-full h-[130px]" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" y1="32"  x2="620" y2="32"  stroke="#2a2418" strokeWidth="1" />
            <line x1="0" y1="64"  x2="620" y2="64"  stroke="#2a2418" strokeWidth="1" />
            <line x1="0" y1="96"  x2="620" y2="96"  stroke="#2a2418" strokeWidth="1" />
            <path
              d="M0,80 C20,75 40,85 60,70 C80,55 100,60 120,50 C140,40 160,55 180,45
                 C200,35 220,40 240,30 C260,20 280,35 300,25 C320,15 340,20 360,12
                 C380,5 400,18 420,10 C440,3 460,15 480,8 C500,2 520,10 540,5
                 C560,1 580,8 620,4"
              fill="url(#cg)" stroke="#f59e0b" strokeWidth="2" className="svg-draw"
            />
            <path d="M540,5 C560,2 580,-3 620,-8"
              fill="none" stroke="#f59e0b" strokeWidth="2"
              strokeDasharray="5,4" opacity="0.6" />
            <circle cx="540" cy="5" r="4" fill="#f59e0b" opacity="0.9" />
            <text x="548" y="2" fontSize="9" fill="#f59e0b" opacity="0.8">Прогноз</text>
            {[['0','Jan'],['90','Apr'],['180','Jul'],['270','Oct'],['360','2024']].map(([x,l]) => (
              <text key={l} x={x} y="126" fontSize="8" fill="#3a3020">{l}</text>
            ))}
            <text x="480" y="126" fontSize="8" fill="#f59e0b" opacity="0.7">→ Прогноз</text>
          </svg>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add temporary default export so Vite compiles**

Append at end of file:

```jsx
export default function LandingPage({ onLaunch }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Nav onLaunch={onLaunch} />
      <div style={{ marginTop: '60px' }}>
        <TickerTape />
      </div>
      <Hero onLaunch={onLaunch} />
    </div>
  )
}
```

- [ ] **Step 4: Wire LandingPage into App.jsx temporarily to preview**

In `App.jsx` add at top:
```jsx
import LandingPage from './components/LandingPage'
```

Change the initial state from `useState('forecast')` to `useState('landing')`:
```jsx
const [page, setPage] = useState('landing')
```

Add before the `<Header />` render:
```jsx
if (page === 'landing') {
  return <LandingPage onLaunch={() => setPage('forecast')} />
}
```

- [ ] **Step 5: Check browser — verify Nav, TickerTape, Hero render at http://localhost:5173**

Confirm:
- Sticky nav with amber logo appears
- Ticker tape scrolls horizontally
- Hero headline has amber gradient text
- Dashboard floats and scanline animates
- SVG chart draws in on load

- [ ] **Step 6: Commit**

```bash
git add project/frontend/src/components/LandingPage.jsx project/frontend/src/App.jsx
git commit -m "feat: landing page nav, ticker tape, hero sections"
```

---

## Task 3: LandingPage — StatsBar + 3 Feature Rows

**Files:**
- Modify: `project/frontend/src/components/LandingPage.jsx` (add sections, update export)

- [ ] **Step 1: Add useReveal hook and StatsBar**

Add after the Hero function, before the default export:

```jsx
// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); obs.unobserve(el) } },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

// ── StatsBar ──────────────────────────────────────────────────────────────────
function StatsBar() {
  const ref = useReveal()
  return (
    <div ref={ref} className="reveal flex items-center justify-center
                              bg-[var(--surface)] border-y border-[var(--border)] py-10">
      {[
        { val: '8',     lbl: 'ML-моделей' },
        { val: '0.78%', lbl: 'MAPE — лучший результат' },
        { val: '+34%',  lbl: 'Доходность бэктеста' },
        { val: '40+',   lbl: 'Торговых инструментов' },
      ].map((s, i, arr) => (
        <div key={s.lbl}
          className={`flex-1 text-center px-10
            ${i < arr.length - 1 ? 'border-r border-[var(--border)]' : ''}`}>
          <div className="text-[42px] font-extrabold text-amber-400
                          font-[number:tabular-nums] tracking-tight leading-none mb-1.5">
            {s.val}
          </div>
          <div className="text-[13px] text-muted">{s.lbl}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Add FeatureRow component and all 3 feature rows**

```jsx
// ── FeatureRow ────────────────────────────────────────────────────────────────
function FeatureRow({ eyebrow, title, sub, bullets, panel, reverse = false }) {
  const ref = useReveal()
  return (
    <div ref={ref}
      className={`reveal grid gap-20 items-center px-12 py-20 max-w-[1200px] mx-auto
                  border-t border-[var(--border)]
                  ${reverse ? 'grid-cols-[1fr_1fr] direction-rtl' : 'grid-cols-[1fr_1fr]'}`}
      style={reverse ? { direction: 'rtl' } : {}}>
      <div style={reverse ? { direction: 'ltr' } : {}}>
        <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-amber-400 mb-4">
          {eyebrow}
        </div>
        <h2 className="text-[clamp(28px,3.5vw,44px)] font-extrabold text-white
                       leading-[1.15] tracking-[-1px] mb-4"
          dangerouslySetInnerHTML={{ __html: title }} />
        <p className="text-[16px] text-muted leading-[1.7] max-w-[480px] mb-10">{sub}</p>
        <ul className="flex flex-col gap-3.5">
          {bullets.map(b => (
            <li key={b} className="flex items-start gap-3 text-[14px] text-muted leading-[1.5]">
              <span className="text-amber-400 text-[8px] mt-[5px] flex-shrink-0">◆</span>
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div style={reverse ? { direction: 'ltr' } : {}}>
        <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-[14px]
                        overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          <div className="absolute top-0 left-0 right-0 h-px
                          bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          {panel}
        </div>
      </div>
    </div>
  )
}

// Panel: model accuracy bars
function ModelBarsPanel() {
  const BARS = [
    { name: 'ARIMA',       mape: '1.82%', pct: 93, warm: false },
    { name: 'GARCH',       mape: '2.14%', pct: 100, warm: false },
    { name: 'LSTM',        mape: '1.34%', pct: 65, warm: true },
    { name: 'ARIMA+LSTM',  mape: '0.96%', pct: 47, warm: true },
    { name: 'Triple',      mape: '0.87%', pct: 42, warm: true },
    { name: '★ Ensemble',  mape: '0.78%', pct: 38, warm: true, best: true },
  ]
  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        <span className="text-[11px] text-muted">Точность моделей — S&P 500</span>
      </div>
      <div className="p-5">
        <div className="text-[10px] text-muted uppercase tracking-[0.8px] mb-3.5">
          MAPE ↓ (меньше = точнее)
        </div>
        <div className="flex flex-col gap-2.5">
          {BARS.map(b => (
            <div key={b.name} className="flex items-center gap-3">
              <span className={`text-[11px] w-[90px] flex-shrink-0
                ${b.best ? 'text-amber-400' : 'text-muted'}`}>
                {b.name}
              </span>
              <div className="flex-1 h-2 rounded bg-white/5 overflow-hidden">
                <div className="h-full rounded"
                  style={{
                    width: `${b.pct}%`,
                    background: b.best
                      ? 'linear-gradient(90deg,#d97706,#fcd34d)'
                      : b.warm
                        ? 'linear-gradient(90deg,#5a4010,#f59e0b)'
                        : 'linear-gradient(90deg,#3a3020,#7a6a4a)',
                  }} />
              </div>
              <span className={`text-[11px] w-10 text-right font-[number:tabular-nums]
                ${b.best ? 'text-amber-300' : 'text-amber-400'}`}>
                {b.mape}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// Panel: live signals
function SignalsPanel() {
  const SIGNALS = [
    { action: 'BUY',  ticker: '^GSPC',        model: 'Ensemble',      price: '5 248.49', conf: '87%', future: false },
    { action: 'SELL', ticker: 'GAZP.ME',       model: 'ARIMA+LSTM',    price: '163.45',   conf: '72%', future: false },
    { action: 'BUY',  ticker: 'GC=F (Золото)', model: 'Triple Hybrid', price: '2 341.80', conf: '91%', future: false },
    { action: 'HOLD', ticker: 'NVDA',          model: 'GARCH+LSTM',    price: '867.40',   conf: '58%', future: false },
    { action: 'BUY',  ticker: 'BZ=F (Brent)',  model: '★ Прогноз +7d', price: '83.14',    conf: '79%', future: true },
  ]
  const colors = {
    BUY:  { bg: 'bg-green-400/15',  text: 'text-green-400' },
    SELL: { bg: 'bg-red-400/15',    text: 'text-red-400' },
    HOLD: { bg: 'bg-amber-400/15',  text: 'text-amber-400' },
  }
  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        <span className="text-[11px] text-muted">Активные сигналы · Обновлено только что</span>
      </div>
      <div className="p-4 flex flex-col gap-2">
        {SIGNALS.map((s, i) => (
          <div key={i}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border
              ${s.future
                ? 'border-amber-400/20 bg-amber-400/5'
                : 'border-[var(--border)] bg-black/20'}`}>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded
                              ${colors[s.action].bg} ${colors[s.action].text}`}>
              {s.action}
            </span>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-white">{s.ticker}</div>
              <div className={`text-[10px] ${s.future ? 'text-amber-400' : 'text-muted'}`}>
                {s.model}
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className={`text-[12px] font-semibold font-[number:tabular-nums]
                ${s.future ? 'text-amber-300' : 'text-amber-400'}`}>
                {s.price}
              </div>
              <div className="text-[10px] text-muted">уверенность {s.conf}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// Panel: backtest equity curve
function BacktestPanel() {
  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        <span className="text-[11px] text-muted">Backtest · ^GSPC · Ensemble · 2018–2024</span>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Доходность', val: '+34.2%', color: 'text-green-400', sub: 'B&H: +21.4%' },
            { label: 'Sharpe',     val: '1.87',   color: 'text-amber-400', sub: 'отлично (>1)' },
            { label: 'Win Rate',   val: '61%',    color: 'text-amber-400', sub: '42 сделки' },
          ].map(m => (
            <div key={m.label} className="bg-black/20 border border-[var(--border)] rounded-lg px-3 py-2">
              <div className="text-[9px] text-muted uppercase tracking-[0.8px] mb-1">{m.label}</div>
              <div className={`text-[22px] font-bold ${m.color} font-[number:tabular-nums]`}>{m.val}</div>
              <div className="text-[9px] text-muted mt-0.5">{m.sub}</div>
            </div>
          ))}
        </div>
        <svg viewBox="0 0 380 80" className="w-full h-20">
          <defs>
            <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,70 C20,68 40,65 60,58 C80,51 90,55 110,45 C130,35 150,40 170,30
                   C190,22 210,28 230,20 C250,13 270,18 290,12 C310,6 330,10 350,7
                   C365,5 372,4 380,2"
            fill="url(#eq)" stroke="#4ade80" strokeWidth="1.5" />
          <path d="M0,70 C100,60 200,45 380,30"
            fill="none" stroke="#7a6a4a" strokeWidth="1" strokeDasharray="4,3" />
          <text x="300" y="25" fontSize="8" fill="#4ade80">Стратегия</text>
          <text x="300" y="38" fontSize="8" fill="#7a6a4a">Buy &amp; Hold</text>
        </svg>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Update the default export to include new sections**

Replace the default export:

```jsx
export default function LandingPage({ onLaunch }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Nav onLaunch={onLaunch} />
      <div style={{ marginTop: '60px' }}>
        <TickerTape />
      </div>
      <Hero onLaunch={onLaunch} />
      <StatsBar />
      <FeatureRow
        eyebrow="Прогнозирование"
        title="Предсказывай цены с<br/>точностью нейросетей"
        sub="От классического ARIMA до гибридных архитектур — выбирай модель под задачу и получай прогноз за секунды."
        bullets={[
          'Прогноз на любой горизонт — от дней до месяцев',
          'Мультипанельный режим: сравнивай активы параллельно',
          'Метрики точности MAE, RMSE, MAPE для каждой модели',
          '5 сценариев: медвежий → базовый → бычий',
          'Интерактивный зум и инструменты рисования',
        ]}
        panel={<ModelBarsPanel />}
      />
      <FeatureRow
        eyebrow="Торговые сигналы"
        title="Сигналы BUY / SELL<br/>на основе прогноза"
        sub="Алгоритм генерирует чёткие сигналы для входа и выхода из позиции — на истории и с заглядыванием в будущее."
        bullets={[
          '3 стратегии: momentum, mean-reversion, trend-following',
          'Уверенность сигнала в процентах для каждой сделки',
          'Прогноз сигналов на N дней вперёд',
          'Фильтрация по минимальному порогу уверенности',
          'Экспорт сигналов в таблицу',
        ]}
        panel={<SignalsPanel />}
        reverse
      />
      <FeatureRow
        eyebrow="Бэктестирование"
        title="Проверь стратегию<br/>на истории рынка"
        sub="Запусти бэктест любой комбинации актив × модель × стратегия — equity curve, Sharpe, drawdown, win rate."
        bullets={[
          'Кривая капитала vs стратегия Buy & Hold',
          'Sharpe ratio, Max Drawdown, Win Rate, Profit Factor',
          'Комиссия, проскальзывание, реинвестирование',
          'Таблица всех сделок с датами и P&L',
          'Начальный капитал от 1 000 до 1 000 000',
        ]}
        panel={<BacktestPanel />}
      />
    </div>
  )
}
```

- [ ] **Step 4: Check browser — scroll down and verify all 3 feature rows animate in**

Expected: StatsBar numbers visible, 3 feature rows fade up on scroll, panels render correctly.

- [ ] **Step 5: Commit**

```bash
git add project/frontend/src/components/LandingPage.jsx
git commit -m "feat: landing page stats bar and 3 feature rows"
```

---

## Task 4: LandingPage — Models Grid + Testimonials + CTA + Footer

**Files:**
- Modify: `project/frontend/src/components/LandingPage.jsx` (add final sections)

- [ ] **Step 1: Add ModelsSection, Testimonials, CTABlock, Footer**

Add these functions before the default export:

```jsx
// ── ModelsSection ─────────────────────────────────────────────────────────────
const MODELS = [
  { icon: '📐', name: 'ARIMA',          mape: '1.82%', desc: 'Классическая авторегрессия. Хорошо ловит линейные тренды и сезонность.', best: false },
  { icon: '📊', name: 'GARCH',          mape: '2.14%', desc: 'Моделирует волатильность — незаменим для оценки риска.', best: false },
  { icon: '🧠', name: 'LSTM',           mape: '1.34%', desc: 'Нейросеть с долгой памятью. Улавливает нелинейные паттерны.', best: false },
  { icon: '⚡', name: 'ARIMA + LSTM',   mape: '0.96%', desc: 'Линейный ARIMA убирает тренд, LSTM обрабатывает остатки.', best: false },
  { icon: '🔀', name: 'ARIMA + GRU',    mape: '0.98%', desc: 'Быстрее LSTM, сопоставимая точность. GRU-блок вместо LSTM.', best: false },
  { icon: '🌊', name: 'GARCH + LSTM',   mape: '1.09%', desc: 'Совместное моделирование волатильности и уровня цены.', best: false },
  { icon: '🔱', name: 'Triple Hybrid',  mape: '0.87%', desc: 'ARIMA + GARCH + LSTM в одной архитектуре. Топ-2 по точности.', best: false },
  { icon: '★',  name: 'Ensemble',       mape: '0.78%', desc: 'Взвешенное усреднение всех моделей. Наилучшая точность.', best: true },
]

function ModelsSection() {
  const ref = useReveal()
  const gridRef = useReveal()
  return (
    <div className="bg-[var(--surface)] border-y border-[var(--border)] py-20 px-12">
      <div className="max-w-[1200px] mx-auto">
        <div ref={ref} className="reveal text-center mb-12">
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-amber-400 mb-4">
            Арсенал моделей
          </div>
          <h2 className="text-[clamp(28px,3.5vw,44px)] font-extrabold text-white
                         tracking-[-1px] leading-[1.15] mb-4">
            От классики до<br />гибридных архитектур
          </h2>
          <p className="text-[16px] text-muted">
            Каждая модель обучена на ценовых рядах. Ансамбль усредняет лучшие предсказания.
          </p>
        </div>
        <div ref={gridRef} className="reveal grid grid-cols-4 gap-4">
          {MODELS.map(m => (
            <div key={m.name}
              className={`rounded-xl p-5 border cursor-default
                          transition-all duration-300 hover:-translate-y-1
                ${m.best
                  ? 'bg-amber-400/5 border-amber-400/30'
                  : 'bg-black/30 border-[var(--border)] hover:border-amber-400/30'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center
                               text-base mb-3.5
                ${m.best
                  ? 'bg-amber-400/20 border border-amber-400/40'
                  : 'bg-amber-400/10 border border-amber-400/20'}`}>
                {m.icon}
              </div>
              <div className={`text-[13px] font-bold mb-1.5 ${m.best ? 'text-amber-400' : 'text-white'}`}>
                {m.name}
              </div>
              <div className="text-[11px] text-muted leading-[1.6] mb-3">{m.desc}</div>
              <div className={`text-[11px] flex items-center gap-1.5
                ${m.best ? 'text-amber-300' : 'text-amber-400'}`}>
                <span>◆</span> MAPE {m.mape}{m.best ? ' — лучший' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Testimonials ──────────────────────────────────────────────────────────────
function Testimonials() {
  const ref = useReveal()
  const gridRef = useReveal()
  const ITEMS = [
    {
      stars: 5, initials: 'АК', name: 'Алексей К.', role: 'Quant-аналитик',
      text: '«Ensemble стабильно даёт MAPE <1% на S&P 500. Ни один другой открытый инструмент не приближается к этой точности.»',
    },
    {
      stars: 5, initials: 'МВ', name: 'Михаил В.', role: 'Управляющий портфелем',
      text: '«Backtesting с комиссией и проскальзыванием — наконец-то честный результат. Sharpe 1.87 — реально достижимо.»',
    },
    {
      stars: 4, initials: 'ДС', name: 'Дмитрий С.', role: 'Частный инвестор',
      text: '«Сигналы на MOEX работают лучше, чем ожидал. Triple Hybrid на нефтяниках — очень чёткие точки входа.»',
    },
  ]
  return (
    <div className="py-24 px-12">
      <div className="max-w-[1200px] mx-auto">
        <div ref={ref} className="reveal text-center mb-12">
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-amber-400 mb-4">
            Отзывы
          </div>
          <h2 className="text-[clamp(28px,3.5vw,44px)] font-extrabold text-white tracking-[-1px]">
            Что говорят пользователи
          </h2>
        </div>
        <div ref={gridRef} className="reveal grid grid-cols-3 gap-5">
          {ITEMS.map(t => (
            <div key={t.name}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-6
                         hover:border-amber-400/20 transition-colors">
              <div className="text-amber-400 text-[12px] mb-3">{'★'.repeat(t.stars)}{'☆'.repeat(5-t.stars)}</div>
              <p className="text-[13px] text-muted leading-[1.7] mb-4">{t.text}</p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center
                                text-[12px] font-bold text-black
                                bg-gradient-to-br from-amber-500 to-muted">
                  {t.initials}
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-white">{t.name}</div>
                  <div className="text-[10px] text-muted">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── CTABlock ──────────────────────────────────────────────────────────────────
function CTABlock({ onLaunch }) {
  const ref = useReveal()
  return (
    <div ref={ref} className="reveal border-t border-[var(--border)] py-24 px-12 text-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ width: '500px', height: '300px',
          background: 'radial-gradient(ellipse, rgba(245,158,11,0.1) 0%, transparent 70%)' }} />
      <h2 className="text-[clamp(32px,4vw,56px)] font-extrabold text-white
                     tracking-[-1.5px] leading-[1.1] mb-5 relative">
        Начни прогнозировать<br />
        <span className="text-gradient-amber">прямо сейчас</span>
      </h2>
      <p className="text-[16px] text-muted mb-10 relative">
        Без регистрации. Без кредитной карты. Просто выбери актив и модель.
      </p>
      <div className="flex items-center justify-center gap-6 mb-10 flex-wrap">
        {['8 ML-моделей', '40+ инструментов', 'Торговые сигналы', 'Бэктест с Sharpe', 'Бесплатно'].map(f => (
          <span key={f} className="flex items-center gap-1.5 text-[13px] text-muted">
            <span className="text-amber-400 font-bold">✓</span> {f}
          </span>
        ))}
      </div>
      <button onClick={onLaunch}
        className="inline-flex items-center gap-2 text-[16px] font-bold text-black
                   bg-gradient-to-br from-amber-500 to-amber-400
                   px-9 py-4 rounded-xl cursor-pointer relative
                   shadow-[0_4px_24px_rgba(245,158,11,0.3)]
                   hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(245,158,11,0.4)]
                   transition-all">
        Открыть платформу →
      </button>
    </div>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-[var(--border)] pt-16 pb-10 px-12">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-[28px] h-[28px] rounded-[7px] flex items-center justify-center
                              text-black font-extrabold text-[13px]
                              bg-gradient-to-br from-amber-500 to-amber-400">
                α
              </div>
              <span className="text-[16px] font-bold text-white">AlphaSignal</span>
            </div>
            <p className="text-[13px] text-muted leading-[1.6] mb-3.5">
              ML-платформа для прогнозирования финансовых рынков. ARIMA, GARCH, LSTM, гибридные модели и ансамбли.
            </p>
            <p className="text-[11px] text-[var(--dim)] leading-[1.6]">
              Не является инвестиционной рекомендацией. Все прогнозы носят информационный характер.
              Прошлая доходность не гарантирует будущих результатов.
            </p>
          </div>
          {[
            { title: 'Платформа', links: ['Прогноз', 'Торговые сигналы', 'Бэктест', 'Сравнение моделей'] },
            { title: 'Модели',    links: ['ARIMA', 'GARCH', 'LSTM / GRU', 'Гибридные', 'Ensemble'] },
            { title: 'Активы',    links: ['S&P 500, NASDAQ', 'MOEX (Сбер, Лукойл…)', 'Нефть Brent / WTI', 'Золото, Газ', 'Технологии (AAPL, NVDA…)'] },
          ].map(col => (
            <div key={col.title}>
              <div className="text-[11px] font-bold tracking-[1px] uppercase text-[var(--dim)] mb-4">
                {col.title}
              </div>
              {col.links.map(l => (
                <a key={l} className="block text-[13px] text-muted mb-2.5 cursor-pointer hover:text-warm transition-colors">
                  {l}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--border)] pt-6 flex items-center justify-between
                        text-[12px] text-[var(--dim)]">
          <span>© 2025 AlphaSignal. Дипломная работа МТУСИ.</span>
          <span>Сделано с ♥ и TensorFlow</span>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Update default export with all sections**

Replace the existing default export with:

```jsx
export default function LandingPage({ onLaunch }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Nav onLaunch={onLaunch} />
      <div style={{ marginTop: '60px' }}>
        <TickerTape />
      </div>
      <Hero onLaunch={onLaunch} />
      <StatsBar />
      <FeatureRow
        eyebrow="Прогнозирование"
        title="Предсказывай цены с<br/>точностью нейросетей"
        sub="От классического ARIMA до гибридных архитектур — выбирай модель под задачу и получай прогноз за секунды."
        bullets={[
          'Прогноз на любой горизонт — от дней до месяцев',
          'Мультипанельный режим: сравнивай активы параллельно',
          'Метрики точности MAE, RMSE, MAPE для каждой модели',
          '5 сценариев: медвежий → базовый → бычий',
          'Интерактивный зум и инструменты рисования',
        ]}
        panel={<ModelBarsPanel />}
      />
      <FeatureRow
        eyebrow="Торговые сигналы"
        title="Сигналы BUY / SELL<br/>на основе прогноза"
        sub="Алгоритм генерирует чёткие сигналы для входа и выхода из позиции — на истории и с заглядыванием в будущее."
        bullets={[
          '3 стратегии: momentum, mean-reversion, trend-following',
          'Уверенность сигнала в процентах для каждой сделки',
          'Прогноз сигналов на N дней вперёд',
          'Фильтрация по минимальному порогу уверенности',
          'Экспорт сигналов в таблицу',
        ]}
        panel={<SignalsPanel />}
        reverse
      />
      <FeatureRow
        eyebrow="Бэктестирование"
        title="Проверь стратегию<br/>на истории рынка"
        sub="Запусти бэктест любой комбинации актив × модель × стратегия — equity curve, Sharpe, drawdown, win rate."
        bullets={[
          'Кривая капитала vs стратегия Buy & Hold',
          'Sharpe ratio, Max Drawdown, Win Rate, Profit Factor',
          'Комиссия, проскальзывание, реинвестирование',
          'Таблица всех сделок с датами и P&L',
          'Начальный капитал от 1 000 до 1 000 000',
        ]}
        panel={<BacktestPanel />}
      />
      <ModelsSection />
      <Testimonials />
      <CTABlock onLaunch={onLaunch} />
      <Footer />
    </div>
  )
}
```

- [ ] **Step 3: Scroll through entire landing page in browser**

Verify each section fades in on scroll. Confirm CTA button calls `onLaunch` (should enter forecast app). Footer renders without layout breaks.

- [ ] **Step 4: Commit**

```bash
git add project/frontend/src/components/LandingPage.jsx
git commit -m "feat: landing page models grid, testimonials, CTA, footer"
```

---

## Task 5: Header.jsx redesign

**Files:**
- Modify: `project/frontend/src/components/Header.jsx`

- [ ] **Step 1: Replace Header.jsx entirely**

```jsx
// project/frontend/src/components/Header.jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add project/frontend/src/components/Header.jsx
git commit -m "feat: redesign header with AlphaSignal amber branding"
```

---

## Task 6: App.jsx — wire landing page + update tab styles

**Files:**
- Modify: `project/frontend/src/App.jsx`

- [ ] **Step 1: Update App.jsx**

Replace the entire file:

```jsx
// project/frontend/src/App.jsx
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
          <div className={`${gridClass} gap-4`}>
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
```

- [ ] **Step 2: Update ChartPanel.jsx run button and active accents from indigo → amber**

In `project/frontend/src/components/ChartPanel.jsx`:

Find and replace these class strings:

```
'border-indigo-500 text-white'  →  'border-amber-400 text-amber-400'
'bg-indigo-600 hover:bg-indigo-500'  →  'bg-amber-400 hover:bg-amber-300 text-black'
'hover:border-indigo-500'  →  'hover:border-amber-400/50'
'bg-indigo-600 text-white'  →  'bg-amber-400/20 text-amber-400'
```

Also update the `sel` constant:
```jsx
const sel = 'bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-warm focus:outline-none focus:border-amber-400 transition-colors px-2 py-1.5'
```

- [ ] **Step 3: Full smoke test in browser**

1. Open http://localhost:5173 → landing page loads with amber styling
2. Click "Открыть платформу" → navigates to forecast app
3. Header shows AlphaSignal branding, tabs work
4. Add a panel, run a forecast — loading spinner + results display
5. Switch to Signals tab — signals page loads

- [ ] **Step 4: Commit**

```bash
git add project/frontend/src/App.jsx project/frontend/src/components/ChartPanel.jsx
git commit -m "feat: wire landing page routing and amber accent throughout app"
```

---

## Self-Review

**Spec coverage:**
- ✅ Sticky Nav with logo + CTA
- ✅ Ticker tape (scroll marquee)
- ✅ Hero (gradient headline, dashboard mockup, float + scanline animations)
- ✅ Stats bar (4 numbers)
- ✅ Feature blocks ×3 (Forecast / Signals / Backtest) with real panels
- ✅ Models grid (8 cards, real MAPE values)
- ✅ Testimonials (3 cards)
- ✅ CTA block
- ✅ Footer with disclaimer
- ✅ Header redesign
- ✅ App routing (landing → forecast)
- ✅ Amber palette replaces indigo in ChartPanel

**Placeholder scan:** No TBDs. All code blocks complete. MAPE values match `BASELINE_METRICS` in `main.py`.

**Type consistency:** `onLaunch` prop passed consistently from `App → LandingPage → Nav/Hero/CTABlock`. `page`/`onNavigate` props match Header signature. `onRemove` unchanged in ChartPanel.
