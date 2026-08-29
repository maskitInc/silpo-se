# СільпоSE

Демо-додаток для AI Factory: **СільпоSport** + **СільпоExpress** під одним брендом **СільпоSE**.

Мобільний web-прототип (без окремого npm-пакета застосунку). Живий каталог і кошик — через офіційний MCP Сільпо після OAuth; без токена — чесні фікстури.

## Спробувати онлайн

**https://silpo-se.vercel.app/** — публічне демо з **Live MCP** (OAuth Сільпо → cookie-сесія на Vercel).

1. Відкрий сайт → **Увійти** (або `/auth/start`)
2. OTP Сільпо → повернення на `silpo-se.vercel.app`
3. Express **Погодити** доливає в **твій** кошик Сільпо

Токен гостя в **httpOnly cookie** (не в git). На Vercel потрібні env: `PUBLIC_BASE_URL`, `SILPO_COOKIE_SECRET` (див. `.env.example`). Опційний `SILPO_MCP_TOKEN` — спільний демо-акаунт (краще не ставити на публічний URL).

## Швидкий старт (локально)

```bash
cd prototype
node server.mjs
# → http://127.0.0.1:8766/
# логін: http://127.0.0.1:8766/auth/start
```

Локально токен також пишеться в `.token.json` (gitignore).

Регресії: `cd prototype && node test.mjs`

### Деплой Vercel

```bash
cd prototype
npx vercel env add PUBLIC_BASE_URL production   # https://silpo-se.vercel.app
npx vercel env add SILPO_COOKIE_SECRET production
npx vercel --prod
```

`server.mjs` у `.vercelignore` (не entrypoint). Live API: `api/gateway.js` + rewrites на `/api/*` і `/auth/*`.

## Що всередині

| Екран | Що робить |
| --- | --- |
| **Home** | Два pulse: Sport → Express; CTA «Пігнали» / «Замовити» |
| **Sport** | Програми, сесія, тарілки дня, кроки |
| **Express** | Чеклист з чеків, гаманець-чек, qty ±, списки/бази, **Погодити → долив у живий кошик Сільпо** |

Після «Погодити» (з логіном): `POST /api/cart/push` — ідемпотентний merge (без подвоєння qty) + soft handoff на checkout-лінк.

## Документи

| Файл | Навіщо |
| --- | --- |
| [prototype/README.md](prototype/README.md) | Запуск, API, модулі |
| [prototype/DESIGN.md](prototype/DESIGN.md) | Дизайн-рішення (SSoT UI) |
| [PITCH.md](PITCH.md) | Скрипт показу ~90 с |
| [research/17-jury-recording-checklist.md](research/17-jury-recording-checklist.md) | Чеклист запису для журі |
| [research/05-composer-architecture.md](research/05-composer-architecture.md) | Composer × MCP × gate |
| [research/08-oauth-local.md](research/08-oauth-local.md) | Локальний OAuth |
| [research/22-sport-express-sync-contract.md](research/22-sport-express-sync-contract.md) | Контракт Sport↔Express |

Jury stills/mp4: `prototype/visual-shots/21-jury-*`.

## Безпека

Не комітьте `.token.json`, `.env`, `.oauth-client.json`. Вони в `.gitignore`.
