export {Engine} from './Engine';
export {drive, GEO, cylinderX, strokeOf, CYL_COUNT} from './kinematics';
export type {EngineProps, EngineState, CylinderState, EngineLayout} from './kinematics';

import {GEO, cylinderX} from './kinematics';

// Canvas-space anchor points for Callout leader lines. Stable (do not move with
// the piston) so callouts point at a region, not a chasing pixel.
export const engineAnchors = (cyl = 0): Record<string, {x: number; y: number}> => {
  const x = cylinderX(cyl);
  return {
    intakeValve: {x: x - 36, y: GEO.boreTopY},
    exhaustValve: {x: x + 36, y: GEO.boreTopY},
    sparkPlug: {x, y: GEO.boreTopY - 40},
    cam: {x: x - 36, y: GEO.camY},
    piston: {x, y: (GEO.boreTopY + GEO.boreBotY) / 2},
    crank: {x, y: GEO.crankY},
    chamber: {x, y: GEO.boreTopY + 30},
    rod: {x: x + 20, y: GEO.crankY - 120},
  };
};
