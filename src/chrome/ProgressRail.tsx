import React from 'react';
import {COLORS} from '../theme/tokens';

// A thin rail at the bottom edge showing position through the whole video.
// `progress` is 0..1 for the current frame across the full timeline.
export const ProgressRail: React.FC<{progress: number}> = ({progress}) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: 1920,
        height: 5,
        background: COLORS.ghost,
        opacity: 0.5,
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
          height: '100%',
          background: COLORS.bar,
        }}
      />
    </div>
  );
};
