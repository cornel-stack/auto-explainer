// Engine kinematics — pure, deterministic, frame-independent (Spec §9).
// drive(frame, props) -> state is separate from render(state) so the same
// motion can later serve a 3D scene unchanged.

import type {StrokeName} from '../../theme/tokens';

export type EngineLayout = 'I4';

export interface EngineProps {
  layout: EngineLayout;
  rpm: number; // crank revs per minute; drives crank angle per frame
  view?: 'cross';
  isolate?:
    | 'none'
    | 'intake'
    | 'exhaust'
    | 'compression'
    | 'power'
    | 'valvetrain'
    | 'ignition'
    | 'crank';
  strokesColored?: boolean; // tint each chamber by its current stroke
  highlight?: string[]; // part ids, e.g. ["piston_1","crank"]
  focusCylinder?: number; // 0..3; others are ghosted
  startDeg?: number; // crank angle of cylinder 1 at frame 0
}

// Fixed geometry in the 1920×1080 canvas (Spec §3). Both drive() and render()
// read these so callout anchors and pixels agree.
export const GEO = {
  cx: 840, // engine centre x (room on the right for callouts)
  crankY: 792, // crank main-axis y
  spacing: 250, // cylinder pitch
  boreW: 150,
  boreTopY: 356, // cylinder-head deck
  boreBotY: 660,
  r: 74, // crank throw (half the stroke)
  rod: 250, // connecting-rod length
  pistonH: 92,
  valveMaxLift: 24,
  camY: 300, // camshaft centre y, above the deck
  camR: 40,
} as const;

export const CYL_COUNT = 4;

// I4 firing order 1-3-4-2 → 720° phase per cylinder position (index 0 = cyl 1).
const PHASE: Record<number, number> = {0: 0, 1: 540, 2: 180, 3: 360};

export const cylinderX = (i: number): number =>
  GEO.cx + (i - (CYL_COUNT - 1) / 2) * GEO.spacing;

const mod = (a: number, n: number): number => ((a % n) + n) % n;

// Raised-cosine valve lobe: 1 at centre, 0 at the edges of ±halfWidth.
const lobe = (phi: number, center: number, halfWidth: number): number => {
  // nearest wrapped distance on the 720° cycle
  let d = phi - center;
  d = mod(d + 360, 720) - 360;
  if (Math.abs(d) >= halfWidth) return 0;
  return 0.5 * (1 + Math.cos((Math.PI * d) / halfWidth));
};

export const strokeOf = (phi: number): StrokeName => {
  const p = mod(phi, 720);
  if (p < 180) return 'intake';
  if (p < 360) return 'compression';
  if (p < 540) return 'power';
  return 'exhaust';
};

export interface CylinderState {
  index: number;
  crankAngle: number; // 0..360
  phi: number; // 0..720 four-stroke phase
  stroke: StrokeName;
  pistonPinY: number; // canvas y of the piston pin
  pistonCrownY: number; // canvas y of the piston crown (top face)
  crankPin: {x: number; y: number};
  intakeLift: number; // 0..1
  exhaustLift: number; // 0..1
  spark: number; // 0..1 flash intensity near end of compression
}

export interface EngineState {
  theta: number; // cylinder-1 crank angle, degrees
  camAngle: number; // camshaft angle (half crank)
  cylinders: CylinderState[];
}

const slider = (crankAngleDeg: number): number => {
  // Distance from crank centre to piston pin along the bore axis.
  const t = (crankAngleDeg * Math.PI) / 180;
  const {r, rod} = GEO;
  return r * Math.cos(t) + Math.sqrt(rod * rod - r * r * Math.sin(t) * Math.sin(t));
};

export const drive = (
  frame: number,
  fps: number,
  props: EngineProps
): EngineState => {
  const start = props.startDeg ?? 0;
  const theta = start + 360 * (props.rpm / 60) * (frame / fps);
  const camAngle = theta / 2;

  const cylinders: CylinderState[] = [];
  for (let i = 0; i < CYL_COUNT; i++) {
    const crankAngle = mod(theta, 360);
    const phi = mod(theta + PHASE[i]!, 720);
    const cx = cylinderX(i);

    const dist = slider(crankAngle);
    const pistonPinY = GEO.crankY - dist;
    const pistonCrownY = pistonPinY - GEO.pistonH / 2;

    const crankPin = {
      x: cx + GEO.r * Math.sin((crankAngle * Math.PI) / 180),
      y: GEO.crankY - GEO.r * Math.cos((crankAngle * Math.PI) / 180),
    };

    const intakeLift = lobe(phi, 90, 120);
    const exhaustLift = lobe(phi, 630, 120);
    const spark = lobe(phi, 358, 36);

    cylinders.push({
      index: i,
      crankAngle,
      phi,
      stroke: strokeOf(phi),
      pistonPinY,
      pistonCrownY,
      crankPin,
      intakeLift,
      exhaustLift,
      spark,
    });
  }

  return {theta, camAngle, cylinders};
};
