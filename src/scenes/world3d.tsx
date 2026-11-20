import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {World3D, Pipeline3D, PIPE_NODES, nodeWorld, type Cam} from '../three/World3D';
import {projectToScreen} from '../components/Engine3D/geometry';
import {resolveChoreo, _lerp, type ChoreoStep} from '../lib/choreo';
import {CINEMA, textGlow} from '../theme/cinema';
import {FONT_SANS, FONT_MONO} from '../theme/fonts';
import {SectionKicker} from '../theme/kinetic';
import type {Scene, Source, TimedBeat} from '../lib/schema';

// WorldScene — renders a beat inside the immersive 3D world. The camera flies
// between 3D objects on narration cues; labels are anchored to the objects and
// reproject every frame, so text lives IN the 3D space and tracks what's being
// discussed (no left-picture / right-text split).

const lp3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  _lerp(a[0], b[0], t),
  _lerp(a[1], b[1], t),
  _lerp(a[2], b[2], t),
];

const AnchoredLabel: React.FC<{x: number; y: number; label: string; accent: string; big?: boolean}> = ({x, y, label, accent, big}) => {
  if (x < -300 || x > 2220 || y < -200 || y > 1280) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%, -140%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, pointerEvents: 'none'}}>
      <div
        style={{
          fontFamily: FONT_SANS,
          fontSize: big ? 40 : 30,
          fontWeight: 700,
          color: accent,
          textShadow: textGlow(accent, 1),
          whiteSpace: 'nowrap',
          background: 'rgba(5,7,13,0.55)',
          padding: '6px 16px',
          borderRadius: 10,
          border: `1px solid ${accent}66`,
        }}
      >
        {label}
      </div>
      <div style={{width: 2, height: 26, background: `linear-gradient(${accent}, transparent)`}} />
    </div>
  );
};

export const WorldScene: React.FC<{
  scene: Scene;
  beat: TimedBeat | null;
  source?: Source;
  globalStart: number;
  totalFrames: number;
  index?: number;
}> = ({scene, beat, source, globalStart, totalFrames}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const o = scene.visual.props as Record<string, unknown>;
  const steps = (o.steps as ChoreoStep[]) ?? [];
  const fault = o.fault as string | undefined;
  const kicker = o.kicker as string | undefined;
  const beatFrames = beat?.frames ?? 300;

  const r = resolveChoreo(frame, fps, beat, beatFrames, steps);

  const station = (step: ChoreoStep): Cam => {
    const f = step.focus ?? 'center';
    if (f === 'center') return {pos: [0, 8.5, 25], target: [0, 1.5, 0], fov: 44};
    const n = nodeWorld(f);
    return {pos: [n.x + 2.6, n.y + 3.2, n.z + 9.5], target: [n.x, n.y, n.z], fov: 38};
  };
  const a = station(r.prev);
  const b = station(r.cur);
  const cam: Cam = {pos: lp3(a.pos, b.pos, r.camT), target: lp3(a.target, b.target, r.camT), fov: _lerp(a.fov, b.fov, r.camT)};

  const labels = PIPE_NODES.map((n, i) => ({n, i}))
    .filter(({i}) => i < r.revealCount)
    .map(({n}) => {
      const w = nodeWorld(n.id);
      const s = projectToScreen([w.x, w.y + 0.95, w.z], cam, width, height);
      const isHi = r.highlight === n.id;
      return {id: n.id, label: n.label, x: s.x, y: s.y, accent: isHi ? CINEMA.power : CINEMA.ink, big: isHi};
    });

  const progress = (globalStart + frame) / totalFrames;

  return (
    <AbsoluteFill>
      <World3D cam={cam}>
        <Pipeline3D reach={r.reach} revealCount={r.revealCount} highlight={r.highlight} fault={fault} />
      </World3D>

      {labels.map((l) => (
        <AnchoredLabel key={l.id} x={l.x} y={l.y} label={l.label} accent={l.accent} big={l.big} />
      ))}

      {kicker ? <SectionKicker label={kicker} accent="cyan" /> : null}

      {source ? (
        <div style={{position: 'absolute', right: 96, bottom: 56, textAlign: 'right', fontFamily: FONT_MONO}}>
          <div style={{fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', color: CINEMA.ink3}}>Source</div>
          <div style={{fontSize: 20, color: CINEMA.ink2}}>{source.title}</div>
        </div>
      ) : null}

      <div style={{position: 'absolute', left: 0, bottom: 0, width: 1920, height: 4, background: '#FFFFFF10'}}>
        <div style={{width: `${Math.max(0, Math.min(1, progress)) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${CINEMA.fuel}, ${CINEMA.violet})`, boxShadow: `0 0 12px ${CINEMA.violet}`}} />
      </div>
    </AbsoluteFill>
  );
};
