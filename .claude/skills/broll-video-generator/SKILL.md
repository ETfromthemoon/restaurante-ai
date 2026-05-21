---
name: broll-video-generator
description: Generate a complete B-Roll video (script + voice narration + stock footage + subtitles) from a single title, idea or concept, and upload the finished MP4 to a Google Drive folder. Use when the user asks to create a B-Roll, generate a video from a concept/title, automate video production, or "haz un video sobre…".
---

# B-Roll Video Generator

End-to-end pipeline that turns a single title or concept into a finished narrated video with subtitles, then uploads it to Google Drive.

## What it does

1. **Script** — Claude writes a structured narration script (hook + 3-5 beats + closing) sized to the requested duration.
2. **Voice** — TTS renders the narration to WAV (default: `edge-tts`, Spanish/English, free, no API key).
3. **B-Roll** — Pexels Videos API searches stock clips for each beat using AI-extracted visual keywords.
4. **Subtitles** — `faster-whisper` re-transcribes the rendered audio to get word-level timing → SRT.
5. **Compose** — `ffmpeg` stitches clips to match narration length, mixes audio, burns subtitles, exports MP4 (1080p).
6. **Upload** — `rclone` pushes the finished MP4 to the configured Drive folder.

## When to use

Trigger this skill when the user asks for any of:
- "Genera un B-Roll sobre X"
- "Hazme un video sobre {tema}"
- "Crea un video de {duración} sobre {concepto}"
- "Sube a Drive un video sobre…"

Single-input mode is the default: the user gives only a title/idea, the skill picks sensible defaults (60s, español, vertical 9:16 for social, voz `es-MX-DaliaNeural`).

## Inputs to collect

Ask the user **only** for the title/concept. Everything else has defaults — only ask if the user wants to override:

| Param | Default | Notes |
|---|---|---|
| `title` | (required) | Free text. Used for script + Pexels queries. |
| `duration_s` | `60` | 15-180 recommended. |
| `language` | `es` | `es` or `en`. Controls script + TTS voice + subtitle language. |
| `aspect` | `9:16` | `9:16` (Reels/TikTok/Shorts), `16:9` (YouTube), `1:1`. |
| `voice` | auto | `edge-tts` voice id, e.g. `es-MX-DaliaNeural`, `en-US-AriaNeural`. |
| `drive_folder` | `BRoll/` | rclone remote path. Configure remote name with `RCLONE_REMOTE` env var. |

If the user provides extra preferences in prose ("estilo cinematográfico", "tono motivacional", "incluye estadísticas"), forward them to the script step as `--style`.

## Prerequisites (verify before first run)

Run `scripts/check_env.sh` first. It will tell you exactly what's missing.

**Required:**
- `ffmpeg` on PATH
- `python3` with the packages in `requirements.txt` (`pip install -r requirements.txt`)
- `rclone` configured with a Drive remote — set `RCLONE_REMOTE=<name>` (default: `drive`)
- `ANTHROPIC_API_KEY` for script generation
- `PEXELS_API_KEY` (free at https://www.pexels.com/api/) for B-Roll clips

**Optional:**
- `ELEVENLABS_API_KEY` — higher quality narration (set `TTS_PROVIDER=elevenlabs`)
- `OPENAI_API_KEY` — alternative TTS (set `TTS_PROVIDER=openai`)
- GPU + CUDA for faster Whisper transcription

If a prereq is missing, **do not silently continue** — show the user what to install/configure and offer to run the install commands.

## Workflow

Make a todo list with these steps and work through them one by one. Each step writes to a session workdir under `out/<slug>-<timestamp>/` so partial results survive failures.

### 1. Validate environment

```bash
bash .claude/skills/broll-video-generator/scripts/check_env.sh
```

Stop and report missing prereqs before doing any work.

### 2. Run the pipeline

```bash
python3 .claude/skills/broll-video-generator/scripts/generate.py \
  --title "<USER_TITLE>" \
  --duration 60 \
  --language es \
  --aspect 9:16 \
  --out out/
```

The script logs each stage. If a stage fails, the workdir is preserved so you can re-run from a checkpoint with `--resume <workdir>`.

### 3. Upload

The pipeline calls `rclone copy <final.mp4> ${RCLONE_REMOTE}:${DRIVE_FOLDER}` automatically. If `--no-upload` was passed, do this manually:

```bash
rclone copy out/<slug>/final.mp4 "${RCLONE_REMOTE:-drive}:BRoll/"
```

### 4. Report

Reply to the user with:
- Title used
- Final duration + dimensions
- Local path
- Drive path (or `rclone link <path>` if shareable links are configured)
- Any clips that fell back to placeholders (low-quality search results)

## Stage details — read these only if a stage fails

### Script (`write_script.py`)
- Uses Claude (`claude-sonnet-4-6` by default) via the `anthropic` SDK.
- Output is JSON: `{ "title", "beats": [{ "narration", "visual_query", "duration_s" }], "total_s" }`.
- Word budget: ~2.4 words/sec for Spanish, ~2.7 for English. Adjust `--wpm` if narration sounds rushed.

### TTS (`tts.py`)
- Default `edge-tts` requires no key. Falls back gracefully if voice id is invalid (uses neural default for language).
- For `elevenlabs`, set `ELEVENLABS_VOICE_ID` (default: Rachel).
- Output: `narration.wav` (mono, 24kHz).

### B-Roll (`fetch_broll.py`)
- One Pexels search per beat using `visual_query`. Filters: `min_duration=4`, `orientation=portrait/landscape` based on `--aspect`.
- Downloads up to 3 candidate clips per beat, picks the first that's ≥ beat duration after trimming.
- If Pexels returns nothing for a query, retries with the bare nouns from `title` as fallback.

### Subtitles (`subtitles.py`)
- Uses `faster-whisper` with `model_size=small` (Spanish/English balanced).
- Forced alignment against the script text for higher accuracy than blind transcription.
- Emits `.srt` with max 7 words per cue, 2 lines, ~2.5s per cue.

### Compose (`compose.py`)
- Builds an ffmpeg `concat` list, applies `scale`+`crop` to target aspect, normalizes to 30fps.
- Audio: narration on track 0, optional `--music <file>` ducked to -18 dB.
- Subtitles: burned in via `subtitles=` filter with a styled `force_style` (Inter, white, drop shadow).
- Output: `final.mp4` (H.264 + AAC, 1080p long edge).

### Upload (`upload_drive.py`)
- Wraps `rclone copy --progress`. If `RCLONE_REMOTE` is unset, tries `drive:` then prompts the user to run `rclone config`.

## Common follow-ups

- **"Quiero otra voz"** → re-run with `--voice <id>`. List voices: `edge-tts --list-voices | grep es-`.
- **"Cambia el clip 2"** → keep the workdir, edit `out/<slug>/script.json` beat 2's `visual_query`, then `--resume <workdir> --from broll`.
- **"Hazlo en inglés"** → `--language en`. Script, voice, and subtitles all switch.
- **"Súbelo a otra carpeta"** → `--drive-folder "MisVideos/Marketing/"`.

## Failure modes to watch for

- **Pexels rate-limit (429)** — back off 60s; the script does this automatically up to 3 times.
- **edge-tts SSL error on first run** — usually a stale cert bundle; `pip install -U certifi`.
- **rclone "directory not found"** — the Drive folder must exist or `--create-folder` must be passed.
- **ffmpeg subtitle filter fails on paths with spaces** — the compose script already escapes them; if you hand-edit, keep the escaping.
