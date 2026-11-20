// Cinematic dark register — a full replacement for the light/blue look.
// Deep near-black stage, vivid glowing accents, filmic grain. Everything here
// is deterministic (frame-driven) so CI renders reproduce exactly.

export const CINEMA = {
  // Stage / surfaces
  bg0: '#05070D', // deepest base
  bg1: '#0A0F1E', // mid
  bg2: '#131B30', // panels / cards
  bg3: '#1B2440', // raised panels
  line: '#2A3450', // hairlines, grid
  ink: '#F4F7FD', // primary text
  ink2: '#9AA7C2', // secondary text
  ink3: '#5E6B88', // tertiary / captions

  // Vivid accents (glow against the dark)
  fuel: '#3DA5FF', // regular / ordinary fuel (electric blue)
  premium: '#FFB020', // premium grade (gold)
  power: '#FF5A5F', // power / knock / fault (red)
  ok: '#2FE6A8', // good / verdict-OK (green)
  electric: '#FFE14D', // spark / ignition (yellow)
  violet: '#9A86FF', // accent / section
  cyan: '#38E1D6', // data / cool accent
} as const;

export type CinemaAccent =
  | 'fuel'
  | 'premium'
  | 'power'
  | 'ok'
  | 'electric'
  | 'violet'
  | 'cyan';

export const accentColor = (a: CinemaAccent | undefined, fallback = CINEMA.cyan): string =>
  a ? CINEMA[a] : fallback;

// A glow (text or box) from an accent, tuned for the dark stage.
export const glow = (color: string, strength = 1): string =>
  `0 0 ${10 * strength}px ${color}AA, 0 0 ${28 * strength}px ${color}66`;

export const textGlow = (color: string, strength = 1): string =>
  `0 0 ${8 * strength}px ${color}AA, 0 0 ${22 * strength}px ${color}55`;

// Display + mono type. Inter is committed (OFL); we lean on heavy weights,
// tight tracking and glow instead of a new font file.
export const DISPLAY = {
  hero: {size: 132, weight: 800, tracking: -3},
  title: {size: 92, weight: 800, tracking: -2},
  headline: {size: 64, weight: 700, tracking: -1},
  sub: {size: 36, weight: 500, tracking: 0},
  label: {size: 26, weight: 600, tracking: 2},
  caption: {size: 24, weight: 400, tracking: 0},
  stat: {size: 180, weight: 800, tracking: -4},
} as const;
