import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, TYPE, STROKE} from '../../theme/tokens';
import {useTheme} from '../../theme/theme';
import {enter} from '../../theme/motion';

// Table — the Versus pay-off: rows reveal one at a time so the narration can
// name each as it lands (Spec §6 compare / §7 versus). Pure and deterministic.

type Accent = 'fault' | 'ok' | 'bar';

export interface TableRow {
  cells: string[];
  accent?: Accent; // tints the first cell + its left rule
}

export interface TableProps {
  columns: string[];
  rows: TableRow[];
  caption?: string;
  beatFrames?: number;
}

const REVEAL_STAGGER = 14; // frames between row reveals

const BOX = {x0: 300, x1: 1620, yTop: 300} as const;

export const Table: React.FC<TableProps> = ({columns, rows, caption}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const theme = useTheme();

  const nCols = columns.length;
  const width = BOX.x1 - BOX.x0;
  const colW = width / nCols;
  const headerY = BOX.yTop;
  const rowH = 96;
  const bodyTop = headerY + 72;

  const accentColor = (a?: Accent): string =>
    a ? COLORS[a] : theme.ink2;

  const sweepX = BOX.x0 + ((frame * 7) % (width + 400)) - 200;
  const tableBottom = bodyTop + rows.length * rowH;

  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        <defs>
          <linearGradient id="tbl-sheen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Header */}
        {columns.map((c, i) => (
          <text
            key={c}
            x={BOX.x0 + colW * i + 28}
            y={headerY}
            fontFamily={TYPE.family}
            fontSize={30}
            fontWeight={700}
            letterSpacing={1}
            fill={theme.ink2}
          >
            {c.toUpperCase()}
          </text>
        ))}
        <line
          x1={BOX.x0}
          y1={headerY + 20}
          x2={BOX.x1}
          y2={headerY + 20}
          stroke={theme.ink2}
          strokeWidth={STROKE.leader}
        />

        {/* Rows */}
        {rows.map((r, i) => {
          const appearAt = 6 + i * REVEAL_STAGGER;
          const t = enter(frame, fps, appearAt);
          const y = bodyTop + i * rowH;
          const ac = accentColor(r.accent);
          return (
            <g key={i} opacity={t} transform={`translate(0 ${(1 - t) * 16})`}>
              {/* Row card */}
              <rect
                x={BOX.x0}
                y={y}
                width={width}
                height={rowH - 16}
                rx={12}
                fill={theme.panel}
                stroke={theme.dark ? '#2A313C' : '#E3E7EC'}
                strokeWidth={1}
              />
              {/* Accent left rule */}
              <rect x={BOX.x0} y={y} width={8} height={rowH - 16} rx={4} fill={ac} />
              {r.cells.map((cell, ci) => (
                <text
                  key={ci}
                  x={BOX.x0 + colW * ci + 28}
                  y={y + (rowH - 16) / 2 + 12}
                  fontFamily={ci === 0 ? TYPE.family : TYPE.family}
                  fontSize={ci === 0 ? 34 : 30}
                  fontWeight={ci === 0 ? 700 : 400}
                  fill={ci === 0 ? (r.accent ? ac : theme.ink) : theme.ink}
                >
                  {cell}
                </text>
              ))}
            </g>
          );
        })}

        {caption ? (
          <text
            x={BOX.x0}
            y={bodyTop + rows.length * rowH + 44}
            fontFamily={TYPE.family}
            fontSize={24}
            fill={theme.ink2}
          >
            {caption}
          </text>
        ) : null}

        {/* Sweeping sheen across the table */}
        <rect x={sweepX} y={bodyTop - 8} width={140} height={tableBottom - bodyTop} fill="url(#tbl-sheen)" opacity={0.07} transform={`skewX(-14)`} />
      </svg>
    </AbsoluteFill>
  );
};
