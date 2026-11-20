import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile} from 'remotion';

// Clip — plays a pre-rendered video segment (e.g. a manim animation with an
// alpha channel) on the cinematic stage. manim math/diagram moments are rendered
// in CI (see .github/workflows/manim.yml) to public/manim/*.webm and composited
// here. `src` is a path under public/.
export interface ClipProps {
  src: string;
  fit?: 'contain' | 'cover';
  opacity?: number;
  beatFrames?: number;
}

export const Clip: React.FC<ClipProps> = ({src, fit = 'contain', opacity = 1}) => {
  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={staticFile(src)}
        muted
        style={{width: '100%', height: '100%', objectFit: fit, opacity}}
      />
    </AbsoluteFill>
  );
};
