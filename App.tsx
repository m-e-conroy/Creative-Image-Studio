import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ImageCanvas } from './components/ImageCanvas';
import { generateImage, editImage, rewritePrompt, generateRandomPrompt, describeImage, getPromptSuggestions } from './services/geminiService';
import { ImageCanvasMethods } from './components/ImageCanvas';
import { EditMode, ImageStyle, Filter, PromptState, PromptPart, LightingStyle, CompositionRule, ClipArtShape, PlacedShape, Stroke, ClipArtCategory, TechnicalModifier, ImageAdjustments, Layer, LayerType } from './types';
import { INITIAL_STYLES, SUPPORTED_ASPECT_RATIOS, FILTERS, LIGHTING_STYLES, COMPOSITION_RULES, CLIP_ART_CATEGORIES, TECHNICAL_MODIFIERS } from './constants';
import { DownloadIcon, SettingsIcon } from './components/Icons';
import { ImageGallery } from './components/ImageGallery';

type Tab = 'generate' | 'edit' | 'filters' | 'settings';

const findDefault = <T extends { name: string }>(arr: T[], name: string): T => arr.find(item => item.name === name) || arr[0];

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<PromptState>({ subject: '', background: '' });
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [outpaintPrompt, setOutpaintPrompt] = useState<string>('Extend the scene seamlessly, matching the original image\'s style and lighting.');
  const [outpaintAmount, setOutpaintAmount] = useState<number>(50);
  
  const [style, setStyle] = useState<ImageStyle>(() => findDefault(INITIAL_STYLES, "None"));
  const [lighting, setLighting] = useState<LightingStyle>(() => findDefault(LIGHTING_STYLES, "Default"));
  const [composition, setComposition] = useState<CompositionRule>(() => findDefault(COMPOSITION_RULES, "Default"));
  const [technicalModifier, setTechnicalModifier] = useState<TechnicalModifier>(() => findDefault(TECHNICAL_MODIFIERS, "Default"));

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);
  
  const [clipArtCategories, setClipArtCategories] = useState<ClipArtCategory[]>(CLIP_ART_CATEGORIES);
  const [selectedClipArtCategoryName, setSelectedClipArtCategoryName] = useState<string>(CLIP_ART_CATEGORIES[0].name);

  // New Layer-based state
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [history, setHistory] = useState<Layer[][]>([]);

  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  
  const [aspectRatio, setAspectRatio] = useState<string>(SUPPORTED_ASPECT_RATIOS[0].value);
  const [numImages, setNumImages] = useState<number>(1);
  
  const [editMode, setEditMode] = useState<EditMode>(EditMode.MASK);
  const [brushSize, setBrushSize] = useState<number>(40);
  const [brushColor, setBrushColor] = useState<string>('#FFFFFF');
  
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [activeFilters, setActiveFilters] = useState<Filter[]>([FILTERS[0]]);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({ brightness: 100, contrast: 100, red: 100, green: 100, blue: 100 });
  const [rewritingPrompt, setRewritingPrompt] = useState<PromptPart | null>(null);
  const [randomizingPrompt, setRandomizingPrompt] = useState<PromptPart | 'edit' | null>(null);
  const [cropRectActive, setCropRectActive] = useState<boolean>(false);

  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [backgroundSuggestions, setBackgroundSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState<PromptPart | null>(null);

  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const canvasRef = useRef<ImageCanvasMethods>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUndo = history.length > 1;
  const hasImage = layers.length > 0;

  useEffect(() => {
    // Custom Clip Art loading logic (unchanged)
    const categories = [...CLIP_ART_CATEGORIES];
    let customShapes: ClipArtShape[] = [];
    try {
      const savedShapesJSON = localStorage.getItem('userClipArtShapes');
      if (savedShapesJSON) customShapes = JSON.parse(savedShapesJSON);
    } catch (e) { console.error("Failed to load user clip art shapes:", e); }
    const hasCustomCategory = categories.some(c => c.name === 'Custom');
    if (customShapes.length > 0 && !hasCustomCategory) {
      categories.push({ name: 'Custom', shapes: customShapes });
      setSelectedClipArtCategoryName('Custom');
    }
    setClipArtCategories(categories);
  }, []);

  const updateHistory = useCallback((newLayers: Layer[]) => {
      setHistory(prev => [...prev, newLayers]);
  }, []);
  
  const handleGenerate = useCallback(async () => {
    if (!prompt.subject) {
      setError('Please enter a subject to generate an image.');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('Generating your masterpiece(s)...');
    setError(null);
    setLayers([]);
    setActiveLayerId(null);
    setGeneratedImages([]);
    setImageDimensions(null);
    setActiveTab('generate');
    setHistory([]);

    try {
      const promptParts = [ prompt.subject, prompt.background ? `background of ${prompt.background}` : '', style.prompt, lighting.prompt, composition.prompt, technicalModifier.prompt ].filter(Boolean);
      const combinedPrompt = promptParts.join(', ');
      const imageB64s = await generateImage(combinedPrompt, { aspectRatio, numberOfImages: numImages });

      if (imageB64s.length === 1) {
        const imageUrl = `data:image/jpeg;base64,${imageB64s[0]}`;
        const newLayer: Layer = { id: `layer_${Date.now()}`, name: 'Background', type: LayerType.IMAGE, src: imageUrl, isVisible: true, opacity: 100 };
        setLayers([newLayer]);
        setActiveLayerId(newLayer.id);
        updateHistory([newLayer]);
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
  }, [prompt, style, aspectRatio, numImages, lighting, composition, technicalModifier]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setGeneratedImages([]);
    setImageDimensions(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;
      if (!imageUrl) return;
      
      const newLayer: Layer = { id: `layer_${Date.now()}`, name: 'Imported Image', type: LayerType.IMAGE, src: imageUrl, isVisible: true, opacity: 100 };
      setLayers([newLayer]);
      setActiveLayerId(newLayer.id);
      updateHistory([newLayer]);
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

  const handleSelectGalleryImage = useCallback((imageUrl: string) => {
    const newLayer: Layer = { id: `layer_${Date.now()}`, name: 'Background', type: LayerType.IMAGE, src: imageUrl, isVisible: true, opacity: 100 };
    setLayers([newLayer]);
    setActiveLayerId(newLayer.id);
    updateHistory([newLayer]);
    setGeneratedImages([]);
    setActiveTab('edit');
    setImageDimensions(null);
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
      // Flatten visible layers to create a base image for editing
      const flatImageData = canvasRef.current.getCanvasAsDataURL(true);
      if (!flatImageData) throw new Error("Could not get canvas data.");

      const [meta, data] = flatImageData.split(',');
      const mimeType = meta.split(';')[0].split(':')[1];
      
      // Get the mask from the active layer
      const maskData = editMode === EditMode.MASK ? canvasRef.current.getMaskData() : undefined;
      
      let finalPrompt = editPrompt;
      if (editMode === EditMode.MASK && maskData) {
        finalPrompt = `Apply the following change ONLY to the masked (white) area of the image: ${editPrompt}. Blend the new content seamlessly with the existing image.`;
      } else if (editMode === EditMode.SKETCH) {
        finalPrompt = `Using the user's drawing and shapes on the top layer as a guide, ${editPrompt}.`;
      }

      const result = await editImage(data, mimeType, finalPrompt, maskData);
      
      if (result.image) {
        const imageUrl = `data:${mimeType};base64,${result.image}`;
        const newLayer: Layer = { id: `layer_${Date.now()}`, name: `Edit: ${editPrompt.substring(0, 15)}...`, type: LayerType.IMAGE, src: imageUrl, isVisible: true, opacity: 100 };
        const newLayers = [...layers, newLayer];
        setLayers(newLayers);
        setActiveLayerId(newLayer.id);
        updateHistory(newLayers);
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
  }, [editPrompt, editMode, layers]);

  const handleOutpaint = useCallback(async (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!canvasRef.current) return;
    setIsLoading(true);
    setLoadingMessage('Expanding the scene...');
    setError(null);
    try {
      const { data, mimeType, maskData } = canvasRef.current.getExpandedCanvasData(direction, outpaintAmount);
      const finalOutpaintPrompt = `The masked (white) area indicates new empty space to be filled. ${outpaintPrompt}`;
      const result = await editImage(data, mimeType, finalOutpaintPrompt, maskData);
      
      if (result.image) {
        const imageUrl = `data:image/png;base64,${result.image}`;
        const newLayer: Layer = { id: `layer_${Date.now()}`, name: `Outpaint ${direction}`, type: LayerType.IMAGE, src: imageUrl, isVisible: true, opacity: 100 };
        const newLayers = [newLayer]; // Start a new composition with the outpainted image
        setLayers(newLayers);
        setActiveLayerId(newLayer.id);
        updateHistory(newLayers);
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
  }, [outpaintPrompt, outpaintAmount]);

  const handleCrop = useCallback(async () => {
    if (!canvasRef.current || !cropRectActive) return;
    setIsLoading(true);
    setLoadingMessage('Cropping image...');
    setError(null);
    try {
      const croppedDataUrl = canvasRef.current.applyCrop();
      if (croppedDataUrl) {
        const newLayer: Layer = { id: `layer_${Date.now()}`, name: 'Cropped Image', type: LayerType.IMAGE, src: croppedDataUrl, isVisible: true, opacity: 100 };
        const newLayers = [newLayer];
        setLayers(newLayers);
        setActiveLayerId(newLayer.id);
        updateHistory(newLayers);
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

  // --- Layer Management ---
  const handleAddLayer = useCallback((type: LayerType) => {
    const newLayer: Layer = {
      id: `layer_${Date.now()}`,
      name: `Layer ${layers.length + 1}`,
      type: type,
      isVisible: true,
      opacity: 100,
      strokes: [],
      placedShapes: [],
    };
    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    setActiveLayerId(newLayer.id);
    updateHistory(newLayers);
  }, [layers]);

  const handleDeleteLayer = useCallback((id: string) => {
    const newLayers = layers.filter(l => l.id !== id);
    if (newLayers.length > 0) {
      setLayers(newLayers);
      // If the active layer was deleted, select the top-most one
      if (activeLayerId === id) {
        setActiveLayerId(newLayers[newLayers.length - 1].id);
      }
      updateHistory(newLayers);
    } else {
      resetImage(); // Reset if last layer is deleted
    }
  }, [layers, activeLayerId]);

  const handleSelectLayer = useCallback((id: string) => {
    setActiveLayerId(id);
  }, []);

  const handleUpdateLayer = useCallback((id: string, updates: Partial<Layer>) => {
    const newLayers = layers.map(l => l.id === id ? { ...l, ...updates } : l);
    setLayers(newLayers);
    updateHistory(newLayers);
  }, [layers]);

  const handleReorderLayers = useCallback((dragId: string, dropId: string) => {
    const dragIndex = layers.findIndex(l => l.id === dragId);
    const dropIndex = layers.findIndex(l => l.id === dropId);
    const newLayers = [...layers];
    const [draggedItem] = newLayers.splice(dragIndex, 1);
    newLayers.splice(dropIndex, 0, draggedItem);
    setLayers(newLayers);
    updateHistory(newLayers);
  }, [layers]);
  
  // --- Undo/Reset ---
  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const newHistory = [...history];
    newHistory.pop(); // Remove current state
    const previousState = newHistory[newHistory.length - 1];
    setHistory(newHistory);
    setLayers(previousState);
    
    // If active layer doesn't exist in previous state, select the new top one
    if (previousState && !previousState.find(l => l.id === activeLayerId)) {
        setActiveLayerId(previousState[previousState.length - 1]?.id || null);
    }
  }, [history, canUndo, activeLayerId]);
  
  const clearCanvas = useCallback(() => {
    if (!activeLayerId) return;
    const newLayers = layers.map(l => {
      if (l.id === activeLayerId && l.type === LayerType.PIXEL) {
        return { ...l, strokes: [], placedShapes: [] };
      }
      return l;
    });
    setLayers(newLayers);
    updateHistory(newLayers);
    setSelectedShapeId(null);
    canvasRef.current?.clearCropSelection();
  }, [layers, activeLayerId]);

  const resetImage = useCallback(() => {
    setLayers([]);
    setActiveLayerId(null);
    setHistory([]);
    setEditPrompt('');
    setActiveFilters([FILTERS[0]]);
    setAdjustments({ brightness: 100, contrast: 100, red: 100, green: 100, blue: 100 });
    setImageDimensions(null);
    setSelectedShapeId(null);
    canvasRef.current?.clearCropSelection();
  }, []);

  // --- Handlers passed to children that modify layer state ---
  const handleAddStroke = useCallback((stroke: Stroke) => {
    if (!activeLayerId) return;
    setLayers(currentLayers => currentLayers.map(l => {
        if (l.id === activeLayerId && l.type === LayerType.PIXEL) {
            return { ...l, strokes: [...(l.strokes || []), stroke] };
        }
        return l;
    }));
  }, [activeLayerId]);

  const handleAddShape = useCallback((shape: Omit<PlacedShape, 'id' | 'rotation' | 'color'>) => {
    if (!activeLayerId) return;
    const newShape: PlacedShape = { id: `shape_${Date.now()}`, ...shape, rotation: 0, color: brushColor };
    const newLayers = layers.map(l => {
        if (l.id === activeLayerId && l.type === LayerType.PIXEL) {
            return { ...l, placedShapes: [...(l.placedShapes || []), newShape] };
        }
        return l;
    });
    setLayers(newLayers);
    updateHistory(newLayers);
    setSelectedShapeId(newShape.id);
  }, [layers, activeLayerId, brushColor]);

  const handleUpdateShape = useCallback((id: string, updates: Partial<Omit<PlacedShape, 'id'>>) => {
    if (!activeLayerId) return;
    const newLayers = layers.map(l => {
      if (l.id === activeLayerId && l.type === LayerType.PIXEL) {
        const updatedShapes = l.placedShapes?.map(s => s.id === id ? { ...s, ...updates } : s);
        return { ...l, placedShapes: updatedShapes };
      }
      return l;
    });
    setLayers(newLayers);
  }, [layers, activeLayerId]);
  
  const handleShapeInteractionEnd = useCallback(() => {
    updateHistory(layers);
  }, [layers]);

  const handleStrokeInteractionEnd = useCallback((completedStroke: Stroke) => {
    if (!activeLayerId) return;
    setLayers(currentLayers => {
        const newLayers = currentLayers.map(l => {
            if (l.id === activeLayerId && l.type === LayerType.PIXEL) {
                const updatedStrokes = l.strokes?.map(s => s.id === completedStroke.id ? completedStroke : s);
                return { ...l, strokes: updatedStrokes };
            }
            return l;
        });
        updateHistory(newLayers);
        return newLayers;
    });
  }, [activeLayerId, updateHistory]);
  
  const handleDeleteSelectedShape = useCallback(() => {
    if (!selectedShapeId || !activeLayerId) return;
    const newLayers = layers.map(l => {
      if (l.id === activeLayerId && l.type === LayerType.PIXEL) {
        return { ...l, placedShapes: l.placedShapes?.filter(s => s.id !== selectedShapeId) };
      }
      return l;
    });
    setLayers(newLayers);
    updateHistory(newLayers);
    setSelectedShapeId(null);
  }, [selectedShapeId, activeLayerId, layers]);


  // --- Other handlers ---
  // (Most of these are unchanged but kept for completeness)
  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleImageUpload(file);
    if (event.target) event.target.value = '';
  };
  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.getCanvasAsDataURL(false);
    if (dataUrl) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `creative-studio-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);
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
    } finally { setRewritingPrompt(null); }
  }, [prompt]);
  const handleGetSuggestions = useCallback(async (part: PromptPart, value: string) => {
    if (!value.trim() || value.length < 4) {
      if (part === 'subject') setSubjectSuggestions([]); else setBackgroundSuggestions([]);
      return;
    }
    setSuggestionsLoading(part);
    try {
      const suggestions = await getPromptSuggestions(value, part);
      if (part === 'subject') setSubjectSuggestions(suggestions); else setBackgroundSuggestions(suggestions);
    } catch (e: any) {
      console.error("Failed to get suggestions", e);
      setError(e.message || "Failed to fetch prompt suggestions.");
      if (part === 'subject') setSubjectSuggestions([]); else setBackgroundSuggestions([]);
    } finally { setSuggestionsLoading(null); }
  }, []);
  const handleRandomPrompt = useCallback(async (part: PromptPart | 'edit') => {
    setRandomizingPrompt(part);
    setError(null);
    try {
      const randomText = await generateRandomPrompt(part);
      if (part === 'edit') setEditPrompt(randomText);
      else setPrompt(prev => ({ ...prev, [part]: randomText }));
    } catch (e: any) {
      console.error(e);
      setError(e.message || `Failed to generate a random ${part} prompt. Please try again.`);
    } finally { setRandomizingPrompt(null); }
  }, []);
  const handleSaveShape = useCallback(() => { /* TODO: Re-implement if needed for layers */ }, []);
  const handleClearCustomShapes = useCallback(() => {
    try {
      localStorage.removeItem('userClipArtShapes');
      const defaultCategories = [...CLIP_ART_CATEGORIES];
      setClipArtCategories(defaultCategories);
      setSelectedClipArtCategoryName(defaultCategories[0].name);
    } catch (e) {
      console.error("Failed to clear custom shapes:", e);
      setError("Could not clear custom shapes. There might be a browser issue.");
    }
  }, []);
  const handleToggleFilter = useCallback((filterToToggle: Filter) => {
    setActiveFilters(prevFilters => {
      if (filterToToggle.name === "None") return [FILTERS[0]];
      const isAlreadyActive = prevFilters.some(f => f.name === filterToToggle.name);
      let newFilters: Filter[];
      if (isAlreadyActive) {
        newFilters = prevFilters.filter(f => f.name !== filterToToggle.name);
      } else {
        newFilters = [...prevFilters.filter(f => f.name !== "None"), filterToToggle];
      }
      return newFilters.length === 0 ? [FILTERS[0]] : newFilters;
    });
  }, []);
  const handleAdjustmentChange = (adjustment: keyof ImageAdjustments, value: number) => setAdjustments(prev => ({ ...prev, [adjustment]: value }));
  const handleResetAdjustments = () => setAdjustments({ brightness: 100, contrast: 100, red: 100, green: 100, blue: 100 });
  const handlePromptChange = (part: PromptPart, value: string) => setPrompt(prev => ({ ...prev, [part]: value }));

  return (
    <>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
      <div className="min-h-screen bg-base-100 flex font-sans">
        {isPanelOpen && <div onClick={() => setIsPanelOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" aria-hidden="true" />}
        <aside className={`fixed inset-y-0 left-0 z-50 w-11/12 max-w-md transform transition-transform duration-300 ease-in-out bg-base-200 p-6 flex-shrink-0 flex flex-col space-y-6 max-h-screen overflow-y-auto md:relative md:w-[400px] lg:w-[450px] md:translate-x-0 ${isPanelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <ControlPanel
            onClose={() => setIsPanelOpen(false)}
            activeTab={activeTab} setActiveTab={setActiveTab} prompt={prompt} onPromptChange={handlePromptChange} onRewritePrompt={handleRewritePrompt}
            rewritingPrompt={rewritingPrompt} onRandomPrompt={handleRandomPrompt} randomizingPrompt={randomizingPrompt} onGetSuggestions={handleGetSuggestions}
            subjectSuggestions={subjectSuggestions} backgroundSuggestions={backgroundSuggestions} suggestionsLoading={suggestionsLoading}
            editPrompt={editPrompt} setEditPrompt={setEditPrompt} style={style} setStyle={setStyle} lighting={lighting} setLighting={setLighting}
            composition={composition} setComposition={setComposition} technicalModifier={technicalModifier} setTechnicalModifier={setTechnicalModifier}
            aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} numImages={numImages} setNumImages={setNumImages}
            onGenerate={handleGenerate} onEdit={handleEdit} onOutpaint={handleOutpaint} outpaintPrompt={outpaintPrompt} setOutpaintPrompt={setOutpaintPrompt}
            outpaintAmount={outpaintAmount} setOutpaintAmount={setOutpaintAmount} onCrop={handleCrop} cropRectActive={cropRectActive}
            onUploadClick={handleUploadClick} isLoading={isLoading} hasImage={hasImage} editMode={editMode} setEditMode={setEditMode}
            brushSize={brushSize} setBrushSize={setBrushSize} brushColor={brushColor} setBrushColor={setBrushColor} onClear={clearCanvas}
            onReset={resetImage} onUndo={handleUndo} canUndo={canUndo} activeFilters={activeFilters} onToggleFilter={handleToggleFilter}
            adjustments={adjustments} onAdjustmentChange={handleAdjustmentChange} onResetAdjustments={handleResetAdjustments}
            clipArtCategories={clipArtCategories} selectedClipArtCategoryName={selectedClipArtCategoryName} setSelectedClipArtCategoryName={setSelectedClipArtCategoryName}
            onSaveShape={handleSaveShape} selectedShapeId={selectedShapeId} onDeleteSelectedShape={handleDeleteSelectedShape}
            onClearCustomShapes={handleClearCustomShapes}
            // Layer props
            layers={layers} activeLayerId={activeLayerId} onAddLayer={handleAddLayer} onDeleteLayer={handleDeleteLayer}
            onSelectLayer={handleSelectLayer} onUpdateLayer={handleUpdateLayer} onReorderLayers={handleReorderLayers}
          />
          {error && (<div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md text-sm"><p className="font-semibold">Error</p><p>{error}</p></div>)}
        </aside>
        <main className="flex-1 flex items-center justify-center p-4 md:p-6 bg-base-100/50 relative">
          <button onClick={() => setIsPanelOpen(true)} className="md:hidden fixed bottom-4 left-4 z-30 bg-brand-primary text-white p-3 rounded-full shadow-lg hover:bg-brand-primary/80 transition-colors" aria-label="Open controls panel"><SettingsIcon /></button>
          <div className="w-full h-full max-w-[800px] max-h-[800px] flex items-center justify-center relative">
            {hasImage && !isLoading && (
              <>
                <button onClick={handleDownload} className="absolute top-3 right-3 z-30 bg-base-200/80 hover:bg-brand-primary text-text-primary hover:text-white p-2 rounded-full transition-colors duration-200" aria-label="Download image" title="Download image"><DownloadIcon /></button>
                {imageDimensions && (<div className="absolute bottom-3 right-3 z-30 bg-black/60 text-white text-xs px-2 py-1 rounded-md pointer-events-none">{imageDimensions.width} x {imageDimensions.height}px</div>)}
              </>
            )}
            {generatedImages.length > 0 ? (
              <ImageGallery images={generatedImages} onSelectImage={handleSelectGalleryImage} />
            ) : (
              <ImageCanvas
                ref={canvasRef}
                layers={layers}
                activeLayerId={activeLayerId}
                isLoading={isLoading} loadingMessage={loadingMessage} editMode={editMode} brushSize={brushSize} brushColor={brushColor}
                activeFilters={activeFilters.map(f => f.value)} adjustments={adjustments} onUploadClick={handleUploadClick}
                setCropRectActive={setCropRectActive} selectedShapeId={selectedShapeId} onAddStroke={handleAddStroke} onAddShape={handleAddShape}
                onUpdateShape={handleUpdateShape} onSelectShape={setSelectedShapeId} onImageLoad={setImageDimensions}
                onShapeInteractionEnd={handleShapeInteractionEnd}
                onStrokeInteractionEnd={handleStrokeInteractionEnd}
              />
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default App;