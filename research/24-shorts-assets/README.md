# Shorts 90s — assets (M0 captions + M1 VO)

Поруч зі сценарієм: [../24-shorts-90s-scenario.md](../24-shorts-90s-scenario.md).

| Файл | Роль |
|------|------|
| `takes/` | Drop zone for human ADR → auto-remux якщо `vo-takes-watch.sh --daemon` |
| `vo-script-plain-ua.txt` | Текст VO + маркери + ручні наголоси `+` (SSoT) |
| `vo-adr-cue.txt` | Booth script для human ADR (`+` знято) |
| `adr-booth.md` | Чекліст кабінки → loudnorm → QA → **M2** |
| `listen-card.md` | Субʼєктивний гейт + stop→ADR |
| `stress-preview.md` | Смужка наголосів (TTS / ADR) |
| `captions-silent-burnin.srt` | Burn-in для **M0 silent** |
| `captions-vo.srt` | Субтитри під VO (`vo-captions-export.py` з plain) |
| `vo-shorts-90s-ua.wav` / `.mp3` | Озвучка **≈90 с**, loudnorm −14 LUFS (machine draft) |
| `vo-engine.txt` | Провененс останнього machine білду (`plan_hash`) |

## Найлюдяніший free шлях

1. **Toolkit** `prototype/scripts/vo-tools/` — plan-check / stress / QA / listen-card / captions / ADR / build / A/B
2. **tts-uk mykyta** — draft ship voice у `auto` / `ttsuk` (lada superseded; StyleTTS2 rejected LRA)
3. Hard fail listen-card → **ADR** (`vo-adr-cue.txt` + `adr-booth.md`) → **`m2-human-adr-90s.mp4`**

```bash
cd prototype
python3 scripts/vo-tools/vo-plan-check.py
SHORTS_VO_ENGINE=ttsuk ./scripts/vo-tools/vo-build.sh
# listen-card.md (audio-only); hard fail → ADR:
./scripts/vo-tools/vo-takes-watch.sh --daemon
# drop research/24-shorts-assets/takes/human-take.wav
# → visual-shots/shorts-90s/m2-human-adr-90s.mp4
```

Captions: `captions-vo.srt` sync з plain (бан: метушні / —); gate у `vo-plan-check`.

## Mux

```bash
# Machine draft (M1) — also done by vo-build
ffmpeg -i visual-shots/shorts-90s/m0-silent-90s.mp4 -i ../research/24-shorts-assets/vo-shorts-90s-ua.wav \
  -c:v copy -c:a aac -t 90 visual-shots/shorts-90s/m1-machine-vo-90s.mp4

# Human ADR (M2)
./scripts/vo-tools/vo-adr-remux.sh /path/to/human-take.wav
```

## Status

```bash
cd prototype && ./scripts/vo-tools/vo-status.sh
```

## Research
- `vo-m1-research-2026-09-06.md` — M1 audit (audio F0/LRA + picture QA)
- `vo-m1-research-2026-09-06-evening.md` — evening re-audit (hook caption + LUFS)
