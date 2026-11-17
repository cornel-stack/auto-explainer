import {createContext, useContext} from 'react';
import type {TimedBeat, Timing} from './schema';

export const secondsToFrames = (seconds: number, fps: number): number =>
  Math.round(seconds * fps);

export const framesToSeconds = (frames: number, fps: number): number =>
  frames / fps;

// Context: the beat currently rendering, so useCue can resolve word times
// local to that beat's <Sequence>.
export interface BeatContextValue {
  beat: TimedBeat | null;
  fps: number;
}

export const BeatContext = createContext<BeatContextValue>({
  beat: null,
  fps: 30,
});

const normalize = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

// Find the frame (relative to the beat's Sequence start) where `phrase` begins
// in the narration. Returns null if not found — callers fall back to a fixed
// offset and validate.py has already warned.
export const findCueFrame = (
  beat: TimedBeat | null,
  fps: number,
  phrase: string
): number | null => {
  if (!beat) return null;
  const target = normalize(phrase);
  if (target.length === 0) return null;
  const words = beat.words.map((w) => ({...w, n: normalize(w.w)[0] ?? ''}));
  for (let i = 0; i <= words.length - target.length; i++) {
    let match = true;
    for (let j = 0; j < target.length; j++) {
      if (words[i + j]?.n !== target[j]) {
        match = false;
        break;
      }
    }
    if (match) return secondsToFrames(words[i]!.s, fps);
  }
  return null;
};

// Hook used by scenes/components to place callouts on the narrated word.
export const useCue = (phrase: string): number | null => {
  const {beat, fps} = useContext(BeatContext);
  return findCueFrame(beat, fps, phrase);
};

export const FALLBACK_CUE_FRAME = 15;

export const getBeat = (timing: Timing, id: string): TimedBeat | undefined =>
  timing.beats.find((b) => b.id === id);
