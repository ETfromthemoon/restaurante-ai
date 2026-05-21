"""Generate a structured B-Roll narration script from a single title/idea."""
from __future__ import annotations

import argparse
import json
import os
import sys

from anthropic import Anthropic

MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6")

SYSTEM = """You write tight, cinematic B-Roll narration scripts.

You return ONLY valid JSON, no prose, matching this schema:
{
  "title": str,
  "language": "es" | "en",
  "total_s": int,
  "beats": [
    {
      "narration": str,        // 1-2 sentences, spoken naturally
      "visual_query": str,     // 2-5 English keywords for Pexels stock search
      "duration_s": int        // seconds this beat should occupy
    }
  ]
}

Rules:
- Beats sum to total_s (±2s).
- 5-8 beats for 60s, scaled proportionally for other durations.
- Word count per beat: language=="es" → ~2.4 words/sec; "en" → ~2.7 words/sec.
- visual_query must be ENGLISH even if narration is Spanish — Pexels searches better in English.
- visual_query is concrete and shootable: "city skyline at dusk", "hands typing on laptop", "ocean waves slow motion". Avoid abstractions like "success" or "innovation".
- Open with a hook beat. Close with a memorable line, not "thanks for watching".
- No emojis, no stage directions, no music cues.
"""

USER_TEMPLATE = """Title/concept: {title}
Target duration: {duration_s} seconds
Language: {language}
{style_block}
Produce the JSON now."""


def build_user_msg(title: str, duration_s: int, language: str, style: str | None) -> str:
    style_block = f"Style/tone notes: {style}\n" if style else ""
    return USER_TEMPLATE.format(
        title=title, duration_s=duration_s, language=language, style_block=style_block
    )


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--title", required=True)
    p.add_argument("--duration", type=int, default=60)
    p.add_argument("--language", default="es", choices=["es", "en"])
    p.add_argument("--style", default=None)
    p.add_argument("--out", required=True, help="Path to write script.json")
    args = p.parse_args()

    client = Anthropic()
    msg = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=SYSTEM,
        messages=[
            {"role": "user", "content": build_user_msg(args.title, args.duration, args.language, args.style)}
        ],
    )

    raw = msg.content[0].text.strip()
    # Tolerate accidental code fences.
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"Model returned invalid JSON: {e}\n---\n{raw}", file=sys.stderr)
        return 2

    # Sanity check + normalize.
    if not data.get("beats"):
        print("No beats in script", file=sys.stderr)
        return 2
    data.setdefault("title", args.title)
    data.setdefault("language", args.language)
    data["total_s"] = sum(b["duration_s"] for b in data["beats"])

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"wrote {args.out} — {len(data['beats'])} beats, {data['total_s']}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
