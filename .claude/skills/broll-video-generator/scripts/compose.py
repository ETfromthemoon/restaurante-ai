"""Compose the final MP4: clips trimmed to beats, narration on top, subtitles burned in."""
from __future__ import annotations

import argparse
import json
import shlex
import subprocess
import sys
from pathlib import Path

ASPECT_DIMS = {
    "9:16": (1080, 1920),
    "16:9": (1920, 1080),
    "1:1": (1080, 1080),
}


def run(cmd: list[str]) -> None:
    print("$ " + " ".join(shlex.quote(c) for c in cmd))
    subprocess.run(cmd, check=True)


def build_clip_segment(clip: str, duration: float, w: int, h: int, tmp_out: Path) -> None:
    """Trim/loop the clip to exactly `duration`, scale-crop to (w, h), 30fps, no audio."""
    vf = (
        f"scale={w}:{h}:force_original_aspect_ratio=increase,"
        f"crop={w}:{h},"
        f"fps=30,setsar=1"
    )
    run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-stream_loop", "-1", "-i", clip,
        "-t", f"{duration:.3f}",
        "-vf", vf,
        "-an",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "20",
        str(tmp_out),
    ])


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", required=True)
    p.add_argument("--audio", required=True, help="narration.wav")
    p.add_argument("--srt", required=True)
    p.add_argument("--aspect", default="9:16")
    p.add_argument("--music", default=None)
    p.add_argument("--out", required=True)
    p.add_argument("--workdir", required=True)
    args = p.parse_args()

    w, h = ASPECT_DIMS[args.aspect]
    workdir = Path(args.workdir)
    workdir.mkdir(parents=True, exist_ok=True)

    manifest = json.loads(Path(args.manifest).read_text())
    seg_paths: list[Path] = []
    for i, beat in enumerate(manifest):
        seg = workdir / f"seg_{i:02d}.mp4"
        build_clip_segment(beat["clip"], beat["duration_s"], w, h, seg)
        seg_paths.append(seg)

    # Concat (video only).
    concat_list = workdir / "concat.txt"
    concat_list.write_text("\n".join(f"file '{s.resolve()}'" for s in seg_paths))
    video_only = workdir / "video_only.mp4"
    run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "concat", "-safe", "0", "-i", str(concat_list),
        "-c", "copy", str(video_only),
    ])

    # Mux narration + optional music.
    with_audio = workdir / "with_audio.mp4"
    if args.music:
        run([
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(video_only),
            "-i", args.audio,
            "-stream_loop", "-1", "-i", args.music,
            "-filter_complex",
            "[2:a]volume=-18dB[m];[1:a][m]amix=inputs=2:duration=first:dropout_transition=2[a]",
            "-map", "0:v", "-map", "[a]",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
            str(with_audio),
        ])
    else:
        run([
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(video_only), "-i", args.audio,
            "-map", "0:v", "-map", "1:a",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
            str(with_audio),
        ])

    # Burn subtitles. Escape the path for ffmpeg's filter parser.
    srt_escaped = args.srt.replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
    force_style = (
        "Fontname=Inter,Fontsize=20,PrimaryColour=&H00FFFFFF,"
        "OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,"
        "Alignment=2,MarginV=120"
    )
    run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", str(with_audio),
        "-vf", f"subtitles='{srt_escaped}':force_style='{force_style}'",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "20",
        "-c:a", "copy",
        args.out,
    ])

    print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
