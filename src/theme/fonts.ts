import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// Committed fonts, loaded deterministically (no network at render) — Spec §3.
export const FONT_SANS = 'Inter';
export const FONT_MONO = 'IBM Plex Mono';

let loaded: Promise<void> | null = null;

// Idempotent: Remotion calls this from every composition's calculateMetadata.
export const ensureFonts = (): Promise<void> => {
  if (loaded) return loaded;
  loaded = Promise.all([
    loadFont({
      family: FONT_SANS,
      url: staticFile('fonts/Inter.ttf'),
      weight: '100 900',
    }),
    loadFont({
      family: FONT_MONO,
      url: staticFile('fonts/IBMPlexMono-Regular.ttf'),
      weight: '400',
    }),
    loadFont({
      family: FONT_MONO,
      url: staticFile('fonts/IBMPlexMono-SemiBold.ttf'),
      weight: '600',
    }),
  ]).then(() => undefined);
  return loaded;
};
