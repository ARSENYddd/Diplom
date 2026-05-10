import { useEffect } from 'react'
import { IconCheck } from './Icons'

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '0₽',
    period: 'навсегда',
    badge: null,
    cta: 'Начать бесплатно',
    ctaStyle: 'ghost',
    features: [
      { label: 'Графиков', value: '1' },
      { label: 'Моделей', value: '3 (ARIMA, GARCH, LSTM)' },
      { label: 'История данных', value: '1 год' },
      { label: 'Торговые сигналы', value: false },
      { label: 'Бэктест', value: false },
      { label: 'Экспорт CSV', value: false },
      { label: 'API доступ', value: false },
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '799₽',
    period: 'в месяц',
    badge: 'Популярный',
    cta: 'Выбрать Pro',
    ctaStyle: 'primary',
    features: [
      { label: 'Графиков', value: 'Без лимита' },
      { label: 'Моделей', value: 'Все 8' },
      { label: 'История данных', value: '10 лет' },
      { label: 'Торговые сигналы', value: true },
      { label: 'Бэктест', value: true },
      { label: 'Экспорт CSV', value: true },
      { label: 'API доступ', value: false },
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'По запросу',
    period: '',
    badge: null,
    cta: 'Связаться',
    ctaStyle: 'ghost',
    features: [
      { label: 'Графиков', value: 'Без лимита' },
      { label: 'Моделей', value: 'Все 8 + кастом' },
      { label: 'История данных', value: 'Неограничено' },
      { label: 'Торговые сигналы', value: true },
      { label: 'Бэктест', value: true },
      { label: 'Экспорт CSV', value: true },
      { label: 'API доступ', value: true },
    ],
  },
]

function FeatureRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
      <span className="text-[13px] text-muted">{label}</span>
      {typeof value === 'boolean' ? (
        value
          ? <IconCheck size={16}/>
          : <span className="text-[var(--border)] text-[16px]">—</span>
      ) : (
        <span className="text-[13px] text-warm font-medium">{value}</span>
      )}
    </div>
  )
}

export default function PricingModal({ open, onClose, onStart }) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const handleCta = (plan) => {
    if (plan.key === 'free') { onStart(); onClose() }
    else if (plan.key === 'enterprise') { window.location.href = 'mailto:arsenijdrej@gmail.com' }
    // pro — скоро
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[var(--surface)] border border-[var(--border)]
                   rounded-2xl p-8 animate-fade-up shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-warm transition-colors text-[22px] leading-none"
        >
          ×
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[11px] font-bold tracking-[2px] uppercase text-amber-400 mb-2">Тарифы</p>
          <h2 className="text-[28px] font-bold text-white leading-tight">
            Выберите подходящий план
          </h2>
          <p className="text-[14px] text-muted mt-2">
            Начните бесплатно — без карты и обязательств
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-3 gap-4">
          {PLANS.map(plan => (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-xl p-6 border transition-all
                ${plan.key === 'pro'
                  ? 'border-amber-400/60 bg-amber-400/5 shadow-[0_0_30px_rgba(245,158,11,0.08)]'
                  : 'border-[var(--border)] bg-[var(--bg)]'}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2
                                text-[10px] font-bold tracking-[1px] uppercase
                                bg-amber-400 text-black px-3 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}

              <div className="mb-5">
                <p className="text-[12px] font-bold tracking-[1.5px] uppercase text-muted mb-1">
                  {plan.name}
                </p>
                <p className="text-[32px] font-extrabold text-white leading-none">
                  {plan.price}
                </p>
                {plan.period && (
                  <p className="text-[12px] text-muted mt-1">{plan.period}</p>
                )}
              </div>

              <div className="flex-1 mb-6">
                {plan.features.map(f => (
                  <FeatureRow key={f.label} label={f.label} value={f.value} />
                ))}
              </div>

              <button
                onClick={() => handleCta(plan)}
                className={`w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all
                  ${plan.ctaStyle === 'primary'
                    ? 'bg-amber-400 hover:bg-amber-300 text-black hover:scale-[1.02]'
                    : 'border border-[var(--border)] text-warm hover:border-amber-400/40 hover:text-amber-400'}`}
              >
                {plan.key === 'pro' ? (
                  <span className="flex items-center justify-center gap-2">
                    {plan.cta}
                    <span className="text-[10px] font-normal opacity-60 bg-black/20 px-1.5 py-0.5 rounded">
                      Скоро
                    </span>
                  </span>
                ) : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-[12px] text-muted mt-6">
          Учебный проект МТУСИ · 2025 — реальная оплата не предусмотрена
        </p>
      </div>
    </div>
  )
}
