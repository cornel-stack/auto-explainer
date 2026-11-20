import React from 'react';
import {Engine, engineAnchors} from './Engine';
import {Engine3D} from './Engine3D';
import {Chart} from './Chart';
import {Table} from './Table';
import {DecisionTree} from './DecisionTree';
import {Peep} from './Peep/Peep';
import {Photo} from './Photo/Photo';
import {Illustration} from './Illustration/Illustration';

// A no-op hero for text/character-only cinematic scenes.
const Stage: React.FC<any> = () => null;

// Registry of visual components a scene can name in `visual.component`
// (Spec §5: validate.py checks every name exists here).
export const COMPONENTS: Record<string, React.FC<any>> = {
  Engine,
  Engine3D,
  Chart,
  Table,
  DecisionTree,
  Peep,
  Photo,
  Illustration,
  Stage,
};

// Components that render a Three.js scene (callouts are projected, not placed
// from fixed 2D anchors).
export const THREE_D = new Set(['Engine3D']);

// Per-component callout anchor resolvers, so a scene can point a Callout at a
// named part in canvas coordinates.
export const ANCHORS: Record<
  string,
  (cyl?: number) => Record<string, {x: number; y: number}>
> = {
  Engine: engineAnchors,
};

export const componentExists = (name: string): boolean => name in COMPONENTS;
