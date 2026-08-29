# СільпоSE

Демо-додаток для AI Factory: **СільпоSport** + **СільпоExpress** під одним брендом **СільпоSE**.

Мобільний web-прототип (без окремого npm-пакета застосунку). Живий каталог і кошик — через офіційний MCP Сільпо після OAuth; без токена — чесні фікстури.

## Швидкий старт

```bash
cd prototype
node server.mjs
# → http://127.0.0.1:8766/
# логін MCP: http://127.0.0.1:8766/auth/start
```

Опційно: `SILPO_MCP_TOKEN=…` у середовищі (див. `prototype/.env.example`). Токен лишається на сервері, не у браузері.

Регресії: `cd prototype && node test.mjs`

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
