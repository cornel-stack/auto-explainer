import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {accentColor, type CinemaAccent} from './cinema';

// Motion layer — nothing on screen ever fully stops. Every scene gets a camera
// move (slide-in → continuous drift + slow push → slide-out) and an ambient FX
// layer (entrance light-sweep, drifting rings, rising particles). Directions
// vary by scene index so consecutive beats flow into one another instead of
// hard-cutting like slides. All frame-deterministic.

const DIRS: Array<[number, number]> = [
  [160, 0],
  [-160, 0],
  [0, 130],
  [0, -130],
  [120, 90],
  [-120, -90],
];

export const MotionStage: React.FC<{beatFrames: number; index: number; children: React.ReactNode}> = ({
  beatFrames,
  index,
  children,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const enter = spring({frame, fps, config: {damping: 200, stiffness: 90, mass: 0.8}, durationInFrames: 18});
  const exit = interpolate(frame, [beatFrames - 16, beatFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const [dx0, dy0] = DIRS[index % DIRS.length]!;
  const prog = frame / Math.max(1, beatFrames);

  // continuous organic drift + slow push-in so a held frame still breathes
  const driftX = noise2D('mx' + index, prog * 0.9, 0) * 30;
  const driftY = noise2D('my' + index, 0, prog * 0.9) * 22;
  const push = 1 + prog * 0.06;

  const tx = dx0 * (1 - enter) - dx0 * 0.5 * exit + driftX;
  const ty = dy0 * (1 - enter) - dy0 * 0.5 * exit + driftY;
  const scale = (0.95 + 0.05 * enter) * push * (1 - 0.05 * exit);
  const opacity = Math.min(1, enter * 1.3) * (1 - exit);

  return (
    <AbsoluteFill style={{transform: `translate(${tx}px, ${ty}px) scale(${scale})`, opacity}}>
      {children}
    </AbsoluteFill>
  );
};

export const AccentFX: React.FC<{accent?: CinemaAccent; index?: number; beatFrames?: number}> = ({
  accent = 'cyan',
  index = 0,
  beatFrames = 300,
}) => {
  const frame = useCurrentFrame();
  const c = accentColor(accent);
  const t = frame / fpsSafe();

  // Entrance light sweep across the frame.
  const sweep = interpolate(frame, [0, 24], [-0.35, 1.35], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const sweepOpacity = interpolate(frame, [0, 6, 20, 26], [0, 0.5, 0.5, 0], {extrapolateRight: 'clamp'});

  const rings = [
    {x: 220, y: 240, r: 160, s: 'r0'},
    {x: 1680, y: 300, r: 220, s: 'r1'},
    {x: 1500, y: 860, r: 180, s: 'r2'},
  ];

  const particles = 20;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id={`sweep-${index}`} x1="0" y1="0" x2="1" y2="0.2">
            <stop offset="0%" stopColor={c} stopOpacity="0" />
            <stop offset="50%" stopColor={c} stopOpacity="0.7" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Drifting rings */}
        {rings.map((rg, i) => {
          const dx = noise2D(rg.s + index, t * 0.12, 0) * 50;
          const dy = noise2D('y' + rg.s + index, 0, t * 0.12) * 40;
          const pulse = 1 + 0.06 * Math.sin(t * 1.1 + i);
          return <circle key={i} cx={rg.x + dx} cy={rg.y + dy} r={rg.r * pulse} fill="none" stroke={c} strokeWidth={2} opacity={0.08} />;
        })}

        {/* Rising particles */}
        {Array.from({length: particles}).map((_, i) => {
          const seedX = ((i * 97) % 1920);
          const speed = 60 + (i % 5) * 18;
          const y = 1080 - ((frame * speed * 0.15 + i * 123) % 1180);
          const x = seedX + Math.sin((frame + i * 40) * 0.02) * 24;
          const a = 0.1 + 0.25 * ((i % 3) / 3);
          return <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 4 : 2.5} fill={c} opacity={a} />;
        })}

        {/* Entrance sweep */}
        {sweepOpacity > 0 ? (
          <rect x={sweep * 1920 - 500} y={0} width={500} height={1080} fill={`url(#sweep-${index})`} opacity={sweepOpacity} transform={`skewX(-12)`} />
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};

// useVideoConfig can't be called at module scope; small helper keeps 30fps math
// local without threading fps everywhere (AccentFX motion is fps-relative-ish).
function fpsSafe(): number {
  return 30;
}
