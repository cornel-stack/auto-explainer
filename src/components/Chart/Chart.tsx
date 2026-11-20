import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, GHOST_OPACITY, STROKE, TYPE} from '../../theme/tokens';
import {useTheme} from '../../theme/theme';
import {enter} from '../../theme/motion';

// Chart — a pure, deterministic 2D data component (Spec §9). Two modes:
//   bars  → grouped vertical bars that grow in (timing-advance, AAA deltas)
//   curve → line plot drawn left-to-right (cylinder pressure vs crank angle)
// Every number shown here is authored in script.json and traced to a SourceCard
// by the scene, never invented by the component.

type Accent = keyof typeof COLORS;

export interface ChartBar {
  label: string;
  value: number;
  color?: Accent;
  group?: string;
  note?: string; // small readout drawn above the value (e.g. "+2.7%")
}

export interface ChartCurve {
  label: string;
  color?: Accent;
  dashed?: boolean;
  // points in normalised space: x 0..1 left→right, y 0..1 bottom→top.
  points: Array<[number, number]>;
  markers?: Array<{x: number; y: number; label: string}>;
}

export interface ChartProps {
  mode: 'bars' | 'curve';
  unit?: string;
  max?: number; // bars: value that maps to full height (defaults to max bar)
  baselineLabel?: string;
  // bars
  bars?: ChartBar[];
  // curve
  xLabel?: string;
  yLabel?: string;
  curves?: ChartCurve[];
  // seconds of this beat's audio, passed by the scene for pacing
  beatFrames?: number;
}

// Plot box inside the safe area, below the section bar, above the progress rail.
const BOX = {x0: 320, x1: 1600, yTop: 300, yBot: 788} as const;
const DRAW_FRAMES = 40;

const col = (c: Accent | undefined, fallback: string): string =>
  c ? COLORS[c] : fallback;

export const Chart: React.FC<ChartProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const theme = useTheme();
  const grow = enter(frame, fps, 6); // bars/markers share one spring-in

  if (props.mode === 'bars') {
    return <Bars {...props} grow={grow} theme={theme} />;
  }
  return <Curve {...props} frame={frame} theme={theme} />;
};

const Bars: React.FC<
  ChartProps & {grow: number; theme: ReturnType<typeof useTheme>}
> = ({bars = [], max, unit, grow, theme}) => {
  const peak = max ?? Math.max(1, ...bars.map((b) => Math.abs(b.value)));
  const n = bars.length;
  const slotW = (BOX.x1 - BOX.x0) / Math.max(1, n);
  const barW = Math.min(150, slotW * 0.52);
  const baseY = BOX.yBot - 40;
  const fullH = baseY - BOX.yTop - 40;

  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        {/* Baseline */}
        <line
          x1={BOX.x0}
          y1={baseY}
          x2={BOX.x1}
          y2={baseY}
          stroke={theme.ink2}
          strokeWidth={STROKE.leader}
        />
        {bars.map((b, i) => {
          const cx = BOX.x0 + slotW * (i + 0.5);
          const h = (Math.abs(b.value) / peak) * fullH * grow;
          const color = col(b.color, COLORS.bar);
          const faded = b.color === undefined;
          return (
            <g key={`${b.label}-${i}`}>
              <rect
                x={cx - barW / 2}
                y={baseY - h}
                width={barW}
                height={h}
                rx={8}
                fill={color}
                opacity={faded ? GHOST_OPACITY + 0.25 : 0.92}
              />
              {/* Value readout */}
              <text
                x={cx}
                y={baseY - h - 18}
                textAnchor="middle"
                fontFamily={TYPE.mono}
                fontSize={34}
                fontWeight={600}
                fill={theme.ink}
                opacity={grow}
              >
                {b.note ?? `${b.value}${unit ?? ''}`}
              </text>
              {/* Category label */}
              <text
                x={cx}
                y={baseY + 44}
                textAnchor="middle"
                fontFamily={TYPE.family}
                fontSize={28}
                fontWeight={500}
                fill={theme.ink2}
              >
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

const Curve: React.FC<
  ChartProps & {frame: number; theme: ReturnType<typeof useTheme>}
> = ({curves = [], xLabel, yLabel, frame, theme}) => {
  const p = Math.min(1, Math.max(0, frame / DRAW_FRAMES));
  const px = (nx: number) => BOX.x0 + nx * (BOX.x1 - BOX.x0);
  const py = (ny: number) => BOX.yBot - ny * (BOX.yBot - BOX.yTop);

  // Build a path for the fraction `p` of a curve's points, interpolating the
  // final partial segment so the line draws smoothly left-to-right.
  const partialPath = (pts: Array<[number, number]>): string => {
    if (pts.length === 0) return '';
    const span = (pts.length - 1) * p;
    const whole = Math.floor(span);
    const frac = span - whole;
    const shown: Array<[number, number]> = [];
    for (let i = 0; i <= whole && i < pts.length; i++) {
      const q = pts[i]!;
      shown.push([px(q[0]), py(q[1])]);
    }
    if (whole < pts.length - 1 && frac > 0) {
      const a = pts[whole]!;
      const b = pts[whole + 1]!;
      shown.push([
        px(a[0] + (b[0] - a[0]) * frac),
        py(a[1] + (b[1] - a[1]) * frac),
      ]);
    }
    return shown
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`)
      .join(' ');
  };

  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        {/* Axes */}
        <line x1={BOX.x0} y1={BOX.yTop} x2={BOX.x0} y2={BOX.yBot} stroke={theme.ink2} strokeWidth={STROKE.leader} />
        <line x1={BOX.x0} y1={BOX.yBot} x2={BOX.x1} y2={BOX.yBot} stroke={theme.ink2} strokeWidth={STROKE.leader} />
        {yLabel ? (
          <text
            x={BOX.x0 - 24}
            y={BOX.yTop - 24}
            textAnchor="start"
            fontFamily={TYPE.family}
            fontSize={26}
            fill={theme.ink2}
          >
            {yLabel}
          </text>
        ) : null}
        {xLabel ? (
          <text
            x={BOX.x1}
            y={BOX.yBot + 48}
            textAnchor="end"
            fontFamily={TYPE.family}
            fontSize={26}
            fill={theme.ink2}
          >
            {xLabel}
          </text>
        ) : null}

        {curves.map((c, i) => {
          const color = col(c.color, COLORS.bar);
          return (
            <g key={`${c.label}-${i}`}>
              <path
                d={partialPath(c.points)}
                fill="none"
                stroke={color}
                strokeWidth={STROKE.flow}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={c.dashed ? '14 12' : undefined}
              />
              {/* Series label at the curve's right end */}
              {c.points.length > 0 ? (
                <text
                  x={px(c.points[c.points.length - 1]![0]) + 16}
                  y={py(c.points[c.points.length - 1]![1])}
                  fontFamily={TYPE.family}
                  fontSize={26}
                  fontWeight={600}
                  fill={color}
                  opacity={p > 0.92 ? 1 : 0}
                >
                  {c.label}
                </text>
              ) : null}
              {(c.markers ?? []).map((m, j) => {
                const show = p >= m.x; // marker appears as the draw reaches it
                return (
                  <g key={j} opacity={show ? 1 : 0}>
                    <circle cx={px(m.x)} cy={py(m.y)} r={10} fill={color} />
                    <text
                      x={px(m.x)}
                      y={py(m.y) - 22}
                      textAnchor="middle"
                      fontFamily={TYPE.family}
                      fontSize={26}
                      fontWeight={600}
                      fill={theme.ink}
                    >
                      {m.label}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
