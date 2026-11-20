// Choreography engine — turns a beat from one static tableau into a timeline of
// actions locked to the narration. Each `step` fires on a spoken phrase (`cue`,
// resolved to a frame via timing.json word-timings) or a fractional time, and
// drives a motivated 2D camera, a progressive reveal, a contaminant front, and
// a highlight. This is what makes the diagram build *as the narrator speaks*.

import {findCueFrame} from './timing';
import type {TimedBeat} from './schema';

export interface ChoreoStep {
  cue?: string; // phrase in this beat's narration → exact frame
  at?: number; // 0..1 of the beat, fallback when no cue resolves
  focus?: string; // anchor id to push the camera to ("center" = whole frame)
  zoom?: number; // camera zoom at this step
  reach?: number; // 0..1 contaminant front position
  reveal?: number; // how many elements are revealed by now
  highlight?: string; // element id to spotlight (sticky until changed)
}

export interface ChoreoState {
  cam: {x: number; y: number; zoom: number};
  reach: number;
  revealCount: number;
  highlight?: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

const CAM_EASE_FRAMES = 26;

type Resolved = ChoreoStep & {frame: number};

export interface ResolvedChoreo {
  idx: number;
  prev: Resolved;
  cur: Resolved;
  next: Resolved;
  camT: number; // 0..1 ease since the current step fired
  reach: number;
  revealCount: number;
  highlight?: string;
}

// Resolve steps to frames (cue → word time, else fractional) and return the
// active step + easing — the generic core used by both the 2D camera and the
// 3D flythrough camera.
export function resolveChoreo(
  frame: number,
  fps: number,
  beat: TimedBeat | null,
  beatFrames: number,
  steps: ChoreoStep[]
): ResolvedChoreo {
  const n = Math.max(1, steps.length);
  const resolved: Resolved[] = steps.map((s, i) => {
    let fr = s.cue ? findCueFrame(beat, fps, s.cue) : null;
    if (fr == null) fr = Math.round((s.at ?? i / n) * beatFrames);
    return {...s, frame: fr};
  });
  for (let i = 1; i < resolved.length; i++) {
    if (resolved[i]!.frame <= resolved[i - 1]!.frame) resolved[i]!.frame = resolved[i - 1]!.frame + 8;
  }
  let idx = 0;
  for (let i = 0; i < resolved.length; i++) if (frame >= resolved[i]!.frame) idx = i;
  const cur = resolved[idx]!;
  const prev = resolved[Math.max(0, idx - 1)]!;
  const next = resolved[Math.min(resolved.length - 1, idx + 1)]!;
  const camT = smooth(clamp((frame - cur.frame) / CAM_EASE_FRAMES, 0, 1));

  let reach = cur.reach ?? 0;
  if (next.frame > cur.frame && next.reach != null) {
    const rt = clamp((frame - cur.frame) / (next.frame - cur.frame), 0, 1);
    reach = lerp(cur.reach ?? 0, next.reach, rt);
  }
  let highlight: string | undefined;
  for (let i = 0; i <= idx; i++) if (resolved[i]!.highlight) highlight = resolved[i]!.highlight;

  return {idx, prev, cur, next, camT, reach, revealCount: cur.reveal ?? steps.length, highlight};
}

export {lerp as _lerp, smooth as _smooth};

export function computeChoreo(
  frame: number,
  fps: number,
  beat: TimedBeat | null,
  beatFrames: number,
  steps: ChoreoStep[],
  anchors: Record<string, {x: number; y: number}>
): ChoreoState {
  const n = Math.max(1, steps.length);
  // Resolve each step to a frame (cue → word time, else fractional fallback),
  // then force a strictly increasing order.
  const resolved = steps.map((s, i) => {
    let fr = s.cue ? findCueFrame(beat, fps, s.cue) : null;
    if (fr == null) fr = Math.round((s.at ?? i / n) * beatFrames);
    return {...s, frame: fr};
  });
  for (let i = 1; i < resolved.length; i++) {
    if (resolved[i]!.frame <= resolved[i - 1]!.frame) resolved[i]!.frame = resolved[i - 1]!.frame + 8;
  }

  // Active step = latest whose frame has passed.
  let idx = 0;
  for (let i = 0; i < resolved.length; i++) if (frame >= resolved[i]!.frame) idx = i;
  const cur = resolved[idx]!;
  const prev = resolved[Math.max(0, idx - 1)]!;
  const next = resolved[Math.min(resolved.length - 1, idx + 1)]!;

  const anchorOf = (f?: string) => (f && anchors[f]) ? anchors[f]! : {x: 960, y: 540};

  // Camera eases from the previous focus to the current focus on each step.
  const camT = smooth(clamp((frame - cur.frame) / CAM_EASE_FRAMES, 0, 1));
  const a = anchorOf(prev.focus ?? cur.focus);
  const b = anchorOf(cur.focus ?? prev.focus);
  const cam = {
    x: lerp(a.x, b.x, camT),
    y: lerp(a.y, b.y, camT),
    zoom: lerp(prev.zoom ?? 1, cur.zoom ?? 1, camT),
  };

  // Contaminant front flows continuously between this step and the next.
  let reach = cur.reach ?? 0;
  if (next.frame > cur.frame && next.reach != null) {
    const rt = clamp((frame - cur.frame) / (next.frame - cur.frame), 0, 1);
    reach = lerp(cur.reach ?? 0, next.reach, rt);
  }

  const revealCount = cur.reveal ?? steps.length;

  let highlight: string | undefined;
  for (let i = 0; i <= idx; i++) if (resolved[i]!.highlight) highlight = resolved[i]!.highlight;

  return {cam, reach, revealCount, highlight};
}
