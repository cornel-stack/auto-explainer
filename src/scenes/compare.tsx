import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, TYPE} from '../theme/tokens';
import {useTheme} from '../theme/theme';
import {SectionBar} from '../chrome/SectionBar';
import {SourceCard} from '../chrome/SourceCard';
import {SpecStrip} from '../chrome/SpecStrip';
import {ProgressRail} from '../chrome/ProgressRail';
import {COMPONENTS} from '../components/registry';
import {enter} from '../theme/motion';
import type {Scene, Source, TimedBeat} from '../lib/schema';

// `compare` scene — 2–3 instances of ONE component side by side, same clock,
// different props, each under its own label strip (Spec §6 compare / §7 versus:
// variants are rendered from one component, never two different components).
interface Column {
  label: string;
  sub?: string;
  accent?: keyof typeof COLORS;
  props: Record<string, unknown>;
}

export const CompareScene: React.FC<{
  scene: Scene;
  beat: TimedBeat | null;
  source?: Source;
  globalStart: number;
  totalFrames: number;
}> = ({scene, source, globalStart, totalFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const theme = useTheme();

  const Visual = COMPONENTS[scene.visual.component];
  const columns = (scene.visual.props.columns as Column[]) ?? [];
  const n = Math.max(1, columns.length);
  const colW = 1920 / n;
  const s = colW / 1920;
  const topOffset = (1080 - 1080 * s) / 2 + 40; // nudge down for the label strip

  const progress = (globalStart + frame) / totalFrames;
  const background = theme.dark
    ? `radial-gradient(125% 115% at 60% 28%, ${theme.bgTop} 0%, ${theme.bg} 60%)`
    : theme.bg;

  return (
    <AbsoluteFill style={{background}}>
      {columns.map((c, i) => {
        const accent = c.accent ? COLORS[c.accent] : COLORS.bar;
        const labelIn = enter(frame, fps, 4 + i * 3);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: i * colW,
              top: 0,
              width: colW,
              height: 1080,
              overflow: 'hidden',
            }}
          >
            {/* Vertical divider between columns */}
            {i > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 180,
                  bottom: 180,
                  width: 1,
                  background: theme.dark ? '#2A313C' : COLORS.ghost,
                  opacity: 0.6,
                }}
              />
            ) : null}

            {/* Column label strip */}
            <div
              style={{
                position: 'absolute',
                top: 150,
                left: 0,
                width: colW,
                textAlign: 'center',
                opacity: labelIn,
                transform: `translateY(${(1 - labelIn) * -10}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: TYPE.family,
                  fontSize: 42,
                  fontWeight: 700,
                  color: theme.ink,
                }}
              >
                {c.label}
              </div>
              {c.sub ? (
                <div
                  style={{
                    fontFamily: TYPE.family,
                    fontSize: 26,
                    fontWeight: 500,
                    color: accent,
                    marginTop: 4,
                  }}
                >
                  {c.sub}
                </div>
              ) : null}
              <div
                style={{
                  width: 72,
                  height: 4,
                  background: accent,
                  borderRadius: 2,
                  margin: '14px auto 0',
                }}
              />
            </div>

            {/* The scaled component instance */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: topOffset,
                width: 1920,
                height: 1080,
                transform: `scale(${s})`,
                transformOrigin: '0 0',
              }}
            >
              {Visual ? <Visual {...c.props} /> : null}
            </div>
          </div>
        );
      })}

      {scene.section ? <SectionBar label={scene.section} /> : null}
      {scene.specs && scene.specs.length > 0 ? (
        <SpecStrip specs={scene.specs} />
      ) : null}
      {source ? <SourceCard title={source.title} url={source.url} /> : null}
      <ProgressRail progress={progress} />
    </AbsoluteFill>
  );
};
