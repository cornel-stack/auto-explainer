import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, TYPE, STROKE} from '../../theme/tokens';
import {useTheme} from '../../theme/theme';
import {enter} from '../../theme/motion';

// DecisionTree — the closing "which one for you" of a Versus video (Spec §7).
// One root question branches to a small set of outcomes, each revealed in turn.

type Accent = 'fault' | 'ok' | 'bar';

export interface DecisionBranch {
  condition: string; // the test, e.g. "Manual says 'Premium required'"
  outcome: string; // the verdict, e.g. "Buy premium"
  accent?: Accent;
}

export interface DecisionTreeProps {
  root: string;
  branches: DecisionBranch[];
  beatFrames?: number;
}

const REVEAL_STAGGER = 16;

export const DecisionTree: React.FC<DecisionTreeProps> = ({root, branches}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const theme = useTheme();

  const n = branches.length;
  const rootBox = {x: 760, y: 240, w: 400, h: 110};
  const rootCx = rootBox.x + rootBox.w / 2;
  const rootBot = rootBox.y + rootBox.h;

  const leafTop = 560;
  const leafH = 150;
  const leafW = 420;
  const gap = 40;
  const totalW = n * leafW + (n - 1) * gap;
  const startX = (1920 - totalW) / 2;

  const accentColor = (a?: Accent): string => (a ? COLORS[a] : COLORS.bar);
  const rootIn = enter(frame, fps, 2);

  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        {/* Root question */}
        <g opacity={rootIn} transform={`translate(0 ${(1 - rootIn) * -14})`}>
          <rect
            x={rootBox.x}
            y={rootBox.y}
            width={rootBox.w}
            height={rootBox.h}
            rx={16}
            fill={theme.panel}
            stroke={COLORS.bar}
            strokeWidth={STROKE.outline}
          />
          <text
            x={rootCx}
            y={rootBox.y + rootBox.h / 2 + 10}
            textAnchor="middle"
            fontFamily={TYPE.family}
            fontSize={32}
            fontWeight={700}
            fill={theme.ink}
          >
            {root}
          </text>
        </g>

        {branches.map((b, i) => {
          const appearAt = 10 + i * REVEAL_STAGGER;
          const t = enter(frame, fps, appearAt);
          const lx = startX + i * (leafW + gap);
          const lcx = lx + leafW / 2;
          const ac = accentColor(b.accent);
          return (
            <g key={i} opacity={t}>
              {/* Connector from root to this leaf */}
              <path
                d={`M ${rootCx} ${rootBot} C ${rootCx} ${rootBot + 120}, ${lcx} ${leafTop - 120}, ${lcx} ${leafTop}`}
                fill="none"
                stroke={ac}
                strokeWidth={STROKE.outline}
                opacity={0.7}
              />
              {/* Condition pill */}
              <rect
                x={lx}
                y={leafTop}
                width={leafW}
                height={66}
                rx={12}
                fill={theme.dark ? '#1F2630' : '#EAEEF3'}
              />
              <text
                x={lcx}
                y={leafTop + 42}
                textAnchor="middle"
                fontFamily={TYPE.family}
                fontSize={26}
                fontWeight={500}
                fill={theme.ink2}
              >
                {b.condition}
              </text>
              {/* Outcome card */}
              <rect
                x={lx}
                y={leafTop + 82}
                width={leafW}
                height={leafH - 82 + 44}
                rx={14}
                fill={theme.panel}
                stroke={ac}
                strokeWidth={STROKE.outline}
              />
              <text
                x={lcx}
                y={leafTop + 82 + 58}
                textAnchor="middle"
                fontFamily={TYPE.family}
                fontSize={34}
                fontWeight={700}
                fill={ac}
              >
                {b.outcome}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
