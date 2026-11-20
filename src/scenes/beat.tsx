import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme/tokens';
import {useTheme} from '../theme/theme';
import {SectionBar} from '../chrome/SectionBar';
import {SourceCard} from '../chrome/SourceCard';
import {SpecStrip} from '../chrome/SpecStrip';
import {Callout} from '../chrome/Callout';
import {ProgressRail} from '../chrome/ProgressRail';
import {COMPONENTS} from '../components/registry';
import {FALLBACK_CUE_FRAME, findCueFrame} from '../lib/timing';
import type {Scene, Source, TimedBeat} from '../lib/schema';

// `beat` scene — a single 2D data/schematic component held full-bleed while the
// narration explains it, with the section bar, the figures as a SpecStrip, and
// a SourceCard when a number is cited (Spec §6). Used by Versus for the knock
// curve, the timing-advance bars, the AAA deltas, the verdict Table and the
// find-your-number DecisionTree. Callouts are optional and placed at explicit
// canvas coordinates passed in the cue args (these components self-label).
export const BeatScene: React.FC<{
  scene: Scene;
  beat: TimedBeat | null;
  source?: Source;
  globalStart: number;
  totalFrames: number;
}> = ({scene, beat, source, globalStart, totalFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const theme = useTheme();

  const Visual = COMPONENTS[scene.visual.component];
  const beatFrames = beat?.frames ?? 300;

  const callouts = (scene.cues ?? [])
    .filter((c) => c.do === 'callout' && c.args && 'atX' in c.args)
    .map((c) => {
      const resolved = findCueFrame(beat, fps, c.on);
      const a = c.args ?? {};
      return {
        appearAt: resolved ?? FALLBACK_CUE_FRAME,
        text: String(a.text ?? ''),
        side: (a.side as 'left' | 'right' | 'top' | 'bottom') ?? 'top',
        accent: (a.accent as keyof typeof COLORS) ?? 'ink',
        at: {x: Number(a.atX), y: Number(a.atY)},
      };
    })
    .sort((x, y) => x.appearAt - y.appearAt);
  const visible = callouts.filter((c) => frame >= c.appearAt).slice(-2);

  const progress = (globalStart + frame) / totalFrames;
  const background = theme.dark
    ? `radial-gradient(125% 115% at 60% 28%, ${theme.bgTop} 0%, ${theme.bg} 60%)`
    : theme.bg;

  return (
    <AbsoluteFill style={{background}}>
      {Visual ? <Visual {...scene.visual.props} beatFrames={beatFrames} /> : null}

      {scene.section ? <SectionBar label={scene.section} /> : null}

      {visible.map((c, i) => (
        <Callout
          key={`${c.text}-${i}`}
          text={c.text}
          at={c.at}
          side={c.side}
          accent={c.accent}
          appearAt={c.appearAt}
        />
      ))}

      {scene.specs && scene.specs.length > 0 ? (
        <SpecStrip specs={scene.specs} />
      ) : null}

      {source ? <SourceCard title={source.title} url={source.url} /> : null}

      <ProgressRail progress={progress} />
    </AbsoluteFill>
  );
};
