import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, TYPE} from '../theme/tokens';
import {useTheme} from '../theme/theme';
import {enter} from '../theme/motion';

// A 6×44 bar at (96,72) with the section label to its right. Present on every
// scene except title cards — Spec §3. It is what ties the five series together.
export const SectionBar: React.FC<{label: string}> = ({label}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const theme = useTheme();
  const grow = enter(frame, fps);
  return (
    <div
      style={{
        position: 'absolute',
        left: 96,
        top: 72,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}
    >
      <div
        style={{
          width: 6,
          height: 44,
          background: COLORS.bar,
          transform: `scaleY(${grow})`,
          transformOrigin: 'top',
          borderRadius: 1,
        }}
      />
      <span
        style={{
          fontFamily: TYPE.family,
          fontSize: TYPE.sectionLabel.size,
          fontWeight: TYPE.sectionLabel.weight,
          color: theme.ink,
          opacity: grow,
          letterSpacing: -0.5,
          textShadow: theme.dark ? '0 2px 12px rgba(0,0,0,0.6)' : 'none',
        }}
      >
        {label}
      </span>
    </div>
  );
};
