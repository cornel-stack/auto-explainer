#!/usr/bin/env python3
"""Print `id:frame` for the mid-frame of each beat, for the stills workflow.

Usage: python pipeline/midframes.py videos/<slug>
"""
import json
import sys
from pathlib import Path

base = Path(sys.argv[1])
timing = json.loads((base / ".cache" / "timing.json").read_text())
for b in timing["beats"]:
    print(f'{b["id"]}:{b["start_frame"] + b["frames"] // 2}')
