import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {CINEMA} from '../theme/cinema';

// An immersive 3D world the camera flies through — the new animation language.
// A reflective floor, atmospheric fog, lit 3D objects, drifting motes. Content
// (e.g. the fuel pipeline) lives inside it; the camera is driven from outside by
// the choreography so it reframes to each object as it is named.

export type Cam = {pos: [number, number, number]; target: [number, number, number]; fov: number};

const DIESEL = '#E0A83C';
const METAL = '#B9C0C9';
const METAL_DARK = '#848C97';

// ─── Fuel pipeline node layout in world space ───
export type NodeKind = 'tank' | 'pump' | 'filter' | 'rail' | 'injector' | 'chamber';
export interface PipeNode {
  id: string;
  label: string;
  kind: NodeKind;
}
export const PIPE_NODES: PipeNode[] = [
  {id: 'tank', label: 'Tank', kind: 'tank'},
  {id: 'liftPump', label: 'Lift pump', kind: 'pump'},
  {id: 'filter', label: 'Filter', kind: 'filter'},
  {id: 'hpPump', label: 'High-pressure pump', kind: 'pump'},
  {id: 'rail', label: 'Rail', kind: 'rail'},
  {id: 'injectors', label: 'Injectors', kind: 'injector'},
  {id: 'chamber', label: 'Chamber', kind: 'chamber'},
];
export const nodeWorld = (id: string): THREE.Vector3 => {
  const i = PIPE_NODES.findIndex((n) => n.id === id);
  const idx = i < 0 ? 0 : i;
  const x = -12 + idx * 4;
  const y = 1.6 + Math.sin(idx * 0.8) * 0.5;
  return new THREE.Vector3(x, y, 0);
};

const Segment: React.FC<{from: THREE.Vector3; to: THREE.Vector3; radius: number; children: React.ReactNode}> = ({
  from,
  to,
  radius,
  children,
}) => {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length() || 1e-3;
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return (
    <mesh position={mid} quaternion={q}>
      <cylinderGeometry args={[radius, radius, len, 12]} />
      {children}
    </mesh>
  );
};

const NodeMesh: React.FC<{kind: NodeKind; mat: Record<string, unknown>}> = ({kind, mat}) => {
  switch (kind) {
    case 'tank':
      return (
        <mesh>
          <boxGeometry args={[1.8, 1.2, 1.2]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      );
    case 'pump':
      return (
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.62, 0.62, 1.1, 20]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      );
    case 'filter':
      return (
        <mesh>
          <cylinderGeometry args={[0.5, 0.5, 1.3, 20]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      );
    case 'rail':
      return (
        <mesh>
          <boxGeometry args={[2.0, 0.42, 0.42]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      );
    case 'injector':
      return (
        <group>
          {[-0.4, 0, 0.4].map((dx) => (
            <mesh key={dx} position={[dx, -0.3, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 0.9, 12]} />
              <meshStandardMaterial {...mat} />
            </mesh>
          ))}
        </group>
      );
    case 'chamber':
    default:
      return (
        <mesh>
          <cylinderGeometry args={[0.72, 0.72, 1.05, 24]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      );
  }
};

export const Pipeline3D: React.FC<{
  reach?: number;
  revealCount?: number;
  highlight?: string;
  fault?: string;
}> = ({reach = 1, revealCount, highlight, fault}) => {
  const frame = useCurrentFrame();
  const pts = useMemo(() => PIPE_NODES.map((n) => nodeWorld(n.id)), []);
  const segLen = useMemo(() => pts.slice(1).map((p, i) => p.distanceTo(pts[i]!)), [pts]);
  const total = useMemo(() => segLen.reduce((a, b) => a + b, 0), [segLen]);
  const frontDist = reach * total;

  const at = (dist: number): THREE.Vector3 => {
    let d = Math.max(0, Math.min(total, dist));
    for (let i = 0; i < segLen.length; i++) {
      if (d <= segLen[i]!) return pts[i]!.clone().lerp(pts[i + 1]!, d / segLen[i]!);
      d -= segLen[i]!;
    }
    return pts[pts.length - 1]!.clone();
  };
  const cumTo = (i: number) => segLen.slice(0, i).reduce((a, b) => a + b, 0);

  const faultPulse = 0.5 + 0.5 * Math.sin(frame * 0.25);

  const matFor = (revealed: boolean, reached: boolean, isFault: boolean, isHi: boolean): Record<string, unknown> => {
    if (!revealed) return {color: '#39414d', transparent: true, opacity: 0.1, depthWrite: false, roughness: 0.9};
    if (isFault) return {color: METAL_DARK, metalness: 0.7, roughness: 0.4, emissive: CINEMA.power, emissiveIntensity: 0.6 + 0.8 * faultPulse};
    if (reached) return {color: METAL, metalness: 0.9, roughness: 0.35, emissive: DIESEL, emissiveIntensity: 0.35, envMapIntensity: 1};
    if (isHi) return {color: METAL, metalness: 0.9, roughness: 0.3, emissive: CINEMA.fuel, emissiveIntensity: 0.4, envMapIntensity: 1};
    return {color: METAL, metalness: 0.92, roughness: 0.34, envMapIntensity: 1};
  };

  return (
    <group>
      {/* Pipes between nodes */}
      {pts.slice(1).map((p, i) => {
        const revealed = revealCount == null ? true : i + 1 < revealCount;
        const reached = revealed && frontDist >= cumTo(i) + segLen[i]! / 2;
        return (
          <Segment key={i} from={pts[i]!} to={p} radius={0.1}>
            <meshStandardMaterial
              color={reached ? DIESEL : CINEMA.fuel}
              emissive={reached ? DIESEL : CINEMA.fuel}
              emissiveIntensity={revealed ? (reached ? 0.5 : 0.25) : 0.0}
              transparent
              opacity={revealed ? 0.9 : 0.12}
              metalness={0.3}
              roughness={0.5}
            />
          </Segment>
        );
      })}

      {/* Flowing particles */}
      {Array.from({length: 40}).map((_, i) => {
        const base = (i / 40) * total;
        const d = (base + frame * 0.09) % total;
        const revealedHere = revealCount == null ? true : true;
        if (!revealedHere) return null;
        const p = at(d);
        const diesel = d <= frontDist;
        return (
          <mesh key={i} position={[p.x, p.y, p.z]}>
            <sphereGeometry args={[diesel ? 0.1 : 0.07, 8, 8]} />
            <meshStandardMaterial color={diesel ? DIESEL : CINEMA.fuel} emissive={diesel ? DIESEL : CINEMA.fuel} emissiveIntensity={1.4} />
          </mesh>
        );
      })}

      {/* Nodes */}
      {PIPE_NODES.map((n, i) => {
        const revealed = revealCount == null ? true : i < revealCount;
        const reached = revealed && frontDist >= cumTo(i);
        const isFault = fault === n.id && revealed && reached;
        const isHi = highlight === n.id && revealed;
        const w = pts[i]!;
        return (
          <group key={n.id} position={[w.x, w.y, w.z]}>
            <NodeMesh kind={n.kind} mat={matFor(revealed, reached, isFault, isHi)} />
          </group>
        );
      })}
    </group>
  );
};

const WorldInner: React.FC<{cam: Cam; children: React.ReactNode}> = ({cam, children}) => {
  const {gl, camera, scene} = useThree();
  const env = useMemo(() => {
    const p = new THREE.PMREMGenerator(gl);
    const t = p.fromScene(new RoomEnvironment(), 0.04).texture;
    p.dispose();
    return t;
  }, [gl]);
  scene.environment = env;
  scene.fog = new THREE.Fog(new THREE.Color(CINEMA.bg0), 16, 46);

  camera.position.set(...cam.pos);
  camera.lookAt(new THREE.Vector3(...cam.target));
  const pc = camera as THREE.PerspectiveCamera;
  if (pc.isPerspectiveCamera && pc.fov !== cam.fov) {
    pc.fov = cam.fov;
    pc.updateProjectionMatrix();
  }

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[8, 14, 10]} intensity={1.5} color="#FFF4E8" />
      <directionalLight position={[-10, 6, -8]} intensity={1.1} color="#8FB4FF" />
      <pointLight position={[0, 8, 6]} intensity={0.6} color="#FFFFFF" />

      {/* Reflective floor + grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#0A0F1E" metalness={0.6} roughness={0.5} envMapIntensity={0.4} />
      </mesh>
      <gridHelper args={[120, 60, '#2A3450', '#1A2234']} position={[0, -1.19, 0]} />

      {children}
    </>
  );
};

export const World3D: React.FC<{cam: Cam; children: React.ReactNode}> = ({cam, children}) => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{position: cam.pos, fov: cam.fov, near: 0.1, far: 120}}
        style={{position: 'absolute', inset: 0}}
      >
        <WorldInner cam={cam}>{children}</WorldInner>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
