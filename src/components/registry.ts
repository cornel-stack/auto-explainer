import React from 'react';
import {Engine, engineAnchors} from './Engine';

// Registry of visual components a scene can name in `visual.component`
// (Spec §5: validate.py checks every name exists here).
export const COMPONENTS: Record<string, React.FC<any>> = {
  Engine,
};

// Per-component callout anchor resolvers, so a scene can point a Callout at a
// named part in canvas coordinates.
export const ANCHORS: Record<
  string,
  (cyl?: number) => Record<string, {x: number; y: number}>
> = {
  Engine: engineAnchors,
};

export const componentExists = (name: string): boolean => name in COMPONENTS;
