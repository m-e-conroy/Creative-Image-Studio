import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { EditMode } from '../types';
import { Loader } from './Loader';
import { DownloadIcon, UploadIcon } from './Icons';

interface ImageCanvasProps {
  imageSrc: string | null;
  isLoading: boolean;
  loadingMessage: string;
  editMode: EditMode;
  brushSize: number;
  brushColor: string;
  activeFilter: string;
  onDownload: () => void;
  onUploadClick: () => void;
  setCropRectActive: (isActive: boolean) => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageCanvasMethods {
  getCanvasData: () => { data: string; mimeType: string; };
  getExpandedCanvasData: (direction: 'up' | 'down' | 'left' | 'right') => { data: string; mimeType: string; };
  getCanvasAsDataURL: () => string;
  clearDrawing: () => void;
  applyCrop: () => string | null;
  clearCropSelection: () => void;
}

export const ImageCanvas = forwardRef<ImageCanvasMethods, ImageCanvasProps>(
  ({ imageSrc, isLoading, loadingMessage, editMode, brushSize, brushColor, activeFilter, onDownload, onUploadClick, setCropRectActive }, ref) => {
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const interactionCanvasRef = useRef<HTMLCanvasElement>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
    const [isMouseOver, setIsMouseOver] = useState(false);

    // Cropping state
    const [cropRect, setCropRect] = useState<Rect | null>(null);
    const cropStartPos = useRef<{ x: number, y: number } | null>(null);

    const MASK_COLOR = 'rgba(79, 70, 229, 0.5)';

    const getMainCanvasContext = useCallback(() => {
        const canvas = mainCanvasRef.current;
        return canvas ? canvas.getContext('2d') : null;
    }, []);

    const getInteractionCanvasContext = useCallback(() => {
        const canvas = interactionCanvasRef.current;
        return canvas ? canvas.getContext('2d') : null;
    }, []);

    const clearMainCanvas = useCallback(() => {
      const ctx = getMainCanvasContext();
      if (ctx && mainCanvasRef.current) {
        ctx.clearRect(0, 0, mainCanvasRef.current.width, mainCanvasRef.current.height);
      }
    }, [getMainCanvasContext]);

    const clearInteractionCanvas = useCallback(() => {
      const ctx = getInteractionCanvasContext();
      if (ctx && interactionCanvasRef.current) {
        ctx.clearRect(0, 0, interactionCanvasRef.current.width, interactionCanvasRef.current.height);
      }
    }, [getInteractionCanvasContext]);

    const drawImage = useCallback((src: string) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        img.onload = () => {
            const mainCanvas = mainCanvasRef.current;
            const interactionCanvas = interactionCanvasRef.current;
            const mainCtx = getMainCanvasContext();
            if (mainCanvas && interactionCanvas && mainCtx) {
                // Set both canvas sizes to match image
                mainCanvas.width = img.naturalWidth;
                mainCanvas.height = img.naturalHeight;
                interactionCanvas.width = img.naturalWidth;
                interactionCanvas.height = img.naturalHeight;

                clearMainCanvas();
                clearInteractionCanvas();
                mainCtx.drawImage(img, 0, 0);
            }
        };
        img.onerror = () => {
            console.error("Failed to load image for canvas.");
        };
    }, [clearMainCanvas, clearInteractionCanvas, getMainCanvasContext]);
    
    useEffect(() => {
        if (imageSrc) {
            drawImage(imageSrc);
            setCropRect(null);
            setCropRectActive(false);
        } else {
            clearMainCanvas();
            clearInteractionCanvas();
        }
    }, [imageSrc, drawImage, clearMainCanvas, clearInteractionCanvas, setCropRectActive]);

    const drawCropRectangle = useCallback((rect: Rect) => {
      const ctx = getInteractionCanvasContext();
      if (!ctx) return;
      clearInteractionCanvas();
      
      // Dimmed overlay outside the rectangle
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      
      // Clear the inside of the rectangle
      ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
      
      // Draw border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }, [clearInteractionCanvas, getInteractionCanvasContext]);

    useImperativeHandle(ref, () => ({
      getCanvasData: () => {
        const mainCanvas = mainCanvasRef.current;
        const interactionCanvas = interactionCanvasRef.current;
        if (!mainCanvas || !interactionCanvas) return { data: '', mimeType: '' };

        // Create a temporary canvas to merge main and interaction layers
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = mainCanvas.width;
        tempCanvas.height = mainCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(mainCanvas, 0, 0);
          tempCtx.drawImage(interactionCanvas, 0, 0);
          return { data: tempCanvas.toDataURL('image/png').split(',')[1], mimeType: 'image/png' };
        }
        return { data: '', mimeType: '' };
      },
      getExpandedCanvasData: (direction: 'up' | 'down' | 'left' | 'right') => {
        const originalCanvas = mainCanvasRef.current;
        if (!originalCanvas) return { data: '', mimeType: '' };

        const EXPANSION_AMOUNT = Math.round(Math.min(originalCanvas.width, originalCanvas.height) * 0.5); // Expand by 50% of the smaller dimension

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return { data: '', mimeType: '' };

        let newWidth = originalCanvas.width;
        let newHeight = originalCanvas.height;
        let drawX = 0;
        let drawY = 0;

        switch (direction) {
          case 'up':
            newHeight += EXPANSION_AMOUNT;
            drawY = EXPANSION_AMOUNT;
            break;
          case 'down':
            newHeight += EXPANSION_AMOUNT;
            drawY = 0;
            break;
          case 'left':
            newWidth += EXPANSION_AMOUNT;
            drawX = EXPANSION_AMOUNT;
            break;
          case 'right':
            newWidth += EXPANSION_AMOUNT;
            drawX = 0;
            break;
        }
        
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        tempCtx.drawImage(originalCanvas, drawX, drawY);

        return { data: tempCanvas.toDataURL('image/png').split(',')[1], mimeType: 'image/png' };
      },
      getCanvasAsDataURL: () => {
        const originalCanvas = mainCanvasRef.current;
        if (!originalCanvas) return '';

        if (!activeFilter || activeFilter === 'none') {
          return originalCanvas.toDataURL('image/png');
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalCanvas.width;
        tempCanvas.height = originalCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          tempCtx.filter = activeFilter;
          tempCtx.drawImage(originalCanvas, 0, 0);
          return tempCanvas.toDataURL('image/png');
        }
        return originalCanvas.toDataURL('image/png');
      },
      clearDrawing: () => {
        clearInteractionCanvas();
      },
      applyCrop: () => {
        const canvas = mainCanvasRef.current;
        if (!canvas || !cropRect || cropRect.width <= 0 || cropRect.height <= 0) return null;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cropRect.width;
        tempCanvas.height = cropRect.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(
            canvas,
            cropRect.x,
            cropRect.y,
            cropRect.width,
            cropRect.height,
            0,
            0,
            cropRect.width,
            cropRect.height
          );
          return tempCanvas.toDataURL('image/png');
        }
        return null;
      },
      clearCropSelection: () => {
        setCropRect(null);
        setCropRectActive(false);
        clearInteractionCanvas();
      }
    }));
    
    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
        const canvas = interactionCanvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left) * (canvas.width / rect.width),
          y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getMousePos(e);
      if (pos) {
          setIsDrawing(true);
          lastPos.current = pos;
      }
    }, []);

    const stopDrawing = useCallback(() => {
        setIsDrawing(false);
        lastPos.current = null;
    }, []);

    const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const ctx = getInteractionCanvasContext();
        const pos = getMousePos(e);
        if (ctx && pos && lastPos.current) {
            ctx.beginPath();
            ctx.strokeStyle = editMode === EditMode.MASK ? MASK_COLOR : brushColor;
            ctx.fillStyle = editMode === EditMode.MASK ? MASK_COLOR : brushColor;
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
            ctx.fill();
            lastPos.current = pos;
        }
    }, [isDrawing, getInteractionCanvasContext, editMode, brushColor, brushSize]);

    const startCrop = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getMousePos(e);
        if (pos) {
            setIsDrawing(true);
            cropStartPos.current = pos;
            setCropRect(null);
            setCropRectActive(false);
            clearInteractionCanvas();
        }
    }, [clearInteractionCanvas, setCropRectActive]);
    
    const doCrop = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !cropStartPos.current) return;
        const pos = getMousePos(e);
        if (pos) {
            const x = Math.min(pos.x, cropStartPos.current.x);
            const y = Math.min(pos.y, cropStartPos.current.y);
            const width = Math.abs(pos.x - cropStartPos.current.x);
            const height = Math.abs(pos.y - cropStartPos.current.y);
            drawCropRectangle({ x, y, width, height });
        }
    }, [isDrawing, drawCropRectangle]);
    
    const endCrop = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !cropStartPos.current) return;
        setIsDrawing(false);
        const pos = getMousePos(e);
        if (pos) {
            const x = Math.min(pos.x, cropStartPos.current.x);
            const y = Math.min(pos.y, cropStartPos.current.y);
            const width = Math.abs(pos.x - cropStartPos.current.x);
            const height = Math.abs(pos.y - cropStartPos.current.y);
            
            if (width > 10 && height > 10) {
                const finalRect = { x, y, width, height };
                setCropRect(finalRect);
                setCropRectActive(true);
                drawCropRectangle(finalRect);
            } else {
                setCropRect(null);
                setCropRectActive(false);
                clearInteractionCanvas();
            }
        }
        cropStartPos.current = null;
    }, [isDrawing, setCropRectActive, drawCropRectangle, clearInteractionCanvas]);
    
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!imageSrc) return;
      if (editMode === EditMode.CROP) startCrop(e);
      else if (editMode === EditMode.MASK || editMode === EditMode.SKETCH) startDrawing(e);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!imageSrc) return;
      if (editMode === EditMode.CROP) doCrop(e);
      else if (editMode === EditMode.MASK || editMode === EditMode.SKETCH) draw(e);
      
      handleCursorMove(e);
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!imageSrc) return;
      if (editMode === EditMode.CROP) endCrop(e);
      else if (editMode === EditMode.MASK || editMode === EditMode.SKETCH) stopDrawing();
    };


    const getContrastingBorderColor = (hexcolor: string): string => {
        if (hexcolor.startsWith('#')) hexcolor = hexcolor.slice(1);
        if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(char => char + char).join('');
        const r = parseInt(hexcolor.substring(0, 2), 16);
        const g = parseInt(hexcolor.substring(2, 4), 16);
        const b = parseInt(hexcolor.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)';
    };

    const handleCursorMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = interactionCanvasRef.current;
        if (!canvas) return;
        const container = canvas.parentElement;
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        
        setCursorPos({ 
            x: e.clientX - containerRect.left, 
            y: e.clientY - containerRect.top 
        });
    };

    const handleMouseEnter = () => setIsMouseOver(true);
    
    const handleMouseLeave = () => {
        setIsMouseOver(false);
        setCursorPos(null);
        if (isDrawing && editMode === EditMode.CROP) {
          endCrop({} as React.MouseEvent<HTMLCanvasElement>); // End crop if mouse leaves
        } else {
          stopDrawing();
        }
    };

    const showBrushCursor = isMouseOver && imageSrc && !isLoading && cursorPos && (editMode === EditMode.MASK || editMode === EditMode.SKETCH);
    
    const getCanvasCursorStyle = () => {
        if (!imageSrc || isLoading) return 'cursor-default';
        if (showBrushCursor) return 'cursor-none';
        switch(editMode) {
            case EditMode.CROP: return 'cursor-crosshair';
            case EditMode.MASK:
            case EditMode.SKETCH: return 'cursor-crosshair';
            default: return 'cursor-default';
        }
    }

    return (
      <div className="w-full h-full bg-base-200 rounded-lg flex items-center justify-center relative overflow-hidden border-2 border-base-300">
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
        {(isLoading) && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-30">
            <Loader />
            <p className="text-lg font-semibold mt-4 text-white animate-pulse-fast">{loadingMessage}</p>
          </div>
        )}
        {imageSrc && !isLoading && (
            <button
                onClick={onDownload}
                className="absolute top-3 right-3 z-20 bg-base-200/80 hover:bg-brand-primary text-text-primary hover:text-white p-2 rounded-full transition-colors duration-200"
                aria-label="Download image"
                title="Download image"
            >
                <DownloadIcon />
            </button>
        )}
        {showBrushCursor && (
            <div
                style={{
                    position: 'absolute',
                    left: `${cursorPos.x}px`,
                    top: `${cursorPos.y}px`,
                    width: `${brushSize}px`,
                    height: `${brushSize}px`,
                    borderRadius: '50%',
                    backgroundColor: editMode === EditMode.SKETCH ? brushColor : MASK_COLOR,
                    border: `1px solid ${editMode === EditMode.SKETCH ? getContrastingBorderColor(brushColor) : 'rgba(255, 255, 255, 0.7)'}`,
                    opacity: 0.7,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 30,
                }}
            />
        )}
        <canvas
            ref={mainCanvasRef}
            style={{ 
              filter: activeFilter || 'none',
              position: 'absolute',
            }}
            className="max-w-full max-h-full object-contain"
        />
        <canvas
            ref={interactionCanvasRef}
            style={{ 
              position: 'absolute',
              zIndex: 20,
              cursor: getCanvasCursorStyle(),
            }}
            className="max-w-full max-h-full object-contain"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        />
      </div>
    );
  }
);