#!/usr/bin/env bash
# Verify all prerequisites for the B-Roll pipeline.
set -u

ok=0
fail=0

check() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then
    echo "  ok   $name"
    ok=$((ok+1))
  else
    echo "  MISS $name"
    fail=$((fail+1))
  fi
}

check_env() {
  local var="$1"
  if [ -n "${!var:-}" ]; then
    echo "  ok   \$$var"
    ok=$((ok+1))
  else
    echo "  MISS \$$var"
    fail=$((fail+1))
  fi
}

echo "== Binaries =="
check ffmpeg command -v ffmpeg
check ffprobe command -v ffprobe
check python3 command -v python3
check rclone command -v rclone

echo "== Python packages =="
for pkg in anthropic edge_tts requests faster_whisper pysrt slugify; do
  check "python:$pkg" python3 -c "import $pkg"
done

echo "== Environment =="
check_env ANTHROPIC_API_KEY
check_env PEXELS_API_KEY
# Optional — informational only
for v in ELEVENLABS_API_KEY OPENAI_API_KEY RCLONE_REMOTE; do
  if [ -n "${!v:-}" ]; then echo "  ok   \$$v (optional)"; else echo "  -    \$$v (optional, not set)"; fi
done

echo "== rclone remote =="
remote="${RCLONE_REMOTE:-drive}"
if rclone listremotes 2>/dev/null | grep -q "^${remote}:"; then
  echo "  ok   remote '${remote}:' configured"
  ok=$((ok+1))
else
  echo "  MISS remote '${remote}:' — run: rclone config"
  fail=$((fail+1))
fi

echo
echo "Summary: $ok ok, $fail missing"
[ "$fail" -eq 0 ]
