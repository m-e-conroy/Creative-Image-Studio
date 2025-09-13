// FIX: Define and export all necessary types for the application.
// This resolves circular dependency issues and missing type definitions.
export enum EditMode {
  MASK = 'mask',
  SKETCH = 'sketch',
  OUTPAINT = 'outpaint',
  CROP = 'crop',
}

export interface ImageStyle {
  name: string;
  prompt: string;
}

export interface LightingStyle {
  name: string;
  prompt: string;
}

export interface CompositionRule {
  name: string;
  prompt: string;
}

export interface Filter {
  name: string;
  value: string;
}

export interface ClipArtShape {
  name: string;
  dataUrl: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  size: number;
}

export interface PlacedShape {
  id: string;
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in radians
  color: string; // hex string
}


export type AspectRatioValue = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

export interface PromptState {
  subject: string;
  background: string;
}

export type PromptPart = keyof PromptState;