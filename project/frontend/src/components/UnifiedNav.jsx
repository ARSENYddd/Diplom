import { useRouter } from '../hooks/useRouter'

const LINKS = [
  { label: 'Прогноз', href: '/forecast' },
  { label: 'Сигналы', href: '/signals' },
  { label: 'Модели',  href: '/models' },
  { label: 'Wiki',    href: '/wiki' },
  { label: 'Цены',    anchor: 'pricing' },
]

export default function UnifiedNav({ onOpenPricing }) {
  const { path, navigate } = useRouter()

  const handleLink = (e, link) => {
    e.preventDefault()
    if (link.href) {
      navigate(link.href)
    } else if (link.anchor) {
      if (path !== '/') {
        navigate('/')
        setTimeout(() => {
          document.getElementById(link.anchor)?.scrollIntoView({ behavior: 'smooth' })
        }, 80)
      } else {
        document.getElementById(link.anchor)?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center gap-6 px-12 h-[60px]
                    bg-[#0d0b08]/85 border-b border-[var(--border)] backdrop-blur-xl">

      {/* Logo */}
      <button onClick={() => navigate('/')}
        className="flex items-center gap-2.5 text-white font-bold text-[17px] tracking-tight">
        <div className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center
                        text-black font-extrabold text-[14px]
                        bg-gradient-to-br from-amber-500 to-amber-400
                        shadow-[0_0_14px_rgba(245,158,11,0.4)] animate-pulse-amber">
          α
        </div>
        AlphaSignal
      </button>

      {/* Nav links */}
      <div className="flex items-center gap-1 ml-6">
        {LINKS.map(link => {
          const isActive = link.href && path === link.href
          return (
            <a
              key={link.label}
              href={link.href ?? '#'}
              onClick={e => handleLink(e, link)}
              className={`text-[13px] px-3 py-1.5 rounded-md transition-colors no-underline
                ${isActive
                  ? 'text-amber-400 bg-amber-400/10'
                  : 'text-muted hover:text-warm'}`}
            >
              {link.label}
            </a>
          )
        })}
      </div>

      {/* Right */}
      <div className="ml-auto flex items-center gap-2.5">
        <span className="text-[13px] text-muted px-3 cursor-pointer hover:text-warm transition-colors">
          Войти
        </span>
        <button onClick={onOpenPricing}
          className="text-[13px] font-semibold text-black bg-amber-400
                     px-4 py-1.5 rounded-lg hover:bg-amber-300 hover:scale-[1.02] transition-all">
          Попробовать бесплатно →
        </button>
      </div>
    </nav>
  )
}
