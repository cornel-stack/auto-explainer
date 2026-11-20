import React from 'react';
import {Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

// Illustration — a committed Coco Material vector (CC-BY), used for "a figure
// doing an activity" moments (pumping fuel, reading the manual, counting money).
// Placed and animated with a spring rise + gentle idle bob. Credit lives in the
// video's ATTRIBUTION.md and a global credits line.
export interface IllustrationProps {
  src: string; // path under public/ e.g. "pvr/act-pump.svg"
  size?: number;
  x?: number;
  y?: number;
  flip?: boolean;
  delay?: number;
  float?: boolean;
  rotate?: number;
}

export const Illustration: React.FC<IllustrationProps> = ({
  src,
  size = 440,
  x = 1180,
  y = 300,
  flip = false,
  delay = 0,
  float = true,
  rotate = 0,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - delay, fps, config: {damping: 150, stiffness: 95, mass: 0.9}, durationInFrames: 24});
  const bob = float ? Math.sin((frame - delay) / fps * 1.3) * 7 : 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        opacity: p,
        transform: `translateY(${(1 - p) * 50 + bob}px) rotate(${rotate}deg) scaleX(${flip ? -1 : 1})`,
        filter: 'drop-shadow(0 20px 36px rgba(0,0,0,0.4))',
      }}
    >
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
    </div>
  );
};
