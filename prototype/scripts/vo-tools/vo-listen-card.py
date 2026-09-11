#!/usr/bin/env python3
"""vo-listen-card — subjective scorecard + stop→ADR rule (manage expectations)."""
from __future__ import annotations

import argparse
import datetime as dt
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib_plan import assets_dir, plan_hash


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--engine-txt", type=Path, default=None)
    ap.add_argument("--out", type=Path, default=None)
    ap.add_argument(
        "--preserve",
        action="store_true",
        help="do not overwrite listen-card.md if it already exists (protect scored cards)",
    )
    args = ap.parse_args()
    eng = args.engine_txt or (assets_dir() / "vo-engine.txt")
    eng_body = eng.read_text(encoding="utf-8") if eng.exists() else "(missing vo-engine.txt)"
    out = args.out or (assets_dir() / "listen-card.md")
    if args.preserve and out.exists():
        # Keep scored rows; refresh hash + provenance only.
        import re

        body = out.read_text(encoding="utf-8")
        h = plan_hash()
        body = re.sub(
            r"(Plan hash:\s*`?)[a-f0-9]+(`?)",
            rf"\g<1>{h}\2",
            body,
            count=1,
        )
        body = re.sub(
            r"(## Provenance\n```\n)(.*?)(\n```)",
            rf"\1{eng_body.strip()}\3",
            body,
            count=1,
            flags=re.S,
        )
        out.write_text(body, encoding="utf-8")
        print(f"preserve: refreshed provenance → {out} hash={h}", flush=True)
        return 0
    md = f"""# VO listen card — SilpoSE 90s

Date: {dt.date.today().isoformat()}  
Plan hash: `{plan_hash()}`  

## Provenance
```
{eng_body.strip()}
```

## How to listen
1. **Audio only** first (no video) — headphones.
2. Then with `m0-silent-90s.mp4` picture (muted UI sounds).
3. Score each row 0/1. Fail any **hard** row → do not ship as final.

## Scorecard

| # | Check | Hard? | Pass? | Notes |
|---|--------|-------|-------|-------|
| 1 | Sounds like explaining to a friend, not slide deck | hard | ☐ | |
| 2 | Brands clear: Сільпо / Спорт / Експрес | hard | ☐ | |
| 3 | Stress OK on додаток, Погодити, Одним, життя | hard | ☐ | |
| 4 | TAP/VEIL pauses feel intentional, not dead air | soft | ☐ | |
| 5 | Pace OK (~not rushed / not drowsy) | soft | ☐ | |
| 6 | No garble / skip / double words | hard | ☐ | |

## Stop rule (manage expectations)
- After **≤2** free-engine passes (tts-uk / StyleTTS2) with hand-stress + QA gate, if any **hard** row still fails → **force human ADR**.
- Machine VO stays draft for muted demos / timing only.
- Do **not** start a third engine day — rewrite line or record.

## Winner / decision
- [ ] Keep machine VO as draft only
- [ ] Promote machine VO to external cut (rare)
- [ ] Schedule ADR (use `vo-adr-cue.txt` + `adr-booth.md`)

Listener: ___________  
"""
    out.write_text(md, encoding="utf-8")
    print(md)
    print(f"→ {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
