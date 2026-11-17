# Auto Explainer

A code-rendered automotive explainer channel for **drivers, not enthusiasts**.
Every video is a diagram that moves, narrated by one voice, built entirely from
a single `script.json` and rendered in GitHub Actions. Nothing is filmed.

This repository is the proof of the engineering behind the channel. It is
public: the code is MIT; the narration, images and rendered videos are All
Rights Reserved (see [CONTENT-LICENSE.md](./CONTENT-LICENSE.md)).

> Build contract: [`docs/TECHNICAL.md`](./docs/TECHNICAL.md) · why:
> [`docs/PRODUCTION-PLAN.pdf`](./docs/PRODUCTION-PLAN.pdf) · what to make:
> [`docs/Automotive-Topic-Research.xlsx`](./docs/Automotive-Topic-Research.xlsx)

## How a video is made

```
script.json ──validate──▶ tts (Brian) ──▶ timing.json ──▶ Remotion ──▶ render (CI) ──▶ mp4
```

1. **Script** — one `videos/<slug>/script.json` is the only human-authored input.
2. **Narration** — `pipeline/tts.py` synthesizes Edge TTS `en-US-BrianNeural`,
   loudness-normalises to −14 LUFS, and writes word-level `timing.json`.
3. **Composition** — Remotion turns the script + timing into a 1920×1080 video.
4. **Render** — GitHub Actions renders every published frame. Local renders are
   for development only and never ship.

## First video

`videos/how-a-car-engine-works/` — a Tier-1 (2D schematic) *How It Works*
episode. The animated `Engine` component drives the four strokes from real
crank-slider kinematics.

## Run a preview locally (development only)

```bash
npm install
python3 pipeline/tts.py videos/how-a-car-engine-works   # writes .cache/timing.json
npm run studio                                           # opens Remotion Studio
```

## Render in CI

Push to `main`, or run the **render** workflow from the Actions tab with the
slug. The finished MP4 is published as a GitHub Release asset — that link is the
hand-off to the manual YouTube upload. CI never touches YouTube.

## License

Code: [MIT](./LICENSE). Content (narration, images, video):
[All Rights Reserved](./CONTENT-LICENSE.md).
