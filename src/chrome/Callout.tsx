import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, STROKE, TYPE} from '../theme/tokens';
import {useTheme} from '../theme/theme';
import {enter} from '../theme/motion';

export interface CalloutProps {
  text: string;
  // Point in canvas coordinates the leader line points at.
  at: {x: number; y: number};
  // Where the label sits relative to the point.
  side?: 'left' | 'right' | 'top' | 'bottom';
  appearAt?: number; // frame (relative to scene) the callout springs in
  accent?: keyof typeof COLORS;
}

// A label with a leader line to a point on the diagram. At most two on screen
// at once (enforced by the mechanism scene) — Spec §6.
export const Callout: React.FC<CalloutProps> = ({
  text,
  at,
  side = 'right',
  appearAt = 0,
  accent = 'ink',
}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const theme = useTheme();
  const t = enter(frame, fps, appearAt);
  if (frame < appearAt) return null;

  const lead = 120; // leader line length
  const dir =
    side === 'right'
      ? {x: 1, y: 0}
      : side === 'left'
        ? {x: -1, y: 0}
        : side === 'top'
          ? {x: 0, y: -1}
          : {x: 0, y: 1};
  const endX = at.x + dir.x * lead;
  const endY = at.y + dir.y * lead;
  const color = COLORS[accent];

  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    maxWidth: 520,
    fontFamily: TYPE.family,
    fontSize: TYPE.callout.size,
    fontWeight: TYPE.callout.weight,
    color: theme.ink,
    background: theme.panel,
    border: `2px solid ${color}`,
    borderRadius: 10,
    padding: '10px 18px',
    lineHeight: 1.2,
    boxShadow: theme.dark
      ? '0 8px 28px rgba(0,0,0,0.55)'
      : '0 6px 20px rgba(17,19,24,0.08)',
    opacity: t,
    transform: `translateY(${(1 - t) * 8}px)`,
  };

  // Anchor the label box at the leader end.
  if (side === 'right') Object.assign(labelStyle, {left: endX, top: endY - 30});
  if (side === 'left')
    Object.assign(labelStyle, {right: width - endX, top: endY - 30});
  if (side === 'top')
    Object.assign(labelStyle, {left: endX - 100, bottom: 1080 - endY});
  if (side === 'bottom') Object.assign(labelStyle, {left: endX - 100, top: endY});

  return (
    <>
      <svg
        width={1920}
        height={1080}
        style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}
      >
        <circle cx={at.x} cy={at.y} r={6} fill={color} opacity={t} />
        <line
          x1={at.x}
          y1={at.y}
          x2={at.x + (endX - at.x) * t}
          y2={at.y + (endY - at.y) * t}
          stroke={color}
          strokeWidth={STROKE.leader}
        />
      </svg>
      <div style={labelStyle}>{text}</div>
    </>
  );
};
