
import React, { useState, useEffect } from 'react';
import { EditMode, ImageStyle, Filter, PromptState, PromptPart, LightingStyle, CompositionRule, ClipArtShape, PlacedShape, ClipArtCategory, TechnicalModifier, ImageAdjustments, Layer, LayerType, Theme, PexelsPhoto } from '../types';
import { INITIAL_STYLES, SUPPORTED_ASPECT_RATIOS, FILTERS, LIGHTING_STYLES, COMPOSITION_RULES, TECHNICAL_MODIFIERS } from '../constants';
import { BrushIcon, ClearIcon, DrawIcon, EditIcon, GenerateIcon, MaskIcon, ResetIcon, FilterIcon, RewriteIcon, RandomIcon, UploadIcon, OutpaintIcon, ArrowUpIcon, ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, CropIcon, IdeaIcon, UndoIcon, SaveIcon, RotateIcon, SettingsIcon, CloseIcon, CopyIcon, CheckIcon, LogoIcon, AddIcon, OpenProjectIcon, PexelsIcon, ChevronDownIcon, SearchIcon, MoveIcon } from './Icons';
import { ThemeSwitcher } from './ThemeSwitcher';
import { LayersPanel } from './LayersPanel';

type Tab = 'generate' | 'edit' | 'settings';

interface ControlPanelProps {
  onClose: () => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  prompt: PromptState;
  onPromptChange: (part: PromptPart, value: string) => void;
  onRewritePrompt: (part: PromptPart | 'edit') => void;
  rewritingPrompt: PromptPart | 'edit' | null;
  onRandomPrompt: (part: PromptPart | 'edit') => void;
  randomizingPrompt: PromptPart | 'edit' | null;
  onGetSuggestions: (part: PromptPart, value: string) => void;
  subjectSuggestions: string[];
  backgroundSuggestions: string[];
  suggestionsLoading: PromptPart | null;
  editPrompt: string;
  setEditPrompt: (value: string) => void;
  style: ImageStyle;
  setStyle: (style: ImageStyle) => void;
  lighting: LightingStyle;
  setLighting: (style: LightingStyle) => void;
  composition: CompositionRule;
  setComposition: (rule: CompositionRule) => void;
  technicalModifier: TechnicalModifier;
  setTechnicalModifier: (modifier: TechnicalModifier) => void;
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
  numImages: number;
  setNumImages: (value: number) => void;
  onGenerate: () => void;
  onEdit: () => void;
  onAnalyzeImage: () => void;
  onOutpaint: (direction: 'up' | 'down' | 'left' | 'right') => void;
  outpaintPrompt: string;
  setOutpaintPrompt: (prompt: string) => void;
  outpaintAmount: number;
  setOutpaintAmount: (amount: number) => void;
  onOpenOptionsClick: () => void;
  isLoading: boolean;
  hasImage: boolean;
  editMode: EditMode;
  setEditMode: (mode: EditMode) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  onClear: () => void;
  onReset: () => void;
  onUndo: () => void;
  canUndo: boolean;
  clipArtCategories: ClipArtCategory[];
  selectedClipArtCategoryName: string;
  setSelectedClipArtCategoryName: (name: string) => void;
  onSaveShape: (name: string) => void;
  selectedShapeId: string | null;
  onDeleteSelectedShape: () => void;
  onClearCustomShapes: () => void;
  colorPresets: string[];
  onAddColorPreset: () => void;
  // Theme props
  themes: Theme[];
  activeTheme: string;
  onThemeChange: (themeName: string) => void;
  isDarkMode: boolean;
  onToggleThemeMode: () => void;
  // Layer props
  layers: Layer[];
  activeLayerId: string | null;
  onAddLayer: (type: LayerType) => void;
  onDeleteLayer: (id: string) => void;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (id: string, updates: Partial<Layer> | ((layer: Layer) => Partial<Layer>)) => void;
  onReorderLayers: (dragId: string, dropId: string) => void;
  onCollapseLayers: () => void;
  onLayerAdjustmentChange: (adjustment: keyof ImageAdjustments, value: number) => void;
  onResetLayerAdjustments: () => void;
  onLayerFilterChange: (filterName: string) => void;
  onInteractionEndWithHistory: () => void;
  // Mask props
  isEditingMask: boolean;
  onSelectLayerMask: (id: string) => void;
  onAddLayerMask: (id: string) => void;
  onDeleteLayerMask: (id: string) => void;
  onAutoMask: () => void;
  autoMaskPrompt: string;
  setAutoMaskPrompt: (prompt: string) => void;
  // Pexels props
  onPexelsSearch: (query: string, mode: 'new' | 'more') => void;
  pexelsPhotos: PexelsPhoto[];
  isPexelsLoading: boolean;
  pexelsError: string | null;
  onSelectPexelsImage: (photo: PexelsPhoto) => void;
  pexelsApiKey: string;
  onSetPexelsApiKey: (key: string) => void;
}

const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};


const TabButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}> = ({ label, icon, isActive, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md transition text-sm font-semibold
      ${isActive ? 'bg-brand-primary text-white' : 'bg-base-100 hover:bg-base-300 text-text-secondary'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    {icon} {label}
  </button>
);

const MiniLoader: React.FC = () => (
    <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const InteractivePromptInput: React.FC<{
  part: PromptPart;
  label: string;
  placeholder: string;
  prompt: PromptState;
  onPromptChange: (part: PromptPart, value: string) => void;
  onRewritePrompt: (part: PromptPart) => void;
  rewritingPrompt: PromptPart | null;
  onRandomPrompt: (part: PromptPart | 'edit') => void;
  randomizingPrompt: PromptPart | 'edit' | null;
  onGetSuggestions: (part: PromptPart, value: string) => void;
  suggestions: string[];
  suggestionsLoading: boolean;
  isLoading: boolean;
}> = ({ part, label, placeholder, prompt, onPromptChange, onRewritePrompt, rewritingPrompt, onRandomPrompt, randomizingPrompt, onGetSuggestions, suggestions, suggestionsLoading, isLoading }) => {
    const debouncedPrompt = useDebounce(prompt[part], 600);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (debouncedPrompt) {
            onGetSuggestions(part, debouncedPrompt);
        }
    }, [debouncedPrompt, part, onGetSuggestions]);

    const handleSuggestionClick = (suggestion: string) => {
        const currentValue = prompt[part];
        const separator = currentValue.trim() === '' ? '' : ', ';
        onPromptChange(part, `${currentValue}${separator}${suggestion}`);
    };

    const handleCopy = () => {
      navigator.clipboard.writeText(prompt[part]).then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      });
    };

    const handleClear = () => {
        onPromptChange(part, '');
    };

    return (
      <div>
        <label htmlFor={`prompt-${part}`} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <div className="relative">
          <textarea
            id={`prompt-${part}`}
            rows={2}
            value={prompt[part]}
            onChange={(e) => onPromptChange(part, e.target.value)}
            placeholder={placeholder}
            className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition pr-36 text-text-primary"
            disabled={isLoading || !!rewritingPrompt || !!randomizingPrompt}
          />
          <div className="absolute top-2 right-2 flex items-center space-x-1">
            <button
                onClick={handleClear}
                disabled={isLoading || !prompt[part]}
                className="p-1 rounded-full bg-base-200/50 text-text-secondary hover:bg-brand-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                aria-label={`Clear ${part} prompt`}
                title={`Clear ${part} prompt`}
            >
                <CloseIcon />
            </button>
            <button
                onClick={handleCopy}
                disabled={isLoading || !prompt[part]}
                className="p-1 rounded-full bg-base-200/50 text-text-secondary hover:bg-brand-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                aria-label={`Copy ${part} prompt`}
                title={isCopied ? 'Copied!' : `Copy ${part} prompt`}
            >
                {isCopied ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button
                onClick={() => onRandomPrompt(part)}
                disabled={isLoading || !!rewritingPrompt || !!randomizingPrompt}
                className="p-1 rounded-full bg-base-200/50 text-text-secondary hover:bg-brand-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                aria-label={`Generate random ${part} prompt`}
                title={`Generate random ${part} prompt`}
            >
                {randomizingPrompt === part ? <MiniLoader /> : <RandomIcon />}
            </button>
            <button
                onClick={() => onRewritePrompt(part)}
                disabled={isLoading || !!rewritingPrompt || !!randomizingPrompt || !prompt[part]}
                className="p-1 rounded-full bg-base-200/50 text-text-secondary hover:bg-brand-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                aria-label={`Enhance ${part} prompt`}
                title={`Enhance ${part} prompt`}
            >
                {rewritingPrompt === part ? <MiniLoader /> : <RewriteIcon />}
            </button>
          </div>
        </div>
        {(suggestionsLoading || suggestions.length > 0) && (
            <div className="mt-2 p-2 bg-base-200 rounded-md">
                <p className="text-xs font-semibold text-text-secondary mb-1 flex items-center gap-1"><IdeaIcon /> Inspiration</p>
                {suggestionsLoading ? (
                    <p className="text-xs text-text-secondary animate-pulse">Getting ideas...</p>
                ) : (
                    <div className="flex flex-wrap gap-1">
                        {suggestions.map((s, i) => (
                            <button 
                                key={i} 
                                onClick={() => handleSuggestionClick(s)} 
                                className="text-xs bg-base-100 hover:bg-brand-primary hover:text-white text-text-secondary px-2 py-1 rounded-full transition-colors"
                            >
                                + {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>
    );
};


const GenerateTab: React.FC<Pick<ControlPanelProps, 'prompt' | 'onPromptChange' | 'onRewritePrompt' | 'rewritingPrompt' | 'onRandomPrompt' | 'randomizingPrompt' | 'onGetSuggestions' | 'subjectSuggestions' | 'backgroundSuggestions' | 'suggestionsLoading' | 'style' | 'setStyle' | 'lighting' | 'setLighting' | 'composition' | 'setComposition' | 'technicalModifier' | 'setTechnicalModifier' | 'aspectRatio' | 'setAspectRatio' | 'numImages' | 'setNumImages' | 'onGenerate' | 'isLoading'>> = ({
  prompt, onPromptChange, onRewritePrompt, rewritingPrompt, onRandomPrompt, randomizingPrompt, onGetSuggestions, subjectSuggestions, backgroundSuggestions, suggestionsLoading, style, setStyle, lighting, setLighting, composition, setComposition, technicalModifier, setTechnicalModifier, aspectRatio, setAspectRatio, numImages, setNumImages, onGenerate, isLoading
}) => (
  <div className="flex flex-col space-y-4">
    <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">1. Describe Your Image</h2>
    <InteractivePromptInput 
      part="subject" 
      label="Subject" 
      placeholder="e.g., A majestic lion" 
      prompt={prompt} 
      onPromptChange={onPromptChange} 
      onRewritePrompt={onRewritePrompt} 
      rewritingPrompt={rewritingPrompt} 
      onRandomPrompt={onRandomPrompt} 
      randomizingPrompt={randomizingPrompt} 
      onGetSuggestions={onGetSuggestions}
      suggestions={subjectSuggestions}
      suggestionsLoading={suggestionsLoading === 'subject'}
      isLoading={isLoading} 
    />
    <InteractivePromptInput 
      part="background" 
      label="Background" 
      placeholder="e.g., on a rocky cliff at sunset" 
      prompt={prompt} 
      onPromptChange={onPromptChange} 
      onRewritePrompt={onRewritePrompt} 
      rewritingPrompt={rewritingPrompt} 
      onRandomPrompt={onRandomPrompt} 
      randomizingPrompt={randomizingPrompt} 
      onGetSuggestions={onGetSuggestions}
      suggestions={backgroundSuggestions}
      suggestionsLoading={suggestionsLoading === 'background'}
      isLoading={isLoading} 
    />
    
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label htmlFor="style" className="block text-sm font-medium text-text-secondary mb-1">Artistic Style</label>
        <select id="style" value={style.name} onChange={(e) => setStyle(INITIAL_STYLES.find(s => s.name === e.target.value) || INITIAL_STYLES[0])} className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition" disabled={isLoading || !!rewritingPrompt || !!randomizingPrompt}>
          {INITIAL_STYLES.map(s => <option key={s.name}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="lighting" className="block text-sm font-medium text-text-secondary mb-1">Lighting Style</label>
        <select id="lighting" value={lighting.name} onChange={(e) => setLighting(LIGHTING_STYLES.find(l => l.name === e.target.value) || LIGHTING_STYLES[0])} className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition" disabled={isLoading || !!rewritingPrompt || !!randomizingPrompt}>
          {LIGHTING_STYLES.map(l => <option key={l.name}>{l.name}</option>)}
        </select>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label htmlFor="composition" className="block text-sm font-medium text-text-secondary mb-1">Composition</label>
        <select id="composition" value={composition.name} onChange={(e) => setComposition(COMPOSITION_RULES.find(c => c.name === e.target.value) || COMPOSITION_RULES[0])} className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition" disabled={isLoading || !!rewritingPrompt || !!randomizingPrompt}>
          {COMPOSITION_RULES.map(c => <option key={c.name}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="technical-modifier" className="block text-sm font-medium text-text-secondary mb-1">Technical Modifiers</label>
        <select id="technical-modifier" value={technicalModifier.name} onChange={(e) => setTechnicalModifier(TECHNICAL_MODIFIERS.find(c => c.name === e.target.value) || TECHNICAL_MODIFIERS[0])} className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition" disabled={isLoading || !!rewritingPrompt || !!randomizingPrompt}>
            {TECHNICAL_MODIFIERS.map(c => <option key={c.name}>{c.name}</option>)}
        </select>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label htmlFor="aspectRatio" className="block text-sm font-medium text-text-secondary mb-1">Image Size</label>
        <select id="aspectRatio" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition" disabled={isLoading || !!rewritingPrompt || !!randomizingPrompt}>
          {SUPPORTED_ASPECT_RATIOS.map(ar => <option key={ar.value} value={ar.value}>{ar.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="numImages" className="block text-sm font-medium text-text-secondary mb-1">Images ({numImages})</label>
        <input id="numImages" type="range" min="1" max="4" value={numImages} onChange={(e) => setNumImages(Number(e.target.value))} className="w-full h-2 bg-base-300 rounded-lg appearance-none cursor-pointer" disabled={isLoading || !!rewritingPrompt || !!randomizingPrompt} />
      </div>
    </div>

    <button onClick={onGenerate} disabled={isLoading || !prompt.subject || !!rewritingPrompt || !!randomizingPrompt} className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/80 disabled:bg-base-300 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200">
      <GenerateIcon /> {isLoading ? 'Generating...' : 'Generate'}
    </button>
  </div>
);

const PexelsPanel: React.FC<Pick<ControlPanelProps, 'onPexelsSearch' | 'pexelsPhotos' | 'isPexelsLoading' | 'pexelsError' | 'onSelectPexelsImage' | 'isLoading'>> = 
({ onPexelsSearch, pexelsPhotos, isPexelsLoading, pexelsError, onSelectPexelsImage, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onPexelsSearch(query, 'new');
    }
  };
  
  const handleLoadMore = () => {
    if (query.trim()) {
      onPexelsSearch(query, 'more');
    }
  };

  return (
    <div className="space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
            <input 
                type="text" 
                value={query} 
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for photos..."
                className="flex-grow bg-base-100 border border-base-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-brand-secondary"
                disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !query.trim()} className="p-2 bg-brand-secondary text-white rounded-md disabled:opacity-50 transition" title="Search Pexels">
                <SearchIcon />
            </button>
        </form>

        {isPexelsLoading && pexelsPhotos.length === 0 && (
            <div className="flex justify-center items-center h-32">
                <MiniLoader />
            </div>
        )}

        {pexelsError && (
             <div className="bg-red-500/20 border border-red-500 text-red-300 p-2 rounded-md text-xs">
                <p>{pexelsError}</p>
             </div>
        )}

        {pexelsPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 bg-base-100 rounded">
                {pexelsPhotos.map(photo => (
                    <div key={photo.id} className="relative group cursor-pointer aspect-square" onClick={() => onSelectPexelsImage(photo)} title={photo.alt}>
                        <img src={photo.src.medium} alt={photo.alt} className="rounded-md w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md">
                            <AddIcon />
                        </div>
                    </div>
                ))}
            </div>
        )}

        {pexelsPhotos.length > 0 && (
            <button onClick={handleLoadMore} disabled={isPexelsLoading} className="w-full text-sm py-2 px-3 bg-base-300 hover:bg-base-300/80 rounded-md disabled:opacity-50">
                {isPexelsLoading ? 'Loading...' : 'Load More'}
            </button>
        )}
    </div>
  );
};


const OutpaintControls: React.FC<{ 
    onOutpaint: ControlPanelProps['onOutpaint'], 
    isLoading: boolean,
    outpaintPrompt: string,
    setOutpaintPrompt: (prompt: string) => void,
    outpaintAmount: number;
    setOutpaintAmount: (amount: number) => void;
}> = ({ onOutpaint, isLoading, outpaintPrompt, setOutpaintPrompt, outpaintAmount, setOutpaintAmount }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(outpaintPrompt).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const handleClear = () => {
        setOutpaintPrompt('');
    };
    
    return (
    <div className="flex flex-col space-y-4">
        <p className="text-sm text-text-secondary text-center">Click a direction to expand the canvas. Describe what should fill the new space.</p>
        
        <div>
            <label htmlFor="outpaint-amount" className="block text-sm font-medium text-text-secondary mb-1">
                Expansion Size ({outpaintAmount}%)
            </label>
            <input 
                id="outpaint-amount" 
                type="range" 
                min="10" 
                max="100" 
                step="5"
                value={outpaintAmount}
                onChange={(e) => setOutpaintAmount(Number(e.target.value))}
                className="w-full h-2 bg-base-300 rounded-lg appearance-none cursor-pointer"
                disabled={isLoading}
            />
        </div>

        <div>
            <label htmlFor="outpaint-prompt" className="block text-sm font-medium text-text-secondary mb-1">Outpainting Prompt</label>
            <div className="relative">
              <textarea 
                  id="outpaint-prompt" 
                  rows={3} 
                  value={outpaintPrompt} 
                  onChange={(e) => setOutpaintPrompt(e.target.value)} 
                  placeholder="e.g., continue the forest scene seamlessly" 
                  className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary transition text-text-primary pr-20" 
                  disabled={isLoading}
              />
              <div className="absolute top-2 right-2 flex items-center space-x-1">
                  <button
                      onClick={handleClear}
                      disabled={isLoading || !outpaintPrompt}
                      className="p-1 rounded-full bg-base-200/50 text-text-secondary hover:bg-brand-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                      aria-label="Clear outpainting prompt"
                      title="Clear outpainting prompt"
                  >
                      <CloseIcon />
                  </button>
                  <button
                      onClick={handleCopy}
                      disabled={isLoading || !outpaintPrompt}
                      className="p-1 rounded-full bg-base-200/50 text-text-secondary hover:bg-brand-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                      aria-label="Copy outpainting prompt"
                      title={isCopied ? 'Copied!' : 'Copy outpainting prompt'}
                  >
                      {isCopied ? <CheckIcon /> : <CopyIcon />}
                  </button>
              </div>
            </div>
        </div>
        
        <div className="grid grid-cols-3 grid-rows-3 gap-2 w-40 mx-auto">
            <div className="col-start-2 row-start-1 flex justify-center">
                <button onClick={() => onOutpaint('up')} disabled={isLoading} className="p-3 rounded-md bg-base-100 hover:bg-brand-secondary hover:text-white transition"><ArrowUpIcon /></button>
            </div>
            <div className="col-start-1 row-start-2 flex justify-center">
                <button onClick={() => onOutpaint('left')} disabled={isLoading} className="p-3 rounded-md bg-base-100 hover:bg-brand-secondary hover:text-white transition"><ArrowLeftIcon /></button>
            </div>
            <div className="col-start-3 row-start-2 flex justify-center">
                <button onClick={() => onOutpaint('right')} disabled={isLoading} className="p-3 rounded-md bg-base-100 hover:bg-brand-secondary hover:text-white transition"><ArrowRightIcon /></button>
            </div>
            <div className="col-start-2 row-start-3 flex justify-center">
                <button onClick={() => onOutpaint('down')} disabled={isLoading} className="p-3 rounded-md bg-base-100 hover:bg-brand-secondary hover:text-white transition"><ArrowDownIcon /></button>
            </div>
        </div>
    </div>
)};

const MaskingTools: React.FC<Pick<ControlPanelProps, 'brushSize' | 'setBrushSize' | 'brushColor' | 'setBrushColor' | 'isLoading' | 'autoMaskPrompt' | 'setAutoMaskPrompt' | 'onAutoMask'>> = ({ brushSize, setBrushSize, brushColor, setBrushColor, isLoading, autoMaskPrompt, setAutoMaskPrompt, onAutoMask }) => {
  return (
    <div className="space-y-4">
        <h3 className="text-md font-semibold text-text-primary flex items-center gap-2"><MaskIcon/> Masking Tools</h3>
        
        <div className="space-y-2 p-3 bg-base-100/50 rounded-md">
            <label htmlFor="auto-mask-prompt" className="block text-sm font-medium text-text-secondary">Auto-Mask with AI</label>
            <div className="flex items-center gap-2">
                <input
                    id="auto-mask-prompt"
                    type="text"
                    value={autoMaskPrompt}
                    onChange={(e) => setAutoMaskPrompt(e.target.value)}
                    placeholder="e.g., the cat on the mat"
                    className="flex-grow bg-base-100 border border-base-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-brand-secondary"
                    disabled={isLoading}
                />
                <button
                    onClick={onAutoMask}
                    disabled={isLoading || !autoMaskPrompt}
                    className="p-2 bg-brand-secondary text-white rounded-md disabled:opacity-50 transition"
                    title="Find and mask object"
                >
                    <RewriteIcon />
                </button>
            </div>
            <p className="text-xs text-text-secondary">Describe the object to mask. This will replace the current mask.</p>
        </div>

        <div className="space-y-2 pt-2 border-t border-base-300">
          <p className="text-sm font-medium text-text-secondary">Manual Painting</p>
          <p className="text-xs text-text-secondary">Paint with black to hide parts of the layer, and white to reveal them.</p>
          <div>
              <label htmlFor="brush-size" className="block text-sm font-medium text-text-secondary mb-2">Brush Size</label>
              <input id="brush-size" type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-2 bg-base-300 rounded-lg appearance-none cursor-pointer" disabled={isLoading} />
          </div>
          <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Brush Color</label>
              <div className="flex items-center gap-2">
                  <button onClick={() => setBrushColor('#FFFFFF')} className={`w-10 h-10 rounded-md bg-white border-2 ${brushColor === '#FFFFFF' ? 'border-brand-secondary' : 'border-base-300'}`} disabled={isLoading} aria-label="Select white brush"></button>
                  <button onClick={() => setBrushColor('#000000')} className={`w-10 h-10 rounded-md bg-black border-2 ${brushColor === '#000000' ? 'border-brand-secondary' : 'border-base-300'}`} disabled={isLoading} aria-label="Select black brush"></button>
              </div>
          </div>
        </div>
    </div>
  )
}

const AdjustmentControls: React.FC<{
    adjustments: ImageAdjustments;
    onAdjustmentChange: (adjustment: keyof ImageAdjustments, value: number) => void;
    onResetAdjustments: () => void;
    onFilterChange: (filterName: string) => void;
    isLoading: boolean;
}> = ({ adjustments, onAdjustmentChange, onResetAdjustments, onFilterChange, isLoading }) => (
    <div className="space-y-3 pt-4 border-t border-base-300">
        <h3 className="text-md font-semibold text-text-primary">Adjustments</h3>
        <div>
            <label htmlFor="filter" className="block text-sm font-medium text-text-secondary mb-1">Preset Filter</label>
            <select
                id="filter"
                value={adjustments.filter || 'None'}
                onChange={(e) => onFilterChange(e.target.value)}
                disabled={isLoading}
                className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
            >
                {FILTERS.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
            </select>
        </div>
        <div>
            <label htmlFor="brightness" className="block text-sm font-medium text-text-secondary mb-1">
                Brightness ({adjustments.brightness}%)
            </label>
            <input
                id="brightness" type="range" min="50" max="150" value={adjustments.brightness}
                onChange={(e) => onAdjustmentChange('brightness', parseInt(e.target.value, 10))}
                disabled={isLoading} className="w-full h-2 bg-base-300 rounded-lg appearance-none cursor-pointer"
            />
        </div>
        <div>
            <label htmlFor="contrast" className="block text-sm font-medium text-text-secondary mb-1">
                Contrast ({adjustments.contrast}%)
            </label>
            <input
                id="contrast" type="range" min="50" max="200" value={adjustments.contrast}
                onChange={(e) => onAdjustmentChange('contrast', parseInt(e.target.value, 10))}
                disabled={isLoading} className="w-full h-2 bg-base-300 rounded-lg appearance-none cursor-pointer"
            />
        </div>
        <div>
            <label htmlFor="red" className="block text-sm font-medium text-text-secondary mb-1">
                Red ({adjustments.red}%)
            </label>
            <input
                id="red" type="range" min="0" max="200" value={adjustments.red}
                onChange={(e) => onAdjustmentChange('red', parseInt(e.target.value, 10))}
                disabled={isLoading} className="w-full h-2 bg-red-500/50 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-red-500"
            />
        </div>
        <div>
            <label htmlFor="green" className="block text-sm font-medium text-text-secondary mb-1">
                Green ({adjustments.green}%)
            </label>
            <input
                id="green" type="range" min="0" max="200" value={adjustments.green}
                onChange={(e) => onAdjustmentChange('green', parseInt(e.target.value, 10))}
                disabled={isLoading} className="w-full h-2 bg-green-500/50 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-green-500"
            />
        </div>
        <div>
            <label htmlFor="blue" className="block text-sm font-medium text-text-secondary mb-1">
                Blue ({adjustments.blue}%)
            </label>
            <input
                id="blue" type="range" min="0" max="200" value={adjustments.blue}
                onChange={(e) => onAdjustmentChange('blue', parseInt(e.target.value, 10))}
                disabled={isLoading} className="w-full h-2 bg-blue-500/50 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-blue-500"
            />
        </div>
        <button
            onClick={onResetAdjustments} disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-base-300 hover:bg-base-300/80 disabled:opacity-50 text-text-secondary font-bold py-2 px-3 rounded-md transition text-sm">
            <ResetIcon /> Reset Adjustments
        </button>
    </div>
);


const EditTab: React.FC<Omit<ControlPanelProps, 'prompt' | 'onPromptChange' | 'onGetSuggestions' | 'subjectSuggestions' | 'backgroundSuggestions' | 'suggestionsLoading' | 'style' | 'setStyle' | 'lighting' | 'setLighting' | 'composition' | 'setComposition' | 'technicalModifier' | 'setTechnicalModifier' | 'aspectRatio' | 'setAspectRatio' | 'numImages' | 'setNumImages' | 'onGenerate' | 'onClose' | 'activeTab' | 'setActiveTab' | 'themes' | 'activeTheme' | 'onThemeChange' | 'isDarkMode' | 'onToggleThemeMode' | 'onClearCustomShapes' | 'onOpenOptionsClick' | 'pexelsApiKey' | 'onSetPexelsApiKey'>> = (props) => {
    const { editPrompt, setEditPrompt, editMode, setEditMode, brushSize, setBrushSize, brushColor, setBrushColor, onEdit, onAnalyzeImage, onClear, onReset, onUndo, canUndo, isLoading, onRandomPrompt, randomizingPrompt, onOutpaint, outpaintPrompt, setOutpaintPrompt, outpaintAmount, setOutpaintAmount, clipArtCategories, selectedClipArtCategoryName, setSelectedClipArtCategoryName, onSaveShape, selectedShapeId, onDeleteSelectedShape, isEditingMask, colorPresets, onAddColorPreset, hasImage, onLayerAdjustmentChange, onResetLayerAdjustments, onLayerFilterChange } = props;
    const [newShapeName, setNewShapeName] = useState('');
    const [isEditPromptCopied, setIsEditPromptCopied] = useState(false);
    const [isPexelsOpen, setIsPexelsOpen] = useState(false);


    const activeLayer = props.layers.find(l => l.id === props.activeLayerId);
    const selectedShape = activeLayer?.type === LayerType.PIXEL ? activeLayer.placedShapes?.find(s => s.id === selectedShapeId) : null;
    const selectedCategory = clipArtCategories.find(c => c.name === selectedClipArtCategoryName);

    const handleSaveClick = () => {
        if (newShapeName.trim()) {
            onSaveShape(newShapeName);
            setNewShapeName('');
        }
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLImageElement>, shape: ClipArtShape) => {
        e.dataTransfer.setData('text/plain', shape.dataUrl);
    };
    
    const handleEditCopy = () => {
        navigator.clipboard.writeText(editPrompt).then(() => {
            setIsEditPromptCopied(true);
            setTimeout(() => setIsEditPromptCopied(false), 2000);
        });
    };

    const handleEditClear = () => {
        setEditPrompt('');
    };

    const isPixelLayerActive = activeLayer?.type === LayerType.PIXEL;
    const isAdjustmentLayerActive = activeLayer?.type === LayerType.ADJUSTMENT;
    const placeholderText = "Describe the edit for the masked area or sketch";


    return (
    <div className="flex flex-col space-y-4">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">2. Edit Your Creation</h2>

        <LayersPanel {...props} />

        <div className="bg-base-100/50 rounded-md">
            <button onClick={() => setIsPexelsOpen(!isPexelsOpen)} className="w-full flex justify-between items-center p-3 text-left">
                <h3 className="text-md font-semibold text-text-primary flex items-center gap-2"><PexelsIcon/> Stock Photos</h3>
                <ChevronDownIcon className={`transition-transform ${isPexelsOpen ? 'rotate-180' : ''}`} />
            </button>
            {isPexelsOpen && (
                <div className="p-3 border-t border-base-300">
                    <PexelsPanel {...props} />
                </div>
            )}
        </div>

        {isEditingMask ? (
            <MaskingTools {...props} />
        ) : isAdjustmentLayerActive && activeLayer.adjustments ? (
            <AdjustmentControls 
                adjustments={activeLayer.adjustments} 
                onAdjustmentChange={onLayerAdjustmentChange}
                onResetAdjustments={onResetLayerAdjustments}
                onFilterChange={onLayerFilterChange}
                isLoading={isLoading}
            />
        ) : (
        <>
          <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Editing Mode</label>
              <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setEditMode(EditMode.MOVE)} disabled={isLoading || !hasImage} className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md transition text-sm ${editMode === EditMode.MOVE ? 'bg-brand-secondary text-white' : 'bg-base-100 hover:bg-base-300'}`}><MoveIcon /> Move</button>
                  <button onClick={() => setEditMode(EditMode.SKETCH)} disabled={isLoading || !hasImage} className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md transition text-sm ${editMode === EditMode.SKETCH ? 'bg-brand-secondary text-white' : 'bg-base-100 hover:bg-base-300'}`}><DrawIcon /> Sketch</button>
                  <button onClick={() => setEditMode(EditMode.OUTPAINT)} disabled={isLoading || !hasImage} className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md transition text-sm ${editMode === EditMode.OUTPAINT ? 'bg-brand-secondary text-white' : 'bg-base-100 hover:bg-base-300'}`}><OutpaintIcon /> Outpaint</button>
              </div>
          </div>
          
          {editMode === EditMode.OUTPAINT ? (
              <OutpaintControls onOutpaint={onOutpaint} isLoading={isLoading} outpaintPrompt={outpaintPrompt} setOutpaintPrompt={setOutpaintPrompt} outpaintAmount={outpaintAmount} setOutpaintAmount={setOutpaintAmount} />
          ) : editMode === EditMode.MOVE ? (
                <div className="text-center text-sm text-text-secondary p-4 bg-base-100 rounded-md">
                    <p className="font-semibold">Move Tool</p>
                    <p>Select a layer and drag it on the canvas to change its position.</p>
                </div>
          ) : (
          <>
              <div className={`space-y-3 ${!isPixelLayerActive ? 'opacity-50' : ''}`}>
                  <label htmlFor="brush-size" className="block text-sm font-medium text-text-secondary flex items-center gap-2"><BrushIcon/> Brush Options</label>
                  <div className="flex items-center gap-4">
                      <input id="brush-size" type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-2 bg-base-300 rounded-lg appearance-none cursor-pointer" disabled={isLoading || !isPixelLayerActive} />
                      {editMode === EditMode.SKETCH && (<input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="w-10 h-10 p-1 bg-base-100 border border-base-300 rounded-md cursor-pointer" disabled={isLoading || !isPixelLayerActive} />)}
                  </div>
                  {editMode === EditMode.SKETCH && (
                    <div className="flex flex-wrap items-center gap-2">
                      {colorPresets.map(color => (
                        <button
                          key={color}
                          onClick={() => setBrushColor(color)}
                          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${brushColor.toLowerCase() === color.toLowerCase() ? 'border-brand-secondary' : 'border-base-300/50'}`}
                          style={{ backgroundColor: color }}
                          aria-label={`Set brush color to ${color}`}
                          disabled={isLoading || !isPixelLayerActive}
                        />
                      ))}
                      <button 
                        onClick={onAddColorPreset}
                        className="w-6 h-6 rounded-full border-2 border-dashed border-base-300 flex items-center justify-center text-text-secondary hover:bg-base-300 disabled:opacity-50"
                        aria-label="Save current color as preset"
                        title="Save current color as preset"
                        disabled={isLoading || !isPixelLayerActive || colorPresets.includes(brushColor) || colorPresets.length >= 12}
                      >
                        <AddIcon />
                      </button>
                    </div>
                  )}
                  {!isPixelLayerActive && <p className="text-xs text-text-secondary mt-1">Select a Pixel layer to draw.</p>}
              </div>
              {editMode === EditMode.SKETCH && (
                  <div className={`space-y-3 p-3 bg-base-200/50 rounded-md ${!isPixelLayerActive ? 'opacity-50' : ''}`}>
                      <label className="block text-sm font-medium text-text-secondary">Clip Art Library</label>
                      <div className="grid grid-cols-2 gap-2">
                          <label htmlFor="clip-art-category" className="sr-only">Clip Art Category</label>
                          <select id="clip-art-category" value={selectedClipArtCategoryName} onChange={(e) => setSelectedClipArtCategoryName(e.target.value)} className="col-span-2 w-full bg-base-100 border border-base-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-brand-secondary" disabled={isLoading || !isPixelLayerActive}>
                              {clipArtCategories.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                          </select>
                      </div>
                      <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto p-1 bg-base-100 rounded">
                          {selectedCategory?.shapes.map(shape => (
                              <div key={shape.name} className={`aspect-square p-1 bg-base-200 rounded-md flex items-center justify-center ${isPixelLayerActive ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed'}`} title={shape.name}>
                                  <img src={shape.dataUrl} alt={shape.name} draggable={isPixelLayerActive} onDragStart={(e) => handleDragStart(e, shape)} className="max-w-full max-h-full" />
                              </div>
                          ))}
                      </div>
                      <div className="flex items-center gap-2">
                          <input type="text" value={newShapeName} onChange={(e) => setNewShapeName(e.target.value)} placeholder="Name your sketch" className="flex-grow bg-base-100 border border-base-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-brand-secondary" disabled={isLoading || !isPixelLayerActive}/>
                          <button onClick={handleSaveClick} disabled={isLoading || !newShapeName.trim() || !isPixelLayerActive} className="p-2 bg-brand-secondary text-white rounded-md disabled:opacity-50 transition" title="Save current sketch to Custom library"><SaveIcon /></button>
                      </div>
                  </div>
              )}
              {editMode === EditMode.SKETCH && selectedShape && (
                  <div className="space-y-3 p-3 bg-base-200/50 rounded-md">
                      <label className="block text-sm font-medium text-text-secondary">Shape Properties</label>
                      <button onClick={onDeleteSelectedShape} disabled={isLoading || !selectedShapeId} className="w-full flex items-center justify-center gap-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 transition text-sm" title="Delete selected shape"><ClearIcon /> Delete</button>
                  </div>
              )}
              <div>
                  <label htmlFor="edit-prompt" className="block text-sm font-medium text-text-secondary mb-1">Editing Prompt</label>
                  <div className="relative">
                      <textarea id="edit-prompt" rows={3} value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder={placeholderText} className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary transition text-text-primary pr-44" disabled={isLoading || randomizingPrompt === 'edit'} />
                      <div className="absolute top-2 right-2 flex items-center space-x-1">
                          <button
                              onClick={() => props.onRewritePrompt('edit')}
                              disabled={isLoading || props.rewritingPrompt === 'edit' || randomizingPrompt === 'edit' || !editPrompt}
                              className="p-1 rounded-full bg-base-200/50 text-text-secondary hover:bg-brand-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                              aria-label="Enhance edit prompt"
                              title="Enhance edit prompt"
                          >
                              {props.rewritingPrompt === 'edit' ? <MiniLoader /> : <RewriteIcon />}
                          </button>
                          <button
                              onClick={onAnalyzeImage}
                              disabled={isLoading || !hasImage}
                              className="p-1 rounded-full bg-base-200/50 text-text-secondary hover:bg-brand-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                              aria-label="Analyze image to create prompt"
                              title="Analyze image to create prompt"
                          >
                              <IdeaIcon />
                          </button>
                          <button
                              onClick={handleEditClear}
                              disabled={isLoading || !editPrompt}
                              className="p-1 rounded-full bg-base-200/50 text-text-secondary hover:bg-brand-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                              aria-label="Clear edit prompt"
                              title="Clear edit prompt"
                          >
                              <CloseIcon />
                          </button>
                          <button
                              onClick={handleEditCopy}
                              disabled={isLoading || !editPrompt}
                              className="p-1 rounded-full bg-base-200/50 text-text-secondary hover:bg-brand-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                              aria-label="Copy edit prompt"
                              title={isEditPromptCopied ? 'Copied!' : 'Copy edit prompt'}
                          >
                              {isEditPromptCopied ? <CheckIcon /> : <CopyIcon />}
                          </button>
                          <button
                              onClick={() => onRandomPrompt('edit')}
                              disabled={isLoading || randomizingPrompt === 'edit'}
                              className="p-1 rounded-full bg-base-200/50 text-text-secondary hover:bg-brand-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                              aria-label="Generate random edit prompt"
                              title="Generate random edit prompt"
                          >
                              {randomizingPrompt === 'edit' ? <MiniLoader /> : <RandomIcon />}
                          </button>
                      </div>
                  </div>
              </div>
              <button onClick={onEdit} disabled={isLoading || !editPrompt} className="w-full flex items-center justify-center gap-2 bg-brand-secondary hover:bg-brand-secondary/80 disabled:bg-base-300 text-white font-bold py-2 px-4 rounded-md transition duration-200"><EditIcon /> Apply Edit</button>
          </>
          )}
        </>
        )}
        
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-base-300">
            <button onClick={onClear} disabled={isLoading || (!isPixelLayerActive && !isEditingMask) } className="w-full flex items-center justify-center gap-2 bg-base-300 hover:bg-base-300/80 disabled:bg-base-300/50 text-text-secondary font-bold py-2 px-4 rounded-md transition"><ClearIcon /> Clear</button>
            <button onClick={onUndo} disabled={isLoading || !canUndo} className="w-full flex items-center justify-center gap-2 bg-base-300 hover:bg-base-300/80 disabled:bg-base-300/50 text-text-secondary font-bold py-2 px-4 rounded-md transition"><UndoIcon /> Undo</button>
            <button onClick={onReset} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-base-300 hover:bg-base-300/80 disabled:bg-base-300/50 text-text-secondary font-bold py-2 px-4 rounded-md transition"><ResetIcon /> Reset All</button>
        </div>
    </div>
)};

const SettingsTab: React.FC<Pick<ControlPanelProps, 'onClearCustomShapes' | 'themes' | 'activeTheme' | 'onThemeChange' | 'isDarkMode' | 'onToggleThemeMode' | 'pexelsApiKey' | 'onSetPexelsApiKey'>> = ({ 
    onClearCustomShapes, themes, activeTheme, onThemeChange, isDarkMode, onToggleThemeMode, pexelsApiKey, onSetPexelsApiKey
}) => {

    const handleClearClick = () => {
        if (window.confirm("Are you sure you want to delete all your saved custom clip art, colors, API keys and reset the theme? This action cannot be undone.")) {
            onClearCustomShapes();
        }
    };

    return (
        <div className="flex flex-col space-y-4">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2"><SettingsIcon /> Application Settings</h2>

            <div className="p-3 bg-base-100/50 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-text-secondary">Theme</label>
                    <ThemeSwitcher isDarkMode={isDarkMode} onToggle={onToggleThemeMode} />
                </div>
                 <select
                    id="theme-select"
                    value={activeTheme}
                    onChange={(e) => onThemeChange(e.target.value)}
                    className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition text-sm"
                >
                    {themes.map(theme => (
                        <option key={theme.name} value={theme.name}>{theme.name}</option>
                    ))}
                </select>
            </div>

            <div className="p-3 bg-base-100/50 rounded-md space-y-2">
                <h3 className="text-md font-semibold text-text-primary">API Keys</h3>
                <div>
                    <label htmlFor="pexels-api-key" className="block text-sm font-medium text-text-secondary">Pexels API Key</label>
                    <input
                        id="pexels-api-key"
                        type="password"
                        value={pexelsApiKey}
                        onChange={(e) => onSetPexelsApiKey(e.target.value)}
                        placeholder="Enter your Pexels API key"
                        className="mt-1 w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition text-sm"
                    />
                    <p className="mt-1 text-xs text-text-secondary">
                        Used for the "Stock Photos" feature. Get a free key from <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-primary">pexels.com/api</a>.
                    </p>
                </div>
            </div>
            
            <div className="p-3 bg-base-100/50 rounded-md">
                <label className="block text-sm font-medium text-text-secondary">Manage Data</label>
                <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm text-text-primary">Clear custom data & settings.</p>
                    <button 
                        onClick={handleClearClick}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-3 rounded-md transition text-sm">
                        <ClearIcon /> Clear All
                    </button>
                </div>
            </div>
        </div>
    );
};


export const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const { activeTab, setActiveTab, hasImage, onOpenOptionsClick, isLoading, onClose } = props;

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <LogoIcon />
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">Creative Image Studio</h1>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-1 -mr-2 rounded-full text-text-secondary hover:bg-base-300"
          aria-label="Close panel"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 p-1 bg-base-100 rounded-lg">
        <TabButton label="Generate" icon={<GenerateIcon />} isActive={activeTab === 'generate'} onClick={() => setActiveTab('generate')} />
        <TabButton label="Edit" icon={<EditIcon />} isActive={activeTab === 'edit'} onClick={() => setActiveTab('edit')} />
        <TabButton label="Settings" icon={<SettingsIcon />} isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </div>
      
      <div className="px-1">
          <button 
            onClick={onOpenOptionsClick}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-base-100 hover:bg-base-300 disabled:opacity-50 text-text-secondary font-bold py-2 px-4 rounded-md transition duration-200 border border-base-300"
          >
            <OpenProjectIcon /> Open...
          </button>
        </div>

      <div className="p-4 bg-base-100/50 rounded-lg">
        {activeTab === 'generate' && <GenerateTab {...props} />}
        {activeTab === 'edit' && <EditTab {...props} />}
        {activeTab === 'settings' && <SettingsTab {...props} />}
      </div>
    </div>
  );
};
