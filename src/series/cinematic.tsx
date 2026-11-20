import React from 'react';
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThemeProvider} from '../theme/theme';
import {StageBackground} from '../theme/StageBackground';
import {CinematicScene} from '../scenes/cinematic';
import {WorldScene} from '../scenes/world3d';
import {Engine3D} from '../components/Engine3D';
import {Peep} from '../components/Peep/Peep';
import {CINEMA} from '../theme/cinema';
import {KineticHeadline, KineticLine, Chip} from '../theme/kinetic';
import {FONT_MONO, FONT_SANS} from '../theme/fonts';
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

const SubscribeCTA: React.FC<{delay?: number}> = ({delay = 30}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame: frame - delay, fps, config: {damping: 140, stiffness: 120}, durationInFrames: 16});
  const pulse = 1 + 0.04 * Math.sin((frame - delay) / fps * 5);
  const red = '#FF0033';
  // A ghost "click" ring that sweeps in once to draw the eye.
  const ring = interpolate(frame - delay - 20, [0, 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, opacity: pop, transform: `translateY(${(1 - pop) * 24}px)`}}>
      <div style={{fontFamily: FONT_MONO, fontSize: 26, letterSpacing: 4, textTransform: 'uppercase', color: CINEMA.ink2}}>
        Enjoyed this?
      </div>
      <div style={{position: 'relative'}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            background: red,
            color: '#fff',
            padding: '24px 48px',
            borderRadius: 18,
            fontFamily: FONT_SANS,
            fontSize: 54,
            fontWeight: 800,
            letterSpacing: 1,
            transform: `scale(${pulse})`,
            boxShadow: `0 0 50px ${red}88, 0 14px 40px rgba(0,0,0,0.5)`,
          }}
        >
          {/* bell */}
          <svg width={52} height={52} viewBox="0 0 24 24" fill="#fff">
            <path d="M12 2a2 2 0 0 1 2 2v.3A7 7 0 0 1 19 11v4l2 2v1H3v-1l2-2v-4a7 7 0 0 1 5-6.7V4a2 2 0 0 1 2-2zm0 20a3 3 0 0 1-3-3h6a3 3 0 0 1-3 3z" />
          </svg>
          SUBSCRIBE
        </div>
        {/* sweeping click ring + cursor */}
        {ring > 0 && ring < 1 ? (
          <div
            style={{
              position: 'absolute',
              inset: -10,
              borderRadius: 24,
              border: `4px solid #fff`,
              opacity: 1 - ring,
              transform: `scale(${1 + ring * 0.25})`,
            }}
          />
        ) : null}
      </div>
      <div style={{fontFamily: FONT_SANS, fontSize: 28, fontWeight: 500, color: CINEMA.ink2}}>
        and hit the bell so you never miss one.
      </div>
    </div>
  );
};

const CineOutro: React.FC<{text: string; nextTitle?: string}> = ({text, nextTitle}) => {
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: 140}}>
      <div style={{display: 'flex', flexDirection: 'column', gap: 30, alignItems: 'center', textAlign: 'center'}}>
        <KineticHeadline text={firstSentence(text)} accent="premium" accentWord={firstSentence(text).split(' ').slice(-1)[0]} size={64} align="center" maxWidth={1500} />
        <KineticLine text={text.slice(firstSentence(text).length).trim()} delay={16} size={32} align="center" />
        <SubscribeCTA delay={30} />
        {nextTitle ? (
          <div style={{marginTop: 6, display: 'flex', gap: 16, alignItems: 'center'}}>
            <span style={{fontFamily: FONT_MONO, fontSize: 24, letterSpacing: 3, textTransform: 'uppercase', color: CINEMA.ink3}}>Next</span>
            <Chip label={nextTitle} accent="cyan" filled delay={44} />
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

        {script.scenes.map((scene, i) => {
          const beat = getBeat(t, scene.id);
          if (!beat || !scene.visual) return null;
          const source = script.sources.find((s) => s.id === scene.source);
          const Renderer = scene.visual.component === 'World3D' ? WorldScene : CinematicScene;
          return (
            <Sequence key={scene.id} from={beat.start_frame} durationInFrames={beat.frames}>
              <Renderer
                scene={scene}
                beat={beat}
                source={source}
                globalStart={beat.start_frame}
                totalFrames={totalFrames}
                index={i}
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
