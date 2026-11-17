// Motion — Technical Spec §3. One thing moves at a time; nothing on screen
// that the narration is not about.
import {interpolate, spring} from 'remotion';

export const ENTER_FRAMES = 12;
export const EXIT_FRAMES = 8;
export const CAMERA_MIN = 45;
export const CAMERA_MAX = 90;

// Standard element enter: spring in over 12 frames.
export const enter = (frame: number, fps: number, delay = 0): number =>
  spring({
    frame: frame - delay,
    fps,
    config: {damping: 200, stiffness: 120},
    durationInFrames: ENTER_FRAMES,
  });

// Standard element exit: linear fade over 8 frames ending at `endFrame`.
export const exitFade = (frame: number, endFrame: number): number =>
  interpolate(frame, [endFrame - EXIT_FRAMES, endFrame], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

// Combined opacity for an element present for the whole scene.
export const presence = (
  frame: number,
  fps: number,
  durationInFrames: number,
  delay = 0
): number => {
  const e = enter(frame, fps, delay);
  const x = exitFade(frame, durationInFrames);
  return Math.min(e, x);
};

// Ease-in-out camera / viewport move over [from,to] frames, value 0..1.
export const cameraEase = (frame: number, from: number, to: number): number =>
  interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * (3 - 2 * t), // smoothstep
  });
