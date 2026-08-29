# 08 — OAuth 2.1 + PKCE у локальному прототипі

**Дата:** 19 серпня 2026.

DCR на `POST https://mcp.silpo.ua/register` з публічного клієнта (`token_endpoint_auth_method: none`, redirect `http://127.0.0.1:8766/auth/callback`) повернув **201** і `client_id` без `client_secret`. Це той самий Dynamic Client Registration, що в [docs/mcp](https://ai-factory.silpo.ua/docs/mcp).

Локальний потік:

1. Гість відкриває `/auth/start` (кнопка в UI).
2. Сервер реєструє клієнта, рахує PKCE S256, 302 на `/authorize` з `resource=https://mcp.silpo.ua/mcp`.
3. Логін на `auth.silpo.ua` (телефон + OTP) — **тільки людина**.
4. Callback → `POST /token` → `.token.json` (gitignore).
5. `initialize` + `tools/list` → `content/tools-list.public.json` (лише імена tools, без токена).

Write кошика з UI за замовчуванням **вимкнений**, поки `allowWrite` не true.

Не комітити `.token.json`.
