import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, TYPE} from '../theme/tokens';
import {useTheme} from '../theme/theme';
import {enter} from '../theme/motion';

// Closing card. Points to the next video; no outro sting.
export const Outro: React.FC<{text: string; nextTitle?: string}> = ({
  text,
  nextTitle,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const theme = useTheme();
  const t = enter(frame, fps);
  return (
    <AbsoluteFill
      style={{
        background: theme.dark
          ? `radial-gradient(130% 110% at 50% 40%, ${theme.bgTop} 0%, ${theme.bg} 65%)`
          : theme.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 160,
        textAlign: 'center',
      }}
    >
      <p
        style={{
          margin: 0,
          maxWidth: 1300,
          fontFamily: TYPE.family,
          fontSize: 48,
          fontWeight: 500,
          color: theme.ink,
          lineHeight: 1.3,
          opacity: t,
          transform: `translateY(${(1 - t) * 10}px)`,
        }}
      >
        {text}
      </p>
      {nextTitle ? (
        <div
          style={{
            marginTop: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            opacity: enter(frame, fps, 12),
          }}
        >
          <span
            style={{
              fontFamily: TYPE.mono,
              fontSize: 22,
              fontWeight: 600,
              color: COLORS.bar,
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            Next
          </span>
          <span
            style={{
              fontFamily: TYPE.family,
              fontSize: 34,
              fontWeight: 600,
              color: theme.ink,
            }}
          >
            {nextTitle}
          </span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
