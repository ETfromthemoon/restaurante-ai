# B-Roll Video Generator — setup

End-to-end pipeline: **title → script → narration → stock B-Roll → subtitles → MP4 → Google Drive**.

The pipeline is invoked by Claude Code via the [`SKILL.md`](./SKILL.md) skill. You can
also run `scripts/generate.py` directly.

## One-time install

```bash
# 1. System binaries
#   macOS:    brew install ffmpeg rclone
#   Debian:   sudo apt install ffmpeg rclone
#   Windows:  choco install ffmpeg rclone

# 2. Python deps (use a venv if you like)
pip install -r .claude/skills/broll-video-generator/requirements.txt

# 3. API keys (add to your shell rc)
export ANTHROPIC_API_KEY=sk-ant-...
export PEXELS_API_KEY=...                  # free at pexels.com/api
# optional, higher-quality narration:
# export TTS_PROVIDER=elevenlabs
# export ELEVENLABS_API_KEY=...
# export ELEVENLABS_VOICE_ID=...

# 4. Configure rclone for Google Drive (one-time, interactive)
rclone config
#   n) New remote
#   name> drive
#   storage> drive
#   (accept defaults, complete browser OAuth)
export RCLONE_REMOTE=drive
```

Verify everything:

```bash
bash .claude/skills/broll-video-generator/scripts/check_env.sh
```

## Daily use (from Claude Code)

Just ask Claude:

> Genera un B-Roll sobre la historia del café en México

Claude will invoke the skill, pick defaults (60s, español, 9:16, voice
`es-MX-DaliaNeural`), and upload to `drive:BRoll/`.

## Direct CLI use

```bash
python3 .claude/skills/broll-video-generator/scripts/generate.py \
  --title "La historia del café en México" \
  --duration 60 \
  --language es \
  --aspect 9:16 \
  --drive-folder "BRoll/Cafe/"
```

Useful flags:

| Flag | Purpose |
|---|---|
| `--no-upload` | Skip Drive, keep the file local. |
| `--resume <workdir>` | Continue a previous run after fixing something. |
| `--from broll` | Restart from a specific stage (clears later checkpoints). |
| `--music path/to.mp3` | Mix background music ducked under narration. |
| `--style "cinematic, contemplative"` | Pass tone hints to the script generator. |

## What lives where

```
out/
└── la-historia-del-cafe-20260520-143012/
    ├── script.json        # Claude-generated beat-by-beat script
    ├── narration.wav      # TTS output (24kHz mono)
    ├── timings.json       # Per-beat start/end in narration
    ├── clips/             # Pexels downloads
    ├── manifest.json      # Beat ↔ clip mapping
    ├── subtitles.srt
    ├── compose/           # Intermediate segments
    ├── final.mp4          # 1080p H.264 + AAC — uploaded to Drive
    └── .done.*            # Stage checkpoints
```

## Costs (rough)

- Claude script: ~1k input + ~600 output tokens per video → cents.
- Pexels: free, attribution requested (manifest.json keeps author + URL).
- `edge-tts`: free.
- ElevenLabs: ~$0.30 per 60s video on the Starter plan.
- Drive: counts against your Google quota.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `edge_tts` SSL error | `pip install -U certifi` |
| Pexels 429 | Wait 60s — the script auto-retries up to 3× |
| `ffmpeg subtitles= …: No such filter` | Your ffmpeg was built without libass; reinstall with `--enable-libass` |
| rclone "directory not found" | Pass `--create-folder` or `rclone mkdir drive:BRoll` |
| Faster-Whisper slow on CPU | Use `--model tiny`, or install with CUDA support |
