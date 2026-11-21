import React, {useMemo} from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {CINEMA} from '../../theme/cinema';

// Montage — an EDIT, not a looping slideshow. Each image appears exactly once,
// cuts land on narration word boundaries (~`hold` apart), each shot gets a slow
// Ken-Burns move, and a short dip-to-black punctuates the cut. When the unique
// images run out, the final HERO shot is held (slow strong push) for the rest of
// the beat — it never loops or repeats.

export interface MontageProps {
  images: string[];
  wordStarts: number[]; // narration word onsets, in frames
  hold?: number; // min frames per image (default 45 ≈ 1.5s)
  beatFrames?: number;
}

// Cut frames: one per image. Walk the word onsets, taking a cut whenever at
// least `hold` frames have passed since the last — so cuts sit on speech. Fill
// any shortfall at a steady `hold` cadence.
export function montageCuts(wordStarts: number[], count: number, hold: number): number[] {
  const cuts: number[] = [0];
  let last = 0;
  for (const wf of wordStarts) {
    if (cuts.length >= count) break;
    if (wf - last >= hold) {
      cuts.push(wf);
      last = wf;
    }
  }
  while (cuts.length < count) {
    last += hold;
    cuts.push(last);
  }
  return cuts;
}

const PAN: Array<[number, number]> = [
  [1.6, 0.8],
  [-1.5, 0.6],
  [0.8, -1.5],
  [-0.9, -1.3],
  [1.3, 1.4],
  [-1.4, 1.1],
];

export const Montage: React.FC<MontageProps> = ({images, wordStarts, hold = 45, beatFrames = 300}) => {
  const frame = useCurrentFrame();
  const n = Math.max(1, images.length);
  const cuts = useMemo(() => montageCuts(wordStarts, n, hold), [wordStarts, n, hold]);

  let idx = 0;
  for (let i = 0; i < cuts.length; i++) if (frame >= cuts[i]!) idx = i;
  idx = Math.min(idx, n - 1);
  const isHero = idx === n - 1;

  const start = cuts[idx]!;
  const end = cuts[idx + 1] ?? beatFrames;
  const dur = Math.max(1, end - start);
  const p = Math.max(0, Math.min(1, (frame - start) / dur));

  // Ken-Burns: steady push; hero pushes slower + further over its long hold.
  const [px, py] = PAN[idx % PAN.length]!;
  const scale = isHero ? 1.05 + 0.16 * p : 1.06 + 0.09 * p;
  const panX = (isHero ? px * 0.5 : px) * p;
  const panY = (isHero ? py * 0.5 : py) * p;

  // Dip-to-black on the first ~4 frames of every cut after the first.
  const sinceCut = frame - start;
  const dip = idx > 0 && sinceCut < 5 ? interpolate(sinceCut, [0, 2, 5], [0.85, 0.5, 0], {extrapolateRight: 'clamp'}) : 0;

  const src = images[idx] ?? images[0]!;

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Img
        src={staticFile(src)}
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translate(${panX}%, ${panY}%)`}}
      />
      {/* Shared dark grade so the photos belong to the 3D world */}
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${CINEMA.bg0}22 0%, ${CINEMA.bg0}66 100%)`, mixBlendMode: 'multiply', pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: `radial-gradient(120% 100% at 50% 45%, transparent 54%, ${CINEMA.bg0} 100%)`, pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: '#000', opacity: dip, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
