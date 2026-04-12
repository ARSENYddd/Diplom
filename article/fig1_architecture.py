"""
Рис. 1 — Общая архитектура системы прогнозирования
Клиент (React) ↔ API (FastAPI) ↔ Модели (Python)
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

fig, ax = plt.subplots(figsize=(16, 9))
ax.set_xlim(0, 16)
ax.set_ylim(0, 9)
ax.axis('off')
fig.patch.set_facecolor('#0F172A')   # slate-900
ax.set_facecolor('#0F172A')

# ─── Color palette ────────────────────────────────────────────────────────────
C_BLUE_FILL  = '#1E3A5F'
C_BLUE_BRD   = '#3B82F6'
C_GREEN_FILL = '#14532D'
C_GREEN_BRD  = '#22C55E'
C_PURP_FILL  = '#3B1F6B'
C_PURP_BRD   = '#A855F7'
C_ORAN_FILL  = '#431407'
C_ORAN_BRD   = '#F97316'
C_GRAY_FILL  = '#1E293B'
C_GRAY_BRD   = '#475569'
C_TEXT_HEAD  = '#F1F5F9'
C_TEXT_BODY  = '#CBD5E1'
C_TEXT_MUTED = '#94A3B8'
C_ARROW      = '#64748B'

def box(ax, x, y, w, h, fill, border, radius=0.25):
    rect = FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0,rounding_size={radius}",
        linewidth=1.5,
        edgecolor=border,
        facecolor=fill,
        zorder=3,
    )
    ax.add_patch(rect)

def header_bar(ax, x, y, w, h, fill, border, radius=0.25):
    """Top coloured header strip for a card."""
    rect = FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0,rounding_size={radius}",
        linewidth=0,
        edgecolor='none',
        facecolor=fill,
        zorder=4,
    )
    ax.add_patch(rect)

def txt(ax, x, y, s, size=9, color=C_TEXT_BODY, bold=False, ha='center', va='center'):
    ax.text(x, y, s, fontsize=size, color=color,
            ha=ha, va=va, fontweight='bold' if bold else 'normal',
            zorder=5, fontfamily='monospace' if s.startswith('/') else 'DejaVu Sans')

def bullet(ax, x, y, items, size=8.5, color=C_TEXT_BODY):
    for i, item in enumerate(items):
        ax.text(x, y - i * 0.42, f'• {item}', fontsize=size,
                color=color, ha='left', va='center', zorder=5)

def arrow(ax, x1, y1, x2, y2, color=C_ARROW, style='->'):
    ax.annotate('',
        xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(
            arrowstyle=style,
            color=color,
            lw=1.8,
            connectionstyle='arc3,rad=0.0',
        ),
        zorder=6,
    )

def double_arrow(ax, x1, y_mid, x2, color=C_ARROW):
    """Two parallel arrows between two x positions at y_mid ± 0.1."""
    arrow(ax, x1, y_mid + 0.12, x2, y_mid + 0.12, color=color)
    arrow(ax, x2, y_mid - 0.12, x1, y_mid - 0.12, color=color)

# ─── Title ────────────────────────────────────────────────────────────────────
txt(ax, 8, 8.55,
    'Архитектура системы прогнозирования финансовых временных рядов',
    size=13, color=C_TEXT_HEAD, bold=True)
txt(ax, 8, 8.15,
    'Клиент (React)  ↔  API (FastAPI)  ↔  Модели (Python/TensorFlow)',
    size=9.5, color=C_TEXT_MUTED)

# ═══════════════════════════════════════════════════════════════════════════════
# КОЛОНКА 1: КЛИЕНТ (React)  x=0.4 .. 4.4
# ═══════════════════════════════════════════════════════════════════════════════
BX1, BW = 0.45, 4.0
BY_TOP, BH = 1.0, 6.6

box(ax, BX1, BY_TOP, BW, BH, C_BLUE_FILL, C_BLUE_BRD)
header_bar(ax, BX1, BY_TOP + BH - 0.65, BW, 0.65, '#1D4ED8', C_BLUE_BRD)
txt(ax, BX1 + BW/2, BY_TOP + BH - 0.32, '[React]  КЛИЕНТ  (React + Tailwind)',
    size=10.5, color='#BFDBFE', bold=True)

# Sub-box: UI Panels
box(ax, BX1+0.2, BY_TOP+4.55, BW-0.4, 1.7, '#172554', '#1D4ED8', radius=0.18)
txt(ax, BX1+BW/2, BY_TOP+5.85, 'Мультипанельный интерфейс', size=8.5, color='#93C5FD', bold=True)
bullet(ax, BX1+0.45, BY_TOP+5.45,
       ['Независимые панели прогнозов',
        'Выбор тикера и модели',
        'Запуск вычислений'], size=8, color=C_TEXT_BODY)

# Sub-box: Chart
box(ax, BX1+0.2, BY_TOP+2.6, BW-0.4, 1.75, '#172554', '#1D4ED8', radius=0.18)
txt(ax, BX1+BW/2, BY_TOP+3.85, 'Интерактивный график', size=8.5, color='#93C5FD', bold=True)
bullet(ax, BX1+0.45, BY_TOP+3.45,
       ['Zoom (колесо мыши)',
        'Pan (drag / trackpad)',
        'Инструменты рисования',
        'Скроллбар навигации'], size=8, color=C_TEXT_BODY)

# Sub-box: Comparison
box(ax, BX1+0.2, BY_TOP+1.05, BW-0.4, 1.35, '#172554', '#1D4ED8', radius=0.18)
txt(ax, BX1+BW/2, BY_TOP+2.05, 'Сравнение моделей', size=8.5, color='#93C5FD', bold=True)
bullet(ax, BX1+0.45, BY_TOP+1.7,
       ['MAE / RMSE / MAPE',
        '8 моделей, рейтинг'], size=8, color=C_TEXT_BODY)

txt(ax, BX1+BW/2, BY_TOP+0.55, 'Браузер  ·  HTTP/REST  ·  JSON', size=7.5, color=C_TEXT_MUTED)

# ═══════════════════════════════════════════════════════════════════════════════
# КОЛОНКА 2: API  x=5.8 .. 10.2
# ═══════════════════════════════════════════════════════════════════════════════
BX2 = 5.8
BW2 = 4.4

box(ax, BX2, BY_TOP, BW2, BH, C_GREEN_FILL, C_GREEN_BRD)
header_bar(ax, BX2, BY_TOP + BH - 0.65, BW2, 0.65, '#15803D', C_GREEN_BRD)
txt(ax, BX2 + BW2/2, BY_TOP + BH - 0.32, '[API]  СЕРВЕР  (FastAPI)',
    size=10.5, color='#BBF7D0', bold=True)

# Endpoints
box(ax, BX2+0.2, BY_TOP+4.3, BW2-0.4, 2.0, '#052E16', '#16A34A', radius=0.18)
txt(ax, BX2+BW2/2, BY_TOP+5.85, 'REST Endpoints', size=8.5, color='#86EFAC', bold=True)
endpoints = [
    'POST  /api/forecast',
    'GET   /api/compare',
    'GET   /api/data',
    'GET   /health',
    'GET   /api/debug/date',
]
for i, ep in enumerate(endpoints):
    ax.text(BX2+0.5, BY_TOP+5.52 - i*0.37, ep,
            fontsize=8, color='#4ADE80', ha='left', va='center',
            zorder=5, fontfamily='monospace')

# Request/Response
box(ax, BX2+0.2, BY_TOP+2.55, BW2-0.4, 1.55, '#052E16', '#16A34A', radius=0.18)
txt(ax, BX2+BW2/2, BY_TOP+3.65, 'ForecastRequest (Pydantic)', size=8.5, color='#86EFAC', bold=True)
fields = ['ticker, start, end, today',
          'model, window (60 дней)',
          'n_future (до 500 дней)']
for i, f in enumerate(fields):
    ax.text(BX2+0.5, BY_TOP+3.35 - i*0.34, f,
            fontsize=7.8, color=C_TEXT_BODY, ha='left', va='center', zorder=5)

# Data routing
box(ax, BX2+0.2, BY_TOP+1.05, BW2-0.4, 1.3, '#052E16', '#16A34A', radius=0.18)
txt(ax, BX2+BW2/2, BY_TOP+2.0, 'Маршрутизация данных', size=8.5, color='#86EFAC', bold=True)
bullet(ax, BX2+0.45, BY_TOP+1.68,
       ['.ME тикер → MOEX ISS API',
        'прочие  → yfinance'], size=8, color=C_TEXT_BODY)

txt(ax, BX2+BW2/2, BY_TOP+0.55, 'Python 3.11  ·  Uvicorn  ·  Docker', size=7.5, color=C_TEXT_MUTED)

# ═══════════════════════════════════════════════════════════════════════════════
# КОЛОНКА 3: МОДЕЛИ  x=11.1 .. 15.5
# ═══════════════════════════════════════════════════════════════════════════════
BX3 = 11.1
BW3 = 4.45

box(ax, BX3, BY_TOP, BW3, BH, C_PURP_FILL, C_PURP_BRD)
header_bar(ax, BX3, BY_TOP + BH - 0.65, BW3, 0.65, '#7E22CE', C_PURP_BRD)
txt(ax, BX3 + BW3/2, BY_TOP + BH - 0.32, '[ML]  МОДЕЛИ  (TensorFlow / pmdarima)',
    size=10.5, color='#E9D5FF', bold=True)

# Models list
box(ax, BX3+0.2, BY_TOP+3.1, BW3-0.4, 3.15, '#1E0A3C', '#7C3AED', radius=0.18)
txt(ax, BX3+BW3/2, BY_TOP+5.75, '8 моделей прогнозирования', size=8.5, color='#C4B5FD', bold=True)

models = [
    ('ARIMA',           '#94A3B8'),
    ('GARCH',           '#94A3B8'),
    ('LSTM',            '#818CF8'),
    ('ARIMA + GRU',     '#818CF8'),
    ('GARCH + LSTM',    '#A78BFA'),
    ('ARIMA + LSTM',    '#A78BFA'),
    ('Triple Hybrid',   '#C084FC'),
    ('Ensemble ★',      '#E879F9'),
]
for i, (name, color) in enumerate(models):
    ax.text(BX3+0.5, BY_TOP+5.42 - i*0.38, f'• {name}',
            fontsize=8.2, color=color, ha='left', va='center', zorder=5,
            fontweight='bold' if 'Ensemble' in name or 'Triple' in name else 'normal')

# Walk-forward
box(ax, BX3+0.2, BY_TOP+1.95, BW3-0.4, 0.95, '#1E0A3C', '#7C3AED', radius=0.18)
txt(ax, BX3+BW3/2, BY_TOP+2.62, 'Walk-forward backtesting', size=8.5, color='#C4B5FD', bold=True)
txt(ax, BX3+BW3/2, BY_TOP+2.25, 'Оценка: MAE · RMSE · MAPE', size=8, color=C_TEXT_BODY)

# Scenarios
box(ax, BX3+0.2, BY_TOP+1.05, BW3-0.4, 0.7, '#1E0A3C', '#7C3AED', radius=0.18)
txt(ax, BX3+BW3/2, BY_TOP+1.55, 'Сценарии: Медвежий / Базовый / Бычий', size=8, color='#C4B5FD', bold=True)
txt(ax, BX3+BW3/2, BY_TOP+1.2, 'Bootstrap на остатках · до 500 дней', size=7.8, color=C_TEXT_BODY)

txt(ax, BX3+BW3/2, BY_TOP+0.55, 'Keras  ·  pmdarima  ·  arch  ·  scikit-learn', size=7.5, color=C_TEXT_MUTED)

# ═══════════════════════════════════════════════════════════════════════════════
# СТРЕЛКИ между колонками
# ═══════════════════════════════════════════════════════════════════════════════
# React ↔ FastAPI
arr_y = BY_TOP + BH/2
double_arrow(ax, BX1+BW, arr_y, BX2, color='#3B82F6')
txt(ax, (BX1+BW + BX2)/2, arr_y+0.42, 'JSON', size=7.5, color='#60A5FA')
txt(ax, (BX1+BW + BX2)/2, arr_y-0.38, 'HTTP', size=7.5, color='#60A5FA')

# FastAPI ↔ Models
double_arrow(ax, BX2+BW2, arr_y, BX3, color='#A855F7')
txt(ax, (BX2+BW2 + BX3)/2, arr_y+0.42, 'вызов', size=7.5, color='#C084FC')
txt(ax, (BX2+BW2 + BX3)/2, arr_y-0.38, 'результат', size=7.5, color='#C084FC')

# ─── Data sources annotation under the Models box ────────────────────────────
DS_Y = BY_TOP - 0.0
ax.annotate('',
    xy=(BX3 + BW3*0.25, BY_TOP),
    xytext=(BX3 + BW3*0.25, BY_TOP - 0.55),
    arrowprops=dict(arrowstyle='<-', color='#F97316', lw=1.5),
    zorder=6,
)
ax.annotate('',
    xy=(BX3 + BW3*0.75, BY_TOP),
    xytext=(BX3 + BW3*0.75, BY_TOP - 0.55),
    arrowprops=dict(arrowstyle='<-', color='#F97316', lw=1.5),
    zorder=6,
)

box(ax, BX3, 0.1, BW3*0.45, 0.78, '#431407', '#F97316', radius=0.15)
txt(ax, BX3 + BW3*0.225, 0.5, 'MOEX ISS API', size=8, color='#FED7AA', bold=True)
txt(ax, BX3 + BW3*0.225, 0.23, 'Акции РФ (.ME)', size=7.5, color=C_TEXT_MUTED)

box(ax, BX3 + BW3*0.5 + 0.05, 0.1, BW3*0.45-0.05, 0.78, '#431407', '#F97316', radius=0.15)
txt(ax, BX3 + BW3*0.775, 0.5, 'yfinance', size=8, color='#FED7AA', bold=True)
txt(ax, BX3 + BW3*0.775, 0.23, 'NYSE / NASDAQ', size=7.5, color=C_TEXT_MUTED)

# ─── Caption ──────────────────────────────────────────────────────────────────
txt(ax, 8, 0.0,
    'Рис. 1. Общая архитектура системы: клиент (React) ↔ API (FastAPI) ↔ модели (Python)',
    size=8.5, color=C_TEXT_MUTED)

plt.tight_layout(pad=0)
plt.savefig('fig1_architecture.png', dpi=200, bbox_inches='tight',
            facecolor=fig.get_facecolor())
print('✅  fig1_architecture.png saved')
