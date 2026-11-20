import React from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CINEMA} from '../theme/cinema';

// A library of 3D "content" objects that live inside World3D. Each beat of the
// video is expressed as one of these, and WorldScene flies the camera through
// them while labels anchor to their world positions. Kept simple and emissive
// so they render reliably under software GL.

const ACC: Record<string, string> = {
  fuel: CINEMA.fuel,
  premium: CINEMA.premium,
  power: CINEMA.power,
  ok: CINEMA.ok,
  cyan: CINEMA.cyan,
  violet: CINEMA.violet,
  electric: CINEMA.electric,
};
export const acc = (k?: string): string => (k && ACC[k]) || CINEMA.cyan;

// ─── Comparison: two glowing specimens on pedestals ───
export const COMPARE_POS = {
  left: new THREE.Vector3(-6, 2.2, 0),
  right: new THREE.Vector3(6, 2.2, 0),
  center: new THREE.Vector3(0, 2, 0),
};
export const Compare3D: React.FC<{leftColor?: string; rightColor?: string; reveal?: number}> = ({
  leftColor = 'fuel',
  rightColor = 'premium',
  reveal = 2,
}) => {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame * 0.05) * 0.14;
  const specimen = (pos: THREE.Vector3, color: string, show: boolean, spin: number) => (
    <group position={[pos.x, pos.y + bob, pos.z]} visible={show}>
      <mesh position={[0, -1.7, 0]}>
        <cylinderGeometry args={[1.2, 1.5, 0.5, 28]} />
        <meshStandardMaterial color="#141B30" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh rotation={[0, frame * spin, 0.2]}>
        <icosahedronGeometry args={[1.35, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} metalness={0.3} roughness={0.22} />
      </mesh>
    </group>
  );
  return (
    <group>
      {specimen(COMPARE_POS.left, acc(leftColor), reveal >= 1, 0.012)}
      {specimen(COMPARE_POS.right, acc(rightColor), reveal >= 2, -0.013)}
    </group>
  );
};

// ─── 3D bar chart: boxes rising from the floor ───
export const BAR_X = [-6.5, 0, 6.5];
export const BAR_BASE_Y = -1.2;
export const Bars3D: React.FC<{bars: Array<{value: number; color?: string}>; max: number}> = ({bars, max}) => {
  const frame = useCurrentFrame();
  return (
    <group>
      {bars.map((b, i) => {
        const full = 1 + (Math.abs(b.value) / max) * 8;
        const grow = Math.max(0, Math.min(1, (frame - i * 6) / 26));
        const h = Math.max(0.01, full * grow);
        const c = acc(b.color);
        return (
          <mesh key={i} position={[BAR_X[i] ?? i * 6, BAR_BASE_Y + h / 2, 0]}>
            <boxGeometry args={[2.4, h, 2.4]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.4} metalness={0.4} roughness={0.35} />
          </mesh>
        );
      })}
    </group>
  );
};

// ─── Floating icon for title moments ───
const IconMesh: React.FC<{icon: string; color: string}> = ({icon, color}) => {
  const mat = <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} metalness={0.4} roughness={0.25} />;
  switch (icon) {
    case 'warning':
      return (
        <mesh>
          <octahedronGeometry args={[1.5, 0]} />
          {mat}
        </mesh>
      );
    case 'clock':
      return (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.3, 0.35, 16, 40]} />
          {mat}
        </mesh>
      );
    case 'reverse':
      return (
        <mesh>
          <torusKnotGeometry args={[1.1, 0.33, 120, 16]} />
          {mat}
        </mesh>
      );
    case 'question':
      return (
        <mesh>
          <dodecahedronGeometry args={[1.5, 0]} />
          {mat}
        </mesh>
      );
    case 'check':
      return (
        <mesh>
          <sphereGeometry args={[1.5, 32, 32]} />
          {mat}
        </mesh>
      );
    default:
      return (
        <mesh>
          <icosahedronGeometry args={[1.5, 0]} />
          {mat}
        </mesh>
      );
  }
};
export const IconFloat3D: React.FC<{icon?: string; accent?: string}> = ({icon = 'default', accent = 'cyan'}) => {
  const frame = useCurrentFrame();
  const c = acc(accent);
  const y = 3.4 + Math.sin(frame * 0.045) * 0.3;
  return (
    <group position={[0, y, 0]} rotation={[0, frame * 0.012, 0]}>
      <IconMesh icon={icon} color={c} />
      {/* halo ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.6, 0.03, 8, 64]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
};

// ─── 3D timeline track the camera travels along ───
export const TL_X0 = -13;
export const TL_X1 = 13;
export const TL_Y = 1.6;
export const tlX = (t: number): number => TL_X0 + t * (TL_X1 - TL_X0);
export const Timeline3D: React.FC<{events: Array<{at: number; color?: string}>; reach?: number}> = ({events, reach = 0}) => {
  const frame = useCurrentFrame();
  const headX = tlX(reach);
  return (
    <group>
      {/* base rail */}
      <mesh position={[0, TL_Y, 0]}>
        <boxGeometry args={[TL_X1 - TL_X0, 0.12, 0.12]} />
        <meshStandardMaterial color={CINEMA.line} metalness={0.3} roughness={0.6} />
      </mesh>
      {/* filled portion */}
      <mesh position={[(TL_X0 + headX) / 2, TL_Y, 0]}>
        <boxGeometry args={[Math.max(0.01, headX - TL_X0), 0.16, 0.16]} />
        <meshStandardMaterial color={CINEMA.fuel} emissive={CINEMA.fuel} emissiveIntensity={0.6} />
      </mesh>
      {/* event posts */}
      {events.map((e, i) => {
        const x = tlX(e.at);
        const lit = reach >= e.at;
        const c = acc(e.color);
        return (
          <group key={i} position={[x, TL_Y, 0]}>
            <mesh position={[0, 0.7, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 1.4, 12]} />
              <meshStandardMaterial color={lit ? c : CINEMA.line} emissive={lit ? c : '#000'} emissiveIntensity={lit ? 0.6 : 0} />
            </mesh>
            <mesh position={[0, 1.5, 0]}>
              <sphereGeometry args={[lit ? 0.3 : 0.2, 16, 16]} />
              <meshStandardMaterial color={lit ? c : CINEMA.ink3} emissive={lit ? c : '#000'} emissiveIntensity={lit ? 1.0 : 0} />
            </mesh>
          </group>
        );
      })}
      {/* playhead */}
      <mesh position={[headX, TL_Y, 0]}>
        <sphereGeometry args={[0.35 + 0.05 * Math.sin(frame * 0.3), 20, 20]} />
        <meshStandardMaterial color="#FFFFFF" emissive={CINEMA.fuel} emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
};
