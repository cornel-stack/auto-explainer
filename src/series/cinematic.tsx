import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThemeProvider} from '../theme/theme';
import {StageBackground} from '../theme/StageBackground';
import {CinematicScene} from '../scenes/cinematic';
import {Engine3D} from '../components/Engine3D';
import {Peep} from '../components/Peep/Peep';
import {CINEMA} from '../theme/cinema';
import {KineticHeadline, KineticLine, Chip} from '../theme/kinetic';
import {FONT_MONO} from '../theme/fonts';
import {getBeat} from '../lib/timing';
import {synthTiming} from './timingFallback';
import type {Script, Timing} from '../lib/schema';

export interface CinematicProps {
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

const CineIntro: React.FC<{title: string; hook: string; keyword: string}> = ({title, hook, keyword}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fade = Math.min(1, frame / 20);
  return (
    <AbsoluteFill>
      {/* Dimmed hero 3D behind the title */}
      <AbsoluteFill style={{opacity: 0.5 * fade, filter: 'blur(1px)'}}>
        <Engine3D layout="I4" rpm={22} strokesColored camera="intro" beatFrames={fps * 9} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${CINEMA.bg0}00 30%, ${CINEMA.bg0}cc 100%)`}} />
      <div style={{position: 'absolute', left: 120, top: 300, width: 1300, display: 'flex', flexDirection: 'column', gap: 30}}>
        <Chip label={keyword} accent="violet" filled delay={2} />
        <KineticHeadline text={title} accent="premium" accentWord={title.split(' ').slice(-1)[0]} size={118} stagger={3} />
        <KineticLine text={hook} delay={16} size={40} color={CINEMA.ink2} />
      </div>
      <Peep seed="driver-hero" x={1430} y={360} size={470} delay={10} />
    </AbsoluteFill>
  );
};

const CineOutro: React.FC<{text: string; nextTitle?: string}> = ({text, nextTitle}) => {
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: 200}}>
      <div style={{display: 'flex', flexDirection: 'column', gap: 34, alignItems: 'center', textAlign: 'center'}}>
        <KineticHeadline text={firstSentence(text)} accent="premium" accentWord={firstSentence(text).split(' ').slice(-1)[0]} size={72} align="center" maxWidth={1500} />
        <KineticLine text={text.slice(firstSentence(text).length).trim()} delay={18} size={34} align="center" />
        {nextTitle ? (
          <div style={{marginTop: 20, display: 'flex', gap: 16, alignItems: 'center'}}>
            <span style={{fontFamily: FONT_MONO, fontSize: 24, letterSpacing: 3, textTransform: 'uppercase', color: CINEMA.ink3}}>Next</span>
            <Chip label={nextTitle} accent="cyan" filled delay={26} />
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// Cinematic builder: a continuous dark stage, a 3D-led intro, every scene
// composed by CinematicScene, a kinetic outro. Replaces the old flat Versus
// look entirely.
export const Cinematic: React.FC<CinematicProps> = ({script, timing}) => {
  const {fps} = useVideoConfig();
  const t = timing ?? synthTiming(script, fps);

  const intro = getBeat(t, 'intro');
  const outro = getBeat(t, 'outro');
  const last = t.beats[t.beats.length - 1];
  const totalFrames = last ? last.start_frame + last.frames : 0;

  return (
    <ThemeProvider mode="dark">
      <AbsoluteFill style={{background: CINEMA.bg0}}>
        <StageBackground />

        {intro ? (
          <Sequence from={intro.start_frame} durationInFrames={intro.frames}>
            <CineIntro title={script.title} hook={firstSentence(script.intro.narration)} keyword={script.keyword} />
          </Sequence>
        ) : null}

        {script.scenes.map((scene) => {
          const beat = getBeat(t, scene.id);
          if (!beat || !scene.visual) return null;
          const source = script.sources.find((s) => s.id === scene.source);
          return (
            <Sequence key={scene.id} from={beat.start_frame} durationInFrames={beat.frames}>
              <CinematicScene
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
            <CineOutro text={script.outro.narration} nextTitle={prettySlug(script.outro.next_slug)} />
          </Sequence>
        ) : null}
      </AbsoluteFill>
    </ThemeProvider>
  );
};

export const totalFramesFor = (script: Script, timing: Timing | null, fps: number): number => {
  const t = timing ?? synthTiming(script, fps);
  const last = t.beats[t.beats.length - 1];
  return last ? last.start_frame + last.frames : fps;
};
