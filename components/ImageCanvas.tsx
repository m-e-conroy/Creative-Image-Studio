import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { EditMode } from '../types';
import { Loader } from './Loader';
import { DownloadIcon } from './Icons';

interface ImageCanvasProps {
  imageSrc: string | null;
  isLoading: boolean;
  loadingMessage: string;
  editMode: EditMode;
  brushSize: number;
  brushColor: string;
  activeFilter: string;
  onDownload: () => void;
}

export interface ImageCanvasMethods {
  getCanvasData: () => { data: string; mimeType: string; };
  getCanvasAsDataURL: () => string;
  clearDrawing: () => void;
}

export const ImageCanvas = forwardRef<ImageCanvasMethods, ImageCanvasProps>(
  ({ imageSrc, isLoading, loadingMessage, editMode, brushSize, brushColor, activeFilter, onDownload }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
    const [isMouseOver, setIsMouseOver] = useState(false);

    const MASK_COLOR = 'rgba(79, 70, 229, 0.5)';

    const getCanvasContext = useCallback(() => {
        const canvas = canvasRef.current;
        return canvas ? canvas.getContext('2d') : null;
    }, []);

    const clearCanvas = useCallback(() => {
      const ctx = getCanvasContext();
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }, [getCanvasContext]);

    const drawImage = useCallback((src: string) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        img.onload = () => {
            const canvas = canvasRef.current;
            const ctx = getCanvasContext();
            if (canvas && ctx) {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                clearCanvas();
                ctx.drawImage(img, 0, 0);
            }
        };
        img.onerror = () => {
            console.error("Failed to load image for canvas.");
        };
    }, [clearCanvas, getCanvasContext]);
    
    useEffect(() => {
        if (imageSrc) {
            drawImage(imageSrc);
        } else {
            clearCanvas();
        }
    }, [imageSrc, drawImage, clearCanvas]);

    useImperativeHandle(ref, () => ({
      getCanvasData: () => {
        const canvas = canvasRef.current;
        if (canvas) {
          return { data: canvas.toDataURL('image/png').split(',')[1], mimeType: 'image/png' };
        }
        return { data: '', mimeType: '' };
      },
      getCanvasAsDataURL: () => {
        const originalCanvas = canvasRef.current;
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

        // Fallback to original if context fails
        return originalCanvas.toDataURL('image/png');
      },
      clearDrawing: () => {
        if (imageSrc) {
          drawImage(imageSrc);
        }
      }
    }));
    
    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
        const canvas = canvasRef.current;
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
        const ctx = getCanvasContext();
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
    }, [isDrawing, getCanvasContext, editMode, brushColor, brushSize]);

    const getContrastingBorderColor = (hexcolor: string): string => {
        if (hexcolor.startsWith('#')) {
            hexcolor = hexcolor.slice(1);
        }
        if (hexcolor.length === 3) {
            hexcolor = hexcolor.split('').map(char => char + char).join('');
        }
        const r = parseInt(hexcolor.substring(0, 2), 16);
        const g = parseInt(hexcolor.substring(2, 4), 16);
        const b = parseInt(hexcolor.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)';
    };

    const handleCursorMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
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
        stopDrawing();
    };


    return (
      <div className="w-full h-full bg-base-200 rounded-lg flex items-center justify-center relative overflow-hidden border-2 border-base-300">
        {!imageSrc && !isLoading && (
            <div className="text-center text-text-secondary">
                <p className="text-lg font-semibold">Your masterpiece awaits</p>
                <p>Use the 'Generate' tab to begin.</p>
            </div>
        )}
        {(isLoading) && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
            <Loader />
            <p className="text-lg font-semibold mt-4 text-text-primary animate-pulse-fast">{loadingMessage}</p>
          </div>
        )}
        {imageSrc && !isLoading && (
            <button
                onClick={onDownload}
                className="absolute top-3 right-3 z-10 bg-base-300/80 hover:bg-brand-primary text-text-primary hover:text-white p-2 rounded-full transition-colors duration-200"
                aria-label="Download image"
                title="Download image"
            >
                <DownloadIcon />
            </button>
        )}
        {isMouseOver && imageSrc && !isLoading && cursorPos && (
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
            ref={canvasRef}
            style={{ filter: activeFilter || 'none' }}
            className={`max-w-full max-h-full object-contain transition-all duration-300 ${imageSrc && isMouseOver ? 'cursor-none' : (imageSrc ? 'cursor-crosshair' : 'cursor-default')}`}
            onMouseDown={imageSrc ? startDrawing : undefined}
            onMouseUp={imageSrc ? stopDrawing : undefined}
            onMouseEnter={imageSrc ? handleMouseEnter : undefined}
            onMouseLeave={imageSrc ? handleMouseLeave : undefined}
            onMouseMove={imageSrc ? (e) => { draw(e); handleCursorMove(e); } : undefined}
        />
      </div>
    );
  }
);
