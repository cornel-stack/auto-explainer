import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {World3D, Pipeline3D, PIPE_NODES, nodeWorld, type Cam} from '../three/World3D';
import {Compare3D, Bars3D, IconFloat3D, Timeline3D, COMPARE_POS, BAR_X, BAR_BASE_Y, tlX, TL_Y, acc} from '../three/content3d';
import {projectToScreen} from '../components/Engine3D/geometry';
import {resolveChoreo, _lerp, type ChoreoStep} from '../lib/choreo';
import {CINEMA, textGlow} from '../theme/cinema';
import {FONT_SANS, FONT_MONO} from '../theme/fonts';
import {SectionKicker, CountUp, KineticHeadline} from '../theme/kinetic';
import {Montage} from '../components/Montage/Montage';
import {Peep} from '../components/Peep/Peep';
import type {Scene, Source, TimedBeat} from '../lib/schema';

const ProgressBar: React.FC<{progress: number}> = ({progress}) => (
  <div style={{position: 'absolute', left: 0, bottom: 0, width: 1920, height: 4, background: '#FFFFFF10'}}>
    <div style={{width: `${Math.max(0, Math.min(1, progress)) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${CINEMA.fuel}, ${CINEMA.violet})`, boxShadow: `0 0 12px ${CINEMA.violet}`}} />
  </div>
);

const SourceTag: React.FC<{source?: Source}> = ({source}) =>
  source ? (
    <div style={{position: 'absolute', right: 96, bottom: 56, textAlign: 'right', fontFamily: FONT_MONO}}>
      <div style={{fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', color: CINEMA.ink3}}>Source</div>
      <div style={{fontSize: 20, color: CINEMA.ink2}}>{source.title}</div>
    </div>
  ) : null;

const lp3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  _lerp(a[0], b[0], t),
  _lerp(a[1], b[1], t),
  _lerp(a[2], b[2], t),
];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => t * t * (3 - 2 * t);

// ─── Anchored overlays (HTML pinned to projected 3D points) ───
const Label: React.FC<{x: number; y: number; text: string; color: string; size?: number; sub?: string; shift?: number}> = ({x, y, text, color, size = 30, sub, shift = -140}) => {
  if (x < -400 || x > 2320 || y < -300 || y > 1380) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, ${shift}%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, pointerEvents: 'none', whiteSpace: 'nowrap'}}>
      <div style={{fontFamily: FONT_SANS, fontSize: size, fontWeight: 700, color, textShadow: textGlow(color, 1), background: 'rgba(5,7,13,0.5)', padding: '6px 16px', borderRadius: 10, border: `1px solid ${color}55`}}>{text}</div>
      {sub ? <div style={{fontFamily: FONT_SANS, fontSize: 22, color: CINEMA.ink2}}>{sub}</div> : null}
    </div>
  );
};

type Props = {scene: Scene; beat: TimedBeat | null; source?: Source; globalStart: number; totalFrames: number; index?: number};

export const WorldScene: React.FC<Props> = ({scene, beat, source, globalStart, totalFrames}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const o = scene.visual.props as Record<string, any>;
  const content: string = o.content ?? 'pipeline';
  const steps: ChoreoStep[] = o.steps ?? [];
  const beatFrames = beat?.frames ?? 300;
  const kicker = o.kicker as string | undefined;
  const t01 = clamp01(frame / beatFrames);
  const te = ease(t01);
  const r = steps.length ? resolveChoreo(frame, fps, beat, beatFrames, steps) : null;
  const progress = (globalStart + frame) / totalFrames;

  // Non-3D beat: a fast-cut full-screen image montage + a reacting character.
  if (content === 'montage') {
    const images: string[] = o.images ?? [];
    const lastWord = o.headline ? String(o.headline).split(' ').slice(-1)[0] : undefined;
    return (
      <AbsoluteFill>
        <Montage images={images} cut={o.cut ?? 9} />
        {kicker ? <SectionKicker label={kicker} accent="cyan" /> : null}
        <div style={{position: 'absolute', left: 96, bottom: 150, width: 1120, display: 'flex', flexDirection: 'column', gap: 18}}>
          {o.headline ? <KineticHeadline text={o.headline} accent={o.accent ?? 'power'} accentWord={lastWord} size={72} /> : null}
          {o.stat ? (
            <div style={{display: 'flex', flexDirection: 'column'}}>
              <CountUp to={o.stat.to} prefix={o.stat.prefix} suffix={o.stat.suffix} decimals={o.stat.decimals ?? 0} accent={o.stat.accent ?? 'power'} size={100} />
              {o.stat.label ? <span style={{fontFamily: FONT_MONO, fontSize: 22, letterSpacing: 2, textTransform: 'uppercase', color: CINEMA.ink3, marginTop: 4}}>{o.stat.label}</span> : null}
            </div>
          ) : null}
        </div>
        {o.peep ? <Peep {...(o.peep as any)} /> : null}
        <div style={{position: 'absolute', right: 96, bottom: 104, fontFamily: FONT_MONO, fontSize: 15, color: CINEMA.ink3}}>Images — credits in description</div>
        <SourceTag source={source} />
        <ProgressBar progress={progress} />
      </AbsoluteFill>
    );
  }

  const proj = (w: [number, number, number], cam: Cam) => projectToScreen(w, cam, width, height);

  let cam: Cam = {pos: [0, 6, 20], target: [0, 1.5, 0], fov: 42};
  let world: React.ReactNode = null;
  const overlays: React.ReactNode[] = [];

  if (content === 'pipeline') {
    const station = (s: ChoreoStep): Cam => {
      const f = s.focus ?? 'center';
      if (f === 'center') return {pos: [0, 8.5, 25], target: [0, 1.5, 0], fov: 44};
      const n = nodeWorld(f);
      return {pos: [n.x + 2.6, n.y + 3.2, n.z + 9.5], target: [n.x, n.y, n.z], fov: 38};
    };
    const rr = r!;
    const a = station(rr.prev), b = station(rr.cur);
    cam = {pos: lp3(a.pos, b.pos, rr.camT), target: lp3(a.target, b.target, rr.camT), fov: _lerp(a.fov, b.fov, rr.camT)};
    world = <Pipeline3D reach={rr.reach} revealCount={rr.revealCount} highlight={rr.highlight} fault={o.fault} />;
    PIPE_NODES.forEach((n, i) => {
      if (i >= rr.revealCount) return;
      const w = nodeWorld(n.id);
      const s = proj([w.x, w.y + 0.95, w.z], cam);
      const hi = rr.highlight === n.id;
      overlays.push(<Label key={n.id} x={s.x} y={s.y} text={n.label} color={hi ? CINEMA.power : CINEMA.ink} size={hi ? 38 : 30} />);
    });
  } else if (content === 'compare') {
    const station = (s: ChoreoStep): Cam => {
      const f = s.focus ?? 'center';
      const p = f === 'left' ? COMPARE_POS.left : f === 'right' ? COMPARE_POS.right : COMPARE_POS.center;
      if (f === 'center') return {pos: [0, 6, 19], target: [0, 2, 0], fov: 44};
      return {pos: [p.x + 2.6, 4, 10.5], target: [p.x, 2.2, 0], fov: 40};
    };
    const rr = r ?? null;
    if (rr) {
      const a = station(rr.prev), b = station(rr.cur);
      cam = {pos: lp3(a.pos, b.pos, rr.camT), target: lp3(a.target, b.target, rr.camT), fov: _lerp(a.fov, b.fov, rr.camT)};
    } else {
      cam = {pos: [_lerp(-4, 4, te), 5.5, 18], target: [0, 2, 0], fov: 44};
    }
    const reveal = rr ? rr.revealCount : 2;
    world = <Compare3D leftColor={o.leftColor} rightColor={o.rightColor} reveal={reveal} />;
    const side = (p: typeof COMPARE_POS.left, label: string, color: string, specs: string[], show: boolean) => {
      if (!show) return;
      const top = proj([p.x, p.y + 1.9, p.z], cam);
      overlays.push(<Label key={label} x={top.x} y={top.y} text={label} color={color} size={40} />);
      specs.forEach((sp, j) => {
        const b = proj([p.x, p.y - 1.6 - j * 1.0, p.z], cam);
        overlays.push(<Label key={label + j} x={b.x} y={b.y} text={sp} color={CINEMA.ink2} size={24} shift={0} />);
      });
    };
    side(COMPARE_POS.left, o.leftLabel ?? 'A', acc(o.leftColor ?? 'fuel'), o.leftProps ?? [], reveal >= 1);
    side(COMPARE_POS.right, o.rightLabel ?? 'B', acc(o.rightColor ?? 'premium'), o.rightProps ?? [], reveal >= 2);
  } else if (content === 'bars') {
    cam = {pos: [_lerp(-3, 3, te), _lerp(5.5, 4.5, te), 18], target: [0, 2, 0], fov: 46};
    const bars: Array<{value: number; color?: string; note?: string; label?: string}> = o.bars ?? [];
    const max = o.max ?? Math.max(1, ...bars.map((b) => Math.abs(b.value)));
    world = <Bars3D bars={bars} max={max} />;
    bars.forEach((b, i) => {
      const x = BAR_X[i] ?? i * 6;
      const full = 1 + (Math.abs(b.value) / max) * 8;
      const grow = clamp01((frame - i * 6) / 26);
      const topY = BAR_BASE_Y + full * grow;
      const top = proj([x, topY + 0.6, 0], cam);
      const base = proj([x, BAR_BASE_Y - 0.2, 0], cam);
      if (grow > 0.3) overlays.push(<Label key={'v' + i} x={top.x} y={top.y} text={b.note ?? String(b.value)} color={acc(b.color)} size={38} />);
      if (b.label) overlays.push(<Label key={'l' + i} x={base.x} y={base.y} text={b.label} color={CINEMA.ink2} size={24} shift={0} />);
    });
  } else if (content === 'timeline') {
    const reach = r ? r.reach : te;
    const camX = tlX(reach);
    cam = {pos: [camX, 6.5, 15], target: [camX, TL_Y + 0.4, 0], fov: 46};
    const events: Array<{at: number; color?: string; label?: string; sub?: string}> = o.events ?? [];
    world = <Timeline3D events={events} reach={reach} />;
    events.forEach((e, i) => {
      const lit = reach >= e.at;
      const s = proj([tlX(e.at), TL_Y + 2.1, 0], cam);
      overlays.push(<Label key={i} x={s.x} y={s.y} text={e.label ?? ''} color={lit ? acc(e.color) : CINEMA.ink3} size={lit ? 30 : 24} sub={lit ? e.sub : undefined} shift={-120} />);
    });
  } else if (content === 'photo') {
    cam = {pos: [0, 2.8, _lerp(14, 12.4, te)], target: [0, 2.6, 0], fov: 42};
    const cx = 0, cy = 2.6, hw = 5.3, hh = 3.0;
    world = (
      <mesh position={[cx, cy, -0.12]}>
        <planeGeometry args={[hw * 2 + 0.5, hh * 2 + 0.5]} />
        <meshStandardMaterial color={acc(o.accent)} emissive={acc(o.accent)} emissiveIntensity={0.5} metalness={0.2} roughness={0.5} />
      </mesh>
    );
    const tl = proj([cx - hw, cy + hh, 0], cam);
    const br = proj([cx + hw, cy - hh, 0], cam);
    const left = Math.min(tl.x, br.x), top = Math.min(tl.y, br.y);
    const w = Math.abs(br.x - tl.x), h = Math.abs(br.y - tl.y);
    const appear = interpolate(frame, [0, 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    overlays.push(
      <div key="photo" style={{position: 'absolute', left, top, width: w, height: h, overflow: 'hidden', borderRadius: 10, opacity: appear, boxShadow: `0 0 50px ${acc(o.accent)}44`}}>
        <Img src={staticFile(o.src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        <AbsoluteFill style={{background: `radial-gradient(120% 100% at 50% 40%, transparent 55%, ${CINEMA.bg0}bb 100%)`, pointerEvents: 'none'}} />
      </div>
    );
    const titleP = proj([cx, cy + hh + 0.6, 0], cam);
    if (o.headline) overlays.push(<Label key="ht" x={titleP.x} y={titleP.y} text={o.headline} color={acc(o.accent)} size={48} shift={-20} />);
    if (o.stat) {
      overlays.push(
        <div key="stat" style={{position: 'absolute', left: br.x + 30, top: (tl.y + br.y) / 2, pointerEvents: 'none'}}>
          <CountUp to={o.stat.to} prefix={o.stat.prefix} suffix={o.stat.suffix} decimals={o.stat.decimals ?? 0} accent={o.stat.accent ?? 'power'} size={110} />
          {o.stat.label ? <div style={{fontFamily: FONT_MONO, fontSize: 22, letterSpacing: 2, textTransform: 'uppercase', color: CINEMA.ink3, marginTop: 6}}>{o.stat.label}</div> : null}
        </div>
      );
    }
    if (o.credit) overlays.push(<div key="cr" style={{position: 'absolute', left: left + 12, top: top + h - 34, fontFamily: FONT_MONO, fontSize: 15, color: '#FFFFFFAA', background: 'rgba(0,0,0,0.4)', padding: '3px 8px', borderRadius: 6}}>{o.credit}</div>);
  } else {
    // title
    cam = {pos: [_lerp(-2, 1.5, te) * 0.6, _lerp(4.2, 3.2, te), _lerp(20, 12.5, te)], target: [0, 2.6, 0], fov: 42};
    world = <IconFloat3D icon={o.icon} accent={o.accent ?? 'cyan'} />;
    const h = proj([0, 2.3, 0], cam);
    if (o.headline) overlays.push(<Label key="h" x={h.x} y={h.y} text={o.headline} color={acc(o.accent)} size={74} shift={-20} />);
    const s = proj([0, 1.1, 0], cam);
    if (o.lines && o.lines[0]) overlays.push(<Label key="s" x={s.x} y={s.y} text={o.lines[0]} color={CINEMA.ink2} size={30} shift={0} />);
  }

  return (
    <AbsoluteFill>
      <World3D cam={cam}>{world}</World3D>
      {overlays}
      {o.peep ? <Peep {...(o.peep as any)} /> : null}
      {kicker ? <SectionKicker label={kicker} accent="cyan" /> : null}
      <SourceTag source={source} />
      <ProgressBar progress={progress} />
    </AbsoluteFill>
  );
};
