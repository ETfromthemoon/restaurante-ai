"""Upload the final MP4 to Google Drive via rclone."""
from __future__ import annotations

import argparse
import os
import subprocess
import sys


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--file", required=True)
    p.add_argument("--folder", default="BRoll/")
    p.add_argument("--remote", default=os.environ.get("RCLONE_REMOTE", "drive"))
    p.add_argument("--create-folder", action="store_true")
    args = p.parse_args()

    target = f"{args.remote}:{args.folder.lstrip('/')}"

    if args.create_folder:
        subprocess.run(["rclone", "mkdir", target], check=False)

    subprocess.run(
        ["rclone", "copy", "--progress", args.file, target],
        check=True,
    )
    print(f"uploaded → {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
