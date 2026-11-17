import React from 'react';
import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import {COLORS} from '../theme/tokens';
import {Intro} from '../chrome/Intro';
import {Outro} from '../chrome/Outro';
import {TitleCard} from '../chrome/TitleCard';
import {MechanismScene} from '../scenes/mechanism';
import {Engine} from '../components/Engine';
import {getBeat} from '../lib/timing';
import {synthTiming} from './timingFallback';
import type {Script, Timing} from '../lib/schema';

export interface HowItWorksProps {
  script: Script;
  timing: Timing | null;
}

const firstSentence = (s: string): string => {
  const m = s.match(/^(.*?[.!?])(\s|$)/);
  return (m && m[1] ? m[1] : s).trim();
};

const prettySlug = (slug?: string): string | undefined =>
  slug
    ? slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : undefined;

// how-it-works builder: Intro -> mechanism beats -> Outro, positioned from
// timing.json (Spec §7).
export const HowItWorks: React.FC<HowItWorksProps> = ({script, timing}) => {
  const {fps} = useVideoConfig();
  const t = timing ?? synthTiming(script, fps);

  const intro = getBeat(t, 'intro');
  const outro = getBeat(t, 'outro');
  const last = t.beats[t.beats.length - 1];
  const totalFrames = last ? last.start_frame + last.frames : 0;

  const accentWord = script.keyword.split(' ')[0];

  return (
    <AbsoluteFill style={{background: COLORS.bg}}>
      {/* Intro */}
      {intro ? (
        <Sequence from={intro.start_frame} durationInFrames={intro.frames}>
          <Intro
            title={script.title}
            hook={firstSentence(script.intro.narration)}
            accentWord={accentWord}
          >
            <Engine layout="I4" rpm={30} strokesColored />
          </Intro>
        </Sequence>
      ) : null}

      {/* Scenes */}
      {script.scenes.map((scene) => {
        const beat = getBeat(t, scene.id);
        if (!beat) return null;
        const source = script.sources.find((s) => s.id === scene.source);
        if (scene.type === 'title') {
          return (
            <Sequence
              key={scene.id}
              from={beat.start_frame}
              durationInFrames={beat.frames}
            >
              <AbsoluteFill style={{background: COLORS.bg}}>
                <TitleCard
                  title={scene.title ?? scene.section ?? script.title}
                  subtitle={scene.narration}
                />
              </AbsoluteFill>
            </Sequence>
          );
        }
        return (
          <Sequence
            key={scene.id}
            from={beat.start_frame}
            durationInFrames={beat.frames}
          >
            <MechanismScene
              scene={scene}
              beat={beat}
              source={source}
              globalStart={beat.start_frame}
              totalFrames={totalFrames}
            />
          </Sequence>
        );
      })}

      {/* Outro */}
      {outro ? (
        <Sequence from={outro.start_frame} durationInFrames={outro.frames}>
          <Outro
            text={script.outro.narration}
            nextTitle={prettySlug(script.outro.next_slug)}
          />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

export const totalFramesFor = (script: Script, timing: Timing | null, fps: number): number => {
  const t = timing ?? synthTiming(script, fps);
  const last = t.beats[t.beats.length - 1];
  return last ? last.start_frame + last.frames : fps;
};
