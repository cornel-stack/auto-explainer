import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {CINEMA} from '../theme/cinema';

// The planetary gearset — the heart of an automatic transmission. Sun (centre),
// three planets on a carrier, and an outer ring with inner teeth. Colour is the
// teaching language: sun = blue, carrier = green, ring = red; a HELD member goes
// grey. Driven by per-member angular velocities (rad/s) passed from the script,
// so each gear case (reduction / overdrive / direct / reverse) is just a set of
// speeds. Also a Clutch3D pack. Stylised teeth, emissive, swangle-safe.

const SUN = CINEMA.fuel;
const CARRIER = CINEMA.ok;
const RING = CINEMA.power;
const METAL = '#AEB6C0';
const GREY = '#5A6478';

const RS = 1.15; // sun radius
const RP = 0.72; // planet radius
const RC = RS + RP; // carrier (planet orbit) radius
const RING_IN = RC + RP; // ring inner radius
const THICK = 0.55;

export const planetaryAnchor = (member: string): [number, number, number] => {
  if (member === 'sun') return [0, 0, 0.6];
  if (member === 'ring') return [0, RING_IN + 0.5, 0.4];
  if (member === 'carrier') return [RC + 0.2, -0.2, 0.5];
  return [0, 0, 0];
};

const mat = (color: string, held: boolean, emissive = 0.3) =>
  held
    ? {color: GREY, metalness: 0.4, roughness: 0.6, emissive: GREY, emissiveIntensity: 0.05}
    : {color, metalness: 0.5, roughness: 0.35, emissive: color, emissiveIntensity: emissive};

// A gear in the XY plane (axis = Z): a disc body + radial teeth.
const Gear: React.FC<{radius: number; teeth: number; color: string; held: boolean; inner?: boolean}> = ({radius, teeth, color, held, inner}) => {
  const m = mat(color, held);
  const tL = 0.24;
  const items: React.ReactNode[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const r = inner ? radius - tL / 2 : radius + tL / 2;
    items.push(
      <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r, 0]} rotation={[0, 0, a]}>
        <boxGeometry args={[tL, 0.2, THICK]} />
        <meshStandardMaterial {...m} />
      </mesh>
    );
  }
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius, THICK, Math.max(16, teeth)]} />
        <meshStandardMaterial {...m} />
      </mesh>
      {items}
    </group>
  );
};

export interface Planetary3DProps {
  sunW?: number; // rad/s
  carrierW?: number;
  ringW?: number;
  held?: 'sun' | 'carrier' | 'ring' | 'none';
}

export const Planetary3D: React.FC<Planetary3DProps> = ({sunW = 0, carrierW = 0, ringW = 0, held = 'none'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const sunA = sunW * t;
  const carA = carrierW * t;
  const ringA = ringW * t;
  // Planet self-spin relative to the carrier (meshing with the sun).
  const planetSpin = -((sunW - carrierW) * (RS / RP)) * t;

  return (
    <group>
      {/* Carrier plate (behind) + arms, rotating with the carrier */}
      <group rotation={[0, 0, carA]}>
        <mesh position={[0, 0, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[RC + 0.35, RC + 0.35, 0.18, 40]} />
          <meshStandardMaterial {...mat(CARRIER, held === 'carrier', 0.22)} transparent opacity={0.9} />
        </mesh>
        {[0, 1, 2].map((k) => {
          const a = (k / 3) * Math.PI * 2;
          return (
            <mesh key={k} position={[(Math.cos(a) * RC) / 2, (Math.sin(a) * RC) / 2, -0.25]} rotation={[0, 0, a]}>
              <boxGeometry args={[RC, 0.28, 0.16]} />
              <meshStandardMaterial {...mat(CARRIER, held === 'carrier', 0.22)} />
            </mesh>
          );
        })}
      </group>

      {/* Sun */}
      <group rotation={[0, 0, sunA]}>
        <Gear radius={RS} teeth={16} color={SUN} held={held === 'sun'} />
      </group>

      {/* Planets (orbit on the carrier, spin on themselves) */}
      {[0, 1, 2].map((k) => {
        const a = carA + (k / 3) * Math.PI * 2;
        return (
          <group key={k} position={[Math.cos(a) * RC, Math.sin(a) * RC, 0]}>
            <group rotation={[0, 0, planetSpin]}>
              <Gear radius={RP} teeth={11} color={METAL} held={false} />
            </group>
          </group>
        );
      })}

      {/* Ring (outer, inner teeth) */}
      <group rotation={[0, 0, ringA]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[RING_IN + 0.3, 0.26, 12, 56]} />
          <meshStandardMaterial {...mat(RING, held === 'ring')} />
        </mesh>
        <Gear radius={RING_IN} teeth={30} color={RING} held={held === 'ring'} inner />
      </group>
    </group>
  );
};

// ─── Clutch pack: alternating steel plates + friction discs, a piston that
// applies the pack. `applied` 0..1 compresses the stack and lights it. ───
export const Clutch3D: React.FC<{applied?: number}> = ({applied = 0}) => {
  const frame = useCurrentFrame();
  const n = 6; // disc pairs
  const gap = 0.26 - 0.1 * applied;
  const glow = applied;
  const pistonX = -2.3 + applied * 0.7;
  const plates: React.ReactNode[] = [];
  for (let i = 0; i < n * 2; i++) {
    const isFriction = i % 2 === 0;
    const x = -1.6 + i * gap;
    plates.push(
      <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.5, 1.5, 0.08, 40]} />
        <meshStandardMaterial
          color={isFriction ? '#C9A24B' : METAL}
          metalness={isFriction ? 0.2 : 0.8}
          roughness={isFriction ? 0.7 : 0.3}
          emissive={isFriction ? '#C9A24B' : CINEMA.fuel}
          emissiveIntensity={glow * (isFriction ? 0.5 : 0.3)}
        />
      </mesh>
    );
  }
  return (
    <group>
      {/* Drum housing */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.75, 1.75, 3.4, 48, 1, true]} />
        <meshStandardMaterial color="#1B2440" metalness={0.5} roughness={0.5} side={THREE.DoubleSide} transparent opacity={0.35} />
      </mesh>
      {plates}
      {/* Piston */}
      <mesh position={[pistonX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.65, 1.65, 0.3, 40]} />
        <meshStandardMaterial color={METAL} metalness={0.8} roughness={0.3} emissive={CINEMA.electric} emissiveIntensity={0.3 * glow} />
      </mesh>
    </group>
  );
};
