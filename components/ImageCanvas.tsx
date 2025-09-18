import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { EditMode, PlacedShape, Stroke, Point, ImageAdjustments, Layer, LayerType } from '../types';
import { Loader } from './Loader';
import { UploadIcon } from './Icons';

interface ImageCanvasProps {
  layers: Layer[];
  activeLayerId: string | null;
  isLoading: boolean;
  loadingMessage: string;
  editMode: EditMode;
  brushSize: number;
  brushColor: string;
  activeFilters: string[];
  adjustments: ImageAdjustments;
  onUploadClick: () => void;
  setCropRectActive: (isActive: boolean) => void;
  selectedShapeId: string | null;
  onAddStroke: (stroke: Stroke) => void;
  onAddShape: (shape: Omit<PlacedShape, 'id' | 'rotation' | 'color'>) => void;
  onUpdateShape: (id: string, updates: Partial<Omit<PlacedShape, 'id'>>) => void;
  onSelectShape: (id: string | null) => void;
  onImageLoad: (dimensions: { width: number; height: number; }) => void;
  onStrokeInteractionEnd: (stroke: Stroke) => void;
  onShapeInteractionEnd: () => void;
}

interface Rect { x: number; y: number; width: number; height: number; }
type InteractionMode = 'idle' | 'drawing' | 'cropping' | 'moving' | 'resizing' | 'rotating';
type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br';
type Handle = ResizeHandle | 'rotate';

interface InteractionState {
  mode: InteractionMode;
  startPoint?: Point;
  shapeStart?: PlacedShape;
  handle?: Handle;
  originalShape?: PlacedShape;
  shapeCenter?: Point;
  startAngle?: number;
  currentStroke?: Stroke;
}

export interface ImageCanvasMethods {
  getCanvasAsDataURL: (ignoreFilters?: boolean) => string | null;
  getMaskData: () => string | null;
  getExpandedCanvasData: (direction: 'up' | 'down' | 'left' | 'right', amount: number) => { data: string; mimeType: string; maskData: string; };
  applyCrop: () => string | null;
  clearCropSelection: () => void;
}

const HANDLE_SIZE = 10;
const MIN_SHAPE_SIZE = 20;
const ROTATION_HANDLE_OFFSET = 25;

export const ImageCanvas = forwardRef<ImageCanvasMethods, ImageCanvasProps>(
  (props, ref) => {
    const { layers, activeLayerId, isLoading, loadingMessage, editMode, brushSize, brushColor, activeFilters, adjustments, onUploadClick, setCropRectActive, selectedShapeId, onAddStroke, onAddShape, onUpdateShape, onSelectShape, onImageLoad, onStrokeInteractionEnd, onShapeInteractionEnd } = props;
    
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const offscreenCanvasesRef = useRef<Map<string, { canvas: HTMLCanvasElement, image?: HTMLImageElement, dirty: boolean }>>(new Map());
    const interactionStateRef = useRef<InteractionState>({ mode: 'idle' });
    const cropRectRef = useRef<Rect | null>(null);
    const lastDrawnLayerState = useRef<string | null>(null);

    const getCanvas = () => mainCanvasRef.current;
    const getCtx = () => getCanvas()?.getContext('2d');
    const getInteractionCanvas = () => interactionCanvasRef.current;
    const getInteractionCtx = () => getInteractionCanvas()?.getContext('2d');

    // Interaction drawing
    const drawInteractionLayer = useCallback(() => {
        const ctx = getInteractionCtx();
        const canvas = getInteractionCanvas();
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw brush cursor
        if (!selectedShapeId && (editMode === EditMode.MASK || editMode === EditMode.SKETCH)) {
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
        
        // Draw crop rectangle
        if (cropRectRef.current) {
            const rect = cropRectRef.current;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 2;
            ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
        }

    }, [editMode, brushSize, selectedShapeId]);

    // FIX: Define clearCropSelection before useImperativeHandle to resolve scope issues.
    const clearCropSelection = useCallback(() => {
      cropRectRef.current = null;
      setCropRectActive(false);
      drawInteractionLayer();
    }, [setCropRectActive, drawInteractionLayer]);

    // --- Imperative Handle ---
    useImperativeHandle(ref, () => ({
      getCanvasAsDataURL: (ignoreFilters = false) => {
        const canvas = getCanvas();
        if (!canvas) return null;
        if (ignoreFilters) return canvas.toDataURL('image/png');
        
        const filteredCanvas = document.createElement('canvas');
        filteredCanvas.width = canvas.width;
        filteredCanvas.height = canvas.height;
        const filteredCtx = filteredCanvas.getContext('2d');
        if (!filteredCtx) return null;
        
        filteredCtx.filter = getCombinedFilterValue();
        filteredCtx.drawImage(canvas, 0, 0);
        return filteredCanvas.toDataURL('image/png');
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
        const canvas = getCanvas();
        const rect = cropRectRef.current;
        if (!canvas || !rect) return null;

        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = rect.width;
        croppedCanvas.height = rect.height;
        const croppedCtx = croppedCanvas.getContext('2d');
        if (!croppedCtx) return null;

        croppedCtx.drawImage(canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
        
        clearCropSelection();
        return croppedCanvas.toDataURL('image/png');
      },
      clearCropSelection: clearCropSelection,
      getExpandedCanvasData: (direction, amount) => {
        const canvas = getCanvas();
        if (!canvas) throw new Error("Canvas not available");

        const originalWidth = canvas.width;
        const originalHeight = canvas.height;
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
        expandedCtx.drawImage(canvas, pasteX - (direction === 'left' ? bleed : 0), pasteY - (direction === 'up' ? bleed : 0), originalWidth + (direction === 'left' || direction === 'right' ? bleed : 0), originalHeight + (direction === 'up' || direction === 'down' ? bleed : 0));
        
        return {
          data: expandedCanvas.toDataURL('image/png').split(',')[1],
          mimeType: 'image/png',
          maskData: maskCanvas.toDataURL('image/png').split(',')[1]
        };
      },
    }));

    const getCombinedFilterValue = useCallback(() => {
        const adjustmentFilters = [
            `brightness(${adjustments.brightness}%)`,
            `contrast(${adjustments.contrast}%)`,
        ];
        // SVG filter handles RGB, so don't add CSS filters for it
        const svgFilter = (adjustments.red !== 100 || adjustments.green !== 100 || adjustments.blue !== 100)
            ? 'url(#color-matrix-filter)'
            : '';
        return [...activeFilters, ...adjustmentFilters, svgFilter].filter(Boolean).join(' ');
    }, [activeFilters, adjustments]);

    const drawLayers = useCallback(() => {
        const canvas = getCanvas();
        const ctx = getCtx();
        if (!canvas || !ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        layers.forEach(layer => {
            if (!layer.isVisible) return;
            
            const offscreen = offscreenCanvasesRef.current.get(layer.id);
            if (!offscreen || offscreen.dirty) {
                renderLayerToOffscreen(layer);
            }
            
            const sourceCanvas = offscreenCanvasesRef.current.get(layer.id)?.canvas;
            if (sourceCanvas) {
                ctx.globalAlpha = layer.opacity / 100;
                ctx.drawImage(sourceCanvas, 0, 0);
                ctx.globalAlpha = 1.0;
            }
        });
    }, [layers]);

    const initCanvases = useCallback(() => {
        const canvas = getCanvas();
        const interactionCanvas = getInteractionCanvas();
        const container = containerRef.current;
        if (!container || !canvas || !interactionCanvas) return;
        
        const firstImageLayer = layers.find(l => l.type === LayerType.IMAGE && l.src);
        if (!firstImageLayer?.src) {
             const { clientWidth, clientHeight } = container;
             canvas.width = clientWidth;
             canvas.height = clientHeight;
             interactionCanvas.width = clientWidth;
             interactionCanvas.height = clientHeight;
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

            // Mark all layers as dirty to force redraw at new size
            offscreenCanvasesRef.current.forEach(val => val.dirty = true);
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
        // Redraw when layers or filters change
        const currentLayerState = JSON.stringify(layers.map(({ id, name, isVisible, opacity, strokes, placedShapes, src }) => ({ id, name, isVisible, opacity, strokes: strokes?.length, placedShapes: placedShapes?.length, src })));
        if (lastDrawnLayerState.current !== currentLayerState) {
            offscreenCanvasesRef.current.forEach(val => val.dirty = true);
            lastDrawnLayerState.current = currentLayerState;
        }
        drawLayers();
    }, [layers, drawLayers]);

    const renderLayerToOffscreen = (layer: Layer) => {
        let offscreenData = offscreenCanvasesRef.current.get(layer.id);
        if (!offscreenData) {
            offscreenData = { canvas: document.createElement('canvas'), dirty: true };
            offscreenCanvasesRef.current.set(layer.id, offscreenData);
        }

        const { canvas: offscreenCanvas } = offscreenData;
        const mainCanvas = getCanvas();
        if (!mainCanvas) return;

        offscreenCanvas.width = mainCanvas.width;
        offscreenCanvas.height = mainCanvas.height;
        const ctx = offscreenCanvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

        if (layer.type === LayerType.IMAGE && layer.src) {
            let img = offscreenData.image;
            if (!img || img.src !== layer.src) {
                img = new Image();
                img.src = layer.src;
                offscreenData.image = img;
                img.onload = () => {
                    // This image might have loaded after the initial draw cycle
                    offscreenData.dirty = true;
                    drawLayers();
                };
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
                // Future optimization: Cache rendered shapes if they don't change
                const shapeImg = new Image();
                shapeImg.src = shape.dataUrl;
                if (shapeImg.complete) {
                    ctx.save();
                    ctx.translate(shape.x, shape.y);
                    ctx.rotate(shape.rotation);
                    ctx.drawImage(shapeImg, -shape.width / 2, -shape.height / 2, shape.width, shape.height);
                    ctx.restore();
                } else {
                    shapeImg.onload = () => { drawLayers(); };
                }
            });
        }
        offscreenData.dirty = false;
    };
    
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
        interactionStateRef.current.startPoint = point;

        if (editMode === EditMode.CROP) {
            interactionStateRef.current.mode = 'cropping';
            cropRectRef.current = { x: point.x, y: point.y, width: 0, height: 0 };
            return;
        }

        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (!activeLayer || activeLayer.type !== LayerType.PIXEL) return;

        // For now, let's simplify and only handle drawing
        if (editMode === EditMode.MASK || editMode === EditMode.SKETCH) {
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

        // Always update cursor position
        interactionStateRef.current.startPoint = point;
        
        if (mode === 'drawing' && currentStroke) {
            const updatedStroke = { ...currentStroke, points: [...currentStroke.points, point] };
            interactionStateRef.current.currentStroke = updatedStroke;
            
            // Directly manipulate the offscreen canvas for performance during drawing
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
                     drawLayers(); // Re-composite
                }
            }
        } else if (mode === 'cropping' && startPoint && cropRectRef.current) {
            cropRectRef.current.width = point.x - startPoint.x;
            cropRectRef.current.height = point.y - startPoint.y;
            drawInteractionLayer();
        }
        
        // Draw interaction layer continuously for cursor
        drawInteractionLayer();
    };

    const handleMouseUp = () => {
        const { mode, currentStroke } = interactionStateRef.current;

        if (mode === 'cropping' && cropRectRef.current) {
            // Normalize rect
            const rect = cropRectRef.current;
            if (rect.width < 0) { rect.x += rect.width; rect.width *= -1; }
            if (rect.height < 0) { rect.y += rect.height; rect.height *= -1; }
            setCropRectActive(rect.width > 10 && rect.height > 10);
        }
        
        if (mode === 'drawing' && currentStroke) {
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
        if (!activeLayer || activeLayer.type !== LayerType.PIXEL || editMode !== EditMode.SKETCH) return;

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
    }, [layers, activeLayerId, editMode, onAddShape]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-base-300 rounded-lg overflow-hidden relative" onDrop={handleDrop} onDragOver={handleDragOver}>
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <filter id="color-matrix-filter">
                        <feColorMatrix type="matrix" values={`
                            ${adjustments.red/100} 0 0 0 0
                            0 ${adjustments.green/100} 0 0 0
                            0 0 ${adjustments.blue/100} 0 0
                            0 0 0 1 0
                        `} />
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
            <canvas ref={mainCanvasRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ filter: getCombinedFilterValue() }}/>
            <canvas ref={interactionCanvasRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} />
        </div>
    );
  }
);