import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme/tokens';
import {useTheme} from '../theme/theme';
import {SectionBar} from '../chrome/SectionBar';
import {SourceCard} from '../chrome/SourceCard';
import {Callout} from '../chrome/Callout';
import {ProgressRail} from '../chrome/ProgressRail';
import {ANCHORS, COMPONENTS, THREE_D} from '../components/registry';
import {cameraFor, partWorld, projectToScreen, type CameraPreset} from '../components/Engine3D';
import {FALLBACK_CUE_FRAME, findCueFrame} from '../lib/timing';
import type {Scene, Source, TimedBeat} from '../lib/schema';

// `mechanism` scene — full-bleed visual, callouts on word cues, SourceCard when
// a figure is spoken (Spec §6). Used by How It Works and What Happens If.
export const MechanismScene: React.FC<{
  scene: Scene;
  beat: TimedBeat | null;
  source?: Source;
  globalStart: number;
  totalFrames: number;
}> = ({scene, beat, source, globalStart, totalFrames}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const theme = useTheme();

  const Visual = COMPONENTS[scene.visual.component];
  const is3D = THREE_D.has(scene.visual.component);
  const focusCyl =
    typeof scene.visual.props.focusCylinder === 'number'
      ? (scene.visual.props.focusCylinder as number)
      : 0;
  const anchorFn = ANCHORS[scene.visual.component];
  const anchors = anchorFn ? anchorFn(focusCyl) : {};

  // For 3D, project each part's world position through the beat's camera at the
  // current frame so leader lines track the part as the camera drifts.
  const beatFrames = beat?.frames ?? 300;
  const t01 = Math.min(1, Math.max(0, frame / beatFrames));
  const preset = (scene.visual.props.camera as CameraPreset) ?? 'wide';
  const cam = cameraFor(preset, t01, focusCyl);
  const resolveAt = (anchorName: string): {x: number; y: number} => {
    if (is3D) return projectToScreen(partWorld(anchorName, focusCyl), cam, width, height);
    return anchors[anchorName] ?? {x: 960, y: 420};
  };

  // Resolve callout cues to frames; keep at most two visible at once (Spec §6).
  const callouts = (scene.cues ?? [])
    .filter((c) => c.do === 'callout')
    .map((c) => {
      const resolved = findCueFrame(beat, fps, c.on);
      const appearAt = resolved ?? FALLBACK_CUE_FRAME;
      const a = c.args ?? {};
      const anchorName = String(a.anchor ?? 'chamber');
      return {
        appearAt,
        text: String(a.text ?? ''),
        side: (a.side as 'left' | 'right' | 'top' | 'bottom') ?? 'right',
        accent: (a.accent as keyof typeof COLORS) ?? 'ink',
        at: resolveAt(anchorName),
      };
    })
    .sort((x, y) => x.appearAt - y.appearAt);

  const active = callouts.filter((c) => frame >= c.appearAt);
  const visible = active.slice(-2); // only the two most recent

  const progress = (globalStart + frame) / totalFrames;

  const background = theme.dark
    ? `radial-gradient(125% 115% at 60% 28%, ${theme.bgTop} 0%, ${theme.bg} 60%)`
    : theme.bg;

  return (
    <AbsoluteFill style={{background}}>
      {Visual ? <Visual {...scene.visual.props} beatFrames={beatFrames} /> : null}

      {scene.section ? <SectionBar label={scene.section} /> : null}

      {visible.map((c, i) => (
        <Callout
          key={`${c.text}-${i}`}
          text={c.text}
          at={c.at}
          side={c.side}
          accent={c.accent}
          appearAt={c.appearAt}
        />
      ))}

      {source ? <SourceCard title={source.title} url={source.url} /> : null}

      <ProgressRail progress={progress} />
    </AbsoluteFill>
  );
};
