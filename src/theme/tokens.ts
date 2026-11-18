// Visual system — Technical Spec §3. One accent lit at a time; everything else ghost.
import {FONT_MONO, FONT_SANS} from './fonts';

export const COLORS = {
  bg: '#F2F4F6', // page background, every scene
  ink: '#111318', // primary text, outlines
  ink2: '#5B6470', // secondary text, leader lines
  bar: '#1F6FEB', // section bar, active highlight, links
  ghost: '#C9CED6', // de-emphasised parts (used at 0.35 opacity)
  coolant: '#22B07D',
  oil: '#E0A526',
  fuel: '#2E86DE',
  exhaust: '#D9612B',
  electric: '#F2C94C',
  fault: '#D64545',
  ok: '#2FA36B',
  panel: '#FFFFFF', // cards, tables, insets
} as const;

export const GHOST_OPACITY = 0.35;

// Dark register (hero 3D videos). Accents (bar, fuel, fault, …) stay the same —
// they pop against the dark background.
export const DARK = {
  bg: '#0B0E13', // near-black page background
  bgTop: '#161B24', // top of the subtle vignette
  ink: '#EEF1F5', // primary text on dark
  ink2: '#9AA3AF', // secondary text on dark
  panel: '#1B2029', // cards on dark
  ghost: '#59606C', // de-emphasised 3D parts on dark
} as const;

// Four-stroke chamber tints (Spec §5 / Production Plan): intake blue,
// compression orange, power red, exhaust grey.
export const STROKE_COLORS = {
  intake: COLORS.fuel,
  compression: COLORS.oil,
  power: COLORS.fault,
  exhaust: COLORS.ink2,
} as const;

export type StrokeName = keyof typeof STROKE_COLORS;

// Canvas — Spec §3
export const CANVAS = {
  width: 1920,
  height: 1080,
  fps: 30,
  safe: 96, // safe-area margin; nothing text-bearing outside it
} as const;

// Typography — Spec §3. [size, weight]. Never below 22 at 1080p.
export const TYPE = {
  family: FONT_SANS,
  mono: FONT_MONO,
  sectionLabel: {size: 44, weight: 600},
  sceneTitle: {size: 64, weight: 700},
  callout: {size: 36, weight: 500},
  body: {size: 28, weight: 400},
  caption: {size: 22, weight: 400},
} as const;

// Stroke weights — Spec §3
export const STROKE = {
  outline: 3,
  leader: 2,
  flow: 6,
} as const;
