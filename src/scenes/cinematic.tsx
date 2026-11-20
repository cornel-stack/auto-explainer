import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {COMPONENTS} from '../components/registry';
import {Peep} from '../components/Peep/Peep';
import {Illustration} from '../components/Illustration/Illustration';
import {CINEMA, accentColor, type CinemaAccent} from '../theme/cinema';
import {MotionStage, AccentFX} from '../theme/motionfx';
import {Camera2D} from '../theme/Camera2D';
import {computeChoreo, type ChoreoStep} from '../lib/choreo';
import {FlowLoop, flowAnchors} from '../components/FlowLoop/FlowLoop';
import {FONT_MONO} from '../theme/fonts';
import {
  KineticHeadline,
  KineticLine,
  CountUp,
  Chip,
  SectionKicker,
  LowerThird,
} from '../theme/kinetic';
import type {Scene, Source, TimedBeat} from '../lib/schema';

// Keys the cinematic scene consumes itself; everything else in visual.props is
// forwarded to the hero component (Engine3D / Chart / Photo / …).
const RESERVED = new Set([
  'layout',
  'kicker',
  'kickerAccent',
  'headline',
  'headlineAccent',
  'headlineSize',
  'lines',
  'chips',
  'stats',
  'lowerThirds',
  'peeps',
  'illustrations',
  'credit',
  'heroBox',
  'align',
  'steps',
]);

type Layout = 'fullbleed' | 'left' | 'right' | 'center';

interface Overlay {
  layout?: Layout;
  kicker?: string;
  kickerAccent?: CinemaAccent;
  headline?: string;
  headlineAccent?: CinemaAccent;
  headlineSize?: number;
  lines?: string[];
  chips?: Array<{label: string; accent?: CinemaAccent}>;
  stats?: Array<{
    to: number;
    from?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    accent?: CinemaAccent;
    label?: string;
  }>;
  lowerThirds?: Array<{title: string; value: string; accent?: CinemaAccent}>;
  peeps?: Array<Record<string, unknown>>;
  illustrations?: Array<Record<string, unknown>>;
  credit?: string;
  heroBox?: {x: number; y: number; w: number; h: number};
  align?: 'left' | 'center';
  steps?: ChoreoStep[];
}

const textBoxFor = (layout: Layout, align: 'left' | 'center') => {
  const base: React.CSSProperties = {position: 'absolute', display: 'flex', flexDirection: 'column', gap: 24};
  if (layout === 'left') return {...base, right: 96, top: 230, width: 760, alignItems: 'flex-start'};
  if (layout === 'right') return {...base, left: 96, top: 230, width: 760, alignItems: 'flex-start'};
  if (layout === 'center')
    return {...base, left: 0, right: 0, top: 300, alignItems: 'center', textAlign: 'center' as const, paddingInline: 220};
  // fullbleed: text block lower-left
  return {
    ...base,
    left: 96,
    bottom: 150,
    width: 1040,
    alignItems: align === 'center' ? 'center' : 'flex-start',
  };
};

const CineSource: React.FC<{source: Source}> = ({source}) => {
  let host = '';
  try {
    host = source.url ? new URL(source.url).host.replace(/^www\./, '') : '';
  } catch {
    host = '';
  }
  return (
    <div
      style={{
        position: 'absolute',
        right: 96,
        bottom: 56,
        maxWidth: 560,
        textAlign: 'right',
        fontFamily: FONT_MONO,
      }}
    >
      <div style={{fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', color: CINEMA.ink3}}>Source</div>
      <div style={{fontSize: 20, color: CINEMA.ink2, lineHeight: 1.3}}>{source.title}</div>
      {host ? <div style={{fontSize: 16, color: CINEMA.ink3}}>{host}</div> : null}
    </div>
  );
};

const CineProgress: React.FC<{progress: number}> = ({progress}) => (
  <div style={{position: 'absolute', left: 0, bottom: 0, width: 1920, height: 4, background: '#FFFFFF10'}}>
    <div
      style={{
        width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
        height: '100%',
        background: `linear-gradient(90deg, ${CINEMA.fuel}, ${CINEMA.violet})`,
        boxShadow: `0 0 12px ${CINEMA.violet}`,
      }}
    />
  </div>
);

export const CinematicScene: React.FC<{
  scene: Scene;
  beat: TimedBeat | null;
  source?: Source;
  globalStart: number;
  totalFrames: number;
  index?: number;
}> = ({scene, beat, source, globalStart, totalFrames, index = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const allProps = scene.visual.props as Record<string, unknown>;
  const o = allProps as Overlay;
  const layout: Layout = o.layout ?? 'fullbleed';
  const heroProps: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(allProps)) if (!RESERVED.has(k)) heroProps[k] = v;

  const Hero = COMPONENTS[scene.visual.component];
  const beatFrames = beat?.frames ?? 300;
  const progress = (globalStart + frame) / totalFrames;
  const box = textBoxFor(layout, o.align ?? 'left');

  // Hero placement: full-canvas components (3D / Chart / Table / Tree) always
  // fill the frame; Photo/Illustration heroes may be boxed.
  let heroEl: React.ReactNode = Hero ? <Hero {...heroProps} beatFrames={beatFrames} /> : null;

  // Choreographed hero: drive a motivated camera + progressive reveal from the
  // beat's `steps`, locked to the narration word-timings. (Prototype: FlowLoop.)
  if (o.steps && scene.visual.component === 'FlowLoop') {
    const ch = computeChoreo(frame, fps, beat, beatFrames, o.steps, flowAnchors());
    heroEl = (
      <Camera2D x={ch.cam.x} y={ch.cam.y} zoom={ch.cam.zoom}>
        <FlowLoop
          {...heroProps}
          reach={ch.reach}
          revealCount={ch.revealCount}
          highlight={ch.highlight ?? (heroProps.highlight as string | undefined)}
          beatFrames={beatFrames}
        />
      </Camera2D>
    );
  }

  const fxAccent = (o.headlineAccent ?? o.kickerAccent ?? 'cyan') as CinemaAccent;

  return (
    <AbsoluteFill>
      <MotionStage beatFrames={beatFrames} index={index}>
      {/* Hero */}
      {scene.visual.component !== 'Stage' ? (
        o.heroBox ? (
          <div style={{position: 'absolute', left: o.heroBox.x, top: o.heroBox.y, width: o.heroBox.w, height: o.heroBox.h}}>
            {heroEl}
          </div>
        ) : (
          <AbsoluteFill>{heroEl}</AbsoluteFill>
        )
      ) : null}

      {/* Ambient motion layer */}
      <AccentFX accent={fxAccent} index={index} beatFrames={beatFrames} />

      {/* Characters + activity illustrations */}
      {(o.peeps ?? []).map((p, i) => (
        <Peep key={`peep-${i}`} {...(p as any)} />
      ))}
      {(o.illustrations ?? []).map((il, i) => (
        <Illustration key={`ill-${i}`} {...(il as any)} />
      ))}

      {/* Section kicker */}
      {o.kicker ? <SectionKicker label={o.kicker} accent={o.kickerAccent ?? 'violet'} /> : null}

      {/* Text stack */}
      <div style={box}>
        {o.headline ? (
          <KineticHeadline
            text={o.headline}
            accent={o.headlineAccent ?? 'cyan'}
            accentWord={accentWordOf(o.headline, o.headlineAccent)}
            size={o.headlineSize ?? 76}
            align={o.align === 'center' || layout === 'center' ? 'center' : 'left'}
            maxWidth={(box.width as number) ?? undefined}
          />
        ) : null}
        {(o.lines ?? []).map((ln, i) => (
          <KineticLine
            key={i}
            text={ln}
            delay={10 + i * 6}
            align={o.align === 'center' || layout === 'center' ? 'center' : 'left'}
          />
        ))}
        {o.chips && o.chips.length > 0 ? (
          <div style={{display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 6, justifyContent: layout === 'center' ? 'center' : 'flex-start'}}>
            {o.chips.map((c, i) => (
              <Chip key={i} label={c.label} accent={c.accent ?? 'cyan'} delay={14 + i * 4} />
            ))}
          </div>
        ) : null}
        {o.stats && o.stats.length > 0 ? (
          <div style={{display: 'flex', gap: 64, marginTop: 10, justifyContent: layout === 'center' ? 'center' : 'flex-start', flexWrap: 'wrap'}}>
            {o.stats.map((s, i) => (
              <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: layout === 'center' ? 'center' : 'flex-start'}}>
                <CountUp
                  to={s.to}
                  from={s.from}
                  prefix={s.prefix}
                  suffix={s.suffix}
                  decimals={s.decimals ?? 0}
                  accent={s.accent ?? 'cyan'}
                  size={118}
                  delay={16 + i * 6}
                />
                {s.label ? (
                  <span style={{fontFamily: FONT_MONO, fontSize: 24, letterSpacing: 2, textTransform: 'uppercase', color: CINEMA.ink3, marginTop: 4}}>
                    {s.label}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Lower-thirds (bottom-left), only when not colliding with a bottom text block */}
      {o.lowerThirds && o.lowerThirds.length > 0 && layout !== 'fullbleed' ? (
        <div style={{position: 'absolute', left: 96, bottom: 72, display: 'flex', gap: 16}}>
          {o.lowerThirds.map((lt, i) => (
            <LowerThird key={i} title={lt.title} value={lt.value} accent={lt.accent ?? 'cyan'} delay={18 + i * 5} />
          ))}
        </div>
      ) : null}

      {o.credit ? (
        <div style={{position: 'absolute', left: 96, bottom: 56, fontFamily: FONT_MONO, fontSize: 15, color: CINEMA.ink3}}>
          {o.credit}
        </div>
      ) : null}

      </MotionStage>

      {source ? <CineSource source={source} /> : null}
      <CineProgress progress={progress} />
    </AbsoluteFill>
  );
};

// Pick the accent word for a headline: if an accent is set, glow the last word
// (headlines are written so the punch lands on the final word).
function accentWordOf(headline: string, accent?: CinemaAccent): string | undefined {
  if (!accent) return undefined;
  const words = headline.split(' ');
  return words[words.length - 1];
}
