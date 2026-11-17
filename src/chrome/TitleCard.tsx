import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, TYPE} from '../theme/tokens';
import {enter} from '../theme/motion';

// Centered scene title with an optional subtitle. Title cards carry no section
// bar (Spec §3). Used for `title` scenes and section breaks.
export const TitleCard: React.FC<{
  title: string;
  subtitle?: string;
  accentWord?: string;
}> = ({title, subtitle, accentWord}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = enter(frame, fps);
  const bar = enter(frame, fps, 4);

  const renderTitle = () => {
    if (!accentWord) return title;
    const idx = title.toLowerCase().indexOf(accentWord.toLowerCase());
    if (idx === -1) return title;
    return (
      <>
        {title.slice(0, idx)}
        <span style={{color: COLORS.bar}}>
          {title.slice(idx, idx + accentWord.length)}
        </span>
        {title.slice(idx + accentWord.length)}
      </>
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 96,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 72,
          height: 6,
          background: COLORS.bar,
          borderRadius: 2,
          marginBottom: 36,
          transform: `scaleX(${bar})`,
        }}
      />
      <h1
        style={{
          margin: 0,
          fontFamily: TYPE.family,
          fontSize: TYPE.sceneTitle.size,
          fontWeight: TYPE.sceneTitle.weight,
          color: COLORS.ink,
          letterSpacing: -1,
          lineHeight: 1.1,
          opacity: t,
          transform: `translateY(${(1 - t) * 12}px)`,
        }}
      >
        {renderTitle()}
      </h1>
      {subtitle ? (
        <p
          style={{
            marginTop: 24,
            fontFamily: TYPE.family,
            fontSize: TYPE.callout.size,
            fontWeight: 400,
            color: COLORS.ink2,
            maxWidth: 1100,
            lineHeight: 1.35,
            opacity: enter(frame, fps, 8),
          }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
};
