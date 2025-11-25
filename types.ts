
export type AspectRatioValue = "1:1" | "4:3" | "3:4" | "16:9" | "9:16";

export enum EditMode {
  MOVE = 'move',
  SKETCH = 'sketch',
  OUTPAINT = 'outpaint',
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

export interface TechnicalModifier {
  name: string;
  prompt: string;
}

export interface Filter {
  name: string;
  value: string;
}

export interface PromptState {
  subject: string; // Used for Gemini subject & ComfyUI positive prompt
  background: string; // Used for Gemini background & ComfyUI negative prompt
  negativePrompt: string;
}

export type PromptPart = keyof PromptState;

export interface ClipArtShape {
  name:string;
  dataUrl: string;
}

export interface ClipArtCategory {
  name: string;
  shapes: ClipArtShape[];
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
  filter: string;
}

export enum LayerType {
    IMAGE = 'image',
    PIXEL = 'pixel',
    ADJUSTMENT = 'adjustment'
}

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  isVisible: boolean;
  opacity: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  src?: string; // For IMAGE layers
  strokes?: Stroke[]; // For PIXEL layers
  placedShapes?: PlacedShape[]; // For PIXEL layers
  adjustments?: ImageAdjustments; // For ADJUSTMENT layers
  blendMode?: string;
  maskSrc?: string;
  maskEnabled?: boolean;
}

// Theme Types
export interface ThemeColors {
  primary: string;
  secondary: string;
  base100: string;
  base200: string;
  base300: string;
  textPrimary: string;
  textSecondary: string;
}

export interface Theme {
  name: string;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
}

// Pexels API Type
export interface PexelsPhoto {
  id: number;
  src: {
    medium: string;
    large2x: string;
    original: string;
  };
  alt: string;
}

// AI Engine Types
export type AIEngine = 'gemini' | 'comfyui';

export type ComfyUIConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ComfyUIWorkflow {
  name: string;
  description: string;
  json: string;
}

export interface ComfyUIGenerateSettings {
    serverAddress: string;
    workflow: string; // JSON string of the workflow
    positivePrompt: string;
    negativePrompt: string;
    checkpoint: string;
    lora: string;
    setLoadingMessage: (message: string) => void;
}

export interface PageState {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
}
