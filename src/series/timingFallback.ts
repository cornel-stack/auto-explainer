import type {Script, Timing, TimedBeat} from '../lib/schema';

// Dev-only: when no timing.json is supplied (Remotion Studio without running
// tts.py), estimate beat lengths from word counts so the composition still
// renders. CI always supplies the real timing; this never ships.
const WORDS_PER_SEC = 2.5;
const TAIL = 12;

export const synthTiming = (script: Script, fps: number): Timing => {
  const units: {id: string; text: string; title: boolean}[] = [
    {id: 'intro', text: script.intro.narration, title: false},
    ...script.scenes.map((s) => ({
      id: s.id,
      text: s.narration,
      title: s.type === 'title',
    })),
    {id: 'outro', text: script.outro.narration, title: false},
  ];

  const beats: TimedBeat[] = [];
  let cursor = 0;
  for (const u of units) {
    const words = u.text.trim().split(/\s+/).filter(Boolean);
    const seconds = Math.max(2, words.length / WORDS_PER_SEC);
    const audioFrames = Math.ceil(seconds * fps);
    const frames = audioFrames + (u.title ? TAIL * 2 : TAIL);
    // Rough word timings spread evenly across the audio portion.
    const per = seconds / Math.max(1, words.length);
    beats.push({
      id: u.id,
      start_frame: cursor,
      frames,
      words: words.map((w, i) => ({w, s: i * per, e: (i + 1) * per})),
    });
    cursor += frames;
  }
  return {fps, beats};
};
