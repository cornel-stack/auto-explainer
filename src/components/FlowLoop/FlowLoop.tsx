import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {CINEMA, textGlow} from '../../theme/cinema';
import {FONT_SANS} from '../../theme/fonts';

// FlowLoop — the fuel path as an animated pipeline (Spec §9 FlowLoop). Nodes:
// tank → lift pump → filter → high-pressure pump → rail → injectors → chamber.
// Particles flow left→right; a contaminant "front" (e.g. diesel reaching a gas
// engine) advances along the path, tinting everything behind it; a fault node
// pulses red. Dark/cinematic, fully frame-deterministic.

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: 'tank' | 'pump' | 'filter' | 'rail' | 'injector' | 'chamber';
}

const DEFAULT_NODES: Node[] = [
  {id: 'tank', label: 'Tank', x: 230, y: 560, kind: 'tank'},
  {id: 'liftPump', label: 'Lift pump', x: 470, y: 500, kind: 'pump'},
  {id: 'filter', label: 'Filter', x: 720, y: 580, kind: 'filter'},
  {id: 'hpPump', label: 'High-pressure pump', x: 975, y: 500, kind: 'pump'},
  {id: 'rail', label: 'Rail', x: 1230, y: 560, kind: 'rail'},
  {id: 'injectors', label: 'Injectors', x: 1480, y: 500, kind: 'injector'},
  {id: 'chamber', label: 'Chamber', x: 1710, y: 580, kind: 'chamber'},
];

const DIESEL = '#C9A24B'; // amber-olive contaminant
const PARTICLES = 46;

export interface FlowLoopProps {
  nodes?: Node[];
  cleanColor?: keyof typeof CINEMA; // fuel already in the system
  fault?: string; // node id that fails
  highlight?: string; // node id to spotlight
  targetReach?: number; // 0..1 how far the contaminant advances this beat
  flow?: boolean;
  beatFrames?: number;
}

export const FlowLoop: React.FC<FlowLoopProps> = ({
  nodes = DEFAULT_NODES,
  cleanColor = 'fuel',
  fault,
  highlight,
  targetReach = 1,
  flow = true,
  beatFrames = 300,
}) => {
  const frame = useCurrentFrame();
  const clean = CINEMA[cleanColor];

  // Cumulative lengths along the polyline through node centres.
  const pts = nodes.map((n) => ({x: n.x, y: n.y}));
  const segLen: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
    segLen.push(d);
    total += d;
  }
  const at = (dist: number): {x: number; y: number} => {
    let d = Math.max(0, Math.min(total, dist));
    for (let i = 0; i < segLen.length; i++) {
      if (d <= segLen[i]!) {
        const t = d / segLen[i]!;
        return {x: pts[i]!.x + (pts[i + 1]!.x - pts[i]!.x) * t, y: pts[i]!.y + (pts[i + 1]!.y - pts[i]!.y) * t};
      }
      d -= segLen[i]!;
    }
    return pts[pts.length - 1]!;
  };

  const reach = interpolate(frame, [10, beatFrames - 10], [0, targetReach], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const frontDist = reach * total;
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const faultPulse = 0.5 + 0.5 * Math.sin(frame * 0.25);

  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        {/* Base pipe */}
        <path d={pathD} fill="none" stroke={CINEMA.line} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
        {/* Clean fuel glow */}
        <path d={pathD} fill="none" stroke={clean} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
        {/* Contaminant front overlay (dash from start to frontDist) */}
        <path
          d={pathD}
          fill="none"
          stroke={DIESEL}
          strokeWidth={9}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${frontDist} ${total}`}
          style={{filter: `drop-shadow(0 0 8px ${DIESEL})`}}
        />

        {/* Flowing particles */}
        {flow
          ? Array.from({length: PARTICLES}).map((_, i) => {
              const base = (i / PARTICLES) * total;
              const d = (base + (frame * 3)) % total;
              const p = at(d);
              const isDiesel = d <= frontDist;
              return <circle key={i} cx={p.x} cy={p.y} r={isDiesel ? 6 : 4} fill={isDiesel ? DIESEL : clean} opacity={isDiesel ? 0.95 : 0.7} />;
            })
          : null}

        {/* Nodes */}
        {nodes.map((n) => {
          const isFault = fault === n.id;
          const isHi = highlight === n.id;
          const reached = frontDist >= cumDistTo(nodes, n.id, segLen);
          const color = isFault ? CINEMA.power : reached ? DIESEL : isHi ? clean : CINEMA.ink2;
          const r = 30;
          return (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r={r + (isFault ? 8 * faultPulse : 0)}
                fill={CINEMA.bg2}
                stroke={color}
                strokeWidth={isFault || isHi ? 5 : 3}
                style={{filter: isFault || isHi || reached ? `drop-shadow(0 0 ${isFault ? 16 * faultPulse + 6 : 10}px ${color})` : undefined}}
              />
              <NodeGlyph kind={n.kind} cx={n.x} cy={n.y} color={color} />
              <text
                x={n.x}
                y={n.y + r + 34}
                textAnchor="middle"
                fontFamily={FONT_SANS}
                fontSize={24}
                fontWeight={isFault || isHi ? 700 : 500}
                fill={isFault ? CINEMA.power : isHi ? CINEMA.ink : CINEMA.ink2}
              >
                {n.label}
              </text>
              {isFault ? (
                <text x={n.x} y={n.y - r - 18} textAnchor="middle" fontFamily={FONT_SANS} fontSize={22} fontWeight={700} fill={CINEMA.power} style={{filter: `drop-shadow(0 0 6px ${CINEMA.power})`}}>
                  fouled
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

function cumDistTo(nodes: Node[], id: string, segLen: number[]): number {
  let d = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i]!.id === id) return d;
    if (i < segLen.length) d += segLen[i]!;
  }
  return d;
}

const NodeGlyph: React.FC<{kind: Node['kind']; cx: number; cy: number; color: string}> = ({kind, cx, cy, color}) => {
  const s = 2.2;
  if (kind === 'tank')
    return <rect x={cx - 11} y={cy - 8} width={22} height={16} rx={3} fill="none" stroke={color} strokeWidth={s} />;
  if (kind === 'pump') return <circle cx={cx} cy={cy} r={10} fill="none" stroke={color} strokeWidth={s} />;
  if (kind === 'filter') return <path d={`M ${cx - 10} ${cy - 9} H ${cx + 10} L ${cx} ${cy + 9} Z`} fill="none" stroke={color} strokeWidth={s} />;
  if (kind === 'rail') return <rect x={cx - 13} y={cy - 4} width={26} height={8} rx={4} fill="none" stroke={color} strokeWidth={s} />;
  if (kind === 'injector') return <path d={`M ${cx} ${cy - 10} V ${cy + 6} M ${cx - 5} ${cy + 6} L ${cx} ${cy + 12} L ${cx + 5} ${cy + 6}`} fill="none" stroke={color} strokeWidth={s} />;
  return <path d={`M ${cx - 9} ${cy + 8} V ${cy - 4} A 9 9 0 0 1 ${cx + 9} ${cy - 4} V ${cy + 8}`} fill="none" stroke={color} strokeWidth={s} />;
};
