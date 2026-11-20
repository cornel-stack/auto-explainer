#!/usr/bin/env python3
"""Emit a COST-BALANCED shard matrix of frame ranges for the render workflow.

The naive split (equal frames per shard) is badly unbalanced: a shard full of
cheap 2D frames (photos, charts, kinetic text) finishes in ~1 minute, while a
shard full of expensive software-GL three.js frames takes 20+. That one 3D
straggler sets the wall-clock for the whole render.

Instead we weight each frame by how costly it is to render — 3D (Engine3D)
frames count ~W3D× a 2D frame — then cut contiguous shards of roughly EQUAL
TOTAL COST. Result: heavy 3D stretches are chopped into many short shards that
run on separate CPUs in parallel, while cheap 2D stretches stay as a few big
shards. Every shard finishes in about the same wall-clock.

Each shard still renders an inclusive [start, end] frame range; `assemble`
concatenates them in order.

Usage: python pipeline/plan_matrix.py videos/<slug> [cost_per_shard]
Prints: {"total": N, "matrix": [{"index":0,"start":0,"end":599}, ...]}
"""
import json
import math
import sys
from pathlib import Path

base = Path(sys.argv[1])

# Tunables.
MAX_SHARDS = 24           # GitHub matrix fan-out cap
THREE_D = {"Engine3D"}    # components rendered via software GL (expensive)
W3D = 12.0                # a 3D frame costs ~12× a 2D frame (observed ratio)
MIN_FRAMES = 120          # don't make shards so tiny that runner setup dominates
# Target cost per shard. Lower → more, shorter shards (more parallelism).
COST_PER_SHARD = float(sys.argv[2]) if len(sys.argv) > 2 else 2400.0

timing = json.loads((base / ".cache" / "timing.json").read_text())
beats = timing["beats"]
total = max(b["start_frame"] + b["frames"] for b in beats)

# Per-beat weight: 3D beats (and the Engine3D-backed intro) are heavy.
try:
    script = json.loads((base / "script.json").read_text())
except FileNotFoundError:
    script = {"scenes": []}
weight_of = {"intro": W3D, "outro": 1.0}  # intro renders Engine3D behind the title
for sc in script.get("scenes", []):
    comp = (sc.get("visual") or {}).get("component")
    weight_of[sc["id"]] = W3D if comp in THREE_D else 1.0

# Per-frame weight array (gaps between beats default to a cheap 1.0).
weight = [1.0] * total
for b in beats:
    w = weight_of.get(b["id"], 1.0)
    s = b["start_frame"]
    e = min(total, s + b["frames"])
    for f in range(s, e):
        weight[f] = w

total_cost = sum(weight)
n = min(MAX_SHARDS, max(1, math.ceil(total_cost / COST_PER_SHARD)))
per = total_cost / n

# Greedy contiguous split by cumulative cost.
matrix = []
start = 0
acc = 0.0
idx = 0
f = 0
while f < total:
    acc += weight[f]
    f += 1
    remaining = n - idx - 1
    if acc >= per and (f - start) >= MIN_FRAMES and remaining > 0:
        matrix.append({"index": idx, "start": start, "end": f - 1})
        idx += 1
        start = f
        acc = 0.0
matrix.append({"index": idx, "start": start, "end": total - 1})

print(json.dumps({"total": total, "matrix": matrix}))
