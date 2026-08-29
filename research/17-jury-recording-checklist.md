# Запис відео для журі (чеклист)

Дедлайн: 3–5 хв. Скрипт голосу: [PITCH.md](../PITCH.md).  
Авто-скелет stills: `prototype/visual-shots/21-jury-express-demo.mp4`. Hard refresh за `?v=` у `prototype/index.html`.

## Підготовка (2 хв)

1. `cd prototype && node server.mjs` → http://127.0.0.1:8766/
2. Опційно: `/auth/start` (OTP) — тоді home покаже **живі** чеки через `GET /api/history`
3. Chrome / Safari, viewport ~390×844 або iPhone
4. Hard refresh з актуальним `?v=` з `index.html`
5. Якщо орієнтир «дикий» — ✎ на chip орієнтира один раз

## Дубль A — повний (рекомендовано, ~3.5 хв)

| Час | Екран | Що сказати / показати |
| --- | --- | --- |
| 0:00–0:12 | Home | Проблема: потрібен додаток життя, не чат · бренд **СільпоSE** |
| 0:12–0:40 | Home | Спочатку **Sport** pulse → нижче **Express** pulse |
| 0:40–0:55 | Sport | Колесо → день → тарілки (опційно коротко) |
| 0:55–1:50 | Express | qty ± → Списки → База+ → **Погодити** → долив у кошик Сільпо (з логіном) |
| 1:50–2:15 | Jury debug | токен на сервері (розкрити «для журі») |
| 2:15–2:30 | — | Масштаб: той самий Gate, новий `surface` |

## Дубль B — Express only (~90 с)

Відкрити авто-скелет: `visual-shots/21-jury-express-demo.mp4` **або** live path з PITCH §Jury.

Наговорити поверх: pulse ribbon → tip з датою → тиждень → маячок → ± → чек/база → Погодити.

## Replay без камери

```bash
cd prototype
node server.mjs          # термінал 1
./scripts/visual-express-control.sh   # shots + mp4 (~26 с stills)
```

## Не показувати

- Токен / `.token.json` / raw MCP dump без toggle
- Envelope chips revival
- Порівняння з банком / АТБ
- «Закінчилось» / «помилка» як факт (тільки soft орієнтири)
