import React from 'react';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT_MONO, FONT_SANS} from './fonts';
import {CINEMA, DISPLAY, textGlow, type CinemaAccent, accentColor} from './cinema';

// Kinetic typography — text ENTERS, it does not merely fade. Words rise behind
// a mask with a spring stagger; numbers count up; lines wipe in; labels blur in.
// All frame-driven and deterministic.

const clampSpring = (frame: number, fps: number, delay: number, damping = 200) =>
  spring({frame: frame - delay, fps, config: {damping, stiffness: 120, mass: 0.7}, durationInFrames: 18});

// ─── Headline: masked word-by-word rise, one accent word optionally glowing ───
export const KineticHeadline: React.FC<{
  text: string;
  accentWord?: string;
  accent?: CinemaAccent;
  size?: number;
  weight?: number;
  delay?: number;
  stagger?: number;
  align?: 'left' | 'center';
  color?: string;
  maxWidth?: number;
}> = ({
  text,
  accentWord,
  accent = 'cyan',
  size = DISPLAY.title.size,
  weight = DISPLAY.title.weight,
  delay = 0,
  stagger = 3,
  align = 'left',
  color = CINEMA.ink,
  maxWidth,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = text.split(' ');
  const acc = accentColor(accent);
  const accNorm = accentWord?.toLowerCase().replace(/[^a-z0-9]/g, '');

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: `0 ${size * 0.26}px`,
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        maxWidth,
        fontFamily: FONT_SANS,
        fontWeight: weight,
        fontSize: size,
        letterSpacing: DISPLAY.title.tracking,
        lineHeight: 1.04,
      }}
    >
      {words.map((w, i) => {
        const p = clampSpring(frame, fps, delay + i * stagger);
        const isAccent =
          accNorm && w.toLowerCase().replace(/[^a-z0-9]/g, '') === accNorm;
        const c = isAccent ? acc : color;
        // Continuous idle bob so the headline keeps breathing after it lands.
        const idle = Math.sin((frame - delay - i * stagger) / fps * 1.8 + i) * size * 0.03 * p;
        const glowPulse = isAccent ? 1 + 0.25 * Math.sin(frame / fps * 3 + i) : 1;
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', paddingBottom: size * 0.1}}>
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${(1 - p) * size * 1.05 + idle}px) rotate(${(1 - p) * -4}deg)`,
                opacity: p,
                color: c,
                textShadow: isAccent ? textGlow(acc, glowPulse) : 'none',
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
};

// ─── Single line that wipes in from a side mask ───
export const KineticLine: React.FC<{
  text: string;
  size?: number;
  weight?: number;
  color?: string;
  delay?: number;
  align?: 'left' | 'center';
}> = ({text, size = DISPLAY.sub.size, weight = DISPLAY.sub.weight, color = CINEMA.ink2, delay = 0, align = 'left'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = clampSpring(frame, fps, delay);
  return (
    <div
      style={{
        fontFamily: FONT_SANS,
        fontSize: size,
        fontWeight: weight,
        color,
        letterSpacing: 0,
        textAlign: align,
        opacity: p,
        transform: `translateX(${(1 - p) * -24}px)`,
        clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
      }}
    >
      {text}
    </div>
  );
};

// ─── Count-up number with glow (prices, percentages, ratios) ───
export const CountUp: React.FC<{
  to: number;
  from?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  size?: number;
  accent?: CinemaAccent;
  delay?: number;
  duration?: number;
}> = ({to, from = 0, prefix = '', suffix = '', decimals = 0, size = DISPLAY.stat.size, accent = 'cyan', delay = 0, duration = 26}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const pop = clampSpring(frame, fps, delay, 160);
  const val = from + (to - from) * p;
  const c = accentColor(accent);
  // Keep the stat alive: a gentle breathing scale + pulsing glow.
  const breathe = 1 + 0.018 * Math.sin((frame - delay) / fps * 3.5);
  const glowStrength = 1.4 * (1 + 0.22 * Math.sin((frame - delay) / fps * 3));
  return (
    <span
      style={{
        fontFamily: FONT_MONO,
        fontSize: size,
        fontWeight: 800,
        letterSpacing: DISPLAY.stat.tracking,
        color: c,
        textShadow: textGlow(c, glowStrength),
        display: 'inline-block',
        transform: `scale(${(0.8 + 0.2 * pop) * breathe})`,
      }}
    >
      {prefix}
      {val.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}
      {suffix}
    </span>
  );
};

// ─── Pill / chip label (blur + scale in) ───
export const Chip: React.FC<{
  label: string;
  accent?: CinemaAccent;
  delay?: number;
  filled?: boolean;
}> = ({label, accent = 'cyan', delay = 0, filled = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = clampSpring(frame, fps, delay, 160);
  const c = accentColor(accent);
  const bob = Math.sin((frame - delay) / fps * 2 + delay) * 4 * p;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 20px',
        borderRadius: 999,
        border: `1.5px solid ${c}`,
        background: filled ? `${c}22` : 'rgba(255,255,255,0.03)',
        color: c,
        fontFamily: FONT_SANS,
        fontSize: DISPLAY.label.size,
        fontWeight: 600,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        opacity: p,
        transform: `translateY(${bob}px) scale(${0.85 + 0.15 * p})`,
        filter: `blur(${(1 - p) * 6}px)`,
        boxShadow: `0 0 ${20 + 10 * (1 + Math.sin((frame - delay) / fps * 3))}px ${c}33`,
      }}
    >
      <span style={{width: 8, height: 8, borderRadius: 4, background: c, boxShadow: `0 0 10px ${c}`}} />
      {label}
    </span>
  );
};

// ─── Section kicker (top-left) — replaces the old blue SectionBar ───
export const SectionKicker: React.FC<{label: string; accent?: CinemaAccent}> = ({label, accent = 'violet'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const grow = clampSpring(frame, fps, 0);
  const c = accentColor(accent);
  return (
    <div style={{position: 'absolute', left: 96, top: 84, display: 'flex', alignItems: 'center', gap: 18}}>
      <div
        style={{
          width: 44,
          height: 4,
          borderRadius: 2,
          background: c,
          transform: `scaleX(${grow})`,
          transformOrigin: 'left',
          boxShadow: `0 0 14px ${c}`,
        }}
      />
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: DISPLAY.label.size,
          fontWeight: 600,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: CINEMA.ink2,
          opacity: grow,
        }}
      >
        {label}
      </span>
    </div>
  );
};

// ─── Animated lower-third info bar (bottom-left) ───
export const LowerThird: React.FC<{
  title: string;
  value: string;
  accent?: CinemaAccent;
  delay?: number;
}> = ({title, value, accent = 'cyan', delay = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = clampSpring(frame, fps, delay);
  const c = accentColor(accent);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 16,
        opacity: p,
        transform: `translateX(${(1 - p) * -30}px)`,
      }}
    >
      <div style={{width: 5, borderRadius: 3, background: c, boxShadow: `0 0 16px ${c}`}} />
      <div
        style={{
          background: 'rgba(10,15,30,0.72)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${CINEMA.line}`,
          borderRadius: 12,
          padding: '14px 22px',
        }}
      >
        <div style={{fontFamily: FONT_SANS, fontSize: 20, letterSpacing: 2, textTransform: 'uppercase', color: CINEMA.ink3}}>
          {title}
        </div>
        <div style={{fontFamily: FONT_MONO, fontSize: 40, fontWeight: 700, color: c, textShadow: textGlow(c, 0.8)}}>
          {value}
        </div>
      </div>
    </div>
  );
};
