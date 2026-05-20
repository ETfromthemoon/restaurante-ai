"""End-to-end orchestrator: title → finished MP4 on Drive.

Each stage writes to <workdir>/<stage>.<ext> and a stamp file so
`--resume <workdir>` can pick up where a failure left off.
"""
from __future__ import annotations

import argparse
import datetime as dt
import os
import subprocess
import sys
from pathlib import Path

try:
    from slugify import slugify
except ImportError:
    def slugify(s: str) -> str:  # minimal fallback
        return "".join(c if c.isalnum() else "-" for c in s.lower()).strip("-")[:60]

SCRIPT_DIR = Path(__file__).resolve().parent

STAGES = ["script", "tts", "broll", "subs", "compose", "upload"]


def stamp(workdir: Path, stage: str) -> Path:
    return workdir / f".done.{stage}"


def done(workdir: Path, stage: str) -> bool:
    return stamp(workdir, stage).exists()


def mark(workdir: Path, stage: str) -> None:
    stamp(workdir, stage).touch()


def run(cmd: list[str]) -> None:
    print(f"\n>>> {' '.join(cmd)}", flush=True)
    subprocess.run(cmd, check=True)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--title", help="Required unless --resume")
    p.add_argument("--duration", type=int, default=60)
    p.add_argument("--language", default="es", choices=["es", "en"])
    p.add_argument("--aspect", default="9:16", choices=["9:16", "16:9", "1:1"])
    p.add_argument("--voice", default=None)
    p.add_argument("--style", default=None)
    p.add_argument("--music", default=None)
    p.add_argument("--drive-folder", default="BRoll/")
    p.add_argument("--no-upload", action="store_true")
    p.add_argument("--out", default="out/", help="Parent dir for workdirs")
    p.add_argument("--resume", help="Path to an existing workdir to continue")
    p.add_argument("--from", dest="from_stage", choices=STAGES,
                   help="Force restart from this stage (clears later stamps)")
    args = p.parse_args()

    if args.resume:
        workdir = Path(args.resume).resolve()
        if not workdir.exists():
            print(f"workdir not found: {workdir}", file=sys.stderr)
            return 2
        title_file = workdir / ".title"
        if not args.title and title_file.exists():
            args.title = title_file.read_text().strip()
    else:
        if not args.title:
            print("--title is required (or use --resume <workdir>)", file=sys.stderr)
            return 2
        slug = slugify(args.title)[:40] or "broll"
        ts = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
        workdir = Path(args.out).resolve() / f"{slug}-{ts}"
        workdir.mkdir(parents=True, exist_ok=True)
        (workdir / ".title").write_text(args.title)

    print(f"workdir: {workdir}")

    if args.from_stage:
        idx = STAGES.index(args.from_stage)
        for st in STAGES[idx:]:
            s = stamp(workdir, st)
            if s.exists():
                s.unlink()

    script_json = workdir / "script.json"
    narration_wav = workdir / "narration.wav"
    timings_json = workdir / "timings.json"
    broll_dir = workdir / "clips"
    manifest_json = workdir / "manifest.json"
    srt = workdir / "subtitles.srt"
    final_mp4 = workdir / "final.mp4"

    # 1. Script
    if not done(workdir, "script"):
        cmd = ["python3", str(SCRIPT_DIR / "write_script.py"),
               "--title", args.title, "--duration", str(args.duration),
               "--language", args.language, "--out", str(script_json)]
        if args.style:
            cmd += ["--style", args.style]
        run(cmd)
        mark(workdir, "script")

    # 2. TTS
    if not done(workdir, "tts"):
        cmd = ["python3", str(SCRIPT_DIR / "tts.py"),
               "--script", str(script_json),
               "--out", str(narration_wav),
               "--timings-out", str(timings_json)]
        if args.voice:
            cmd += ["--voice", args.voice]
        run(cmd)
        mark(workdir, "tts")

    # 3. B-Roll
    if not done(workdir, "broll"):
        broll_dir.mkdir(exist_ok=True)
        run(["python3", str(SCRIPT_DIR / "fetch_broll.py"),
             "--timings", str(timings_json),
             "--title", args.title,
             "--aspect", args.aspect,
             "--out-dir", str(broll_dir),
             "--manifest-out", str(manifest_json)])
        mark(workdir, "broll")

    # 4. Subtitles
    if not done(workdir, "subs"):
        run(["python3", str(SCRIPT_DIR / "subtitles.py"),
             "--audio", str(narration_wav),
             "--language", args.language,
             "--out", str(srt)])
        mark(workdir, "subs")

    # 5. Compose
    if not done(workdir, "compose"):
        cmd = ["python3", str(SCRIPT_DIR / "compose.py"),
               "--manifest", str(manifest_json),
               "--audio", str(narration_wav),
               "--srt", str(srt),
               "--aspect", args.aspect,
               "--workdir", str(workdir / "compose"),
               "--out", str(final_mp4)]
        if args.music:
            cmd += ["--music", args.music]
        run(cmd)
        mark(workdir, "compose")

    # 6. Upload
    if not args.no_upload and not done(workdir, "upload"):
        run(["python3", str(SCRIPT_DIR / "upload_drive.py"),
             "--file", str(final_mp4),
             "--folder", args.drive_folder,
             "--create-folder"])
        mark(workdir, "upload")

    print("\n=== DONE ===")
    print(f"local : {final_mp4}")
    if not args.no_upload:
        remote = os.environ.get("RCLONE_REMOTE", "drive")
        print(f"drive : {remote}:{args.drive_folder.lstrip('/')}{final_mp4.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
