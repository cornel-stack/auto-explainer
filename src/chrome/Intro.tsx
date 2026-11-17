import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, TYPE} from '../theme/tokens';
import {enter} from '../theme/motion';

// Opening: state the question and show the mechanism. No logo sting, no
// "welcome back" (Editorial bar, Spec §10 / Production Plan). The first beat's
// visual can be passed as `children` and sits ghosted behind the title.
export const Intro: React.FC<{
  title: string;
  hook?: string;
  accentWord?: string;
  children?: React.ReactNode;
}> = ({title, hook, accentWord, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = enter(frame, fps);

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
    <AbsoluteFill style={{background: COLORS.bg}}>
      {children ? (
        <AbsoluteFill style={{opacity: 0.12, filter: 'saturate(0.2)'}}>
          {children}
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '0 160px',
        }}
      >
        <div
          style={{
            width: 96,
            height: 8,
            background: COLORS.bar,
            borderRadius: 2,
            marginBottom: 40,
            transform: `scaleX(${t})`,
            transformOrigin: 'left',
          }}
        />
        <h1
          style={{
            margin: 0,
            maxWidth: 1400,
            fontFamily: TYPE.family,
            fontSize: 92,
            fontWeight: 700,
            color: COLORS.ink,
            letterSpacing: -2,
            lineHeight: 1.05,
            opacity: t,
            transform: `translateY(${(1 - t) * 14}px)`,
          }}
        >
          {renderTitle()}
        </h1>
        {hook ? (
          <p
            style={{
              marginTop: 28,
              maxWidth: 1200,
              fontFamily: TYPE.family,
              fontSize: 40,
              fontWeight: 400,
              color: COLORS.ink2,
              lineHeight: 1.4,
              opacity: enter(frame, fps, 10),
            }}
          >
            {hook}
          </p>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
