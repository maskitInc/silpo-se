# СільпоSE — прототип

Вхід у продукт: **`/` → `index.html`** (не `design.html` — той лише токен-система / UI kit).

```bash
cd prototype
node test.mjs          # опційно
node server.mjs        # http://127.0.0.1:8766/
```

Увійти в MCP: [http://127.0.0.1:8766/auth/start](http://127.0.0.1:8766/auth/start) (OTP Сільпо → `.token.json` на диску, не в git).  
Або `SILPO_MCP_TOKEN` у env (див. `.env.example`).

Без токена: фікстури з `content/`; `GET /api/mcp/status` покаже `tokenOnServer: false`.

## API (сервер)

| Метод | Шлях | Примітка |
| --- | --- | --- |
| GET | `/api/mcp/status` | mode / tokenOnServer / login URL |
| GET | `/api/history` | MCP чеки або fixture |
| POST | `/api/resolve` | compose + shelf/MCP; write лише з `allowWrite` |
| POST | `/api/cart/push` | **долив** погоджених SKU у живий кошик (потрібен токен) |
| POST | `/api/browse` | каталог |
| POST | `/api/replacements` | заміни |
| POST | `/api/walk-map` | петля кроків |
| GET | `/auth/start` | OAuth PKCE |

## Модулі

| Шлях | Роль |
| --- | --- |
| `js/app.js` | Екрани, стан, Express «Погодити» → cart push |
| `js/mcp/w1.mjs` | Resolve + `pushCartProducts` (idempotent merge) |
| `js/mcp/normalize.js` | SKU / cart qty / merge plan |
| `js/mcp/oauth.mjs` | OAuth 2.1 |
| `js/composer.js` / `resolver.js` / `gate.js` | Intent → content → shelf → UI |
| `content/kb.json` | Програми / тарілки |
| `content/shelf.json` | Фікстура гілки + історія |
| `server.mjs` | HTTP + MCP adapter |

## Демо Express (журі)

```bash
node server.mjs   # інший термінал
./scripts/visual-express-control.sh   # потребує gstack browse + ffmpeg
# → visual-shots/21-jury-*.png + 21-jury-express-demo.mp4
```

Дизайн-лог: [DESIGN.md](DESIGN.md).
