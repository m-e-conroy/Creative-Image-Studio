import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { EditMode, PlacedShape, Stroke, Point, CanvasData } from '../types';
import { Loader } from './Loader';
import { UploadIcon } from './Icons';

interface ImageCanvasProps {
  imageSrc: string | null;
  isLoading: boolean;
  loadingMessage: string;
  editMode: EditMode;
  brushSize: number;
  brushColor: string;
  activeFilters: string[];
  onUploadClick: () => void;
  setCropRectActive: (isActive: boolean) => void;
  // New props for interactive elements
  strokes: Stroke[];
  placedShapes: PlacedShape[];
  selectedShapeId: string | null;
  onAddStroke: (stroke: Stroke) => void;
  onAddShape: (shape: Omit<PlacedShape, 'id' | 'rotation' | 'color'>) => void;
  onUpdateShape: (id: string, updates: Partial<Omit<PlacedShape, 'id'>>) => void;
  onSelectShape: (id: string | null) => void;
  // New props for image dimensions
  onImageLoad: (dimensions: { width: number; height: number; }) => void;
}

interface Rect { x: number; y: number; width: number; height: number; }
type InteractionMode = 'idle' | 'drawing' | 'cropping' | 'moving' | 'resizing' | 'rotating';
type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br';
type Handle = ResizeHandle | 'rotate';


interface InteractionState {
  mode: InteractionMode;
  startPoint?: Point;
  // for moving
  shapeStart?: PlacedShape;
  // for resizing
  handle?: Handle;
  originalShape?: PlacedShape;
  // for rotating
  shapeCenter?: Point;
  startAngle?: number;
  // for drawing
  currentStroke?: Stroke;
}

export interface ImageCanvasMethods {
  getCanvasData: (editMode: EditMode) => CanvasData;
  getExpandedCanvasData: (direction: 'up' | 'down' | 'left' | 'right', amount: number) => { data: string; mimeType: string; maskData: string; };
  getCanvasAsDataURL: () => string;
  clearDrawing: () => void;
  applyCrop: () => string | null;
  clearCropSelection: () => void;
  getDrawingAsDataURL: (strokes: Stroke[]) => string | null;
}

const HANDLE_SIZE = 10;
const MIN_SHAPE_SIZE = 20;
const ROTATION_HANDLE_OFFSET = 25;

export const ImageCanvas = forwardRef<ImageCanvasMethods, ImageCanvasProps>(
  (props, ref) => {
    const { imageSrc, isLoading, loadingMessage, editMode, brushSize, brushColor, activeFilters, onUploadClick, setCropRectActive, strokes, placedShapes, selectedShapeId, onAddStroke, onAddShape, onUpdateShape, onSelectShape, onImageLoad } = props;
    
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
    const [cursorPos, setCursorPos] = useState<Point | null>(null);
    const [canvasCursorPos, setCanvasCursorPos] = useState<Point | null>(null);
    const [isMouseOver, setIsMouseOver] = useState(false);

    // Cropping state
    const [cropRect, setCropRect] = useState<Rect | null>(null);
    
    // Interaction state
    const interaction = useRef<InteractionState>({ mode: 'idle' });
    const loadedImages = useRef<Map<string, HTMLImageElement>>(new Map());
    const colorizedImageCache = useRef<Map<string, HTMLCanvasElement>>(new Map());


    const MASK_COLOR = 'rgba(79, 70, 229, 0.5)';

    const getCanvasContext = useCallback((canvasRef: React.RefObject<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      return canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null;
    }, []);
    
    // Preload original shape images
    useEffect(() => {
        const allShapes = [...placedShapes.map(s => s.dataUrl)];
        allShapes.forEach(dataUrl => {
            if (!loadedImages.current.has(dataUrl)) {
                const img = new Image();
                img.src = dataUrl;
                img.onload = () => {
                    loadedImages.current.set(dataUrl, img);
                    redrawInteractionCanvas(); // Redraw once image is ready for colorization
                };
            }
        });
    }, [placedShapes]);

    // Create colorized versions of shapes when they change
    useEffect(() => {
      let needsRedraw = false;
      placedShapes.forEach(shape => {
          const originalImg = loadedImages.current.get(shape.dataUrl);
          if (originalImg?.complete) {
              const cacheKey = `${shape.id}_${shape.color}`;
              if (!colorizedImageCache.current.has(cacheKey)) {
                  const tempCanvas = document.createElement('canvas');
                  tempCanvas.width = originalImg.naturalWidth;
                  tempCanvas.height = originalImg.naturalHeight;
                  const tempCtx = tempCanvas.getContext('2d');
                  if (tempCtx) {
                      tempCtx.drawImage(originalImg, 0, 0);
                      tempCtx.globalCompositeOperation = 'source-in';
                      tempCtx.fillStyle = shape.color;
                      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                      colorizedImageCache.current.set(cacheKey, tempCanvas);
                      needsRedraw = true;
                  }
              }
          }
      });
      if (needsRedraw) {
          redrawInteractionCanvas();
      }
    }, [placedShapes]);
    
    const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
        if (stroke.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
    };
    
    const drawShape = (ctx: CanvasRenderingContext2D, shape: PlacedShape) => {
        const cacheKey = `${shape.id}_${shape.color}`;
        const colorizedCanvas = colorizedImageCache.current.get(cacheKey);
        if (colorizedCanvas) {
            ctx.save();
            ctx.translate(shape.x + shape.width / 2, shape.y + shape.height / 2);
            ctx.rotate(shape.rotation);
            ctx.drawImage(colorizedCanvas, -shape.width / 2, -shape.height / 2, shape.width, shape.height);
            ctx.restore();
        }
    };
    
    const drawSelectionBox = (ctx: CanvasRenderingContext2D, shape: PlacedShape) => {
        ctx.save();
        ctx.translate(shape.x + shape.width / 2, shape.y + shape.height / 2);
        ctx.rotate(shape.rotation);
        
        ctx.strokeStyle = '#2f9fd0';
        ctx.lineWidth = 2;
        ctx.strokeRect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
        
        ctx.fillStyle = '#fff';
        
        // Draw resize handles relative to the shape's center
        const handles = getResizeHandles(shape);
        Object.values(handles).forEach(handle => {
             ctx.strokeRect(handle.x - shape.x - shape.width/2, handle.y - shape.y - shape.height/2, handle.width, handle.height);
             ctx.fillRect(handle.x - shape.x - shape.width/2, handle.y - shape.y - shape.height/2, handle.width, handle.height);
        });

        // Draw rotation handle
        const rotHandle = getRotationHandle(shape);
        ctx.beginPath();
        ctx.moveTo(0, -shape.height / 2);
        ctx.lineTo(rotHandle.x - shape.x - shape.width / 2, rotHandle.y - shape.y - shape.height / 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(rotHandle.x - shape.x - shape.width / 2, rotHandle.y - shape.y - shape.height / 2, HANDLE_SIZE/1.5, 0, 2*Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    };

    const drawCropRectangle = useCallback((rect: Rect) => {
      const ctx = getCanvasContext(interactionCanvasRef);
      if (!ctx) return;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }, [getCanvasContext]);

    const redrawInteractionCanvas = useCallback(() => {
        const ctx = getCanvasContext(interactionCanvasRef);
        const canvas = interactionCanvasRef.current;
        if (!ctx || !canvas) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (editMode === EditMode.SKETCH) {
            strokes.forEach(stroke => drawStroke(ctx, stroke));
            placedShapes.forEach(shape => drawShape(ctx, shape));
            const selectedShape = placedShapes.find(s => s.id === selectedShapeId);
            if (selectedShape) {
                drawSelectionBox(ctx, selectedShape);
            }
        } else if (editMode === EditMode.MASK) {
             strokes.forEach(stroke => drawStroke(ctx, { ...stroke, color: MASK_COLOR }));
        } else if (editMode === EditMode.CROP && cropRect) {
            drawCropRectangle(cropRect);
        }

    }, [editMode, strokes, placedShapes, selectedShapeId, cropRect, drawCropRectangle]);

    useEffect(redrawInteractionCanvas, [redrawInteractionCanvas]);

    const initCanvases = useCallback((img: HTMLImageElement) => {
        const mainCanvas = mainCanvasRef.current;
        const interactionCanvas = interactionCanvasRef.current;
        if (mainCanvas && interactionCanvas) {
            mainCanvas.width = img.naturalWidth;
            mainCanvas.height = img.naturalHeight;
            interactionCanvas.width = img.naturalWidth;
            interactionCanvas.height = img.naturalHeight;
            
            onImageLoad({ width: img.naturalWidth, height: img.naturalHeight });

            const mainCtx = getCanvasContext(mainCanvasRef);
            if (mainCtx) {
                mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
                mainCtx.drawImage(img, 0, 0);
            }
            const interactionCtx = getCanvasContext(interactionCanvasRef);
            if (interactionCtx) {
                interactionCtx.clearRect(0, 0, interactionCanvas.width, interactionCanvas.height);
            }
        }
    }, [onImageLoad, getCanvasContext]);

    useEffect(() => {
        if (imageSrc) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageSrc;
            img.onload = () => initCanvases(img);
            img.onerror = () => console.error("Failed to load image for canvas.");
            setCropRect(null);
            setCropRectActive(false);
        } else {
            const mainCtx = getCanvasContext(mainCanvasRef);
            const interactionCtx = getCanvasContext(interactionCanvasRef);
            if (mainCtx?.canvas) mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);
            if (interactionCtx?.canvas) interactionCtx.clearRect(0, 0, interactionCtx.canvas.width, interactionCtx.canvas.height);
        }
    }, [imageSrc, initCanvases]);

    useImperativeHandle(ref, () => ({
      getCanvasData: (editMode: EditMode): CanvasData => {
        const mainCanvas = mainCanvasRef.current;
        if (!mainCanvas) return { data: '', mimeType: '' };
    
        const mimeType = 'image/png';
    
        if (editMode === EditMode.MASK) {
          const originalImageData = mainCanvas.toDataURL(mimeType).split(',')[1];
    
          const maskCanvas = document.createElement('canvas');
          maskCanvas.width = mainCanvas.width;
          maskCanvas.height = mainCanvas.height;
          const maskCtx = maskCanvas.getContext('2d');
          if (!maskCtx) return { data: originalImageData, mimeType }; 
    
          maskCtx.fillStyle = 'black'; // Unchanged area
          maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
          
          // Draw strokes in white for the area to be edited
          strokes.forEach(stroke => drawStroke(maskCtx, { ...stroke, color: 'white' }));
          
          const maskData = maskCanvas.toDataURL(mimeType).split(',')[1];
          return { data: originalImageData, mimeType, maskData };
        }
    
        // For SKETCH mode (and others as a fallback), composite everything.
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = mainCanvas.width;
        tempCanvas.height = mainCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return { data: '', mimeType: '' };
    
        tempCtx.drawImage(mainCanvas, 0, 0);
    
        if (editMode === EditMode.SKETCH) {
          strokes.forEach(stroke => drawStroke(tempCtx, stroke));
          placedShapes.forEach(shape => drawShape(tempCtx, shape));
        }
        
        const data = tempCanvas.toDataURL(mimeType).split(',')[1];
        return { data, mimeType };
      },
      getExpandedCanvasData: (direction: 'up' | 'down' | 'left' | 'right', amount: number) => {
        const originalCanvas = mainCanvasRef.current;
        if (!originalCanvas) return { data: '', mimeType: '', maskData: '' };

        // Constants for the seamless blending effect
        const MASK_BLUR_RADIUS = 8; // The softness of the mask edge
        const IMAGE_BLEED_PIXELS = 4; // How many pixels the original image bleeds into the new area
        
        const EXPANSION_AMOUNT = Math.round(Math.min(originalCanvas.width, originalCanvas.height) * (amount / 100));
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        const maskCanvas = document.createElement('canvas');
        const maskCtx = maskCanvas.getContext('2d');

        if (!tempCtx || !maskCtx) return { data: '', mimeType: '', maskData: '' };
        
        let newWidth = originalCanvas.width, newHeight = originalCanvas.height;
        let drawX = 0, drawY = 0;
        let maskRect = { x: 0, y: 0, w: 0, h: 0 };

        switch (direction) {
          case 'up': 
            newHeight += EXPANSION_AMOUNT; 
            drawY = EXPANSION_AMOUNT; 
            maskRect = { x: 0, y: 0, w: newWidth, h: EXPANSION_AMOUNT };
            break;
          case 'down': 
            newHeight += EXPANSION_AMOUNT; 
            maskRect = { x: 0, y: originalCanvas.height, w: newWidth, h: EXPANSION_AMOUNT };
            break;
          case 'left': 
            newWidth += EXPANSION_AMOUNT; 
            drawX = EXPANSION_AMOUNT; 
            maskRect = { x: 0, y: 0, w: EXPANSION_AMOUNT, h: newHeight };
            break;
          case 'right': 
            newWidth += EXPANSION_AMOUNT; 
            maskRect = { x: originalCanvas.width, y: 0, w: EXPANSION_AMOUNT, h: newHeight };
            break;
        }

        tempCanvas.width = newWidth; 
        tempCanvas.height = newHeight;
        maskCanvas.width = newWidth;
        maskCanvas.height = newHeight;
        
        // Fill the new area with random noise.
        const canvasImageData = tempCtx.createImageData(newWidth, newHeight);
        const noiseData = canvasImageData.data;
        for (let i = 0; i < noiseData.length; i += 4) {
            const val = Math.floor(Math.random() * 256);
            noiseData[i] = val; noiseData[i + 1] = val; noiseData[i + 2] = val; noiseData[i + 3] = 255;
        }
        tempCtx.putImageData(canvasImageData, 0, 0);

        // Draw the original image, slightly expanded to "bleed" into the new area.
        // This provides the model with more context at the seam.
        tempCtx.drawImage(
            originalCanvas, 
            drawX - IMAGE_BLEED_PIXELS, 
            drawY - IMAGE_BLEED_PIXELS, 
            originalCanvas.width + (IMAGE_BLEED_PIXELS * 2), 
            originalCanvas.height + (IMAGE_BLEED_PIXELS * 2)
        );
        const imageData = tempCanvas.toDataURL('image/png').split(',')[1];
        
        // Create the mask with a blurred edge for seamless blending.
        maskCtx.fillStyle = 'black'; // Unchanged area
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        
        // Apply a blur filter to the context.
        maskCtx.filter = `blur(${MASK_BLUR_RADIUS}px)`;
        
        maskCtx.fillStyle = 'white'; // Area to generate
        // Draw the white rectangle. The blur filter will automatically create a soft edge.
        maskCtx.fillRect(maskRect.x, maskRect.y, maskRect.w, maskRect.h);
        
        // It's good practice to reset the filter when done.
        maskCtx.filter = 'none';

        const maskData = maskCanvas.toDataURL('image/png').split(',')[1];

        return { data: imageData, mimeType: 'image/png', maskData: maskData };
      },
      getCanvasAsDataURL: () => {
        const originalCanvas = mainCanvasRef.current;
        if (!originalCanvas) return '';
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalCanvas.width;
        tempCanvas.height = originalCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.filter = activeFilters.join(' ') || 'none';
          tempCtx.drawImage(originalCanvas, 0, 0);
          const interactionCanvas = interactionCanvasRef.current;
          if (interactionCanvas) tempCtx.drawImage(interactionCanvas, 0, 0);
          return tempCanvas.toDataURL('image/png');
        }
        return originalCanvas.toDataURL('image/png');
      },
      clearDrawing: () => { /* Now handled by App state */ },
      applyCrop: () => {
        const canvas = mainCanvasRef.current;
        if (!canvas || !cropRect || cropRect.width <= 0 || cropRect.height <= 0) return null;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cropRect.width;
        tempCanvas.height = cropRect.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(canvas, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, cropRect.width, cropRect.height);
          return tempCanvas.toDataURL('image/png');
        }
        return null;
      },
      clearCropSelection: () => {
        setCropRect(null);
        setCropRectActive(false);
        redrawInteractionCanvas();
      },
      getDrawingAsDataURL: (currentStrokes: Stroke[]) => {
        if (currentStrokes.length === 0) return null;
        const canvas = interactionCanvasRef.current;
        if (!canvas) return null;
      
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        currentStrokes.forEach(stroke => {
            stroke.points.forEach(p => {
                minX = Math.min(minX, p.x - stroke.size / 2);
                minY = Math.min(minY, p.y - stroke.size / 2);
                maxX = Math.max(maxX, p.x + stroke.size / 2);
                maxY = Math.max(maxY, p.y + stroke.size / 2);
            });
        });
      
        const width = maxX - minX;
        const height = maxY - minY;
        if (width <=0 || height <= 0) return null;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return null;

        tempCtx.translate(-minX, -minY);
        currentStrokes.forEach(s => drawStroke(tempCtx, s));
        
        return tempCanvas.toDataURL('image/png');
      }
    }));
    
    const getCanvasPosFromEvent = (e: React.MouseEvent<HTMLElement> | React.DragEvent<HTMLElement>): Point | null => {
        const canvas = interactionCanvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left) * (canvas.width / rect.width),
          y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const getResizeHandles = (shape: PlacedShape): Record<ResizeHandle, Rect> => {
        const { x, y, width, height } = shape;
        const halfHandle = HANDLE_SIZE / 2;
        return {
            tl: { x: x - halfHandle, y: y - halfHandle, width: HANDLE_SIZE, height: HANDLE_SIZE },
            tr: { x: x + width - halfHandle, y: y - halfHandle, width: HANDLE_SIZE, height: HANDLE_SIZE },
            bl: { x: x - halfHandle, y: y + height - halfHandle, width: HANDLE_SIZE, height: HANDLE_SIZE },
            br: { x: x + width - halfHandle, y: y + height - halfHandle, width: HANDLE_SIZE, height: HANDLE_SIZE },
        };
    };
    
    const getRotationHandle = (shape: PlacedShape): Point & { radius: number } => {
        const centerX = shape.x + shape.width / 2;
        const centerY = shape.y + shape.height / 2;
        const handleX = centerX + Math.sin(shape.rotation) * (shape.height / 2 + ROTATION_HANDLE_OFFSET);
        const handleY = centerY - Math.cos(shape.rotation) * (shape.height / 2 + ROTATION_HANDLE_OFFSET);
        return { x: handleX, y: handleY, radius: HANDLE_SIZE / 1.5 };
    };

    const getHandleAtPoint = (point: Point, shape: PlacedShape): Handle | null => {
        // Transform point into shape's local coordinate system
        const centerX = shape.x + shape.width / 2;
        const centerY = shape.y + shape.height / 2;
        const dx = point.x - centerX;
        const dy = point.y - centerY;
        const localX = dx * Math.cos(-shape.rotation) - dy * Math.sin(-shape.rotation);
        const localY = dx * Math.sin(-shape.rotation) + dy * Math.cos(-shape.rotation);

        const halfW = shape.width / 2;
        const halfH = shape.height / 2;
        const handleSize = HANDLE_SIZE / 2;
        
        // Check resize handles in local space
        if (localX >= -halfW-handleSize && localX <= -halfW+handleSize && localY >= -halfH-handleSize && localY <= -halfH+handleSize) return 'tl';
        if (localX >= halfW-handleSize && localX <= halfW+handleSize && localY >= -halfH-handleSize && localY <= -halfH+handleSize) return 'tr';
        if (localX >= -halfW-handleSize && localX <= -halfW+handleSize && localY >= halfH-handleSize && localY <= halfH+handleSize) return 'bl';
        if (localX >= halfW-handleSize && localX <= halfW+handleSize && localY >= halfH-handleSize && localY <= halfH+handleSize) return 'br';
        
        // Check rotation handle (no need for local space transform)
        const rotHandle = getRotationHandle(shape);
        const distToRot = Math.sqrt((point.x - rotHandle.x)**2 + (point.y - rotHandle.y)**2);
        if (distToRot <= rotHandle.radius) return 'rotate';

        return null;
    };
    
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!imageSrc || e.button !== 0) return;
      const pos = getCanvasPosFromEvent(e);
      if (!pos) return;
      
      if (editMode === EditMode.CROP) {
        interaction.current = { mode: 'cropping', startPoint: pos };
        setCropRect(null);
        setCropRectActive(false);
        redrawInteractionCanvas();
        return;
      }
      
      if (editMode === EditMode.SKETCH) {
          const selectedShape = placedShapes.find(s => s.id === selectedShapeId);
          if (selectedShape) {
              const handle = getHandleAtPoint(pos, selectedShape);
              if (handle) {
                  const shapeCenter = { x: selectedShape.x + selectedShape.width / 2, y: selectedShape.y + selectedShape.height / 2 };
                  if (handle === 'rotate') {
                      interaction.current = { 
                          mode: 'rotating', 
                          startPoint: pos, 
                          originalShape: selectedShape,
                          shapeCenter,
                          startAngle: Math.atan2(pos.y - shapeCenter.y, pos.x - shapeCenter.x)
                      };
                  } else {
                      interaction.current = { mode: 'resizing', startPoint: pos, handle, originalShape: selectedShape };
                  }
                  return;
              }
          }
          
          // Check for moving a shape (check in reverse to get topmost)
          for (let i = placedShapes.length - 1; i >= 0; i--) {
              const shape = placedShapes[i];
              if (pos.x >= shape.x && pos.x <= shape.x + shape.width &&
                  pos.y >= shape.y && pos.y <= shape.y + shape.height) {
                  onSelectShape(shape.id);
                  interaction.current = { mode: 'moving', startPoint: pos, shapeStart: shape };
                  return;
              }
          }
      }

      // If no shape interaction, start drawing
      onSelectShape(null);
      const strokeId = `stroke_${Date.now()}`;
      const newStroke: Stroke = {
          id: strokeId,
          points: [pos],
          color: brushColor,
          size: brushSize,
      };
      interaction.current = { mode: 'drawing', currentStroke: newStroke };
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getCanvasPosFromEvent(e);
      setCanvasCursorPos(pos);
      handleCursorMove(e);
      
      if (!pos) return;
      
      const { mode } = interaction.current;
      if (mode === 'idle') return;

      if (mode === 'drawing' && interaction.current.currentStroke) {
          const ctx = getCanvasContext(interactionCanvasRef);
          if (!ctx) return;
          const currentPoints = interaction.current.currentStroke.points;
          const lastPoint = currentPoints[currentPoints.length - 1];
          drawStroke(ctx, { ...interaction.current.currentStroke, points: [lastPoint, pos] });
          currentPoints.push(pos);
      } else if (mode === 'cropping' && interaction.current.startPoint) {
          const start = interaction.current.startPoint;
          const x = Math.min(pos.x, start.x);
          const y = Math.min(pos.y, start.y);
          const width = Math.abs(pos.x - start.x);
          const height = Math.abs(pos.y - start.y);
          drawCropRectangle({ x, y, width, height });
      } else if (mode === 'moving' && interaction.current.startPoint && interaction.current.shapeStart) {
          const { startPoint, shapeStart } = interaction.current;
          onUpdateShape(shapeStart.id, {
              x: shapeStart.x + (pos.x - startPoint.x),
              y: shapeStart.y + (pos.y - startPoint.y),
          });
      } else if (mode === 'resizing' && interaction.current.startPoint && interaction.current.originalShape && interaction.current.handle) {
          const { originalShape, handle } = interaction.current;
          const dx = pos.x - interaction.current.startPoint.x;
          const dy = pos.y - interaction.current.startPoint.y;
          
          let { x, y, width, height } = originalShape;
          const aspectRatio = originalShape.width / originalShape.height;

          switch (handle) {
              case 'br': width += dx; height = width / aspectRatio; break;
              case 'bl': width -= dx; height = width / aspectRatio; x += dx; break;
              case 'tr': width += dx; height = width / aspectRatio; y -= (height - originalShape.height); break;
              case 'tl': width -= dx; height = width / aspectRatio; x += dx; y -= (height - originalShape.height); break;
          }
          if (width > MIN_SHAPE_SIZE && height > MIN_SHAPE_SIZE) {
            onUpdateShape(originalShape.id, { x, y, width, height });
          }
      } else if (mode === 'rotating' && interaction.current.shapeCenter && interaction.current.startAngle && interaction.current.originalShape) {
          const { shapeCenter, startAngle, originalShape } = interaction.current;
          const currentAngle = Math.atan2(pos.y - shapeCenter.y, pos.x - shapeCenter.x);
          const angleDelta = currentAngle - startAngle;
          onUpdateShape(originalShape.id, { rotation: originalShape.rotation + angleDelta });
      }
    };

    const handleMouseUp = () => {
        const { mode } = interaction.current;

        if (mode === 'drawing' && interaction.current.currentStroke && interaction.current.currentStroke.points.length > 1) {
            onAddStroke(interaction.current.currentStroke);
        } else if (mode === 'cropping' && interaction.current.startPoint) {
            const endPoint = canvasCursorPos;
            if (endPoint) {
                const start = interaction.current.startPoint;
                const width = Math.abs(endPoint.x - start.x);
                const height = Math.abs(endPoint.y - start.y);

                if (width > 10 && height > 10) {
                    const rect = { x: Math.min(endPoint.x, start.x), y: Math.min(endPoint.y, start.y), width, height };
                    setCropRect(rect);
                    setCropRectActive(true);
                    // Draw the rectangle immediately to give the user feedback. The re-render triggered
                    // by setCropRect will make it persist correctly via the useEffect hook.
                    drawCropRectangle(rect);
                    // Exit early to prevent the final redraw from clearing the just-drawn rectangle
                    // due to stale state.
                    interaction.current = { mode: 'idle' };
                    return;
                }
            }
        }

        interaction.current = { mode: 'idle' };
        // Redraw for all other cases, e.g., to clear an invalid (too small) crop selection
        // or to finalize a drawing stroke.
        redrawInteractionCanvas();
    };

    const handleCursorMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = interactionCanvasRef.current;
        const container = canvas?.parentElement;
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        setCursorPos({ x: e.clientX - containerRect.left, y: e.clientY - containerRect.top });
    };

    const handleMouseEnter = () => setIsMouseOver(true);
    const handleMouseLeave = () => {
        setIsMouseOver(false);
        setCanvasCursorPos(null);
        if (interaction.current.mode !== 'idle') handleMouseUp();
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        if (editMode === EditMode.SKETCH) e.preventDefault();
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        if (editMode !== EditMode.SKETCH) return;
        e.preventDefault();
    
        const dataUrl = e.dataTransfer.getData('text/plain');
        const pos = getCanvasPosFromEvent(e);
        const canvas = mainCanvasRef.current;
    
        if (dataUrl && pos && canvas) {
            const img = new Image();
            img.onload = () => {
                const aspectRatio = img.width / img.height;
                const dropWidth = Math.min(img.width, canvas.width * 0.25); // Drop at 25% of canvas width
                const dropHeight = dropWidth / aspectRatio;
                onAddShape({
                    dataUrl,
                    x: pos.x - dropWidth / 2,
                    y: pos.y - dropHeight / 2,
                    width: dropWidth,
                    height: dropHeight,
                });
            };
            img.src = dataUrl;
        }
    };

    const showBrushCursor = isMouseOver && imageSrc && !isLoading && cursorPos && (editMode === EditMode.MASK || (editMode === EditMode.SKETCH && interaction.current.mode === 'drawing'));
    
    const getCanvasCursorStyle = () => {
        if (!imageSrc || isLoading) return 'default';
        if (isMouseOver && editMode === EditMode.SKETCH && canvasCursorPos) {
            const selectedShape = placedShapes.find(s => s.id === selectedShapeId);
            if (selectedShape) {
                const handle = getHandleAtPoint(canvasCursorPos, selectedShape);
                if (handle) {
                    if (handle === 'rotate') return 'grab';
                    if (handle === 'tl' || handle === 'br') return 'nwse-resize';
                    if (handle === 'tr' || handle === 'bl') return 'nesw-resize';
                }
                if (canvasCursorPos.x >= selectedShape.x && canvasCursorPos.x <= selectedShape.x + selectedShape.width &&
                    canvasCursorPos.y >= selectedShape.y && canvasCursorPos.y <= selectedShape.y + selectedShape.height) {
                    return 'move';
                }
            }
        }
        if (showBrushCursor) return 'none';
        switch(editMode) {
            case EditMode.CROP: return 'crosshair';
            case EditMode.MASK: return 'none';
            case EditMode.SKETCH: return 'crosshair';
            default: return 'default';
        }
    }

    const combinedFilter = activeFilters.join(' ');

    return (
      <div 
        className="w-full h-full bg-base-200 rounded-lg flex items-center justify-center relative overflow-hidden border-2 border-base-300"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {!imageSrc && !isLoading && (
            <div className="text-center text-text-secondary p-4">
                <p className="text-lg font-semibold text-text-primary">Your Masterpiece Awaits</p>
                <p className="mb-4">Use the 'Generate' tab to begin, or start by editing your own photo.</p>
                <button
                  onClick={onUploadClick}
                  className="bg-brand-primary hover:bg-brand-primary/80 text-white font-bold py-2 px-4 rounded-md transition duration-200 flex items-center justify-center gap-2 mx-auto"
                >
                  <UploadIcon /> Upload an Image
                </button>
            </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-30">
            <Loader />
            <p className="text-lg font-semibold mt-4 text-white animate-pulse-fast">{loadingMessage}</p>
          </div>
        )}
        {showBrushCursor && (
            <div
                style={{
                    position: 'absolute', left: `${cursorPos?.x}px`, top: `${cursorPos?.y}px`,
                    width: `${brushSize}px`, height: `${brushSize}px`, borderRadius: '50%',
                    backgroundColor: editMode === EditMode.MASK ? MASK_COLOR : brushColor,
                    border: '1px solid rgba(120,120,120,0.7)',
                    opacity: 0.7, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 30,
                }}
            />
        )}
        {imageSrc && (
          <>
            <canvas ref={mainCanvasRef} style={{ filter: combinedFilter || 'none', position: 'absolute' }} className="max-w-full max-h-full object-contain" />
            <canvas
                ref={interactionCanvasRef}
                style={{ position: 'absolute', zIndex: 20, cursor: getCanvasCursorStyle() }}
                className="max-w-full max-h-full object-contain"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            />
          </>
        )}
      </div>
    );
  }
);

ImageCanvas.displayName = "ImageCanvas";
