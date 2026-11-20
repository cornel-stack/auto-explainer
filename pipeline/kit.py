#!/usr/bin/env python3
"""Assemble a ready-to-post YouTube kit for a video (Spec §13).

Produces a clearly-named folder `<out>/` containing everything the owner needs
to upload by hand: the MP4, clickbait thumbnails, title + alt titles, a full
description (hook, chapters, sources, credits, disclaimer), tags, chapters, and
captions. Also zips the folder.

Usage:
  python pipeline/kit.py videos/<slug> \
      --mp4 out/<slug>.mp4 --srt out/<slug>.srt \
      --timing videos/<slug>/.cache/timing.json \
      --thumbs thumbs --out out/<slug>-youtube-kit
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import zipfile
from pathlib import Path


def ts(frames: int, fps: float) -> str:
    s = int(round(frames / fps))
    m, s = divmod(s, 60)
    h, m = divmod(m, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def first_sentence(text: str) -> str:
    m = re.match(r"^(.*?[.!?])(\s|$)", text.strip())
    return (m.group(1) if m else text).strip()


def clean_headline(h: str) -> str:
    # "First — what is octane?" -> "What is octane?"
    h = re.sub(r"^(first|so|now)[,—\-\s]+", "", h.strip(), flags=re.I)
    return h[:1].upper() + h[1:] if h else h


def chapter_title(scene: dict) -> str:
    props = (scene.get("visual") or {}).get("props") or {}
    if scene.get("type") == "title" and props.get("headline"):
        return clean_headline(props["headline"])
    return clean_headline(props.get("kicker") or scene.get("section") or scene["id"].replace("-", " ").title())


def parse_attribution(path: Path) -> list[str]:
    """Pull human-readable credit lines out of ATTRIBUTION.md (table rows +
    the Coco Material / DiceBear lines) so CC-BY obligations are met."""
    if not path.exists():
        return []
    credits: list[str] = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if line.startswith("|") and "---" not in line:
            cells = [c.strip() for c in line.strip("|").split("|")]
            # table header is "File | Subject | Author | Licence | Source"
            if len(cells) >= 5 and cells[0].lower() not in ("file", ""):
                subject, author, lic = cells[1], cells[2], cells[3]
                if author.lower() != "author":
                    credits.append(f"• {subject} — {author} ({lic})")
    # Library-level credits that are always true for this pipeline.
    credits.append("• Characters: Open Peeps (Pablo Stanley, CC0) via DiceBear")
    credits.append("• Activity illustrations: Coco Material (CC BY 4.0) — cocomaterial.com")
    return credits


def build_tags(script: dict) -> list[str]:
    base = [
        script["keyword"],
        "premium vs regular gas",
        "premium gas",
        "regular gas",
        "octane",
        "octane rating explained",
        "is premium gas worth it",
        "premium vs regular",
        "high octane fuel",
        "does premium gas matter",
        "car maintenance",
        "fuel economy",
        "save money on gas",
        "how engines work",
        "engine knock",
    ]
    seen, out = set(), []
    for t in base:
        k = t.lower()
        if k not in seen:
            seen.add(k)
            out.append(t)
    return out[:20]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("base")
    ap.add_argument("--mp4", required=True)
    ap.add_argument("--srt", required=True)
    ap.add_argument("--timing", required=True)
    ap.add_argument("--thumbs", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    base = Path(a.base)
    script = json.loads((base / "script.json").read_text())
    timing = json.loads(Path(a.timing).read_text())
    fps = timing.get("fps", 30)
    starts = {b["id"]: b["start_frame"] for b in timing["beats"]}

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)

    slug = script["slug"]

    # Media
    if Path(a.mp4).exists():
        shutil.copy(a.mp4, out / f"{slug}.mp4")
    if Path(a.srt).exists():
        shutil.copy(a.srt, out / "captions.srt")
    thumbs_dir = Path(a.thumbs)
    thumb_names = []
    if thumbs_dir.exists():
        for p in sorted(thumbs_dir.glob("*.png")):
            shutil.copy(p, out / p.name)
            thumb_names.append(p.name)

    # Title
    (out / "title.txt").write_text(
        script["title"] + "\n\nAlternative titles:\n" + "\n".join(f"- {t}" for t in script.get("alt_titles", [])) + "\n"
    )

    # Chapters (Intro at 0:00 + each section title). YouTube needs >=3, >=10s apart.
    chapters: list[tuple[str, str]] = [("0:00", "Introduction")]
    for sc in script["scenes"]:
        if sc["id"] not in starts:
            continue
        if sc.get("type") == "title":
            chapters.append((ts(starts[sc["id"]], fps), chapter_title(sc)))
    chap_lines = [f"{t} {name}" for t, name in chapters]
    (out / "chapters.txt").write_text("\n".join(chap_lines) + "\n")

    # Tags
    tags = build_tags(script)
    (out / "tags.txt").write_text(", ".join(tags) + "\n")

    # Description
    hook = first_sentence(script["intro"]["narration"])
    sources = "\n".join(f"• {s['title']}\n  {s['url']}" for s in script.get("sources", []))
    credits = "\n".join(parse_attribution(base / "ATTRIBUTION.md"))
    desc = f"""{hook}

{script["intro"]["narration"]}

⏱️ CHAPTERS
{chr(10).join(chap_lines)}

🔗 SOURCES
{sources}

🎨 CREDITS
{credits}

ℹ️ This video is for general education. Always follow your vehicle's owner's manual.

#PremiumGas #CarMaintenance #FuelEconomy
"""
    (out / "description.md").write_text(desc)

    # How-to-use note
    (out / "README.txt").write_text(
        "YouTube upload kit for '" + script["title"] + "'\n\n"
        "- " + slug + ".mp4        -> the video\n"
        "- thumbnail-a/b/c.png     -> pick ONE clickbait thumbnail\n"
        "- title.txt               -> title + alternatives\n"
        "- description.md          -> paste into the description box\n"
        "- chapters.txt            -> already included in the description\n"
        "- tags.txt                -> paste into tags\n"
        "- captions.srt            -> upload as subtitles\n\n"
        "Thumbnails: " + (", ".join(thumb_names) if thumb_names else "(none rendered)") + "\n"
    )

    # Zip
    zip_path = out.parent / f"{slug}-youtube-kit.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(out.rglob("*")):
            if f.is_file():
                z.write(f, f.relative_to(out.parent))

    print(f"== kit {out} ==")
    print(f"  files: {sorted(p.name for p in out.iterdir())}")
    print(f"  chapters: {len(chapters)}  tags: {len(tags)}  thumbs: {len(thumb_names)}")
    print(f"  zip: {zip_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
