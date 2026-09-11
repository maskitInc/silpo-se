#!/usr/bin/env bash
# Build SilpoSE 90s VO — maximize free naturalness.
# Prefer: tts-uk (F0/energy) → local StyleTTS2 multi → HF Space → edge → say.
# Output: research/24-shorts-assets/vo-shorts-90s-ua.{wav,mp3}
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$(cd "$ROOT/../research/24-shorts-assets" && pwd)"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/shorts-vo.XXXXXX")"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

ENGINE="${SHORTS_VO_ENGINE:-auto}" # auto|ttsuk|local|styletts2|edge|say
LOCAL_BUILD="$ROOT/scripts/shorts-vo-local-styletts2.py"
TTSUK_BUILD="$ROOT/scripts/shorts-vo-tts-uk.py"
VENV_TTSUK="${SHORTS_VO_VENV_TTSUK:-$ASSETS/.venv-tts-uk}"
VOICE="${SHORTS_VO_VOICE:-uk-UA-PolinaNeural}"
STT2_VOICE="${SHORTS_VO_STT2_VOICE:-Марина Панас}"
STT2_SPEED="${SHORTS_VO_STT2_SPEED:-0.92}"
STT2_SPACE="${SHORTS_VO_STT2_SPACE:-patriotyk/styletts2-ukrainian}"
EDGE_RATE="${SHORTS_VO_EDGE_RATE:--12%}"
SAY_RATE="${SHORTS_VO_RATE:-160}"
GAP_MS="${SHORTS_VO_GAP_MS:-380}"
TAP_MS=400
VEIL_MS=700
TARGET_S=90
VENV_TTS="${SHORTS_VO_VENV:-$ASSETS/.venv-tts}"
EDGE_BIN=""
PY="python3"

need() { command -v "$1" >/dev/null || { echo "missing: $1" >&2; exit 1; }; }
need ffmpeg; need ffprobe; need python3

resolve_venv() {
  if [ -x "$VENV_TTS/bin/python" ]; then PY="$VENV_TTS/bin/python"; fi
  if [ -x "$VENV_TTS/bin/edge-tts" ]; then EDGE_BIN="$VENV_TTS/bin/edge-tts"
  elif command -v edge-tts >/dev/null 2>&1; then EDGE_BIN="$(command -v edge-tts)"; fi
}

ensure_venv_pkgs() {
  resolve_venv
  if [ ! -x "$VENV_TTS/bin/python" ]; then
    python3 -m venv "$VENV_TTS"
    PY="$VENV_TTS/bin/python"
  fi
  "$VENV_TTS/bin/pip" install -q edge-tts gradio_client
  resolve_venv
}

dur() { ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$1"; }

silence_ms() {
  local out="$1" ms="$2"
  # ffmpeg rejects 0-duration; floor 40ms
  local sec
  sec="$(python3 -c "print(max(0.04, int('$ms')/1000.0))")"
  ffmpeg -y -hide_banner -loglevel error -f lavfi -i "anullsrc=r=22050:cl=mono" -t "$sec" "$out"
}

concat_wavs() {
  local out="$1"; shift
  local list="$TMP/c_$(basename "$out" .wav).txt"
  : >"$list"
  for f in "$@"; do printf "file '%s'\n" "$f" >>"$list"; done
  ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$list" -c copy "$out"
}

# Leftover silence → mostly before speech (less “robot ends early” feel)
fit_soft() {
  local in="$1" out="$2" secs="$3"
  local d lead tail
  d="$(dur "$in")"
  read -r lead tail < <(python3 -c "
d=float('$d'); w=float('$secs'); rest=max(0.0,w-d)
lead=min(0.45, rest*0.55) if rest>0.15 else min(0.08, rest)
tail=min(1.0, max(0.0, rest-lead))
extra=max(0.0, rest-lead-tail); lead+=extra
print(f'{lead:.4f} {tail:.4f}')
")
  silence_ms "$TMP/_lead.wav" "$(python3 -c "print(int(float('$lead')*1000))")"
  silence_ms "$TMP/_tail.wav" "$(python3 -c "print(int(float('$tail')*1000))")"
  ffmpeg -y -hide_banner -loglevel error \
    -i "$TMP/_lead.wav" -i "$in" -i "$TMP/_tail.wav" \
    -filter_complex "[0][1][2]concat=n=3:v=0:a=1,apad=whole_dur=${secs},atrim=0:${secs},asetpts=PTS-STARTPTS[a]" \
    -map "[a]" -ar 22050 -ac 1 "$out"
}

edge_phrase() {
  local out="$1" text="$2" rate="$3" pitch="$4"
  local mp3="${out%.wav}.mp3"
  "$EDGE_BIN" --voice "$VOICE" --rate="${rate}" --pitch="${pitch}" --text "$text" --write-media "$mp3"
  ffmpeg -y -hide_banner -loglevel error -i "$mp3" -ar 22050 -ac 1 "$out"
}

stt2_phrase() {
  local out="$1" text="$2" speed="$3"
  STT2_SPACE="$STT2_SPACE" STT2_VOICE="$STT2_VOICE" STT2_MODEL="${SHORTS_VO_STT2_MODEL:-multi}" \
  "$PY" - "$text" "$speed" "$out" <<'PY'
import os, sys, shutil, time
from gradio_client import Client
from gradio_client.exceptions import AppError
text, speed, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
space = os.environ["STT2_SPACE"]
voice = os.environ["STT2_VOICE"]
model = os.environ.get("STT2_MODEL", "multi")
tok = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_HUB_TOKEN")
last_err = None
for attempt in range(2):
  try:
    c = Client(space, token=tok)
    try:
      text = c.predict(text, api_name="/verbalize") or text
    except Exception:
      pass
    if model == "single":
      path = c.predict("single", text, speed, api_name="/synthesize_1")
    else:
      path = c.predict("multi", text, speed, voice, api_name="/synthesize")
    shutil.copy(path, out)
    print(f"stt2 ok model={model} voice={voice!r}", flush=True)
    sys.exit(0)
  except AppError as e:
    last_err = e
    msg = str(e)
    if "quota" in msg.lower() or "ZeroGPU" in msg:
      if attempt == 0:
        print("stt2 quota; sleep 25s once", flush=True)
        time.sleep(25)
        continue
      break
    raise
  except Exception as e:
    last_err = e
    time.sleep(3)
    continue
print(f"stt2 FAIL: {last_err}", flush=True)
sys.exit(2)
PY
  local rc=$?
  if [ "$rc" -ne 0 ]; then return "$rc"; fi
  ffmpeg -y -hide_banner -loglevel error -i "$out" -ar 22050 -ac 1 "${out}.n.wav"
  mv "${out}.n.wav" "$out"
}

say_phrase() {
  local out="$1" text="$2"
  local aiff="${out%.wav}.aiff"
  say -v "${SHORTS_VO_SAY_VOICE:-Lesya}" -r "$SAY_RATE" -o "$aiff" "$text"
  ffmpeg -y -hide_banner -loglevel error -i "$aiff" -ar 22050 -ac 1 "$out"
}

synth_one() {
  local out="$1" text="$2" rate="$3" pitch="$4" st_speed="$5"
  case "$ENGINE" in
    styletts2)
      if [ "${STT2_DEAD:-0}" = "1" ]; then
        edge_phrase "$out" "$text" "$rate" "$pitch"
        return 0
      fi
      if ! stt2_phrase "$out" "$text" "$st_speed"; then
        echo "WARN: StyleTTS2 quota/dead → edge for rest of build" >&2
        STT2_DEAD=1
        export STT2_DEAD
        [ -n "$EDGE_BIN" ] || ensure_venv_pkgs
        edge_phrase "$out" "$text" "$rate" "$pitch"
      fi
      ;;
    edge) edge_phrase "$out" "$text" "$rate" "$pitch" ;;
    say) say_phrase "$out" "$text" ;;
    *) echo "bad engine=$ENGINE" >&2; exit 1 ;;
  esac
}

# StyleTTS2: one GPU call per bed (joined text). Edge: split phrases + gaps.
synth_bed() {
  local out="$1" secs="$2" rate="$3" pitch="$4" st_speed="$5"
  shift 5
  local phrases=("$@")
  if [ "$ENGINE" = "styletts2" ]; then
    local joined
    joined="$(printf '%s ' "${phrases[@]}")"
    joined="${joined% }"
    local p="$TMP/ph_$(basename "$out" .wav)_0.wav"
    synth_one "$p" "$joined" "$rate" "$pitch" "$st_speed"
    fit_soft "$p" "$out" "$secs"
    return 0
  fi
  local n=${#phrases[@]} i=0
  local files=()
  silence_ms "$TMP/gap.wav" "$GAP_MS"
  for ((i=0; i<n; i++)); do
    local p="$TMP/ph_$(basename "$out" .wav)_$i.wav"
    synth_one "$p" "${phrases[$i]}" "$rate" "$pitch" "$st_speed"
    files+=("$p")
    if (( i < n-1 )); then files+=("$TMP/gap.wav"); fi
  done
  local merged="$TMP/m_$(basename "$out")"
  concat_wavs "$merged" "${files[@]}"
  fit_soft "$merged" "$out" "$secs"
}

stt2_smoke() {
  ensure_venv_pkgs
  STT2_SPACE="$STT2_SPACE" STT2_VOICE="$STT2_VOICE" \
  "$PY" - <<'PY'
import os
from gradio_client import Client
tok = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_HUB_TOKEN")
c = Client(os.environ["STT2_SPACE"], token=tok)
c.predict("multi", "Тест.", 0.95, os.environ["STT2_VOICE"], api_name="/synthesize")
print("stt2 smoke ok")
PY
}

local_ready() {
  [ -f "$LOCAL_BUILD" ] || return 1
  [ -x "$VENV_TTS/bin/python" ] || return 1
  "$VENV_TTS/bin/python" -c "import styletts2_inference, soundfile, ipa_uk, ukrainian_word_stress" >/dev/null 2>&1
}

ttsuk_ready() {
  [ -f "$TTSUK_BUILD" ] || return 1
  [ -x "$VENV_TTSUK/bin/python" ] || return 1
  "$VENV_TTSUK/bin/python" -c "import tts_uk, soundfile" >/dev/null 2>&1
}

pick_engine() {
  if [ "$ENGINE" != "auto" ]; then return 0; fi
  # Prefer tts-uk (F0/energy) when venv present — less flat than StyleTTS2 frozen style.
  if ttsuk_ready; then
    ENGINE=ttsuk
    return 0
  fi
  if local_ready; then
    ENGINE=local
    return 0
  fi
  if stt2_smoke >/dev/null 2>&1; then
    ENGINE=styletts2
    return 0
  fi
  echo "WARN: tts-uk/StyleTTS2 unavailable — using phrased edge-tts" >&2
  ensure_venv_pkgs
  ENGINE=edge
}

resolve_venv
pick_engine
case "$ENGINE" in
  ttsuk)
    echo "VO engine=tts-uk → $ASSETS"
    exec "$VENV_TTSUK/bin/python" "$TTSUK_BUILD"
    ;;
  local)
    echo "VO engine=local StyleTTS2 UA → $ASSETS"
    export SHORTS_VO_PY="${SHORTS_VO_PY:-$VENV_TTS/bin/python}"
    exec "$SHORTS_VO_PY" "$LOCAL_BUILD"
    ;;
  styletts2) ensure_venv_pkgs ;;
  edge) ensure_venv_pkgs; [ -n "$EDGE_BIN" ] || { echo "edge-tts missing" >&2; exit 1; } ;;
  say) need say; VOICE="${SHORTS_VO_SAY_VOICE:-Lesya}" ;;
  *) echo "bad engine=$ENGINE" >&2; exit 1 ;;
esac

echo "VO engine=$ENGINE stt2_voice=$STT2_VOICE edge_voice=$VOICE → $ASSETS"

list="$TMP/concat.txt"; : >"$list"
append() { printf "file '%s'\n" "$1" >>"$list"; }
silence_ms "$TMP/tap.wav" "$TAP_MS"
silence_ms "$TMP/veil.wav" "$VEIL_MS"

# Cyrillic brands + short clauses (beats locked)
synth_bed "$TMP/w00.wav" 10 "-14%" "+0Hz" 0.90 \
  "У чаті радять, що на вечерю." \
  "Нам потрібен додаток життя — тренування і стеля на продукти."
append "$TMP/w00.wav"

synth_bed "$TMP/w10x.wav" 7.5 "-6%" "+2Hz" 0.93 \
  "Сільпо ес-і." \
  "Два ритуали: Спорт і Експрес."
concat_wavs "$TMP/w10m.wav" "$TMP/w10x.wav" "$TMP/tap.wav"
fit_soft "$TMP/w10m.wav" "$TMP/w10.wav" 8
append "$TMP/w10.wav"

synth_bed "$TMP/w18x.wav" 9.5 "-14%" "+0Hz" 0.90 \
  "Спорт показує ритм місяця — сесії і раціон." \
  "Без медичних обіцянок."
concat_wavs "$TMP/w18m.wav" "$TMP/w18x.wav" "$TMP/tap.wav"
fit_soft "$TMP/w18m.wav" "$TMP/w18.wav" 10
append "$TMP/w18.wav"

synth_bed "$TMP/w28x.wav" 13.5 "-10%" "+1Hz" 0.92 \
  "Пігнали: сесія на сьогодні." \
  "Страви з полиці — під програму."
concat_wavs "$TMP/w28m.wav" "$TMP/w28x.wav" "$TMP/tap.wav"
fit_soft "$TMP/w28m.wav" "$TMP/w28.wav" 14
append "$TMP/w28.wav"

synth_bed "$TMP/w42x.wav" 5.5 "-7%" "+2Hz" 0.94 \
  "Одним жестом — у Експрес." \
  "Це не список з нуля."
concat_wavs "$TMP/w42m.wav" "$TMP/w42x.wav" "$TMP/tap.wav"
fit_soft "$TMP/w42m.wav" "$TMP/w42.wav" 6
append "$TMP/w42.wav"

synth_bed "$TMP/w48x.wav" 9.5 "-12%" "+0Hz" 0.91 \
  "Експрес — витрати проти орієнтира." \
  "Торкни пік — видно, що вдарило по чеку."
concat_wavs "$TMP/w48m.wav" "$TMP/w48x.wav" "$TMP/tap.wav"
fit_soft "$TMP/w48m.wav" "$TMP/w48.wav" 10
append "$TMP/w48.wav"

synth_bed "$TMP/w58a.wav" 7.2 "-6%" "+3Hz" 0.95 "Підкрути кількість."
synth_bed "$TMP/w58b.wav" 8.2 "-12%" "+0Hz" 0.91 "Поки правиш — кошик Сільпо ще не чіпаємо."
concat_wavs "$TMP/w58m.wav" "$TMP/w58a.wav" "$TMP/tap.wav" "$TMP/w58b.wav"
fit_soft "$TMP/w58m.wav" "$TMP/w58.wav" 17
append "$TMP/w58.wav"

synth_bed "$TMP/w75a.wav" 7.2 "-10%" "+0Hz" 0.92 "Погодити — і лише тоді доливаємо в живий кошик."
synth_bed "$TMP/w75b.wav" 5.8 "-7%" "+1Hz" 0.94 "Оформлення — уже в Сільпо."
concat_wavs "$TMP/w75m.wav" "$TMP/w75a.wav" "$TMP/veil.wav" "$TMP/w75b.wav"
fit_soft "$TMP/w75m.wav" "$TMP/w75.wav" 15
append "$TMP/w75.wav"

ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$list" -c copy "$TMP/raw.wav"

ffmpeg -y -hide_banner -loglevel error -i "$TMP/raw.wav" \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" \
  -ar 48000 -ac 1 "$TMP/warm.wav"
ffmpeg -y -hide_banner -loglevel error -i "$TMP/warm.wav" \
  -af "apad=whole_dur=${TARGET_S},atrim=0:${TARGET_S},asetpts=PTS-STARTPTS" \
  -ar 48000 -ac 1 "$ASSETS/vo-shorts-90s-ua.wav"

ffmpeg -y -hide_banner -loglevel error -i "$ASSETS/vo-shorts-90s-ua.wav" \
  -codec:a libmp3lame -q:a 2 "$ASSETS/vo-shorts-90s-ua.mp3"

echo "OK duration=$(dur "$ASSETS/vo-shorts-90s-ua.wav")s engine=$ENGINE → $ASSETS/vo-shorts-90s-ua.{wav,mp3}"
if [ "$ENGINE" = "edge" ] || [ "$ENGINE" = "say" ]; then
  echo "TIP: local StyleTTS2 UA (no ZeroGPU) — after .venv-tts + model cache:"
  echo "  SHORTS_VO_ENGINE=local ./scripts/shorts-vo-say.sh"
fi
