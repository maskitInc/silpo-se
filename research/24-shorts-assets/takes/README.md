# ADR takes drop zone

Put human recordings **here** (or pass an absolute path to remux).

Suggested path after copy:
```text
research/24-shorts-assets/takes/human-take.wav
```

## Expected
- Full ~**90s** take matching [`../vo-adr-cue.txt`](../vo-adr-cue.txt)
- Any of: `.wav` `.mp3` `.m4a` `.aiff` `.caf`

Suggested name after copy:
```text
human-take.wav
```

## Remux → M2
Watcher (preferred):
```bash
cd ../../prototype
./scripts/vo-tools/vo-takes-watch.sh --daemon
# drop human-take.wav here → auto m2-human-adr-90s.mp4
```

Manual:
```bash
cd ../../prototype
./scripts/vo-tools/vo-adr-remux.sh ../research/24-shorts-assets/takes/human-take.wav
# → visual-shots/shorts-90s/m2-human-adr-90s.mp4
```

## Timing (optional)
Booth guide (beeps, not ADR): [`../vo-adr-guide-90s.wav`](../vo-adr-guide-90s.wav) — rebuild via `prototype/scripts/vo-tools/vo-adr-guide.sh`.

## Not enough
- Machine `../vo-shorts-90s-ua.wav` (draft only)
- Short cuts (~60s) from older scripts — re-record against current cue

Booth checklist: [`../adr-booth.md`](../adr-booth.md)
