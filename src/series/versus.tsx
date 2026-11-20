import React from 'react';
import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import {ThemeProvider, themeFor} from '../theme/theme';
import {Intro} from '../chrome/Intro';
import {Outro} from '../chrome/Outro';
import {TitleCard} from '../chrome/TitleCard';
import {CompareScene} from '../scenes/compare';
import {BeatScene} from '../scenes/beat';
import {Engine} from '../components/Engine';
import {getBeat} from '../lib/timing';
import {synthTiming} from './timingFallback';
import type {Script, Timing} from '../lib/schema';

export interface VersusProps {
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

// versus builder: Intro → [title | compare | beat] → Outro, positioned from
// timing.json (Spec §7). A title scene whenever `section` changes is authored
// explicitly in script.json as a `title` scene.
export const Versus: React.FC<VersusProps> = ({script, timing}) => {
  const {fps} = useVideoConfig();
  const t = timing ?? synthTiming(script, fps);

  const intro = getBeat(t, 'intro');
  const outro = getBeat(t, 'outro');
  const last = t.beats[t.beats.length - 1];
  const totalFrames = last ? last.start_frame + last.frames : 0;

  const accentWord = script.keyword.split(' ')[0];
  const mode = script.theme ?? 'light';
  const theme = themeFor(mode);

  return (
    <ThemeProvider mode={mode}>
      <AbsoluteFill style={{background: theme.bg}}>
        {intro ? (
          <Sequence from={intro.start_frame} durationInFrames={intro.frames}>
            <Intro
              title={script.title}
              hook={firstSentence(script.intro.narration)}
              accentWord={accentWord}
            >
              <Engine layout="I4" rpm={26} strokesColored focusCylinder={0} />
            </Intro>
          </Sequence>
        ) : null}

        {script.scenes.map((scene) => {
          const beat = getBeat(t, scene.id);
          if (!beat) return null;
          const source = script.sources.find((s) => s.id === scene.source);

          if (scene.type === 'title') {
            return (
              <Sequence key={scene.id} from={beat.start_frame} durationInFrames={beat.frames}>
                <AbsoluteFill style={{background: theme.bg}}>
                  <TitleCard
                    title={scene.title ?? scene.section ?? script.title}
                    subtitle={scene.narration}
                    accentWord={accentWord}
                  />
                </AbsoluteFill>
              </Sequence>
            );
          }

          const Renderer = scene.type === 'compare' ? CompareScene : BeatScene;
          return (
            <Sequence key={scene.id} from={beat.start_frame} durationInFrames={beat.frames}>
              <Renderer
                scene={scene}
                beat={beat}
                source={source}
                globalStart={beat.start_frame}
                totalFrames={totalFrames}
              />
            </Sequence>
          );
        })}

        {outro ? (
          <Sequence from={outro.start_frame} durationInFrames={outro.frames}>
            <Outro
              text={script.outro.narration}
              nextTitle={prettySlug(script.outro.next_slug)}
            />
          </Sequence>
        ) : null}
      </AbsoluteFill>
    </ThemeProvider>
  );
};

export const totalFramesFor = (
  script: Script,
  timing: Timing | null,
  fps: number
): number => {
  const t = timing ?? synthTiming(script, fps);
  const last = t.beats[t.beats.length - 1];
  return last ? last.start_frame + last.frames : fps;
};
