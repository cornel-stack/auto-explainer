import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, TYPE} from '../theme/tokens';
import {useTheme} from '../theme/theme';
import {enter} from '../theme/motion';

// SpecStrip — the figures a beat puts on screen, bottom-left (Spec §6 item /
// compare / beat layout). Every numeric value here must trace to a SourceCard.
export interface SpecItem {
  label: string;
  value: string;
  emphasis?: 'fault' | 'ok' | 'bar';
}

export const SpecStrip: React.FC<{specs: SpecItem[]}> = ({specs}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const theme = useTheme();
  if (specs.length === 0) return null;

  const valueColor = (e?: SpecItem['emphasis']): string =>
    e ? COLORS[e] : theme.ink;

  return (
    <div
      style={{
        position: 'absolute',
        left: 96,
        bottom: 72,
        display: 'flex',
        gap: 14,
        alignItems: 'stretch',
      }}
    >
      {specs.map((s, i) => {
        const t = enter(frame, fps, 6 + i * 4);
        return (
          <div
            key={`${s.label}-${i}`}
            style={{
              background: theme.panel,
              border: `1px solid ${theme.dark ? '#2C333F' : COLORS.ghost}`,
              borderRadius: 8,
              padding: '12px 18px',
              opacity: t,
              transform: `translateY(${(1 - t) * 6}px)`,
              boxShadow: theme.dark
                ? '0 8px 24px rgba(0,0,0,0.5)'
                : '0 4px 16px rgba(17,19,24,0.06)',
            }}
          >
            <div
              style={{
                fontFamily: TYPE.family,
                fontSize: 20,
                color: theme.ink2,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: TYPE.mono,
                fontSize: 38,
                fontWeight: 600,
                color: valueColor(s.emphasis),
                lineHeight: 1.1,
              }}
            >
              {s.value}
            </div>
          </div>
        );
      })}
    </div>
  );
};
