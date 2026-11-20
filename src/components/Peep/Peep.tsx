import React, {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig, spring} from 'remotion';
import {createAvatar} from '@dicebear/core';
import {openPeeps} from '@dicebear/collection';

// Peep — a hand-drawn character from Open Peeps, generated deterministically by
// DiceBear (the "code layer"). No network, no asset file: the SVG is produced
// from a seed at build time and memoised. Enters with a spring rise + idle sway.
export interface PeepProps {
  seed: string;
  size?: number;
  x?: number; // top-left px in the 1920×1080 canvas
  y?: number;
  flip?: boolean;
  delay?: number;
  float?: boolean;
  rotate?: number;
}

export const Peep: React.FC<PeepProps> = ({
  seed,
  size = 460,
  x = 1240,
  y = 360,
  flip = false,
  delay = 0,
  float = true,
  rotate = 0,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const svg = useMemo(() => createAvatar(openPeeps, {seed, size}).toString(), [seed, size]);

  const p = spring({frame: frame - delay, fps, config: {damping: 160, stiffness: 90, mass: 0.9}, durationInFrames: 26});
  const sway = float ? Math.sin((frame - delay) / fps * 1.6) * 6 : 0;
  const bob = float ? Math.sin((frame - delay) / fps * 1.1) * 8 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        opacity: p,
        transform: `translateY(${(1 - p) * 60 + bob}px) rotate(${rotate + sway * 0.15}deg) scaleX(${flip ? -1 : 1})`,
        filter: 'drop-shadow(0 24px 40px rgba(0,0,0,0.45))',
      }}
      dangerouslySetInnerHTML={{__html: svg}}
    />
  );
};
