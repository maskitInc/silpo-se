# 07 — Живий MCP: що перевірили без логіна гостя

**Дата:** 19 серпня 2026.  
**Не робилось:** OAuth гостя, Dynamic Client Registration з секретом у git, `tools/list`, write кошика, токен у фронті.

Пробні **GET** на публічні URL з [docs/mcp](https://ai-factory.silpo.ua/docs/mcp) (як клієнт після 401). Це не обхід авторизації.

---

## Результат проби

| URL | HTTP | Що це означає |
| --- | --- | --- |
| `https://mcp.silpo.ua/mcp` | **401** `invalid_token` | Сервер живий. Без Bearer tool-call неможливий. `WWW-Authenticate`: realm OAuth, `resource_metadata=https://mcp.silpo.ua/.well-known/oauth-protected-resource/mcp` |
| `https://mcp.silpo.ua/.well-known/oauth-authorization-server` | **200** | `authorization_endpoint` `/authorize`, `token_endpoint` `/token`, `registration_endpoint` `/register`, PKCE `S256` (+ `plain`), grants `authorization_code` + `refresh_token` |
| `https://mcp.silpo.ua/.well-known/oauth-protected-resource` | **200** | resource `https://mcp.silpo.ua`, bearer **лише header** |
| `.../oauth-protected-resource/mcp` | **200** | resource саме `https://mcp.silpo.ua/mcp` |
| `.../openid-configuration` | **404** | Не OIDC discovery; лише OAuth AS metadata |

Висновок для прототипу: **ітерація 8 частково закрита інфраструктурою**. Повний tool-call блокує відсутність гостьового логіна в цьому середовищі (немає MCP у Cursor, немає `SILPO_MCP_TOKEN`).

---

## Контракт адаптера (зроблено в `prototype/`)

```text
браузер  →  POST /api/resolve (немає токена в JS)
               ↓
         Node server.mjs
               ↓
     SILPO_MCP_TOKEN?  ─ні─→ фікстура shelf.json + trace «які tools були б»
                           ─так─→ initialize → tools/list → W1 BOOTSTRAP → find_products_batch
```

Токен **не** віддається в JSON статусу. Фронт бачить лише `mode: fixture | mcp` і HTTP 401 проби.

Наступний крок людини: увійти в Сільпо через офіційний MCP-клієнт (Cursor / Claude) **або** покласти refresh/access у env локально (не комітити) і перезапустити `node server.mjs`.
