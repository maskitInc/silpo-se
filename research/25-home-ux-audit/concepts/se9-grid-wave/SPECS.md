# SE9-grid wave — специфікації генерацій G1–G5

**Папка:** `research/25-home-ux-audit/concepts/se9-grid-wave/`  
**Дзеркало шотів:** `prototype/visual-shots/home-se9-grid-wave/`  
**Дата:** 2026-09-11  
**База конфігурації:** сітка SE9 — зверху 2 квадрати **Спорт | Експрес**, знизу картка **Деталі місяця** з графіком.

## Інваріанти (усі 5 кадрів)

| Елемент | Обовʼязково |
|---------|-------------|
| Layout | 2×1 grid квадратів зверху + wide chart card знизу |
| Спорт | Іконка спорту · назва **Спорт** · число **2/5** (заняття) · **міні-графік** у квадраті · CTA **Пігани** / **Пігнали** |
| Експрес | Іконка кошика · назва **Експрес** · ліміт **1 500 ₴** · залишок **453 ₴** · **міні-графік** у квадраті · CTA **Замовити** |
| Низ | Заголовок **Деталі місяця** · dual-line або area chart (заняття vs витрати) · місяці на осі |
| Мова | Українська |
| Заборона | Стіни тексту, «книжка», dual full-dashboard як у старому prod home, 3D, purple-glass AI soup |

**Формат чисел Експрес (фіксовано):**  
показати пару **1 500 ₴** (ліміт) / **453 ₴** (залишилось) — підпис на кшталт «залишилось з ліміту».

**Формат чисел Спорт (фіксовано):** **2/5** · підпис «занять».

---

## G1 — «Soft Super-app»

| | |
|--|--|
| **Відчуття** | Дружній consumer super-app (Diia / monobank calm), повітря, довіра |
| **Палітра** | Білий / світло-сірий `#F4F5F7`; Спорт mint `#34C759`; Експрес sky `#007AFF` |
| **Типографіка** | SF-like grotesk, medium weight, великі цифри 2/5 і 453 без serif |
| **Іконки** | Flat line 2px у tinted rounded-square |
| **Міні-графіки в квадратах** | Спорт: 5-dot stepper + tiny sparkline; Експрес: thin progress ring або bar 453/1500 |
| **Низ** | Біла картка, soft area chart, легенда крапками |
| **Тіні** | Дуже мʼякі, 8–12px blur |
| **Відмінність** | Найбільш «звично-банківський» / безпечний вигляд |

---

## G2 — «Editorial Night»

| | |
|--|--|
| **Відчуття** | Premium evening mode, тихий люкс, не gaming |
| **Палітра** | Фон `#0E1116`; картки `#1A1F27`; Спорт `#5EEAD4` (teal); Експрес `#93C5FD`; текст майже білий |
| **Типографіка** | Condensed grotesk для заголовків, tabular nums для 2/5 і 453 |
| **Іконки** | Duotone light-on-dark |
| **Міні-графіки** | Glow-thin sparklines (без неон-перебору); Експрес: дуга progress |
| **Низ** | Темна chart-карта, сітка hairline, dual lines teal/blue |
| **Тіні** | Майже немає — глибина через elevation fill |
| **Відмінність** | Єдиний dark high-end варіант хвилі |

---

## G3 — «Brutal Clear»

| | |
|--|--|
| **Відчуття** | Poster-clarity, нуль орнаменту, «сказав — зробив» |
| **Палітра** | Білий + чорний; Спорт акцент чорний блок; Експрес чорний outline; 1 signal red `#FF3B30` лише на залишку якщо low |
| **Типографіка** | Heavy grotesk, ALLCAPS мікро-лейбли ЗАЙНЯТТЯ / ЛІМІТ |
| **Іконки** | Solid black glyphs, square 0 radius або 4px |
| **Міні-графіки** | Спорт: 5 жорстких сегментів (2 filled); Експрес: block bar 453/1500 |
| **Низ** | Chart як step-line або bar, без градієнтів |
| **Кути** | 4–8px max |
| **Відмінність** | Анти-кліше rounded candy; максимальна читабельність цифр |

---

## G4 — «Glass Kinetic»

| | |
|--|--|
| **Відміння** | Сучасний 2026 kinetic UI: легка глибина, motion-ready shapes |
| **Палітра** | Меш-фон pastel lilac-mint (стримано, не purple soup); картки frosted white 80% blur; Спорт emerald; Експрес cobalt |
| **Типографіка** | Rounded sans, дружні цифри |
| **Іконки** | Soft filled icons у squircle |
| **Міні-графіки** | Animated-looking smooth bezier sparklines + floating % chips |
| **Низ** | Glass card, chart з soft fill і 1 highlight point на «Вер» |
| **Декор** | 1–2 blob shapes на фоні, не перекривати контент |
| **Відмінність** | Найбільш «fashion-tech / high-end Dribbble» відчуття |

---

## G5 — «Retail Precision»

| | |
|--|--|
| **Відчуття** | Grocery retail OS: чітко, швидко, як каса + фітнес-годинник |
| **Палітра** | Off-white `#F7F4EF`; чорний текст; Спорт leaf `#1B7A4A`; Експрес ink-blue `#1E3A5F` (не leaf-only monoculture) |
| **Типографіка** | Manrope-like UI + tabular money; 2/5 дуже велике |
| **Іконки** | Product-real: dumbbell + shopping bag з легким brand leaf mark |
| **Міні-графіки** | Спорт: mini calendar-week strip (2 active days); Експрес: ticket-style progress «453 з 1 500» |
| **Низ** | «Деталі місяця» як receipt-card з dual line + сума в куті |
| **Відмінність** | Найближче до реального Сільпо-контексту, але нова сітка SE9 |

---

## Матриця відмінностей (швидко)

| | G1 Soft | G2 Night | G3 Brutal | G4 Glass | G5 Retail |
|--|---------|----------|-----------|----------|-----------|
| Світло | light | dark | light | light+mesh | warm light |
| Кути | 20–28 | 16 | 4–8 | 24+ | 16–20 |
| Емоція | довіра | premium | сила | wow | utility |
| Chart vibe | soft area | HUD lines | bars/steps | kinetic bezier | receipt dual |

## Acceptance на генерацію

Кожен PNG:
1. Пізнається як SE9-grid (2 квадрати + низ)
2. Видно **2/5** і **453 / 1 500 ₴**
3. У кожному квадраті є **графік/візуал прогресу**, не лише текст
4. Стиль відповідає своїй специфікації вище (не клон сусіда)
