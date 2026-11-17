// 3D layout for the inline-4, derived from the shared 2D kinematics (Spec §9:
// "the same drive() now sets mesh.rotation and mesh.position on real geometry").
import * as THREE from 'three';
import {GEO, cylinderX, CYL_COUNT} from '../Engine/kinematics';

export const SCALE = 0.012; // canvas px -> world units

// Crank-plane is world y = 0; +y up, +z toward the camera.
export const worldX = (i: number): number => (cylinderX(i) - GEO.cx) * SCALE;
export const worldY = (canvasY: number): number => (GEO.crankY - canvasY) * SCALE;

export const R = GEO.r * SCALE; // crank throw
export const ROD = GEO.rod * SCALE; // connecting-rod length
export const BORE_R = (GEO.boreW / 2) * SCALE; // bore radius
export const PISTON_H = GEO.pistonH * SCALE;
export const DECK_Y = worldY(GEO.boreTopY); // combustion-chamber roof
export const BORE_BOT_Y = worldY(GEO.boreBotY); // bottom of the cylinder bore
export const BLOCK_BOT_Y = worldY(GEO.crankY + 40); // crankcase floor
export const ENGINE_HALF_WIDTH = (worldX(CYL_COUNT - 1) - worldX(0)) / 2 + BORE_R + 0.6;

export const VALVE_Z = 0.32; // intake front (+z), exhaust back (-z)
export const VALVE_MAX_LIFT = GEO.valveMaxLift * SCALE;
export const CAM_Y = worldY(GEO.camY);

export type CameraPreset =
  | 'wide'
  | 'cylinder'
  | 'valvetrain'
  | 'recap'
  | 'intro';

// Camera position + target per beat. `t01` is 0..1 progress through the beat
// for a slow, living drift.
export const cameraFor = (
  preset: CameraPreset,
  t01: number,
  focusCyl = 0
): {pos: [number, number, number]; target: [number, number, number]; fov: number} => {
  const drift = Math.sin(t01 * Math.PI * 2) * 0.18;
  const fx = worldX(focusCyl);
  switch (preset) {
    case 'cylinder':
      return {
        pos: [fx + 3.4 + drift, 3.4, 8],
        target: [fx, 2.7, 0],
        fov: 36,
      };
    case 'valvetrain':
      return {pos: [1 + drift, 8.5, 7.5], target: [0, 3.2, 0], fov: 40};
    case 'recap': {
      const a = t01 * Math.PI * 0.9 - 0.45;
      return {pos: [Math.sin(a) * 12, 5.2, Math.cos(a) * 12], target: [0, 2.8, 0], fov: 34};
    }
    case 'intro':
      return {pos: [6 + drift, 4.6, 12.5], target: [0, 2.7, 0], fov: 32};
    case 'wide':
    default:
      return {pos: [7 + drift, 5, 11.5], target: [0, 2.8, 0], fov: 35};
  }
};

// Stable world anchor points for callout leader lines (do not chase the piston).
export const partWorld = (
  part: string,
  cyl = 0
): [number, number, number] => {
  const x = worldX(cyl);
  const mid = (DECK_Y + BLOCK_BOT_Y) / 2 + 0.4;
  const map: Record<string, [number, number, number]> = {
    intakeValve: [x, DECK_Y, VALVE_Z],
    exhaustValve: [x, DECK_Y, -VALVE_Z],
    sparkPlug: [x, DECK_Y + 0.25, 0],
    cam: [x, CAM_Y, VALVE_Z],
    piston: [x, mid, 0],
    crank: [x, 0, 0],
    chamber: [x, DECK_Y - 0.3, 0],
    rod: [x, 1.3, 0.2],
  };
  return map[part] ?? [x, mid, 0];
};

// Project a world point to 2D canvas pixels using the beat's camera, so a DOM
// callout can point at a 3D part (Spec §9: Vector3.project(camera)).
export const projectToScreen = (
  world: [number, number, number],
  cam: {pos: [number, number, number]; target: [number, number, number]; fov: number},
  w: number,
  h: number
): {x: number; y: number} => {
  const camera = new THREE.PerspectiveCamera(cam.fov, w / h, 0.1, 100);
  camera.position.set(...cam.pos);
  camera.lookAt(new THREE.Vector3(...cam.target));
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  const v = new THREE.Vector3(...world).project(camera);
  return {x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h};
};
