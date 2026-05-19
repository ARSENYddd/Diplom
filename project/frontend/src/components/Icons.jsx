/**
 * Icons.jsx — custom SVG icon library
 * All icons use 16×16 viewBox; accept size and className props.
 * Color palette: amber #f59e0b | green #4ade80 | red #f87171 | blue #60a5fa
 */

/* ── Generic wrapper ──────────────────────────────────────────────────────── */
const Svg = ({ size = 16, className = '', children, viewBox = '0 0 16 16' }) => (
  <svg
    width={size} height={size}
    viewBox={viewBox}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
  >
    {children}
  </svg>
)

/* ── Model icons ──────────────────────────────────────────────────────────── */

/** ARIMA — trend line with regression dots */
export const IconTrendLine = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <path d="M2 13 L6 9.5 L10 10.5 L14 5" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="2"  cy="13"   r="1.3" fill="#f59e0b"/>
    <circle cx="6"  cy="9.5"  r="1.3" fill="#f59e0b"/>
    <circle cx="10" cy="10.5" r="1.3" fill="#f59e0b"/>
    <circle cx="14" cy="5"    r="1.3" fill="#f59e0b"/>
    <line x1="1" y1="15" x2="15" y2="15" stroke="#f59e0b" strokeWidth="0.8" strokeOpacity="0.35"/>
    <line x1="1" y1="1"  x2="1"  y2="15" stroke="#f59e0b" strokeWidth="0.8" strokeOpacity="0.35"/>
  </Svg>
)

/** GARCH — volatility bands (expanding) */
export const IconVolatility = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <path d="M2 8 L8 8 L14 8" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M2 8 Q5 5 8 4 Q11 3 14 1" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6"/>
    <path d="M2 8 Q5 11 8 12 Q11 13 14 15" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6"/>
    <path d="M2 8 Q4 7 5 6.5" stroke="#f59e0b" strokeWidth="0.8" strokeOpacity="0.35"/>
    <path d="M2 8 Q4 9 5 9.5" stroke="#f59e0b" strokeWidth="0.8" strokeOpacity="0.35"/>
  </Svg>
)

/** LSTM — neural network nodes */
export const IconNeuralNet = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    {/* input layer */}
    <circle cx="2.5" cy="4"  r="1.6" fill="#f59e0b" fillOpacity="0.9"/>
    <circle cx="2.5" cy="8"  r="1.6" fill="#f59e0b" fillOpacity="0.9"/>
    <circle cx="2.5" cy="12" r="1.6" fill="#f59e0b" fillOpacity="0.9"/>
    {/* hidden */}
    <circle cx="8"   cy="6"  r="1.6" fill="#fbbf24"/>
    <circle cx="8"   cy="10" r="1.6" fill="#fbbf24"/>
    {/* output */}
    <circle cx="13.5" cy="8" r="1.6" fill="#f59e0b"/>
    {/* connections */}
    <line x1="4.1" y1="4"  x2="6.4" y2="6"  stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.45"/>
    <line x1="4.1" y1="4"  x2="6.4" y2="10" stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.45"/>
    <line x1="4.1" y1="8"  x2="6.4" y2="6"  stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.45"/>
    <line x1="4.1" y1="8"  x2="6.4" y2="10" stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.45"/>
    <line x1="4.1" y1="12" x2="6.4" y2="6"  stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.45"/>
    <line x1="4.1" y1="12" x2="6.4" y2="10" stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.45"/>
    <line x1="9.6" y1="6"  x2="11.9" y2="8" stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.45"/>
    <line x1="9.6" y1="10" x2="11.9" y2="8" stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.45"/>
  </Svg>
)

/** ARIMA+LSTM — lightning bolt (powerful hybrid) */
export const IconBolt = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <path d="M10 1.5 L4.5 9 H8.5 L6 14.5 L11.5 7 H7.5 Z" fill="#f59e0b"/>
  </Svg>
)

/** ARIMA+GRU — two crossing arrows (variation) */
export const IconMerge = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <path d="M1.5 4 Q8 4 10 8 Q12 12 14.5 12" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M1.5 12 Q8 12 10 8 Q12 4 14.5 4" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    {/* arrowheads */}
    <path d="M12.8 10.5 L14.5 12 L12.8 13.5" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M12.8 2.5 L14.5 4 L12.8 5.5"   stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </Svg>
)

/** GARCH+LSTM — wave (volatility wave) */
export const IconWave = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <path d="M1 10 C3 6 5 6 7 9 S11 13 14 9 L15 8"
      stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <path d="M1 7 C3 3 5 3 7 6 S11 10 14 6 L15 5"
      stroke="#f59e0b" strokeWidth="1.1" strokeLinecap="round" fill="none" strokeOpacity="0.45"/>
    <path d="M1 13 C3 10 5 10 7 12 S11 15 14 12"
      stroke="#f59e0b" strokeWidth="0.7" strokeLinecap="round" fill="none" strokeOpacity="0.25"/>
  </Svg>
)

/** Triple Hybrid — three nodes in triangle */
export const IconTriple = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    {/* center */}
    <circle cx="8" cy="8" r="2.2" fill="#f59e0b"/>
    {/* three outer nodes */}
    <circle cx="8"   cy="1.8" r="1.6" fill="#fbbf24" fillOpacity="0.85"/>
    <circle cx="2.5" cy="13" r="1.6" fill="#fbbf24" fillOpacity="0.85"/>
    <circle cx="13.5" cy="13" r="1.6" fill="#fbbf24" fillOpacity="0.85"/>
    {/* spokes */}
    <line x1="8"   y1="5.8"  x2="8"    y2="3.4"   stroke="#f59e0b" strokeWidth="1.1"/>
    <line x1="6.3" y1="9.6"  x2="4.0"  y2="11.6"  stroke="#f59e0b" strokeWidth="1.1"/>
    <line x1="9.7" y1="9.6"  x2="12.0" y2="11.6"  stroke="#f59e0b" strokeWidth="1.1"/>
  </Svg>
)

/** Ensemble — star (best model) */
export const IconStar = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <path
      d="M8 1 L9.6 5.8 H14.7 L10.6 8.9 L12.1 13.7 L8 10.7 L3.9 13.7 L5.4 8.9 L1.3 5.8 H6.4 Z"
      fill="#f59e0b"
    />
  </Svg>
)

/* ── Section / category icons ─────────────────────────────────────────────── */

/** Accuracy metrics — target/bullseye */
export const IconTarget = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <circle cx="8" cy="8" r="7"   stroke="#f59e0b" strokeWidth="1.1" fill="none"/>
    <circle cx="8" cy="8" r="4.2" stroke="#f59e0b" strokeWidth="1.1" fill="none" strokeOpacity="0.65"/>
    <circle cx="8" cy="8" r="1.8" fill="#f59e0b"/>
    <line x1="8" y1="1" x2="8" y2="15" stroke="#f59e0b" strokeWidth="0.6" strokeOpacity="0.3"/>
    <line x1="1" y1="8" x2="15" y2="8" stroke="#f59e0b" strokeWidth="0.6" strokeOpacity="0.3"/>
  </Svg>
)

/** Trading metrics — bar chart */
export const IconBarChart = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <rect x="1"  y="8"  width="3.5" height="7" rx="0.6" fill="#f59e0b" fillOpacity="0.75"/>
    <rect x="6"  y="4"  width="3.5" height="11" rx="0.6" fill="#f59e0b"/>
    <rect x="11" y="6"  width="3.5" height="9" rx="0.6" fill="#f59e0b" fillOpacity="0.85"/>
  </Svg>
)

/** Globe / international */
export const IconGlobe = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <circle cx="8" cy="8" r="7" stroke="#60a5fa" strokeWidth="1.2" fill="none"/>
    <ellipse cx="8" cy="8" rx="3.5" ry="7" stroke="#60a5fa" strokeWidth="0.9" fill="none" strokeOpacity="0.65"/>
    <line x1="1" y1="8" x2="15" y2="8" stroke="#60a5fa" strokeWidth="0.9" strokeOpacity="0.65"/>
    <line x1="2.5" y1="4"  x2="13.5" y2="4"  stroke="#60a5fa" strokeWidth="0.7" strokeOpacity="0.4"/>
    <line x1="2.5" y1="12" x2="13.5" y2="12" stroke="#60a5fa" strokeWidth="0.7" strokeOpacity="0.4"/>
  </Svg>
)

/** Commodities / resources — barrel/box */
export const IconCommodity = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    {/* barrel shape */}
    <rect x="3" y="4" width="10" height="9" rx="2" stroke="#fbbf24" strokeWidth="1.2" fill="none"/>
    <line x1="3"  y1="8"  x2="13" y2="8"  stroke="#fbbf24" strokeWidth="0.8" strokeOpacity="0.6"/>
    <line x1="4.5" y1="4" x2="4.5" y2="13" stroke="#fbbf24" strokeWidth="0.7" strokeOpacity="0.4"/>
    <line x1="11.5" y1="4" x2="11.5" y2="13" stroke="#fbbf24" strokeWidth="0.7" strokeOpacity="0.4"/>
    {/* top ellipse */}
    <ellipse cx="8" cy="4" rx="5" ry="1.4" stroke="#fbbf24" strokeWidth="1" fill="none" strokeOpacity="0.7"/>
  </Svg>
)

/** US flag — simplified stripes + blue canton */
export const IconFlagUS = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className} viewBox="0 0 20 14">
    <rect width="20" height="14" rx="1.5" fill="#B22234"/>
    <rect y="2"  width="20" height="2" fill="#fff"/>
    <rect y="6"  width="20" height="2" fill="#fff"/>
    <rect y="10" width="20" height="2" fill="#fff"/>
    <rect width="8" height="7" rx="0" fill="#3C3B6E"/>
    {/* stars (simplified 3×2 dots) */}
    {[1.3, 3.3, 5.3, 7.3].map(x =>
      [1.5, 3.5, 5.5].map(y => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.5" fill="#fff"/>
      ))
    )}
  </Svg>
)

/** Russian flag — tricolor */
export const IconFlagRU = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className} viewBox="0 0 20 14">
    <rect width="20" height="14" rx="1.5" fill="#D52B1E"/>
    <rect width="20" height="9.3" rx="0" fill="#0039A6"/>
    <rect width="20" height="4.7" rx="0" fill="#fff"/>
    <rect width="20" height="14" rx="1.5" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5"/>
  </Svg>
)

/* ── Scenario icons (ForecastChart) ───────────────────────────────────────── */

/** Bear scenario */
export const IconBear = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    {/* ears */}
    <circle cx="5"  cy="4.5" r="2" fill="#f87171"/>
    <circle cx="11" cy="4.5" r="2" fill="#f87171"/>
    {/* head */}
    <ellipse cx="8" cy="9.5" rx="5" ry="4.5" fill="#f87171"/>
    {/* inner ears */}
    <circle cx="5"  cy="4.5" r="1" fill="#fca5a5"/>
    <circle cx="11" cy="4.5" r="1" fill="#fca5a5"/>
    {/* eyes */}
    <circle cx="6.2" cy="8.5" r="0.9" fill="#7f1d1d"/>
    <circle cx="9.8" cy="8.5" r="0.9" fill="#7f1d1d"/>
    {/* snout */}
    <ellipse cx="8" cy="11" rx="2.2" ry="1.5" fill="#fca5a5" fillOpacity="0.6"/>
    <circle cx="7.4" cy="10.6" r="0.4" fill="#7f1d1d"/>
    <circle cx="8.6" cy="10.6" r="0.4" fill="#7f1d1d"/>
  </Svg>
)

/** Bull scenario */
export const IconBull = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    {/* horns */}
    <path d="M4 5 C3 3 1 3 1.5 5.5" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M12 5 C13 3 15 3 14.5 5.5" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    {/* head */}
    <ellipse cx="8" cy="9.5" rx="5" ry="4.5" fill="#4ade80"/>
    {/* eyes */}
    <circle cx="6.2" cy="8.5" r="0.9" fill="#14532d"/>
    <circle cx="9.8" cy="8.5" r="0.9" fill="#14532d"/>
    {/* snout */}
    <ellipse cx="8" cy="11" rx="2.2" ry="1.5" fill="#86efac" fillOpacity="0.6"/>
    <circle cx="7.4" cy="10.6" r="0.4" fill="#14532d"/>
    <circle cx="8.6" cy="10.6" r="0.4" fill="#14532d"/>
  </Svg>
)

/** Falling line (moderate bear) */
export const IconLineDown = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <path d="M1.5 4 L5 6.5 L9 5 L14.5 11" stroke="#f87171" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M12.5 11 L14.5 11 L14.5 9" stroke="#f87171" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
  </Svg>
)

/** Neutral chart (base scenario) */
export const IconLineFlat = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <path d="M1.5 11 L5 8 L8 9 L11 7 L14.5 8" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <line x1="1" y1="14" x2="15" y2="14" stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.3"/>
  </Svg>
)

/** Rising line (optimistic / bull) */
export const IconLineUp = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <path d="M1.5 12 L5 9.5 L9 11 L14.5 5" stroke="#4ade80" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M12.5 5 L14.5 5 L14.5 7" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
  </Svg>
)

/* ── UI icons ─────────────────────────────────────────────────────────────── */

/** Warning triangle */
export const IconWarning = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <path d="M8 1.5 L15 14 H1 Z" stroke="#f59e0b" strokeWidth="1.3" strokeLinejoin="round" fill="none"/>
    <line x1="8" y1="6"  x2="8" y2="10" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="8" cy="12.2" r="0.85" fill="#f59e0b"/>
  </Svg>
)

/** Lightning — hero / fast ML */
export const IconLightning = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <path d="M10 1.5 L4.5 9 H8.5 L6 14.5 L11.5 7 H7.5 Z" fill="#f59e0b"/>
  </Svg>
)

/** Diamond bullet point */
export const IconDiamond = ({ size = 8, className = '' }) => (
  <Svg size={size} className={className}>
    <path d="M8 1 L15 8 L8 15 L1 8 Z" fill="#f59e0b"/>
  </Svg>
)

/** Signal / satellite — trading signals section */
export const IconSignal = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    {/* dish */}
    <path d="M2 14 Q4 8 10 5" stroke="#f59e0b" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
    <path d="M2 14 Q8 12 11 6" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" fill="none" strokeOpacity="0.5"/>
    {/* beam arcs */}
    <path d="M8 8 Q11 5 13 2" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" fill="none" strokeDasharray="1.5 1.5"/>
    <path d="M10 10 Q13 7 15 4" stroke="#f59e0b" strokeWidth="0.9" strokeLinecap="round" fill="none" strokeDasharray="1.5 1.5" strokeOpacity="0.55"/>
    <circle cx="8.5" cy="7.5" r="1.8" fill="#f59e0b"/>
    <circle cx="2.5" cy="13.5" r="1.3" fill="#f59e0b" fillOpacity="0.6"/>
  </Svg>
)

/** Time series — descending steps / staircase */
export const IconTimeSeries = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <path d="M1.5 3.5 L5 3.5 L5 6.5 L8.5 6.5 L8.5 10 L12 10 L12 13 L14.5 13"
      stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* axis */}
    <line x1="1.5" y1="14.5" x2="14.5" y2="14.5" stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.3"/>
    <line x1="1.5" y1="1"    x2="1.5"  y2="14.5" stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.3"/>
  </Svg>
)

/** ML / robot — machine learning section */
export const IconML = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    {/* head */}
    <rect x="3" y="4" width="10" height="9" rx="2" stroke="#f59e0b" strokeWidth="1.2" fill="none"/>
    {/* antenna */}
    <line x1="8" y1="1.5" x2="8" y2="4" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="8" cy="1.5" r="1" fill="#f59e0b"/>
    {/* eyes */}
    <circle cx="6"  cy="8" r="1.3" fill="#f59e0b" fillOpacity="0.9"/>
    <circle cx="10" cy="8" r="1.3" fill="#f59e0b" fillOpacity="0.9"/>
    {/* mouth */}
    <path d="M5.5 11 Q8 12.5 10.5 11" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" fill="none"/>
    {/* ears */}
    <line x1="1.5" y1="7" x2="3" y2="7" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="13"  y1="7" x2="14.5" y2="7" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
  </Svg>
)

/** Backtest / trading P&L chart */
export const IconPnL = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    {/* equity curve going up */}
    <path d="M1.5 13 L4 10 L6 11.5 L9 7 L11 9 L14.5 4"
      stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* area fill */}
    <path d="M1.5 13 L4 10 L6 11.5 L9 7 L11 9 L14.5 4 L14.5 14 L1.5 14 Z"
      fill="#f59e0b" fillOpacity="0.1"/>
    {/* axis */}
    <line x1="1.5" y1="14" x2="14.5" y2="14" stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.3"/>
  </Svg>
)

/** Search / magnifying glass — no results state */
export const IconSearch = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <circle cx="7" cy="7" r="5" stroke="#f59e0b" strokeWidth="1.5" fill="none" strokeOpacity="0.6"/>
    <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
  </Svg>
)

/** Checkmark ✓ */
export const IconCheck = ({ size = 16, color = '#4ade80', className = '' }) => (
  <Svg size={size} className={className}>
    <path d="M2.5 8.5 L6.5 12.5 L13.5 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </Svg>
)

/** Cross ✗ */
export const IconCross = ({ size = 16, color = '#f87171', className = '' }) => (
  <Svg size={size} className={className}>
    <path d="M3.5 3.5 L12.5 12.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M12.5 3.5 L3.5 12.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </Svg>
)

/** Heart ♥ */
export const IconHeart = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <path d="M8 13.5 C8 13.5 1.5 9 1.5 5 C1.5 3 3 1.5 5 1.5 C6.5 1.5 7.5 2.5 8 3.5 C8.5 2.5 9.5 1.5 11 1.5 C13 1.5 14.5 3 14.5 5 C14.5 9 8 13.5 8 13.5Z"
      fill="#f87171" fillOpacity="0.85"/>
  </Svg>
)

/** Star empty ☆ for ratings */
export const IconStarEmpty = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <path
      d="M8 2 L9.4 6.2 H14 L10.3 8.8 L11.7 13 L8 10.5 L4.3 13 L5.7 8.8 L2 6.2 H6.6 Z"
      stroke="#f59e0b" strokeWidth="1" fill="none"
    />
  </Svg>
)

/** Star filled ★ for ratings */
export const IconStarFilled = ({ size = 16, className = '' }) => (
  <Svg size={size} className={className}>
    <path
      d="M8 2 L9.4 6.2 H14 L10.3 8.8 L11.7 13 L8 10.5 L4.3 13 L5.7 8.8 L2 6.2 H6.6 Z"
      fill="#f59e0b"
    />
  </Svg>
)
