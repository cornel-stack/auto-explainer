# Engine (2D, Tier 1)

A parametric inline-4 cross-section schematic. `drive(frame, fps, props)`
computes state from real crank-slider kinematics; `Engine` renders the state to
SVG. No internal randomness — the same inputs render the same pixels (Spec §9).

## Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `layout` | `"I4"` | — | Engine layout (only I4 in Tier 1). |
| `rpm` | `number` | — | Crank revs/min. Drives crank angle per frame. Use 24–60 for teaching beats, 90–120 for the recap. |
| `view` | `"cross"` | `"cross"` | Cross-section view. |
| `isolate` | `"none"\|"intake"\|"exhaust"\|"valvetrain"\|"ignition"\|"crank"` | `"none"` | Lights one system; everything else is ghosted (Animagraffs isolation principle, Spec §3). |
| `strokesColored` | `boolean` | `false` | Tints each chamber by its current four-stroke phase (intake blue, compression orange, power red, exhaust grey). |
| `focusCylinder` | `number` | — | 0–3; ghosts the other three cylinders so one is read in isolation. |
| `highlight` | `string[]` | `[]` | System names to force-light even while isolating. |
| `startDeg` | `number` | `0` | Crank angle of cylinder 1 at frame 0. |

## Kinematics

- `θ = startDeg + 360·(rpm/60)·(frame/fps)` — cylinder-1 crank angle.
- Piston pin distance from crank centre: `d = r·cosθ + √(l² − r²·sin²θ)`.
- Firing order **1-3-4-2** → 720° phase per cylinder `{0, 540, 180, 360}`.
- Four strokes by phase φ: `[0,180)` intake · `[180,360)` compression ·
  `[360,540)` power · `[540,720)` exhaust.
- Valve lift is a raised-cosine lobe; camshaft turns at half crank speed.
- Spark flashes near φ≈358° (end of compression).

## Callout anchors

`engineAnchors(cyl)` returns canvas coordinates for `Callout` leader lines:
`intakeValve`, `exhaustValve`, `sparkPlug`, `cam`, `piston`, `crank`,
`chamber`, `rod`.
