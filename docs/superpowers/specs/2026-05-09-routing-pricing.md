---
title: Routing, Navigation & Pricing Modal
date: 2026-05-09
status: approved
---

## Goal

Add History API routing (clean URLs per page), wire landing-page and app-header navigation, and add a pricing modal triggered by "Попробовать бесплатно" CTAs.

## Routing

### Hook: `src/hooks/useRouter.js`

Minimal custom router — no external library.

```js
import { useState, useEffect } from 'react'

export function useRouter() {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const handler = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  const navigate = (to) => {
    window.history.pushState(null, '', to)
    setPath(to)
  }

  return { path, navigate }
}
```

### Routes

| URL | Component |
|-----|-----------|
| `/` | `LandingPage` |
| `/forecast` | Forecast panels |
| `/signals` | `SignalsPage` |

Any unknown path falls back to `/` (landing).

### App.jsx changes

- Remove `useState('landing')` / `useState` page state entirely
- Import `useRouter`, destructure `{ path, navigate }`
- Replace `if (page === 'landing')` guard with `if (path === '/')` 
- Pass `navigate` as `onLaunch` to `LandingPage` (navigates to `/forecast`)
- Pass `path` and `navigate` to `Header` as `page` and `onNavigate`
- Replace all `setPage(...)` calls with `navigate(...)`
- Forecast toolbar shows when `path === '/forecast'`
- Signals page shows when `path === '/signals'`

## Navigation

### LandingPage — Nav component

Nav currently receives only `onLaunch`. Add `onNavigate` prop.

- «Прогноз» link → `onNavigate('/forecast')`
- «Сигналы» link → `onNavigate('/signals')`
- «Модели» link → smooth scroll to `#models` section on the landing page (no route change)
- CTA «Запустить» button → `onLaunch()` (existing, opens pricing modal — see below)

`LandingPage` receives `onNavigate` from `App` and passes it into `Nav`.

### Header.jsx — App header nav

Already calls `onNavigate(tab.key)` but with string keys `'forecast'` / `'signals'`.  
Update to call `onNavigate('/forecast')` and `onNavigate('/signals')`.  
Active state comparison: `page === '/forecast'` etc.

## Pricing Modal

### Trigger

Every «Попробовать бесплатно» / «Запустить» CTA on the landing page opens the modal instead of navigating directly to `/forecast`. Modal has a «Начать бесплатно» button that navigates to `/forecast`.

`onLaunch` prop on `LandingPage` is replaced by `onOpenPricing`. `App` passes `() => setPricingOpen(true)`. Modal close or «Начать бесплатно» navigates to `/forecast`.

### Component: `src/components/PricingModal.jsx`

Props: `{ open, onClose, onStart }`

- `open` controls visibility via `fixed inset-0` overlay
- Escape key closes
- Click outside overlay closes
- Amber design tokens throughout

### Plans

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Цена | 0₽ | 799₽/мес | По запросу |
| Графиков | 1 | Без лимита | Без лимита |
| Моделей | 3 (ARIMA, GARCH, LSTM) | Все 8 | Все 8 + кастом |
| История данных | 1 год | 10 лет | Неограничено |
| Торговые сигналы | ❌ | ✅ | ✅ |
| Бэктест | ❌ | ✅ | ✅ |
| Экспорт CSV | ❌ | ✅ | ✅ |
| API доступ | ❌ | ❌ | ✅ |

### CTA buttons in modal

- Free → «Начать бесплатно» → calls `onStart()` → navigates to `/forecast`
- Pro → «Выбрать Pro» → shows inline "Скоро" badge (no action)
- Enterprise → «Связаться» → `mailto:` link

### Visual design

- Dark overlay: `bg-black/70 backdrop-blur-sm`
- Modal card: `bg-[var(--surface)] border border-[var(--border)] rounded-2xl`
- Max width: `max-w-4xl`, 3-column grid for plans
- Pro plan card: amber border + «Популярный» badge
- Fade-in animation on open: `animate-fade-up`
- Amber accent on Pro CTA, ghost style on Free and Enterprise

## File Changes

| File | Change |
|------|--------|
| `src/hooks/useRouter.js` | New — custom History API router hook |
| `src/components/PricingModal.jsx` | New — pricing modal with 3 tiers |
| `src/App.jsx` | Replace page useState with useRouter, wire PricingModal |
| `src/components/Header.jsx` | Update nav to use `/forecast` and `/signals` paths |
| `src/components/LandingPage.jsx` | Add onNavigate to Nav, replace onLaunch with onOpenPricing |

## Non-goals

- Real authentication or backend enforcement of plan limits
- Payment integration
- localStorage plan persistence
- Actual feature gating in the UI (free users can still access everything)

## Access Control Architecture (reference only, not implemented)

For a real tiered system the following would be required:

**Backend:**
- PostgreSQL: `users` + `subscriptions` tables
- JWT auth middleware (FastAPI + python-jose)
- Per-endpoint plan checks (decorator `@require_plan('pro')`)
- Stripe / ЮКасса webhook for subscription events

**Frontend:**
- `AuthContext` — stores JWT token + plan tier
- `usePlan()` hook — returns `{ plan, can: { signals, backtest, export } }`
- Protected routes — redirect to pricing if plan insufficient
- UI locks — lock icon on Pro-only features for Free users

**For diploma scope:** plan stored in `localStorage`, checked on frontend only. No real backend enforcement.
