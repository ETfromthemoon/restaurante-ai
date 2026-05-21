"""Render the script narration to a single WAV file.

Default provider: edge-tts (free, no API key).
Alternatives: elevenlabs, openai (set TTS_PROVIDER env var).
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

DEFAULT_VOICES = {
    "es": "es-MX-DaliaNeural",
    "en": "en-US-AriaNeural",
}


async def edge_synth(text: str, voice: str, out_mp3: Path) -> None:
    import edge_tts  # local import so import failures show up clearly
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(str(out_mp3))


def elevenlabs_synth(text: str, voice_id: str, out_mp3: Path) -> None:
    import requests
    key = os.environ["ELEVENLABS_API_KEY"]
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    r = requests.post(
        url,
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        json={"text": text, "model_id": "eleven_multilingual_v2"},
        timeout=120,
    )
    r.raise_for_status()
    out_mp3.write_bytes(r.content)


def openai_synth(text: str, voice: str, out_mp3: Path) -> None:
    import requests
    key = os.environ["OPENAI_API_KEY"]
    r = requests.post(
        "https://api.openai.com/v1/audio/speech",
        headers={"Authorization": f"Bearer {key}"},
        json={"model": "tts-1", "voice": voice or "nova", "input": text},
        timeout=120,
    )
    r.raise_for_status()
    out_mp3.write_bytes(r.content)


ESPEAK_VOICES = {"es": "es-419", "en": "en-us"}


def espeak_synth(text: str, voice: str, language: str, out_mp3: Path) -> None:
    """Offline fallback. Robotic but needs no network or API key."""
    voice = voice or ESPEAK_VOICES[language]
    wav = out_mp3.with_suffix(".espeak.wav")
    subprocess.run(
        ["espeak-ng", "-v", voice, "-s", "165", "-w", str(wav), text],
        check=True,
    )
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
         "-codec:a", "libmp3lame", "-qscale:a", "4", str(out_mp3)],
        check=True,
    )
    wav.unlink()


def synth_beat(text: str, voice: str, language: str, out_mp3: Path) -> None:
    provider = os.environ.get("TTS_PROVIDER", "edge").lower()
    if provider == "edge":
        asyncio.run(edge_synth(text, voice or DEFAULT_VOICES[language], out_mp3))
    elif provider == "elevenlabs":
        elevenlabs_synth(text, os.environ.get("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM"), out_mp3)
    elif provider == "espeak":
        espeak_synth(text, voice, language, out_mp3)
    elif provider == "openai":
        openai_synth(text, voice or "nova", out_mp3)
    else:
        raise ValueError(f"Unknown TTS_PROVIDER: {provider}")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--script", required=True, help="Path to script.json")
    p.add_argument("--voice", default=None)
    p.add_argument("--out", required=True, help="Output WAV file")
    p.add_argument("--timings-out", required=True, help="Per-beat timings JSON")
    args = p.parse_args()

    script = json.loads(Path(args.script).read_text(encoding="utf-8"))
    language = script.get("language", "es")
    voice = args.voice or DEFAULT_VOICES[language]

    out_wav = Path(args.out)
    out_wav.parent.mkdir(parents=True, exist_ok=True)

    timings: list[dict] = []
    cursor = 0.0

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        beat_wavs: list[Path] = []

        for i, beat in enumerate(script["beats"]):
            mp3 = tmp_dir / f"beat_{i:02d}.mp3"
            wav = tmp_dir / f"beat_{i:02d}.wav"
            synth_beat(beat["narration"], voice, language, mp3)
            # Normalize to 24kHz mono WAV.
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3),
                 "-ar", "24000", "-ac", "1", str(wav)],
                check=True,
            )
            dur = float(subprocess.check_output(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "default=noprint_wrappers=1:nokey=1", str(wav)]
            ).decode().strip())
            timings.append({
                "beat_index": i,
                "narration": beat["narration"],
                "visual_query": beat["visual_query"],
                "start_s": round(cursor, 3),
                "end_s": round(cursor + dur, 3),
                "duration_s": round(dur, 3),
            })
            cursor += dur
            beat_wavs.append(wav)

        # Concat all beat WAVs.
        concat_list = tmp_dir / "concat.txt"
        concat_list.write_text("\n".join(f"file '{w}'" for w in beat_wavs))
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error",
             "-f", "concat", "-safe", "0", "-i", str(concat_list),
             "-c", "copy", str(out_wav)],
            check=True,
        )

    Path(args.timings_out).write_text(json.dumps(timings, ensure_ascii=False, indent=2))
    print(f"wrote {out_wav} ({cursor:.1f}s) and timings → {args.timings_out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
