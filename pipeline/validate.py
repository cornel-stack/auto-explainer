#!/usr/bin/env python3
"""Validate a videos/<slug>/script.json against the build contract (Spec §5).

Checks: JSON Schema shape, narration word counts, cue phrases present verbatim,
sources resolve, components exist, lexicon keys spoken, total length within
+/-10% of target, and assets have attribution. Exits 1 on any error.

Usage: python pipeline/validate.py videos/<slug>
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# Mirrors src/components/registry.ts — update both together.
KNOWN_COMPONENTS = {
    "Engine",
    "Engine3D",
    "Chart",
    "Table",
    "DecisionTree",
    "Peep",
    "Photo",
    "Illustration",
    "Stage",
}

WORDS_PER_MIN = 150
MIN_WORDS = {"mechanism": 90, "beat": 90, "item": 35}


def words(text: str) -> list[str]:
    return re.findall(r"[A-Za-z0-9']+", text)


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", text.lower())).strip()


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python pipeline/validate.py videos/<slug>")
        return 2
    base = Path(sys.argv[1])
    script_path = base / "script.json"
    errors: list[str] = []
    warnings: list[str] = []

    if not script_path.exists():
        print(f"ERROR: {script_path} not found")
        return 1
    try:
        script = json.loads(script_path.read_text())
    except json.JSONDecodeError as e:
        print(f"ERROR: {script_path} is not valid JSON: {e}")
        return 1

    # Optional JSON Schema validation if jsonschema is installed.
    schema_path = Path(__file__).parent / "schema.json"
    try:
        import jsonschema  # type: ignore

        schema = json.loads(schema_path.read_text())
        v = jsonschema.Draft202012Validator(schema)
        for err in sorted(v.iter_errors(script), key=lambda e: e.path):
            loc = "/".join(str(p) for p in err.path)
            errors.append(f"schema: {loc}: {err.message}")
    except ImportError:
        warnings.append("jsonschema not installed; skipped structural schema check")

    source_ids = {s["id"] for s in script.get("sources", [])}
    all_narration = [script["intro"]["narration"]]
    total_words = len(words(script["intro"]["narration"]))

    seen_ids: set[str] = set()
    for sc in script.get("scenes", []):
        sid = sc.get("id", "<no-id>")
        if sid in seen_ids:
            errors.append(f"scene id '{sid}' is duplicated")
        seen_ids.add(sid)

        narration = sc.get("narration", "")
        all_narration.append(narration)
        n = len(words(narration))
        total_words += n
        floor = MIN_WORDS.get(sc.get("type", ""), 0)
        if n < floor:
            errors.append(
                f"scene '{sid}': narration {n} words < {floor} required for type '{sc.get('type')}'"
            )

        # Non-title scenes must name a visual; title scenes may omit it. Any
        # visual present must resolve to a registered component.
        visual = sc.get("visual")
        if visual is not None:
            comp = visual.get("component")
            if comp not in KNOWN_COMPONENTS:
                errors.append(f"scene '{sid}': unknown visual.component '{comp}'")
        elif sc.get("type") != "title":
            errors.append(f"scene '{sid}': missing visual")

        if sc.get("source") and sc["source"] not in source_ids:
            errors.append(f"scene '{sid}': source '{sc['source']}' not in sources[]")

        norm = normalize(narration)
        for cue in sc.get("cues", []):
            phrase = normalize(cue.get("on", ""))
            if phrase and phrase not in norm:
                errors.append(
                    f"scene '{sid}': cue phrase '{cue['on']}' not found verbatim in narration"
                )

        for spec in sc.get("specs", []):
            val = str(spec.get("value", ""))
            if re.search(r"\d", val) and not (sc.get("source") or source_ids):
                errors.append(
                    f"scene '{sid}': numeric spec '{spec.get('label')}' has no source"
                )

    total_words += len(words(script["outro"]["narration"]))
    all_narration.append(script["outro"]["narration"])

    # Lexicon keys must be spoken somewhere.
    corpus = normalize(" ".join(all_narration))
    for key in script.get("lexicon", {}):
        if normalize(key) not in corpus:
            errors.append(f"lexicon key '{key}' never appears in any narration")

    # Total length within +/-10% of target.
    target = script["target_minutes"] * WORDS_PER_MIN
    if not (target * 0.9 <= total_words <= target * 1.1):
        errors.append(
            f"total narration {total_words} words is outside +/-10% of target {target} "
            f"({int(target*0.9)}-{int(target*1.1)})"
        )

    # Assets must be attributed.
    assets = base / "assets"
    attribution = base / "ATTRIBUTION.md"
    if assets.exists():
        attro = attribution.read_text() if attribution.exists() else ""
        for f in assets.rglob("*"):
            if f.is_file() and f.name not in attro:
                errors.append(f"asset '{f.name}' has no line in ATTRIBUTION.md")

    print(f"== validate {base} ==")
    print(f"scenes: {len(script.get('scenes', []))}  total words: {total_words}  "
          f"target: {target} (+/-10%)  ~{total_words/WORDS_PER_MIN:.1f} min")
    for w in warnings:
        print(f"  warn: {w}")
    if errors:
        print(f"\nFAILED with {len(errors)} error(s):")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("\nOK: script is valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
