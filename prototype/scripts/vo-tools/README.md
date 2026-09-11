# VO tools — SilpoSE 90s voice lab

Мета: **керувати сподіваннями** і покращувати результат через QC, а не нескінченну зміну TTS.

SSoT тексту: `../../research/24-shorts-assets/vo-script-plain-ua.txt`  
Правило наголосу: `+` **після** наголошеної голосної.

## Паузи / фрази (tts-uk)
- **Органічність:** friend breath (~8–16 слів / phrase, ~2 phrases / bed), не mosaic слоганів.
- **Реальна** пауза = окремий рядок у PLAN → `CLAUSE` (~0.20s). Крапка слабка; кома ≠ пауза.
- `— : ; …` tts-uk **викидає** → злипання.
- `tap_after:N` / `veil_after:N` — UI-маркер після phrase index N.
- **Knobs:** жива варіація = `sigma_f0` / `sigma_energy` / `sigma_token_duration`.  
  `f0_std` / `energy_std` майже **NO-OP**, поки `f0_mean=0` (не крутити їх «на удачу»).

## Інструменти

| CLI | Навіщо |
|-----|--------|
| `vo-plan-check.py` | SSoT drift: plan vs builders, windows=90, stress coverage |
| `vo-stress-preview.py` | Таблиця наголосів (+ optional `--ipa`) |
| `vo-qa-gate.py` | Duration / LUFS / true peak / silence gaps |
| `vo-listen-card.py` | Субʼєктивний чеклист + **stop→ADR** |
| `vo-adr-export.py` | Cue sheet для людського ADR |
| `vo-captions-export.py` | `captions-vo.srt` з plain SSoT (бан: метушні / —) |
| `vo-artic-gate.py` | Auto glue/stress on `isolates/` (librosa; `.venv-tts-uk`) |
| `vo-takes-watch.sh` | Auto-remux M2 (`--daemon` на macOS/agent) |
| `vo-status.sh` | Green/red kit readiness (no synth) |
| `vo-isolates.py` | P0 ear lock: short glue/stress A/B clips → `isolates/` |
| `vo-adr-guide.sh` | Booth timing: bed-start beeps (+ optional ducked machine) → `vo-adr-guide-90s.wav` |
| `vo-adr-remux.sh` | Human take → loudnorm → QA → **M2** (не чіпає M1) |
| `vo-build.sh` | plan-check → synth → qa → card → remux M1 |
| `vo-ab.sh [A] [B]` | Два стеми + blind `ab-listen-order.txt` |

## Типовий цикл

```bash
cd prototype

# 1) перевірити скрипт
python3 scripts/vo-tools/vo-plan-check.py

# 2) зібрати з гейтами (ttsuk|local|auto)
SHORTS_VO_ENGINE=ttsuk ./scripts/vo-tools/vo-build.sh

# 3) слухати audio-only → заповнити listen-card.md
# 4) hard fail → читати vo-adr-cue.txt у кабінці

# A/B без упередження
./scripts/vo-tools/vo-ab.sh ttsuk local
# потім відкрий research/24-shorts-assets/ab-listen-order.txt
```

## Stop rule
Після ≤2 free-engine проходів з hand-stress + QA, якщо hard rows у listen-card падають → **ADR**, не третій движок.

## Human ADR ship
1. Booth: [`research/24-shorts-assets/adr-booth.md`](../../../research/24-shorts-assets/adr-booth.md) + `vo-adr-cue.txt`
2. Record → `./scripts/vo-tools/vo-adr-remux.sh /path/to/human-take.wav` → **`m2-human-adr-90s.mp4`** (M1 draft kept)
3. Re-score listen-card на human take; `captions-vo.srt` sync via `vo-captions-export.py` (у `vo-build`)

## Free ceiling
tts-uk / StyleTTS2 = draft / timing. Зовнішній cut / бренд — human ADR.
