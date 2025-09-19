import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { EditMode, PlacedShape, Stroke, Point, ImageAdjustments, Layer, LayerType } from '../types';
import { Loader } from './Loader';
import { UploadIcon } from './Icons';
import { FILTERS } from '../constants';

interface ImageCanvasProps {
  layers: Layer[];
  activeLayerId: string | null;
  isEditingMask: boolean;
  isLoading: boolean;
  loadingMessage: string;
  editMode: EditMode;
  brushSize: number;
  brushColor: string;
  onUploadClick: () => void;
  isCropping: boolean;
  selectedShapeId: string | null;
  onAddStroke: (stroke: Stroke) => void;
  onAddShape: (shape: Omit<PlacedShape, 'id' | 'rotation' | 'color'>) => void;
  onUpdateShape: (id: string, updates: Partial<Omit<PlacedShape, 'id'>>) => void;
  onSelectShape: (id: string | null) => void;
  onImageLoad: (dimensions: { width: number; height: number; }) => void;
  onStrokeInteractionEnd: (stroke: Stroke) => void;
  onShapeInteractionEnd: () => void;
  onUpdateLayerMask: (layerId: string, maskDataUrl: string) => void;
  onInteractionEndWithHistory: () => void;
}

interface Rect { x: number; y: number; width: number; height: number; }
type InteractionMode = 'idle' | 'drawing' | 'masking' | 'cropping' | 'moving' | 'resizing' | 'rotating' | 'moving-crop' | 'resizing-crop';
type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br';
type Handle = ResizeHandle | 'rotate';
type CropResizeHandle = 'tl' | 'tr' | 'bl' | 'br';


interface InteractionState {
  mode: InteractionMode;
  startPoint?: Point;
  shapeStart?: PlacedShape;
  handle?: Handle;
  originalShape?: PlacedShape;
  shapeCenter?: Point;
  startAngle?: number;
  currentStroke?: Stroke;
  cropResizeHandle?: CropResizeHandle | null;
  cropMoveStartOffset?: Point | null;
}

export interface ImageCanvasMethods {
  getCanvasAsDataURL: (options?: { format?: 'png' | 'jpeg' | 'webp'; quality?: number; ignoreFilters?: boolean; fillStyle?: string; }) => string | null;
  getMaskData: () => string | null;
  getExpandedCanvasData: (baseImageDataUrl: string, direction: 'up' | 'down' | 'left' | 'right', amount: number) => Promise<{ data: string; mimeType: string; maskData: string; pasteX: number; pasteY: number }>;
  applyCrop: () => string | null;
  clearCropSelection: () => void;
}

const CROP_HANDLE_SIZE = 10;
const MIN_SHAPE_SIZE = 20;
const ROTATION_HANDLE_OFFSET = 25;

type OffscreenCanvasEntry = { canvas: HTMLCanvasElement; image?: HTMLImageElement; dirty: boolean; };

const getCropHandles = (rect: Rect): Record<CropResizeHandle, Rect> => {
    const { x, y, width, height } = rect;
    const size = CROP_HANDLE_SIZE;
    return {
        tl: { x: x - size / 2, y: y - size / 2, width: size, height: size },
        tr: { x: x + width - size / 2, y: y - size / 2, width: size, height: size },
        bl: { x: x - size / 2, y: y + height - size / 2, width: size, height: size },
        br: { x: x + width - size / 2, y: y + height - size / 2, width: size, height: size },
    };
};

const getHandleAtPoint = (point: Point, rect: Rect): CropResizeHandle | null => {
    const handles = getCropHandles(rect);
    for (const key in handles) {
        const handleRect = handles[key as CropResizeHandle];
        if (point.x >= handleRect.x && point.x <= handleRect.x + handleRect.width &&
            point.y >= handleRect.y && point.y <= handleRect.y + handleRect.height) {
            return key as CropResizeHandle;
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
    const { layers, activeLayerId, isEditingMask, isLoading, loadingMessage, editMode, brushSize, brushColor, onUploadClick, isCropping, selectedShapeId, onAddStroke, onAddShape, onUpdateShape, onSelectShape, onImageLoad, onStrokeInteractionEnd, onShapeInteractionEnd, onUpdateLayerMask, onInteractionEndWithHistory } = props;
    
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const offscreenCanvasesRef = useRef<Map<string, OffscreenCanvasEntry>>(new Map());
    const offscreenMasksRef = useRef<Map<string, OffscreenCanvasEntry>>(new Map());
    const tempCompositeCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const interactionStateRef = useRef<InteractionState>({ mode: 'idle' });
    const cropRectRef = useRef<Rect | null>(null);
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

        const showBrushCursor = !selectedShapeId && (editMode === EditMode.MASK || editMode === EditMode.SKETCH || isEditingMask);
        if (showBrushCursor && !isCropping) {
             const {x, y} = interactionStateRef.current.startPoint || {x: -100, y: -100};
             ctx.beginPath();
             ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
             ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
             ctx.lineWidth = 1;
             ctx.stroke();
             ctx.beginPath();
             ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
             ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
             ctx.stroke();
        }
        
        if (cropRectRef.current && isCropping) {
            const rect = cropRectRef.current;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 2;
            ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
            
            // Draw handles
            const handles = getCropHandles(rect);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            Object.values(handles).forEach(handle => {
                ctx.fillRect(handle.x, handle.y, handle.width, handle.height);
            });
        }

    }, [editMode, brushSize, selectedShapeId, isEditingMask, isCropping]);

    const clearCropSelection = useCallback(() => {
      cropRectRef.current = null;
      drawInteractionLayer();
    }, [drawInteractionLayer]);
    
    const getFlattenedCanvas = (): HTMLCanvasElement | null => {
        const canvas = getCanvas();
        if (!canvas) return null;

        // The tempCompositeCanvasRef holds the final rendered image before it's drawn to the main canvas.
        // This is the most reliable source for a flattened image of all layers.
        const flatCanvas = tempCompositeCanvasRef.current;
        if (!flatCanvas || flatCanvas.width === 0 || flatCanvas.height === 0) {
            // Fallback to the main canvas if the temp one isn't ready, which might happen on initial load.
            return canvas;
        }
        return flatCanvas;
    };

    useImperativeHandle(ref, () => ({
      getCanvasAsDataURL: (options = {}) => {
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
      applyCrop: () => {
        const flatCanvas = getFlattenedCanvas();
        const rect = cropRectRef.current;
        if (!flatCanvas || !rect || rect.width <= 0 || rect.height <= 0) return null;

        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = rect.width;
        croppedCanvas.height = rect.height;
        const croppedCtx = croppedCanvas.getContext('2d');
        if (!croppedCtx) return null;

        croppedCtx.drawImage(flatCanvas, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
        
        clearCropSelection();
        return croppedCanvas.toDataURL('image/png');
      },
      clearCropSelection: clearCropSelection,
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
          pasteY
        };
      },
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

      if (offscreenCanvas.width !== mainCanvas.width || offscreenCanvas.height !== mainCanvas.height) {
          offscreenCanvas.width = mainCanvas.width;
          offscreenCanvas.height = mainCanvas.height;
          offscreenData.dirty = true;
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
        if (img.complete) {
            ctx.drawImage(img, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
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
          if (maskCanvas.width !== offscreenCanvas.width || maskCanvas.height !== offscreenCanvas.height) {
              maskCanvas.width = offscreenCanvas.width;
              maskCanvas.height = offscreenCanvas.height;
              if (maskData.image) maskData.image.src = '';
          }

          let maskImg = maskData.image;
          if (!maskImg || maskImg.src !== layer.maskSrc) {
              maskImg = new Image();
              maskImg.src = layer.maskSrc;
              maskData.image = maskImg;
              maskImg.onload = () => {
                  const maskCtx = maskCanvas.getContext('2d');
                  if (maskCtx) {
                      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
                      maskCtx.drawImage(maskImg, 0, 0, maskCanvas.width, maskCanvas.height);
                  }
                  const layerContent = offscreenCanvasesRef.current.get(layer.id);
                  if (layerContent) layerContent.dirty = true;
                  drawLayersRef.current();
              };
          }

          if (maskImg.complete) {
              ctx.globalCompositeOperation = 'destination-in';
              ctx.drawImage(maskCanvas, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
              ctx.globalCompositeOperation = 'source-over';
          }
      }
      offscreenData.dirty = false;
  }, []);

    const drawLayers = useCallback(() => {
        const canvas = getCanvas();
        const ctx = getCtx();
        if (!canvas || !ctx) return;

        // Ensure temp composite canvas exists and is the right size
        if (!tempCompositeCanvasRef.current) tempCompositeCanvasRef.current = document.createElement('canvas');
        const tempCanvas = tempCompositeCanvasRef.current;
        if (tempCanvas.width !== canvas.width || tempCanvas.height !== canvas.height) {
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
        }
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

        for (const layer of layers) {
            if (!layer.isVisible) continue;

            const offscreen = offscreenCanvasesRef.current.get(layer.id);
            if (layer.type !== LayerType.ADJUSTMENT && (!offscreen || offscreen.dirty)) {
                renderLayerToOffscreen(layer);
            }

            if (layer.type === LayerType.IMAGE || layer.type === LayerType.PIXEL) {
                const sourceCanvas = offscreen?.canvas;
                if (sourceCanvas) {
                    tempCtx.globalAlpha = layer.opacity / 100;
                    tempCtx.drawImage(sourceCanvas, 0, 0);
                    tempCtx.globalAlpha = 1.0;
                }
            } else if (layer.type === LayerType.ADJUSTMENT && layer.adjustments) {
                const { brightness, contrast, red, green, blue, filter: filterName } = layer.adjustments;
                
                const filterPreset = FILTERS.find(f => f.name === filterName);
                const presetFilterValue = filterPreset && filterPreset.name !== 'None' ? filterPreset.value : '';

                const cssFilters = `${presetFilterValue} brightness(${brightness}%) contrast(${contrast}%)`;

                // Update the SVG filter matrix for RGB adjustments.
                const matrixElement = document.getElementById('color-matrix-element');
                if (matrixElement) {
                    const r = red / 100;
                    const g = green / 100;
                    const b = blue / 100;
                    const matrix = `${r} 0 0 0 0 ` +
                                   `0 ${g} 0 0 0 ` +
                                   `0 0 ${b} 0 0 ` +
                                   `0 0 0 1 0`;
                    matrixElement.setAttribute('values', matrix);
                }

                // Apply adjustment to what's been drawn so far.
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.filter = `${cssFilters} url(#adjustment-filter)`;
                ctx.drawImage(tempCanvas, 0, 0);
                ctx.filter = 'none';

                // Copy the adjusted result back to the temp canvas to stack further effects.
                tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.drawImage(canvas, 0, 0);
            }
        }
        
        // Draw the final composite to the main canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);

    }, [layers, renderLayerToOffscreen]);


    useEffect(() => {
        drawLayersRef.current = drawLayers;
    }, [drawLayers]);

    const initCanvases = useCallback(() => {
        const canvas = getCanvas();
        const interactionCanvas = getInteractionCanvas();
        const container = containerRef.current;
        if (!container || !canvas || !interactionCanvas) return;
        
        const firstImageLayer = layers.find(l => l.type === LayerType.IMAGE && l.src);
        if (!firstImageLayer?.src) {
             const { clientWidth, clientHeight } = container;
             canvas.width = clientWidth > 0 ? clientWidth : 512;
             canvas.height = clientHeight > 0 ? clientHeight : 512;
             interactionCanvas.width = canvas.width;
             interactionCanvas.height = canvas.height;
             drawLayers();
             return;
        };

        const img = new Image();
        img.onload = () => {
            const containerRatio = container.clientWidth / container.clientHeight;
            const imageRatio = img.width / img.height;
            let width, height;

            if (containerRatio > imageRatio) {
                height = container.clientHeight;
                width = height * imageRatio;
            } else {
                width = container.clientWidth;
                height = width / imageRatio;
            }
            canvas.width = width;
            canvas.height = height;
            interactionCanvas.width = width;
            interactionCanvas.height = height;

            offscreenCanvasesRef.current.forEach(val => val.dirty = true);
            offscreenMasksRef.current.forEach(val => val.dirty = true);
            drawLayers();
            onImageLoad({ width: img.width, height: img.height });
        };
        img.src = firstImageLayer.src;
    }, [layers, onImageLoad, drawLayers]);

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

    const handleMouseDown = (e: React.MouseEvent) => {
        const point = getCanvasCoordinates(e);

        if (isCropping) {
             if (cropRectRef.current) {
                const handle = getHandleAtPoint(point, cropRectRef.current);
                if (handle) {
                    interactionStateRef.current = { mode: 'resizing-crop', startPoint: point, cropResizeHandle: handle };
                    return;
                }
                if (isPointInRect(point, cropRectRef.current)) {
                    interactionStateRef.current = {
                        mode: 'moving-crop',
                        startPoint: point,
                        cropMoveStartOffset: { x: point.x - cropRectRef.current.x, y: point.y - cropRectRef.current.y }
                    };
                    return;
                }
            }
            // If no rect, or clicked outside, start drawing a new one
            interactionStateRef.current = { mode: 'cropping', startPoint: point };
            cropRectRef.current = { x: point.x, y: point.y, width: 0, height: 0 };
            return;
        }

        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (!activeLayer) return;

        if (isEditingMask) {
            interactionStateRef.current.mode = 'masking';
            
            const maskData = offscreenMasksRef.current.get(activeLayer.id);
            if (maskData) {
                const maskCtx = maskData.canvas.getContext('2d');
                if (maskCtx) {
                    if (brushColor === '#000000') { // Black brush erases the mask (makes transparent)
                        maskCtx.globalCompositeOperation = 'destination-out';
                    } else { // White brush draws on the mask (makes opaque)
                        maskCtx.globalCompositeOperation = 'source-over';
                    }
                    maskCtx.strokeStyle = 'black'; // Color doesn't matter for erasing, just needs to be opaque.
                    maskCtx.lineWidth = brushSize;
                    maskCtx.lineCap = 'round';
                    maskCtx.lineJoin = 'round';
                    maskCtx.beginPath();
                    maskCtx.moveTo(point.x, point.y);
                }
            }

        } else if (activeLayer.type === LayerType.PIXEL && (editMode === EditMode.MASK || editMode === EditMode.SKETCH)) {
            interactionStateRef.current.mode = 'drawing';
            const newStroke: Stroke = {
                id: `stroke_${Date.now()}`,
                points: [point],
                color: editMode === EditMode.MASK ? '#FFFFFF' : brushColor,
                size: brushSize,
            };
            interactionStateRef.current.currentStroke = newStroke;
            onAddStroke(newStroke);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const point = getCanvasCoordinates(e);
        const { mode, startPoint, currentStroke } = interactionStateRef.current;
        const canvas = getInteractionCanvas();
        if (!canvas) return;

        // Update cursor
        if (isCropping && cropRectRef.current) {
            const handle = getHandleAtPoint(point, cropRectRef.current);
            if (handle) {
                if (handle === 'tl' || handle === 'br') canvas.style.cursor = 'nwse-resize';
                else canvas.style.cursor = 'nesw-resize';
            } else if (isPointInRect(point, cropRectRef.current)) {
                canvas.style.cursor = 'move';
            } else {
                canvas.style.cursor = 'crosshair';
            }
        } else if (isCropping) {
            canvas.style.cursor = 'crosshair';
        } else if (!isLoading) {
            canvas.style.cursor = 'auto';
        }

        interactionStateRef.current.startPoint = point;
        
        if (mode === 'cropping' && startPoint && cropRectRef.current) {
            const x1 = startPoint.x;
            const y1 = startPoint.y;
            const x2 = point.x;
            const y2 = point.y;
            cropRectRef.current.x = Math.min(x1, x2);
            cropRectRef.current.y = Math.min(y1, y2);
            cropRectRef.current.width = Math.abs(x1 - x2);
            cropRectRef.current.height = Math.abs(y1 - y2);
            drawInteractionLayer();
        } else if (mode === 'moving-crop' && cropRectRef.current && interactionStateRef.current.cropMoveStartOffset) {
            const { cropMoveStartOffset } = interactionStateRef.current;
            let newX = point.x - cropMoveStartOffset.x;
            let newY = point.y - cropMoveStartOffset.y;
            
            newX = Math.max(0, Math.min(newX, canvas.width - cropRectRef.current.width));
            newY = Math.max(0, Math.min(newY, canvas.height - cropRectRef.current.height));

            cropRectRef.current.x = newX;
            cropRectRef.current.y = newY;
            drawInteractionLayer();
        } else if (mode === 'resizing-crop' && cropRectRef.current && interactionStateRef.current.cropResizeHandle) {
            const rect = cropRectRef.current;
            const handle = interactionStateRef.current.cropResizeHandle;
            const oldRight = rect.x + rect.width;
            const oldBottom = rect.y + rect.height;

            switch (handle) {
                case 'tl':
                    rect.x = point.x;
                    rect.y = point.y;
                    rect.width = oldRight - point.x;
                    rect.height = oldBottom - point.y;
                    break;
                case 'tr':
                    rect.width = point.x - rect.x;
                    rect.y = point.y;
                    rect.height = oldBottom - point.y;
                    break;
                case 'bl':
                    rect.x = point.x;
                    rect.width = oldRight - point.x;
                    rect.height = point.y - rect.y;
                    break;
                case 'br':
                    rect.width = point.x - rect.x;
                    rect.height = point.y - rect.y;
                    break;
            }
            drawInteractionLayer();
        } else if (mode === 'masking' && activeLayerId) {
            const maskData = offscreenMasksRef.current.get(activeLayerId);
            const maskCtx = maskData?.canvas.getContext('2d');
            if (maskCtx) {
                maskCtx.lineTo(point.x, point.y);
                maskCtx.stroke();
                const layerData = offscreenCanvasesRef.current.get(activeLayerId);
                if (layerData) layerData.dirty = true;
                drawLayers();
            }
        } else if (mode === 'drawing' && currentStroke) {
            const updatedStroke = { ...currentStroke, points: [...currentStroke.points, point] };
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
                     ctx.lineTo(point.x, point.y);
                     ctx.stroke();
                     drawLayers();
                }
            }
        }
        
        if (interactionStateRef.current.mode !== 'cropping' && interactionStateRef.current.mode !== 'moving-crop' && interactionStateRef.current.mode !== 'resizing-crop') {
             drawInteractionLayer();
        }
    };

    const handleMouseUp = () => {
        const { mode, currentStroke } = interactionStateRef.current;

        if (mode === 'resizing-crop' && cropRectRef.current) {
            const rect = cropRectRef.current;
            if (rect.width < 0) {
                rect.x += rect.width;
                rect.width *= -1;
            }
            if (rect.height < 0) {
                rect.y += rect.height;
                rect.height *= -1;
            }
        } else if (mode === 'masking' && activeLayerId) {
            const maskData = offscreenMasksRef.current.get(activeLayerId);
            if (maskData) {
                const maskCtx = maskData.canvas.getContext('2d');
                if (maskCtx) {
                    maskCtx.closePath();
                    // Reset composite operation to default after drawing
                    maskCtx.globalCompositeOperation = 'source-over';
                }
                onUpdateLayerMask(activeLayerId, maskData.canvas.toDataURL());
            }
            onInteractionEndWithHistory();
        } else if (mode === 'drawing' && currentStroke) {
            onStrokeInteractionEnd(currentStroke);
        } else if (mode === 'moving' || mode === 'resizing' || mode === 'rotating') {
            onShapeInteractionEnd();
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
        <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-base-300 rounded-lg overflow-hidden relative" onDrop={handleDrop} onDragOver={handleDragOver}>
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
                    <button onClick={onUploadClick} className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-base-300 hover:border-brand-primary rounded-lg transition-colors group">
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