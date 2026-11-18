// Types for the authored script.json (Technical Spec §5) and the generated
// timing.json (§8). Kept in sync with pipeline/schema.json.

export type Series =
  | 'every-x'
  | 'how-it-works'
  | 'versus'
  | 'why-does-my-car'
  | 'what-happens-if';

export type SceneType =
  | 'title'
  | 'item'
  | 'mechanism'
  | 'compare'
  | 'cause'
  | 'beat';

export interface Source {
  id: string;
  title: string;
  url: string;
}

export interface Spec {
  label: string;
  value: string;
  emphasis?: 'fault' | 'ok' | 'bar';
}

export interface Cue {
  on: string; // phrase that must appear verbatim in this scene's narration
  do: string; // "Component.method"
  args?: Record<string, unknown>;
}

export interface Visual {
  component: string;
  props: Record<string, unknown>;
}

export interface Scene {
  id: string;
  type: SceneType;
  section?: string;
  title?: string;
  narration: string;
  visual: Visual;
  specs?: Spec[];
  verdict?: string;
  source?: string;
  isolate?: string;
  cues?: Cue[];
}

export interface Thumbnail {
  mode: 'grid' | 'hero';
  headline: string;
  accent: 'bar' | 'fault' | 'ok';
}

export interface Script {
  slug: string;
  series: Series;
  title: string;
  alt_titles: string[];
  keyword: string;
  target_minutes: number;
  tier: 1 | 2 | 3;
  theme?: 'light' | 'dark';
  thumbnail: Thumbnail;
  sources: Source[];
  lexicon: Record<string, string>;
  intro: {narration: string};
  scenes: Scene[];
  outro: {narration: string; next_slug?: string};
}

// timing.json — produced by pipeline/tts.py
export interface TimedWord {
  w: string;
  s: number; // seconds
  e: number; // seconds
}

export interface TimedBeat {
  id: string;
  start_frame: number;
  frames: number;
  words: TimedWord[];
}

export interface Timing {
  fps: number;
  beats: TimedBeat[];
}
