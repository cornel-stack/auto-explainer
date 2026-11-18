#!/usr/bin/env python3
"""Emit a JSON shard matrix of frame ranges for the render workflow (Spec §11).

Each shard renders an inclusive [start, end] frame range; the assemble job
concatenates them. Capped at 16 shards.

Usage: python pipeline/plan_matrix.py videos/<slug> [frames_per_shard]
Prints: {"total": N, "matrix": [{"index":0,"start":0,"end":599}, ...]}
"""
import json
import math
import sys
from pathlib import Path

base = Path(sys.argv[1])
target_per = int(sys.argv[2]) if len(sys.argv) > 2 else 600
MAX_SHARDS = 16

timing = json.loads((base / ".cache" / "timing.json").read_text())
total = max(b["start_frame"] + b["frames"] for b in timing["beats"])

n = min(MAX_SHARDS, max(1, math.ceil(total / target_per)))
per = math.ceil(total / n)

matrix = []
i = 0
start = 0
while start < total:
    end = min(total - 1, start + per - 1)
    matrix.append({"index": i, "start": start, "end": end})
    start = end + 1
    i += 1

print(json.dumps({"total": total, "matrix": matrix}))
