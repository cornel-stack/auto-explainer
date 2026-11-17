#!/usr/bin/env python3
"""Narrate a video with Edge TTS Brian and emit timing (Spec §8).

For each beat (intro, scenes[], outro): synthesize en-US-BrianNeural, collect
WordBoundary events, process the audio (high-pass, light compression, loudnorm
to -14 LUFS), then:

  .cache/audio/<id>.wav   per-beat processed narration
  .cache/timing.json      { fps, beats:[{id,start_frame,frames,words:[{w,s,e}]}] }
  .cache/narration.wav    all beats placed at their start times (muxed in render)
  .cache/props.json       { timing } passed to Remotion as inputProps
  .cache/captions.srt     sentence-chunked captions from word boundaries
  .cache/tts-meta.json    { voice, rate, engine }

Synthesis is cached by sha256(voice, rate, processed text), so a re-run that
changes nothing re-synthesizes nothing.

Usage: python pipeline/tts.py videos/<slug> [--voice en-US-BrianNeural]
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import math
import subprocess
import sys
from pathlib import Path

import edge_tts

VOICE = "en-US-BrianNeural"
RATE = "-5%"
FPS = 30
TAIL = 12
TITLE_TAIL = 24


def expand(text: str, lexicon: dict[str, str]) -> str:
    """Apply phonetic respellings. (Numbers are written as words in the script.)"""
    out = text
    for key, val in lexicon.items():
        out = out.replace(key, val)
    return out


async def synth(text: str) -> tuple[bytes, list[dict]]:
    """Return (audio, boundary spans). Brian emits SentenceBoundary, not
    WordBoundary, so we collect every boundary span and split it into words
    afterwards."""
    comm = edge_tts.Communicate(text, voice=VOICE, rate=RATE)
    audio = bytearray()
    spans: list[dict] = []
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] in ("WordBoundary", "SentenceBoundary"):
            spans.append(
                {
                    "text": chunk["text"],
                    "s": chunk["offset"] / 1e7,
                    "e": (chunk["offset"] + chunk["duration"]) / 1e7,
                }
            )
    return bytes(audio), spans


def words_from_spans(spans: list[dict]) -> list[dict]:
    """Distribute each boundary span's text across its time, proportional to
    token length. Works whether spans are per-word or per-sentence."""
    words: list[dict] = []
    for sp in spans:
        toks = sp["text"].split()
        if not toks:
            continue
        span = max(0.0, sp["e"] - sp["s"])
        total_chars = sum(len(t) for t in toks) or 1
        t0 = sp["s"]
        for tok in toks:
            dur = span * (len(tok) / total_chars)
            words.append({"w": tok, "s": round(t0, 3), "e": round(t0 + dur, 3)})
            t0 += dur
    return words


def process_audio(mp3: Path, wav: Path) -> None:
    """mp3 -> 48 kHz WAV, high-pass 80 Hz, light compression, loudnorm -14 LUFS."""
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(mp3),
            "-af",
            "highpass=f=80,acompressor=threshold=-18dB:ratio=2:attack=5:release=120,"
            "loudnorm=I=-14:TP=-1:LRA=11",
            "-ar", "48000", "-ac", "1", str(wav),
        ],
        check=True,
        capture_output=True,
    )


def probe_seconds(wav: Path) -> float:
    out = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(wav),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(out.stdout.strip())


def cache_key(text: str) -> str:
    return hashlib.sha256(f"{VOICE}|{RATE}|{text}".encode()).hexdigest()[:16]


def assemble(beats: list[dict], audio_dir: Path, out: Path, total_sec: float) -> None:
    """Place each beat's wav at its start time on one silent track."""
    inputs: list[str] = []
    filters: list[str] = []
    labels: list[str] = []
    for i, b in enumerate(beats):
        wav = audio_dir / f"{b['id']}.wav"
        inputs += ["-i", str(wav)]
        delay_ms = int(round((b["start_frame"] / FPS) * 1000))
        filters.append(f"[{i}]adelay={delay_ms}:all=1[d{i}]")
        labels.append(f"[d{i}]")
    mix = (
        ";".join(filters)
        + ";"
        + "".join(labels)
        + f"amix=inputs={len(beats)}:normalize=0,"
        + f"apad=whole_dur={total_sec:.3f},atrim=end={total_sec:.3f}[out]"
    )
    subprocess.run(
        ["ffmpeg", "-y", *inputs, "-filter_complex", mix, "-map", "[out]",
         "-ar", "48000", "-ac", "2", str(out)],
        check=True,
        capture_output=True,
    )


def srt_time(sec: float) -> str:
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int(round((sec - int(sec)) * 1000))
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def write_captions(beats: list[dict], out: Path) -> None:
    cues: list[tuple[float, float, str]] = []
    for b in beats:
        base = b["start_frame"] / FPS
        buf: list[str] = []
        start = None
        for w in b["words"]:
            if start is None:
                start = base + w["s"]
            buf.append(w["w"])
            line = " ".join(buf)
            ends_sentence = w["w"].strip().endswith((".", "!", "?"))
            too_long = len(line) >= 80 or (base + w["e"] - start) >= 6.5
            if ends_sentence or too_long:
                cues.append((start, base + w["e"], line))
                buf = []
                start = None
        if buf and start is not None:
            cues.append((start, base + b["words"][-1]["e"], " ".join(buf)))
    lines: list[str] = []
    for i, (a, z, text) in enumerate(cues, 1):
        lines += [str(i), f"{srt_time(a)} --> {srt_time(max(z, a + 0.4))}", text, ""]
    out.write_text("\n".join(lines))


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: python pipeline/tts.py videos/<slug>")
        return 2
    base = Path(sys.argv[1])
    script = json.loads((base / "script.json").read_text())
    lexicon = script.get("lexicon", {})

    cache = base / ".cache"
    audio_dir = cache / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    units: list[dict] = [{"id": "intro", "text": script["intro"]["narration"], "title": False}]
    for sc in script["scenes"]:
        units.append({"id": sc["id"], "text": sc["narration"], "title": sc["type"] == "title"})
    units.append({"id": "outro", "text": script["outro"]["narration"], "title": False})

    beats: list[dict] = []
    cursor = 0
    for u in units:
        text = expand(u["text"], lexicon)
        key = cache_key(text)
        wav = audio_dir / f"{u['id']}.wav"
        words_path = audio_dir / f"{u['id']}.words.json"
        key_path = audio_dir / f"{u['id']}.key"

        if wav.exists() and key_path.exists() and key_path.read_text() == key:
            words = json.loads(words_path.read_text())
            print(f"  cache hit  {u['id']}")
        else:
            print(f"  synth      {u['id']} ({len(text.split())} words)")
            audio, spans = asyncio.run(synth(text))
            words = words_from_spans(spans)
            mp3 = audio_dir / f"{u['id']}.mp3"
            mp3.write_bytes(audio)
            process_audio(mp3, wav)
            mp3.unlink(missing_ok=True)
            words_path.write_text(json.dumps(words))
            key_path.write_text(key)

        seconds = probe_seconds(wav)
        audio_frames = math.ceil(seconds * FPS)
        frames = audio_frames + (TITLE_TAIL if u["title"] else TAIL)
        beats.append(
            {"id": u["id"], "start_frame": cursor, "frames": frames, "words": words}
        )
        cursor += frames

    total_frames = cursor
    total_sec = total_frames / FPS
    timing = {"fps": FPS, "beats": beats}

    (cache / "timing.json").write_text(json.dumps(timing, indent=2))
    (cache / "props.json").write_text(json.dumps({"timing": timing}))
    (cache / "tts-meta.json").write_text(
        json.dumps({"voice": VOICE, "rate": RATE, "engine": "edge-tts"}, indent=2)
    )
    write_captions(beats, cache / "captions.srt")
    assemble(beats, audio_dir, cache / "narration.wav", total_sec)

    print(
        f"\nOK: {len(beats)} beats, {total_frames} frames "
        f"({total_sec:.1f}s @ {FPS}fps). Wrote timing.json, props.json, "
        f"narration.wav, captions.srt."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
