
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ImageCanvas } from './components/ImageCanvas';
import * as geminiService from './services/geminiService';
import * as comfyuiService from './services/comfyuiService';
import { ImageCanvasMethods } from './components/ImageCanvas';
import { EditMode, ImageStyle, Filter, PromptState, PromptPart, LightingStyle, CompositionRule, Stroke, TechnicalModifier, ImageAdjustments, Layer, LayerType, PexelsPhoto, AIEngine, ComfyUIConnectionStatus, ComfyUIWorkflow, PageState } from './types';
import { INITIAL_STYLES, SUPPORTED_ASPECT_RATIOS, FILTERS, LIGHTING_STYLES, COMPOSITION_RULES, TECHNICAL_MODIFIERS, INITIAL_COLOR_PRESETS, DEFAULT_ADJUSTMENTS, COMFYUI_WORKFLOWS } from './constants';
import { THEMES, DEFAULT_THEME } from './themes';
import { DownloadIcon, SettingsIcon, SaveProjectIcon, OpenProjectIcon, UploadIcon, ZoomInIcon, ZoomOutIcon } from './components/Icons';
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
  const [prompt, setPrompt] = useState<PromptState>({ subject: '', background: '', negativePrompt: '' });
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [outpaintPrompt, setOutpaintPrompt] = useState<string>('Extend the scene seamlessly, matching the original image\'s style and lighting.');
  const [outpaintAmount, setOutpaintAmount] = useState<number>(50);
  const [autoMaskPrompt, setAutoMaskPrompt] = useState<string>('');
  const [remixPreservation, setRemixPreservation] = useState<number>(50);
  
  const [style, setStyle] = useState<ImageStyle>(() => findDefault(INITIAL_STYLES, "None"));
  const [lighting, setLighting] = useState<LightingStyle>(() => findDefault(LIGHTING_STYLES, "Default"));
  const [composition, setComposition] = useState<CompositionRule>(() => findDefault(COMPOSITION_RULES, "Default"));
  const [technicalModifier, setTechnicalModifier] = useState<TechnicalModifier>(() => findDefault(TECHNICAL_MODIFIERS, "Default"));

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  
  // Layer-based state
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [history, setHistory] = useState<Layer[][]>([]);
  const [isEditingMask, setIsEditingMask] = useState<boolean>(false);
  const [page, setPage] = useState<PageState | null>(null);

  const [aspectRatio, setAspectRatio] = useState<string>(SUPPORTED_ASPECT_RATIOS[0].value);
  
  const [editMode, setEditMode] = useState<EditMode>(EditMode.MOVE);
  const [brushSize, setBrushSize] = useState<number>(40);
  const [brushColor, setBrushColor] = useState<string>('#FFFFFF');
  
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [rewritingPrompt, setRewritingPrompt] = useState<PromptPart | 'edit' | null>(null);
  const [randomizingPrompt, setRandomizingPrompt] = useState<PromptPart | 'edit' | null>(null);

  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [backgroundSuggestions, setBackgroundSuggestions] = useState<string[]>([]);
  const [negativePromptSuggestions, setNegativePromptSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState<PromptPart | null>(null);

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [colorPresets, setColorPresets] = useState<string[]>(INITIAL_COLOR_PRESETS);
  
  // Cropping State
  const [collapseRequest, setCollapseRequest] = useState<number>(0);
  
  // Save/Export/Open State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [jpegQuality, setJpegQuality] = useState<number>(92);
  const [isOpenOptionsOpen, setIsOpenOptionsOpen] = useState<boolean>(false);
  const [isMergeConfirmModalOpen, setIsMergeConfirmModalOpen] = useState<boolean>(false);

  // Zoom State
  const [zoom, setZoom] = useState<number>(1);

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

  // AI Engine State
  const [aiEngine, setAiEngine] = useState<AIEngine>('gemini');

  // ComfyUI State
  const [comfyUIServerAddress, setComfyUIServerAddress] = useState<string>(() => localStorage.getItem('comfyUIServerAddress') || 'http://127.0.0.1:8188');
  const [comfyUIConnectionStatus, setComfyUIConnectionStatus] = useState<ComfyUIConnectionStatus>('disconnected');
  const [comfyUICheckpointModels, setComfyUICheckpointModels] = useState<string[]>([]);
  const [comfyUILoraModels, setComfyUILoraModels] = useState<string[]>([]);
  const [selectedComfyUICheckpoint, setSelectedComfyUICheckpoint] = useState<string>('');
  const [selectedComfyUILora, setSelectedComfyUILora] = useState<string>('');
  const [selectedComfyUIWorkflow, setSelectedComfyUIWorkflow] = useState<ComfyUIWorkflow>(COMFYUI_WORKFLOWS[0]);

  // Style Transfer State
  const [styleImage, setStyleImage] = useState<string | null>(null);
  const [styleStrength, setStyleStrength] = useState<number>(70);


  const handleSetPexelsApiKey = (key: string) => {
      setPexelsApiKey(key);
      localStorage.setItem('pexelsApiKey', key);
  };
  
  const handleSetComfyUIServerAddress = (address: string) => {
    setComfyUIServerAddress(address);
    localStorage.setItem('comfyUIServerAddress', address);
    setComfyUIConnectionStatus('disconnected');
  };

  const handleConnectToComfyUI = useCallback(async () => {
    if (!comfyUIServerAddress) {
        setError("Please enter a ComfyUI server address.");
        return;
    }
    setComfyUIConnectionStatus('connecting');
    setError(null);
    try {
        const [checkpoints, loras] = await Promise.all([
            comfyuiService.getModels(comfyUIServerAddress, 'checkpoints'),
            comfyuiService.getModels(comfyUIServerAddress, 'loras'),
        ]);
        setComfyUICheckpointModels(checkpoints);
        setComfyUILoraModels(loras);
        setSelectedComfyUICheckpoint(checkpoints[0] || '');
        setSelectedComfyUILora(loras[0] || 'None');
        setComfyUIConnectionStatus('connected');
    } catch (e: any) {
        console.error("Failed to connect to ComfyUI:", e);
        setError(`Failed to connect to ComfyUI at ${comfyUIServerAddress}. Make sure it's running and accessible. Check browser console for CORS errors.`);
        setComfyUIConnectionStatus('error');
    }
  }, [comfyUIServerAddress]);


  const canvasRef = useRef<ImageCanvasMethods>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const styleImageFileInputRef = useRef<HTMLInputElement>(null);

  const canUndo = history.length > 1;
  const hasImage = layers.some(l => l.type === LayerType.IMAGE || (l.type === LayerType.PIXEL && (l.strokes?.length ?? 0) > 0));

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

  const addImageLayer = useCallback((imageUrl: string, name: string) => {
    const img = new Image();
    img.onload = () => {
        const canvasDimensions = canvasRef.current?.getCanvasDimensions();
        if (!canvasDimensions || canvasDimensions.width === 0) {
            console.error("Canvas not ready for adding image layer.");
            setError("Canvas is not ready. Please try again in a moment.");
            return;
        }
        
        const newPage: PageState = {
            width: img.width,
            height: img.height,
            x: (canvasDimensions.width - img.width) / 2,
            y: (canvasDimensions.height - img.height) / 2,
            backgroundColor: 'rgb(var(--color-base-200))',
        };
        setPage(newPage);

        const newLayer: Layer = {
            id: `layer_${Date.now()}`,
            name,
            type: LayerType.IMAGE,
            src: imageUrl,
            isVisible: true,
            opacity: 100,
            x: newPage.x,
            y: newPage.y,
            width: newPage.width,
            height: newPage.height,
            rotation: 0,
            blendMode: 'source-over',
            scaleX: 1,
            scaleY: 1,
        };
        const newLayers = [newLayer];
        setLayers(newLayers);
        setActiveLayerId(newLayer.id);
        updateHistory(newLayers);
        setActiveTab('edit');
        setZoom(1); // Reset zoom on new image load
    };
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
  }, [updateHistory]);
  
  // ... (generate functions omitted for brevity, no changes) ...
  const handleGenerate = useCallback(async () => {
    if (aiEngine === 'gemini' && !prompt.subject) {
      setError('Please enter a subject to generate an image.');
      return;
    }
    if (aiEngine === 'comfyui' && !prompt.subject) {
        setError('Please enter a positive prompt to generate an image.');
        return;
    }
     if (aiEngine === 'comfyui' && comfyUIConnectionStatus !== 'connected') {
        setError('Please connect to a ComfyUI server in Settings first.');
        return;
    }

    setIsLoading(true);
    setLoadingMessage('Generating your masterpiece...');
    setError(null);
    setLayers([]);
    setActiveLayerId(null);
    setGeneratedImages([]);
    setPage(null);
    setActiveTab('generate');
    setHistory([]);
    setIsEditingMask(false);

    try {
        let imageB64: string;

        if (aiEngine === 'gemini') {
            const promptParts = [ prompt.subject, prompt.background ? `background of ${prompt.background}` : '', style.prompt, lighting.prompt, composition.prompt, technicalModifier.prompt ].filter(Boolean);
            let combinedPrompt = promptParts.join(', ');
            if (prompt.negativePrompt) {
                combinedPrompt += `. Negative prompt: ${prompt.negativePrompt}`;
            }
            const imageB64s = await geminiService.generateImage(combinedPrompt, { aspectRatio, numberOfImages: 1 });
            imageB64 = imageB64s[0];
        } else { // ComfyUI
             const positivePrompt = [prompt.subject, prompt.background].filter(Boolean).join(', ');
             imageB64 = await comfyuiService.generateImage({
                serverAddress: comfyUIServerAddress,
                workflow: selectedComfyUIWorkflow.json,
                positivePrompt: positivePrompt,
                negativePrompt: prompt.negativePrompt,
                checkpoint: selectedComfyUICheckpoint,
                lora: selectedComfyUILora,
                setLoadingMessage: setLoadingMessage,
            });
        }
        
        if (imageB64) {
            const imageUrl = `data:image/png;base64,${imageB64}`;
            addImageLayer(imageUrl, 'Background');
        } else {
            throw new Error("The AI model did not return an image.");
        }

    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to generate image. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [
    prompt, style, aspectRatio, lighting, composition, technicalModifier, addImageLayer, aiEngine, 
    comfyUIServerAddress, comfyUIConnectionStatus, selectedComfyUIWorkflow, selectedComfyUICheckpoint, selectedComfyUILora
  ]);

  const handleGenerateFourViews = useCallback(async () => {
    if (aiEngine === 'gemini' && !prompt.subject) {
      setError('Please enter a subject to generate 4 views.');
      return;
    }
    if (aiEngine !== 'gemini') {
        setError('4-view generation is currently only supported with the Gemini AI engine.');
        return;
    }

    setIsLoading(true);
    setLoadingMessage('Generating 4 distinct views...');
    setError(null);
    setLayers([]);
    setActiveLayerId(null);
    setGeneratedImages([]);
    setPage(null);
    setActiveTab('generate');
    setHistory([]);
    setIsEditingMask(false);

    try {
        const baseParts = [prompt.background ? `background of ${prompt.background}` : '', style.prompt, lighting.prompt, composition.prompt, technicalModifier.prompt].filter(Boolean);
        const baseSuffix = baseParts.length ? `, ${baseParts.join(', ')}` : '';
        const negative = prompt.negativePrompt ? `. Negative prompt: ${prompt.negativePrompt}` : '';

        const views = [
            { name: 'Front View', prefix: `Front view of ${prompt.subject}` },
            { name: 'Back View', prefix: `Back view of ${prompt.subject}, seen from behind` },
            { name: 'Right View', prefix: `Right side profile view of ${prompt.subject}` },
            { name: 'Left View', prefix: `Left side profile view of ${prompt.subject}` }
        ];

        // Generate in parallel
        const promises = views.map(async (view) => {
            const fullPrompt = `${view.prefix}${baseSuffix}${negative}`;
            try {
                const images = await geminiService.generateImage(fullPrompt, { aspectRatio, numberOfImages: 1 });
                return { name: view.name, imageB64: images[0] };
            } catch (e) {
                console.error(`Failed to generate ${view.name}`, e);
                return { name: view.name, imageB64: null, error: e };
            }
        });

        const results = await Promise.all(promises);
        const successfulResults = results.filter(r => r.imageB64 !== null);

        if (successfulResults.length === 0) {
            throw new Error("Failed to generate any views. Please try again.");
        }

        const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });

        const canvasDimensions = canvasRef.current?.getCanvasDimensions();
        if (!canvasDimensions || canvasDimensions.width === 0) {
             throw new Error("Canvas is not ready.");
        }

        // Load all images to determine dimensions
        const loadedImages = await Promise.all(successfulResults.map(async (r) => {
             const src = `data:image/png;base64,${r.imageB64}`;
             const img = await loadImage(src);
             return { ...r, img, src };
        }));

        const firstImg = loadedImages[0].img;
        const newPage: PageState = {
            width: firstImg.width,
            height: firstImg.height,
            x: (canvasDimensions.width - firstImg.width) / 2,
            y: (canvasDimensions.height - firstImg.height) / 2,
            backgroundColor: 'rgb(var(--color-base-200))',
        };
        setPage(newPage);

        const newLayers: Layer[] = loadedImages.map((item, index) => ({
            id: `layer_${Date.now()}_${index}`,
            name: item.name,
            type: LayerType.IMAGE,
            src: item.src,
            isVisible: true,
            opacity: 100,
            x: newPage.x,
            y: newPage.y,
            width: newPage.width,
            height: newPage.height,
            rotation: 0,
            blendMode: 'source-over',
            scaleX: 1,
            scaleY: 1,
        }));

        setLayers(newLayers);
        setActiveLayerId(newLayers[newLayers.length - 1].id);
        updateHistory(newLayers);
        setActiveTab('edit');
        setZoom(1);

    } catch (e: any) {
        console.error(e);
        setError(e.message || 'Failed to generate 4 views. Please try again.');
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [prompt, style, lighting, composition, technicalModifier, aspectRatio, aiEngine, updateHistory]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setGeneratedImages([]);
    setIsEditingMask(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      if (!imageUrl) return;

      if (page && layers.length > 0) {
        // If there's content on the canvas, add the new image as a layer
        const img = new Image();
        img.onload = () => {
          const newLayer: Layer = {
            id: `layer_${Date.now()}`,
            name: file.name,
            type: LayerType.IMAGE,
            src: imageUrl,
            isVisible: true,
            opacity: 100,
            x: page.x + (page.width - img.width) / 2,
            y: page.y + (page.height - img.height) / 2,
            width: img.width,
            height: img.height,
            rotation: 0,
            blendMode: 'source-over',
            scaleX: 1,
            scaleY: 1,
          };
          const newLayers = [...layers, newLayer];
          setLayers(newLayers);
          setActiveLayerId(newLayer.id);
          updateHistory(newLayers);
          setActiveTab('edit');
        };
        img.crossOrigin = 'Anonymous';
        img.src = imageUrl;
      } else {
        // Otherwise, initialize the canvas with this image
        addImageLayer(imageUrl, file.name);
      }
      setEditPrompt('');
    };
    reader.readAsDataURL(file);
  }, [addImageLayer, page, layers, updateHistory]);

  // ... (Other handlers unchanged) ...
  const handleSelectGalleryImage = useCallback((imageUrl: string) => {
    setLayers([]); // Start fresh with the selected image
    addImageLayer(imageUrl, 'Background');
    setGeneratedImages([]);
    setPage(null);
    setIsEditingMask(false);
  }, [addImageLayer]);

  const handleAnalyzeImage = useCallback(async () => {
    if (!canvasRef.current || !page) return;
    setIsLoading(true);
    setLoadingMessage('Analyzing image...');
    setError(null);
    try {
        const flatImageData = await canvasRef.current.getPageContentAsDataURL();
        if (!flatImageData) throw new Error("Could not get canvas data to analyze.");

        const [meta, data] = flatImageData.split(',');
        const mimeType = meta.split(';')[0].split(':')[1];
        
        const description = await geminiService.describeImage(data, mimeType);
        setEditPrompt(description);

    } catch (e: any) {
        console.error(e);
        setError(e.message || 'Failed to analyze the image.');
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [page]);

  // ... (edit/remix/outpaint handlers unchanged) ...
  const handleEdit = useCallback(async () => {
    if (!editPrompt || !canvasRef.current || !activeLayerId) {
      setError('Please enter an editing prompt and select a layer.');
      return;
    }
    if (!page) {
        setError("No page is defined for editing.");
        return;
    }
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) {
        setError("No active layer selected.");
        return;
    }

    const isPixelLayerWithContent = activeLayer.type === LayerType.PIXEL && ((activeLayer.strokes?.length ?? 0) > 0);
    const isImageLayerWithMask = activeLayer.type === LayerType.IMAGE && activeLayer.maskSrc && activeLayer.maskEnabled;

    if (!isPixelLayerWithContent && !isImageLayerWithMask) {
        setError("Please select a pixel layer with a sketch or an image layer with an active mask to guide the edit.");
        return;
    }

    setIsLoading(true);
    setLoadingMessage('Applying creative edits...');
    setError(null);

    try {
        const baseImageDataUrl = await canvasRef.current.getPageContentAsDataURL({ includeBackground: false });
        if (!baseImageDataUrl) throw new Error("Could not get the current page image.");

        const maskDataUrl = await canvasRef.current.getMaskForLayer(activeLayerId);
        if (!maskDataUrl) throw new Error("Could not generate a mask from the selected layer.");
        
        const [baseMeta, baseData] = baseImageDataUrl.split(',');
        const mimeType = baseMeta.split(';')[0].split(':')[1];
        const maskData = maskDataUrl.split(',')[1];
        
        const finalPrompt = `Using the full image as context, apply the following change ONLY to the masked (white) area: ${editPrompt}. Blend the new content seamlessly with the existing visible image.`;

        const result = await geminiService.editImage(baseData, mimeType, finalPrompt, maskData);
      
        if (result.image) {
            const newImageSrc = `data:${mimeType};base64,${result.image}`;

            const newLayer: Layer = {
                id: `layer_${Date.now()}`,
                name: `Edit: ${editPrompt.substring(0, 15)}...`,
                type: LayerType.IMAGE,
                src: newImageSrc,
                isVisible: true,
                opacity: 100,
                x: page.x,
                y: page.y,
                width: page.width,
                height: page.height,
                rotation: 0,
                blendMode: 'source-over',
                scaleX: 1,
                scaleY: 1,
            };

            const activeLayerIndex = layers.findIndex(l => l.id === activeLayerId);
            const newLayers = [...layers];
            newLayers.splice(activeLayerIndex + 1, 0, newLayer);

            setLayers(newLayers);
            setActiveLayerId(newLayer.id);
            updateHistory(newLayers);
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
  }, [editPrompt, layers, activeLayerId, updateHistory, page]);

  const handleRemixImage = useCallback(async () => {
    if (!editPrompt || !canvasRef.current || !hasImage || !page) {
        setError('Please enter a prompt and have an image on the artboard to remix.');
        return;
    }

    setIsLoading(true);
    setLoadingMessage('Remixing your canvas...');
    setError(null);

    try {
        const flatImageData = await canvasRef.current.getPageContentAsDataURL({ includeBackground: false });
        if (!flatImageData) throw new Error("Could not get page data to remix.");

        const [meta, data] = flatImageData.split(',');
        const mimeType = meta.split(';')[0].split(':')[1];
        
        const result = await geminiService.remixImage(data, mimeType, editPrompt, remixPreservation);

        if (result.image) {
            const newImageSrc = `data:${mimeType};base64,${result.image}`;
            
            const newLayer: Layer = {
                id: `layer_${Date.now()}`,
                name: `Remix: ${editPrompt.substring(0, 15)}...`,
                type: LayerType.IMAGE,
                src: newImageSrc,
                isVisible: true,
                opacity: 100,
                x: page.x,
                y: page.y,
                width: page.width,
                height: page.height,
                rotation: 0,
                blendMode: 'source-over',
                scaleX: 1,
                scaleY: 1,
            };

            const newLayers = [...layers, newLayer];
            setLayers(newLayers);
            setActiveLayerId(newLayer.id);
            updateHistory(newLayers);
            setIsEditingMask(false);
        } else {
            setError(result.text || 'The model did not return an image. Try a different prompt or strength.');
        }

    } catch (e: any) {
        console.error(e);
        setError(e.message || 'Failed to remix image. Please try again.');
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [editPrompt, layers, remixPreservation, updateHistory, hasImage, page]);

  const handleTransformPixelLayer = useCallback(async (transformPrompt: string, fidelity: number) => {
    if (!activeLayerId || !canvasRef.current) return;
    const layer = layers.find(l => l.id === activeLayerId);
    if (!layer || layer.type !== LayerType.PIXEL) return;

    setIsLoading(true);
    setLoadingMessage('Transforming layer...');
    setError(null);

    try {
        const rasterResult = await canvasRef.current.rasterizeLayer(activeLayerId);
        if (!rasterResult) throw new Error("Failed to rasterize layer content.");

        const { newImageDataUrl, newWidth, newHeight } = rasterResult;
        const [meta, data] = newImageDataUrl.split(',');
        const mimeType = meta.split(';')[0].split(':')[1];

        const result = await geminiService.remixImage(data, mimeType, transformPrompt, fidelity);

        if (result.image) {
            const transformedImageSrc = `data:${mimeType};base64,${result.image}`;
            
            // Load image to get true dimensions
            const img = new Image();
            img.onload = () => {
                 const newLayer: Layer = {
                    ...layer,
                    id: `layer_${Date.now()}`, 
                    type: LayerType.IMAGE,
                    name: `Transformed: ${layer.name}`,
                    src: transformedImageSrc,
                    strokes: undefined,
                    width: img.width,
                    height: img.height,
                    // Keep original position approximately
                    x: layer.x,
                    y: layer.y
                 };
                 
                 // Replace old layer
                 const layerIndex = layers.findIndex(l => l.id === activeLayerId);
                 const newLayers = [...layers];
                 newLayers[layerIndex] = newLayer;
                 setLayers(newLayers);
                 setActiveLayerId(newLayer.id);
                 updateHistory(newLayers);
            };
            img.src = transformedImageSrc;

        } else {
             setError(result.text || 'Transformation failed.');
        }

    } catch (e: any) {
        setError(e.message || "Error transforming layer.");
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [activeLayerId, layers, updateHistory]);

  const handleOutpaint = useCallback(async (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!canvasRef.current) return;
    setIsLoading(true);
    setLoadingMessage('Expanding the scene...');
    setError(null);
    try {
      const flatImageData = await canvasRef.current.getPageContentAsDataURL({ includeBackground: true });
      if (!flatImageData) throw new Error("Could not get flattened canvas data.");

      const { data, mimeType, maskData, pasteX, pasteY, newWidth, newHeight } = await canvasRef.current.getExpandedCanvasData(flatImageData, direction, outpaintAmount);
      const finalOutpaintPrompt = `The masked (white) area indicates new empty space to be filled. ${outpaintPrompt}`;
      const result = await geminiService.editImage(data, mimeType, finalOutpaintPrompt, maskData);
      
      if (result.image) {
        const imageUrl = `data:image/png;base64,${result.image}`;
        addImageLayer(imageUrl, `Outpaint ${direction}`);
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
  }, [outpaintPrompt, outpaintAmount, layers, updateHistory, addImageLayer]);

  // ... (cropping, layer mgmt, mask mgmt, undo/reset, handlers mostly unchanged) ...
  useEffect(() => {
    if (collapseRequest === 0) return;

    const performCollapse = () => {
        if (!canvasRef.current) return;

        setIsLoading(true);
        setLoadingMessage('Merging layers...');
        setError(null);

        setTimeout(async () => {
            try {
                const dataUrl = await canvasRef.current!.getPageContentAsDataURL({ includeBackground: true });
                const dimensions = page;
                
                if (dataUrl && dimensions) {
                    const newLayer: Layer = {
                        id: `layer_${Date.now()}`,
                        name: 'Merged Layer',
                        type: LayerType.IMAGE,
                        src: dataUrl,
                        isVisible: true,
                        opacity: 100,
                        x: dimensions.x,
                        y: dimensions.y,
                        width: dimensions.width,
                        height: dimensions.height,
                        rotation: 0,
                        blendMode: 'source-over',
                        scaleX: 1,
                        scaleY: 1,
                    };
                    const newLayers = [newLayer];
                    setLayers(newLayers);
                    setActiveLayerId(newLayer.id);
                    updateHistory(newLayers);
                    setIsEditingMask(false);
                } else {
                    throw new Error("Could not merge layers. The page may be empty.");
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

  }, [collapseRequest, updateHistory, page]);


  // --- Layer Management ---
  const handleAddLayer = useCallback((type: LayerType) => {
    const layerName = type === LayerType.PIXEL ? `Pixel Layer ${layers.filter(l => l.type === LayerType.PIXEL).length + 1}` : `Adjustment Layer ${layers.filter(l => l.type === LayerType.ADJUSTMENT).length + 1}`;
    const newLayer: Layer = {
      id: `layer_${Date.now()}`,
      name: layerName,
      type: type,
      isVisible: true,
      opacity: 100,
      x: page?.x || 0,
      y: page?.y || 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      blendMode: 'source-over',
    };
    if (type === LayerType.PIXEL) {
        newLayer.strokes = [];
    }
    if (type === LayerType.ADJUSTMENT) {
        newLayer.adjustments = { ...DEFAULT_ADJUSTMENTS };
    }
    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    setActiveLayerId(newLayer.id);
    updateHistory(newLayers);
    setIsEditingMask(false);
  }, [layers, updateHistory, page]);

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
    setPage(null);
    setIsEditingMask(false);
    setZoom(1);
  }, []);

  const handleDeleteLayer = useCallback((id: string) => {
    const newLayers = layers.filter(l => l.id !== id);
    if (newLayers.length > 0) {
      setLayers(newLayers);
      if (activeLayerId === id) {
        setActiveLayerId(newLayers[newLayers.length - 1].id);
        setIsEditingMask(false);
      }
      updateHistory(newLayers);
    } else {
      resetImage();
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
    setEditMode(EditMode.SKETCH); // Switch to sketch mode for mask painting
  }, []);

  const handleUpdateLayer = useCallback((id: string, updates: Partial<Layer> | ((layer: Layer) => Partial<Layer>)) => {
      setLayers(currentLayers => currentLayers.map(l => {
        if (l.id === id) {
          const newUpdates = typeof updates === 'function' ? updates(l) : updates;
          return { ...l, ...newUpdates };
        }
        return l;
      }));
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
          const rasterizeResult = await canvasRef.current?.rasterizeLayer(layerId);
          if (!rasterizeResult) {
              throw new Error("Failed to get rasterization data from canvas.");
          }
  
          const { newImageDataUrl, newMaskDataUrl, newWidth, newHeight } = rasterizeResult;
          
          const newLayers = layers.map(l => {
              if (l.id === layerId) {
                  return {
                      ...l,
                      src: newImageDataUrl,
                      maskSrc: newMaskDataUrl,
                      x: l.x + ((l.width ?? newWidth) - newWidth) / 2,
                      y: l.y + ((l.height ?? newHeight) - newHeight) / 2,
                      width: newWidth,
                      height: newHeight,
                      rotation: 0,
                      scaleX: 1, 
                      scaleY: 1, 
                  };
              }
              return l;
          });
  
          setLayers(newLayers);
          updateHistory(newLayers);
  
      } catch(e: any) {
          console.error("Failed to rasterize layer:", e);
          setError(e.message || "An error occurred while finalizing the transformation.");
          updateHistory(layers);
      } finally {
          setIsLoading(false);
          setLoadingMessage('');
      }
  }, [layers, updateHistory]);

  // --- Mask Management, Undo/Reset, Stroke interactions... (unchanged) ---
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
  
  const handleInvertLayerMask = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !layer.maskSrc) return;

    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        
        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 0) { 
                    data[i + 3] = 0; 
                } else { 
                    data[i] = 255;     
                    data[i + 1] = 255; 
                    data[i + 2] = 255; 
                    data[i + 3] = 255; 
                }
            }

            ctx.putImageData(imageData, 0, 0);
            const invertedMaskSrc = canvas.toDataURL();
            
            const newLayers = layers.map(l => 
                l.id === layerId 
                    ? { ...l, maskSrc: invertedMaskSrc } 
                    : l
            );
            setLayers(newLayers);
            updateHistory(newLayers);
        } catch (e) {
            console.error("Failed to invert mask due to canvas security restrictions (CORS).", e);
            setError("Could not invert the mask. The mask image might be from a different origin and cannot be modified.");
        }
    };
    img.crossOrigin = "anonymous";
    img.src = layer.maskSrc;
  }, [layers, updateHistory]);

  const handleUpdateLayerMask = useCallback((layerId: string, maskDataUrl: string) => {
    setLayers(currentLayers => currentLayers.map(l => l.id === layerId ? { ...l, maskSrc: maskDataUrl } : l));
  }, []);

  const handleAutoMask = useCallback(async () => {
    if (!canvasRef.current || !activeLayerId || !autoMaskPrompt) {
        setError("Please select a layer and enter what you want to mask.");
        return;
    }

    setIsLoading(true);
    setLoadingMessage('Finding objects to mask...');
    setError(null);

    try {
        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (!activeLayer || (activeLayer.type !== LayerType.IMAGE && activeLayer.type !== LayerType.PIXEL)) {
            throw new Error("Only Image or Pixel layers can be auto-masked.");
        }

        let imageDataUrlForMasking: string | null = null;
        
        if (activeLayer.type === LayerType.IMAGE && activeLayer.src) {
            imageDataUrlForMasking = activeLayer.src;
        } else {
            imageDataUrlForMasking = await canvasRef.current.getPageContentAsDataURL();
        }

        if (!imageDataUrlForMasking) {
            throw new Error("Could not get image data for the selected layer.");
        }
        
        const [meta, data] = imageDataUrlForMasking.split(',');
        const mimeType = meta.split(';')[0].split(':')[1];

        const result = await geminiService.findAndMaskObjects(data, mimeType, autoMaskPrompt);
        if (!result.image) {
          throw new Error(result.text || "The AI could not generate a mask from your prompt. Try being more specific.");
        }

        const newMaskDataUrl = `data:image/png;base64,${result.image}`;

        const newLayers = layers.map(l => 
            l.id === activeLayerId 
                ? { ...l, maskSrc: newMaskDataUrl, maskEnabled: true } 
                : l
        );
        setLayers(newLayers);
        updateHistory(newLayers);
        handleSelectLayerMask(activeLayerId);

    } catch (e: any) {
        console.error(e);
        setError(e.message || 'Failed to generate mask.');
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
}, [activeLayerId, autoMaskPrompt, layers, updateHistory, handleSelectLayerMask]);
  
  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const newHistory = [...history];
    newHistory.pop(); // Remove current state
    const previousState = newHistory[newHistory.length - 1];
    setHistory(newHistory);
    setLayers(previousState);
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
          return { ...l, strokes: [] };
        }
      }
      return l;
    });
    setLayers(newLayers);
    updateHistory(newLayers);
  }, [layers, activeLayerId, isEditingMask, updateHistory]);

  const handleAddStroke = useCallback((stroke: Stroke) => {
    if (!activeLayerId) return;
    setLayers(currentLayers => currentLayers.map(l => {
        if (l.id === activeLayerId && l.type === LayerType.PIXEL) {
            return { ...l, strokes: [...(l.strokes || []), stroke] };
        }
        return l;
    }));
  }, [activeLayerId]);

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
  
  const handleResetAppData = useCallback(() => {
    try {
      localStorage.removeItem('colorPresets');
      localStorage.removeItem('pexelsApiKey');
      localStorage.removeItem('comfyUIServerAddress');
      setThemeName(DEFAULT_THEME.name);
      setColorPresets(INITIAL_COLOR_PRESETS);
      setPexelsApiKey('');
      setComfyUIServerAddress('http://127.0.0.1:8188');
      setComfyUIConnectionStatus('disconnected');
    } catch (e) {
      console.error("Failed to clear custom data:", e);
      setError("Could not clear custom data. There might be a browser issue.");
    }
  }, []);

  const handlePageSizeChange = useCallback((width: number, height: number) => {
    setPage(prev => {
        if (!prev) return null;
        const canvasDimensions = canvasRef.current?.getCanvasDimensions();
        if (!canvasDimensions) return prev;
        return {
            ...prev,
            width,
            height,
            x: (canvasDimensions.width - width) / 2,
            y: (canvasDimensions.height - height) / 2,
        };
    });
  }, []);

  const handlePromptChange = (part: PromptPart, value: string) => setPrompt(prev => ({ ...prev, [part]: value }));
  const handleToggleThemeMode = useCallback(() => setIsDarkMode(prev => !prev), []);

  const handleImageFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
    e.target.value = '';
  }, [handleImageUpload]);

  const handleProjectFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const content = ev.target?.result as string;
                const projectData = JSON.parse(content);
                if (projectData.layers) setLayers(projectData.layers);
                if (projectData.prompt) setPrompt(projectData.prompt);
                if (projectData.page) setPage(projectData.page);
                if (projectData.style) setStyle(projectData.style);
                if (projectData.lighting) setLighting(projectData.lighting);
                if (projectData.composition) setComposition(projectData.composition);
                
                setHistory([]);
                setActiveLayerId(projectData.layers && projectData.layers.length > 0 ? projectData.layers[projectData.layers.length-1].id : null);
                setGeneratedImages([]);
                setIsOpenOptionsOpen(false);
                setZoom(1);
            } catch (err) {
                setError("Failed to load project file.");
            }
        };
        reader.readAsText(file);
    }
    e.target.value = '';
  }, []);

  const handleStyleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        if (e.target?.result) {
            setStyleImage(e.target.result as string);
            setActiveTab('edit');
        }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleOpenProjectClick = useCallback(() => {
    projectFileInputRef.current?.click();
  }, []);

  const handleOpenImageClick = useCallback(() => {
    imageFileInputRef.current?.click();
    setIsOpenOptionsOpen(false);
  }, []);

  const handleExportImage = useCallback(() => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.getCanvasAsDataURL({ format: exportFormat, quality: jpegQuality / 100 });
    if (dataUrl) {
        const link = document.createElement('a');
        link.download = `image-export.${exportFormat}`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    setIsExportModalOpen(false);
  }, [exportFormat, jpegQuality]);

  const handleSaveProject = useCallback(() => {
    const projectData = {
        layers,
        prompt,
        page,
        style,
        lighting,
        composition,
        date: new Date().toISOString()
    };
    const json = JSON.stringify(projectData, null, 2);
    const blob = new Blob([json], { type: "application/csp" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = "project.csp";
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [layers, prompt, page, style, lighting, composition]);

  const handleRewritePrompt = useCallback(async (part: PromptPart | 'edit') => {
    if (rewritingPrompt || randomizingPrompt) return;
    const currentPrompt = part === 'edit' ? editPrompt : prompt[part];
    if (!currentPrompt) return;
    
    setRewritingPrompt(part);
    try {
        const rewritten = await geminiService.rewritePrompt(currentPrompt, part);
        if (part === 'edit') setEditPrompt(rewritten);
        else setPrompt(prev => ({ ...prev, [part]: rewritten }));
    } catch (e: any) {
        setError(e.message || "Failed to rewrite prompt.");
    } finally {
        setRewritingPrompt(null);
    }
  }, [prompt, editPrompt, rewritingPrompt, randomizingPrompt]);

  const handleRandomPrompt = useCallback(async (part: PromptPart | 'edit') => {
    if (rewritingPrompt || randomizingPrompt) return;
    setRandomizingPrompt(part);
    try {
        const random = await geminiService.generateRandomPrompt(part);
        if (part === 'edit') setEditPrompt(random);
        else setPrompt(prev => ({ ...prev, [part]: random }));
    } catch (e: any) {
        setError(e.message || "Failed to generate random prompt.");
    } finally {
        setRandomizingPrompt(null);
    }
  }, [rewritingPrompt, randomizingPrompt]);

  const handleGetSuggestions = useCallback(async (part: PromptPart, value: string) => {
    setSuggestionsLoading(part);
    try {
        const suggestions = await geminiService.getPromptSuggestions(value, part);
        if (part === 'subject') setSubjectSuggestions(suggestions);
        else if (part === 'background') setBackgroundSuggestions(suggestions);
        else if (part === 'negativePrompt') setNegativePromptSuggestions(suggestions);
    } catch (e) {
        console.error("Failed to get suggestions", e);
    } finally {
        setSuggestionsLoading(null);
    }
  }, []);

  const handleAddColorPreset = useCallback(() => {
    if (!colorPresets.includes(brushColor)) {
        const newPresets = [...colorPresets, brushColor];
        setColorPresets(newPresets);
        localStorage.setItem('colorPresets', JSON.stringify(newPresets));
    }
  }, [colorPresets, brushColor]);

  const handlePexelsSearch = useCallback(async (query: string, mode: 'new' | 'more') => {
    if (!pexelsApiKey) {
        setError("Please add a Pexels API Key in Settings.");
        return;
    }
    
    setIsPexelsLoading(true);
    setPexelsError(null);
    try {
        const pageToFetch = mode === 'new' ? 1 : pexelsPage + 1;
        const photos = await geminiService.searchPexelsPhotos(pexelsApiKey, query, pageToFetch);
        if (mode === 'new') {
            setPexelsPhotos(photos);
            setPexelsPage(1);
        } else {
            setPexelsPhotos(prev => [...prev, ...photos]);
            setPexelsPage(pageToFetch);
        }
    } catch (e: any) {
        setPexelsError(e.message);
    } finally {
        setIsPexelsLoading(false);
    }
  }, [pexelsApiKey, pexelsPage]);

  const handleSelectPexelsImage = useCallback((photo: PexelsPhoto) => {
    addImageLayer(photo.src.large2x, `Pexels: ${photo.alt || 'Photo'}`);
  }, [addImageLayer]);

  const handleRemoveStyleImage = useCallback(() => {
    setStyleImage(null);
  }, []);

  const handleApplyStyleTransfer = useCallback(async () => {
    if (!canvasRef.current || !styleImage || !hasImage || !page) return;
    setIsLoading(true);
    setLoadingMessage('Applying style transfer...');
    setError(null);
    
    try {
        const contentDataUrl = await canvasRef.current.getPageContentAsDataURL({ includeBackground: true });
        if (!contentDataUrl) throw new Error("Could not capture canvas content.");
        
        const [cMeta, cData] = contentDataUrl.split(',');
        const cMime = cMeta.split(';')[0].split(':')[1];
        
        const [sMeta, sData] = styleImage.split(',');
        const sMime = sMeta.split(';')[0].split(':')[1];
        
        const result = await geminiService.applyStyleTransfer(cData, cMime, sData, sMime, styleStrength);
        
        if (result.image) {
             const newImageSrc = `data:${cMime};base64,${result.image}`;
             const newLayer: Layer = {
                id: `layer_${Date.now()}`,
                name: `Style Transfer`,
                type: LayerType.IMAGE,
                src: newImageSrc,
                isVisible: true,
                opacity: 100,
                x: page.x,
                y: page.y,
                width: page.width,
                height: page.height,
             };
             const newLayers = [...layers, newLayer];
             setLayers(newLayers);
             setActiveLayerId(newLayer.id);
             updateHistory(newLayers);
             setActiveTab('edit');
        } else {
            setError(result.text || "Failed to transfer style.");
        }
    } catch (e: any) {
        setError(e.message || "Failed to transfer style.");
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [styleImage, hasImage, styleStrength, layers, page, updateHistory]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.1));

  return (
    <>
      <input type="file" ref={imageFileInputRef} onChange={handleImageFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
      <input type="file" ref={projectFileInputRef} onChange={handleProjectFileChange} accept=".csp" className="hidden" />
      <input type="file" ref={styleImageFileInputRef} onChange={(e) => { e.target.files && handleStyleImageUpload(e.target.files[0])}} accept="image/png, image/jpeg, image/webp" className="hidden" />


      {/* Modals ... (Unchanged) ... */}
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
                        <option value="png">PNG (Transparent)</option>
                        <option value="jpeg">JPEG (Smaller Size)</option>
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
            subjectSuggestions={subjectSuggestions} backgroundSuggestions={backgroundSuggestions} negativePromptSuggestions={negativePromptSuggestions}
            suggestionsLoading={suggestionsLoading}
            editPrompt={editPrompt} setEditPrompt={setEditPrompt} style={style} setStyle={setStyle} lighting={lighting} setLighting={setLighting}
            composition={composition} setComposition={setComposition} technicalModifier={technicalModifier} setTechnicalModifier={setTechnicalModifier}
            aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
            onGenerate={handleGenerate} onGenerateFourViews={handleGenerateFourViews} onEdit={handleEdit} onAnalyzeImage={handleAnalyzeImage} onOutpaint={handleOutpaint} outpaintPrompt={outpaintPrompt} setOutpaintPrompt={setOutpaintPrompt}
            outpaintAmount={outpaintAmount} setOutpaintAmount={setOutpaintAmount} 
            onOpenOptionsClick={() => setIsOpenOptionsOpen(true)} isLoading={isLoading} hasImage={hasImage} editMode={editMode} setEditMode={setEditMode}
            brushSize={brushSize} setBrushSize={setBrushSize} brushColor={brushColor} setBrushColor={setBrushColor} onClear={clearCanvas}
            onReset={resetImage} onUndo={handleUndo} canUndo={canUndo}
            onClearCustomShapes={handleResetAppData}
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
            onTransformPixelLayer={handleTransformPixelLayer}
            // Mask props
            isEditingMask={isEditingMask} onSelectLayerMask={handleSelectLayerMask} onAddLayerMask={handleAddLayerMask}
            onDeleteLayerMask={handleDeleteLayerMask} onAutoMask={handleAutoMask}
            onInvertLayerMask={handleInvertLayerMask}
            autoMaskPrompt={autoMaskPrompt} setAutoMaskPrompt={setAutoMaskPrompt}
            // Pexels Props
            onPexelsSearch={handlePexelsSearch}
            pexelsPhotos={pexelsPhotos}
            isPexelsLoading={isPexelsLoading}
            pexelsError={pexelsError}
            onSelectPexelsImage={handleSelectPexelsImage}
            pexelsApiKey={pexelsApiKey}
            onSetPexelsApiKey={handleSetPexelsApiKey}
            // Image to Image props
            onRemixImage={handleRemixImage}
            remixPreservation={remixPreservation}
            setRemixPreservation={setRemixPreservation}
            // Style Transfer props
            styleImage={styleImage}
            onStyleImageUpload={() => styleImageFileInputRef.current?.click()}
            onRemoveStyleImage={handleRemoveStyleImage}
            onApplyStyleTransfer={handleApplyStyleTransfer}
            styleStrength={styleStrength}
            setStyleStrength={setStyleStrength}
            // AI Engine props
            aiEngine={aiEngine}
            onAiEngineChange={setAiEngine}
            // ComfyUI props
            comfyUIServerAddress={comfyUIServerAddress}
            onComfyUIServerAddressChange={handleSetComfyUIServerAddress}
            comfyUIConnectionStatus={comfyUIConnectionStatus}
            onConnectToComfyUI={handleConnectToComfyUI}
            comfyUICheckpointModels={comfyUICheckpointModels}
            comfyUILoraModels={comfyUILoraModels}
            selectedComfyUICheckpoint={selectedComfyUICheckpoint}
            onSelectedComfyUICheckpointChange={setSelectedComfyUICheckpoint}
            selectedComfyUILora={selectedComfyUILora}
            onSelectedComfyUILoraChange={setSelectedComfyUILora}
            comfyUIWorkflows={COMFYUI_WORKFLOWS}
            selectedComfyUIWorkflow={selectedComfyUIWorkflow}
            onSelectedComfyUIWorkflowChange={setSelectedComfyUIWorkflow}
            // Page props
            page={page}
            onPageSizeChange={handlePageSizeChange}
          />
          {error && (<div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md text-sm"><p className="font-semibold">Error</p><p>{error}</p></div>)}
        </aside>
        <main className="flex-1 flex items-center justify-center bg-base-100/50 relative overflow-hidden">
          <button onClick={() => setIsPanelOpen(true)} className="md:hidden fixed bottom-4 left-4 z-30 bg-brand-primary text-white p-3 rounded-full shadow-lg hover:bg-brand-primary/80 transition-colors" aria-label="Open controls panel"><SettingsIcon /></button>
          <div className="w-full h-full flex items-center justify-center relative">
            {hasImage && !isLoading && (
              <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
                <button onClick={handleSaveProject} className="bg-base-200/80 hover:bg-brand-primary text-text-primary hover:text-white p-2 rounded-full transition-colors duration-200" aria-label="Save Project" title="Save Project"><SaveProjectIcon /></button>
                <button onClick={() => setIsExportModalOpen(true)} className="bg-base-200/80 hover:bg-brand-primary text-text-primary hover:text-white p-2 rounded-full transition-colors duration-200" aria-label="Export Image" title="Export Image"><DownloadIcon /></button>
                 {page && (<div className="absolute top-full right-0 mt-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md pointer-events-none">{page.width} x {page.height}px</div>)}
              </div>
            )}
            
            {hasImage && !isLoading && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-base-200/80 p-2 rounded-full shadow-md backdrop-blur-sm">
                    <button onClick={handleZoomOut} className="p-1 hover:text-brand-primary transition-colors text-text-secondary"><ZoomOutIcon /></button>
                    <span className="text-xs font-semibold w-12 text-center text-text-primary">{Math.round(zoom * 100)}%</span>
                    <button onClick={handleZoomIn} className="p-1 hover:text-brand-primary transition-colors text-text-secondary"><ZoomInIcon /></button>
                </div>
            )}

            {generatedImages.length > 0 ? (
              <ImageGallery images={generatedImages} onSelectImage={handleSelectGalleryImage} />
            ) : (
              <ImageCanvas
                ref={canvasRef}
                layers={layers}
                page={page}
                activeLayerId={activeLayerId}
                isEditingMask={isEditingMask}
                isLoading={isLoading} loadingMessage={loadingMessage} editMode={editMode} brushSize={brushSize} brushColor={brushColor}
                onUploadClick={handleOpenImageClick}
                selectedShapeId={null} onAddStroke={handleAddStroke} 
                onAddShape={() => {}}
                onUpdateShape={() => {}} onSelectShape={() => {}} 
                onShapeInteractionEnd={() => {}}
                onStrokeInteractionEnd={handleStrokeInteractionEnd}
                onUpdateLayerMask={handleUpdateLayerMask}
                onUpdateLayer={handleUpdateLayer}
                onInteractionEndWithHistory={() => updateHistory(layers)}
                onLayerTransformEnd={handleLayerTransformEnd}
                zoom={zoom}
              />
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default App;
