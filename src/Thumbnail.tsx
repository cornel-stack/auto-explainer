import React, {useMemo} from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {createAvatar} from '@dicebear/core';
import {openPeeps} from '@dicebear/collection';
import {CINEMA, textGlow} from './theme/cinema';
import {FONT_SANS, FONT_MONO} from './theme/fonts';

// Clickbait thumbnail, rendered as a still (1280×720). Big, high-contrast,
// few words, one shocked Open Peep, a loud money badge — designed to earn the
// click. Three variants so the owner can A/B pick the winner.

type Variant = 'a' | 'b' | 'c';

interface Line {
  text: string;
  color: string;
  strike?: boolean;
  size?: number;
}

interface VarConfig {
  seed: string;
  face: string;
  lines: Line[];
  badge: {text: string; sub?: string; color: string};
  photo: string;
  check?: boolean;
}

const CONFIGS: Record<Variant, VarConfig> = {
  a: {
    seed: 'pump-shock-7',
    face: 'awe',
    lines: [
      {text: 'PREMIUM', color: CINEMA.ink},
      {text: 'GAS IS A', color: CINEMA.ink},
      {text: 'LIE?', color: CINEMA.power, size: 240},
    ],
    badge: {text: '$2 BILLION', sub: 'WASTED / YEAR', color: CINEMA.power},
    photo: 'pvr/01-pump-selector.jpg',
  },
  b: {
    seed: 'wallet-shock-3',
    face: 'concernedFear',
    lines: [
      {text: 'ARE YOU', color: CINEMA.ink},
      {text: 'WASTING', color: CINEMA.premium, size: 200},
      {text: 'MONEY?', color: CINEMA.ink},
    ],
    badge: {text: '87 vs 93', sub: 'DOES IT MATTER?', color: CINEMA.premium},
    photo: 'pvr/05-price-sign.jpg',
  },
  c: {
    seed: 'stop-shock-9',
    face: 'fear',
    lines: [
      {text: 'STOP BUYING', color: CINEMA.ink, size: 128},
      {text: 'PREMIUM', color: CINEMA.power, strike: true, size: 210},
    ],
    badge: {text: 'THE TRUTH', sub: 'most cars don’t need it', color: CINEMA.ok},
    photo: 'pvr/02-octane-sticker.jpg',
    check: true,
  },
};

export const Thumbnail: React.FC<{variant?: Variant}> = ({variant = 'a'}) => {
  const cfg = CONFIGS[variant];
  const peep = useMemo(
    () => createAvatar(openPeeps, {seed: cfg.seed, size: 620, face: [cfg.face as never]}).toString(),
    [cfg.seed, cfg.face]
  );

  return (
    <AbsoluteFill style={{background: CINEMA.bg0, overflow: 'hidden'}}>
      {/* Dramatic diagonal wash */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(90% 120% at 15% 10%, ${cfg.badge.color}2E 0%, transparent 55%), radial-gradient(90% 120% at 100% 100%, ${CINEMA.violet}22 0%, transparent 60%), linear-gradient(135deg, ${CINEMA.bg1} 0%, ${CINEMA.bg0} 70%)`,
        }}
      />
      {/* Grid texture */}
      <svg width={1280} height={720} style={{position: 'absolute', inset: 0, opacity: 0.08}}>
        <defs>
          <pattern id="tg" width={64} height={64} patternUnits="userSpaceOnUse">
            <path d="M64 0 L0 0 0 64" fill="none" stroke={CINEMA.line} strokeWidth={1} />
          </pattern>
        </defs>
        <rect width={1280} height={720} fill="url(#tg)" />
      </svg>

      {/* Context photo inset, bottom-left, framed */}
      <div
        style={{
          position: 'absolute',
          left: 54,
          bottom: 48,
          width: 340,
          height: 220,
          borderRadius: 18,
          overflow: 'hidden',
          border: `3px solid ${cfg.badge.color}`,
          boxShadow: `0 0 40px ${cfg.badge.color}55`,
          transform: 'rotate(-3deg)',
        }}
      >
        <Img src={staticFile(cfg.photo)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        <AbsoluteFill style={{background: `linear-gradient(180deg, transparent 40%, ${CINEMA.bg0}cc 100%)`}} />
      </div>

      {/* Shocked Open Peep, right side */}
      <div
        style={{
          position: 'absolute',
          right: -20,
          bottom: -40,
          width: 640,
          height: 720,
          filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.6))',
        }}
        dangerouslySetInnerHTML={{__html: peep}}
      />

      {/* Rotated money badge, top-right */}
      <div
        style={{
          position: 'absolute',
          right: 70,
          top: 46,
          transform: 'rotate(6deg)',
          background: cfg.badge.color,
          color: CINEMA.bg0,
          padding: '14px 26px',
          borderRadius: 16,
          textAlign: 'center',
          boxShadow: `0 10px 30px ${cfg.badge.color}66`,
          border: '4px solid rgba(255,255,255,0.85)',
        }}
      >
        <div style={{fontFamily: FONT_MONO, fontSize: 52, fontWeight: 800, lineHeight: 1}}>{cfg.badge.text}</div>
        {cfg.badge.sub ? (
          <div style={{fontFamily: FONT_SANS, fontSize: 22, fontWeight: 800, letterSpacing: 1, marginTop: 4}}>{cfg.badge.sub}</div>
        ) : null}
      </div>

      {/* Headline lockup, left */}
      <div style={{position: 'absolute', left: 60, top: 150, width: 760, display: 'flex', flexDirection: 'column', gap: 2}}>
        {cfg.lines.map((ln, i) => (
          <div
            key={i}
            style={{
              position: 'relative',
              fontFamily: FONT_SANS,
              fontWeight: 800,
              fontSize: ln.size ?? 150,
              lineHeight: 0.92,
              letterSpacing: -4,
              color: ln.color,
              textShadow: ln.color !== CINEMA.ink ? textGlow(ln.color, 1.4) : '0 4px 18px rgba(0,0,0,0.5)',
              width: 'fit-content',
            }}
          >
            {ln.text}
            {ln.strike ? (
              <div
                style={{
                  position: 'absolute',
                  left: -8,
                  right: -8,
                  top: '52%',
                  height: 14,
                  background: CINEMA.power,
                  borderRadius: 8,
                  transform: 'rotate(-4deg)',
                  boxShadow: textGlow(CINEMA.power, 1.2),
                }}
              />
            ) : null}
          </div>
        ))}
        {cfg.badge.sub && variant === 'c' ? null : null}
      </div>

      {/* Big clickbait circle around the badge area */}
      <svg width={1280} height={720} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
        <ellipse cx={1000} cy={120} rx={185} ry={92} fill="none" stroke={cfg.badge.color} strokeWidth={9} strokeLinecap="round" strokeDasharray="4 2" opacity={0.9} transform="rotate(6 1000 120)" />
        {cfg.check ? (
          <g transform="translate(470 560)">
            <circle r={54} fill={CINEMA.ok} />
            <path d="M-26 2 L-6 24 L30 -24" fill="none" stroke={CINEMA.bg0} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};
