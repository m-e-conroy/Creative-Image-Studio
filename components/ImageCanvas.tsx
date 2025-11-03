
import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { EditMode, PlacedShape, Stroke, Point, ImageAdjustments, Layer, LayerType, PageState } from '../types';
import { Loader } from './Loader';
import { UploadIcon } from './Icons';
import { FILTERS } from '../constants';

interface ImageCanvasProps {
  layers: Layer[];
  page: PageState | null;
  activeLayerId: string | null;
  isEditingMask: boolean;
  isLoading: boolean;
  loadingMessage: string;
  editMode: EditMode;
  brushSize: number;
  brushColor: string;
  onUploadClick: () => void;
  selectedShapeId: string | null;
  onAddStroke: (stroke: Stroke) => void;
  onAddShape: (shape: Omit<PlacedShape, 'id' | 'rotation' | 'color'>) => void;
  onUpdateShape: (id: string, updates: Partial<Omit<PlacedShape, 'id'>>) => void;
  onSelectShape: (id: string | null) => void;
  onStrokeInteractionEnd: (stroke: Stroke) => void;
  onShapeInteractionEnd: () => void;
  onUpdateLayerMask: (layerId: string, maskDataUrl: string) => void;
  onUpdateLayer: (id: string, updates: Partial<Layer> | ((layer: Layer) => Partial<Layer>)) => void;
  onInteractionEndWithHistory: () => void;
  onLayerTransformEnd: (layerId: string) => void;
}

interface Rect { x: number; y: number; width: number; height: number; }
type InteractionMode = 'idle' | 'drawing' | 'masking' | 'moving' | 'resizing' | 'rotating' | 'moving-layer';
type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br';
type Handle = ResizeHandle | 'rotate';


interface InteractionState {
  mode: InteractionMode;
  startPoint?: Point;
  prevPoint?: Point;
  shapeStart?: PlacedShape;
  handle?: Handle;
  originalShape?: PlacedShape;
  layerStart?: { x: number; y: number; width: number; height: number, rotation: number };
  layerCenter?: Point;
  startAngle?: number;
  currentStroke?: Stroke;
}

export interface ImageCanvasMethods {
  getCanvasAsDataURL: (options?: { format?: 'png' | 'jpeg' | 'webp'; quality?: number; ignoreFilters?: boolean; fillStyle?: string; }) => string | null;
  getPageContentAsDataURL: (options?: { format?: 'png' | 'jpeg' | 'webp'; quality?: number; includeBackground?: boolean; }) => Promise<string | null>;
  getMaskData: () => string | null;
  getExpandedCanvasData: (baseImageDataUrl: string, direction: 'up' | 'down' | 'left' | 'right', amount: number) => Promise<{ data: string; mimeType: string; maskData: string; pasteX: number; pasteY: number; newWidth: number; newHeight: number; }>;
  getCanvasDimensions: () => { width: number; height: number } | null;
  rasterizeLayer: (layerId: string) => Promise<{ newImageDataUrl: string; newMaskDataUrl?: string; newWidth: number; newHeight: number; } | null>;
  getMaskForLayer: (layerId: string) => Promise<string | null>;
}

const HANDLE_SIZE = 10;
const MIN_LAYER_SIZE = 20;
const ROTATE_HANDLE_OFFSET = 20;

type OffscreenCanvasEntry = { canvas: HTMLCanvasElement; image?: HTMLImageElement; dirty: boolean; };

const rotatePoint = (point: Point, center: Point, angle: number): Point => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: center.x + dx * cos - dy * sin,
        y: center.y + dx * sin + dy * cos,
    };
};

const getTransformHandles = (layer: Layer): Record<Handle, Point> => {
    const { x = 0, y = 0, width = 0, height = 0, rotation = 0 } = layer;
    const center = { x: x + width / 2, y: y + height / 2 };
    
    const unrotatedHandles = {
        tl: { x, y },
        tr: { x: x + width, y },
        bl: { x, y: y + height },
        br: { x: x + width, y: y + height },
        rotate: { x: x + width / 2, y: y - ROTATE_HANDLE_OFFSET }
    };

    return {
        tl: rotatePoint(unrotatedHandles.tl, center, rotation),
        tr: rotatePoint(unrotatedHandles.tr, center, rotation),
        bl: rotatePoint(unrotatedHandles.bl, center, rotation),
        br: rotatePoint(unrotatedHandles.br, center, rotation),
        rotate: rotatePoint(unrotatedHandles.rotate, center, rotation),
    };
};

const getHandleAtPointForLayer = (point: Point, layer: Layer): Handle | null => {
    const handles = getTransformHandles(layer);
    const size = HANDLE_SIZE;
    for (const key in handles) {
        const handlePoint = handles[key as Handle];
        const handleRect = { x: handlePoint.x - size/2, y: handlePoint.y - size/2, width: size, height: size };
        if (isPointInRect(point, handleRect)) {
            return key as Handle;
        }
    }
    return null;
};

const isPointInRect = (point: Point, rect: Rect) => {
    return point.x >= rect.x && point.x <= rect.x + rect.width &&
           point.y >= rect.y && point.y <= rect.y + rect.height;
};


export const ImageCanvas = forwardRef<ImageCanvasMethods, ImageCanvasProps>(
  (props, ref) => {
    const { layers, page, activeLayerId, isEditingMask, isLoading, loadingMessage, editMode, brushSize, brushColor, onUploadClick, selectedShapeId, onAddStroke, onAddShape, onUpdateShape, onSelectShape, onStrokeInteractionEnd, onShapeInteractionEnd, onUpdateLayerMask, onUpdateLayer, onInteractionEndWithHistory, onLayerTransformEnd } = props;
    
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const offscreenCanvasesRef = useRef<Map<string, OffscreenCanvasEntry>>(new Map());
    const offscreenMasksRef = useRef<Map<string, OffscreenCanvasEntry>>(new Map());
    const tempCompositeCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const interactionStateRef = useRef<InteractionState>({ mode: 'idle' });
    const lastDrawnLayerState = useRef<string | null>(null);

    const getCanvas = () => mainCanvasRef.current;
    const getCtx = () => getCanvas()?.getContext('2d');
    const getInteractionCanvas = () => interactionCanvasRef.current;
    const getInteractionCtx = () => getInteractionCanvas()?.getContext('2d');

    const drawInteractionLayer = useCallback(() => {
        const ctx = getInteractionCtx();
        const canvas = getInteractionCanvas();
        if (!ctx || !canvas) return;
    
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        const activeLayer = layers.find(l => l.id === activeLayerId);
        const isPixelLayerActive = activeLayer?.type === LayerType.PIXEL;
    
        const showBrushCursor = (editMode === EditMode.SKETCH && isPixelLayerActive && !selectedShapeId) || isEditingMask;
        if (showBrushCursor) {
            const { x, y } = interactionStateRef.current.startPoint || { x: -1000, y: -1000 };
            const radius = brushSize / 2;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
    
            if (isEditingMask && brushColor === '#000000') {
                // Erasing: black fill, white outline
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            } else {
                // Drawing: current color fill, black outline
                try {
                    const r = parseInt(brushColor.slice(1, 3), 16);
                    const g = parseInt(brushColor.slice(3, 5), 16);
                    const b = parseInt(brushColor.slice(5, 7), 16);
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
                } catch {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; // Fallback for invalid color
                }
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            }
            ctx.fill();
            ctx.stroke();
        }
        
        if (editMode === EditMode.MOVE && activeLayer && (activeLayer.type === LayerType.IMAGE) && activeLayer.width && activeLayer.height) {
            const { x = 0, y = 0, width = 0, height = 0, rotation = 0 } = activeLayer;
            const center = { x: x + width / 2, y: y + height / 2 };
            const handles = getTransformHandles(activeLayer);
            
            ctx.save();
            ctx.translate(center.x, center.y);
            ctx.rotate(rotation);
            ctx.translate(-center.x, -center.y);
            
            ctx.strokeStyle = 'rgba(47, 159, 208, 0.9)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
            ctx.restore();
            
            ctx.fillStyle = 'rgba(47, 159, 208, 0.9)';
            Object.values(handles).forEach(handle => {
                ctx.fillRect(handle.x - HANDLE_SIZE / 2, handle.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
            });

            // Draw line to rotation handle
            const topMiddle = rotatePoint({x: x + width/2, y: y}, center, rotation);
            ctx.beginPath();
            ctx.moveTo(topMiddle.x, topMiddle.y);
            ctx.lineTo(handles.rotate.x, handles.rotate.y);
            ctx.strokeStyle = 'rgba(47, 159, 208, 0.9)';
            ctx.stroke();
        }

    }, [editMode, brushSize, brushColor, selectedShapeId, isEditingMask, layers, activeLayerId]);
    
    const getFlattenedCanvas = (): HTMLCanvasElement | null => {
        const canvas = getCanvas();
        if (!canvas) return null;

        const flatCanvas = tempCompositeCanvasRef.current;
        if (!flatCanvas || flatCanvas.width === 0 || flatCanvas.height === 0) {
            return canvas;
        }
        return flatCanvas;
    };

    const drawLayersToContext = async (
        ctx: CanvasRenderingContext2D,
        targetWidth: number,
        targetHeight: number,
        sourcePage: PageState,
        includeBackground: boolean
    ) => {
        const scaleX = targetWidth / sourcePage.width;
        const scaleY = targetHeight / sourcePage.height;
    
        if (includeBackground) {
            const pageBg = getComputedStyle(document.documentElement).getPropertyValue('--color-base-200').trim();
            ctx.fillStyle = `rgb(${pageBg})`;
            ctx.fillRect(0, 0, targetWidth, targetHeight);
        }
    
        const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(new Error(`Could not load image for export. ${err}`));
            img.src = src;
        });

        const snapshotCanvas = document.createElement('canvas');
        snapshotCanvas.width = targetWidth;
        snapshotCanvas.height = targetHeight;
        const snapshotCtx = snapshotCanvas.getContext('2d');
    
        for (const layer of layers) {
            if (!layer.isVisible) continue;
    
            if (layer.type === LayerType.ADJUSTMENT) {
                if (snapshotCtx) {
                    snapshotCtx.clearRect(0, 0, targetWidth, targetHeight);
                    snapshotCtx.drawImage(ctx.canvas, 0, 0);
                }
            }
    
            ctx.save();
            ctx.globalAlpha = layer.opacity / 100;
            
            if (layer.type === LayerType.IMAGE || layer.type === LayerType.PIXEL) {
                ctx.globalCompositeOperation = (layer.blendMode || 'source-over') as GlobalCompositeOperation;
    
                const layerContentCanvas = document.createElement('canvas');
                const layerContentCtx = layerContentCanvas.getContext('2d', { willReadFrequently: true });
                if (!layerContentCtx) {
                    ctx.restore();
                    continue;
                }
    
                if (layer.type === LayerType.IMAGE && layer.src) {
                    const img = await loadImage(layer.src);
                    layerContentCanvas.width = img.width;
                    layerContentCanvas.height = img.height;
                    layerContentCtx.drawImage(img, 0, 0);
                } else if (layer.type === LayerType.PIXEL) {
                    const mainCanvas = getCanvas();
                    if (!mainCanvas) continue;
                    layerContentCanvas.width = mainCanvas.width;
                    layerContentCanvas.height = mainCanvas.height;
                    
                    layer.strokes?.forEach(stroke => {
                        layerContentCtx.strokeStyle = stroke.color;
                        layerContentCtx.lineWidth = stroke.size;
                        layerContentCtx.lineCap = 'round';
                        layerContentCtx.lineJoin = 'round';
                        layerContentCtx.beginPath();
                        if (stroke.points.length > 0) {
                            layerContentCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
                            for (let i = 1; i < stroke.points.length; i++) {
                                layerContentCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
                            }
                            layerContentCtx.stroke();
                        }
                    });
                    
                    for (const shape of (layer.placedShapes || [])) {
                        const shapeImg = await loadImage(shape.dataUrl);
                        layerContentCtx.save();
                        layerContentCtx.translate(shape.x, shape.y);
                        layerContentCtx.rotate(shape.rotation);
                        layerContentCtx.drawImage(shapeImg, -shape.width/2, -shape.height/2, shape.width, shape.height);
                        layerContentCtx.restore();
                    }
                }
    
                if (layer.maskSrc && layer.maskEnabled) {
                    const maskImg = await loadImage(layer.maskSrc);
                    layerContentCtx.globalCompositeOperation = 'destination-in';
                    const maskCanvas = document.createElement('canvas');
                    maskCanvas.width = layerContentCanvas.width;
                    maskCanvas.height = layerContentCanvas.height;
                    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
                    if(maskCtx){
                        maskCtx.drawImage(maskImg, 0, 0, maskCanvas.width, maskCanvas.height);
                        const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
                        const data = imageData.data;
                        for (let i = 0; i < data.length; i += 4) {
                            const luminance = (data[i] * 0.299) + (data[i+1] * 0.587) + (data[i+2] * 0.114);
                            data[i+3] = luminance > 128 ? 255 : 0;
                        }
                        maskCtx.putImageData(imageData, 0, 0);
                        layerContentCtx.drawImage(maskCanvas, 0, 0);
                    }
                }
                
                const { x=0, y=0, width, height, rotation=0 } = layer;
                const finalWidth = width ?? layerContentCanvas.width;
                const finalHeight = height ?? layerContentCanvas.height;
                const finalX = x;
                const finalY = y;
                
                const centerX = finalX + finalWidth / 2;
                const centerY = finalY + finalHeight / 2;
    
                const transformedCenterX = (centerX - sourcePage.x) * scaleX;
                const transformedCenterY = (centerY - sourcePage.y) * scaleY;
    
                ctx.translate(transformedCenterX, transformedCenterY);
                ctx.rotate(rotation);
                
                ctx.drawImage(layerContentCanvas, - (finalWidth * scaleX) / 2, - (finalHeight * scaleY) / 2, finalWidth * scaleX, finalHeight * scaleY);
    
            } else if (layer.type === LayerType.ADJUSTMENT && layer.adjustments && snapshotCtx) {
                 const { brightness, contrast, red, green, blue, filter: filterName } = layer.adjustments;
                 const filterPreset = FILTERS.find(f => f.name === filterName);
                 const presetFilterValue = filterPreset && filterPreset.name !== 'None' ? filterPreset.value : '';
                 const cssFilters = `${presetFilterValue} brightness(${brightness}%) contrast(${contrast}%)`;
    
                 ctx.clearRect(0, 0, targetWidth, targetHeight);
                 ctx.filter = cssFilters;
                 ctx.drawImage(snapshotCanvas, 0, 0);
                 ctx.filter = 'none';
    
                 const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
                 const data = imageData.data;
                 const rFactor = red / 100;
                 const gFactor = green / 100;
                 const bFactor = blue / 100;
                 if (rFactor !== 1 || gFactor !== 1 || bFactor !== 1) {
                     for (let i = 0; i < data.length; i += 4) {
                         data[i] = Math.min(255, data[i] * rFactor);
                         data[i + 1] = Math.min(255, data[i + 1] * gFactor);
                         data[i + 2] = Math.min(255, data[i + 2] * bFactor);
                     }
                     ctx.putImageData(imageData, 0, 0);
                 }
            }
            ctx.restore();
        }
    };


    useImperativeHandle(ref, () => ({
      getCanvasAsDataURL: (options: { format?: 'png' | 'jpeg' | 'webp'; quality?: number; ignoreFilters?: boolean; fillStyle?: string; } = {}) => {
        const { format = 'png', quality = 0.92, fillStyle } = options;
        const flatCanvas = getFlattenedCanvas();
        if (!flatCanvas) return null;

        if (fillStyle) {
            const newCanvas = document.createElement('canvas');
            newCanvas.width = flatCanvas.width;
            newCanvas.height = flatCanvas.height;
            const ctx = newCanvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = fillStyle;
                ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
            }
            return newCanvas.toDataURL('image/png');
        }
        
        const mimeType = `image/${format}`;
        return flatCanvas.toDataURL(mimeType, quality);
      },
      getPageContentAsDataURL: async (options = {}) => {
        const { format = 'png', quality = 0.92, includeBackground = false } = options;
        if (!page) return null;

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = page.width;
        exportCanvas.height = page.height;
        const exportCtx = exportCanvas.getContext('2d');
        if (!exportCtx) return null;

        await drawLayersToContext(exportCtx, page.width, page.height, page, includeBackground);

        return exportCanvas.toDataURL(`image/${format}`, quality);
      },
      getMaskData: () => {
        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (!activeLayer || activeLayer.type !== LayerType.PIXEL || !activeLayer.strokes?.length) return null;
        
        const canvas = getCanvas();
        if (!canvas) return null;

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) return null;
        
        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        
        activeLayer.strokes.forEach(stroke => {
          maskCtx.strokeStyle = 'white';
          maskCtx.lineWidth = stroke.size;
          maskCtx.lineCap = 'round';
          maskCtx.lineJoin = 'round';
          maskCtx.beginPath();
          maskCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            maskCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          maskCtx.stroke();
        });
        
        return maskCanvas.toDataURL('image/png').split(',')[1];
      },
      getCanvasDimensions: () => {
        const canvas = getCanvas();
        return canvas ? { width: canvas.width, height: canvas.height } : null;
      },
      getExpandedCanvasData: async (baseImageDataUrl, direction, amount) => {
        const img = new Image();
        img.src = baseImageDataUrl;
        await new Promise(resolve => img.onload = resolve);

        const originalWidth = img.width;
        const originalHeight = img.height;
        const smallerDim = Math.min(originalWidth, originalHeight);
        const expandSize = Math.floor(smallerDim * (amount / 100));

        let newWidth = originalWidth;
        let newHeight = originalHeight;
        let pasteX = 0;
        let pasteY = 0;
        let maskRect: Rect = { x: 0, y: 0, width: 0, height: 0 };
        
        switch(direction) {
          case 'up': newHeight += expandSize; pasteY = expandSize; maskRect = { x: 0, y: 0, width: newWidth, height: expandSize }; break;
          case 'down': newHeight += expandSize; maskRect = { x: 0, y: originalHeight, width: newWidth, height: expandSize }; break;
          case 'left': newWidth += expandSize; pasteX = expandSize; maskRect = { x: 0, y: 0, width: expandSize, height: newHeight }; break;
          case 'right': newWidth += expandSize; maskRect = { x: originalWidth, y: 0, width: expandSize, height: newHeight }; break;
        }

        const expandedCanvas = document.createElement('canvas');
        expandedCanvas.width = newWidth;
        expandedCanvas.height = newHeight;
        const expandedCtx = expandedCanvas.getContext('2d');
        if (!expandedCtx) throw new Error("Could not create expanded canvas context");

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = newWidth;
        maskCanvas.height = newHeight;
        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) throw new Error("Could not create mask canvas context");

        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, newWidth, newHeight);
        maskCtx.fillStyle = 'white';
        maskCtx.fillRect(maskRect.x, maskRect.y, maskRect.width, maskRect.height);

        const featherSize = Math.max(10, Math.floor(expandSize * 0.1));
        maskCtx.filter = `blur(${featherSize}px)`;
        maskCtx.drawImage(maskCanvas, 0, 0);
        maskCtx.filter = 'none';

        const bleed = 2;
        expandedCtx.drawImage(img, pasteX - (direction === 'left' ? bleed : 0), pasteY - (direction === 'up' ? bleed : 0), originalWidth + (direction === 'left' || direction === 'right' ? bleed : 0), originalHeight + (direction === 'up' || direction === 'down' ? bleed : 0));
        
        return {
          data: expandedCanvas.toDataURL('image/png').split(',')[1],
          mimeType: 'image/png',
          maskData: maskCanvas.toDataURL('image/png').split(',')[1],
          pasteX,
          pasteY,
          newWidth,
          newHeight
        };
      },
      rasterizeLayer: async (layerId) => {
        const layer = layers.find(l => l.id === layerId);
        if (!layer || (layer.type !== LayerType.IMAGE && layer.type !== LayerType.PIXEL)) {
            console.error('Invalid layer for rasterization.');
            return null;
        }

        const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(new Error(`Could not load image: ${src.substring(0, 100)}... Error: ${err}`));
            img.src = src;
        });

        try {
            let imageToRasterize: HTMLCanvasElement | HTMLImageElement;

            if (layer.type === LayerType.IMAGE && layer.src) {
                imageToRasterize = await loadImage(layer.src);
            } else { // PIXEL layer
                const sourceCanvasEntry = offscreenCanvasesRef.current.get(layerId);
                if (!sourceCanvasEntry || sourceCanvasEntry.dirty) {
                    renderLayerToOffscreen(layer); // ensure it's up to date
                }
                imageToRasterize = offscreenCanvasesRef.current.get(layerId)!.canvas;
            }

            const maskImage = (layer.maskSrc && layer.maskEnabled) ? await loadImage(layer.maskSrc) : null;
            
            const { width = imageToRasterize.width, height = imageToRasterize.height, rotation = 0 } = layer;
            const rad = rotation;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            const newWidth = Math.round(Math.abs(width * cos) + Math.abs(height * sin));
            const newHeight = Math.round(Math.abs(width * sin) + Math.abs(height * cos));

            const rasterize = (img: HTMLImageElement | HTMLCanvasElement, targetWidth: number, targetHeight: number) => {
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Could not create canvas context.');

                ctx.translate(targetWidth / 2, targetHeight / 2);
                ctx.rotate(rad);
                ctx.drawImage(img, -width / 2, -height / 2, width, height);
                return canvas.toDataURL('image/png');
            };

            const newImageDataUrl = rasterize(imageToRasterize, newWidth, newHeight);
            let newMaskDataUrl: string | undefined = undefined;

            if (maskImage) {
                 newMaskDataUrl = rasterize(maskImage, newWidth, newHeight);
            }

            return { newImageDataUrl, newMaskDataUrl, newWidth, newHeight };
        } catch (e) {
            console.error("Rasterization failed in canvas component:", e);
            return null;
        }
      },
      getMaskForLayer: async (layerId) => {
          const layer = layers.find(l => l.id === layerId);
          if (!layer || !page) return null;

          const maskCanvas = document.createElement('canvas');
          maskCanvas.width = page.width;
          maskCanvas.height = page.height;
          const ctx = maskCanvas.getContext('2d');
          if (!ctx) return null;

          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
          
          if (layer.type === LayerType.IMAGE && layer.maskSrc && layer.maskEnabled) {
              const maskImg = new Image();
              maskImg.src = layer.maskSrc;
              await new Promise(resolve => maskImg.onload = resolve);

              const { x = 0, y = 0, width = 0, height = 0, rotation = 0 } = layer;
              if (width === 0 || height === 0) return null;
              
              const centerX = (x - page.x) + width / 2;
              const centerY = (y - page.y) + height / 2;
              
              ctx.save();
              ctx.translate(centerX, centerY);
              ctx.rotate(rotation);
              ctx.translate(-centerX, -centerY);
              ctx.drawImage(maskImg, x - page.x, y - page.y, width, height); 
              ctx.restore();
          } else if (layer.type === LayerType.PIXEL) {
              ctx.fillStyle = 'white';
              ctx.strokeStyle = 'white';

              layer.strokes?.forEach(stroke => {
                  ctx.lineWidth = stroke.size;
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';
                  ctx.beginPath();
                  if(stroke.points.length > 0) {
                      ctx.moveTo(stroke.points[0].x - page.x, stroke.points[0].y - page.y);
                      for (let i = 1; i < stroke.points.length; i++) {
                          ctx.lineTo(stroke.points[i].x - page.x, stroke.points[i].y - page.y);
                      }
                      ctx.stroke();
                  }
              });
              
              const shapeImages = await Promise.all(
                  (layer.placedShapes || []).map(shape => new Promise<HTMLImageElement>((resolve, reject) => {
                      const img = new Image();
                      img.onload = () => resolve(img);
                      img.onerror = reject;
                      img.src = shape.dataUrl;
                  }))
              );

              layer.placedShapes?.forEach((shape, index) => {
                  ctx.save();
                  ctx.translate(shape.x - page.x, shape.y - page.y);
                  ctx.rotate(shape.rotation);
                  
                  const shapeImg = shapeImages[index];
                  const tempShapeCanvas = document.createElement('canvas');
                  tempShapeCanvas.width = shape.width;
                  tempShapeCanvas.height = shape.height;
                  const tempCtx = tempShapeCanvas.getContext('2d');
                  if (tempCtx) {
                      tempCtx.drawImage(shapeImg, 0, 0, shape.width, shape.height);
                      tempCtx.globalCompositeOperation = 'source-in';
                      tempCtx.fillStyle = 'white';
                      tempCtx.fillRect(0, 0, shape.width, shape.height);
                      ctx.drawImage(tempShapeCanvas, -shape.width/2, -shape.height/2);
                  }
                  ctx.restore();
              });
          }

          return maskCanvas.toDataURL('image/png');
      }
    }));

    const drawLayersRef = useRef<() => void>(() => {});

    const renderLayerToOffscreen = useCallback((layer: Layer) => {
      let offscreenData = offscreenCanvasesRef.current.get(layer.id);
      if (!offscreenData) {
          offscreenData = { canvas: document.createElement('canvas'), dirty: true };
          offscreenCanvasesRef.current.set(layer.id, offscreenData);
      }
  
      const { canvas: offscreenCanvas } = offscreenData;
      const mainCanvas = getCanvas();
      if (!mainCanvas?.width) return;
  
      if (layer.type !== LayerType.IMAGE) { // Pixel and other layers use main canvas size
        if (offscreenCanvas.width !== mainCanvas.width || offscreenCanvas.height !== mainCanvas.height) {
            offscreenCanvas.width = mainCanvas.width;
            offscreenCanvas.height = mainCanvas.height;
            offscreenData.dirty = true;
        }
      }
  
      const ctx = offscreenCanvas.getContext('2d');
      if (!ctx || layer.type === LayerType.ADJUSTMENT) {
          if(offscreenData) offscreenData.dirty = false;
          return;
      };
  
      ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
  
      // Render layer content
      if (layer.type === LayerType.IMAGE && layer.src) {
        let img = offscreenData.image;
        if (!img || img.src !== layer.src) {
            img = new Image();
            img.src = layer.src;
            offscreenData.image = img;
            img.onload = () => { drawLayersRef.current(); };
        }
        if (img.complete && img.width > 0) {
            if (offscreenCanvas.width !== img.width || offscreenCanvas.height !== img.height) {
                offscreenCanvas.width = img.width;
                offscreenCanvas.height = img.height;
            }
            ctx.drawImage(img, 0, 0);
        }
      } else if (layer.type === LayerType.PIXEL) {
        layer.strokes?.forEach(stroke => {
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            if(stroke.points.length > 0) {
                ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                for (let i = 1; i < stroke.points.length; i++) {
                    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
                }
                ctx.stroke();
            }
        });
        layer.placedShapes?.forEach(shape => {
            const shapeImg = new Image();
            shapeImg.src = shape.dataUrl;
            if (shapeImg.complete) {
                ctx.save();
                ctx.translate(shape.x, shape.y);
                ctx.rotate(shape.rotation);
                ctx.drawImage(shapeImg, -shape.width / 2, -shape.height / 2, shape.width, shape.height);
                ctx.restore();
            } else {
                shapeImg.onload = () => { drawLayersRef.current(); };
            }
        });
      }
  
      // Apply mask if it exists and is enabled
      if (layer.maskSrc && layer.maskEnabled) {
          let maskData = offscreenMasksRef.current.get(layer.id);

          if (!maskData) {
              maskData = { canvas: document.createElement('canvas'), dirty: true };
              offscreenMasksRef.current.set(layer.id, maskData);
          }
          const { canvas: maskCanvas } = maskData;
          const contentCanvas = offscreenData.canvas;
          
          let maskImg = maskData.image;
          if (!maskImg || maskImg.src !== layer.maskSrc) {
              maskImg = new Image();
              maskImg.src = layer.maskSrc;
              maskData.image = maskImg;
              maskImg.onload = () => {
                  const maskCtx = maskCanvas.getContext('2d');
                  if (maskCtx && contentCanvas.width > 0) {
                      // Ensure the mask buffer is the same size as the content buffer
                      if (maskCanvas.width !== contentCanvas.width || maskCanvas.height !== contentCanvas.height) {
                          maskCanvas.width = contentCanvas.width;
                          maskCanvas.height = contentCanvas.height;
                      }
                      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
                      // Draw the loaded mask image, scaling it to perfectly fit the content dimensions
                      maskCtx.drawImage(maskImg, 0, 0, maskCanvas.width, maskCanvas.height);
                      
                      try {
                        const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
                        const data = imageData.data;
                        for (let i = 0; i < data.length; i += 4) {
                            const luminance = (data[i] * 0.299) + (data[i+1] * 0.587) + (data[i+2] * 0.114);
                            const isWhite = luminance > 128; 
                            data[i+3] = isWhite ? 255 : 0;
                        }
                        maskCtx.putImageData(imageData, 0, 0);
                      } catch (e) { console.error("Error processing mask image data:", e); }
                  }
                  const layerContent = offscreenCanvasesRef.current.get(layer.id);
                  if (layerContent) layerContent.dirty = true;
                  drawLayersRef.current();
              };
          }

          if (maskImg.complete && maskImg.width > 0 && maskCanvas.width > 0) {
              // The mask has been processed onto maskCanvas, which is the same size as the content canvas (ctx.canvas).
              // A simple composite operation now works perfectly.
              ctx.globalCompositeOperation = 'destination-in';
              ctx.drawImage(maskCanvas, 0, 0);
              ctx.globalCompositeOperation = 'source-over';
          }
      }
      offscreenData.dirty = false;
  }, []);

    const drawLayers = useCallback(() => {
        const canvas = getCanvas();
        const ctx = getCtx();
        if (!canvas || !ctx) return;

        if (!tempCompositeCanvasRef.current) tempCompositeCanvasRef.current = document.createElement('canvas');
        const tempCanvas = tempCompositeCanvasRef.current;
        if (tempCanvas.width !== canvas.width || tempCanvas.height !== canvas.height) {
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
        }
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        // Draw grid background first
        try {
            const theme = window.getComputedStyle(document.documentElement);
            const base300 = `rgb(${theme.getPropertyValue('--color-base-300').trim()})`;
            const gridLineColor = `rgba(${theme.getPropertyValue('--color-text-secondary').trim()}, 0.05)`;
            const gridSize = 20;

            tempCtx.fillStyle = base300;
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            tempCtx.strokeStyle = gridLineColor;
            tempCtx.lineWidth = 1;
            
            tempCtx.beginPath();
            for (let x = 0.5; x <= tempCanvas.width; x += gridSize) {
                tempCtx.moveTo(x, 0);
                tempCtx.lineTo(x, tempCanvas.height);
            }
            for (let y = 0.5; y <= tempCanvas.height; y += gridSize) {
                tempCtx.moveTo(0, y);
                tempCtx.lineTo(tempCanvas.width, y);
            }
            tempCtx.stroke();
        } catch (e) {
            console.warn("Could not draw theme-aware grid, using fallback.", e);
            tempCtx.fillStyle = '#e4e4e4'; // Fallback color
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }

        if (page) {
            const pageBg = getComputedStyle(document.documentElement).getPropertyValue('--color-base-200').trim();
            tempCtx.fillStyle = `rgb(${pageBg})`;
            tempCtx.fillRect(page.x, page.y, page.width, page.height);
            tempCtx.strokeStyle = 'rgba(0,0,0,0.1)';
            tempCtx.lineWidth = 1;
            tempCtx.strokeRect(page.x - 0.5, page.y - 0.5, page.width + 1, page.height + 1);
        }

        for (const layer of layers) {
            if (!layer.isVisible) continue;

            const offscreen = offscreenCanvasesRef.current.get(layer.id);
            if (layer.type !== LayerType.ADJUSTMENT && (!offscreen || offscreen.dirty)) {
                renderLayerToOffscreen(layer);
            }
            
            const { x = 0, y = 0, width, height, rotation = 0, opacity = 100, blendMode = 'source-over' } = layer;
            const sourceCanvas = offscreen?.canvas;
            
            tempCtx.save();
            tempCtx.globalAlpha = opacity / 100;
            
            if (layer.type === LayerType.IMAGE || layer.type === LayerType.PIXEL) {
                tempCtx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
                if (sourceCanvas && sourceCanvas.width > 0) {
                    const layerWidth = width ?? sourceCanvas.width;
                    const layerHeight = height ?? sourceCanvas.height;
                    const centerX = x + layerWidth / 2;
                    const centerY = y + layerHeight / 2;

                    tempCtx.translate(centerX, centerY);
                    tempCtx.rotate(rotation);
                    tempCtx.translate(-centerX, -centerY);
                    
                    tempCtx.drawImage(sourceCanvas, x, y, layerWidth, layerHeight);
                }
            } else if (layer.type === LayerType.ADJUSTMENT && layer.adjustments) {
                const { brightness, contrast, red, green, blue, filter: filterName } = layer.adjustments;
                const filterPreset = FILTERS.find(f => f.name === filterName);
                const presetFilterValue = filterPreset && filterPreset.name !== 'None' ? filterPreset.value : '';
                const cssFilters = `${presetFilterValue} brightness(${brightness}%) contrast(${contrast}%)`;

                const matrixElement = document.getElementById('color-matrix-element');
                if (matrixElement) {
                    const r = red / 100; const g = green / 100; const b = blue / 100;
                    const matrix = `${r} 0 0 0 0 0 ${g} 0 0 0 0 0 ${b} 0 0 0 0 0 1 0`;
                    matrixElement.setAttribute('values', matrix);
                }

                const snapshotCanvas = document.createElement('canvas');
                snapshotCanvas.width = tempCanvas.width;
                snapshotCanvas.height = tempCanvas.height;
                const snapshotCtx = snapshotCanvas.getContext('2d');
                if (!snapshotCtx) {
                    tempCtx.restore();
                    continue;
                };
                snapshotCtx.drawImage(tempCanvas, 0, 0);

                tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.filter = `${cssFilters} url(#adjustment-filter)`;
                tempCtx.drawImage(snapshotCanvas, 0, 0);
                tempCtx.filter = 'none';
            }
            
            tempCtx.restore();
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);

    }, [layers, renderLayerToOffscreen, page]);


    useEffect(() => {
        drawLayersRef.current = drawLayers;
    }, [drawLayers]);

    const initCanvases = useCallback(() => {
        const canvas = getCanvas();
        const interactionCanvas = getInteractionCanvas();
        const container = containerRef.current;
        if (!container || !canvas || !interactionCanvas) return;
    
        const { clientWidth, clientHeight } = container;
    
        if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
            canvas.width = clientWidth > 0 ? clientWidth : 512;
            canvas.height = clientHeight > 0 ? clientHeight : 512;
            interactionCanvas.width = canvas.width;
            interactionCanvas.height = canvas.height;
        }

        offscreenCanvasesRef.current.forEach(val => val.dirty = true);
        offscreenMasksRef.current.forEach(val => val.dirty = true);
        drawLayers();
    }, [drawLayers]);

    useEffect(() => {
        initCanvases();
        const resizeObserver = new ResizeObserver(initCanvases);
        if (containerRef.current) resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [initCanvases]);

    useEffect(() => {
        const currentLayerState = JSON.stringify(layers);
        if (lastDrawnLayerState.current !== currentLayerState) {
            offscreenCanvasesRef.current.forEach((val, key) => {
                const layer = layers.find(l => l.id === key);
                if (layer) {
                    const oldLayer = JSON.parse(lastDrawnLayerState.current || '[]').find((l: Layer) => l.id === key);
                    if (JSON.stringify(layer) !== JSON.stringify(oldLayer)) {
                        val.dirty = true;
                    }
                }
            });
            lastDrawnLayerState.current = currentLayerState;
        }
        drawLayers();
    }, [layers, drawLayers]);
    
    const getCanvasCoordinates = (e: React.MouseEvent | React.DragEvent): Point => {
        const canvas = getCanvas();
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const getLocalPointForMasking = (point: Point, layer: Layer): Point | null => {
        const { x = 0, y = 0, width, height, rotation = 0 } = layer;
        if (!width || !height) return null;
    
        const centerX = x + width / 2;
        const centerY = y + height / 2;
    
        const translatedX = point.x - centerX;
        const translatedY = point.y - centerY;
    
        const cos = Math.cos(-rotation);
        const sin = Math.sin(-rotation);
        const rotatedX = translatedX * cos - translatedY * sin;
        const rotatedY = translatedX * sin + translatedY * cos;
    
        const maskData = offscreenMasksRef.current.get(layer.id);
        const maskWidth = maskData?.canvas.width;
        const maskHeight = maskData?.canvas.height;
        if (!maskWidth || !maskHeight) return null;
    
        const unscaledX = rotatedX * (maskWidth / width);
        const unscaledY = rotatedY * (maskHeight / height);
    
        return {
            x: unscaledX + maskWidth / 2,
            y: unscaledY + maskHeight / 2,
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const point = getCanvasCoordinates(e);
        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (!activeLayer) return;
        
        if (editMode === EditMode.MOVE) {
            if (activeLayer.type === LayerType.IMAGE) {
                const handle = getHandleAtPointForLayer(point, activeLayer);
                if (handle === 'rotate') {
                    const center = { x: activeLayer.x + activeLayer.width! / 2, y: activeLayer.y + activeLayer.height! / 2 };
                    interactionStateRef.current = {
                        mode: 'rotating',
                        layerCenter: center,
                        startAngle: Math.atan2(point.y - center.y, point.x - center.x),
                        layerStart: { ...activeLayer, rotation: activeLayer.rotation || 0 } as any,
                    };
                    return;
                }
                if (handle) {
                    interactionStateRef.current = {
                        mode: 'resizing',
                        handle,
                        prevPoint: point,
                    };
                    return;
                }
            }
            if ((activeLayer.type === LayerType.IMAGE || activeLayer.type === LayerType.PIXEL)) {
                interactionStateRef.current = { mode: 'moving-layer', prevPoint: point };
                return;
            }
        }

        if (isEditingMask) {
            let localPoint = point;
            if (activeLayer.type === LayerType.IMAGE) {
                const transformedPoint = getLocalPointForMasking(point, activeLayer);
                if (!transformedPoint) return;
                localPoint = transformedPoint;
            }

            interactionStateRef.current.mode = 'masking';
            
            const maskData = offscreenMasksRef.current.get(activeLayer.id);
            if (maskData) {
                const maskCtx = maskData.canvas.getContext('2d');
                if (maskCtx) {
                    if (brushColor === '#000000') {
                        maskCtx.globalCompositeOperation = 'destination-out';
                        maskCtx.strokeStyle = 'rgba(0,0,0,1)'; 
                    } else {
                        maskCtx.globalCompositeOperation = 'source-over';
                        maskCtx.strokeStyle = brushColor;
                    }
                    
                    let transformedBrushSize = brushSize;
                    if (activeLayer.type === LayerType.IMAGE && activeLayer.width) {
                        const maskWidth = maskData.canvas.width;
                        const scale = maskWidth / activeLayer.width;
                        transformedBrushSize = brushSize * scale;
                    }
                    
                    maskCtx.lineWidth = transformedBrushSize;
                    maskCtx.lineCap = 'round';
                    maskCtx.lineJoin = 'round';
                    maskCtx.beginPath();
                    maskCtx.moveTo(localPoint.x, localPoint.y);
                }
            }
        } else if (activeLayer.type === LayerType.PIXEL && editMode === EditMode.SKETCH) {
            interactionStateRef.current.mode = 'drawing';
            const newStroke: Stroke = {
                id: `stroke_${Date.now()}`,
                points: [{x: point.x, y: point.y}],
                color: brushColor,
                size: brushSize,
            };
            interactionStateRef.current.currentStroke = newStroke;
            onAddStroke(newStroke);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const point = getCanvasCoordinates(e);
        const { mode, prevPoint, currentStroke, layerStart, handle, layerCenter, startAngle } = interactionStateRef.current;
        const canvas = getInteractionCanvas();
        if (!canvas) return;
        const activeLayer = layers.find(l => l.id === activeLayerId);
        const isPixelLayerActive = activeLayer?.type === LayerType.PIXEL;

        let cursorStyle = 'auto';
        if (editMode === EditMode.MOVE && activeLayer && activeLayer.type === LayerType.IMAGE) {
            const transformHandle = getHandleAtPointForLayer(point, activeLayer);
            if (transformHandle === 'rotate') {
                cursorStyle = 'grabbing'; // Or a custom rotate cursor
            } else if (transformHandle) {
                cursorStyle = (transformHandle === 'tl' || transformHandle === 'br') ? 'nwse-resize' : 'nesw-resize';
            } else {
                cursorStyle = mode === 'moving-layer' ? 'grabbing' : 'grab';
            }
        } else if (!isLoading && ((editMode === EditMode.SKETCH && isPixelLayerActive) || isEditingMask)) {
            cursorStyle = 'none';
        }
        canvas.style.cursor = cursorStyle;

        interactionStateRef.current.startPoint = point;
        
        if (mode === 'rotating' && activeLayerId && layerCenter && startAngle && layerStart) {
            const currentAngle = Math.atan2(point.y - layerCenter.y, point.x - layerCenter.x);
            const angleDelta = currentAngle - startAngle;
            onUpdateLayer(activeLayerId, { rotation: layerStart.rotation + angleDelta });
        } else if (mode === 'resizing' && activeLayerId && prevPoint && handle) {
            const dx = point.x - prevPoint.x;
            if (dx !== 0) {
                onUpdateLayer(activeLayerId, (currentLayer: Layer) => {
                    const { x = 0, y = 0, width = 1, height = 1 } = currentLayer;
                    const aspect = width / height;
        
                    let newX = x, newY = y, newWidth = width, newHeight = height;
        
                    switch (handle) {
                        case 'br':
                            newWidth = width + dx;
                            newHeight = newWidth / aspect;
                            break;
                        case 'bl':
                            newWidth = width - dx;
                            newHeight = newWidth / aspect;
                            newX = x + dx;
                            break;
                        case 'tr':
                            newWidth = width + dx;
                            newHeight = newWidth / aspect;
                            newY = y - (newHeight - height);
                            break;
                        case 'tl':
                            newWidth = width - dx;
                            newHeight = newWidth / aspect;
                            newX = x + dx;
                            newY = y + (height - newHeight);
                            break;
                    }
        
                    if (newWidth < MIN_LAYER_SIZE || newHeight < MIN_LAYER_SIZE) {
                        return {}; // Do not update if it gets too small
                    }
        
                    return { x: newX, y: newY, width: newWidth, height: newHeight };
                });
            }
            interactionStateRef.current.prevPoint = point;
        } else if (mode === 'moving-layer' && prevPoint && activeLayerId) {
            const dx = point.x - prevPoint.x;
            const dy = point.y - prevPoint.y;
            if (dx !== 0 || dy !== 0) {
                onUpdateLayer(activeLayerId, (currentLayer: Layer) => ({
                    x: (currentLayer.x || 0) + dx,
                    y: (currentLayer.y || 0) + dy,
                }));
            }
            interactionStateRef.current.prevPoint = point;
        } else if (mode === 'masking' && activeLayerId) {
            const maskData = offscreenMasksRef.current.get(activeLayerId);
            const maskCtx = maskData?.canvas.getContext('2d');
            if (maskCtx && activeLayer) {
                let localPoint = point;
                if (activeLayer.type === LayerType.IMAGE) {
                    const transformedPoint = getLocalPointForMasking(point, activeLayer);
                    if (!transformedPoint) return;
                    localPoint = transformedPoint;
                }
                maskCtx.lineTo(localPoint.x, localPoint.y);
                maskCtx.stroke();
                const layerData = offscreenCanvasesRef.current.get(activeLayerId);
                if (layerData) layerData.dirty = true;
                drawLayers();
            }
        } else if (mode === 'drawing' && currentStroke && activeLayer) {
            const localPoint = { x: point.x, y: point.y };
            const updatedStroke = { ...currentStroke, points: [...currentStroke.points, localPoint] };
            interactionStateRef.current.currentStroke = updatedStroke;
            
            const offscreen = offscreenCanvasesRef.current.get(activeLayerId!);
            if (offscreen) {
                const ctx = offscreen.canvas.getContext('2d');
                if (ctx && currentStroke.points.length > 0) {
                     ctx.strokeStyle = updatedStroke.color;
                     ctx.lineWidth = updatedStroke.size;
                     ctx.lineCap = 'round';
                     ctx.lineJoin = 'round';
                     ctx.beginPath();
                     ctx.moveTo(currentStroke.points[currentStroke.points.length - 1].x, currentStroke.points[currentStroke.points.length - 1].y);
                     ctx.lineTo(localPoint.x, localPoint.y);
                     ctx.stroke();
                     drawLayers();
                }
            }
        }
        
        drawInteractionLayer();
    };

    const handleMouseUp = () => {
        const { mode, currentStroke } = interactionStateRef.current;
        const canvas = getInteractionCanvas();
        if (canvas) canvas.style.cursor = 'auto';

        if (mode === 'masking' && activeLayerId) {
            const maskData = offscreenMasksRef.current.get(activeLayerId);
            if (maskData) {
                const maskCtx = maskData.canvas.getContext('2d');
                if (maskCtx) {
                    maskCtx.closePath();
                    maskCtx.globalCompositeOperation = 'source-over';
                }
                onUpdateLayerMask(activeLayerId, maskData.canvas.toDataURL());
            }
            onInteractionEndWithHistory();
        } else if (mode === 'drawing' && currentStroke) {
            onStrokeInteractionEnd(currentStroke);
        } else if (mode === 'moving-layer') {
            onInteractionEndWithHistory();
        } else if ((mode === 'resizing' || mode === 'rotating') && activeLayerId) {
            onLayerTransformEnd(activeLayerId);
        }
        
        interactionStateRef.current = { mode: 'idle' };
    };
    
    const handleMouseLeave = () => {
        interactionStateRef.current.startPoint = {x: -1000, y: -1000};
        drawInteractionLayer();
        if(interactionStateRef.current.mode !== 'idle') {
            handleMouseUp();
        }
    };
    
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (!activeLayer || activeLayer.type !== LayerType.PIXEL || editMode !== EditMode.SKETCH || isEditingMask) return;

        const dataUrl = e.dataTransfer.getData('text/plain');
        if (dataUrl.startsWith('data:image')) {
            const point = getCanvasCoordinates(e);
            const img = new Image();
            img.onload = () => {
                const size = 100;
                const newShape: Omit<PlacedShape, 'id' | 'rotation' | 'color'> = {
                    dataUrl,
                    x: point.x,
                    y: point.y,
                    width: size,
                    height: size * (img.height / img.width),
                };
                onAddShape(newShape);
            };
            img.src = dataUrl;
        }
    }, [layers, activeLayerId, editMode, onAddShape, isEditingMask]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div 
          ref={containerRef} 
          className="w-full h-full flex items-center justify-center rounded-lg overflow-hidden relative bg-base-300" 
          onDrop={handleDrop} 
          onDragOver={handleDragOver}
        >
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <filter id="adjustment-filter">
                        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" id="color-matrix-element" />
                    </filter>
                </defs>
            </svg>
            {isLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm space-y-4">
                    <Loader />
                    <p className="text-white font-semibold text-lg animate-pulse-fast">{loadingMessage}</p>

                </div>
            )}
            {layers.length === 0 && !isLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-4">
                    <button onClick={onUploadClick} className="flex flex-col items-center justify-center p-8 bg-base-200 border-2 border-base-300 hover:border-brand-primary rounded-lg transition-colors group shadow-lg">
                        <UploadIcon />
                        <p className="mt-2 font-semibold text-text-secondary group-hover:text-brand-primary">Upload an Image to Start Editing</p>
                        <p className="text-sm text-text-secondary">or generate one from the panel</p>
                    </button>
                </div>
            )}
            <canvas ref={mainCanvasRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <canvas ref={interactionCanvasRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} />
        </div>
    );
  }
);
