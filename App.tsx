import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ImageCanvas } from './components/ImageCanvas';
import { generateImage, editImage, rewritePrompt, generateRandomPrompt, describeImage, getPromptSuggestions, searchPexelsPhotos } from './services/geminiService';
import { ImageCanvasMethods } from './components/ImageCanvas';
import { EditMode, ImageStyle, Filter, PromptState, PromptPart, LightingStyle, CompositionRule, ClipArtShape, PlacedShape, Stroke, ClipArtCategory, TechnicalModifier, ImageAdjustments, Layer, LayerType, PexelsPhoto } from './types';
import { INITIAL_STYLES, SUPPORTED_ASPECT_RATIOS, FILTERS, LIGHTING_STYLES, COMPOSITION_RULES, CLIP_ART_CATEGORIES, TECHNICAL_MODIFIERS, INITIAL_COLOR_PRESETS, DEFAULT_ADJUSTMENTS } from './constants';
import { THEMES, DEFAULT_THEME } from './themes';
import { DownloadIcon, SettingsIcon, CropIcon, CheckIcon, CloseIcon, SaveProjectIcon, OpenProjectIcon, UploadIcon } from './components/Icons';
import { ImageGallery } from './components/ImageGallery';

type Tab = 'generate' | 'edit' | 'settings';
type ExportFormat = 'png' | 'jpeg' | 'webp';

// Extend the global Window interface
declare global {
  interface Window {
    applyTheme: (themeName: string, isDark: boolean) => void;
  }
}

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

  // Layer-based state
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [history, setHistory] = useState<Layer[][]>([]);
  const [isEditingMask, setIsEditingMask] = useState<boolean>(false);


  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  
  const [aspectRatio, setAspectRatio] = useState<string>(SUPPORTED_ASPECT_RATIOS[0].value);
  const [numImages, setNumImages] = useState<number>(1);
  
  const [editMode, setEditMode] = useState<EditMode>(EditMode.MOVE);
  const [brushSize, setBrushSize] = useState<number>(40);
  const [brushColor, setBrushColor] = useState<string>('#FFFFFF');
  
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [rewritingPrompt, setRewritingPrompt] = useState<PromptPart | null>(null);
  const [randomizingPrompt, setRandomizingPrompt] = useState<PromptPart | 'edit' | null>(null);

  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [backgroundSuggestions, setBackgroundSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState<PromptPart | null>(null);

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [colorPresets, setColorPresets] = useState<string[]>(INITIAL_COLOR_PRESETS);
  
  // Cropping State
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [cropRequest, setCropRequest] = useState<number>(0);
  const [collapseRequest, setCollapseRequest] = useState<number>(0);
  
  // Save/Export/Open State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [jpegQuality, setJpegQuality] = useState<number>(92);
  const [isOpenOptionsOpen, setIsOpenOptionsOpen] = useState<boolean>(false);
  const [isMergeConfirmModalOpen, setIsMergeConfirmModalOpen] = useState<boolean>(false);

  // Theme state
  const [themeName, setThemeName] = useState(() => localStorage.getItem('themeName') || DEFAULT_THEME.name);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  // Pexels State
  const [pexelsPhotos, setPexelsPhotos] = useState<PexelsPhoto[]>([]);
  const [isPexelsLoading, setIsPexelsLoading] = useState<boolean>(false);
  const [pexelsError, setPexelsError] = useState<string | null>(null);
  const [pexelsPage, setPexelsPage] = useState<number>(1);
  const [currentPexelsQuery, setCurrentPexelsQuery] = useState<string>('');
  const [pexelsApiKey, setPexelsApiKey] = useState<string>(() => {
    const savedKey = localStorage.getItem('pexelsApiKey');
    return savedKey || process.env.PEXELS_API_KEY || '';
  });

  const handleSetPexelsApiKey = (key: string) => {
      setPexelsApiKey(key);
      localStorage.setItem('pexelsApiKey', key);
  };


  const canvasRef = useRef<ImageCanvasMethods>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);

  const canUndo = history.length > 1;
  const hasImage = layers.some(l => l.type === LayerType.IMAGE || (l.type === LayerType.PIXEL && (l.strokes?.length || l.placedShapes?.length)));

  useEffect(() => {
    // Centralized theme management
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
      localStorage.setItem('themeMode', 'dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      localStorage.setItem('themeMode', 'light');
    }
    localStorage.setItem('themeName', themeName);
    
    // Apply colors using the globally defined function
    if(window.applyTheme) {
      window.applyTheme(themeName, isDarkMode);
    }
  }, [themeName, isDarkMode]);

  useEffect(() => {
    // Load custom clip art
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
    
    // Load custom color presets
    try {
      const savedColorsJSON = localStorage.getItem('colorPresets');
      if (savedColorsJSON) {
        const savedColors = JSON.parse(savedColorsJSON);
        if (Array.isArray(savedColors) && savedColors.every(c => typeof c === 'string')) {
          setColorPresets(savedColors);
        }
      }
    } catch (e) {
      console.error("Failed to load custom color presets:", e);
    }
  }, []);

  const updateHistory = useCallback((newLayers: Layer[]) => {
      setHistory(prev => [...prev, newLayers]);
  }, []);
  
  const calculateInitialLayerDimensions = (img: { width: number, height: number }) => {
    const maxWidth = imageDimensions?.width ? imageDimensions.width * 0.9 : 800;
    const maxHeight = imageDimensions?.height ? imageDimensions.height * 0.9 : 800;

    const imageRatio = img.width / img.height;
    let initialWidth = img.width;
    let initialHeight = img.height;

    if (initialWidth > maxWidth) {
      initialWidth = maxWidth;
      initialHeight = initialWidth / imageRatio;
    }

    if (initialHeight > maxHeight) {
      initialHeight = maxHeight;
      initialWidth = initialHeight * imageRatio;
    }

    return { width: initialWidth, height: initialHeight };
  };

  const addImageLayer = useCallback((imageUrl: string, name: string) => {
    const img = new Image();
    img.onload = () => {
        const { width, height } = calculateInitialLayerDimensions(img);
        const newLayer: Layer = {
            id: `layer_${Date.now()}`,
            name,
            type: LayerType.IMAGE,
            src: imageUrl,
            isVisible: true,
            opacity: 100,
            x: (imageDimensions?.width ?? width) / 2 - width / 2,
            y: (imageDimensions?.height ?? height) / 2 - height / 2,
            width,
            height,
            rotation: 0,
        };
        const newLayers = [...layers, newLayer];
        setLayers(newLayers);
        setActiveLayerId(newLayer.id);
        updateHistory(newLayers);
        setActiveTab('edit');
    };
    img.src = imageUrl;
  }, [layers, updateHistory, imageDimensions]);
  
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
    setIsEditingMask(false);

    try {
      const promptParts = [ prompt.subject, prompt.background ? `background of ${prompt.background}` : '', style.prompt, lighting.prompt, composition.prompt, technicalModifier.prompt ].filter(Boolean);
      const combinedPrompt = promptParts.join(', ');
      const imageB64s = await generateImage(combinedPrompt, { aspectRatio, numberOfImages: numImages });

      if (imageB64s.length === 1) {
        const imageUrl = `data:image/jpeg;base64,${imageB64s[0]}`;
        addImageLayer(imageUrl, 'Background');
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
  }, [prompt, style, aspectRatio, numImages, lighting, composition, technicalModifier, addImageLayer]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setGeneratedImages([]);
    setImageDimensions(null);
    setIsEditingMask(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      if (!imageUrl) return;
      addImageLayer(imageUrl, file.name);
      setEditPrompt(''); // Clear prompt, let user analyze if they want
    };
    reader.readAsDataURL(file);
  }, [addImageLayer]);

  const handleSelectGalleryImage = useCallback((imageUrl: string) => {
    setLayers([]); // Start fresh with the selected image
    addImageLayer(imageUrl, 'Background');
    setGeneratedImages([]);
    setImageDimensions(null);
    setIsEditingMask(false);
  }, [addImageLayer]);

  const handleAnalyzeImage = useCallback(async () => {
    if (!canvasRef.current) return;
    setIsLoading(true);
    setLoadingMessage('Analyzing image...');
    setError(null);
    try {
        const flatImageData = canvasRef.current.getCanvasAsDataURL();
        if (!flatImageData) throw new Error("Could not get canvas data to analyze.");

        const [meta, data] = flatImageData.split(',');
        const mimeType = meta.split(';')[0].split(':')[1];
        
        const description = await describeImage(data, mimeType);
        setEditPrompt(description);

    } catch (e: any) {
        console.error(e);
        setError(e.message || 'Failed to analyze the image.');
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
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
      const flatImageData = canvasRef.current.getCanvasAsDataURL();
      if (!flatImageData) throw new Error("Could not get canvas data.");

      const [meta, data] = flatImageData.split(',');
      const mimeType = meta.split(';')[0].split(':')[1];
      
      const activeLayer = layers.find(l => l.id === activeLayerId);
      const hasEnabledMask = activeLayer?.maskSrc && activeLayer.maskEnabled;
      let maskData: string | undefined;

      if (hasEnabledMask) {
          maskData = activeLayer.maskSrc!.split(',')[1];
      }
      
      let finalPrompt = editPrompt;
      if (editMode === EditMode.SKETCH) {
        finalPrompt = `Using the user's drawing and shapes on the top layer as a guide, ${editPrompt}.`;
      } else if (hasEnabledMask) {
        finalPrompt = `Apply the following change ONLY to the masked (white) area of the image: ${editPrompt}. Blend the new content seamlessly with the existing image.`;
      }

      const result = await editImage(data, mimeType, finalPrompt, maskData);
      
      if (result.image) {
        const imageUrl = `data:${mimeType};base64,${result.image}`;
        addImageLayer(imageUrl, `Edit: ${editPrompt.substring(0, 15)}...`);
        setIsEditingMask(false);
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
  }, [editPrompt, editMode, layers, activeLayerId, addImageLayer]);

  const handleOutpaint = useCallback(async (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!canvasRef.current) return;
    setIsLoading(true);
    setLoadingMessage('Expanding the scene...');
    setError(null);
    try {
      const flatImageData = canvasRef.current.getCanvasAsDataURL();
      if (!flatImageData) throw new Error("Could not get flattened canvas data.");

      const { data, mimeType, maskData, pasteX, pasteY, newWidth, newHeight } = await canvasRef.current.getExpandedCanvasData(flatImageData, direction, outpaintAmount);
      const finalOutpaintPrompt = `The masked (white) area indicates new empty space to be filled. ${outpaintPrompt}`;
      const result = await editImage(data, mimeType, finalOutpaintPrompt, maskData);
      
      if (result.image) {
        const imageUrl = `data:image/png;base64,${result.image}`;
        
        // Create the new outpainted layer
        const newBackgroundLayer: Layer = { id: `layer_${Date.now()}`, name: `Outpaint ${direction}`, type: LayerType.IMAGE, src: imageUrl, isVisible: true, opacity: 100, x: 0, y: 0, width: newWidth, height: newHeight, rotation: 0 };
        
        // Translate existing layers to fit on the new canvas
        const translatedLayers = layers.map(layer => {
            const newPos = { x: layer.x + pasteX, y: layer.y + pasteY };
            if (layer.type === LayerType.PIXEL) {
                const translatedStrokes = layer.strokes?.map(stroke => ({
                    ...stroke,
                    points: stroke.points.map(p => ({ x: p.x + pasteX, y: p.y + pasteY }))
                }));
                const translatedShapes = layer.placedShapes?.map(shape => ({
                    ...shape,
                    x: shape.x + pasteX,
                    y: shape.y + pasteY
                }));
                return { ...layer, ...newPos, strokes: translatedStrokes, placedShapes: translatedShapes };
            }
            return { ...layer, ...newPos };
        });
        
        // Place the new outpainted layer at the bottom and the translated layers on top
        const newLayers = [newBackgroundLayer, ...translatedLayers];
        setLayers(newLayers);
        setActiveLayerId(newLayers[newLayers.length - 1].id); // Keep active layer on top
        updateHistory(newLayers);
        setIsEditingMask(false);
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
  }, [outpaintPrompt, outpaintAmount, layers, updateHistory]);

  // --- Cropping ---
  const handleStartCrop = () => setIsCropping(true);
  
  const handleCancelCrop = () => {
    canvasRef.current?.clearCropSelection();
    setIsCropping(false);
  };

  const handleConfirmCrop = () => {
    if (!canvasRef.current) return;
    if (!window.confirm("This will merge all visible layers and crop the canvas. This action cannot be undone. Do you want to continue?")) {
        return;
    }
    setCropRequest(Date.now());
  };
  
  useEffect(() => {
    if (cropRequest === 0) return;

    const performCrop = () => {
        if (!canvasRef.current) return;

        setIsLoading(true);
        setLoadingMessage('Cropping canvas...');
        
        // This timeout ensures the loading state has a chance to render before the potentially blocking canvas operation
        setTimeout(() => {
            try {
                const cropResult = canvasRef.current!.applyCrop();
                if (cropResult) {
                    const { dataUrl, width, height } = cropResult;
                    const newLayer: Layer = { id: `layer_${Date.now()}`, name: 'Cropped Image', type: LayerType.IMAGE, src: dataUrl, isVisible: true, opacity: 100, x: 0, y: 0, width, height, rotation: 0 };
                    const newLayers = [newLayer];
                    setLayers(newLayers);
                    setActiveLayerId(newLayer.id);
                    updateHistory(newLayers);
                    setIsEditingMask(false);
                } else {
                    throw new Error("Cropping failed. Please ensure you have selected a valid area.");
                }
            } catch (e: any) {
                console.error(e);
                setError(e.message || 'Failed to crop canvas.');
            } finally {
                setIsLoading(false);
                setLoadingMessage('');
                setIsCropping(false);
            }
        }, 50);
    };

    performCrop();
  }, [cropRequest, updateHistory]);
  
  useEffect(() => {
    if (collapseRequest === 0) return;

    const performCollapse = () => {
        if (!canvasRef.current) return;

        setIsLoading(true);
        setLoadingMessage('Merging layers...');
        setError(null);

        setTimeout(() => {
            try {
                const dataUrl = canvasRef.current!.getCanvasAsDataURL();
                const dimensions = canvasRef.current!.getCanvasDimensions();
                
                if (dataUrl && dimensions) {
                    const newLayer: Layer = {
                        id: `layer_${Date.now()}`,
                        name: 'Merged Layer',
                        type: LayerType.IMAGE,
                        src: dataUrl,
                        isVisible: true,
                        opacity: 100,
                        x: 0,
                        y: 0,
                        width: dimensions.width,
                        height: dimensions.height,
                        rotation: 0,
                    };
                    const newLayers = [newLayer];
                    setLayers(newLayers);
                    setActiveLayerId(newLayer.id);
                    updateHistory(newLayers);
                    setIsEditingMask(false);
                } else {
                    throw new Error("Could not merge layers. The canvas may be empty.");
                }
            } catch (e: any) {
                console.error("Failed to merge layers:", e);
                setError(e.message || "An unexpected error occurred while merging layers.");
            } finally {
                setIsLoading(false);
                setLoadingMessage('');
                setCollapseRequest(0); // Reset trigger
            }
        }, 50);
    };
    
    performCollapse();

  }, [collapseRequest, updateHistory]);


  // --- Layer Management ---
  const handleAddLayer = useCallback((type: LayerType) => {
    const layerName = type === LayerType.PIXEL ? `Pixel Layer ${layers.filter(l => l.type === LayerType.PIXEL).length + 1}` : `Adjustment Layer ${layers.filter(l => l.type === LayerType.ADJUSTMENT).length + 1}`;
    const newLayer: Layer = {
      id: `layer_${Date.now()}`,
      name: layerName,
      type: type,
      isVisible: true,
      opacity: 100,
      x: 0,
      y: 0,
      rotation: 0,
    };
    if (type === LayerType.PIXEL) {
        newLayer.strokes = [];
        newLayer.placedShapes = [];
    }
    if (type === LayerType.ADJUSTMENT) {
        newLayer.adjustments = { ...DEFAULT_ADJUSTMENTS };
    }
    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    setActiveLayerId(newLayer.id);
    updateHistory(newLayers);
    setIsEditingMask(false);
  }, [layers, updateHistory]);

  const handleCollapseLayers = useCallback(() => {
    if (layers.length < 2) return;
    setIsMergeConfirmModalOpen(true);
  }, [layers]);
  
  const handleConfirmCollapse = useCallback(() => {
    setCollapseRequest(Date.now());
    setIsMergeConfirmModalOpen(false);
  }, []);

  const handleLayerAdjustmentChange = useCallback((adjustment: keyof ImageAdjustments, value: number) => {
    if (!activeLayerId) return;
    setLayers(currentLayers => currentLayers.map(l => {
      if (l.id === activeLayerId && l.type === LayerType.ADJUSTMENT) {
        // Using a manual slider implies a custom filter, so 'None' is selected.
        return { ...l, adjustments: { ...l.adjustments!, [adjustment]: value, filter: 'None' } };
      }
      return l;
    }));
  }, [activeLayerId]);

  const handleLayerFilterChange = useCallback((filterName: string) => {
    if (!activeLayerId) return;
    setLayers(currentLayers => {
        const newLayers = currentLayers.map(l => {
          if (l.id === activeLayerId && l.type === LayerType.ADJUSTMENT) {
            // When a preset is chosen, reset sliders to default and set the filter name
            return { ...l, adjustments: { ...DEFAULT_ADJUSTMENTS, filter: filterName } };
          }
          return l;
        });
        updateHistory(newLayers);
        return newLayers;
    });
  }, [activeLayerId, updateHistory]);

  const handleResetLayerAdjustments = useCallback(() => {
    if (!activeLayerId) return;
     setLayers(currentLayers => {
        const newLayers = currentLayers.map(l => {
          if (l.id === activeLayerId && l.type === LayerType.ADJUSTMENT) {
            return { ...l, adjustments: { ...DEFAULT_ADJUSTMENTS } };
          }
          return l;
        });
        updateHistory(newLayers);
        return newLayers;
    });
  }, [activeLayerId, updateHistory]);


  const resetImage = useCallback(() => {
    setLayers([]);
    setActiveLayerId(null);
    setHistory([]);
    setEditPrompt('');
    setImageDimensions(null);
    setSelectedShapeId(null);
    setIsEditingMask(false);
    canvasRef.current?.clearCropSelection();
  }, []);

  const handleDeleteLayer = useCallback((id: string) => {
    const newLayers = layers.filter(l => l.id !== id);
    if (newLayers.length > 0) {
      setLayers(newLayers);
      // If the active layer was deleted, select the top-most one
      if (activeLayerId === id) {
        setActiveLayerId(newLayers[newLayers.length - 1].id);
        setIsEditingMask(false);
      }
      updateHistory(newLayers);
    } else {
      resetImage(); // Reset if last layer is deleted
    }
  }, [layers, activeLayerId, updateHistory, resetImage]);

  const handleSelectLayer = useCallback((id: string) => {
    setActiveLayerId(id);
    setIsEditingMask(false);
  }, []);

  const handleSelectLayerMask = useCallback((id: string) => {
    setActiveLayerId(id);
    setIsEditingMask(true);
    setBrushColor('#000000'); // Default to black for masking
  }, []);

  const handleUpdateLayer = useCallback((id: string, updates: Partial<Layer> | ((layer: Layer) => Partial<Layer>)) => {
      setLayers(currentLayers => currentLayers.map(l => {
        if (l.id === id) {
          const newUpdates = typeof updates === 'function' ? updates(l) : updates;
          return { ...l, ...newUpdates };
        }
        return l;
      }));
      // Do not add to history for continuous updates like opacity change or movement
  }, []);

  const handleReorderLayers = useCallback((dragId: string, dropId: string) => {
    const dragIndex = layers.findIndex(l => l.id === dragId);
    const dropIndex = layers.findIndex(l => l.id === dropId);
    const newLayers = [...layers];
    const [draggedItem] = newLayers.splice(dragIndex, 1);
    newLayers.splice(dropIndex, 0, draggedItem);
    setLayers(newLayers);
    updateHistory(newLayers);
  }, [layers, updateHistory]);
  
  const handleLayerTransformEnd = useCallback(async (layerId: string) => {
      setIsLoading(true);
      setLoadingMessage('Rasterizing layer...');
      setError(null);
  
      try {
          const layer = layers.find(l => l.id === layerId);
          if (!layer || layer.type !== LayerType.IMAGE || !layer.width || !layer.height) {
              throw new Error('Invalid layer for rasterization.');
          }
  
          const imagePromise = new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = () => reject(new Error(`Could not load layer image: ${layer.src?.substring(0, 100)}`));
              img.src = layer.src!;
          });
  
          const maskPromise = layer.maskSrc ? new Promise<HTMLImageElement>((resolve, reject) => {
              const maskImg = new Image();
              maskImg.onload = () => resolve(maskImg);
              maskImg.onerror = () => reject(new Error('Could not load layer mask image.'));
              maskImg.src = layer.maskSrc!;
          }) : Promise.resolve(null);
          
          const [image, maskImage] = await Promise.all([imagePromise, maskPromise]);
  
          const { width, height, rotation = 0 } = layer;
          const rad = rotation;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
  
          // Calculate the bounding box of the rotated image
          const newWidth = Math.round(Math.abs(width * cos) + Math.abs(height * sin));
          const newHeight = Math.round(Math.abs(width * sin) + Math.abs(height * cos));
  
          const rasterize = (imgToRasterize: HTMLImageElement) => {
              const canvas = document.createElement('canvas');
              canvas.width = newWidth;
              canvas.height = newHeight;
              const ctx = canvas.getContext('2d');
              if (!ctx) throw new Error('Could not create canvas context.');
  
              // Translate to the center, rotate, and draw the image centered
              ctx.translate(newWidth / 2, newHeight / 2);
              ctx.rotate(rad);
              ctx.drawImage(imgToRasterize, -width / 2, -height / 2, width, height);
              return canvas.toDataURL('image/png');
          };
          
          const newImageDataUrl = rasterize(image);
          let newMaskDataUrl: string | undefined = layer.maskSrc;
          if (maskImage) {
              newMaskDataUrl = rasterize(maskImage);
          }
          
          const newLayers = layers.map(l => {
              if (l.id === layerId) {
                  return {
                      ...l,
                      src: newImageDataUrl,
                      maskSrc: newMaskDataUrl,
                      // Adjust position to keep the center of the new bounding box where the old center was
                      x: l.x + (l.width! - newWidth) / 2,
                      y: l.y + (l.height! - newHeight) / 2,
                      width: newWidth,
                      height: newHeight,
                      rotation: 0, // Rotation is now baked into the image
                  };
              }
              return l;
          });
  
          setLayers(newLayers);
          updateHistory(newLayers);
  
      } catch(e: any) {
          console.error("Failed to rasterize layer:", e);
          setError(e.message || "An error occurred while finalizing the transformation.");
          // If it fails, at least save the pre-rasterization state to history
          updateHistory(layers);
      } finally {
          setIsLoading(false);
          setLoadingMessage('');
      }
  }, [layers, updateHistory]);

  // --- Mask Management ---
  const handleAddLayerMask = useCallback((layerId: string) => {
    const whiteMask = canvasRef.current?.getCanvasAsDataURL({ fillStyle: 'white' });
    if (!whiteMask) return;
    const newLayers = layers.map(l => l.id === layerId ? { ...l, maskSrc: whiteMask, maskEnabled: true } : l);
    setLayers(newLayers);
    updateHistory(newLayers);
    handleSelectLayerMask(layerId);
  }, [layers, handleSelectLayerMask, updateHistory]);

  const handleDeleteLayerMask = useCallback((layerId: string) => {
    const newLayers = layers.map(l => {
      if (l.id === layerId) {
        const { maskSrc, maskEnabled, ...rest } = l;
        return rest;
      }
      return l;
    });
    setLayers(newLayers);
    updateHistory(newLayers);
    setIsEditingMask(false);
  }, [layers, updateHistory]);
  
  const handleUpdateLayerMask = useCallback((layerId: string, maskDataUrl: string) => {
    // This updates without adding to history, as it's part of a continuous drawing action.
    setLayers(currentLayers => currentLayers.map(l => l.id === layerId ? { ...l, maskSrc: maskDataUrl } : l));
  }, []);
  
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
        setIsEditingMask(false);
    }
  }, [history, canUndo, activeLayerId]);
  
  const clearCanvas = useCallback(() => {
    if (!activeLayerId) return;
    const newLayers = layers.map(l => {
      if (l.id === activeLayerId) {
        if (isEditingMask) {
          const whiteMask = canvasRef.current?.getCanvasAsDataURL({ fillStyle: 'white' });
          return { ...l, maskSrc: whiteMask };
        } else if (l.type === LayerType.PIXEL) {
          return { ...l, strokes: [], placedShapes: [] };
        }
      }
      return l;
    });
    setLayers(newLayers);
    updateHistory(newLayers);
    if (!isEditingMask) {
      setSelectedShapeId(null);
    }
    canvasRef.current?.clearCropSelection();
  }, [layers, activeLayerId, isEditingMask, updateHistory]);

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
  }, [layers, activeLayerId, brushColor, updateHistory]);

  const handleUpdateShape = useCallback((id: string, updates: Partial<Omit<PlacedShape, 'id'>>) => {
      setLayers(currentLayers => currentLayers.map(l => {
          if (l.id === activeLayerId && l.type === LayerType.PIXEL) {
              const updatedShapes = l.placedShapes?.map(s => s.id === id ? { ...s, ...updates } : s);
              return { ...l, placedShapes: updatedShapes };
          }
          return l;
      }));
  }, [activeLayerId]);
  
  const handleShapeInteractionEnd = useCallback(() => {
    updateHistory(layers);
  }, [layers, updateHistory]);

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
  }, [selectedShapeId, activeLayerId, layers, updateHistory]);

  const handleSaveShape = useCallback((name: string) => {
    if (!activeLayerId) return;
    const activeLayer = layers.find(l => l.id === activeLayerId);

    if (!activeLayer || activeLayer.type !== LayerType.PIXEL) {
        setError("Please select a pixel layer to save as clip art.");
        return;
    }

    const { strokes = [], placedShapes = [] } = activeLayer;
    if (strokes.length === 0 && placedShapes.length === 0) {
        setError("The selected layer is empty. Please draw something to save.");
        return;
    }
    
    setIsLoading(true);
    setLoadingMessage('Saving clip art...');
    setError(null);

    // This async block allows us to load images for placed shapes before calculating bounds.
    const saveAsync = async () => {
        try {
            // 1. Calculate bounding box of all elements on the layer
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            strokes.forEach(stroke => {
                stroke.points.forEach(point => {
                    const buffer = stroke.size / 2;
                    minX = Math.min(minX, point.x - buffer);
                    minY = Math.min(minY, point.y - buffer);
                    maxX = Math.max(maxX, point.x + buffer);
                    maxY = Math.max(maxY, point.y + buffer);
                });
            });

            // Asynchronously load images to get their dimensions for accurate bounding box
            const shapeImages = await Promise.all(
                placedShapes.map(shape => new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error('Could not load shape image.'));
                    img.src = shape.dataUrl;
                }))
            );

            placedShapes.forEach((shape) => {
                const halfWidth = shape.width / 2;
                const halfHeight = shape.height / 2;
                const corners = [
                    { x: -halfWidth, y: -halfHeight }, { x: halfWidth, y: -halfHeight },
                    { x: halfWidth, y: halfHeight }, { x: -halfWidth, y: halfHeight },
                ];
                
                const cosR = Math.cos(shape.rotation);
                const sinR = Math.sin(shape.rotation);

                corners.forEach(corner => {
                    const rotatedX = shape.x + corner.x * cosR - corner.y * sinR;
                    const rotatedY = shape.y + corner.x * sinR + corner.y * cosR;
                    minX = Math.min(minX, rotatedX);
                    minY = Math.min(minY, rotatedY);
                    maxX = Math.max(maxX, rotatedX);
                    maxY = Math.max(maxY, rotatedY);
                });
            });

            if (minX === Infinity) { // This case handles empty layers
                throw new Error("Cannot save an empty drawing.");
            }

            const padding = 10; // Add some padding around the content
            const width = Math.round(maxX - minX) + padding * 2;
            const height = Math.round(maxY - minY) + padding * 2;
            const offsetX = -minX + padding;
            const offsetY = -minY + padding;

            if (width <= 0 || height <= 0) {
              throw new Error("Cannot save content with no dimensions.");
            }

            // 2. Create a temporary canvas and draw the layer's content onto it
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const ctx = tempCanvas.getContext('2d');
            if (!ctx) throw new Error("Could not create canvas to save shape.");

            strokes.forEach(stroke => {
                ctx.strokeStyle = stroke.color;
                ctx.lineWidth = stroke.size;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                if (stroke.points.length > 0) {
                    ctx.moveTo(stroke.points[0].x + offsetX, stroke.points[0].y + offsetY);
                    for (let i = 1; i < stroke.points.length; i++) {
                        ctx.lineTo(stroke.points[i].x + offsetX, stroke.points[i].y + offsetY);
                    }
                    ctx.stroke();
                }
            });

            placedShapes.forEach((shape, index) => {
                ctx.save();
                ctx.translate(shape.x + offsetX, shape.y + offsetY);
                ctx.rotate(shape.rotation);
                ctx.drawImage(shapeImages[index], -shape.width / 2, -shape.height / 2, shape.width, shape.height);
                ctx.restore();
            });

            // 3. Get the dataURL from the temporary canvas
            const dataUrl = tempCanvas.toDataURL('image/png');

            // 4. Update the clip art categories state and save to localStorage
            const newShape: ClipArtShape = { name, dataUrl };

            setClipArtCategories(prevCategories => {
                const newCategories = JSON.parse(JSON.stringify(prevCategories));
                let customCategory = newCategories.find((c: ClipArtCategory) => c.name === 'Custom');

                if (customCategory) {
                    customCategory.shapes.push(newShape);
                } else {
                    customCategory = { name: 'Custom', shapes: [newShape] };
                    newCategories.push(customCategory);
                }
                
                try {
                    localStorage.setItem('userClipArtShapes', JSON.stringify(customCategory.shapes));
                } catch (e) {
                    console.error("Failed to save custom clip art:", e);
                    setError("Could not save the custom shape due to a browser storage issue.");
                }

                return newCategories;
            });
            
            setSelectedClipArtCategoryName('Custom');

        } catch (err: any) {
            console.error("Error saving shape:", err);
            setError(err.message || "An unexpected error occurred while saving the shape.");
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    saveAsync();
  }, [layers, activeLayerId]);

  // --- Save / Open / Export ---
  const handleSaveProject = useCallback(() => {
    if (layers.length === 0) {
      setError("There's nothing to save yet. Create or upload an image first.");
      return;
    }
    const projectState = {
      version: '1.0.0',
      layers,
      themeName,
      isDarkMode
    };
    const blob = new Blob([JSON.stringify(projectState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const projectName = layers.find(l => l.type === LayerType.IMAGE)?.name.replace(/\s+/g, '-') || 'creative-studio-project';
    link.download = `${projectName}.csp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [layers, themeName, isDarkMode]);

  const handleExportImage = useCallback(() => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.getCanvasAsDataURL({
      format: exportFormat,
      quality: jpegQuality / 100
    });
    if (dataUrl) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `creative-studio-export-${Date.now()}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setIsExportModalOpen(false);
  }, [exportFormat, jpegQuality]);

  const handleProjectFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const projectState = JSON.parse(e.target?.result as string);
        if (projectState && projectState.version && Array.isArray(projectState.layers)) {
          // A very basic validation passed, load the project.
          setLayers(projectState.layers);
          setThemeName(projectState.themeName || DEFAULT_THEME.name);
          setIsDarkMode(projectState.isDarkMode || false);
          
          // Reset relevant state
          updateHistory([projectState.layers]);
          const newActiveId = projectState.layers[projectState.layers.length - 1]?.id || null;
          setActiveLayerId(newActiveId);
          setIsEditingMask(false);
          setActiveTab('edit');
        } else {
          setError("Invalid or corrupted project file.");
        }
      } catch (err) {
        console.error("Failed to load project:", err);
        setError("Failed to read the project file. It may be corrupted.");
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = ''; // Reset input
    setIsOpenOptionsOpen(false);
  };
  
  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleImageUpload(file);
    if (event.target) event.target.value = '';
    setIsOpenOptionsOpen(false);
  };
  
  const handleOpenImageClick = () => imageFileInputRef.current?.click();
  const handleOpenProjectClick = () => projectFileInputRef.current?.click();

  // --- Pexels Handlers ---
  const handlePexelsSearch = useCallback(async (query: string, mode: 'new' | 'more') => {
    if (!pexelsApiKey) {
        setPexelsError("Pexels API Key is not set. Please add it in the Settings tab.");
        return;
    }
    setIsPexelsLoading(true);
    setPexelsError(null);
    const pageToFetch = mode === 'new' ? 1 : pexelsPage + 1;
    if (mode === 'new') {
        setCurrentPexelsQuery(query);
        setPexelsPhotos([]);
    }

    try {
        const results = await searchPexelsPhotos(pexelsApiKey, query, pageToFetch);
        setPexelsPhotos(prev => mode === 'new' ? results : [...prev, ...results]);
        setPexelsPage(pageToFetch);
    } catch (e: any) {
        console.error("Pexels search failed:", e);
        setPexelsError(e.message || "Failed to search for photos.");
    } finally {
        setIsPexelsLoading(false);
    }
  }, [pexelsPage, pexelsApiKey]);

  const handleSelectPexelsImage = useCallback(async (photo: PexelsPhoto) => {
    setIsLoading(true);
    setLoadingMessage('Importing image...');
    setError(null);
    try {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Important for CORS
        img.src = photo.src.large2x; // Using a high-quality version

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error("Could not load image due to network or CORS issue."));
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not create canvas context to import image.");
        
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        
        addImageLayer(dataUrl, photo.alt || `Pexels Image ${photo.id}`);

    } catch (e: any) {
        console.error("Failed to import Pexels image:", e);
        setError(e.message || 'An unexpected error occurred while importing the image.');
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
}, [addImageLayer]);

  // --- Other handlers ---
  const handleAddColorPreset = useCallback(() => {
    if (!colorPresets.includes(brushColor) && colorPresets.length < 12) {
      const newPresets = [...colorPresets, brushColor];
      setColorPresets(newPresets);
      try {
        localStorage.setItem('colorPresets', JSON.stringify(newPresets));
      } catch (e) {
        console.error("Failed to save color presets:", e);
      }
    }
  }, [brushColor, colorPresets]);

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
  
  const handleClearCustomShapes = useCallback(() => {
    try {
      localStorage.removeItem('userClipArtShapes');
      localStorage.removeItem('colorPresets');
      localStorage.removeItem('pexelsApiKey');
      // Also reset theme to default
      setThemeName(DEFAULT_THEME.name);
      
      const defaultCategories = [...CLIP_ART_CATEGORIES];
      setClipArtCategories(defaultCategories);
      setSelectedClipArtCategoryName(defaultCategories[0].name);
      setColorPresets(INITIAL_COLOR_PRESETS);
      setPexelsApiKey('');

    } catch (e) {
      console.error("Failed to clear custom data:", e);
      setError("Could not clear custom data. There might be a browser issue.");
    }
  }, []);

  const handlePromptChange = (part: PromptPart, value: string) => setPrompt(prev => ({ ...prev, [part]: value }));
  const handleToggleThemeMode = useCallback(() => setIsDarkMode(prev => !prev), []);

  return (
    <>
      <input type="file" ref={imageFileInputRef} onChange={handleImageFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
      <input type="file" ref={projectFileInputRef} onChange={handleProjectFileChange} accept=".csp" className="hidden" />

      {/* Modals */}
      {isOpenOptionsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setIsOpenOptionsOpen(false)}>
          <div className="bg-base-200 p-6 rounded-lg shadow-xl space-y-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-text-primary">Open File</h2>
            <button onClick={handleOpenProjectClick} className="w-full flex items-center justify-center gap-3 p-4 bg-base-100 hover:bg-base-300 rounded-md transition-colors text-text-primary font-semibold">
              <OpenProjectIcon /> Open Project (.csp)
            </button>
            <button onClick={handleOpenImageClick} className="w-full flex items-center justify-center gap-3 p-4 bg-base-100 hover:bg-base-300 rounded-md transition-colors text-text-primary font-semibold">
              <UploadIcon /> Open Image (JPG, PNG...)
            </button>
          </div>
        </div>
      )}
      
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setIsExportModalOpen(false)}>
            <div className="bg-base-200 p-6 rounded-lg shadow-xl space-y-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-text-primary">Export Image</h2>
                <div>
                    <label htmlFor="export-format" className="block text-sm font-medium text-text-secondary mb-1">Format</label>
                    <select id="export-format" value={exportFormat} onChange={e => setExportFormat(e.target.value as ExportFormat)} className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary">
                        <option value="png">PNG (Best Quality)</option>
                        <option value="jpeg">JPEG (Good for Web)</option>
                        <option value="webp">WebP (Modern Format)</option>
                    </select>
                </div>
                {exportFormat === 'jpeg' && (
                    <div>
                        <label htmlFor="jpeg-quality" className="block text-sm font-medium text-text-secondary mb-1">JPEG Quality ({jpegQuality}%)</label>
                        <input id="jpeg-quality" type="range" min="10" max="100" value={jpegQuality} onChange={e => setJpegQuality(Number(e.target.value))} className="w-full" />
                    </div>
                )}
                <div className="flex justify-end gap-2">
                    <button onClick={() => setIsExportModalOpen(false)} className="px-4 py-2 rounded-md bg-base-300 hover:bg-base-300/80 text-text-secondary font-semibold">Cancel</button>
                    <button onClick={handleExportImage} className="px-4 py-2 rounded-md bg-brand-primary hover:bg-brand-primary/80 text-white font-semibold">Export</button>
                </div>
            </div>
        </div>
      )}

      {isMergeConfirmModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setIsMergeConfirmModalOpen(false)}>
            <div className="bg-base-200 p-6 rounded-lg shadow-xl space-y-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-text-primary">Confirm Merge</h2>
                <p className="text-text-secondary">Are you sure you want to merge all visible layers? This is a destructive action and cannot be undone.</p>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setIsMergeConfirmModalOpen(false)} className="px-4 py-2 rounded-md bg-base-300 hover:bg-base-300/80 text-text-secondary font-semibold">Cancel</button>
                    <button onClick={handleConfirmCollapse} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold">Merge Layers</button>
                </div>
            </div>
        </div>
      )}


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
            onGenerate={handleGenerate} onEdit={handleEdit} onAnalyzeImage={handleAnalyzeImage} onOutpaint={handleOutpaint} outpaintPrompt={outpaintPrompt} setOutpaintPrompt={setOutpaintPrompt}
            outpaintAmount={outpaintAmount} setOutpaintAmount={setOutpaintAmount} 
            onOpenOptionsClick={() => setIsOpenOptionsOpen(true)} isLoading={isLoading} hasImage={hasImage} editMode={editMode} setEditMode={setEditMode}
            brushSize={brushSize} setBrushSize={setBrushSize} brushColor={brushColor} setBrushColor={setBrushColor} onClear={clearCanvas}
            onReset={resetImage} onUndo={handleUndo} canUndo={canUndo}
            clipArtCategories={clipArtCategories} selectedClipArtCategoryName={selectedClipArtCategoryName} setSelectedClipArtCategoryName={setSelectedClipArtCategoryName}
            onSaveShape={handleSaveShape} selectedShapeId={selectedShapeId} onDeleteSelectedShape={handleDeleteSelectedShape}
            onClearCustomShapes={handleClearCustomShapes}
            colorPresets={colorPresets} onAddColorPreset={handleAddColorPreset}
            // Theme props
            themes={THEMES} activeTheme={themeName} onThemeChange={setThemeName} isDarkMode={isDarkMode} onToggleThemeMode={handleToggleThemeMode}
            // Layer props
            layers={layers} activeLayerId={activeLayerId} onAddLayer={handleAddLayer} onDeleteLayer={handleDeleteLayer}
            onSelectLayer={handleSelectLayer} onUpdateLayer={handleUpdateLayer} onReorderLayers={handleReorderLayers}
            onCollapseLayers={handleCollapseLayers}
            onLayerAdjustmentChange={handleLayerAdjustmentChange} onResetLayerAdjustments={handleResetLayerAdjustments}
            onLayerFilterChange={handleLayerFilterChange}
            onInteractionEndWithHistory={() => updateHistory(layers)}
            // Mask props
            isEditingMask={isEditingMask} onSelectLayerMask={handleSelectLayerMask} onAddLayerMask={handleAddLayerMask}
            onDeleteLayerMask={handleDeleteLayerMask}
            // Pexels Props
            onPexelsSearch={handlePexelsSearch}
            pexelsPhotos={pexelsPhotos}
            isPexelsLoading={isPexelsLoading}
            pexelsError={pexelsError}
            onSelectPexelsImage={handleSelectPexelsImage}
            pexelsApiKey={pexelsApiKey}
            onSetPexelsApiKey={handleSetPexelsApiKey}
          />
          {error && (<div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md text-sm"><p className="font-semibold">Error</p><p>{error}</p></div>)}
        </aside>
        <main className="flex-1 flex items-center justify-center p-4 md:p-6 bg-base-100/50 relative">
          <button onClick={() => setIsPanelOpen(true)} className="md:hidden fixed bottom-4 left-4 z-30 bg-brand-primary text-white p-3 rounded-full shadow-lg hover:bg-brand-primary/80 transition-colors" aria-label="Open controls panel"><SettingsIcon /></button>
          <div className="w-full h-full max-w-[800px] max-h-[800px] flex items-center justify-center relative">
            {hasImage && !isLoading && (
              <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
                {isCropping ? (
                  <>
                    <button onClick={handleConfirmCrop} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105" title="Apply Crop"><CheckIcon/> Apply</button>
                    <button onClick={handleCancelCrop} className="flex items-center gap-2 bg-base-300 hover:bg-base-300/80 text-text-secondary font-bold px-4 py-2 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105" title="Cancel Crop"><CloseIcon/> Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={handleSaveProject} className="bg-base-200/80 hover:bg-brand-primary text-text-primary hover:text-white p-2 rounded-full transition-colors duration-200" aria-label="Save Project" title="Save Project"><SaveProjectIcon /></button>
                    <button onClick={() => setIsExportModalOpen(true)} className="bg-base-200/80 hover:bg-brand-primary text-text-primary hover:text-white p-2 rounded-full transition-colors duration-200" aria-label="Export Image" title="Export Image"><DownloadIcon /></button>
                    <button onClick={handleStartCrop} className="bg-base-200/80 hover:bg-brand-primary text-text-primary hover:text-white p-2 rounded-full transition-colors duration-200" aria-label="Crop Canvas" title="Crop Canvas"><CropIcon /></button>
                  </>
                )}
                 {imageDimensions && !isCropping && (<div className="absolute top-full right-0 mt-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md pointer-events-none">{imageDimensions.width} x {imageDimensions.height}px</div>)}
              </div>
            )}
            {generatedImages.length > 0 ? (
              <ImageGallery images={generatedImages} onSelectImage={handleSelectGalleryImage} />
            ) : (
              <ImageCanvas
                ref={canvasRef}
                layers={layers}
                activeLayerId={activeLayerId}
                isEditingMask={isEditingMask}
                isLoading={isLoading} loadingMessage={loadingMessage} editMode={editMode} brushSize={brushSize} brushColor={brushColor}
                onUploadClick={handleOpenImageClick}
                isCropping={isCropping}
                selectedShapeId={selectedShapeId} onAddStroke={handleAddStroke} onAddShape={handleAddShape}
                onUpdateShape={handleUpdateShape} onSelectShape={setSelectedShapeId} onImageLoad={setImageDimensions}
                onShapeInteractionEnd={handleShapeInteractionEnd}
                onStrokeInteractionEnd={handleStrokeInteractionEnd}
                onUpdateLayerMask={handleUpdateLayerMask}
                onUpdateLayer={handleUpdateLayer}
                onInteractionEndWithHistory={() => updateHistory(layers)}
                onLayerTransformEnd={handleLayerTransformEnd}
              />
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default App;