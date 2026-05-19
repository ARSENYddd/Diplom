// project/frontend/src/components/LandingPage.jsx
import { useEffect, useRef, useState } from 'react'
import {
  IconTrendLine, IconVolatility, IconNeuralNet,
  IconBolt, IconMerge, IconWave, IconTriple, IconStar,
  IconBarChart, IconTarget,
  IconLightning, IconDiamond,
  IconCheck, IconCross, IconHeart, IconStarFilled, IconStarEmpty,
} from './Icons'

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

// Nav is now UnifiedNav, rendered by App

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
function Hero({ onOpenPricing }) {
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
        <IconLightning size={14} className="inline-block mr-1"/> ML-прогнозирование финансовых рынков
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
        16 моделей — ARIMA, LSTM, Transformer, PatchTST и гибриды — дают прогноз, торговые сигналы
        и бэктест для любого актива: S&P 500, MOEX, нефть, золото.
      </p>

      {/* CTAs */}
      <div className="flex items-center gap-3.5 mb-16
                      animate-fade-up [animation-delay:300ms]">
        <button onClick={onOpenPricing}
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
    <div className="w-full max-w-[900px] animate-fade-up [animation-delay:400ms]">
    <div className="relative w-full rounded-2xl overflow-hidden
                    bg-[var(--surface)] border border-[var(--border)]
                    shadow-[0_32px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(245,158,11,0.1)]
                    animate-float">
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
            ARIMA · SARIMA · GARCH<br />
            Prophet · XGBoost · LSTM<br />
            TCN · N-BEATS · Transformer<br />
            TFT · PatchTST · Гибриды<br />
            <span className="text-amber-400 inline-flex items-center gap-1"><IconStar size={10}/> Ensemble</span>
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
    </div>
  )
}

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
        { val: '16',    lbl: 'ML-моделей' },
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

// ── FeatureRow ────────────────────────────────────────────────────────────────
function FeatureRow({ eyebrow, title, sub, bullets, panel, reverse = false }) {
  const ref = useReveal()
  return (
    <div ref={ref}
      className="reveal grid grid-cols-[1fr_1fr] gap-20 items-center px-12 py-20 max-w-[1200px] mx-auto border-t border-[var(--border)]"
      style={reverse ? { direction: 'rtl' } : {}}>
      <div style={reverse ? { direction: 'ltr' } : {}}>
        <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-amber-400 mb-4">
          {eyebrow}
        </div>
        <h2 className="text-[clamp(28px,3.5vw,44px)] font-extrabold text-white
               leading-[1.15] tracking-[-1px] mb-4">
          {title.split('<br/>').map((part, i, arr) => (
            <span key={i}>{part}{i < arr.length - 1 && <br />}</span>
          ))}
        </h2>
        <p className="text-[16px] text-muted leading-[1.7] max-w-[480px] mb-10">{sub}</p>
        <ul className="flex flex-col gap-3.5">
          {bullets.map(b => (
            <li key={b} className="flex items-start gap-3 text-[14px] text-muted leading-[1.5]">
              <IconDiamond size={7} className="mt-[6px] flex-shrink-0"/>
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

// ── Panel data ────────────────────────────────────────────────────────────────
const BARS = [
  { name: 'ARIMA',       mape: '1.82%', pct: 93,  warm: false },
  { name: 'GARCH',       mape: '2.14%', pct: 100, warm: false },
  { name: 'LSTM',        mape: '1.34%', pct: 65,  warm: true  },
  { name: 'ARIMA+LSTM',  mape: '0.96%', pct: 47,  warm: true  },
  { name: 'Triple',      mape: '0.87%', pct: 42,  warm: true  },
  { name: 'Ensemble',    mape: '0.78%', pct: 38,  warm: true, best: true },
]

const SIGNALS = [
  { action: 'BUY',  ticker: '^GSPC',        model: 'Ensemble',      price: '5 248.49', conf: '87%', future: false },
  { action: 'SELL', ticker: 'GAZP.ME',       model: 'ARIMA+LSTM',    price: '163.45',   conf: '72%', future: false },
  { action: 'BUY',  ticker: 'GC=F (Золото)', model: 'Triple Hybrid', price: '2 341.80', conf: '91%', future: false },
  { action: 'HOLD', ticker: 'NVDA',          model: 'GARCH+LSTM',    price: '867.40',   conf: '58%', future: false },
  { action: 'BUY',  ticker: 'BZ=F (Brent)',  model: 'Прогноз +7d',   price: '83.14',    conf: '79%', future: true  },
]

const SIGNAL_COLORS = {
  BUY:  { bg: 'bg-green-400/15',  text: 'text-green-400' },
  SELL: { bg: 'bg-red-400/15',    text: 'text-red-400'   },
  HOLD: { bg: 'bg-amber-400/15',  text: 'text-amber-400' },
}

// Panel: model accuracy bars
function ModelBarsPanel() {
  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        <span className="text-[11px] text-muted">Точность моделей — S&amp;P 500</span>
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
  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        <span className="text-[11px] text-muted">Активные сигналы · Обновлено только что</span>
      </div>
      <div className="p-4 flex flex-col gap-2">
        {SIGNALS.map((s) => (
          <div key={s.ticker}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border
              ${s.future
                ? 'border-amber-400/20 bg-amber-400/5'
                : 'border-[var(--border)] bg-black/20'}`}>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded
                              ${SIGNAL_COLORS[s.action].bg} ${SIGNAL_COLORS[s.action].text}`}>
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
            { label: 'Win Rate',   val: '61%',    color: 'text-amber-400', sub: '42 сделки'   },
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
            <linearGradient id="bt-eq" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,70 C20,68 40,65 60,58 C80,51 90,55 110,45 C130,35 150,40 170,30
                   C190,22 210,28 230,20 C250,13 270,18 290,12 C310,6 330,10 350,7
                   C365,5 372,4 380,2"
            fill="url(#bt-eq)" stroke="#4ade80" strokeWidth="1.5" />
          <path d="M0,70 C100,60 200,45 380,30"
            fill="none" stroke="#7a6a4a" strokeWidth="1" strokeDasharray="4,3" />
          <text x="300" y="25" fontSize="8" fill="#4ade80">Стратегия</text>
          <text x="300" y="38" fontSize="8" fill="#7a6a4a">Buy &amp; Hold</text>
        </svg>
      </div>
    </>
  )
}

// ── Models data (module scope) ────────────────────────────────────────────────
const MODELS = [
  { icon: <IconTrendLine size={18}/>, name: 'ARIMA',         mape: '1.82%', desc: 'Классическая авторегрессия. Хорошо ловит линейные тренды и сезонность.',       best: false },
  { icon: <IconTrendLine size={18}/>, name: 'SARIMA',        mape: '1.68%', desc: 'ARIMA с сезонностью. Улавливает недельные и годовые рыночные паттерны.',        best: false },
  { icon: <IconVolatility size={18}/>,name: 'GARCH',         mape: '2.14%', desc: 'Моделирует волатильность — незаменим для оценки риска.',                        best: false },
  { icon: <IconWave size={18}/>,      name: 'Prophet',       mape: '1.93%', desc: 'Модель Meta. Автоматически выделяет тренд, сезонность и праздники.',            best: false },
  { icon: <IconBarChart size={18}/>,  name: 'XGBoost',       mape: '1.16%', desc: 'Градиентный бустинг деревьев. Быстрый, интерпретируемый, не требует нормализации.', best: false },
  { icon: <IconNeuralNet size={18}/>, name: 'LSTM',          mape: '1.34%', desc: 'Нейросеть с долгой памятью. Улавливает нелинейные паттерны.',                   best: false },
  { icon: <IconNeuralNet size={18}/>, name: 'TCN',           mape: '1.05%', desc: 'Дилатированные свёртки. Параллельнее LSTM, охватывает длинный контекст.',       best: false },
  { icon: <IconTriple size={18}/>,    name: 'N-BEATS',       mape: '0.99%', desc: 'MLP-блоки с backcast/forecast разложением. Победитель M4 Competition.',         best: false },
  { icon: <IconStar size={18}/>,      name: 'Transformer',   mape: '0.92%', desc: 'Механизм самовнимания — глобальный контекст всей последовательности.',          best: false },
  { icon: <IconMerge size={18}/>,     name: 'TFT',           mape: '0.81%', desc: 'Google 2021: LSTM + внимание + GLU-ворота. Интерпретируемый и точный.',         best: false },
  { icon: <IconTarget size={18}/>,    name: 'PatchTST',      mape: '0.76%', desc: 'Патч-токенизация 2023. Лучший MAPE среди всех одиночных моделей.',              best: false },
  { icon: <IconBolt size={18}/>,      name: 'ARIMA + LSTM',  mape: '0.96%', desc: 'Линейный ARIMA убирает тренд, LSTM обрабатывает остатки.',                      best: false },
  { icon: <IconMerge size={18}/>,     name: 'ARIMA + GRU',   mape: '0.98%', desc: 'Быстрее LSTM, сопоставимая точность. GRU-блок вместо LSTM.',                   best: false },
  { icon: <IconWave size={18}/>,      name: 'GARCH + LSTM',  mape: '1.09%', desc: 'Совместное моделирование волатильности и уровня цены.',                         best: false },
  { icon: <IconTriple size={18}/>,    name: 'Triple Hybrid', mape: '0.87%', desc: 'ARIMA + GARCH + LSTM в одной архитектуре. Топ-2 по точности.',                  best: false },
  { icon: <IconStar size={18}/>,      name: 'Ensemble',      mape: '0.78%', desc: 'Взвешенное усреднение всех 15 моделей. Наилучшая точность.',                    best: true  },
]

const MODEL_DETAILS = {
  'ARIMA': {
    full: 'AutoRegressive Integrated Moving Average — классическая статистическая модель временных рядов. Разделяет сигнал на авторегрессионную, интегрирующую и скользящей-средней компоненты.',
    when: 'Стабильные тренды без резких выбросов. Рынки с выраженным направленным движением.',
    tags: ['Трендовые рынки', 'Стабильные активы', 'Малые данные'],
    assets: ['S&P 500', 'Dow Jones', 'Сбербанк', 'Норникель'],
    speed: 'Быстро',
    pros: ['Интерпретируем — понятно что и почему', 'Работает на малых датасетах (от 1 года)', 'Очень быстрый расчёт'],
    cons: ['Только линейные зависимости', 'Не учитывает волатильность', 'Плохо на кризисных данных'],
    notFor: 'Острые новостные реакции, геополитические шоки, сырьевые рынки с кластерной волатильностью.',
  },
  'GARCH': {
    full: 'Generalized AutoRegressive Conditional Heteroskedasticity — модель для прогнозирования условной дисперсии (волатильности). Строит прогноз цены через моделирование рисков.',
    when: 'Активы с переменной волатильностью и кластеризацией рисков. Сырьё, валюты, газ.',
    tags: ['Высокая волатильность', 'Риск-менеджмент', 'Сырьё'],
    assets: ['Brent', 'WTI', 'Газ (NG=F)', 'Газпром'],
    speed: 'Быстро',
    pros: ['Точно передаёт кластеры волатильности', 'Лучший для риск-оценки', 'Устойчив к выбросам'],
    cons: ['Не даёт прямой прогноз цены', 'Хуже на тихих трендовых рынках', 'Сложнее интерпретировать'],
    notFor: 'Тихие, трендовые рынки без скачков волатильности (например, стабильные голубые фишки).',
  },
  'LSTM': {
    full: 'Long Short-Term Memory — рекуррентная нейросеть с механизмом памяти. Улавливает долгосрочные зависимости в последовательных данных, недоступные классическим моделям.',
    when: 'Нелинейные паттерны, долгосрочные зависимости, технологические акции с momentum-эффектом.',
    tags: ['Нелинейность', 'Технологии', 'Долгосрочные паттерны'],
    assets: ['NVIDIA', 'Apple', 'Tesla', 'NASDAQ'],
    speed: 'Среднее',
    pros: ['Улавливает сложные нелинейные паттерны', 'Адаптируется к смене режимов рынка', 'Лучший среди чистых нейросетей'],
    cons: ['Требует больших данных (2+ лет)', '"Чёрный ящик" — сложно интерпретировать', 'Дольше обучается'],
    notFor: 'Малые датасеты (менее 1 года). Очень зашумлённые ряды без паттернов.',
  },
  'ARIMA+LSTM': {
    full: 'Гибрид: ARIMA захватывает линейный тренд и автокорреляцию, LSTM дообучается на остатках — нелинейной компоненте, которую классика не видит.',
    when: 'Смешанные рынки: есть тренд и нелинейность одновременно. Фондовые индексы, голубые фишки.',
    tags: ['Смешанные рынки', 'Индексы', 'Баланс точности'],
    assets: ['S&P 500', 'Сбербанк', 'Лукойл', 'Яндекс'],
    speed: 'Среднее',
    pros: ['Баланс интерпретируемости и мощи', 'Стабильный топ-3 по MAPE', 'Хорошо обобщает на новых данных'],
    cons: ['Два этапа обучения', 'Сложнее в настройке гиперпараметров'],
    notFor: 'Чисто хаотичные ряды без линейной компоненты (случайное блуждание).',
  },
  'ARIMA+GRU': {
    full: 'Аналог ARIMA+LSTM, но вместо LSTM используется GRU (Gated Recurrent Unit) — более лёгкая архитектура с меньшим количеством параметров при сопоставимой точности.',
    when: 'Те же задачи что и ARIMA+LSTM, но когда важна скорость или меньше данных.',
    tags: ['Скорость', 'Эффективность', 'Нефтяной сектор'],
    assets: ['Лукойл', 'Роснефть', 'Норникель', 'МТС'],
    speed: 'Среднее',
    pros: ['Быстрее ARIMA+LSTM при схожей точности', 'Меньше параметров — меньше переобучение', 'Хорош на данных среднего объёма'],
    cons: ['Чуть менее мощный чем LSTM на сложных паттернах'],
    notFor: 'Очень долгосрочные зависимости (>5 лет), где LSTM превосходит GRU.',
  },
  'GARCH+LSTM': {
    full: 'GARCH моделирует волатильность и встраивает её как признак в LSTM. Это позволяет нейросети явно учитывать изменения риска при прогнозировании цены.',
    when: 'Высоковолатильные активы: сырьё, нефть, газ, акции с новостными скачками.',
    tags: ['Волатильные активы', 'Сырьё', 'Risk-aware'],
    assets: ['Brent', 'WTI', 'Газ', 'Сургутнефтегаз'],
    speed: 'Среднее',
    pros: ['Объединяет риск-моделирование и нелинейность', 'Лучший для сырьевых активов', 'Устойчивее к скачкам'],
    cons: ['Два этапа (GARCH → LSTM) усложняют пайплайн', 'Чувствителен к выбору окна GARCH'],
    notFor: 'Стабильные активы без волатильных кластеров, где преимущество GARCH не реализуется.',
  },
  'Triple Hybrid': {
    full: 'ARIMA + GARCH + LSTM в единой архитектуре: линейный тренд + волатильность + нелинейные паттерны. Самая комплексная модель после Ensemble.',
    when: 'Сложные рынки со множеством режимов: тренд, боковик, волатильность. Российские акции.',
    tags: ['Комплексные рынки', 'MOEX', 'Многорежимность'],
    assets: ['Газпром', 'Татнефть', 'Магнит', 'ВТБ'],
    speed: 'Медленно',
    pros: ['Охватывает линейное, волатильное и нелинейное', 'Топ-2 по точности после Ensemble', 'Робастный на разных режимах рынка'],
    cons: ['Самая медленная одиночная модель', 'Много гиперпараметров', 'Риск переобучения на малых датасетах'],
    notFor: 'Быстрый прогноз в реальном времени. Малые данные (менее 2 лет).',
  },
  'Ensemble': {
    full: 'Взвешенное усреднение предсказаний всех 15 моделей. Веса подбираются по валидационной ошибке: точные модели получают больший вес.',
    when: 'Когда важна максимальная точность. Финальный прогноз перед принятием решения.',
    tags: ['Максимальная точность', 'Любые активы', 'Финальный прогноз'],
    assets: ['Все инструменты', 'S&P 500', 'Сбербанк', 'Brent'],
    speed: 'Медленно',
    pros: ['Лучший MAPE 0.78% — #1 среди всех', 'Усредняет ошибки отдельных моделей', 'Работает на любых активах'],
    cons: ['Самый медленный (запускает все 15 моделей)', 'Сложнее объяснить прогноз', 'Тяжелее по ресурсам'],
    notFor: 'Интерактивный анализ в реальном времени. Используй когда важна точность, а не скорость.',
  },
  'SARIMA': {
    full: 'Seasonal ARIMA — расширение ARIMA с явным моделированием сезонности. Добавляет сезонные лаги с периодом m (5 для дневных данных, 52 для недельных). Параметры подбираются автоматически.',
    when: 'Активы с выраженной сезонностью: товарные фьючерсы, газ, акции с квартальными циклами.',
    tags: ['Сезонность', 'Статистика', 'Газ и сырьё'],
    assets: ['Газ (NG=F)', 'Brent', 'Новатэк', 'Газпром'],
    speed: 'Быстро',
    pros: ['Явно моделирует сезонность', 'Автоматический подбор параметров', 'Быстрый расчёт'],
    cons: ['На данных без сезонности не лучше ARIMA', 'Только линейные зависимости'],
    notFor: 'Акции без сезонных паттернов и высокочастотные данные без регулярных циклов.',
  },
  'Prophet': {
    full: 'Аддитивная модель Meta (2017). Разбивает ряд на тренд + сезонность + праздники. Changepoint detection автоматически находит точки смены тренда. Устойчив к пропускам данных.',
    when: 'Длинные ряды с выраженной годовой или недельной сезонностью. ETF, фондовые индексы.',
    tags: ['Meta', 'Сезонность', 'Тренд'],
    assets: ['Brent', 'Золото (GC=F)', 'S&P 500', 'Магнит'],
    speed: 'Быстро',
    pros: ['Интерпретируемые компоненты', 'Устойчив к пропускам', 'Не требует нормализации'],
    cons: ['Слабее нейросетей на сложных паттернах', 'Оптимален только при наличии сезонности'],
    notFor: 'Высокочастотные данные без сезонности. Внутридневная торговля.',
  },
  'XGBoost': {
    full: 'Gradient Boosting на деревьях решений. Для временных рядов строит lag-признаки (до 60 лагов) и скользящие статистики. Walk-forward прогноз, быстрое обучение.',
    when: 'Рынки с чёткими лаговыми зависимостями. Когда важна интерпретируемость через feature importance.',
    tags: ['ML', 'Деревья', 'Интерпретируемость'],
    assets: ['Сбербанк', 'Лукойл', 'Apple', 'Microsoft'],
    speed: 'Быстро',
    pros: ['Не требует нормализации', 'Быстрее нейросетей в 5–10 раз', 'Feature importance'],
    cons: ['Требует ручных признаков', 'Хуже при смене рыночных режимов'],
    notFor: 'Ряды без чётких лаговых паттернов. Очень долгосрочные прогнозы.',
  },
  'TCN': {
    full: 'Temporal Convolutional Network — дилатированные причинные свёртки. Параллельная обработка (быстрее LSTM), экспоненциальное расширение рецептивного поля через дилатацию 1/2/4/8.',
    when: 'Длинные временные ряды (1000+ точек). Задачи где важна скорость обучения.',
    tags: ['Свёртки', 'Параллельность', 'Нейросеть'],
    assets: ['NASDAQ', 'S&P 500', 'NVIDIA', 'Tesla'],
    speed: 'Среднее',
    pros: ['Параллельное обучение — быстрее LSTM', 'Большое рецептивное поле', 'Residual-соединения'],
    cons: ['Фиксированное рецептивное поле', 'Менее гибок при смене сезонности'],
    notFor: 'Очень короткие ряды. Данные с нерегулярными временными интервалами.',
  },
  'N-BEATS': {
    full: 'Neural Basis Expansion Analysis — чисто MLP архитектура без рекуррентности. Блоки backcast/forecast разлагают ряд на компоненты. Победитель M4 и M5 соревнований по временным рядам.',
    when: 'Стабильные финансовые ряды с трендом. Эффективен при небольшом количестве данных.',
    tags: ['MLP', 'Разложение', 'M4 Champion'],
    assets: ['Dow Jones', 'Сбербанк', 'Лукойл', 'Chevron'],
    speed: 'Среднее',
    pros: ['Победитель M4 Competition', 'Нет рекуррентности — стабильное обучение', 'Интерпретируемое разложение'],
    cons: ['Не умеет использовать дополнительные признаки', 'Сложнее настраивать чем LSTM'],
    notFor: 'Данные с резкими структурными сдвигами. Криптовалюты с хаотичной динамикой.',
  },
  'Transformer': {
    full: 'Механизм самовнимания (Vaswani, 2017). Каждый токен смотрит на все остальные одновременно — глобальный контекст без рекуррентности. d_model=64, 4 головы, 2 слоя.',
    when: 'Долгосрочные прогнозы (недели, месяцы). Рынки с системными паттернами.',
    tags: ['SOTA', 'Внимание', 'Параллельность'],
    assets: ['S&P 500', 'NASDAQ', 'Apple', 'Google'],
    speed: 'Медленно',
    pros: ['Глобальный контекст всей последовательности', 'Параллельная обработка', 'Основа всех SOTA-моделей'],
    cons: ['Требователен к памяти O(n²)', 'Переобучение на малых данных'],
    notFor: 'Малые датасеты (<500 точек). Очень короткий горизонт прогноза.',
  },
  'TFT': {
    full: 'Temporal Fusion Transformer (Google, 2021). LSTM-энкодер + темпоральное внимание + GLU-ворота для отбора признаков. Интерпретируем через attention weights.',
    when: 'Когда важна интерпретируемость + точность. Корпоративный риск-менеджмент.',
    tags: ['Google', 'Интерпретируемость', 'GLU'],
    assets: ['S&P 500', 'Сбербанк', 'Лукойл', 'Brent'],
    speed: 'Медленно',
    pros: ['Интерпретируемость через attention', 'GLU для автоотбора признаков', 'Объединяет LSTM + Transformer'],
    cons: ['Самый сложный пайплайн', 'Медленное обучение'],
    notFor: 'Быстрый прототип. Малые данные.',
  },
  'PatchTST': {
    full: 'Patch Time Series Transformer (2023). Ряд делится на патчи (подпоследовательности) — каждый патч обрабатывается как токен. GELU-активации, learnable positional embedding.',
    when: 'Среднесрочные прогнозы 1–3 месяца. Ряды с локальными паттернами внутри патча.',
    tags: ['2023', 'Лучший MAPE', 'Патчи'],
    assets: ['S&P 500', 'NASDAQ', 'NVIDIA', 'Tesla', 'Яндекс'],
    speed: 'Медленно',
    pros: ['Лучший MAPE 0.76% — #1 среди одиночных', 'Патч-токенизация эффективнее point-wise', 'GELU лучше ReLU для финансов'],
    cons: ['Длина окна должна делиться на patch_size', 'Требует много данных'],
    notFor: 'Очень короткие ряды. Внутридневные данные с нерегулярными паттернами.',
  },
}

// ── ModelModal ─────────────────────────────────────────────────────────────────
function ModelModal({ model, details, onClose }) {
  if (!model || !details) return null

  const speedColor = { 'Быстро': 'text-green-400', 'Среднее': 'text-amber-400', 'Медленно': 'text-red-400' }[details.speed] ?? 'text-muted'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="relative w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)]
                      rounded-2xl p-8 animate-fade-up shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-warm transition-colors text-[22px] leading-none">
          ×
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0
            ${model.best ? 'bg-amber-400/20 border border-amber-400/40' : 'bg-amber-400/10 border border-amber-400/20'}`}>
            {model.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`text-[20px] font-bold ${model.best ? 'text-amber-400' : 'text-white'}`}>
                {model.name}
              </h3>
              {model.best && (
                <span className="text-[10px] font-bold tracking-[1px] uppercase bg-amber-400 text-black px-2 py-0.5 rounded-full">
                  Лучший
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[12px]">
              <span className="text-amber-400 font-semibold">MAPE {model.mape}</span>
              <span className={`font-medium ${speedColor} inline-flex items-center gap-1`}><IconLightning size={12}/> {details.speed}</span>
            </div>
          </div>
        </div>

        {/* What */}
        <p className="text-[14px] text-warm leading-[1.7] mb-5">{details.full}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-5">
          {details.tags.map(t => (
            <span key={t} className="text-[11px] font-semibold bg-amber-400/10 border border-amber-400/25 text-amber-300 px-2.5 py-1 rounded-full">
              {t}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* When */}
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-[1px] text-muted mb-2">Лучше всего для</p>
            <p className="text-[13px] text-warm leading-[1.6]">{details.when}</p>
          </div>
          {/* Assets */}
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-[1px] text-muted mb-2">Примеры активов</p>
            <div className="flex flex-wrap gap-1.5">
              {details.assets.map(a => (
                <span key={a} className="text-[11px] text-warm bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 rounded">
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Pros */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[1px] text-green-400 mb-2">Плюсы</p>
            <ul className="space-y-1.5">
              {details.pros.map(p => (
                <li key={p} className="text-[13px] text-warm flex items-start gap-2">
                  <IconCheck size={14} className="mt-0.5 flex-shrink-0"/>{p}
                </li>
              ))}
            </ul>
          </div>
          {/* Cons */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[1px] text-red-400 mb-2">Минусы</p>
            <ul className="space-y-1.5">
              {details.cons.map(c => (
                <li key={c} className="text-[13px] text-warm flex items-start gap-2">
                  <IconCross size={14} className="mt-0.5 flex-shrink-0"/>{c}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* When NOT */}
        <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-[1px] text-red-400 mb-1">Когда не использовать</p>
          <p className="text-[13px] text-warm/80">{details.notFor}</p>
        </div>
      </div>
    </div>
  )
}

// ── ModelsSection ─────────────────────────────────────────────────────────────
function ModelsSection() {
  const headRef = useReveal()
  const gridRef = useReveal()
  const [activeModel, setActiveModel] = useState(null)

  return (
    <div id="models" className="bg-[var(--surface)] border-y border-[var(--border)] py-20 px-12">
      <div className="max-w-[1200px] mx-auto">
        <div ref={headRef} className="reveal text-center mb-12">
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-amber-400 mb-4">
            Арсенал моделей
          </div>
          <h2 className="text-[clamp(28px,3.5vw,44px)] font-extrabold text-white
                         tracking-[-1px] leading-[1.15] mb-4">
            16 моделей — от классики<br />до современных трансформеров
          </h2>
          <p className="text-[16px] text-muted">
            Кликни на карточку — узнай когда и где применять каждую модель.
          </p>
        </div>
        <div ref={gridRef} className="reveal grid grid-cols-4 gap-4">
          {MODELS.map(m => (
            <button key={m.name}
              onClick={() => setActiveModel(m)}
              className={`rounded-xl p-5 border text-left
                          transition-all duration-300 hover:-translate-y-1 hover:shadow-lg
                ${m.best
                  ? 'bg-amber-400/5 border-amber-400/30 hover:border-amber-400/60'
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
                <IconDiamond size={7}/> MAPE {m.mape}{m.best ? ' — лучший' : ''}
              </div>
              <div className="text-[10px] text-muted/60 mt-2">Подробнее →</div>
            </button>
          ))}
        </div>
      </div>

      <ModelModal
        model={activeModel}
        details={activeModel ? MODEL_DETAILS[activeModel.name] : null}
        onClose={() => setActiveModel(null)}
      />
    </div>
  )
}

// ── Testimonials data (module scope) ──────────────────────────────────────────
const TESTIMONIALS = [
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

// ── Testimonials ──────────────────────────────────────────────────────────────
function Testimonials() {
  const headRef = useReveal()
  const gridRef = useReveal()
  return (
    <div className="py-24 px-12">
      <div className="max-w-[1200px] mx-auto">
        <div ref={headRef} className="reveal text-center mb-12">
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-amber-400 mb-4">
            Отзывы
          </div>
          <h2 className="text-[clamp(28px,3.5vw,44px)] font-extrabold text-white tracking-[-1px]">
            Что говорят пользователи
          </h2>
        </div>
        <div ref={gridRef} className="reveal grid grid-cols-3 gap-5">
          {TESTIMONIALS.map(t => (
            <div key={t.name}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-6
                         hover:border-amber-400/20 transition-colors">
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: 5 }, (_, i) =>
                  i < t.stars
                    ? <IconStarFilled key={i} size={13}/>
                    : <IconStarEmpty  key={i} size={13}/>
                )}
              </div>
              <p className="text-[13px] text-muted leading-[1.7] mb-4">{t.text}</p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center
                                text-[12px] font-bold text-black
                                bg-gradient-to-br from-amber-400 to-amber-600">
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
function CTABlock({ onOpenPricing }) {
  const ref = useReveal()
  return (
    <div ref={ref}
      className="reveal border-t border-[var(--border)] py-24 px-12 text-center relative overflow-hidden">
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
        {['16 ML-моделей', '40+ инструментов', 'Торговые сигналы', 'Бэктест с Sharpe', 'Бесплатно'].map(f => (
          <span key={f} className="flex items-center gap-1.5 text-[13px] text-muted">
            <IconCheck size={13}/> {f}
          </span>
        ))}
      </div>
      <button onClick={onOpenPricing}
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

// ── Footer data (module scope) ────────────────────────────────────────────────
const FOOTER_COLS = [
  { title: 'Платформа', links: ['Прогноз', 'Торговые сигналы', 'Бэктест', 'Сравнение моделей'] },
  { title: 'Модели',    links: ['ARIMA / SARIMA', 'GARCH / Prophet', 'LSTM / TCN / N-BEATS', 'Transformer / TFT / PatchTST', 'Гибридные / Ensemble'] },
  { title: 'Активы',    links: ['S&P 500, NASDAQ', 'MOEX (Сбер, Лукойл…)', 'Нефть Brent / WTI', 'Золото, Газ', 'Технологии (AAPL, NVDA…)'] },
]

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
          {FOOTER_COLS.map(col => (
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
          <span className="inline-flex items-center gap-1">Сделано с <IconHeart size={12}/> и TensorFlow</span>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage({ onOpenPricing }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div style={{ marginTop: '60px' }}>
        <TickerTape />
      </div>
      <Hero onOpenPricing={onOpenPricing} />
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
      <CTABlock onOpenPricing={onOpenPricing} />
      <Footer />
    </div>
  )
}
