# СільпоSE — прототип

Вхід: **`/` → `index.html`**. Live MCP: локально (`node server.mjs`) або на Vercel (`api/gateway.js`).

```bash
cd prototype
node test.mjs          # опційно
node server.mjs        # http://127.0.0.1:8766/
```

Логін: `/auth/start` (OTP Сільпо). Локально → `.token.json`. На Vercel → httpOnly cookie (`SILPO_COOKIE_SECRET` + `PUBLIC_BASE_URL`).

Без токена: фікстури з `content/`.

## API

| Метод | Шлях | Примітка |
| --- | --- | --- |
| GET | `/api/mcp/status` | mode / tokenOnServer / login |
| GET | `/api/history` | MCP чеки або fixture |
| POST | `/api/resolve` | compose + shelf/MCP |
| POST | `/api/cart/push` | долив SKU у кошик (потрібен токен) |
| POST | `/api/browse` | каталог |
| POST | `/api/replacements` | заміни |
| POST | `/api/walk-map` | петля кроків |
| GET | `/auth/start` | OAuth PKCE |
| GET | `/auth/callback` | exchange + cookie/disk token |

Shared routes: `js/mcp/http-app.mjs`. Vercel entry: `api/gateway.js`.

## Модулі

| Шлях | Роль |
| --- | --- |
| `js/app.js` | Екрани, Express «Погодити» → cart push |
| `js/mcp/w1.mjs` | Resolve + pushCartProducts |
| `js/mcp/http-app.mjs` | API/auth для local + Vercel |
| `js/mcp/session-cookies.mjs` | Signed PKCE/token cookies |
| `content/kb.json` / `shelf.json` | Програми / фікстура |

Дизайн-лог: [DESIGN.md](DESIGN.md).
