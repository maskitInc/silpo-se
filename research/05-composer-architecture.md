# 05 — Архітектура: моделі × MCP × KB, безкоштовно і модульно

Мета власника: зміна моделі / MCP / CMS **не** валить продукт. У UI потрапляє лише корисне.

---

## 1. Принцип

```text
[UI Kit]  ←→  [Intent JSON]
                 ↓
        [Policy Gate]
           ↙        ↘
  [Content Composer]  [MCP Resolver]
           ↘        ↙
        [View Model]
                 ↓
             екран гостя
```

- **UI Kit** не знає, чи це Groq чи Claude.
- **Composer** не викликає MCP і не бачить токен.
- **Resolver** не генерує тренування.
- **Gate** відкидає поля поза схемою, PII, мед, сирі tool-payload.

Це і є «правила взаємодії». Не промпт на 12 сторінок у чаті.

---

## 2. Контракти (мінімум)

Імена орієнтирні; у коді — Zod/JSON Schema.

**Intent (з екрана):**

```json
{
  "surface": "sport | shopping | home | city",
  "goal": "string",
  "horizon": "day | week | month",
  "constraints": { "budgetUah": 0, "categoriesAllow": [], "level": "beginner" }
}
```

**ContentObject (з моделі):**

```json
{
  "type": "workout_program | day_meals | cart_variants | walk_loop",
  "title": "string",
  "blocks": [],
  "shopQueries": [{ "q": "грецький йогурт", "role": "breakfast" }],
  "disclaimer": "не медична порада"
}
```

**ResolveResult (з MCP, уже очищений):**

```json
{
  "lines": [{ "role": "breakfast", "name": "…", "status": "found | missing | replaced", "price": null }],
  "branchLabel": "string",
  "totals": { "min": 0, "max": 0 },
  "checkout": null
}
```

`checkout` заповнюється **тільки** після confirm і write. До того — `null`. Модель його не вигадує.

**View Model** = merge ContentObject (тексти вправ) + ResolveResult (полиця). UI вміє лише це.

---

## 3. Гейт: що не має показуватись

Завжди різати перед екраном:

- токени, JWT, raw JSON-RPC (у демо для журі — **окремий** debug-drawer, не головний екран);
- медичні твердження, дози БАДів, «у вас дефіцит»;
- ціна/наявність, яких не було в ResolveResult;
- чужі адреси, повний телефон з профілю (досить імені);
- алкоголь/тютюн, якщо конверт вимкнений;
- дитячі ПД (вік з `family` лише як бакет «6–12», не ПІБ);
- SKU, який модель вигадала без резолва.

Другий прохід (дешева модель або правила): «чи цей блок корисний гостю?» — інакше drop.

---

## 4. Адаптери (змінні шматки)

| Порт | Сьогодні (безкоштовно) | Завтра |
| --- | --- | --- |
| `LlmProvider` | Ollama локально; Groq / Gemini Flash безкоштовний ліміт; Claude через Cursor лише для нас | їхній асистент, якщо дадуть API |
| `KnowledgeProvider` | `content/programs/*.json` у репо (йога, розтяжка — наші тексти) | CMS Сільпо Хелс / shuba за договором |
| `WebProvider` | вимкнений за замовчуванням; allowlist доменів якщо ввімкнути | те саме |
| `McpProvider` | Streamable HTTP `https://mcp.silpo.ua/mcp`, OAuth на бекенді | той самий URL |
| `StepsProvider` | ручне число + таймер прогулянки | HealthKit |
| `MapProvider` | OSM + Leaflet | їхня карта магазинів, якщо відкриють |

Жоден порт не імпортується в React-компонент напряму — лише View Model.

Офіційні приклади клієнтів MCP: TypeScript SDK, Vercel AI SDK, Python — з [docs/mcp](https://ai-factory.silpo.ua/docs/mcp). Для хакатону один бекенд (Node або Python) тримає токен.

---

## 5. Безкоштовний пакувальний стек (демо 14 днів)

- UI: Vite + React (або статичний HTML kit) — $0.
- Хостинг: Vercel / Cloudflare Pages hobby — $0.
- LLM: Ollama **або** Gemini/Groq free — $0 (ліміт).
- Карта: OSM — $0.
- Схеми: Ajv / Zod — $0.
- Месенджер: Telegram Bot API — $0, якщо канал не PWA.
- MCP: офіційний, без оплати участі.

Не обов’язкові: плачені vision API (для Sport не потрібні), нативні стори App Store.

Модульність: кожен продукт = `surface` + набір блоків kit. СільпоSport і СільпоShopping — два `surface` на спільному Gate/Resolver.

---

## 6. Агентний цикл (щоб закрити «агентність»)

Не чат. Цикл екрана:

1. Гість крутить колесо / ставить ₴.
2. Composer будує ContentObject.
3. Gate.
4. Resolver: BOOTSTRAP → пошук запитів → (опційно) details vs restrictions → таблиця found/missing.
5. Гість міняє рядок / прибирає / обирає варіант B.
6. Confirm → ✎ add/remove/update.
7. Cart get → лінк або «забрати завтра о 8».

Журі бачить кроки 4 і 6 у debug або в записі. Гість бачить 1, 5, 7.

Rate-limit 429: не штормити 30 гілок. Sport-маршрут = 1–3 піни, які гість обрав або «найближчі з list_branches», послідовно.

---

## 7. Правила для моделей (короткий статут)

1. Мова відповіді — лише JSON схеми. Проза поза полями = drop.
2. `shopQueries` — людські назви, не вигадані barcode.
3. Вправи — без обладнання, якого немає в запиті; зал vs дім = поле Intent.
4. Бюджетні варіанти: не більше N рядків; алкоголь окремим конвертом.
5. Якщо Composer хоче «факт Сільпо» — він ставить query, не число.
6. Заборонені теми: діагноз, зброя, обхід віку для тютюну/алкоголю.

Дві моделі краще однієї: дешева перевіряє схему, дорожча (або та сама з іншим промптом) не потрібна, якщо JSON валідний.
