"""Search Pexels Videos for one clip per beat and download to disk."""
from __future__ import annotations

import argparse
import json
import os
import random
import sys
import time
from pathlib import Path

import requests

PEXELS_URL = "https://api.pexels.com/videos/search"


def search(query: str, orientation: str, per_page: int = 8) -> list[dict]:
    key = os.environ["PEXELS_API_KEY"]
    params = {"query": query, "per_page": per_page, "orientation": orientation, "size": "medium"}
    for attempt in range(3):
        r = requests.get(PEXELS_URL, headers={"Authorization": key}, params=params, timeout=30)
        if r.status_code == 429:
            wait = 60 * (attempt + 1)
            print(f"  rate-limited, waiting {wait}s", file=sys.stderr)
            time.sleep(wait)
            continue
        r.raise_for_status()
        return r.json().get("videos", [])
    return []


def pick_file(video: dict, orientation: str) -> dict | None:
    """Pick the closest-to-1080p HD file for the given orientation."""
    want_portrait = orientation == "portrait"
    candidates = [
        f for f in video.get("video_files", [])
        if f.get("file_type") == "video/mp4"
        and ((f["height"] > f["width"]) == want_portrait or f["width"] == f["height"])
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda f: abs((f.get("height") or 0) - 1080))
    return candidates[0]


def download(url: str, out: Path) -> None:
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(out, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 16):
                f.write(chunk)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--timings", required=True)
    p.add_argument("--title", required=True, help="Used for fallback search if a beat fails")
    p.add_argument("--aspect", default="9:16")
    p.add_argument("--out-dir", required=True)
    p.add_argument("--manifest-out", required=True)
    args = p.parse_args()

    orientation = "portrait" if args.aspect == "9:16" else ("square" if args.aspect == "1:1" else "landscape")
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    timings = json.loads(Path(args.timings).read_text())
    manifest = []
    used_ids: set[int] = set()

    for beat in timings:
        i = beat["beat_index"]
        query = beat["visual_query"]
        needed = beat["duration_s"]
        print(f"beat {i}: query='{query}' needs {needed:.1f}s")

        videos = search(query, orientation)
        if not videos:
            # Fallback: nouns from the title.
            fallback = " ".join(args.title.split()[:3])
            print(f"  no results — fallback search '{fallback}'", file=sys.stderr)
            videos = search(fallback, orientation)

        chosen = None
        for v in videos:
            if v["id"] in used_ids:
                continue
            if v.get("duration", 0) < max(2.0, needed * 0.6):
                continue
            f = pick_file(v, orientation)
            if f:
                chosen = (v, f)
                break

        if not chosen and videos:
            # Last resort: any clip even if shorter — we'll loop in compose.
            v = videos[0]
            f = pick_file(v, orientation)
            if f:
                chosen = (v, f)

        if not chosen:
            print(f"  FAILED to find any clip for beat {i}", file=sys.stderr)
            return 3

        v, f = chosen
        used_ids.add(v["id"])
        dest = out_dir / f"beat_{i:02d}.mp4"
        print(f"  downloading {v['id']} ({f['width']}x{f['height']}, {v['duration']}s)")
        download(f["link"], dest)
        manifest.append({
            "beat_index": i,
            "narration": beat["narration"],
            "start_s": beat["start_s"],
            "end_s": beat["end_s"],
            "duration_s": needed,
            "clip": str(dest),
            "clip_native_duration_s": v["duration"],
            "pexels_id": v["id"],
            "pexels_url": v.get("url"),
            "author": v.get("user", {}).get("name"),
        })
        time.sleep(0.5 + random.random())  # gentle pacing

    Path(args.manifest_out).write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(f"wrote {args.manifest_out} — {len(manifest)} clips")
    return 0


if __name__ == "__main__":
    sys.exit(main())
