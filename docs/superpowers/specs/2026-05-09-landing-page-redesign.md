---
title: Landing Page Redesign — Monochrome & Amber
date: 2026-05-09
status: approved
---

## Goal

Convert the academic-style Financial Forecast app into a commercial-grade platform ("AlphaSignal") with a full landing page and Monochrome & Amber (Warm Dark + Gold Glow) design system.

## Color System

```
--bg:      #0d0b08   (near-black, warm)
--surface: #1a1710   (card surfaces)
--border:  #2a2418   (dividers)
--amber:   #f59e0b   (primary accent)
--amber2:  #d97706   (darker amber for gradients)
--amber3:  #fcd34d   (lighter amber for highlights)
--text:    #e8d5a3   (warm white body)
--muted:   #7a6a4a   (secondary text)
```

Tailwind: extend theme with `amber` overrides, remove `indigo` primary.

## Architecture

**New route**: `LandingPage` is shown at app root (`page === 'landing'`). CTA button sets `page = 'forecast'` to enter the app. No external router needed — existing `useState('forecast')` approach extended to include `'landing'`.

## Landing Page Sections (top → bottom)

1. **Sticky Nav** — logo `α AlphaSignal`, links (Прогноз / Сигналы / Модели), CTA button
2. **Ticker Tape** — scrolling marquee: real tickers with price + change color
3. **Hero** — gradient headline, sub, two CTAs, animated dashboard mockup (floating, scanline, SVG chart draw-on animation)
4. **Stats Bar** — 4 numbers: 8 моделей / MAPE 0.78% / +34% доходность / 40+ инструментов
5. **Feature Block 1** — Прогнозирование: model accuracy bar chart (real MAPE values)
6. **Feature Block 2** — Торговые сигналы: live signal cards with BUY/SELL/HOLD badges
7. **Feature Block 3** — Бэктест: equity curve vs B&H, Sharpe/WinRate metrics
8. **Models Grid** — 8 cards, one per model, with icon + real MAPE
9. **Testimonials** — 3 cards
10. **CTA Block** — full-width amber gradient call to action
11. **Footer** — brand, platform links, models, assets, disclaimer

## App Header Redesign

Replace current `Header.jsx` with new commercial header:
- Logo mark (amber gradient circle with `α`)
- Brand name "AlphaSignal"
- Nav tabs: Прогноз / Торговые сигналы (styled as links, not tabs)
- Right side: amber-accent "Запустить" button

## Animations

| Element | Animation |
|---------|-----------|
| Hero badge | shimmer sweep |
| Hero title | `fadeUp` on load |
| Hero dashboard | `float` bob (6s loop) + `scanline` sweep |
| SVG chart line | `stroke-dashoffset` draw-on (2s) |
| All sections | `IntersectionObserver` → `fadeUp` on scroll |
| Ticker tape | CSS `translateX` infinite marquee |
| Logo mark | `pulse-amber` glow loop |
| Gradient headline | `background-position` shift |

## File Changes

| File | Change |
|------|--------|
| `src/components/LandingPage.jsx` | New — full landing page |
| `src/components/Header.jsx` | Rewrite — commercial header |
| `src/App.jsx` | Add `'landing'` page state, show LandingPage, update tab styles to amber |
| `tailwind.config.js` | Replace indigo → amber palette, add custom animations |
| `src/index.css` | Update scrollbar to amber, add `@keyframes` for draw-line, float, shimmer, scanline |

## Non-goals

- Authentication / user accounts
- Backend changes
- Pricing page with real payment
- i18n (stays Russian)
