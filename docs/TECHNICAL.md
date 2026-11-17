# Automotive Explainer Channel — Technical Specification

Version 1.0 · 18 Nov 2026 · For Claude Code and any contributor to the repository.

This document is the build contract. It says what to build, in what order, and what "done" means. The *Production Plan* (docs/PRODUCTION-PLAN.pdf) says why; the *Topic Research* workbook (docs/Automotive-Topic-Research.xlsx) says what videos to make. When this document and the code disagree, fix one of them in the same pull request.

Fixed decisions (do not relitigate in code):

1. Every render runs in GitHub Actions. Local renders are for development only and never produce a published file.
2. The repository is public. Code is MIT; narration, images and videos are all rights reserved (see §12).
3. Uploads are manual. CI produces an upload kit; no YouTube credentials exist anywhere in the repo or its secrets.
4. Quality gates (§10) block a render; they are not advisory.
5. Narration is Edge TTS voice `en-US-BrianNeural` (§8). One voice, every video.
6. Visual register is **light grey with the blue section bar** (§3). All five series share it.

---

## 1. Repository layout

```
auto-explainer/
├── README.md                 # what this is, how to run a preview locally
├── LICENSE                   # MIT (code)
├── CONTENT-LICENSE.md        # all rights reserved (narration, images, video)
├── package.json              # Remotion project; node 20
├── remotion.config.ts
├── src/
│   ├── Root.tsx              # registers compositions from videos/*/script.json
│   ├── theme/                # tokens.ts, fonts/, motion.ts
│   ├── chrome/               # SectionBar, TitleCard, ItemCard, SpecStrip, Callout,
│   │                         # SourceCard, Gauge, ProgressRail, GridThumb, Intro, Outro
│   ├── components/           # Engine, GearTrain, FlowLoop, Chassis, Circuit,
│   │                         # Dashboard (IconSet), CarSide, Timeline, Chart, DecisionTree
│   ├── three/                # Scene3D wrapper, materials, camera, label projection
│   ├── scenes/               # one renderer per scene type (§6): item, mechanism,
│   │                         # compare, cause, beat, title, intro, outro
│   ├── series/               # per-series composition builders (§7)
│   └── lib/                  # timing (frames ↔ seconds), kinematics, schema types
├── videos/
│   └── <slug>/
│       ├── script.json       # the only authored input (§5)
│       ├── ATTRIBUTION.md    # CC assets used, with licence and link
│       ├── assets/           # CC assets only (never press-kit material)
│       └── .cache/           # gitignored: audio, timing.json, renders
├── cad/                      # CadQuery generators → glTF (engine, gears, chassis parts)
├── blender/                  # bpy scenes + render script (Tier 3 only)
├── pipeline/                 # Python: validate.py, tts.py, timing.py, kit.py, qc.py, lexicon.json
├── icons/                    # ISO 2575 dashboard symbols (SVG, drawn in-house)
├── tests/                    # vitest unit tests, Playwright screenshot tests, golden frames
├── docs/                     # this file, production plan, research workbook, retros/
└── .github/workflows/        # validate.yml, preview.yml, render.yml, blender.yml
```

Conventions: TypeScript strict, React function components only, Python 3.11 with `ruff`, no default exports except Remotion compositions, every component has a story in `src/stories/` rendered by the screenshot test. Commits: conventional (`feat(engine): …`, `video(dashboard-lights): …`).

---

## 2. Toolchain and versions

| Tool | Version | Purpose |
| --- | --- | --- |
| Node | 20 LTS | Remotion |
| Remotion, @remotion/three, @remotion/cli | 4.x, pinned | Composition and render |
| three, @react-three/fiber, @react-three/drei | pinned | Tier 2 3D |
| maker.js | latest | Involute gear outlines |
| Python | 3.11 | pipeline/, cad/ |
| edge-tts | pinned | Narration |
| CadQuery | 2.x | Parametric parts → glTF |
| ffmpeg | 6.x (apt) | Concat, loudnorm, probes |
| Blender | 4.x LTS (tarball, cached) | Tier 3 only |
| Playwright | pinned | Screenshot tests |

All versions pinned in lockfiles. Renovate/Dependabot PRs must pass golden-frame tests (§10) before merge.

---

## 3. Visual system

**Canvas.** 1920×1080, 30 fps. 4K (3840×2160) only via `--scale=2` on hero videos. Safe area: 96 px margins; nothing text-bearing outside it.

**Tokens** (`src/theme/tokens.ts`):

| Token | Value | Use |
| --- | --- | --- |
| `bg` | `#F2F4F6` | Page background, every scene |
| `ink` | `#111318` | Primary text, outlines |
| `ink2` | `#5B6470` | Secondary text, leader lines |
| `bar` | `#1F6FEB` | Section bar, active highlight, links |
| `ghost` | `#C9CED6` at 0.35 | De-emphasised parts |
| `coolant` | `#22B07D` | Coolant paths |
| `oil` | `#E0A526` | Oil paths |
| `fuel` | `#2E86DE` | Fuel paths |
| `exhaust` | `#D9612B` | Exhaust paths, heat |
| `electric` | `#F2C94C` | Current, sensors |
| `fault` | `#D64545` | Faults, warnings, "stop driving" |
| `ok` | `#2FA36B` | Good states |
| `panel` | `#FFFFFF` | Cards, tables, insets |

One accent lit at a time; everything else `ghost`. That rule is the Animagraffs isolation principle and it applies to 2D schematics as well as 3D.

**Typography** (fonts committed under `src/theme/fonts/`, all SIL OFL): Inter for everything textual; IBM Plex Mono for numbers in `SpecStrip` and gauges. Sizes: section label 44/600; scene title 64/700; callout 36/500; body 28/400; caption 22/400. Never below 22 at 1080p.

**Section bar.** A 6 px × 44 px `bar` rectangle at (96, 72) with the section label to its right, present on every scene except title cards. It is the one element every reference channel lacks in common and it ties the five series together.

**Motion** (`src/theme/motion.ts`): enters use `spring({damping: 200, stiffness: 120})` over 12 frames; exits 8 frames linear fade; camera moves 45–90 frames ease-in-out; one thing moves at a time; nothing on screen that the narration is not about. Stroke weights: outlines 3 px, leader lines 2 px, flow paths 6 px.

**Thumbnail** (`GridThumb`): 1280×720, `bg`, a grid of item badges or the hero schematic at full width, title in Inter 700 at 96–120 px, `bar`-coloured keyword. Rendered from the same script data.

---

## 4. Pipeline overview

```
script.json ──validate──▶ tts (Brian) ──▶ timing.json ──▶ Remotion compositions ──▶ render (CI matrix)
                                 │                                                 │
                                 └── audio cache (hash of voice+rate+text) ────────┘
render ──▶ ffmpeg concat + loudnorm ──▶ qc.py (gates) ──▶ kit.py ──▶ GitHub Release (upload kit)
```

Commands (all idempotent, all runnable locally and in CI):

```
python pipeline/validate.py videos/<slug>      # schema, sources, word counts, assets, lexicon
python pipeline/tts.py videos/<slug>           # audio per beat + timing.json (cached)
npx remotion render <slug> --frames=a-b        # one matrix shard
python pipeline/concat.py videos/<slug>        # shards → mp4, loudnorm, probes
python pipeline/qc.py videos/<slug>            # gates; exit 1 on failure
python pipeline/kit.py videos/<slug>           # zip for the release
```

---

## 5. Script schema (`videos/<slug>/script.json`)

The only human-authored input. Validated by `pipeline/schema.json` (JSON Schema draft 2020-12) and typed in `src/lib/schema.ts`.

```json
{
  "slug": "every-dashboard-warning-light",
  "series": "every-x",                       // every-x | how-it-works | versus | why-does-my-car | what-happens-if
  "title": "Every Dashboard Warning Light Explained (and What to Do)",
  "alt_titles": ["Every Warning Light in Your Car, Explained", "What Every Dashboard Light Means"],
  "keyword": "dashboard warning lights explained",
  "target_minutes": 14,
  "tier": 1,                                 // 1 schematic | 2 three.js | 3 blender segments present
  "thumbnail": { "mode": "grid", "headline": "EVERY WARNING LIGHT", "accent": "bar" },
  "sources": [
    { "id": "iso2575", "title": "ISO 2575:2021 Road vehicles — Symbols for controls, indicators and tell-tales", "url": "https://www.iso.org/standard/68409.html" }
  ],
  "lexicon": { "Hyundai": "HUN-day", "Peugeot": "PUH-zho" },
  "intro":  { "narration": "There are more than sixty symbols a car can show you. Here is every one of them, what it means, and what to do." },
  "scenes": [
    {
      "id": "oil-pressure",
      "type": "item",                        // item | mechanism | compare | cause | beat | title
      "section": "Red lights: stop now",
      "narration": "The oil can. This is oil pressure, not oil level. If it comes on while driving, pull over and switch off within a minute.",
      "visual": { "component": "Dashboard", "props": { "lit": ["oil_pressure"], "cluster": "generic" } },
      "specs": [ { "label": "Colour", "value": "Red" }, { "label": "Action", "value": "Stop within 60 s", "emphasis": "fault" } ],
      "verdict": "Stop the car; do not drive to the garage.",
      "source": "iso2575",
      "cues": [ { "on": "pull over", "do": "Dashboard.flash", "args": { "symbol": "oil_pressure" } } ]
    }
  ],
  "outro": { "narration": "Next: every engine layout, explained the same way.", "next_slug": "every-engine-layout" }
}
```

Rules enforced by `validate.py`: every scene has `narration` ≥ 35 words (items) or ≥ 90 words (mechanism beats); every numeric `specs.value` has a `source` on the scene or the video; `cues[].on` phrases must appear verbatim in that scene's narration; every brand or part name in `lexicon` keys must appear in some narration; all `visual.component` names exist in the registry; no `assets/` file without an `ATTRIBUTION.md` entry; total narration words within ±10 % of `target_minutes × 150`.

---

## 6. Scene types

Six scene types cover all five series. Each is a React component in `src/scenes/` that takes `(scene, timing, theme)` and returns a `<Sequence>` whose duration is the beat's audio length plus a 12-frame tail.

| Type | Layout | Used by |
| --- | --- | --- |
| `title` | Scene title, section bar, optional subtitle; 60–90 frames | all |
| `item` | `ItemCard` top-left (badge, name, tag) · visual slot centre-right (any component instance, animating) · `SpecStrip` bottom-left · verdict line bottom · `ProgressRail` | Every X |
| `mechanism` | Full-bleed visual (2D `Mechanism` or `Scene3D`) · `Callout`s on word cues · `SourceCard` bottom-right when a figure is spoken | How It Works, What Happens If |
| `compare` | 2–3 identical component instances side by side with different `variant` props, shared clock · a label strip per column · optional `Table` reveal at end | Versus |
| `cause` | Symptom header pinned top · `CarSide` x-ray zoom to the part · fault animation · "check" panel · cost band · `DecisionTree` node highlight | Why Does My Car |
| `beat` | `Timeline` strip pinned top · mechanism visual driven by the timeline value · `Gauge` inset · optional photo inset with attribution caption | What Happens If |

Every scene type renders the section bar, honours the safe area, and reads word cues from `timing.json` through `useCue(phrase)` which returns the frame the phrase starts (or `null`, in which case the cue fires at scene start + 15 frames and `validate.py` has already warned).

---

## 7. Series compositions

`src/series/<series>.tsx` turns a script into a Remotion composition: `Intro → [scenes…] → Outro`, computing total frames from `timing.json`. Per-series rules:

**every-x.** 12–18 min, 15–36 `item` scenes, each 20–60 s. Intro renders `GridThumb` as the opening frame and counts the items. A `title` scene is inserted whenever `section` changes. The visual slot must animate: schematic components run their `drive()`; a static image is allowed only for brand photos.

**how-it-works.** 6–10 min, 5–8 `mechanism` beats plus a `title`. One system isolated per beat (`isolate` prop); camera or 2D viewport move per callout; at most two callouts on screen. Tier 1 uses `Mechanism2D`; Tier 2 wraps the same `drive()` in `Scene3D`. Final beat is always a full-system recap at 1.5× speed.

**versus.** 8–12 min. Opening `title`, then one `compare` scene per scenario (same scenario shown on every variant), then a `Table` scene, then a "which one for you" `DecisionTree` scene. Variants are rendered from one component with different props — never two different components.

**why-does-my-car.** 5–8 min. `title` with the symptom, 3–5 `cause` scenes (most likely first), a `compare`-style "narrow it down" matrix (conditions × causes), and a closing `cause`-type scene for the stop-driving threshold. Cost bands cite a source.

**what-happens-if.** 8–12 min. `title` sets the situation; `beat` scenes advance the `Timeline` (km, days, seconds); the mechanism visual takes a parameter from the timeline value (`oil: 0→1`, `fuel: "diesel"`, `temp`); a `SourceCard` on every quantitative claim; photo insets only where damage must be seen.

---

## 8. Narration: Edge TTS Brian

`pipeline/tts.py`:

1. For each of intro, scenes[], outro: text = narration with `lexicon` substitutions applied (phonetic respelling), numbers expanded per `num2words` rules in `pipeline/numbers.py` (years as "nineteen eighty-four", units spelled once).
2. `edge_tts.Communicate(text, voice="en-US-BrianNeural", rate="-5%")`; stream; collect audio and `WordBoundary` events.
3. Write `.cache/audio/<beat-id>.mp3`, then `ffmpeg` → 48 kHz WAV, high-pass 80 Hz, `acompressor` light, then two-pass `loudnorm` I=-14 LUFS, TP=-1 dBTP, LRA=11.
4. Write `.cache/timing.json`:
   ```json
   { "fps": 30, "beats": [ { "id": "oil-pressure", "start_frame": 912, "frames": 1284,
       "words": [ { "w": "The", "s": 0.00, "e": 0.11 }, … ] } ] }
   ```
   Offsets converted from 100-ns ticks to seconds; `start_frame` accumulates with a 12-frame gap between beats and 24 frames after `title` scenes.
5. Cache key = sha256(voice, rate, processed text). Cache hit skips synthesis. CI restores the cache; the release zip includes the audio so a published video can always be re-rendered identically.
6. `--voice` flag accepts `kokoro:<id>` as the fallback engine; the engine actually used is written to `.cache/tts-meta.json` and into the QC report.

A 250 ms room-tone bed (`src/theme/roomtone.wav`, -60 dBFS pink noise) runs under the whole composition.

---

## 9. Component APIs

All components: pure, deterministic, `props → SVG/Three nodes`, no internal randomness (seeded `src/lib/rand.ts` only). Each exposes `drive(frame, props) → state` separately from `render(state)` so the same kinematics serve 2D and 3D.

```ts
// Engine
type EngineProps = {
  layout: "I3"|"I4"|"I5"|"I6"|"V6"|"V8"|"V10"|"V12"|"W16"|"boxer4"|"boxer6"|"rotary";
  bankAngle?: number;            // degrees; derived from layout if omitted
  rpm: number;                   // drives crank angle per frame
  view: "cross"|"side"|"front"|"exploded";
  isolate?: "none"|"fuel"|"air"|"coolant"|"oil"|"exhaust"|"ignition"|"valvetrain";
  strokesColored?: boolean;      // intake/compression/power/exhaust tints
  oil?: number;                  // 0 clean … 1 sludge (What Happens If)
  temp?: number;                 // 0 cold … 1 overheating
  fuel?: "petrol"|"diesel"|"e85"|"wrong";
  cutaway?: number;              // 0 closed … 1 open (3D only)
  explode?: number;              // 0 assembled … 1 exploded
  highlight?: string[];          // part ids
};
// kinematics (shared): theta = 2π·rpm/60 · t; piston y = r·cosθ + sqrt(l² − r²·sin²θ);
// firing order per layout in src/lib/kinematics/firing.ts; cam lift from a 4-point cam profile.

// GearTrain
type GearTrainProps = {
  variant: "manual5"|"manual6"|"planetary"|"cvt"|"dct"|"torqueConverter"|"ecvt"|"diffOpen"|"diffLSD";
  inputRpm: number; gear?: number; ratio?: number;  // cvt uses ratio continuously
  throttle?: number; clutch?: number;               // 0..1
  isolate?: "none"|"input"|"output"|"clutch"|"planetary";
  highlight?: string[];
};
// gears: maker.js involute outlines from tooth counts; mesh rotation = −(zA/zB)·θA

// FlowLoop
type FlowLoopProps = {
  system: "coolant"|"refrigerant"|"fuel"|"oil"|"exhaust"|"evap"|"brakeHydraulic"|"intake";
  nodes: Array<{id:string; label:string; x:number; y:number; kind:"pump"|"tank"|"radiator"|"valve"|"injector"|"cat"|"filter"|"generic"}>;
  edges: Array<{from:string; to:string; path?: string}>;   // SVG path override
  flow: number;              // particles per second
  temperature?: number;      // tints particles cold→hot
  blocked?: string[];        // edge ids rendered as fault
  gauges?: Array<{at:string; label:string; value:number; min:number; max:number; unit:string}>;
};

// Chassis
type ChassisProps = {
  variant: "fwd"|"rwd"|"awd"|"4wd"|"4wdLocked";
  view: "top"|"threeQuarter";
  scenario?: "dry"|"snow"|"corner"|"hill"|"puddleFrontLeft";
  torque: number;            // arrow density along the driven path
  slip?: Partial<Record<"fl"|"fr"|"rl"|"rr", number>>;
  isolate?: "none"|"engine"|"gearbox"|"shafts"|"diffs"|"transferCase";
  suspension?: { type: "macpherson"|"doubleWishbone"|"multilink"|"solidAxle"|"torsionBeam"; bump?: number };
};

// Circuit
type CircuitProps = {
  system: "starting"|"charging"|"ignition"|"lighting"|"startStop"|"airbag"|"abs";
  state: Record<string, number|boolean>;   // e.g. { keyOn: true, cranking: true, batteryV: 12.6 }
  isolate?: string; highlight?: string[]; drain?: number;  // parasitic draw, A
};

// Dashboard (IconSet)
type DashboardProps = {
  cluster: "generic"|"minimal";
  lit: string[];                 // symbol ids from icons/manifest.json (ISO 2575 names)
  flash?: string[];              // blinking symbols
  needles?: { speed?: number; rpm?: number; temp?: number; fuel?: number };
  focus?: string;                // zoom to one symbol
};

// CarSide
type CarSideProps = {
  body: "sedan"|"hatch"|"suv"|"pickup"|"coupe"|"wagon"|"van";
  xray?: number;                 // 0 opaque … 1 x-ray
  focus?: { part: string; zoom: number };   // part ids: rotor_fl, hub_rl, catalyst, tank, battery, …
  fault?: { part: string; kind: "wobble"|"leak"|"heat"|"play"|"crack" };
  motion?: { speedKph: number; braking?: boolean; turning?: -1|0|1 };
};

// Timeline, Chart, DecisionTree, Scene3D, Table, Gauge: see src/components/*/README.md (same conventions).
```

`Scene3D` (Tier 2): props `{ model: string (glTF path); drive: (frame) => PartStates; isolate; cutaway; explode; camera: Keyframe[]; labels: Array<{part:string; text:string; from:number; to:number}> }`. Materials: `ghost` (`MeshStandardMaterial`, color `ghost`, transparent, opacity 0.15, depthWrite false) and `lit` (system colour, emissiveIntensity 0.35). Clipping: a single `THREE.Plane` on the block group with `renderer.localClippingEnabled`. Labels: project the part's world position each frame with `Vector3.project(camera)` and draw the leader line in an SVG overlay. Lighting: `Environment` from a Poly Haven HDRI (CC0, committed at 1k), `ContactShadows`. Outline: `@react-three/postprocessing` `Outline` on highlighted parts, thickness 2.

`cad/`: one Python module per family (`engine.py`, `gears.py`, `chassis.py`, `turbo.py`) producing glTF with named nodes and a `parts.json` manifest (id, label, explodeVector, system). Generated artefacts are cached in CI by the hash of the generating script and committed only as small (< 2 MB) binaries.

---

## 10. Quality gates (`pipeline/qc.py`, run in `render`)

| Check | Threshold | Fails build |
| --- | --- | --- |
| Resolution / fps / codec | 1920×1080 (or 3840×2160), 30 or 60 fps, H.264 High, `yuv420p`, CRF 18, GOP 60 | yes |
| Audio | AAC 48 kHz 192 kbps; `ebur128` I within -14 ± 1 LUFS; TP ≤ -1 dBTP | yes |
| Duration | within ±10 % of `target_minutes` | yes |
| Segment lengths | every-x items 20–60 s; mechanism beats 40–120 s | yes |
| Captions | `captions.srt` present, last cue within 2 s of end, no cue > 7 s or > 84 chars/line | yes |
| Sources | every numeric spec resolves to a source; `SourceCard` rendered at least once per quantitative beat | yes |
| Text fit | Playwright screenshot of each scene's key frame; no text node overflows its box or the safe area | yes |
| Golden frames | 10 named frames per video; per-pixel diff ≤ 0.5 % vs committed PNGs | yes (regenerate deliberately with `--update-golden`) |
| Cues | every `cues[].on` resolved from timing (not fallback) | warn → yes after video 3 |
| Lexicon | every lexicon key spoken at least once; no unknown proper noun (dictionary check) | warn |
| Motion | no scene with zero animated nodes for > 6 s | yes |

`qc.py` writes `qc-report.md` (tables above, the contact sheet, LUFS graph) into the kit.

---

## 11. GitHub Actions

Common: `ubuntu-latest` (4 vCPU / 16 GB on public repos), `actions/setup-node@v4` (20, cache npm), `actions/setup-python@v5` (3.11, cache pip), `actions/cache` for `~/.cache/remotion` (Chromium), `cad/.out`, `videos/*/.cache/audio`, Blender tarball. Concurrency group per slug so a new push cancels an in-flight preview.

**validate.yml** — on `push`, `pull_request`. Steps: install → `ruff` + `tsc` + `vitest` → `validate.py` for every changed `videos/*` → Playwright story screenshots → upload contact sheet. ~4 min.

**preview.yml** — on `pull_request` touching `videos/<slug>/**`. Steps: validate → `tts.py` (cache) → `remotion render <slug> --scale=0.333 --crf=28` → `qc.py --preview` (skips resolution/CRF checks) → upload `preview.mp4`, `captions.srt`, `contact.png`, `qc-report.md` as an artifact; comment on the PR with the artifact link and the QC table. ~10 min.

**render.yml** — on `workflow_dispatch` with input `slug`, or on PR merge with label `release`. Jobs:
1. `plan`: `tts.py` (cache), compute total frames, emit a matrix of N shards (`N = ceil(frames / 2700)`, i.e. ~90 s per shard, capped at 16).
2. `shard` (matrix): `remotion render <slug> --frames=a-b --gl=angle --concurrency=4 --output shard-<i>.mp4`; upload artifact.
3. `assemble`: download shards → `concat.py` (ffmpeg concat demuxer, re-mux audio from the normalised master, `-movflags +faststart`) → `qc.py` → `kit.py` → `softprops/action-gh-release` creating release `v<slug>` with `<slug>-kit.zip`, `qc-report.md`, `preview.mp4`. Fails loudly if any gate fails; nothing is released.

**blender.yml** — on `workflow_dispatch` with `slug`, `segment`, `frames`. Matrix of 8 shards: install Blender from cached tarball → `blender -b blender/<segment>.blend -P blender/render.py -- --start a --end b --samples 64 --denoise` → PNG sequence artifact → `assemble-blender` job encodes `segment.mp4` (CRF 16) and uploads it as a workflow artifact that `render.yml` consumes via `actions/download-artifact` with `run-id`. Tier 3 segments are referenced in `script.json` as `{ "visual": { "component": "Clip", "props": { "artifact": "blender:<segment>" } } }`.

No workflow has access to anything but `GITHUB_TOKEN` and `ASSETS_RELEASE_TOKEN` (read-only, private asset repo). Both are scoped to the repository.

---

## 12. Public-repo rules

- `LICENSE` (MIT) covers `src/`, `pipeline/`, `cad/`, `blender/`, `tests/`, `.github/`.
- `CONTENT-LICENSE.md` (all rights reserved) covers `videos/**` narration text, generated images and every rendered output. Stated in README and in each `videos/<slug>/ATTRIBUTION.md` header.
- Allowed in-repo assets: anything generated by code; CC0 and CC-BY files with an `ATTRIBUTION.md` line (title, author, licence, URL). Never: press-kit logos or photos, marketplace models, screenshots of other channels.
- Press-kit material is fetched by `pipeline/assets.py` from the private release `assets/<slug>` using `ASSETS_RELEASE_TOKEN`; on failure the scene renders the `CarSide` silhouette with a wordmark card instead and QC records the fallback.
- `.gitignore`: `videos/*/.cache/`, `cad/.out/`, `*.mp4`, `*.wav`, `*.blend1`.
- Secret scanning and Dependabot on; branch protection on `main` requires `validate` green.

---

## 13. Upload kit (`pipeline/kit.py`)

Produces `<slug>-kit.zip`:

| File | Built from |
| --- | --- |
| `<slug>.mp4` | assembled render |
| `thumbnail.png` | `GridThumb` still at 1280×720 |
| `title.txt` | `title` + `alt_titles` |
| `description.md` | template: hook (first narration sentence) · chapters from `timing.json` scene starts (`mm:ss Title`) · "Sources" from `sources[]` · "Attributions" from `ATTRIBUTION.md` · standard disclaimer for maintenance topics · series playlist line |
| `tags.txt` | `keyword` + autocomplete cluster for the topic from the research workbook (15–20) |
| `captions.srt` | from `timing.json`, sentence-chunked, ≤ 84 chars/line, ≤ 7 s |
| `endscreen.json` | `{ "next_slug", "start_frame": total − 600 }` |
| `qc-report.md` | from `qc.py` |

Manual upload checklist lives in `docs/UPLOAD-CHECKLIST.md` and is printed at the end of the `assemble` job log.

---

## 14. Milestones and definition of done

**M0 — Skeleton (days 1–3).** Repo, licences, toolchain pinned, `validate.yml` green on an empty `videos/_example`, theme tokens and fonts, `SectionBar`, `TitleCard`, `ItemCard`, `SpecStrip`, `Callout`, `SourceCard`, `ProgressRail`, `GridThumb`, `Intro`, `Outro`, `useCue`. Done when a 20-second `every-x` composition with two placeholder items renders in `preview.yml`.

**M1 — Video 1: Every Dashboard Warning Light (days 4–10).** `icons/` with ≥ 60 ISO 2575 symbols drawn as SVG + `manifest.json`; `Dashboard` component; `tts.py` with Brian, caching, loudnorm, `timing.json`; `every-x` series builder; `qc.py` full; `render.yml` with matrix and release; `kit.py`. Done when the release `v-every-dashboard-warning-light` exists with a kit that passes every gate and is uploaded by hand.

**M2 — Engine and flow (days 11–20).** `Engine` (2D, all layouts, strokes, isolate, oil/temp/fuel params), `FlowLoop`, `CarSide`, `DecisionTree`, `cause` and `beat` scene types, `why-does-my-car` and `what-happens-if` builders. Videos 2–6 released.

**M3 — Gears and 3D (days 21–32).** `GearTrain`, `compare` scene, `versus` builder, `cad/engine.py` + `cad/gears.py` → glTF, `Scene3D` with ghost/lit materials, clipping cutaway, explode, camera keyframes, projected labels. Videos 7–11 released; the turbo video is the first Tier 2 release.

**M4 — Breadth (days 33–45).** `Circuit`, `Chassis`, `Timeline`/`Chart` ported, `Table`; videos 12–15; first retro in `docs/retros/`; `blender.yml` proven on a 10-second test segment.

Definition of done for any video: `script.json` merged with a green preview, release created by `render.yml` with all gates passing, kit downloaded and uploaded by hand, row updated in the tracker, golden frames committed.

---

## 15. Working agreement for Claude Code

- Read `script.json` and this document before touching a series builder; never change a component's public props without updating §9 and its README.
- Prefer adding a `variant` to an existing component over creating a new one.
- Every new component ships with: a story, a screenshot test, a `drive()` unit test, a README with the prop table.
- Never download an asset into the repo without adding its `ATTRIBUTION.md` line; when in doubt, generate it.
- Never add a YouTube API call, an upload step, or an unpinned dependency.
- Keep renders reproducible: seeded randomness only, committed fonts, no network calls at render time except `assets.py`.
- When a gate blocks, fix the cause; do not lower the threshold in the same PR.
