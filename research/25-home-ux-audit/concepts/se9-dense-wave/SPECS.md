# SE9 dense wave — layout G4 без скла

**Папки:**  
`research/25-home-ux-audit/concepts/se9-dense-wave/`  
`prototype/visual-shots/home-se9-dense-wave/`

**Референс layout:** `shots/reference-layout-g4.png` (організація ідеальна; **стиль glass — заборонений**).

---

## 0. Дослідження → що реально показуємо

Джерела: `sport-pulse.js`, `spend.js`, `sport-loop-metrics.js`, `CAPABILITIES.md`, AUDIT.

### Спорт — прогрес-бар (не sparkline)

| Поле | Значення в макетах | Чесність |
|------|-------------------|----------|
| `sessionsDone` / `sessionGoal` | **2 / 5** | дні з сесією, не хвилини/кг |
| залишилось | **3** заняття | |
| програма | Військові · початковий | |
| UI | **горизонтальний progress bar** 40% fill + підпис «2 з 5 занять» | |

### Експрес — графік витрат з зонами

| Поле | Значення | Чесність |
|------|----------|----------|
| `goalUah` (ліміт/орієнтир) | **1 500 ₴** | м’який орієнтир, не банк |
| `spentUah` | **1 047 ₴** | |
| `leftUah` | **453 ₴** | «залишилось» |
| `weekPace` | ~**375 ₴**/тижд | goal/4 |
| Тижневі витрати (stub) | 180 · 290 · **410** · 167 | сума ≈1047 |

**Кодування графіка в квадраті Експрес:**
- стовпчики/лінія по тижнях;
- **зелена/нейтральна зона** = тиждень ≤ weekPace (в рамках);
- **коралова/amber зона або штрих** = тиждень > weekPace×1.08 (**зайві / понад темп**);
- підпис легенди: «в межах» / «понад темп».

### Деталі місяця — щільніше і з реальних даних

Обовʼязковий набір віджетів у нижній картці (не «порожні хвилі»):

1. **Dual chart:** заняття/тижд (зелений) + витрати ₴/тижд (синій)  
2. **Пунктир weekPace** на осі витрат + підпис «темп ~375 ₴»  
3. **Чіпи:** ↓/↑ MoM чеків · WoW · «19 дн. лишилось»  
4. **Орієнтир:** витрачено 1 047 / 1 500 · залишок 453  
5. **Топ «дороге»:** 2 SKU-псевдоніми (напр. «Лосось» · «Сир») як peak tips  
6. **Dual-gate рядок:** ☐/☑ сесія · ☐/☑ раціон у чеклисті  
7. **Програма:** Військові · початковий · 2 повні сесії  

**Не вигадувати:** холодильник, «з’їв» ккал, банківський блок, медпоради.

### Типографіка / анти-пустота

Кожна велика цифра → **одиниця + вторинний рядок**:  
`2/5` + «занять · лишилось 3»  
`453 ₴` + «з орієнтира 1 500 ₴ · витрачено 1 047»  
Мікро-kickers uppercase 11–12px · tabular nums · без «голого» іконочного квадрата без метрик.

---

## 1. Інваріанти layout (усі H1–H5)

```
[ Спорт квадрат ] [ Експрес квадрат ]
[     Деталі місяця (багата картка)   ]
```

- Спорт: іконка · назва · **2/5** · **progress bar** · Пігнали  
- Експрес: іконка · назва · **453 ₴** + **1 500** · **графік зон витрат** · Замовити  
- Низ: ≥4 інформаційні шари з §0  
- **Без glass / frost / blur cards**

---

## 2. П’ять стилів (різні відчуття)

### H1 — Paper Utility
- **Відчуття:** спокійний grocery OS, довіра, «можна користуватись завтра»  
- **Палітра:** `#F7F4EF` · leaf `#1B7A4A` · ink-blue `#1E3A5F` · over `#C45C26`  
- **Типо:** Manrope/SF · великі tabular 2/5 і 453  
- **Спорт bar:** leaf fill на paper track  
- **Експрес chart:** bars з leaf/within + terracotta over  
- **Низ:** hairline grid, чіпи як pills solid (не glass)

### H2 — Soft Super-app
- **Відчуття:** Diia/monobank · повітря але **щільні лейбли**  
- **Палітра:** `#F2F4F7` · mint `#30D158` · blue `#0A84FF` · warn `#FF9F0A`  
- **Типо:** rounded sans · metric kickers завжди visible  
- **Спорт:** thick rounded progress + «40%» chip  
- **Експрес:** mini column chart + legend dots  
- **Низ:** area+line, legend, MoM chip row

### H3 — Editorial Ink
- **Відчуття:** преміум print-digital, висококонтрастний light (не dark glass)  
- **Палітра:** white · black · signal green `#0F7B4B` · signal blue `#1D4ED8` · over `#B91C1C`  
- **Типо:** tight grotesk headlines · ALLCAPS kickers  
- **Спорт:** bar як 5 сегментів (2 filled) + fraction  
- **Експрес:** step chart with red hatch above pace  
- **Низ:** dense data table strip under chart (3 cols: заняття / ₴ / статус тижня)

### H4 — Night Instrument (solid, не glass)
- **Відчуття:** evening HUD · щільні прилади · **opaque** cards `#161B22` на `#0D1117`  
- **Палітра:** teal `#2DD4BF` · blue `#60A5FA` · over `#FB7185` · no blur  
- **Типо:** mono nums + grotesk labels  
- **Спорт:** progress bar teal  
- **Експрес:** line+band (within band shaded, spikes coral)  
- **Низ:** dual axis annotations, pace dashed line labeled

### H5 — Retail Ticket
- **Відчуття:** чек + фітнес-годинник · максимально «Сільпо» без leaf-cliché overload  
- **Палітра:** warm paper · black · green · navy · perforated card edges (flat CSS look)  
- **Типо:** receipt mono для ₴ · bold UI для 2/5  
- **Спорт:** ticket progress «■■□□□ 2/5»  
- **Експрес:** «стрічка витрат» з stamp OVER на W3  
- **Низ:** receipt list: топ SKU + dual-gate + MoM рядок

---

## 3. Acceptance

| Check | |
|-------|--|
| Layout = G4 grid | обовʼязково |
| No glass/frost/blur panels | обовʼязково |
| Sport = progress bar + 2/5 | обовʼязково |
| Express = spend chart with within vs over zones | обовʼязково |
| Monthly = multi-widget, readable data | обовʼязково |
| Typography not empty | kickers + units + secondary lines |
| Styles H1–H5 visibly distinct | обовʼязково |
