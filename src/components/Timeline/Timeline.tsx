import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CINEMA, accentColor, textGlow, type CinemaAccent} from '../../theme/cinema';
import {FONT_SANS, FONT_MONO} from '../../theme/fonts';

// Timeline — the signature "What Happens If" device: a playhead advances across
// a time (or distance) axis, and each event lights up as the head reaches it.
// Frame-deterministic, dark/cinematic.
export interface TLEvent {
  at: number; // 0..1 position along the axis
  label: string;
  sub?: string;
  accent?: CinemaAccent;
}

export interface TimelineProps {
  events: TLEvent[];
  axisLabel?: string;
  startLabel?: string;
  endLabel?: string;
  beatFrames?: number;
}

const X0 = 230;
const X1 = 1690;
const Y = 540;

export const Timeline: React.FC<TimelineProps> = ({events, axisLabel, startLabel, endLabel, beatFrames = 300}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const head = interpolate(frame, [14, beatFrames - 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const px = (t: number) => X0 + t * (X1 - X0);
  const headX = px(head);

  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        {/* Axis */}
        <line x1={X0} y1={Y} x2={X1} y2={Y} stroke={CINEMA.line} strokeWidth={6} strokeLinecap="round" />
        {/* Progress fill */}
        <line x1={X0} y1={Y} x2={headX} y2={Y} stroke={CINEMA.fuel} strokeWidth={6} strokeLinecap="round" style={{filter: `drop-shadow(0 0 8px ${CINEMA.fuel})`}} />

        {startLabel ? <text x={X0} y={Y + 58} textAnchor="start" fontFamily={FONT_MONO} fontSize={24} fill={CINEMA.ink3}>{startLabel}</text> : null}
        {endLabel ? <text x={X1} y={Y + 58} textAnchor="end" fontFamily={FONT_MONO} fontSize={24} fill={CINEMA.ink3}>{endLabel}</text> : null}
        {axisLabel ? <text x={(X0 + X1) / 2} y={Y + 58} textAnchor="middle" fontFamily={FONT_SANS} fontSize={24} fill={CINEMA.ink2}>{axisLabel}</text> : null}

        {events.map((e, i) => {
          const ex = px(e.at);
          const active = head >= e.at;
          const c = accentColor(e.accent ?? 'fuel');
          const pop = spring({frame: frame - (14 + e.at * (beatFrames - 24)), fps, config: {damping: 160, stiffness: 120}, durationInFrames: 14});
          const up = i % 2 === 0;
          const cardY = up ? Y - 150 : Y + 96;
          return (
            <g key={i} opacity={active ? 1 : 0.3}>
              {/* Connector */}
              <line x1={ex} y1={Y} x2={ex} y2={up ? Y - 40 : Y + 40} stroke={active ? c : CINEMA.line} strokeWidth={3} />
              {/* Dot */}
              <circle cx={ex} cy={Y} r={active ? 13 : 9} fill={active ? c : CINEMA.bg3} stroke={c} strokeWidth={3} style={{filter: active ? `drop-shadow(0 0 10px ${c})` : undefined}} />
              {/* Card */}
              <g transform={`translate(${ex} ${cardY}) scale(${active ? 0.85 + 0.15 * pop : 0.85})`} opacity={active ? pop : 0.4}>
                <text x={0} y={up ? 0 : 28} textAnchor="middle" fontFamily={FONT_SANS} fontSize={30} fontWeight={700} fill={active ? c : CINEMA.ink3} style={{filter: active ? `drop-shadow(0 0 6px ${c}88)` : undefined}}>
                  {e.label}
                </text>
                {e.sub ? (
                  <text x={0} y={up ? 32 : 60} textAnchor="middle" fontFamily={FONT_SANS} fontSize={23} fill={CINEMA.ink2}>
                    {e.sub}
                  </text>
                ) : null}
              </g>
            </g>
          );
        })}

        {/* Playhead */}
        <g>
          <line x1={headX} y1={Y - 180} x2={headX} y2={Y + 120} stroke={CINEMA.ink} strokeWidth={2} opacity={0.5} />
          <circle cx={headX} cy={Y} r={10} fill={CINEMA.ink} style={{filter: `drop-shadow(0 0 10px ${CINEMA.fuel})`}} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
