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
