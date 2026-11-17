import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {COLORS, STROKE_COLORS} from '../../theme/tokens';
import {drive, GEO, CYL_COUNT, type EngineProps} from '../Engine/kinematics';
import {
  BORE_R,
  BORE_BOT_Y,
  BLOCK_BOT_Y,
  CAM_Y,
  cameraFor,
  DECK_Y,
  ENGINE_HALF_WIDTH,
  PISTON_H,
  R,
  SCALE,
  VALVE_MAX_LIFT,
  VALVE_Z,
  worldX,
  worldY,
  type CameraPreset,
} from './geometry';

const DEG = Math.PI / 180;
const METAL = '#AEB6C0';
const METAL_DARK = '#7E8690';

const ISO_SYS: Record<string, string[]> = {
  intake: ['intake'],
  exhaust: ['exhaust'],
  valvetrain: ['intake', 'exhaust', 'cam'],
  ignition: ['ignition'],
  crank: ['crank'],
};

export interface Engine3DProps extends EngineProps {
  camera?: CameraPreset;
  cutaway?: number; // 0 closed … 1 fully open (front removed)
  beatFrames?: number;
}

// Orient a cylinder mesh to span from->to.
const Segment: React.FC<{
  from: THREE.Vector3;
  to: THREE.Vector3;
  radius: number;
  children: React.ReactNode;
}> = ({from, to, radius, children}) => {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length() || 1e-3;
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize()
  );
  return (
    <mesh position={mid} quaternion={q}>
      <cylinderGeometry args={[radius, radius, len, 16]} />
      {children}
    </mesh>
  );
};

const EngineSceneInner: React.FC<Engine3DProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {gl, camera} = useThree();
  const state = drive(frame, fps, props);

  gl.localClippingEnabled = true;

  // Cutaway plane: remove the front half (z > cut) so the mechanism is visible.
  const cut = props.cutaway ?? 1;
  const clip = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)], []);
  clip[0]!.constant = (1 - cut) * 3; // cut=1 -> constant 0 (front removed)

  // Camera per beat.
  const dur = props.beatFrames ?? 300;
  const t01 = Math.min(1, Math.max(0, frame / dur));
  const cam = cameraFor(props.camera ?? 'wide', t01, props.focusCylinder ?? 0);
  camera.position.set(...cam.pos);
  camera.lookAt(new THREE.Vector3(...cam.target));
  const pcam = camera as THREE.PerspectiveCamera;
  if (pcam.isPerspectiveCamera && pcam.fov !== cam.fov) {
    pcam.fov = cam.fov;
    pcam.updateProjectionMatrix();
  }

  // Ghosting.
  const isoList =
    props.isolate && props.isolate !== 'none' ? ISO_SYS[props.isolate] : undefined;
  const litSystems = isoList ? new Set(isoList) : null;
  const focus = props.focusCylinder;
  const highlight = new Set(props.highlight ?? []);
  const ghosted = (system: string, cyl?: number): boolean => {
    if (highlight.has(system)) return false;
    if (focus != null && cyl != null && cyl !== focus) return true;
    if (litSystems && !litSystems.has(system)) return true;
    return false;
  };

  const metalMat = (ghost: boolean, color = METAL) =>
    ghost
      ? {color: COLORS.ghost, transparent: true, opacity: 0.1, depthWrite: false, roughness: 0.9, metalness: 0.0}
      : {color, metalness: 0.65, roughness: 0.34};

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[6, 11, 8]} intensity={1.5} />
      <directionalLight position={[-7, 4, -3]} intensity={0.5} />
      <directionalLight position={[0, 3, 10]} intensity={0.4} />

      {/* Engine block (sectioned by the clip plane) */}
      <mesh position={[0, (DECK_Y + BLOCK_BOT_Y) / 2, 0]}>
        <boxGeometry
          args={[ENGINE_HALF_WIDTH * 2, DECK_Y - BLOCK_BOT_Y + 0.5, BORE_R * 2 + 0.7]}
        />
        <meshStandardMaterial
          color="#D4DAE1"
          transparent
          opacity={0.16}
          depthWrite={false}
          clippingPlanes={clip}
          side={THREE.DoubleSide}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Crank main journal along X */}
      <Segment
        from={new THREE.Vector3(-ENGINE_HALF_WIDTH + 0.2, 0, 0)}
        to={new THREE.Vector3(ENGINE_HALF_WIDTH - 0.2, 0, 0)}
        radius={0.18}
      >
        <meshStandardMaterial {...metalMat(ghosted('crank'), METAL_DARK)} />
      </Segment>

      {state.cylinders.map((c) => {
        const x = worldX(c.index);
        const ang = c.crankAngle * DEG;
        const pinY = R * Math.cos(ang);
        const pinZ = R * Math.sin(ang);
        const crankPin = new THREE.Vector3(x, pinY, pinZ);
        const pistonPin = new THREE.Vector3(x, worldY(c.pistonPinY), 0);
        const crownY = worldY(c.pistonCrownY);
        const gasH = Math.max(0.001, DECK_Y - crownY);
        const crankGhost = ghosted('crank', c.index);
        const gasColor = props.strokesColored ? STROKE_COLORS[c.stroke] : COLORS.bar;

        return (
          <group key={c.index}>
            {/* Bore shell */}
            <mesh position={[x, (DECK_Y + BORE_BOT_Y) / 2, 0]}>
              <cylinderGeometry
                args={[BORE_R, BORE_R, DECK_Y - BORE_BOT_Y, 28, 1, true]}
              />
              <meshStandardMaterial
                color="#C3CAD3"
                transparent
                opacity={crankGhost ? 0.06 : 0.16}
                depthWrite={false}
                side={THREE.DoubleSide}
                clippingPlanes={clip}
                metalness={0.2}
                roughness={0.7}
              />
            </mesh>

            {/* Combustion charge (tinted by stroke) */}
            {!crankGhost && gasH > 0.02 ? (
              <mesh position={[x, (DECK_Y + crownY) / 2, 0]}>
                <cylinderGeometry args={[BORE_R * 0.92, BORE_R * 0.92, gasH, 24]} />
                <meshStandardMaterial
                  color={gasColor}
                  transparent
                  opacity={props.strokesColored ? 0.4 : 0.16}
                  emissive={gasColor}
                  emissiveIntensity={props.strokesColored ? 0.25 + 0.7 * c.spark : 0.1}
                  depthWrite={false}
                />
              </mesh>
            ) : null}

            {/* Piston */}
            <mesh position={[x, worldY(c.pistonPinY), 0]}>
              <cylinderGeometry args={[BORE_R * 0.9, BORE_R * 0.9, PISTON_H, 28]} />
              <meshStandardMaterial {...metalMat(crankGhost)} />
            </mesh>

            {/* Connecting rod */}
            <Segment from={pistonPin} to={crankPin} radius={0.11}>
              <meshStandardMaterial {...metalMat(crankGhost, METAL_DARK)} />
            </Segment>

            {/* Crank web + pin */}
            <Segment from={new THREE.Vector3(x, 0, 0)} to={crankPin} radius={0.12}>
              <meshStandardMaterial {...metalMat(crankGhost, METAL_DARK)} />
            </Segment>
            <mesh position={crankPin}>
              <sphereGeometry args={[0.16, 16, 16]} />
              <meshStandardMaterial {...metalMat(crankGhost)} />
            </mesh>

            {/* Valves: intake (+z), exhaust (-z) */}
            {renderValve(x, VALVE_Z, c.intakeLift, ghosted('intake', c.index), COLORS.fuel)}
            {renderValve(x, -VALVE_Z, c.exhaustLift, ghosted('exhaust', c.index), COLORS.exhaust)}

            {/* Camshafts */}
            {renderCam(x, VALVE_Z, state.camAngle, ghosted('cam', c.index))}
            {renderCam(x, -VALVE_Z, state.camAngle + 180, ghosted('cam', c.index))}

            {/* Spark plug + flash */}
            <mesh position={[x, DECK_Y + 0.28, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.5, 12]} />
              <meshStandardMaterial {...metalMat(ghosted('ignition', c.index))} />
            </mesh>
            {!ghosted('ignition', c.index) && c.spark > 0.05 ? (
              <mesh position={[x, DECK_Y - 0.05, 0]}>
                <sphereGeometry args={[0.12 + 0.3 * c.spark, 16, 16]} />
                <meshStandardMaterial
                  color={COLORS.electric}
                  emissive={COLORS.electric}
                  emissiveIntensity={2 * c.spark}
                  transparent
                  opacity={0.9 * c.spark}
                />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </>
  );
};

function renderValve(
  x: number,
  z: number,
  lift: number,
  ghost: boolean,
  accent: string
) {
  const headY = DECK_Y - lift * VALVE_MAX_LIFT;
  const mat = ghost
    ? {color: COLORS.ghost, transparent: true, opacity: 0.1, depthWrite: false}
    : {color: METAL_DARK, metalness: 0.6, roughness: 0.4};
  const seatMat = ghost
    ? {color: COLORS.ghost, transparent: true, opacity: 0.1, depthWrite: false}
    : {color: accent, emissive: accent, emissiveIntensity: lift > 0.1 ? 0.5 : 0.1, metalness: 0.3, roughness: 0.5};
  return (
    <group>
      <mesh position={[x, (CAM_Y + headY) / 2, z]}>
        <cylinderGeometry args={[0.05, 0.05, CAM_Y - headY, 10]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[x, headY, z]}>
        <cylinderGeometry args={[0.22, 0.1, 0.12, 20]} />
        <meshStandardMaterial {...seatMat} />
      </mesh>
    </group>
  );
}

function renderCam(x: number, z: number, angleDeg: number, ghost: boolean) {
  const mat = ghost
    ? {color: COLORS.ghost, transparent: true, opacity: 0.1, depthWrite: false}
    : {color: METAL, metalness: 0.6, roughness: 0.35};
  return (
    <group position={[x, CAM_Y, z]} rotation={[angleDeg * DEG, 0, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.5, 20]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.46, 0.26, 0.2]} />
        <meshStandardMaterial {...mat} />
      </mesh>
    </group>
  );
}

// Full-bleed 3D visual, drop-in like the 2D Engine. DOM overlays (section bar,
// callouts, source card) are drawn on top by the mechanism scene.
export const Engine3D: React.FC<Engine3DProps> = (props) => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{position: [6, 3.5, 9], fov: 33, near: 0.1, far: 100}}
        style={{position: 'absolute', inset: 0}}
      >
        <EngineSceneInner {...props} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
