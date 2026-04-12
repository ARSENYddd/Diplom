'use strict';
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

// ─── Brand ───────────────────────────────────────────────────────────────────
const PURPLE    = '372579';   // основной фон МТУСИ
const PURPLE_D  = '28176A';   // тёмно-фиолетовый акцент
const PURPLE_L  = '4A32A0';   // светлее для карточек
const GOLD      = 'F5C842';   // акцентный золотой
const WHITE     = 'FFFFFF';
const LIGHT_BG  = 'F7F6FC';   // почти белый фон контентных слайдов
const MUTED     = 'A89FD0';   // приглушённый текст

const FONT      = 'Montserrat';

const LOGO_PATH = '/Users/arsendreman/Downloads/МТУСИ §Ѓѓ агб/ЛОГОТИП-а†би®даЃҐ™†-°•Ђл©-агб.svg';
const LOGO_BG_PATH = '/Users/arsendreman/Downloads/МТУСИ §Ѓѓ агб/ЛОГОТИП-а†би®даЃҐ™†-д®ЃЂ•вЃҐл©-агб.svg'; // тёмная версия

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeShadow() {
  return { type: 'outer', color: '000000', opacity: 0.18, blur: 8, offset: 3, angle: 135 };
}

// Add МТУСИ logo (white) top-right corner for dark slides
function addLogoWhite(slide) {
  slide.addImage({ path: LOGO_PATH, x: 8.6, y: 0.18, w: 1.2, h: 0.56 });
}

// Add МТУСИ logo (purple) top-right corner for light slides
function addLogoDark(slide) {
  slide.addImage({ path: LOGO_BG_PATH, x: 8.6, y: 0.18, w: 1.2, h: 0.56 });
}

// Decorative left accent bar (dark slides)
function addAccentBar(slide, color = GOLD) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: 5.625,
    fill: { color }, line: { color, width: 0 },
  });
}

// Bottom footer strip
function addFooterDark(slide, txt) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.2, w: 10, h: 0.425,
    fill: { color: PURPLE_D }, line: { color: PURPLE_D, width: 0 },
  });
  slide.addText(txt, {
    x: 0.3, y: 5.22, w: 9.4, h: 0.35,
    fontFace: FONT, fontSize: 9, color: MUTED, align: 'left', valign: 'middle',
  });
}

function addFooterLight(slide, txt) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.2, w: 10, h: 0.425,
    fill: { color: 'E8E4F5' }, line: { color: 'E8E4F5', width: 0 },
  });
  slide.addText(txt, {
    x: 0.3, y: 5.22, w: 9.4, h: 0.35,
    fontFace: FONT, fontSize: 9, color: PURPLE_D, align: 'left', valign: 'middle',
  });
}

// Card (white rectangle with light shadow)
function addCard(slide, x, y, w, h) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: WHITE },
    shadow: makeShadow(),
    line: { color: 'E5E0F5', width: 0.5 },
  });
}

// Purple card
function addCardPurple(slide, x, y, w, h) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: PURPLE_L },
    shadow: makeShadow(),
    line: { color: PURPLE_L, width: 0 },
  });
}

// Numbered circle
function addCircle(slide, x, y, num, bgColor = GOLD) {
  slide.addShape(pres.shapes.OVAL, {
    x, y, w: 0.42, h: 0.42,
    fill: { color: bgColor }, line: { color: bgColor, width: 0 },
  });
  slide.addText(String(num), {
    x, y, w: 0.42, h: 0.42,
    fontFace: FONT, fontSize: 13, bold: true,
    color: bgColor === GOLD ? PURPLE_D : WHITE,
    align: 'center', valign: 'middle',
  });
}

// Slide title (dark slide)
function addSlideTitleDark(slide, txt) {
  slide.addText(txt, {
    x: 0.4, y: 0.24, w: 8.0, h: 0.58,
    fontFace: FONT, fontSize: 20, bold: true, color: WHITE,
    align: 'left', valign: 'middle',
  });
}

// Slide title (light slide)
function addSlideTitleLight(slide, txt) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 1.0,
    fill: { color: PURPLE }, line: { color: PURPLE, width: 0 },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: 1.0,
    fill: { color: GOLD }, line: { color: GOLD, width: 0 },
  });
  slide.addText(txt, {
    x: 0.38, y: 0.0, w: 8.2, h: 1.0,
    fontFace: FONT, fontSize: 20, bold: true, color: WHITE,
    align: 'left', valign: 'middle',
  });
  slide.addImage({ path: LOGO_PATH, x: 8.6, y: 0.18, w: 1.2, h: 0.56 });
}

// ─── Presentation ─────────────────────────────────────────────────────────────
const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.title  = 'Анализ и комбинирование методов прогнозирования исторических финансовых данных';
pres.author = 'Дрейман Арсений Игоревич';

// ═══════════════════════════════════════════════════════════════════════════════
// СЛАЙД 1 — Титульный
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PURPLE };

  // Left accent
  addAccentBar(s, GOLD);

  // Logo top-right
  addLogoWhite(s);

  // University name top
  s.addText('Московский технический университет связи и информатики', {
    x: 0.38, y: 0.22, w: 8.0, h: 0.38,
    fontFace: FONT, fontSize: 10.5, color: MUTED, align: 'left', valign: 'middle', italic: true,
  });

  // Decorative geometric block
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.38, y: 0.72, w: 5.8, h: 0.07,
    fill: { color: GOLD }, line: { color: GOLD, width: 0 },
  });

  // Main title
  s.addText('Анализ и комбинирование методов\nпрогнозирования исторических\nфинансовых данных', {
    x: 0.38, y: 0.88, w: 9.2, h: 2.1,
    fontFace: FONT, fontSize: 30, bold: true, color: WHITE,
    align: 'left', valign: 'top', lineSpacingMultiple: 1.15,
  });

  // Author block background
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.38, y: 3.18, w: 5.8, h: 1.45,
    fill: { color: PURPLE_D }, line: { color: PURPLE_D, width: 0 },
    shadow: makeShadow(),
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.38, y: 3.18, w: 0.08, h: 1.45,
    fill: { color: GOLD }, line: { color: GOLD, width: 0 },
  });

  s.addText([
    { text: 'Студент: ', options: { color: MUTED, bold: false } },
    { text: 'Дрейман Арсений Игоревич', options: { color: WHITE, bold: true } },
    { text: '\n4 курс, факультет Информационные технологии', options: { color: MUTED, bold: false } },
  ], {
    x: 0.58, y: 3.22, w: 5.5, h: 0.62,
    fontFace: FONT, fontSize: 11, align: 'left', valign: 'top',
  });

  s.addText([
    { text: 'Научный руководитель: ', options: { color: MUTED, bold: false } },
    { text: 'Изотова А.А.', options: { color: WHITE, bold: true } },
    { text: '\nСт. преподаватель, кафедра Системное программирование', options: { color: MUTED, bold: false } },
  ], {
    x: 0.58, y: 3.92, w: 5.5, h: 0.62,
    fontFace: FONT, fontSize: 11, align: 'left', valign: 'top',
  });

  // Year badge
  s.addShape(pres.shapes.RECTANGLE, {
    x: 7.8, y: 4.9, w: 1.8, h: 0.42,
    fill: { color: GOLD }, line: { color: GOLD, width: 0 },
  });
  s.addText('Москва, 2026', {
    x: 7.8, y: 4.9, w: 1.8, h: 0.42,
    fontFace: FONT, fontSize: 10, bold: true, color: PURPLE_D,
    align: 'center', valign: 'middle',
  });

  // Decorative circles (bottom-right)
  for (let i = 0; i < 5; i++) {
    s.addShape(pres.shapes.OVAL, {
      x: 7.5 + i * 0.45, y: 2.8, w: 0.35, h: 0.35,
      fill: { color: PURPLE_L, transparency: 40 }, line: { color: PURPLE_L, width: 0 },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// СЛАЙД 2 — Актуальность проблемы
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: LIGHT_BG };
  addSlideTitleLight(s, 'Актуальность и постановка задачи');
  addFooterLight(s, 'МТУСИ  |  Дрейман А.И.  |  2026');

  // Problem statement — big card
  addCard(s, 0.32, 1.18, 9.36, 1.22);
  s.addText([
    { text: 'Проблема:', options: { bold: true, color: PURPLE_D } },
    { text: '  Финансовые временные ряды содержат одновременно линейные тренды, нелинейные паттерны и кластеризованную волатильность — ни один классический метод не описывает всё это в одиночку.', options: { color: '333333' } },
  ], {
    x: 0.55, y: 1.25, w: 8.9, h: 1.06,
    fontFace: FONT, fontSize: 13, align: 'left', valign: 'middle',
  });

  // Three limitation cards
  const cards3 = [
    { title: 'ARIMA', body: 'Хорошо → линейная составляющая\nПлохо → нелинейные паттерны', color: '5B4FCF' },
    { title: 'GARCH', body: 'Хорошо → моделирует волатильность\nПлохо → прогноз цены (не уровня)', color: '7C3AED' },
    { title: 'LSTM / GRU', body: 'Хорошо → нелинейные зависимости\nПлохо → нет явного учёта тренда', color: '0E7490' },
  ];
  cards3.forEach((c, i) => {
    const x = 0.32 + i * 3.15;
    addCardPurple(s, x, 2.6, 2.95, 1.8);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.6, w: 0.12, h: 1.8, fill: { color: GOLD }, line: { color: GOLD, width: 0 } });
    s.addText(c.title, { x: x + 0.22, y: 2.65, w: 2.65, h: 0.38, fontFace: FONT, fontSize: 14, bold: true, color: WHITE, align: 'left', valign: 'middle' });
    s.addText(c.body, { x: x + 0.22, y: 3.08, w: 2.65, h: 1.2, fontFace: FONT, fontSize: 11, color: 'D4CFEE', align: 'left', valign: 'top', lineSpacingMultiple: 1.3 });
  });

  // Arrow → solution hint
  s.addText('→  Решение: объединить сильные стороны каждого подхода в гибридную модель', {
    x: 0.32, y: 4.55, w: 9.36, h: 0.45,
    fontFace: FONT, fontSize: 12.5, bold: true, color: PURPLE_D, align: 'left', valign: 'middle',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// СЛАЙД 3 — Цели и задачи
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PURPLE };
  addAccentBar(s, GOLD);
  addLogoWhite(s);
  addSlideTitleDark(s, 'Цель и задачи исследования');
  addFooterDark(s, 'МТУСИ  |  Дрейман А.И.  |  2026');

  // Goal
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.38, y: 1.0, w: 9.22, h: 0.7,
    fill: { color: GOLD }, line: { color: GOLD, width: 0 },
  });
  s.addText('ЦЕЛЬ:  Повысить точность прогнозирования финансовых временных рядов за счёт гибридных архитектур, объединяющих статистические методы с глубоким обучением', {
    x: 0.52, y: 1.02, w: 9.0, h: 0.65,
    fontFace: FONT, fontSize: 12, bold: true, color: PURPLE_D,
    align: 'left', valign: 'middle',
  });

  // Tasks
  const tasks = [
    'Проанализировать теоретические основы методов ARIMA, GARCH, LSTM, GRU',
    'Разработать три гибридных архитектуры: ARIMA+GRU, GARCH+LSTM, Triple Hybrid',
    'Реализовать взвешенный ансамбль четырёх классов моделей',
    'Создать программный прототип с REST API и веб-интерфейсом',
    'Провести экспериментальную оценку на реальных рыночных данных (MAE, RMSE, MAPE)',
  ];
  tasks.forEach((t, i) => {
    addCircle(s, 0.38, 1.9 + i * 0.62, i + 1, GOLD);
    s.addText(t, {
      x: 0.9, y: 1.9 + i * 0.62, w: 8.7, h: 0.52,
      fontFace: FONT, fontSize: 12, color: WHITE, align: 'left', valign: 'middle',
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// СЛАЙД 4 — Методы: теоретическая основа
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: LIGHT_BG };
  addSlideTitleLight(s, 'Теоретическая основа: 4 ключевых метода');
  addFooterLight(s, 'МТУСИ  |  Дрейман А.И.  |  2026');

  const methods = [
    {
      name: 'ARIMA(p,d,q)',
      tag: 'Статистика',
      body: '✔ Линейный тренд и авторегрессия\n✔ Автоподбор через AIC (pmdarima)\n✘ Не фиксирует нелинейность',
      color: PURPLE,
    },
    {
      name: 'GARCH(1,1)',
      tag: 'Волатильность',
      body: '✔ Кластеризация волатильности\n✔ Условная дисперсия σ²(t) как признак\n✘ Не прогнозирует уровень цены',
      color: '7C3AED',
    },
    {
      name: 'LSTM',
      tag: 'Глубокое обучение',
      body: '✔ Долгосрочные зависимости\n✔ 3 вентиля (input / forget / output)\n✔ Эффективен на длинных рядах',
      color: '0E7490',
    },
    {
      name: 'GRU',
      tag: 'Глубокое обучение',
      body: '✔ Упрощённый LSTM (2 вентиля)\n✔ Быстрее обучается на 15–20%\n✔ Сопоставимое качество',
      color: '0F766E',
    },
  ];

  methods.forEach((m, i) => {
    const x = 0.25 + i * 2.42;
    addCard(s, x, 1.15, 2.28, 3.85);
    // Header strip
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.15, w: 2.28, h: 0.6, fill: { color: m.color }, line: { color: m.color, width: 0 } });
    s.addText(m.name, { x: x + 0.1, y: 1.18, w: 2.08, h: 0.35, fontFace: FONT, fontSize: 13, bold: true, color: WHITE, align: 'left', valign: 'middle' });
    // Tag
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.1, y: 1.56, w: 2.0, h: 0.22, fill: { color: GOLD }, line: { color: GOLD, width: 0 } });
    s.addText(m.tag, { x: x + 0.1, y: 1.56, w: 2.0, h: 0.22, fontFace: FONT, fontSize: 8.5, bold: true, color: PURPLE_D, align: 'center', valign: 'middle' });
    // Body
    s.addText(m.body, { x: x + 0.1, y: 1.88, w: 2.08, h: 2.9, fontFace: FONT, fontSize: 10.5, color: '334155', align: 'left', valign: 'top', lineSpacingMultiple: 1.4 });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// СЛАЙД 5 — Гибридные архитектуры
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: LIGHT_BG };
  addSlideTitleLight(s, '8 реализованных моделей: от базовых к ансамблю');
  addFooterLight(s, 'МТУСИ  |  Дрейман А.И.  |  2026');

  // Tier 1 - base
  s.addText('БАЗОВЫЕ', { x: 0.32, y: 1.1, w: 1.5, h: 0.35, fontFace: FONT, fontSize: 9, bold: true, color: MUTED, align: 'left', valign: 'middle' });
  const base = ['ARIMA', 'GARCH', 'LSTM'];
  base.forEach((m, i) => {
    s.addShape(pres.shapes.RECTANGLE, { x: 0.32 + i * 1.72, y: 1.48, w: 1.55, h: 0.48, fill: { color: '475569' }, line: { color: '475569', width: 0 }, shadow: makeShadow() });
    s.addText(m, { x: 0.32 + i * 1.72, y: 1.48, w: 1.55, h: 0.48, fontFace: FONT, fontSize: 12, bold: true, color: WHITE, align: 'center', valign: 'middle' });
  });

  // Tier 2 - hybrid
  s.addText('ГИБРИДНЫЕ (2 уровня)', { x: 0.32, y: 2.18, w: 2.8, h: 0.32, fontFace: FONT, fontSize: 9, bold: true, color: MUTED, align: 'left', valign: 'middle' });
  const hyb = ['ARIMA + LSTM', 'ARIMA + GRU', 'GARCH + LSTM'];
  hyb.forEach((m, i) => {
    s.addShape(pres.shapes.RECTANGLE, { x: 0.32 + i * 2.42, y: 2.52, w: 2.2, h: 0.52, fill: { color: PURPLE_L }, line: { color: PURPLE_L, width: 0 }, shadow: makeShadow() });
    s.addText(m, { x: 0.32 + i * 2.42, y: 2.52, w: 2.2, h: 0.52, fontFace: FONT, fontSize: 12, bold: true, color: WHITE, align: 'center', valign: 'middle' });
  });

  // Tier 3 - triple
  s.addText('ТРЁХУРОВНЕВЫЙ ГИБРИД', { x: 0.32, y: 3.25, w: 3.2, h: 0.32, fontFace: FONT, fontSize: 9, bold: true, color: MUTED, align: 'left', valign: 'middle' });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.32, y: 3.6, w: 5.1, h: 0.55, fill: { color: '7C3AED' }, line: { color: '7C3AED', width: 0 }, shadow: makeShadow() });
  s.addText('Triple Hybrid  (ARIMA + GARCH + LSTM)', { x: 0.32, y: 3.6, w: 5.1, h: 0.55, fontFace: FONT, fontSize: 13, bold: true, color: WHITE, align: 'center', valign: 'middle' });
  s.addText('ŷ = ŷ_ARIMA + LSTM([e¹, σ²])', { x: 5.6, y: 3.6, w: 4.0, h: 0.55, fontFace: FONT, fontSize: 11, italic: true, color: PURPLE_D, align: 'left', valign: 'middle' });

  // Tier 4 - ensemble (highlighted)
  s.addText('АНСАМБЛЬ', { x: 0.32, y: 4.28, w: 1.5, h: 0.32, fontFace: FONT, fontSize: 9, bold: true, color: MUTED, align: 'left', valign: 'middle' });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.32, y: 4.62, w: 7.2, h: 0.6, fill: { color: GOLD }, line: { color: GOLD, width: 0 }, shadow: makeShadow() });
  s.addText('Weighted Ensemble  —  ŷ = Σ wᵢ · ŷᵢ,   wᵢ = (1/RMSEᵢ) / Σ(1/RMSEⱼ)', { x: 0.42, y: 4.62, w: 7.0, h: 0.6, fontFace: FONT, fontSize: 12.5, bold: true, color: PURPLE_D, align: 'left', valign: 'middle' });
  s.addText('★ ЛУЧШИЙ', { x: 7.7, y: 4.62, w: 1.9, h: 0.6, fontFace: FONT, fontSize: 13, bold: true, color: GOLD, align: 'center', valign: 'middle' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// СЛАЙД 6 — Triple Hybrid: схема работы
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PURPLE };
  addAccentBar(s, GOLD);
  addLogoWhite(s);
  addSlideTitleDark(s, 'Triple Hybrid: трёхуровневая декомпозиция');
  addFooterDark(s, 'МТУСИ  |  Дрейман А.И.  |  2026');

  const steps = [
    { num: 1, color: '5B4FCF', title: 'ARIMA',          body: 'Линейный прогноз  ŷ_ARIMA\nОстатки  e¹ = y − ŷ_ARIMA' },
    { num: 2, color: '7C3AED', title: 'GARCH(1,1)',      body: 'Условная дисперсия остатков\nσ²(t) — мера волатильности e¹' },
    { num: 3, color: '0E7490', title: 'LSTM',            body: 'Вход: [e¹(t), σ²(t)] — 2D признак\nПрогноз нелинейной составляющей' },
    { num: 4, color: GOLD,     title: 'Итоговый прогноз', body: 'ŷ = ŷ_ARIMA + ŷ_LSTM\nWalk-forward backtesting' },
  ];

  steps.forEach((st, i) => {
    const x = 0.38 + i * 2.36;
    // Box
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.1, w: 2.15, h: 3.7, fill: { color: PURPLE_D }, line: { color: st.color, width: 1.5 }, shadow: makeShadow() });
    // Top color bar
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.1, w: 2.15, h: 0.48, fill: { color: st.color }, line: { color: st.color, width: 0 } });
    // Number
    s.addShape(pres.shapes.OVAL, { x: x + 0.82, y: 0.84, w: 0.52, h: 0.52, fill: { color: st.color }, line: { color: st.color, width: 0 } });
    s.addText(String(st.num), { x: x + 0.82, y: 0.84, w: 0.52, h: 0.52, fontFace: FONT, fontSize: 14, bold: true, color: st.color === GOLD ? PURPLE_D : WHITE, align: 'center', valign: 'middle' });

    s.addText(st.title, { x: x + 0.1, y: 1.13, w: 1.95, h: 0.42, fontFace: FONT, fontSize: 12, bold: true, color: WHITE, align: 'left', valign: 'middle' });
    s.addText(st.body, { x: x + 0.1, y: 1.7, w: 1.95, h: 2.8, fontFace: FONT, fontSize: 11, color: 'B0A8D8', align: 'left', valign: 'top', lineSpacingMultiple: 1.5 });

    // Arrow between boxes
    if (i < 3) {
      s.addText('→', { x: x + 2.2, y: 2.58, w: 0.22, h: 0.4, fontFace: FONT, fontSize: 18, bold: true, color: GOLD, align: 'center', valign: 'middle' });
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// СЛАЙД 7 — Программный прототип
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: LIGHT_BG };
  addSlideTitleLight(s, 'Программный прототип системы');
  addFooterLight(s, 'МТУСИ  |  Дрейман А.И.  |  2026');

  // Three-layer arch cards
  const layers = [
    { title: 'Клиент (React)', items: ['Мультипанельный интерфейс', 'Интерактивный график', 'Zoom / Pan / Scrollbar', 'Сравнение 8 моделей'], color: '2563EB' },
    { title: 'API (FastAPI)', items: ['POST /api/forecast', 'GET /api/compare', 'GET /api/data', 'Pydantic-валидация'], color: PURPLE },
    { title: 'Модели (Python)', items: ['TensorFlow / Keras', 'pmdarima, arch', 'Walk-forward test', 'Сценарии до 500 дней'], color: '7C3AED' },
  ];

  layers.forEach((l, i) => {
    const x = 0.28 + i * 3.18;
    addCard(s, x, 1.12, 2.98, 3.6);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.12, w: 2.98, h: 0.52, fill: { color: l.color }, line: { color: l.color, width: 0 } });
    s.addText(l.title, { x: x + 0.12, y: 1.15, w: 2.74, h: 0.46, fontFace: FONT, fontSize: 13, bold: true, color: WHITE, align: 'left', valign: 'middle' });
    l.items.forEach((item, j) => {
      s.addShape(pres.shapes.OVAL, { x: x + 0.18, y: 1.85 + j * 0.6, w: 0.13, h: 0.13, fill: { color: GOLD }, line: { color: GOLD, width: 0 } });
      s.addText(item, { x: x + 0.38, y: 1.8 + j * 0.6, w: 2.5, h: 0.45, fontFace: FONT, fontSize: 11, color: '334155', align: 'left', valign: 'middle' });
    });

    // Arrow between layers
    if (i < 2) {
      s.addText('↔', { x: x + 3.05, y: 2.5, w: 0.22, h: 0.55, fontFace: FONT, fontSize: 18, bold: true, color: PURPLE, align: 'center', valign: 'middle' });
    }
  });

  // Data sources
  addCard(s, 0.28, 4.85, 4.55, 0.52);
  s.addShape(pres.shapes.RECTANGLE, { x: 0.28, y: 4.85, w: 0.12, h: 0.52, fill: { color: GOLD }, line: { color: GOLD, width: 0 } });
  s.addText('MOEX ISS API — акции РФ (.ME тикеры)  |  Актуальные данные в реальном времени', { x: 0.5, y: 4.87, w: 4.2, h: 0.48, fontFace: FONT, fontSize: 10.5, color: PURPLE_D, align: 'left', valign: 'middle' });

  addCard(s, 5.12, 4.85, 4.55, 0.52);
  s.addShape(pres.shapes.RECTANGLE, { x: 5.12, y: 4.85, w: 0.12, h: 0.52, fill: { color: '0E7490' }, line: { color: '0E7490', width: 0 } });
  s.addText('yfinance — NYSE, NASDAQ, S&P 500  |  Зарубежные активы', { x: 5.34, y: 4.87, w: 4.2, h: 0.48, fontFace: FONT, fontSize: 10.5, color: '0E7490', align: 'left', valign: 'middle' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// СЛАЙД 8 — Результаты
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: LIGHT_BG };
  addSlideTitleLight(s, 'Экспериментальные результаты (S&P 500, 2015–2024)');
  addFooterLight(s, 'МТУСИ  |  Дрейман А.И.  |  2026');

  // Table
  const rows = [
    [
      { text: 'Модель',         options: { bold: true, fill: { color: PURPLE }, color: WHITE, fontFace: FONT, fontSize: 11, align: 'center', valign: 'middle' } },
      { text: 'MAE',            options: { bold: true, fill: { color: PURPLE }, color: WHITE, fontFace: FONT, fontSize: 11, align: 'center', valign: 'middle' } },
      { text: 'RMSE',           options: { bold: true, fill: { color: PURPLE }, color: WHITE, fontFace: FONT, fontSize: 11, align: 'center', valign: 'middle' } },
      { text: 'MAPE, %',        options: { bold: true, fill: { color: PURPLE }, color: WHITE, fontFace: FONT, fontSize: 11, align: 'center', valign: 'middle' } },
      { text: 'Улучш. vs LSTM', options: { bold: true, fill: { color: PURPLE }, color: WHITE, fontFace: FONT, fontSize: 11, align: 'center', valign: 'middle' } },
    ],
    ['ARIMA',              '52,3', '71,8', '1,82', '−35,8%'],
    ['GARCH',              '61,7', '84,2', '2,14', '−59,7%'],
    ['LSTM (baseline)',    '38,6', '56,4', '1,34', 'baseline'],
    ['ARIMA + GRU',        '28,1', '42,5', '0,98', '+26,9%'],
    ['GARCH + LSTM',       '31,2', '46,7', '1,09', '+18,7%'],
    ['ARIMA + LSTM',       '27,4', '41,2', '0,96', '+28,4%'],
    [{ text: 'Triple Hybrid',     options: { bold: true, color: '7C3AED', fontFace: FONT, fontSize: 11 } }, { text: '24,8', options: { bold: true, fontFace: FONT, fontSize: 11 } }, { text: '38,1', options: { bold: true, fontFace: FONT, fontSize: 11 } }, { text: '0,87', options: { bold: true, fontFace: FONT, fontSize: 11 } }, { text: '+35,1%', options: { bold: true, color: '059669', fontFace: FONT, fontSize: 11 } }],
    [{ text: 'Ensemble ★',        options: { bold: true, color: PURPLE_D, fontFace: FONT, fontSize: 11 } }, { text: '22,3', options: { bold: true, fontFace: FONT, fontSize: 11 } }, { text: '34,9', options: { bold: true, fontFace: FONT, fontSize: 11 } }, { text: '0,78', options: { bold: true, fontFace: FONT, fontSize: 11 } }, { text: '+41,8%', options: { bold: true, color: '059669', fontFace: FONT, fontSize: 11 } }],
  ];

  // Style data rows with alternating fill
  const styledRows = rows.map((row, ri) => {
    if (ri === 0) return row; // header already styled
    const isLast = ri === rows.length - 1;
    const isSecLast = ri === rows.length - 2;
    const bg = isLast ? 'FEF3C7' : (isSecLast ? 'EDE9FE' : (ri % 2 === 0 ? 'FFFFFF' : 'F5F3FF'));
    return row.map(cell => {
      if (typeof cell === 'object') {
        return { text: cell.text, options: { ...cell.options, fill: { color: bg }, align: 'center', valign: 'middle', fontFace: FONT, fontSize: 11 } };
      }
      return { text: cell, options: { fill: { color: bg }, align: 'center', valign: 'middle', fontFace: FONT, fontSize: 11, color: '1E293B' } };
    });
  });

  s.addTable(styledRows, {
    x: 0.28, y: 1.08, w: 9.44, h: 3.95,
    colW: [2.4, 1.2, 1.2, 1.2, 1.6],
    border: { pt: 0.5, color: 'E2D9F3' },
    rowH: 0.44,
  });

  // Note
  s.addText('Тестовая выборка: 20% данных · Walk-forward backtesting · Окно: 60 торговых дней', {
    x: 0.28, y: 5.08, w: 9.44, h: 0.3,
    fontFace: FONT, fontSize: 9, color: MUTED, align: 'left', valign: 'middle', italic: true,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// СЛАЙД 9 — Диаграмма RMSE
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: LIGHT_BG };
  addSlideTitleLight(s, 'Сравнение моделей: RMSE (меньше = лучше)');
  addFooterLight(s, 'МТУСИ  |  Дрейман А.И.  |  2026');

  const models  = ['ARIMA', 'GARCH', 'LSTM', 'ARIMA+GRU', 'GARCH+LSTM', 'ARIMA+LSTM', 'Triple Hybrid', 'Ensemble'];
  const rmse    = [71.8,    84.2,    56.4,   42.5,        46.7,         41.2,          38.1,            34.9];
  const colors  = ['64748B','64748B','3B82F6','4A32A0',   '5B21B6',    '4A32A0',      '7C3AED',        GOLD];

  s.addChart(pres.charts.BAR, [{
    name: 'RMSE',
    labels: models,
    values: rmse,
  }], {
    x: 0.28, y: 1.05, w: 9.44, h: 3.95,
    barDir: 'bar',
    barGrouping: 'clustered',
    chartColors: colors,
    chartArea: { fill: { color: LIGHT_BG }, roundedCorners: false },
    plotArea: { fill: { color: LIGHT_BG } },
    catAxisLabelColor: '334155',
    valAxisLabelColor: '64748B',
    valGridLine: { color: 'E2E8F0', size: 0.5 },
    catGridLine: { style: 'none' },
    showValue: true,
    dataLabelColor: '1E293B',
    dataLabelFontSize: 10,
    dataLabelFontBold: true,
    showLegend: false,
    valAxisMinVal: 0,
    valAxisMaxVal: 95,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// СЛАЙД 10 — Заключение
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PURPLE };
  addAccentBar(s, GOLD);
  addLogoWhite(s);
  addSlideTitleDark(s, 'Выводы и результаты');
  addFooterDark(s, 'МТУСИ  |  Дрейман А.И.  |  2026');

  const conclusions = [
    { icon: '✔', text: 'Разработана система из 8 моделей — от ARIMA до взвешенного ансамбля' },
    { icon: '✔', text: 'Гибридные модели превосходят одиночные по всем метрикам MAE, RMSE, MAPE' },
    { icon: '✔', text: 'Triple Hybrid снижает MAPE с 1,34% до 0,87%   (+35% к точности vs LSTM)' },
    { icon: '✔', text: 'Ensemble достигает MAPE = 0,78%   (+42% к точности vs LSTM)' },
    { icon: '✔', text: 'Реализован прототип: React + FastAPI + MOEX ISS / yfinance, до 500 дней прогноза' },
  ];

  conclusions.forEach((c, i) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.38, y: 1.08 + i * 0.74, w: 9.22, h: 0.62,
      fill: { color: i % 2 === 0 ? PURPLE_D : '311B6B' }, line: { color: '4A3890', width: 0.5 },
    });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.38, y: 1.08 + i * 0.74, w: 0.08, h: 0.62, fill: { color: GOLD }, line: { color: GOLD, width: 0 } });
    s.addText(c.text, {
      x: 0.58, y: 1.1 + i * 0.74, w: 8.9, h: 0.58,
      fontFace: FONT, fontSize: 12.5, color: WHITE, align: 'left', valign: 'middle',
    });
  });

  // Future work
  s.addText('Направления развития: Transformer / TFT, онлайн-обучение, макроэкономические факторы', {
    x: 0.38, y: 4.86, w: 9.22, h: 0.34,
    fontFace: FONT, fontSize: 10.5, italic: true, color: MUTED, align: 'left', valign: 'middle',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPEAKER NOTES (текст выступления ~5 минут)
// ═══════════════════════════════════════════════════════════════════════════════
// pptxgenjs addNotes API: slide.addNotes("text")
// Notes are added via internal XML — we patch them after slides are built.
// Since pptxgenjs doesn't expose addNotes directly on built slides in all versions,
// we use the supported API: slide.addNotes(text)

// Re-get slide references via the internal array
const allSlides = pres.slides;

const notes = [
  // Slide 1 — Титульный (0:00–0:20)
  `Добрый день! Меня зовут Дрейман Арсений, я студент 4 курса факультета Информационные технологии МТУСИ.
Тема моей работы — анализ и комбинирование методов прогнозирования исторических финансовых данных.
Научный руководитель — старший преподаватель кафедры Системное программирование Изотова Анастасия Андреевна.`,

  // Slide 2 — Актуальность (0:20–1:00)
  `Финансовые временные ряды — это сложные объекты: в них одновременно присутствуют линейные тренды, нелинейные паттерны и кластеризованная волатильность.
Классические методы справляются с этим лишь частично.
ARIMA хорошо описывает линейную составляющую, но не видит нелинейности.
GARCH моделирует волатильность, но не прогнозирует уровень цены.
LSTM и GRU улавливают нелинейные зависимости, но не используют явный статистический тренд.
Вывод — нужно объединить сильные стороны каждого подхода.`,

  // Slide 3 — Цель и задачи (1:00–1:30)
  `Цель работы — повысить точность и устойчивость прогнозов за счёт гибридных архитектур.
Для этого я:
— проанализировал теоретические основы четырёх ключевых методов;
— разработал три новые гибридные архитектуры: ARIMA+GRU, GARCH+LSTM и Triple Hybrid;
— реализовал взвешенный ансамбль;
— создал полноценный программный прототип с REST API и веб-интерфейсом;
— и провёл экспериментальную оценку на реальных биржевых данных.`,

  // Slide 4 — Методы (1:30–2:00)
  `Кратко о каждом из четырёх базовых методов.
ARIMA — классическая статистическая модель: авторегрессия плюс скользящее среднее. Параметры подбираются автоматически через критерий Акаике.
GARCH — модель условной гетероскедастичности: описывает, как меняется волатильность во времени. Используется как источник признака — условной дисперсии.
LSTM и GRU — рекуррентные нейронные сети с вентилями, способные хранить долгосрочные зависимости. GRU — упрощённая версия LSTM, на 15–20% быстрее при сопоставимом качестве.`,

  // Slide 5 — 8 моделей (2:00–2:30)
  `Всего в системе реализовано 8 моделей, разделённых по уровням сложности.
Три базовые: ARIMA, GARCH и LSTM.
Три гибридные двухуровневые: ARIMA+LSTM, ARIMA+GRU и GARCH+LSTM.
Трёхуровневый Triple Hybrid — объединяет все три типа методов.
И взвешенный ансамбль — главный результат работы, объединяющий прогнозы всех четырёх классов с автоматически рассчитанными весами.`,

  // Slide 6 — Triple Hybrid (2:30–3:00)
  `Triple Hybrid — наиболее сложная из предложенных архитектур.
Уровень 1: ARIMA строит базовый прогноз. Остатки — разность реального ряда и прогноза — передаются дальше.
Уровень 2: GARCH вычисляет условную дисперсию этих остатков — меру их волатильности.
Уровень 3: LSTM принимает на вход двумерный вектор — остатки и их дисперсию — и корректирует нелинейную составляющую.
Итоговый прогноз: сумма прогноза ARIMA и поправки LSTM.`,

  // Slide 7 — Прототип (3:00–3:30)
  `Программный прототип реализован по трёхуровневой клиент-серверной архитектуре.
Клиент на React — мультипанельный интерфейс с интерактивным графиком, масштабированием и сравнением восьми моделей.
Сервер на FastAPI — REST API с Pydantic-валидацией входных данных.
Модели написаны на Python с использованием TensorFlow, pmdarima и библиотеки arch.
Для российских акций данные берутся напрямую из MOEX ISS API — это позволило обойти ограничения Yahoo Finance, введённые в 2022 году. Горизонт прогноза — до 500 торговых дней.`,

  // Slide 8 — Результаты (3:30–4:10)
  `Теперь к результатам. Все модели тестировались на индексе S&P 500 за период 2015–2024 годов, с walk-forward backtesting и окном в 60 дней.
Три базовые модели показали MAPE от 1,34% у LSTM до 2,14% у GARCH.
Все гибридные модели превзошли LSTM: ARIMA+LSTM — 0,96%, ARIMA+GRU — 0,98%, GARCH+LSTM — 1,09%.
Triple Hybrid — 0,87%, это улучшение на 35% относительно LSTM.
Ensemble — 0,78%, улучшение на 42%. Это лучший результат среди всех восьми моделей.`,

  // Slide 9 — Диаграмма (4:10–4:30)
  `На диаграмме наглядно видно снижение RMSE при переходе от базовых моделей к гибридным и ансамблю.
Ансамбль достигает RMSE = 34,9 — почти вдвое лучше, чем GARCH (84,2).
Золотым выделен ансамбль — победитель по всем трём метрикам.`,

  // Slide 10 — Заключение (4:30–5:00)
  `Подводя итоги.
Разработана система из восьми моделей с полноценным программным прототипом.
Гибридные модели стабильно превосходят одиночные по всем метрикам.
Triple Hybrid снижает MAPE с 1,34% до 0,87%.
Ансамбль — лучший результат: MAPE 0,78%, улучшение на 42% относительно LSTM.
Система работает с российскими и зарубежными активами и поддерживает прогноз до 500 дней.
Направления развития: добавление Transformer-архитектур, онлайн-обучение и макроэкономические факторы.
Спасибо за внимание. Готов ответить на вопросы.`,
];

notes.forEach((note, i) => {
  if (allSlides[i]) allSlides[i].addNotes(note);
});

// ─── Write ────────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: '/Users/arsendreman/Documents/GitHub/Diplom/article/presentation.pptx' })
  .then(() => console.log('✅  presentation.pptx saved'))
  .catch(e => { console.error(e); process.exit(1); });
