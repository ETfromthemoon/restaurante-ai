"""Transcribe the rendered narration to produce a precisely-timed SRT.

Uses faster-whisper with word timestamps, then groups words into cues of
<= MAX_WORDS / MAX_CHARS / MAX_SEC for readability.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

MAX_WORDS = 7
MAX_CHARS = 42
MAX_SEC = 2.8


def fmt_ts(t: float) -> str:
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    ms = int((t - int(t)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def group_words(words: list[dict]) -> list[dict]:
    cues, cur, cur_chars = [], [], 0
    for w in words:
        token = w["word"].strip()
        if not token:
            continue
        new_chars = cur_chars + len(token) + (1 if cur else 0)
        new_span = (w["end"] - cur[0]["start"]) if cur else 0
        if cur and (len(cur) >= MAX_WORDS or new_chars > MAX_CHARS or new_span > MAX_SEC):
            cues.append({"start": cur[0]["start"], "end": cur[-1]["end"],
                         "text": " ".join(x["word"].strip() for x in cur)})
            cur, cur_chars = [w], len(token)
        else:
            cur.append(w)
            cur_chars = new_chars
    if cur:
        cues.append({"start": cur[0]["start"], "end": cur[-1]["end"],
                     "text": " ".join(x["word"].strip() for x in cur)})
    return cues


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--audio", required=True)
    p.add_argument("--language", default="es")
    p.add_argument("--model", default="small")
    p.add_argument("--out", required=True, help="SRT output path")
    args = p.parse_args()

    from faster_whisper import WhisperModel
    model = WhisperModel(args.model, compute_type="int8")
    segments, _ = model.transcribe(
        args.audio,
        language=args.language,
        word_timestamps=True,
        vad_filter=True,
    )
    words: list[dict] = []
    for seg in segments:
        for w in (seg.words or []):
            words.append({"word": w.word, "start": w.start, "end": w.end})

    cues = group_words(words)
    lines = []
    for i, c in enumerate(cues, 1):
        lines.append(str(i))
        lines.append(f"{fmt_ts(c['start'])} --> {fmt_ts(c['end'])}")
        lines.append(c["text"])
        lines.append("")
    Path(args.out).write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {args.out} — {len(cues)} cues")
    return 0


if __name__ == "__main__":
    sys.exit(main())
