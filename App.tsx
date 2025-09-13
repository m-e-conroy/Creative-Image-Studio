
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ImageCanvas } from './components/ImageCanvas';
import { generateImage, editImage, rewritePrompt, generateRandomPrompt, describeImage, getPromptSuggestions } from './services/geminiService';
import { ImageCanvasMethods } from './components/ImageCanvas';
import { EditMode, ImageStyle, Filter, PromptState, PromptPart, LightingStyle, CompositionRule, ClipArtShape, PlacedShape, Stroke } from './types';
import { INITIAL_STYLES, SUPPORTED_ASPECT_RATIOS, FILTERS, LIGHTING_STYLES, COMPOSITION_RULES, INITIAL_SHAPES } from './constants';
import { LogoIcon } from './components/Icons';
import { ImageGallery } from './components/ImageGallery';
import { ThemeSwitcher } from './components/ThemeSwitcher';

type Tab = 'generate' | 'edit' | 'filters';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<PromptState>({ subject: '', background: '' });
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [outpaintPrompt, setOutpaintPrompt] = useState<string>('photorealistically expand the image to fill the transparent space, continuing the scene seamlessly.');
  const [style, setStyle] = useState<ImageStyle>(INITIAL_STYLES[0]);
  const [lighting, setLighting] = useState<LightingStyle>(LIGHTING_STYLES[0]);
  const [composition, setComposition] = useState<CompositionRule>(COMPOSITION_RULES[0]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [clipArtShapes, setClipArtShapes] = useState<ClipArtShape[]>(INITIAL_SHAPES);
  
  // New state for interactive canvas elements
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [placedShapes, setPlacedShapes] = useState<PlacedShape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);


  const [aspectRatio, setAspectRatio] = useState<string>(SUPPORTED_ASPECT_RATIOS[0].value);
  const [numImages, setNumImages] = useState<number>(1);
  
  const [editMode, setEditMode] = useState<EditMode>(EditMode.MASK);
  const [brushSize, setBrushSize] = useState<number>(40);
  const [brushColor, setBrushColor] = useState<string>('#FFFFFF');
  
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [activeFilter, setActiveFilter] = useState<Filter>(FILTERS[0]);
  const [rewritingPrompt, setRewritingPrompt] = useState<PromptPart | null>(null);
  const [randomizingPrompt, setRandomizingPrompt] = useState<PromptPart | 'edit' | null>(null);
  const [cropRectActive, setCropRectActive] = useState<boolean>(false);

  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [backgroundSuggestions, setBackgroundSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState<PromptPart | null>(null);

  const canvasRef = useRef<ImageCanvasMethods>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUndo = history.length > 1;

  useEffect(() => {
    try {
        const savedShapes = localStorage.getItem('clipArtShapes');
        if (savedShapes) {
            const parsedShapes: ClipArtShape[] = JSON.parse(savedShapes);
            // Combine initial shapes with saved shapes, preventing duplicates by name
            const combined = [...INITIAL_SHAPES];
            const initialNames = new Set(INITIAL_SHAPES.map(s => s.name));
            parsedShapes.forEach(saved => {
                if (!initialNames.has(saved.name)) {
                    combined.push(saved);
                }
            });
            setClipArtShapes(combined);
        }
    } catch (e) {
        console.error("Failed to load saved clip art shapes:", e);
    }
  }, []);
  
  const clearInteractiveState = () => {
    setStrokes([]);
    setPlacedShapes([]);
    setSelectedShapeId(null);
  };
  
  const handleGenerate = useCallback(async () => {
    if (!prompt.subject) {
      setError('Please enter a subject to generate an image.');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('Generating your masterpiece(s)...');
    setError(null);
    setMainImage(null);
    setOriginalImage(null);
    setGeneratedImages([]);
    setActiveTab('generate');
    setHistory([]);
    clearInteractiveState();

    try {
      const promptParts = [
        prompt.subject,
        prompt.background ? `background of ${prompt.background}` : '',
        style.prompt,
        lighting.prompt,
        composition.prompt
      ].filter(Boolean); // Filter out empty strings
      
      const combinedPrompt = promptParts.join(', ');

      const imageB64s = await generateImage(combinedPrompt, { aspectRatio, numberOfImages: numImages });
      if (imageB64s.length === 1) {
        const imageUrl = `data:image/jpeg;base64,${imageB64s[0]}`;
        setMainImage(imageUrl);
        setOriginalImage(imageUrl);
        setHistory([imageUrl]);
        setActiveTab('edit');
      } else {
        const imageUrls = imageB64s.map(b64 => `data:image/jpeg;base64,${b64}`);
        setGeneratedImages(imageUrls);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to generate image. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [prompt, style, aspectRatio, numImages, lighting, composition]);

  const handleRewritePrompt = useCallback(async (part: PromptPart) => {
    const currentPrompt = prompt[part];
    if (!currentPrompt.trim()) return;

    setRewritingPrompt(part);
    setError(null);
    try {
      const rewritten = await rewritePrompt(currentPrompt, part);
      setPrompt(prev => ({ ...prev, [part]: rewritten }));
    } catch (e: any) {
      console.error(e);
      setError(e.message || `Failed to enhance the ${part} prompt. Please try again.`);
    } finally {
      setRewritingPrompt(null);
    }
  }, [prompt]);
  
  const handleGetSuggestions = useCallback(async (part: PromptPart, value: string) => {
      if (!value.trim() || value.length < 4) {
          if (part === 'subject') setSubjectSuggestions([]);
          else setBackgroundSuggestions([]);
          return;
      }
      setSuggestionsLoading(part);
      try {
          const suggestions = await getPromptSuggestions(value, part);
          if (part === 'subject') setSubjectSuggestions(suggestions);
          else setBackgroundSuggestions(suggestions);
      } catch (e: any) {
          console.error("Failed to get suggestions", e);
          setError(e.message || "Failed to fetch prompt suggestions.");
          if (part === 'subject') setSubjectSuggestions([]);
          else setBackgroundSuggestions([]);
      } finally {
          setSuggestionsLoading(null);
      }
  }, []);

  const handleRandomPrompt = useCallback(async (part: PromptPart | 'edit') => {
    setRandomizingPrompt(part);
    setError(null);
    try {
      const randomText = await generateRandomPrompt(part);
      if (part === 'edit') {
        setEditPrompt(randomText);
      } else {
        setPrompt(prev => ({ ...prev, [part]: randomText }));
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || `Failed to generate a random ${part} prompt. Please try again.`);
    } finally {
      setRandomizingPrompt(null);
    }
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    setError(null);
    clearInteractiveState();
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;
      if (!imageUrl) return;

      setMainImage(imageUrl);
      setOriginalImage(imageUrl);
      setHistory([imageUrl]);
      setGeneratedImages([]);
      setActiveTab('edit');
      setIsLoading(true);
      setLoadingMessage('Analyzing your image...');

      try {
        const [meta, data] = imageUrl.split(',');
        const mimeType = meta.split(';')[0].split(':')[1];
        const description = await describeImage(data, mimeType);
        setEditPrompt(description);
      } catch (e: any) {
        console.error(e);
        setError(e.message || 'Failed to analyze the image. Please provide your own edit prompt.');
        setEditPrompt('');
      } finally {
        setIsLoading(false);
        setLoadingMessage('');
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const handlePromptChange = (part: PromptPart, value: string) => {
    setPrompt(prev => ({ ...prev, [part]: value }));
  };

  const handleSelectImage = useCallback((imageUrl: string) => {
    setMainImage(imageUrl);
    setOriginalImage(imageUrl);
    setHistory([imageUrl]);
    setGeneratedImages([]);
    setActiveTab('edit');
    clearInteractiveState();
  }, []);

  const handleEdit = useCallback(async () => {
    if (!editPrompt || !canvasRef.current) {
      setError('Please enter an editing prompt.');
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('Applying creative edits...');
    setError(null);
    
    try {
      const { data, mimeType } = canvasRef.current.getCanvasData();
      
      let finalPrompt = editPrompt;
      if (editMode === EditMode.MASK) {
        finalPrompt = `Following the instruction "${editPrompt}", edit the image only in the masked area.`;
      } else if (editMode === EditMode.SKETCH) {
        finalPrompt = `Using the user's sketch as a guide, ${editPrompt}.`;
      }

      const result = await editImage(data, mimeType, finalPrompt);
      
      if (result.image) {
        const imageUrl = `data:${mimeType};base64,${result.image}`;
        setMainImage(imageUrl);
        setHistory(prev => [...prev, imageUrl]);
        if (canvasRef.current) {
          canvasRef.current.clearDrawing();
        }
        clearInteractiveState();
      } else {
         setError(result.text || 'The model did not return an image. Try a different prompt.');
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to edit image. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [editPrompt, editMode]);

  const handleOutpaint = useCallback(async (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!canvasRef.current) return;
    
    setIsLoading(true);
    setLoadingMessage('Expanding the scene...');
    setError(null);
    
    try {
      const { data, mimeType } = canvasRef.current.getExpandedCanvasData(direction);
      const result = await editImage(data, mimeType, outpaintPrompt);
      
      if (result.image) {
        const imageUrl = `data:${mimeType};base64,${result.image}`;
        setMainImage(imageUrl);
        setHistory(prev => [...prev, imageUrl]);
        clearInteractiveState();
      } else {
         setError(result.text || 'The model could not expand the image. Please try again.');
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to expand image. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [outpaintPrompt]);

  const handleCrop = useCallback(async () => {
    if (!canvasRef.current || !cropRectActive) return;

    setIsLoading(true);
    setLoadingMessage('Cropping image...');
    setError(null);

    try {
      const croppedDataUrl = canvasRef.current.applyCrop();
      if (croppedDataUrl) {
        setMainImage(croppedDataUrl);
        setHistory(prev => [...prev, croppedDataUrl]);
        clearInteractiveState();
      } else {
        throw new Error("Cropping failed to return image data.");
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to crop image.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      setCropRectActive(false);
    }
  }, [cropRectActive]);

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    
    const newHistory = [...history];
    newHistory.pop();
    const previousImage = newHistory[newHistory.length - 1];
    
    setHistory(newHistory);
    setMainImage(previousImage);
    
    if (canvasRef.current) {
      canvasRef.current.clearDrawing();
      canvasRef.current.clearCropSelection();
    }
    clearInteractiveState();
  }, [history, canUndo]);

  const clearCanvas = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.clearDrawing();
      canvasRef.current.clearCropSelection();
    }
    clearInteractiveState();
  }, []);

  const resetImage = useCallback(() => {
    setMainImage(originalImage);
    setHistory(originalImage ? [originalImage] : []);
    setEditPrompt('');
    setActiveFilter(FILTERS[0]);
    if (canvasRef.current) {
      canvasRef.current.clearDrawing();
      canvasRef.current.clearCropSelection();
    }
    clearInteractiveState();
  }, [originalImage]);

  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.getCanvasAsDataURL();
    if (dataUrl) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `creative-studio-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);
  
  const handleSaveShape = useCallback((name: string) => {
      if (!name.trim() || !canvasRef.current) return;

      const dataUrl = canvasRef.current.getDrawingAsDataURL(strokes);
      if (!dataUrl) {
        setError("There's nothing on the canvas to save.");
        return;
      }

      setError(null);
      const newShape: ClipArtShape = { name, dataUrl };
      
      setClipArtShapes(prevShapes => {
          const newShapes = [...prevShapes, newShape];
          try {
              const userShapes = newShapes.filter(s => !INITIAL_SHAPES.some(is => is.name === s.name));
              localStorage.setItem('clipArtShapes', JSON.stringify(userShapes));
          } catch(e) {
              console.error("Failed to save clip art shapes to local storage:", e);
              setError("Could not save shape. Your browser's storage might be full.");
          }
          return newShapes;
      });
      setStrokes([]);
  }, [strokes]);

  // Handlers for interactive shapes and strokes
  const handleAddStroke = useCallback((stroke: Stroke) => {
    setStrokes(prev => [...prev, stroke]);
  }, []);

  const handleAddShape = useCallback((shape: Omit<PlacedShape, 'id' | 'rotation' | 'color'>) => {
    const newShape: PlacedShape = {
        id: `shape_${Date.now()}_${Math.random()}`,
        ...shape,
        rotation: 0,
        color: brushColor,
    };
    setPlacedShapes(prev => [...prev, newShape]);
    setSelectedShapeId(newShape.id);
  }, [brushColor]);

  const handleUpdateShape = useCallback((id: string, updates: Partial<Omit<PlacedShape, 'id'>>) => {
    setPlacedShapes(prev => prev.map(shape => 
        shape.id === id ? { ...shape, ...updates } : shape
    ));
  }, []);

  const handleSelectShape = useCallback((id: string | null) => {
    setSelectedShapeId(id);
  }, []);

  const handleDeleteSelectedShape = useCallback(() => {
    if (!selectedShapeId) return;
    setPlacedShapes(prev => prev.filter(shape => shape.id !== selectedShapeId));
    setSelectedShapeId(null);
  }, [selectedShapeId]);

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />
      <div className="min-h-screen bg-base-100 flex flex-col md:flex-row font-sans">
        <header className="md:hidden flex items-center justify-between p-4 bg-base-200 border-b border-base-300">
            <div className="flex items-center space-x-2">
              <LogoIcon />
              <h1 className="text-xl font-bold text-text-primary">Creative Image Studio</h1>
            </div>
            <ThemeSwitcher />
        </header>
        <aside className="w-full md:w-[400px] lg:w-[450px] bg-base-200 p-6 flex-shrink-0 flex flex-col space-y-6 max-h-screen overflow-y-auto">
          <div className="hidden md:flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <LogoIcon />
                <h1 className="text-2xl font-bold text-text-primary">Creative Image Studio</h1>
              </div>
              <ThemeSwitcher />
          </div>
          <ControlPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            prompt={prompt}
            onPromptChange={handlePromptChange}
            onRewritePrompt={handleRewritePrompt}
            rewritingPrompt={rewritingPrompt}
            onRandomPrompt={handleRandomPrompt}
            randomizingPrompt={randomizingPrompt}
            onGetSuggestions={handleGetSuggestions}
            subjectSuggestions={subjectSuggestions}
            backgroundSuggestions={backgroundSuggestions}
            suggestionsLoading={suggestionsLoading}
            editPrompt={editPrompt}
            setEditPrompt={setEditPrompt}
            style={style}
            setStyle={setStyle}
            lighting={lighting}
            setLighting={setLighting}
            composition={composition}
            setComposition={setComposition}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            numImages={numImages}
            setNumImages={setNumImages}
            onGenerate={handleGenerate}
            onEdit={handleEdit}
            onOutpaint={handleOutpaint}
            outpaintPrompt={outpaintPrompt}
            setOutpaintPrompt={setOutpaintPrompt}
            onCrop={handleCrop}
            cropRectActive={cropRectActive}
            onUploadClick={handleUploadClick}
            isLoading={isLoading}
            hasImage={!!mainImage}
            editMode={editMode}
            setEditMode={setEditMode}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            brushColor={brushColor}
            setBrushColor={setBrushColor}
            onClear={clearCanvas}
            onReset={resetImage}
            onUndo={handleUndo}
            canUndo={canUndo}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            clipArtShapes={clipArtShapes}
            onSaveShape={handleSaveShape}
            placedShapes={placedShapes}
            selectedShapeId={selectedShapeId}
            onUpdateShape={handleUpdateShape}
            onDeleteSelectedShape={handleDeleteSelectedShape}
          />
          {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md text-sm">
                  <p className="font-semibold">Error</p>
                  <p>{error}</p>
              </div>
          )}
        </aside>
        <main className="flex-1 flex items-center justify-center p-6 bg-base-100/50">
          <div className="w-full h-full max-w-[800px] max-h-[800px] flex items-center justify-center">
            {generatedImages.length > 0 ? (
              <ImageGallery images={generatedImages} onSelectImage={handleSelectImage} />
            ) : (
              <ImageCanvas
                ref={canvasRef}
                imageSrc={mainImage}
                isLoading={isLoading}
                loadingMessage={loadingMessage}
                editMode={editMode}
                brushSize={brushSize}
                brushColor={brushColor}
                activeFilter={activeFilter.value}
                onDownload={handleDownload}
                onUploadClick={handleUploadClick}
                setCropRectActive={setCropRectActive}
                strokes={strokes}
                placedShapes={placedShapes}
                selectedShapeId={selectedShapeId}
                onAddStroke={handleAddStroke}
                onAddShape={handleAddShape}
                onUpdateShape={handleUpdateShape}
                onSelectShape={handleSelectShape}
              />
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default App;