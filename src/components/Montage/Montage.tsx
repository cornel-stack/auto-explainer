import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {CINEMA} from '../../theme/cinema';

// Montage — full-screen images with VERY fast hard cuts (B-roll energy), for the
// non-3D beats. Each image holds for `cut` frames, pushes in slightly, pans a
// touch (direction varies per cut so repeats don't read as repeats), and a short
// dark flash punctuates every cut. No slow one-image-per-second holds.
export interface MontageProps {
  images: string[]; // paths under public/
  cut?: number; // frames per image (default ~9 ≈ 0.3s)
}

const PAN: Array<[number, number]> = [
  [1.4, 0.6],
  [-1.3, 0.5],
  [0.7, -1.3],
  [-0.8, -1.1],
  [1.1, 1.2],
  [-1.2, 1.0],
];

export const Montage: React.FC<MontageProps> = ({images, cut = 9}) => {
  const frame = useCurrentFrame();
  const n = Math.max(1, images.length);
  const slot = Math.floor(frame / cut);
  const idx = slot % n;
  const localT = (frame % cut) / cut;

  const scale = 1.05 + 0.1 * localT;
  const [px, py] = PAN[slot % PAN.length]!;
  const panX = px * localT;
  const panY = py * localT;

  // Dark flash on the first 2 frames of each cut.
  const flash = interpolate(frame % cut, [0, 1, 2], [0.55, 0.2, 0], {extrapolateRight: 'clamp'});
  const src = images[idx] ?? images[0]!;

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Img
        src={staticFile(src)}
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translate(${panX}%, ${panY}%)`}}
      />
      {/* cinematic vignette + subtle grade */}
      <AbsoluteFill style={{background: `radial-gradient(120% 100% at 50% 45%, transparent 52%, ${CINEMA.bg0} 100%)`, pointerEvents: 'none'}} />
      {/* cut flash */}
      <AbsoluteFill style={{background: '#000', opacity: flash, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
