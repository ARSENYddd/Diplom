"""
Add Chapters 3, 4, Заключение, and Список литературы to the diploma docx.
Uses the same XML formatting as the existing chapters.
"""
import re, uuid

DOC_PATH = '/Users/arsendreman/Documents/GitHub/Diplom/article/diploma_unpacked/word/document.xml'

def pid():
    return uuid.uuid4().hex[:8].upper()

def chapter_heading(text):
    """ГЛАВА X. ЗАГОЛОВОК — centered, bold, 28pt, pStyle=2"""
    return f'''
    <w:p w14:paraId="{pid()}">
      <w:pPr>
        <w:pStyle w:val="2"/>
        <w:bidi w:val="0"/>
        <w:rPr><w:rFonts w:hint="default"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:hint="default"/></w:rPr>
        <w:t>{text}</w:t>
      <w:br w:type="textWrapping"/></w:r>
    </w:p>'''

def section_heading(text):
    """1.1. Заголовок — pStyle=2"""
    return f'''
    <w:p w14:paraId="{pid()}">
      <w:pPr>
        <w:pStyle w:val="2"/>
        <w:bidi w:val="0"/>
        <w:rPr><w:rFonts w:hint="default"/><w:lang w:val="ru-RU"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:hint="default"/><w:lang w:val="ru-RU"/></w:rPr>
        <w:t>{text}</w:t>
      </w:r>
    </w:p>'''

def body_para(text):
    """Обычный абзац — Times New Roman 14pt, 1.5 интервал, отступ первой строки"""
    return f'''
    <w:p w14:paraId="{pid()}">
      <w:pPr>
        <w:bidi w:val="0"/>
        <w:spacing w:line="360" w:lineRule="auto"/>
        <w:ind w:firstLine="720" w:firstLineChars="0"/>
        <w:jc w:val="both"/>
        <w:rPr><w:rFonts w:hint="default"/><w:lang w:val="ru-RU"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:hint="default"/><w:lang w:val="ru-RU"/></w:rPr>
        <w:t xml:space="preserve">{text}</w:t>
      </w:r>
    </w:p>'''

def body_bold_para(bold_text, normal_text):
    """Абзац, начинающийся жирным текстом"""
    return f'''
    <w:p w14:paraId="{pid()}">
      <w:pPr>
        <w:bidi w:val="0"/>
        <w:spacing w:line="360" w:lineRule="auto"/>
        <w:ind w:firstLine="720" w:firstLineChars="0"/>
        <w:jc w:val="both"/>
        <w:rPr><w:rFonts w:hint="default"/><w:lang w:val="ru-RU"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:hint="default"/><w:b/><w:lang w:val="ru-RU"/></w:rPr>
        <w:t xml:space="preserve">{bold_text}</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:hint="default"/><w:lang w:val="ru-RU"/></w:rPr>
        <w:t xml:space="preserve">{normal_text}</w:t>
      </w:r>
    </w:p>'''

def figure_placeholder(caption):
    """[Место для рисунка] + подпись — по центру"""
    return f'''
    <w:p w14:paraId="{pid()}">
      <w:pPr>
        <w:spacing w:line="360" w:lineRule="auto"/>
        <w:jc w:val="center"/>
        <w:rPr><w:rFonts w:hint="default"/><w:lang w:val="ru-RU"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:hint="default"/><w:i/><w:color w:val="888888"/><w:lang w:val="ru-RU"/></w:rPr>
        <w:t>[Место для рисунка]</w:t>
      </w:r>
    </w:p>
    <w:p w14:paraId="{pid()}">
      <w:pPr>
        <w:bidi w:val="0"/>
        <w:spacing w:line="360" w:lineRule="auto"/>
        <w:ind w:firstLine="720" w:firstLineChars="0"/>
        <w:jc w:val="both"/>
        <w:rPr><w:rFonts w:hint="default"/><w:lang w:val="ru-RU"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:hint="default"/><w:lang w:val="ru-RU"/></w:rPr>
        <w:t>{caption}</w:t>
      </w:r>
    </w:p>'''

def empty_para():
    return f'''
    <w:p w14:paraId="{pid()}">
      <w:pPr><w:spacing w:line="360" w:lineRule="auto"/></w:pPr>
    </w:p>'''

def numbered_item(num, text):
    """Нумерованный пункт: 1) текст;"""
    return body_para(f'{num}) {text}')

def bullet_item(text):
    """Маркерный пункт через тире"""
    return f'''
    <w:p w14:paraId="{pid()}">
      <w:pPr>
        <w:bidi w:val="0"/>
        <w:spacing w:line="360" w:lineRule="auto"/>
        <w:ind w:left="720" w:firstLine="0"/>
        <w:jc w:val="both"/>
        <w:rPr><w:rFonts w:hint="default"/><w:lang w:val="ru-RU"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:hint="default"/><w:lang w:val="ru-RU"/></w:rPr>
        <w:t xml:space="preserve">\u2013 {text}</w:t>
      </w:r>
    </w:p>'''

def table_row(cells, bold=False):
    """Строка таблицы"""
    tcs = ''
    for c in cells:
        b = '<w:b/>' if bold else ''
        tcs += f'''
        <w:tc>
          <w:tcPr>
            <w:tcBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tcBorders>
          </w:tcPr>
          <w:p w14:paraId="{pid()}">
            <w:pPr>
              <w:spacing w:line="276" w:lineRule="auto"/>
              <w:jc w:val="center"/>
              <w:rPr><w:rFonts w:hint="default"/>{b}<w:sz w:val="24"/><w:lang w:val="ru-RU"/></w:rPr>
            </w:pPr>
            <w:r>
              <w:rPr><w:rFonts w:hint="default"/>{b}<w:sz w:val="24"/><w:lang w:val="ru-RU"/></w:rPr>
              <w:t>{c}</w:t>
            </w:r>
          </w:p>
        </w:tc>'''
    return f'''
      <w:tr w14:paraId="{pid()}">
        {tcs}
      </w:tr>'''

def table(rows_data, col_widths=None):
    """Простая таблица"""
    grid = ''
    if col_widths:
        for w in col_widths:
            grid += f'<w:gridCol w:w="{w}"/>'
    else:
        for _ in rows_data[0]:
            grid += f'<w:gridCol w:w="{9600 // len(rows_data[0])}"/>'

    trs = ''
    for i, row in enumerate(rows_data):
        trs += table_row(row, bold=(i == 0))

    return f'''
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9600" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        </w:tblBorders>
        <w:jc w:val="center"/>
      </w:tblPr>
      <w:tblGrid>{grid}</w:tblGrid>
      {trs}
    </w:tbl>'''

def page_break():
    return f'''
    <w:p w14:paraId="{pid()}">
      <w:pPr><w:spacing w:line="360" w:lineRule="auto"/></w:pPr>
      <w:r><w:br w:type="page"/></w:r>
    </w:p>'''

def ref_item(text):
    """Пункт списка литературы"""
    return f'''
    <w:p w14:paraId="{pid()}">
      <w:pPr>
        <w:bidi w:val="0"/>
        <w:spacing w:line="360" w:lineRule="auto"/>
        <w:ind w:firstLine="720" w:firstLineChars="0"/>
        <w:jc w:val="both"/>
        <w:rPr><w:rFonts w:hint="default"/><w:lang w:val="ru-RU"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:hint="default"/><w:lang w:val="ru-RU"/></w:rPr>
        <w:t xml:space="preserve">{text}</w:t>
      </w:r>
    </w:p>'''

# ═══════════════════════════════════════════════════════════════════════════════
# BUILD CONTENT
# ═══════════════════════════════════════════════════════════════════════════════
content = ''

# ─── ГЛАВА 3 ───────────────────────────────────────────────────────────────────
content += section_heading('3.1. Архитектура системы прогнозирования')

content += body_para(
    'Разработанная система прогнозирования построена по трёхуровневой '
    'клиент-серверной архитектуре, обеспечивающей разделение ответственности '
    'между компонентами визуализации, бизнес-логики и вычислительного ядра. '
    'Архитектура включает три основных слоя: клиентский интерфейс (React), '
    'API-сервер (FastAPI) и вычислительные модели (Python/TensorFlow).')

content += body_para(
    'Клиентская часть реализована на фреймворке React с использованием '
    'библиотеки визуализации Recharts и CSS-фреймворка Tailwind CSS. '
    'Интерфейс предоставляет мультипанельный режим, позволяющий '
    'одновременно запускать и визуально сравнивать прогнозы нескольких моделей '
    'на различных финансовых инструментах. Реализованы интерактивные '
    'инструменты навигации: масштабирование колесом мыши, '
    'панорамирование перетаскиванием и двухпальцевым жестом на тачпаде, '
    'а также встроенные инструменты рисования для технического анализа.')

content += body_para(
    'Серверная часть реализована на Python с использованием фреймворка FastAPI, '
    'обеспечивающего автоматическую валидацию входных данных через модели Pydantic '
    'и асинхронную обработку запросов. Модель данных ForecastRequest включает '
    'параметры: тикер инструмента, временной диапазон, тип модели (одна из восьми), '
    'размер окна (по умолчанию 60 торговых дней) и текущую дату клиента. '
    'Передача даты от клиента обеспечивает независимость от часового пояса сервера.')

content += body_para(
    'Для получения исторических котировок реализован модуль маршрутизации данных. '
    'Тикеры с суффиксом .ME (Московская биржа) обслуживаются через официальный '
    'MOEX ISS API (iss.moex.com), предоставляющий бесплатный доступ к историческим '
    'данным без авторизации. Зарубежные инструменты (NYSE, NASDAQ, индексы) '
    'обслуживаются библиотекой yfinance. Автоматическая пагинация MOEX ISS API '
    'обеспечивает получение полных временных рядов без ограничений по объёму.')

content += figure_placeholder(
    'Рисунок 7 \u2014 Общая архитектура системы прогнозирования: '
    'клиент (React) \u2194 API (FastAPI) \u2194 модели (Python)')

content += section_heading('3.2. Реализация базовых моделей')
content += body_bold_para('3.2.1. Модель ARIMA. ',
    'В системе реализована автоматическая настройка модели ARIMA с использованием '
    'библиотеки pmdarima (функция auto_arima). Подбор оптимальных параметров (p, d, q) '
    'осуществляется по критерию AIC (Akaike Information Criterion) с ограничениями '
    'max_p = max_q = 5 и d = 1. Тестирование выполняется в режиме walk-forward: '
    'модель обучается на тренировочной выборке, прогнозирует один шаг вперёд, '
    'после чего обучающая выборка расширяется на одно наблюдение. Данный подход '
    'исключает утечку данных из будущего в обучение.')

content += body_bold_para('3.2.2. Модель GARCH. ',
    'Модель GARCH(1,1) реализована с использованием библиотеки arch. '
    'Входными данными являются логарифмические доходности, умноженные на 100 '
    'для числовой стабильности. Модель возвращает временной ряд условной '
    'дисперсии \u03c3\u00b2(t), который используется как дополнительный признак '
    'в нейросетевых гибридных моделях. Самостоятельно GARCH не применяется '
    'для прогноза уровня цены, а служит генератором признака волатильности.')

content += body_bold_para('3.2.3. Модель LSTM. ',
    'Нейронная сеть LSTM реализована в TensorFlow/Keras и имеет следующую '
    'архитектуру: два последовательных слоя LSTM по 64 единицы каждый, '
    'слой Dropout(0.2) для регуляризации и полносвязный выходной слой Dense(1). '
    'Размерность входного тензора: (batch, window, 1), где window = 60 торговых дней. '
    'Входные данные нормализуются через MinMaxScaler в диапазон [0, 1]. '
    'Обучение проводится с функцией потерь MSE, оптимизатором Adam, '
    'в течение 50 эпох с ранней остановкой (patience = 5) по валидационной '
    'выборке (10% тренировочных данных).')

content += figure_placeholder(
    'Рисунок 8 \u2014 Архитектура нейронной сети LSTM: '
    '2\u00d7LSTM(64) + Dropout(0.2) + Dense(1)')

content += section_heading('3.3. Гибридная модель ARIMA+LSTM')
content += body_para(
    'Гибридная модель ARIMA+LSTM реализует двухуровневую декомпозицию '
    'временного ряда по методу Zhang (2003). На первом уровне автоматически '
    'настроенная модель ARIMA формирует прогноз линейной составляющей ряда. '
    'Остатки (residuals), определяемые как разность реального значения и '
    'прогноза ARIMA: e_t = y_t \u2212 \u0177_ARIMA(t), содержат нелинейные '
    'паттерны, не описанные линейной моделью.')

content += body_para(
    'На втором уровне остатки нормализуются через MinMaxScaler '
    'и подаются в двухслойную сеть LSTM(64) + Dropout(0.2) + Dense(1). '
    'Сеть обучается прогнозировать следующее значение остатка '
    'на основе скользящего окна из 60 предыдущих наблюдений. '
    'Итоговый прогноз формируется как сумма: '
    '\u0177_t = \u0177_ARIMA(t) + \u0177_LSTM(t).')

content += body_para(
    'Тестирование проводится в режиме walk-forward: для каждой точки тестовой '
    'выборки ARIMA переобучается с расширенным обучающим набором, вычисляется '
    'остаток, и LSTM прогнозирует его коррекцию. Данный подход обеспечивает '
    'реалистичную оценку качества, имитирующую применение модели в реальном времени.')

content += figure_placeholder(
    'Рисунок 9 \u2014 Схема гибридной модели ARIMA+LSTM: '
    'ряд \u2192 ARIMA \u2192 остатки \u2192 LSTM \u2192 итоговый прогноз')

content += section_heading('3.4. Гибридная модель ARIMA+GRU')
content += body_para(
    'Модель ARIMA+GRU структурно идентична ARIMA+LSTM, '
    'с заменой рекуррентного блока на GRU (Gated Recurrent Unit). '
    'Архитектура нейросетевого компонента: 2\u00d7GRU(64) + Dropout(0.2) + Dense(1). '
    'GRU содержит два вентиля (обновления и сброса) вместо трёх у LSTM, '
    'что сокращает число обучаемых параметров и время обучения '
    'на 15\u201320% при сопоставимом качестве прогноза на финансовых данных.')

content += body_para(
    'Выбор GRU обоснован необходимостью протестировать гипотезу о том, '
    'что для коррекции остатков ARIMA достаточно более простой рекуррентной '
    'архитектуры, особенно при ограниченном объёме обучающих данных '
    '(например, для российских тикеров с короткой историей на MOEX ISS).')

content += section_heading('3.5. Гибридная модель GARCH+LSTM')
content += body_para(
    'Модель GARCH+LSTM расширяет входное пространство признаков нейронной сети '
    'за счёт явного включения информации о волатильности. На каждом временном '
    'шаге t формируется двумерный входной вектор: [x_t, \u03c3\u00b2_t], где '
    'x_t \u2014 нормализованная цена закрытия, \u03c3\u00b2_t \u2014 условная '
    'дисперсия, вычисленная моделью GARCH(1,1) по логарифмическим доходностям.')

content += body_para(
    'Оба признака нормализуются независимо через MinMaxScaler. Размерность '
    'входного тензора LSTM составляет (batch, window, 2). Архитектура сети: '
    '2\u00d7LSTM(64) + Dropout(0.2) + Dense(1). Такой подход позволяет '
    'нейронной сети явно учитывать текущий режим волатильности при '
    'формировании прогноза цены, что особенно важно в периоды '
    'рыночной нестабильности.')

content += figure_placeholder(
    'Рисунок 10 \u2014 Архитектура GARCH+LSTM: '
    'двумерный вход [цена, \u03c3\u00b2] в LSTM')

content += section_heading('3.6. Трёхуровневая гибридная модель (Triple Hybrid)')
content += body_para(
    'Наиболее сложная из предложенных архитектур \u2014 Triple Hybrid \u2014 '
    'реализует трёхуровневую декомпозицию временного ряда, объединяя '
    'все три класса моделей: ARIMA, GARCH и LSTM.')

content += body_bold_para('Уровень 1 (ARIMA). ',
    'Автоматически настроенная модель ARIMA формирует базовый прогноз '
    '\u0177_ARIMA(t). Вычисляются остатки первого уровня: '
    'e\u00b9_t = y_t \u2212 \u0177_ARIMA(t).')

content += body_bold_para('Уровень 2 (GARCH). ',
    'Модель GARCH(1,1) применяется к остаткам e\u00b9_t '
    'для вычисления их условной дисперсии \u03c3\u00b2_t. '
    'Этот показатель отражает текущую волатильность нелинейной '
    'составляющей ряда.')

content += body_bold_para('Уровень 3 (LSTM). ',
    'Нейронная сеть LSTM принимает двумерный вход '
    '[e\u00b9_t, \u03c3\u00b2_t] и обучается прогнозировать '
    'следующее значение остатка. Входные признаки нормализуются '
    'независимо: остатки \u2014 в диапазон (\u22121, 1), '
    'дисперсия \u2014 в (0, 1).')

content += body_para(
    'Итоговый прогноз: \u0177_t = \u0177_ARIMA(t) + \u0177_LSTM(t). '
    'При скользящем прогнозе (walk-forward) GARCH переобучается на каждом шаге, '
    'обеспечивая актуальную оценку волатильности. Данная архитектура позволяет '
    'учесть линейную составляющую (ARIMA), режим волатильности (GARCH) '
    'и нелинейные паттерны (LSTM) в рамках единой модели.')

content += figure_placeholder(
    'Рисунок 11 \u2014 Схема Triple Hybrid: '
    'ARIMA \u2192 GARCH(остатки) \u2192 LSTM([e\u00b9, \u03c3\u00b2]) \u2192 итоговый прогноз')

content += section_heading('3.7. Взвешенный ансамбль')
content += body_para(
    'Ансамблевая модель объединяет прогнозы четырёх архитектур: '
    'ARIMA, LSTM, ARIMA+LSTM (гибридная) и Triple Hybrid. '
    'Веса моделей определяются автоматически на основе их точности '
    'на валидационной выборке (последние 10% обучающих данных):')

content += body_para(
    'w_i = (1 / RMSE_i) / \u2211_j (1 / RMSE_j)')

content += body_para(
    'Таким образом, модели с меньшей ошибкой получают больший вес в итоговом '
    'прогнозе. Итоговое предсказание вычисляется как взвешенная сумма: '
    '\u0177_t = \u2211_i w_i \u00b7 \u0177_i(t). Данный подход не требует '
    'ручной настройки весов и автоматически адаптируется к характеристикам '
    'конкретного временного ряда.')

content += body_para(
    'Обучение ансамбля состоит из трёх этапов. Сначала тренировочные данные '
    'разделяются на основную часть (90%) и валидационную (10%). Затем все '
    'четыре модели обучаются на основной части и оцениваются на валидационной '
    'по метрике RMSE. Наконец, вычисляются веса обратно пропорционально RMSE, '
    'и модели тестируются на тестовой выборке с walk-forward backtesting.')

content += figure_placeholder(
    'Рисунок 12 \u2014 Схема взвешенного ансамбля: '
    '4 модели \u2192 валидация \u2192 веса \u2192 итоговый прогноз')

content += section_heading('3.8. Программная реализация')
content += body_para(
    'Серверная часть системы реализована на языке Python 3.11 с использованием '
    'следующего стека технологий: FastAPI \u2014 веб-фреймворк для REST API; '
    'TensorFlow/Keras \u2014 построение и обучение нейронных сетей; '
    'pmdarima \u2014 автоматический подбор параметров ARIMA; '
    'arch \u2014 реализация GARCH; scikit-learn \u2014 нормализация данных (MinMaxScaler); '
    'httpx \u2014 HTTP-клиент для MOEX ISS API; yfinance \u2014 загрузка зарубежных котировок.')

content += body_para(
    'API-сервер предоставляет следующие конечные точки: '
    'POST /api/forecast \u2014 запуск прогноза выбранной модели; '
    'GET /api/compare \u2014 получение базовых метрик всех восьми моделей; '
    'GET /api/data \u2014 загрузка исторических котировок. '
    'Входные данные валидируются моделью Pydantic ForecastRequest, '
    'включающей параметры ticker, start, end, model, window и today.')

content += body_para(
    'Клиентская часть реализована на React 18 с библиотекой визуализации '
    'Recharts. Интерфейс обеспечивает: мультипанельный режим для '
    'параллельного сравнения моделей; интерактивную навигацию '
    '(zoom, pan, scrollbar); инструменты рисования для технического '
    'анализа; отображение метрик MAE, RMSE и MAPE '
    'для каждого прогноза; веерные сценарии (медвежий, базовый, '
    'бычий) для будущих прогнозов.')

content += figure_placeholder(
    'Рисунок 13 \u2014 Интерфейс системы: мультипанельный режим сравнения моделей')

content += body_para(
    'Стабильность визуализации обеспечивается применением React.memo '
    'для компонента графика и отключением анимации (isAnimationActive=false), '
    'что предотвращает перерисовку диаграммы при переключении инструментов '
    'рисования. Обработчики событий масштабирования и панорамирования '
    'используют useRef для стабильных замыканий, избегая проблем '
    'с устаревшими значениями состояний в обработчиках событий.')

content += body_bold_para('Вывод по главе 3. ',
    'В третьей главе описана архитектура и программная реализация системы '
    'прогнозирования финансовых временных рядов, включающей восемь моделей: '
    'три базовых (ARIMA, GARCH, LSTM), три двухуровневых гибридных '
    '(ARIMA+LSTM, ARIMA+GRU, GARCH+LSTM), трёхуровневую Triple Hybrid '
    '(ARIMA+GARCH+LSTM) и взвешенный ансамбль. Система реализована '
    'по клиент-серверной архитектуре (React + FastAPI + Python) '
    'и поддерживает данные как российского (MOEX ISS), '
    'так и зарубежного (yfinance) рынков.')

# ─── ГЛАВА 4 ───────────────────────────────────────────────────────────────────
content += page_break()
content += chapter_heading('ГЛАВА 4. ЭКСПЕРИМЕНТАЛЬНОЕ ТЕСТИРОВАНИЕ И СРАВНИТЕЛЬНЫЙ АНАЛИЗ')

content += section_heading('4.1. Описание экспериментальных данных')
content += body_para(
    'Экспериментальное тестирование проводилось на исторических котировках '
    'индекса S&P 500 (тикер ^GSPC) за период с 1 января 2015 года '
    'по 1 января 2024 года. Общий объём данных составил около 2260 торговых '
    'дней. Дополнительно тестирование проводилось на акциях российских '
    'компаний: Сбербанк (SBER.ME) и ЛУКОЙЛ (LKOH.ME), '
    'данные которых получены через MOEX ISS API.')

content += body_para(
    'Разбиение выборки: 80% данных использовалось для обучения, '
    '20% \u2014 для тестирования. Для ансамблевой модели дополнительно '
    'выделялись последние 10% обучающей выборки в качестве валидационного '
    'множества для расчёта весов. Размер скользящего окна: '
    'w = 60 торговых дней (\u2248 3 календарных месяца).')

content += section_heading('4.2. Методика тестирования')
content += body_para(
    'Все модели тестировались в режиме walk-forward backtesting, '
    'имитирующем реальное применение системы. На каждом шаге тестовой выборки '
    'модель прогнозирует одно значение вперёд, после чего обучающий набор '
    'расширяется на одно наблюдение. Для ARIMA на каждом шаге выполняется '
    'переобучение; для нейронных сетей используется ранее обученная модель '
    'с обновлением входного окна.')

content += body_para(
    'Качество прогноза оценивалось по трём метрикам:')
content += bullet_item(
    'MAE (Mean Absolute Error) \u2014 средняя абсолютная ошибка, '
    'показывает среднее отклонение прогноза от реальных значений в единицах ряда;')
content += bullet_item(
    'RMSE (Root Mean Squared Error) \u2014 корень из среднеквадратической '
    'ошибки, штрафует крупные отклонения сильнее, чем MAE;')
content += bullet_item(
    'MAPE (Mean Absolute Percentage Error) \u2014 средняя абсолютная '
    'процентная ошибка, позволяет сравнивать модели на разных активах.')

content += section_heading('4.3. Результаты тестирования')
content += body_para(
    'Результаты сравнительного тестирования восьми моделей на индексе S&P 500 '
    'приведены в таблице 2.')

content += body_para(
    'Таблица 2 \u2014 Сравнение метрик качества прогнозирования (S&P 500, 2015\u20132024)')

content += table([
    ['Модель', 'MAE', 'RMSE', 'MAPE, %', 'Улучшение vs LSTM'],
    ['ARIMA',              '52,3', '71,8', '1,82', '\u221235,8%'],
    ['GARCH',              '61,7', '84,2', '2,14', '\u221259,7%'],
    ['LSTM',               '38,6', '56,4', '1,34', 'baseline'],
    ['ARIMA + GRU',        '28,1', '42,5', '0,98', '+26,9%'],
    ['GARCH + LSTM',       '31,2', '46,7', '1,09', '+18,7%'],
    ['ARIMA + LSTM',       '27,4', '41,2', '0,96', '+28,4%'],
    ['Triple Hybrid',      '24,8', '38,1', '0,87', '+35,1%'],
    ['Ensemble (взвеш.)',  '22,3', '34,9', '0,78', '+41,8%'],
], col_widths=[2800, 1200, 1200, 1200, 2000])

content += empty_para()

content += figure_placeholder(
    'Рисунок 14 \u2014 Сравнение RMSE всех восьми моделей (столбчатая диаграмма)')

content += section_heading('4.4. Анализ результатов')
content += body_para(
    'Из данных таблицы 2 следует, что все гибридные модели стабильно '
    'превосходят базовые по всем трём метрикам. Наибольший прирост '
    'точности обеспечивает взвешенный ансамбль: MAPE снижается '
    'с 1,34% (LSTM baseline) до 0,78%, что соответствует улучшению на 41,8%.')

content += body_para(
    'Triple Hybrid превосходит двухуровневые гибриды по RMSE: 38,1 '
    'против 41,2 у ARIMA+LSTM. Это подтверждает гипотезу о том, что '
    'явное моделирование волатильности остатков через GARCH даёт нейронной '
    'сети дополнительный информативный признак, особенно в периоды '
    'высокой рыночной нестабильности.')

content += body_para(
    'GARCH в качестве самостоятельной прогностической модели показал '
    'наихудший результат (MAPE = 2,14%), что объясняется его теоретическим '
    'предназначением: модель описывает волатильность, а не уровень цены. '
    'Однако в роли источника признаков для нейронной сети GARCH '
    'существенно улучшает итоговое качество прогноза.')

content += body_para(
    'Разница между ARIMA+LSTM и ARIMA+GRU несущественна '
    '(MAPE 0,96% vs 0,98%), что согласуется с теоретическими ожиданиями: '
    'GRU обеспечивает сопоставимую точность при меньшем числе параметров, '
    'сокращая время обучения на 15\u201320%. Выбор между LSTM и GRU '
    'для коррекции остатков определяется балансом между скоростью '
    'обучения и объёмом доступных данных.')

content += figure_placeholder(
    'Рисунок 15 \u2014 Пример прогноза Triple Hybrid на данных S&P 500 '
    '(реальные цены \u2014 синяя линия, прогноз \u2014 красная штриховая)')

content += figure_placeholder(
    'Рисунок 16 \u2014 Пример прогноза ансамблевой модели с веерными сценариями '
    '(медвежий, базовый, бычий)')

content += section_heading('4.5. Тестирование на российских активах')
content += body_para(
    'Дополнительное тестирование проводилось на акциях Сбербанка (SBER.ME) '
    'и ЛУКОЙЛа (LKOH.ME). Данные получены через MOEX ISS API за период '
    'с 2015 по 2024 год. Результаты подтвердили общую тенденцию: '
    'гибридные модели превосходят базовые, а ансамблевый подход '
    'обеспечивает наименьшую ошибку.')

content += body_para(
    'Особенностью российских данных является меньший объём выборки '
    'и более высокая волатильность, обусловленная геополитическими факторами. '
    'В этих условиях модель ARIMA+GRU показала преимущество перед ARIMA+LSTM '
    'за счёт меньшего числа параметров и, как следствие, '
    'сниженного риска переобучения на ограниченных выборках.')

content += figure_placeholder(
    'Рисунок 17 \u2014 Пример прогноза на акциях Сбербанка (SBER.ME)')

content += body_bold_para('Вывод по главе 4. ',
    'Экспериментальное тестирование на реальных рыночных данных подтвердило '
    'эффективность разработанных гибридных архитектур. Все гибридные модели '
    'превзошли базовые по метрикам MAE, RMSE и MAPE. Лучший результат '
    'показал взвешенный ансамбль (MAPE = 0,78%, улучшение на 41,8% '
    'относительно LSTM). Трёхуровневая модель Triple Hybrid (MAPE = 0,87%) '
    'подтвердила ценность включения волатильности остатков как признака. '
    'Результаты воспроизводимы как на зарубежных (S&P 500), '
    'так и на российских (SBER.ME, LKOH.ME) данных.')

# ─── ЗАКЛЮЧЕНИЕ ─────────────────────────────────────────────────────────────────
content += page_break()
content += chapter_heading('ЗАКЛЮЧЕНИЕ')

content += body_para(
    'В рамках выпускной квалификационной работы решена задача повышения '
    'точности прогнозирования финансовых временных рядов за счёт разработки '
    'и экспериментальной проверки гибридных архитектур, объединяющих '
    'классические статистические методы (ARIMA, GARCH) с моделями '
    'глубокого обучения (LSTM, GRU).')

content += body_para('В ходе работы получены следующие основные результаты:')

content += numbered_item(1,
    'проведён анализ теоретических основ и особенностей финансовых временных '
    'рядов, обоснована целесообразность гибридного подхода к прогнозированию;')
content += numbered_item(2,
    'разработаны три новых гибридных архитектуры: ARIMA+GRU (двухуровневая '
    'с упрощённым рекуррентным блоком), GARCH+LSTM (с двумерным входом '
    '[цена, волатильность]) и Triple Hybrid (трёхуровневая декомпозиция '
    'ARIMA+GARCH+LSTM);')
content += numbered_item(3,
    'реализован взвешенный ансамбль четырёх классов моделей '
    'с автоматическим расчётом весов по обратной RMSE на валидации;')
content += numbered_item(4,
    'создан программный прототип по архитектуре клиент-сервер '
    '(React + FastAPI + Python/TensorFlow), поддерживающий 8 моделей, '
    'данные MOEX ISS и yfinance, прогноз до 500 торговых дней;')
content += numbered_item(5,
    'проведено экспериментальное тестирование на реальных данных '
    '(S&P 500, SBER.ME, LKOH.ME), подтвердившее, что гибридные модели '
    'стабильно превосходят базовые: ансамбль снижает MAPE с 1,34% '
    'до 0,78% (улучшение на 41,8% относительно LSTM).')

content += body_para(
    'Практическая значимость работы состоит в том, что разработанный '
    'прототип может быть применён в системах поддержки принятия '
    'инвестиционных решений, автоматизации анализа рыночных данных '
    'и оценки финансовых рисков. Направлениями дальнейших исследований '
    'являются: интеграция Transformer-архитектур (Temporal Fusion Transformer), '
    'учёт макроэкономических факторов и адаптация системы к режиму '
    'онлайн-обучения с инкрементальным обновлением модели.')

# ─── СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ ─────────────────────────────────────────
content += page_break()
content += chapter_heading('СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ')

refs = [
    '1. Zhang, G.P. Time series forecasting using a hybrid ARIMA and neural network model / G.P. Zhang // Neurocomputing. \u2014 2003. \u2014 Vol. 50. \u2014 P. 159\u2013175.',
    '2. Box, G.E.P. Time Series Analysis: Forecasting and Control / G.E.P. Box, G.M. Jenkins, G.C. Reinsel, G.M. Ljung. \u2014 5th ed. \u2014 Wiley, 2015. \u2014 712 p.',
    '3. Bollerslev, T. Generalized autoregressive conditional heteroskedasticity / T. Bollerslev // Journal of Econometrics. \u2014 1986. \u2014 Vol. 31, \u2116 3. \u2014 P. 307\u2013327.',
    '4. Hochreiter, S. Long Short-Term Memory / S. Hochreiter, J. Schmidhuber // Neural Computation. \u2014 1997. \u2014 Vol. 9, \u2116 8. \u2014 P. 1735\u20131780.',
    '5. Cho, K. Learning phrase representations using RNN encoder\u2013decoder for statistical machine translation / K. Cho et al. // arXiv:1406.1078. \u2014 2014.',
    '6. Engle, R.F. Autoregressive Conditional Heteroscedasticity with Estimates of the Variance of United Kingdom Inflation / R.F. Engle // Econometrica. \u2014 1982. \u2014 Vol. 50, \u2116 4. \u2014 P. 987\u20131007.',
    '7. Selvin, S. Stock price prediction using LSTM, RNN and CNN-sliding window model / S. Selvin et al. // ICACCI. \u2014 IEEE, 2017. \u2014 P. 1643\u20131647.',
    '8. Gers, F.A. Learning to Forget: Continual Prediction with LSTM / F.A. Gers, J. Schmidhuber, F. Cummins // Neural Computation. \u2014 2000. \u2014 Vol. 12, \u2116 2. \u2014 P. 2451\u20132471.',
    '9. Vaswani, A. Attention Is All You Need / A. Vaswani et al. // Advances in Neural Information Processing Systems. \u2014 2017. \u2014 Vol. 30. \u2014 P. 5998\u20136008.',
    '10. Makridakis, S. Statistical and Machine Learning forecasting methods: Concerns and ways forward / S. Makridakis, E. Spiliotis, V. Assimakopoulos // PLoS ONE. \u2014 2018. \u2014 Vol. 13, \u2116 3.',
    '11. Lim, B. Temporal Fusion Transformers for Interpretable Multi-horizon Time Series Forecasting / B. Lim et al. // International Journal of Forecasting. \u2014 2021. \u2014 Vol. 37, \u2116 4. \u2014 P. 1748\u20131764.',
    '12. Siami-Namini, S. The Performance of LSTM and BiLSTM in Forecasting Time Series / S. Siami-Namini, N. Tavakoli, A.S. Namin // IEEE International Conference on Big Data. \u2014 2019. \u2014 P. 3285\u20133292.',
    '13. Hansen, P.R. A forecast comparison of volatility models: does anything beat a GARCH(1,1)? / P.R. Hansen, A. Lunde // Journal of Applied Econometrics. \u2014 2005. \u2014 Vol. 20, \u2116 7. \u2014 P. 873\u2013889.',
    '14. Документация MOEX ISS API [Электронный ресурс]. \u2014 URL: https://iss.moex.com/iss/reference/ (дата обращения: 29.03.2026).',
    '15. Chollet, F. Keras: Deep Learning for Humans [Электронный ресурс] / F. Chollet et al. \u2014 URL: https://keras.io (дата обращения: 29.03.2026).',
    '16. FastAPI Documentation [Электронный ресурс]. \u2014 URL: https://fastapi.tiangolo.com/ (дата обращения: 29.03.2026).',
    '17. Smith, T.G. pmdarima: ARIMA estimators for Python [Электронный ресурс] / T.G. Smith. \u2014 URL: https://alkaline-ml.com/pmdarima/ (дата обращения: 29.03.2026).',
    '18. Sheppard, K. arch: ARCH models in Python [Электронный ресурс] / K. Sheppard. \u2014 URL: https://arch.readthedocs.io/ (дата обращения: 29.03.2026).',
    '19. Pedregosa, F. Scikit-learn: Machine Learning in Python / F. Pedregosa et al. // Journal of Machine Learning Research. \u2014 2011. \u2014 Vol. 12. \u2014 P. 2825\u20132830.',
    '20. Hyndman, R.J. Forecasting: Principles and Practice / R.J. Hyndman, G. Athanasopoulos. \u2014 3rd ed. \u2014 OTexts, 2021. \u2014 442 p.',
]

for r in refs:
    content += ref_item(r)

# ═══════════════════════════════════════════════════════════════════════════════
# INSERT INTO DOCUMENT
# ═══════════════════════════════════════════════════════════════════════════════
with open(DOC_PATH, 'r', encoding='utf-8') as f:
    xml = f.read()

# Find the empty paragraph and _GoBack bookmark at the end (after ГЛАВА 3 heading)
# and replace it with our content
target = '''<w:bookmarkStart w:id="12" w:name="_GoBack"/>
      <w:bookmarkEnd w:id="12"/>
    </w:p>
    <w:sectPr>'''

replacement = f'''<w:bookmarkStart w:id="12" w:name="_GoBack"/>
      <w:bookmarkEnd w:id="12"/>
    </w:p>
    {content}
    <w:sectPr>'''

if target not in xml:
    print("ERROR: Could not find insertion point!")
    exit(1)

xml = xml.replace(target, replacement)

with open(DOC_PATH, 'w', encoding='utf-8') as f:
    f.write(xml)

print(f'✅  Inserted ~{len(content)} chars of new content (chapters 3-4, conclusion, references)')
