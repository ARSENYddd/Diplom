"""
Общие строительные блоки для всех моделей прогноза.

Содержит:
- Флаг HAS_TF и единый блок импорта TensorFlow с подавлением логов
- Вспомогательные функции построения последовательностей
- Фабрики моделей LSTM / GRU
- Единая функция GARCH-волатильности
- Вспомогательные функции EarlyStopping и seed
"""
import os as _os
import numpy as _np

# ── TensorFlow: единый импорт с подавлением логов ──────────────────────────
_os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
HAS_TF = False
try:
    import tensorflow as tf
    tf.get_logger().setLevel("ERROR")
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, GRU, Dense, Dropout, Input
    from tensorflow.keras.callbacks import EarlyStopping
    HAS_TF = True
except ImportError:
    pass

# ── Построение последовательностей ─────────────────────────────────────────

def _build_sequences_1d(data: _np.ndarray, window: int):
    """
    Одномерные скользящие окна для LSTM/GRU по одному признаку.

    data : (N, 1) — масштабированный вектор
    window : размер окна
    Возвращает X:(N-window, window), y:(N-window,)
    """
    X, y = [], []
    for i in range(window, len(data)):
        X.append(data[i - window: i, 0])
        y.append(data[i, 0])
    return _np.array(X), _np.array(y)


def _build_sequences_2d(data: _np.ndarray, window: int):
    """
    Двумерные скользящие окна для LSTM с двумя признаками.

    data : (N, features) — масштабированная матрица
    window : размер окна
    Возвращает X:(N-window, window, features), y:(N-window,) — первый признак
    """
    X, y = [], []
    for i in range(window, len(data)):
        X.append(data[i - window: i, :])
        y.append(data[i, 0])
    return _np.array(X), _np.array(y)


# ── Фабрики нейронных сетей ─────────────────────────────────────────────────

def build_lstm_1d(window: int, units: int = 64, dropout: float = 0.2):
    """
    2×LSTM(units) + Dropout(dropout) + Dense(1), вход (window, 1).

    Параметры по умолчанию совпадают с исходным кодом всех моделей.
    """
    m = Sequential([
        Input(shape=(window, 1)),
        LSTM(units, return_sequences=True),
        Dropout(dropout),
        LSTM(units, return_sequences=False),
        Dropout(dropout),
        Dense(1),
    ])
    m.compile(optimizer="adam", loss="mean_squared_error")
    return m


def build_lstm_2d(window: int, n_features: int = 2, units: int = 64, dropout: float = 0.2):
    """
    2×LSTM(units) + Dropout(dropout) + Dense(1), вход (window, n_features).

    Параметры по умолчанию совпадают с исходным кодом всех моделей.
    """
    m = Sequential([
        Input(shape=(window, n_features)),
        LSTM(units, return_sequences=True),
        Dropout(dropout),
        LSTM(units, return_sequences=False),
        Dropout(dropout),
        Dense(1),
    ])
    m.compile(optimizer="adam", loss="mean_squared_error")
    return m


def build_gru_1d(window: int, units: int = 64, dropout: float = 0.2):
    """
    2×GRU(units) + Dropout(dropout) + Dense(1), вход (window, 1).

    Параметры по умолчанию совпадают с исходным кодом arima_gru_model.
    """
    m = Sequential([
        Input(shape=(window, 1)),
        GRU(units, return_sequences=True),
        Dropout(dropout),
        GRU(units, return_sequences=False),
        Dropout(dropout),
        Dense(1),
    ])
    m.compile(optimizer="adam", loss="mean_squared_error")
    return m


# ── GARCH ───────────────────────────────────────────────────────────────────

def fit_garch_cond_var(
    series: _np.ndarray,
    p: int = 1,
    q: int = 1,
    scale: float = 100.0,
) -> _np.ndarray:
    """
    Обучить GARCH(p,q) на series*scale и вернуть условную дисперсию σ²_t.

    scale=100.0  — стандарт для остатков ARIMA (как в triple_hybrid, ensemble)
    scale=1.0    — если серия уже масштабирована (например, log-доходности *100
                   из garch_lstm_model, где масштабирование сделано снаружи)

    Возвращает массив той же длины, что series.
    """
    from arch import arch_model as _arch_model
    gm  = _arch_model(series * scale, vol="Garch", p=p, q=q, dist="normal")
    res = gm.fit(disp="off", show_warning=False)
    return res.conditional_volatility ** 2


# ── EarlyStopping ───────────────────────────────────────────────────────────

def make_early_stopping(val_split: float):
    """
    Вернуть EarlyStopping с правильным monitor в зависимости от val_split.

    val_split > 0  → monitor="val_loss"
    val_split == 0 → monitor="loss"
    patience=5, restore_best_weights=True — совпадает с исходным кодом.
    """
    return EarlyStopping(
        monitor="val_loss" if val_split > 0 else "loss",
        patience=5,
        restore_best_weights=True,
    )


# ── Seed ────────────────────────────────────────────────────────────────────

def get_seed(ticker: str, explicit_seed=None) -> int:
    """
    Вернуть seed для numpy/TF генераторов.

    explicit_seed задан → использовать его (для воспроизводимых экспериментов).
    explicit_seed is None → детерминированный seed из тикера (текущее поведение).
    """
    if explicit_seed is not None:
        return int(explicit_seed)
    return hash(ticker) % 2**31
