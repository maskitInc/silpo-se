# Isolate winners (autonomous — no human listen)

Plan hash (ship): see `../vo-engine.txt`  
Gate: `vo-artic-gate.py` → `../vo-artic-report.json`

## Decisions (locked by metrics + model limits)

| Defect | Winner | Evidence |
|--------|--------|----------|
| glue «складпаруч» | **B** (`Склад поруч.` own PLAN phrase + CLAUSE) | Comma≠pause (A≈B ms); text lock rejects `Склад поруч,` |
| stress «метУшні» | **E rewrite** — **remove «метушні» from ship** | D absolute late/early FAIL on Lada (same cluster as C/F); `+` advisory only |

Ship copy policy: **no `метушні`**; use «спокійно» / «без зайвих жестів».  
Fixtures C/D/F kept only to document TTS failure mode.

## Regenerated
```bash
cd prototype
../research/24-shorts-assets/.venv-tts-uk/bin/python scripts/vo-tools/vo-isolates.py
../research/24-shorts-assets/.venv-tts-uk/bin/python scripts/vo-tools/vo-artic-gate.py
```
