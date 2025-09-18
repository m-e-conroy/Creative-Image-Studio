export type AspectRatioValue = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

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

export interface TechnicalModifier {
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

export interface ClipArtCategory {
  name: string;
  shapes: ClipArtShape[];
}

export enum EditMode {
  MASK = 'mask',
  SKETCH = 'sketch',
  OUTPAINT = 'outpaint',
  CROP = 'crop',
}

export type PromptPart = 'subject' | 'background';

export interface PromptState {
  subject: string;
  background: string;
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
    rotation: number;
    color: string;
}

export interface ImageAdjustments {
    brightness: number;
    contrast: number;
    red: number;
    green: number;
    blue: number;
    filter?: string;
}

export enum LayerType {
    IMAGE = 'image',
    PIXEL = 'pixel',
    ADJUSTMENT = 'adjustment',
}

export interface Layer {
    id: string;
    name: string;
    type: LayerType;
    isVisible: boolean;
    opacity: number;
    src?: string;
    strokes?: Stroke[];
    placedShapes?: PlacedShape[];
    adjustments?: ImageAdjustments;
    maskSrc?: string;
    maskEnabled?: boolean;
}
