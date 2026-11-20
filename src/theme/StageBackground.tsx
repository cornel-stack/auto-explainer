import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {CINEMA} from './cinema';

// A continuous, living dark background rendered once behind the whole video so
// motion never stops. Three slow aurora blobs drift on Perlin noise, a faint
// tech grid parallaxes, filmic grain shimmers, and a vignette frames it.
// Fully deterministic (frame-driven) → identical every render.

interface Blob {
  seed: string;
  color: string;
  baseX: number;
  baseY: number;
  r: number;
  drift: number;
}

const BLOBS: Blob[] = [
  {seed: 'a', color: CINEMA.fuel, baseX: 0.26, baseY: 0.34, r: 760, drift: 180},
  {seed: 'b', color: CINEMA.violet, baseX: 0.74, baseY: 0.3, r: 680, drift: 150},
  {seed: 'c', color: CINEMA.premium, baseX: 0.6, baseY: 0.78, r: 620, drift: 160},
];

export const StageBackground: React.FC<{intensity?: number}> = ({intensity = 1}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const t = frame / fps;

  return (
    <AbsoluteFill style={{background: `radial-gradient(130% 120% at 50% 18%, ${CINEMA.bg1} 0%, ${CINEMA.bg0} 70%)`}}>
      {/* Drifting aurora blobs */}
      <AbsoluteFill style={{filter: 'blur(10px)'}}>
        {BLOBS.map((b) => {
          const dx = noise2D(b.seed + 'x', t * 0.06, 0) * b.drift;
          const dy = noise2D(b.seed + 'y', 0, t * 0.06) * b.drift;
          const cx = b.baseX * width + dx;
          const cy = b.baseY * height + dy;
          const pulse = 0.5 + 0.5 * Math.sin(t * 0.5 + b.baseX * 6);
          return (
            <div
              key={b.seed}
              style={{
                position: 'absolute',
                left: cx - b.r,
                top: cy - b.r,
                width: b.r * 2,
                height: b.r * 2,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${b.color}${Math.round((0.22 + 0.1 * pulse) * intensity * 255).toString(16).padStart(2, '0')} 0%, transparent 62%)`,
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* Faint parallax tech grid */}
      <svg width={width} height={height} style={{position: 'absolute', inset: 0, opacity: 0.1}}>
        <defs>
          <pattern
            id="cine-grid"
            width={120}
            height={120}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${(t * 6) % 120} ${(t * 3) % 120})`}
          >
            <path d="M120 0 L0 0 0 120" fill="none" stroke={CINEMA.line} strokeWidth={1} />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#cine-grid)" />
      </svg>

      {/* Filmic grain (animated turbulence seed) */}
      <svg width={width} height={height} style={{position: 'absolute', inset: 0, opacity: 0.05, mixBlendMode: 'overlay'}}>
        <filter id="cine-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves={2}
            seed={Math.floor(t * 12) % 100}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={width} height={height} filter="url(#cine-grain)" />
      </svg>

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 100% at 50% 45%, transparent 55%, ${CINEMA.bg0}cc 100%)`,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
