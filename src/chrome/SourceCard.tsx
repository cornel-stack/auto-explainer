import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, TYPE} from '../theme/tokens';
import {useTheme} from '../theme/theme';
import {enter} from '../theme/motion';

// The document a figure comes from, shown bottom-right when a quantitative
// claim is spoken — Spec §6 / §10 (a SourceCard at least once per beat).
export const SourceCard: React.FC<{title: string; url?: string}> = ({
  title,
  url,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const theme = useTheme();
  const t = enter(frame, fps, 6);
  let host = '';
  try {
    host = url ? new URL(url).host.replace(/^www\./, '') : '';
  } catch {
    host = '';
  }
  return (
    <div
      style={{
        position: 'absolute',
        right: 96,
        bottom: 72,
        maxWidth: 560,
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        background: theme.panel,
        border: `1px solid ${theme.dark ? '#2C333F' : COLORS.ghost}`,
        borderLeft: `4px solid ${COLORS.bar}`,
        borderRadius: 8,
        padding: '12px 16px',
        opacity: t,
        transform: `translateY(${(1 - t) * 6}px)`,
        boxShadow: theme.dark
          ? '0 8px 24px rgba(0,0,0,0.5)'
          : '0 4px 16px rgba(17,19,24,0.06)',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: TYPE.mono,
            fontSize: 18,
            fontWeight: 600,
            color: COLORS.bar,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 4,
          }}
        >
          Source
        </div>
        <div
          style={{
            fontFamily: TYPE.family,
            fontSize: TYPE.caption.size,
            color: theme.ink,
            lineHeight: 1.25,
          }}
        >
          {title}
        </div>
        {host ? (
          <div
            style={{
              fontFamily: TYPE.mono,
              fontSize: 16,
              color: theme.ink2,
              marginTop: 4,
            }}
          >
            {host}
          </div>
        ) : null}
      </div>
    </div>
  );
};
