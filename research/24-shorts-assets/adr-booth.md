# ADR booth — SilpoSE shorts 90s

Human voice replaces machine draft. **Do not start a third TTS engine.**

## SSoT (read only these)

| File | Use |
|------|-----|
| `vo-script-plain-ua.txt` | Canonical text + `+` stress (for prep) |
| `vo-adr-cue.txt` | **Booth script** (`+` stripped, `[TAP]`/`[VEIL]` kept) |
| `stress-preview.md` | Stress strip (TTS line with `+`, ADR without) |
| `captions-vo.srt` | Post captions — must match organic VO (no chat-hook) |

Plan hash gate: **`4a68931f7988`** (must match cue header + `vo-engine.txt` / plain).

Picture bed / practice: pulse = **минулий місяць** (`?v=ds571&month=prev`). M0/M1 already on серпень.

Machine WAV (`vo-shorts-90s-ua.wav`) = **draft only** — prefer the beep guide below for booth timing (do not shadow TTS wording).

## Bed map

| TC | Window | Mid marker | Tight? |
|----|--------|------------|--------|
| 0:00 | 10s | — | |
| 0:10 | 8s | end `[TAP]` | tight |
| 0:18 | 10s | end `[TAP]` | |
| 0:28 | 14s | end `[TAP]` | |
| 0:42 | 6s | end `[TAP]` | **tightest** |
| 0:48 | 10s | end `[TAP]` | |
| 0:58 | 17s | mid `[TAP]` after «правка» | |
| 0:75 | 15s | mid `[VEIL]` after «сюрпризів» | |

Markers: **`[TAP]=0.28s`**, **`[VEIL]=0.42s`** — pause, don’t say the word.

## Stress heroes (say correctly)

дода́ток · життя́ · Погоди́ти · Одни́м · програ́му · раціо́н · Сі́льпо · Експре́с · Пігна́ли · контро́ль

Avoid in ship VO (tts-uk stress unreliable): **метушні** → say «спокійно» / «без зайвих жестів».

Brands clear: **Сільпо / Спорт / Експрес**.

## Booth steps

1. Print or open **`vo-adr-cue.txt` only** (ignore scenario §3 VO cells — they are obsolete).
2. Timing bed: play **`vo-adr-guide-90s.wav`** (beeps at each bed start; optional ducked machine). Rebuild:
   ```bash
   cd silpo-ai-projects/life-apps/prototype
   ./scripts/vo-tools/vo-adr-guide.sh          # WAV
   VO_GUIDE_MUX=1 ./scripts/vo-tools/vo-adr-guide.sh   # + m0-guide-practice-90s.mp4
   ```
   Headphones on guide; picture = muted M0 or the practice mux. `VO_GUIDE_NO_MACHINE=1` = beeps only.
3. Record full 90s **or** bed-by-bed; fill each window (avoid ≥3s dead air). Drop take in `takes/` → remux below.
4. Tone: explain to a friend — not slide deck.

## After take → ship M2

```bash
cd silpo-ai-projects/life-apps/prototype

# One-shot: loudnorm → qa-gate → m2-human-adr-90s.mp4 (M1 untouched)
./scripts/vo-tools/vo-adr-remux.sh /path/to/human-take.wav

# Optional: also promote stem to vo-shorts-90s-ua.wav (keeps .bak)
VO_ADR_PROMOTE=1 ./scripts/vo-tools/vo-adr-remux.sh /path/to/human-take.wav
```

Manual equivalent (if you prefer):

```bash
ffmpeg -y -i /path/to/human-take.wav \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 -ac 1 \
  ../research/24-shorts-assets/vo-shorts-90s-ua-adr.wav

python3 scripts/vo-tools/vo-qa-gate.py \
  --wav ../research/24-shorts-assets/vo-shorts-90s-ua-adr.wav

ffmpeg -y -i visual-shots/shorts-90s/m0-silent-90s.mp4 \
  -i ../research/24-shorts-assets/vo-shorts-90s-ua-adr.wav \
  -c:v copy -c:a aac -t 90 \
  visual-shots/shorts-90s/m2-human-adr-90s.mp4
```

5. Re-score **`listen-card.md`** hard rows on human take.  
6. Tick scenario §7 ADR when hard rows pass + captions match.

## Regenerate cue / stress (after plain edits only)

```bash
cd prototype
python3 scripts/vo-tools/vo-adr-export.py
python3 scripts/vo-tools/vo-stress-preview.py
python3 scripts/vo-tools/vo-captions-export.py
```

Do **not** re-run `vo-listen-card.py` without `--preserve` after scoring — full rewrite wipes the card (`--preserve` refreshes provenance only).
