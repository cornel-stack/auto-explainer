import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {CINEMA, accentColor, type CinemaAccent} from '../../theme/cinema';
import {FONT_MONO} from '../../theme/fonts';

// Photo — a committed, license-cleared photograph presented cinematically:
// a slow Ken-Burns move, a dark duotone wash so it belongs on the stage, a
// glowing frame, and a small credit. Fills its parent box (the scene positions
// it). No network: `src` resolves through Remotion's public/ via staticFile.
export interface PhotoProps {
  src: string; // path under public/ e.g. "pvr/01-pump.jpg"
  credit?: string;
  accent?: CinemaAccent;
  move?: 'in' | 'out' | 'left' | 'up';
  delay?: number;
  beatFrames?: number;
  rounded?: number;
}

export const Photo: React.FC<PhotoProps> = ({
  src,
  credit,
  accent = 'cyan',
  move = 'in',
  delay = 0,
  beatFrames = 300,
  rounded = 28,
}) => {
  const frame = useCurrentFrame();
  const c = accentColor(accent);
  const t = interpolate(frame - delay, [0, beatFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const appear = interpolate(frame - delay, [0, 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const scale =
    move === 'out' ? interpolate(t, [0, 1], [1.18, 1.04]) : interpolate(t, [0, 1], [1.06, 1.18]);
  const panX = move === 'left' ? interpolate(t, [0, 1], [2, -2]) : 0;
  const panY = move === 'up' ? interpolate(t, [0, 1], [2, -2]) : 0;

  return (
    <AbsoluteFill
      style={{
        borderRadius: rounded,
        overflow: 'hidden',
        opacity: appear,
        border: `1.5px solid ${c}55`,
        boxShadow: `0 0 60px ${c}22, inset 0 0 120px rgba(0,0,0,0.6)`,
        transform: `scale(${0.96 + 0.04 * appear})`,
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translate(${panX}%, ${panY}%)`,
        }}
      />
      {/* Duotone / darken wash so the photo reads on the dark stage */}
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${CINEMA.bg0}22 0%, ${CINEMA.bg0}99 100%)`, mixBlendMode: 'multiply'}} />
      <AbsoluteFill style={{background: `radial-gradient(120% 100% at 50% 40%, transparent 50%, ${CINEMA.bg0}cc 100%)`, pointerEvents: 'none'}} />
      {credit ? (
        <div
          style={{
            position: 'absolute',
            right: 16,
            bottom: 12,
            fontFamily: FONT_MONO,
            fontSize: 16,
            color: '#FFFFFFAA',
            background: 'rgba(0,0,0,0.4)',
            padding: '4px 10px',
            borderRadius: 6,
          }}
        >
          {credit}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
