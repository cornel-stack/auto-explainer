import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, GHOST_OPACITY, STROKE, STROKE_COLORS} from '../../theme/tokens';
import {
  CYL_COUNT,
  cylinderX,
  drive,
  GEO,
  type EngineProps,
} from './kinematics';

const METAL = '#B9C0C9';
const METAL_DARK = '#8A929C';

// Which schematic systems light up for each isolate mode (Spec §9 isolate).
const ISO_SYS: Record<string, string[]> = {
  intake: ['intake'],
  exhaust: ['exhaust'],
  valvetrain: ['intake', 'exhaust', 'cam'],
  ignition: ['ignition'],
  crank: ['crank'],
};

export const Engine: React.FC<EngineProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const state = drive(frame, fps, props);

  const isoList =
    props.isolate && props.isolate !== 'none'
      ? ISO_SYS[props.isolate]
      : undefined;
  const litSystems = isoList ? new Set(isoList) : null;
  const focus = props.focusCylinder;
  const highlight = new Set(props.highlight ?? []);

  const ghosted = (system: string, cyl?: number): boolean => {
    if (highlight.has(system)) return false;
    if (focus != null && cyl != null && cyl !== focus) return true;
    if (litSystems && !litSystems.has(system)) return true;
    return false;
  };

  const metalFor = (system: string, cyl?: number) =>
    ghosted(system, cyl)
      ? {stroke: COLORS.ghost, fill: COLORS.ghost, opacity: GHOST_OPACITY}
      : {stroke: COLORS.ink, fill: METAL, opacity: 1};

  return (
    <AbsoluteFill>
      <svg
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        style={{position: 'absolute', inset: 0}}
      >
        {/* Engine block outline */}
        <rect
          x={cylinderX(0) - GEO.boreW / 2 - 40}
          y={GEO.boreTopY - 70}
          width={(CYL_COUNT - 1) * GEO.spacing + GEO.boreW + 80}
          height={GEO.crankY - GEO.boreTopY + 150}
          rx={28}
          fill="#E9ECF0"
          stroke={COLORS.ink}
          strokeWidth={STROKE.outline}
        />

        {/* Crankshaft main axis */}
        <line
          x1={cylinderX(0) - 70}
          y1={GEO.crankY}
          x2={cylinderX(CYL_COUNT - 1) + 70}
          y2={GEO.crankY}
          stroke={ghosted('crank') ? COLORS.ghost : COLORS.ink2}
          strokeWidth={6}
          opacity={ghosted('crank') ? GHOST_OPACITY : 1}
        />

        {state.cylinders.map((c) => {
          const x = cylinderX(c.index);
          const bore = {
            left: x - GEO.boreW / 2,
            right: x + GEO.boreW / 2,
          };
          const crankMetal = metalFor('crank', c.index);
          const chamberColor = props.strokesColored
            ? STROKE_COLORS[c.stroke]
            : COLORS.bar;
          const chamberLit = !ghosted('crank', c.index);

          const xInt = x - 36;
          const xExh = x + 36;
          const intakeOpen = c.intakeLift * GEO.valveMaxLift;
          const exhaustOpen = c.exhaustLift * GEO.valveMaxLift;

          return (
            <g key={c.index}>
              {/* Bore walls */}
              <rect
                x={bore.left}
                y={GEO.boreTopY}
                width={GEO.boreW}
                height={GEO.boreBotY - GEO.boreTopY}
                fill="none"
                stroke={crankMetal.stroke}
                strokeWidth={STROKE.outline}
                opacity={crankMetal.opacity}
              />

              {/* Combustion chamber fill: deck down to piston crown */}
              {chamberLit && c.pistonCrownY > GEO.boreTopY ? (
                <rect
                  x={bore.left + 4}
                  y={GEO.boreTopY}
                  width={GEO.boreW - 8}
                  height={Math.max(0, c.pistonCrownY - GEO.boreTopY)}
                  fill={chamberColor}
                  opacity={props.strokesColored ? 0.42 : 0.14}
                />
              ) : null}

              {/* Power-stroke combustion flash */}
              {chamberLit && c.spark > 0.05 ? (
                <rect
                  x={bore.left + 4}
                  y={GEO.boreTopY}
                  width={GEO.boreW - 8}
                  height={Math.max(0, c.pistonCrownY - GEO.boreTopY)}
                  fill={COLORS.exhaust}
                  opacity={0.5 * c.spark}
                />
              ) : null}

              {/* Piston */}
              <rect
                x={bore.left + 8}
                y={c.pistonCrownY}
                width={GEO.boreW - 16}
                height={GEO.pistonH}
                rx={6}
                fill={crankMetal.fill}
                stroke={crankMetal.stroke}
                strokeWidth={STROKE.outline}
                opacity={crankMetal.opacity}
              />
              {/* Piston rings */}
              {[14, 26].map((dy) => (
                <line
                  key={dy}
                  x1={bore.left + 8}
                  y1={c.pistonCrownY + dy}
                  x2={bore.right - 8}
                  y2={c.pistonCrownY + dy}
                  stroke={crankMetal.stroke}
                  strokeWidth={2}
                  opacity={crankMetal.opacity * 0.8}
                />
              ))}

              {/* Connecting rod */}
              <line
                x1={x}
                y1={c.pistonPinY}
                x2={c.crankPin.x}
                y2={c.crankPin.y}
                stroke={ghosted('crank', c.index) ? COLORS.ghost : METAL_DARK}
                strokeWidth={16}
                strokeLinecap="round"
                opacity={crankMetal.opacity}
              />
              <circle
                cx={x}
                cy={c.pistonPinY}
                r={8}
                fill={crankMetal.stroke}
                opacity={crankMetal.opacity}
              />

              {/* Crank throw: web + pin */}
              <line
                x1={x}
                y1={GEO.crankY}
                x2={c.crankPin.x}
                y2={c.crankPin.y}
                stroke={ghosted('crank', c.index) ? COLORS.ghost : COLORS.ink2}
                strokeWidth={12}
                strokeLinecap="round"
                opacity={crankMetal.opacity}
              />
              <circle
                cx={c.crankPin.x}
                cy={c.crankPin.y}
                r={11}
                fill={crankMetal.fill}
                stroke={crankMetal.stroke}
                strokeWidth={2}
                opacity={crankMetal.opacity}
              />
              <circle
                cx={x}
                cy={GEO.crankY}
                r={16}
                fill={crankMetal.fill}
                stroke={crankMetal.stroke}
                strokeWidth={STROKE.outline}
                opacity={crankMetal.opacity}
              />

              {/* Intake valve + port (left) */}
              {renderValve({
                x: xInt,
                open: intakeOpen,
                system: 'intake',
                accent: COLORS.fuel,
                ghost: ghosted('intake', c.index),
                flowing: c.intakeLift > 0.1,
                side: 'left',
                boreLeft: bore.left,
                boreRight: bore.right,
              })}

              {/* Exhaust valve + port (right) */}
              {renderValve({
                x: xExh,
                open: exhaustOpen,
                system: 'exhaust',
                accent: COLORS.exhaust,
                ghost: ghosted('exhaust', c.index),
                flowing: c.exhaustLift > 0.1,
                side: 'right',
                boreLeft: bore.left,
                boreRight: bore.right,
              })}

              {/* Spark plug (centre) */}
              {renderSpark({
                x,
                ghost: ghosted('ignition', c.index),
                intensity: c.spark,
              })}

              {/* Camshafts over the valves */}
              {renderCam({x: xInt, angle: state.camAngle, ghost: ghosted('cam', c.index)})}
              {renderCam({x: xExh, angle: state.camAngle + 180, ghost: ghosted('cam', c.index)})}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

function renderValve(o: {
  x: number;
  open: number;
  system: string;
  accent: string;
  ghost: boolean;
  flowing: boolean;
  side: 'left' | 'right';
  boreLeft: number;
  boreRight: number;
}) {
  const color = o.ghost ? COLORS.ghost : COLORS.ink;
  const op = o.ghost ? GHOST_OPACITY : 1;
  const seatY = GEO.boreTopY;
  const headY = seatY + o.open; // valve opens downward into the chamber
  const portColor = o.ghost ? COLORS.ghost : o.accent;
  const portX = o.side === 'left' ? o.boreLeft - 44 : o.boreRight + 44;
  return (
    <g>
      {/* Port channel */}
      <path
        d={
          o.side === 'left'
            ? `M ${portX} ${seatY - 60} L ${o.x - 14} ${seatY - 14} L ${o.x - 14} ${seatY} L ${portX} ${seatY - 30} Z`
            : `M ${portX} ${seatY - 60} L ${o.x + 14} ${seatY - 14} L ${o.x + 14} ${seatY} L ${portX} ${seatY - 30} Z`
        }
        fill={portColor}
        opacity={o.ghost ? GHOST_OPACITY : o.flowing ? 0.55 : 0.2}
      />
      {/* Valve stem */}
      <line
        x1={o.x}
        y1={seatY - 118}
        x2={o.x}
        y2={headY - 6}
        stroke={color}
        strokeWidth={7}
        opacity={op}
      />
      {/* Valve head */}
      <path
        d={`M ${o.x - 18} ${headY} L ${o.x + 18} ${headY} L ${o.x + 10} ${headY + 12} L ${o.x - 10} ${headY + 12} Z`}
        fill={o.ghost ? COLORS.ghost : METAL_DARK}
        stroke={color}
        strokeWidth={2}
        opacity={op}
      />
    </g>
  );
}

function renderSpark(o: {x: number; ghost: boolean; intensity: number}) {
  const color = o.ghost ? COLORS.ghost : COLORS.ink;
  const op = o.ghost ? GHOST_OPACITY : 1;
  const tipY = GEO.boreTopY + 4;
  return (
    <g>
      <rect
        x={o.x - 7}
        y={GEO.boreTopY - 92}
        width={14}
        height={64}
        rx={3}
        fill={o.ghost ? COLORS.ghost : METAL}
        stroke={color}
        strokeWidth={2}
        opacity={op}
      />
      <line
        x1={o.x}
        y1={GEO.boreTopY - 28}
        x2={o.x}
        y2={tipY}
        stroke={color}
        strokeWidth={4}
        opacity={op}
      />
      {o.intensity > 0.05 ? (
        <>
          <circle
            cx={o.x}
            cy={tipY + 6}
            r={10 + 26 * o.intensity}
            fill={COLORS.electric}
            opacity={0.7 * o.intensity}
          />
          <circle cx={o.x} cy={tipY + 6} r={6} fill={COLORS.electric} opacity={o.intensity} />
        </>
      ) : null}
    </g>
  );
}

function renderCam(o: {x: number; angle: number; ghost: boolean}) {
  const color = o.ghost ? COLORS.ghost : COLORS.ink;
  const op = o.ghost ? GHOST_OPACITY : 1;
  const a = (o.angle * Math.PI) / 180;
  // Lobe tip position on the cam circle.
  const tipX = o.x + Math.sin(a) * (GEO.camR + 14);
  const tipY = GEO.camY + Math.cos(a) * (GEO.camR + 14);
  return (
    <g>
      <circle
        cx={o.x}
        cy={GEO.camY}
        r={GEO.camR}
        fill={o.ghost ? COLORS.ghost : METAL}
        stroke={color}
        strokeWidth={STROKE.outline}
        opacity={op}
      />
      <path
        d={`M ${o.x - 12} ${GEO.camY} Q ${o.x} ${GEO.camY - 6} ${tipX} ${tipY} Q ${o.x} ${GEO.camY + 6} ${o.x + 12} ${GEO.camY} Z`}
        fill={o.ghost ? COLORS.ghost : METAL_DARK}
        stroke={color}
        strokeWidth={2}
        opacity={op}
      />
      <circle cx={o.x} cy={GEO.camY} r={5} fill={color} opacity={op} />
    </g>
  );
}
