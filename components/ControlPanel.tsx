import React, { useState, useEffect } from 'react';
import { EditMode, ImageStyle, Filter, PromptState, PromptPart, LightingStyle, CompositionRule, ClipArtShape, PlacedShape, ClipArtCategory, TechnicalModifier, ImageAdjustments, Layer, LayerType, Theme, PexelsPhoto, AIEngine, ComfyUIConnectionStatus, ComfyUIWorkflow, PageState } from '../types';
import { INITIAL_STYLES, SUPPORTED_ASPECT_RATIOS, FILTERS, LIGHTING_STYLES, COMPOSITION_RULES, TECHNICAL_MODIFIERS } from '../constants';
import { BrushIcon, ClearIcon, DrawIcon, EditIcon, GenerateIcon, MaskIcon, ResetIcon, FilterIcon, RewriteIcon, RandomIcon, UploadIcon, OutpaintIcon, ArrowUpIcon, ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, IdeaIcon, UndoIcon, SaveIcon, RotateIcon, SettingsIcon, CloseIcon, CopyIcon, CheckIcon, LogoIcon, AddIcon, OpenProjectIcon, PexelsIcon, ChevronDownIcon, SearchIcon, MoveIcon, PaletteIcon, ViewColumnsIcon, FlipHorizontalIcon, FlipVerticalIcon } from './Icons';
import { ThemeSwitcher } from './ThemeSwitcher';
import { LayersPanel } from './LayersPanel';

type Tab = 'generate' | 'edit' | 'settings';

export interface ControlPanelProps {
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
  negativePromptSuggestions: string[];
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
  onGenerate: () => void;
  onGenerateFourViews: () => void;
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
  onInvertLayerMask: (id: string) => void;
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
  // Image to Image props
  onRemixImage: () => void;
  remixPreservation: number;
  setRemixPreservation: (strength: number) => void;
  // Style Transfer props
  styleImage: string | null;
  onStyleImageUpload: () => void;
  onRemoveStyleImage: () => void;
  onApplyStyleTransfer: () => void;
  styleStrength: number;
  setStyleStrength: (strength: number) => void;
  // AI Engine props
  aiEngine: AIEngine;
  onAiEngineChange: (engine: AIEngine) => void;
  // ComfyUI props
  comfyUIServerAddress: string;
  onComfyUIServerAddressChange: (address: string) => void;
  comfyUIConnectionStatus: ComfyUIConnectionStatus;
  onConnectToComfyUI: () => void;
  comfyUICheckpointModels: string[];
  comfyUILoraModels: string[];
  selectedComfyUICheckpoint: string;
  onSelectedComfyUICheckpointChange: (model: string) => void;
  selectedComfyUILora: string;
  onSelectedComfyUILoraChange: (model: string) => void;
  comfyUIWorkflows: ComfyUIWorkflow[];
  selectedComfyUIWorkflow: ComfyUIWorkflow;
  onSelectedComfyUIWorkflowChange: (workflow: ComfyUIWorkflow) => void;
  // Page props
  page: PageState | null;
  onPageSizeChange: (width: number, height: number) => void;
}

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
  part: PromptPart | 'edit';
  label: string;
  placeholder: string;
  prompt: PromptState | string;
  onPromptChange: (part: PromptPart | 'edit', value: string) => void;
  onRewritePrompt: (part: PromptPart | 'edit') => void;
  rewritingPrompt: PromptPart | 'edit' | null;
  onRandomPrompt: (part: PromptPart | 'edit') => void;
  randomizingPrompt: PromptPart | 'edit' | null;
  onGetSuggestions?: (part: PromptPart, value: string) => void;
  suggestions?: string[];
  suggestionsLoading?: boolean;
  isLoading: boolean;
  rows?: number;
}> = ({ part, label, placeholder, prompt, onPromptChange, onRewritePrompt, rewritingPrompt, onRandomPrompt, randomizingPrompt, onGetSuggestions, suggestions, suggestionsLoading, isLoading, rows = 3 }) => {
    const [isCopied, setIsCopied] = useState(false);
    const value = typeof prompt === 'string' ? prompt : prompt[part];

    const handleSuggestionClick = (suggestion: string) => {
        if (part === 'edit' || !onGetSuggestions) return;
        const currentValue = typeof prompt === 'string' ? prompt : prompt[part];
        const separator = currentValue.trim() === '' ? '' : ', ';
        onPromptChange(part, `${currentValue}${separator}${suggestion}`);
    };

    const handleCopy = () => {
      navigator.clipboard.writeText(value).then(() => {
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
            rows={rows}
            value={value}
            onChange={(e) => onPromptChange(part, e.target.value)}
            placeholder={placeholder}
            className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition pr-44 text-text-primary"
            disabled={isLoading || !!rewritingPrompt || !!randomizingPrompt}
          />
          <div className="absolute top-2 right-2 flex items-center space-x-1">
            <button
                onClick={handleClear}
                disabled={isLoading || !value}
                className="p-1 rounded-full bg-base-200/50 text-text-secondary hover:bg-brand-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                aria-label={`Clear ${part} prompt`}
                title={`Clear ${part} prompt`}
            >
                <CloseIcon />
            </button>
            <button
                onClick={handleCopy}
                disabled={isLoading || !value}
                className="p-1 rounded-full bg-base-200/50 text-text-secondary hover:bg-brand-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                aria-label={`Copy ${part} prompt`}
                title={isCopied ? 'Copied!' : `Copy ${part} prompt`}
            >
                {isCopied ? <CheckIcon /> : <CopyIcon />}
            </button>
             {onGetSuggestions && (
                <button
                    onClick={() => part !== 'edit' && onGetSuggestions(part, value)}
                    disabled={isLoading || !!rewritingPrompt || !!randomizingPrompt || suggestionsLoading || !value}
                    className="p-1 rounded-full bg-base-200/50 text-text-secondary hover:bg-brand-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                    aria-label={`Get ideas for ${part}`}
                    title={`Get ideas for ${part}`}
                >
                    {suggestionsLoading ? <MiniLoader /> : <IdeaIcon />}
                </button>
             )}
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
                disabled={isLoading || !!rewritingPrompt || !!randomizingPrompt || !value}
                className="p-1 rounded-full bg-base-200/50 text-text-secondary hover:bg-brand-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                aria-label={`Enhance ${part} prompt`}
                title={`Enhance ${part} prompt`}
            >
                {rewritingPrompt === part ? <MiniLoader /> : <RewriteIcon />}
            </button>
          </div>
        </div>
        {(suggestionsLoading || (suggestions && suggestions.length > 0)) && (
            <div className="mt-2 p-2 bg-base-200 rounded-md">
                <p className="text-xs font-semibold text-text-secondary mb-1 flex items-center gap-1"><IdeaIcon /> Inspiration</p>
                {suggestionsLoading ? (
                    <p className="text-xs text-text-secondary animate-pulse">Getting ideas...</p>
                ) : (
                    <div className="flex flex-wrap gap-1">
                        {suggestions?.map((s, i) => (
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


const GeminiGeneratePanel: React.FC<Pick<ControlPanelProps, 'prompt' | 'onPromptChange' | 'onRewritePrompt' | 'rewritingPrompt' | 'onRandomPrompt' | 'randomizingPrompt' | 'onGetSuggestions' | 'subjectSuggestions' | 'backgroundSuggestions' | 'negativePromptSuggestions' | 'suggestionsLoading' | 'style' | 'setStyle' | 'lighting' | 'setLighting' | 'composition' | 'setComposition' | 'technicalModifier' | 'setTechnicalModifier' | 'aspectRatio' | 'setAspectRatio' | 'onGenerate' | 'onGenerateFourViews' | 'isLoading'>> = ({
  prompt, onPromptChange, onRewritePrompt, rewritingPrompt, onRandomPrompt, randomizingPrompt, onGetSuggestions, subjectSuggestions, backgroundSuggestions, negativePromptSuggestions, suggestionsLoading, style, setStyle, lighting, setLighting, composition, setComposition, technicalModifier, setTechnicalModifier, aspectRatio, setAspectRatio, onGenerate, onGenerateFourViews, isLoading
}) => (
  <div className="flex flex-col space-y-4">
    <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">1. Describe Your Image</h2>
    <InteractivePromptInput 
      part="subject" 
      label="Subject" 
      placeholder="e.g., A majestic lion" 
      prompt={prompt} 
      onPromptChange={onPromptChange as any} 
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
      onPromptChange={onPromptChange as any} 
      onRewritePrompt={onRewritePrompt} 
      rewritingPrompt={rewritingPrompt} 
      onRandomPrompt={onRandomPrompt} 
      randomizingPrompt={randomizingPrompt} 
      onGetSuggestions={onGetSuggestions}
      suggestions={backgroundSuggestions}
      suggestionsLoading={suggestionsLoading === 'background'}
      isLoading={isLoading} 
    />
     <InteractivePromptInput 
      part="negativePrompt" 
      label="Negative Prompt" 
      placeholder="e.g., text, watermarks, blurry, deformed" 
      prompt={prompt} 
      onPromptChange={onPromptChange as any} 
      onRewritePrompt={onRewritePrompt} 
      rewritingPrompt={rewritingPrompt} 
      onRandomPrompt={onRandomPrompt} 
      randomizingPrompt={randomizingPrompt} 
      onGetSuggestions={onGetSuggestions}
      suggestions={negativePromptSuggestions}
      suggestionsLoading={suggestionsLoading === 'negativePrompt'}
      isLoading={isLoading}
      rows={2}
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

    <div>
      <label htmlFor="aspectRatio" className="block text-sm font-medium text-text-secondary mb-1">Image Size</label>
      <select id="aspectRatio" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition" disabled={isLoading || !!rewritingPrompt || !!randomizingPrompt}>
        {SUPPORTED_ASPECT_RATIOS.map(ar => <option key={ar.value} value={ar.value}>{ar.name}</option>)}
      </select>
    </div>

    <div className="flex gap-2">
      <button onClick={onGenerate} disabled={isLoading || !prompt.subject || !!rewritingPrompt || !!randomizingPrompt} className="flex-1 flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/80 disabled:bg-base-300 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200">
        <GenerateIcon /> {isLoading ? 'Generating...' : 'Generate'}
      </button>
      <button onClick={onGenerateFourViews} disabled={isLoading || !prompt.subject || !!rewritingPrompt || !!randomizingPrompt} className="flex items-center justify-center gap-2 bg-brand-secondary hover:bg-brand-secondary/80 disabled:bg-base-300 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200" title="Generate Front, Back, Left, and Right views">
        <ViewColumnsIcon /> 4 Views
      </button>
    </div>
  </div>
);

const ComfyUIGeneratePanel: React.FC<Pick<ControlPanelProps, 'prompt' | 'onPromptChange' | 'onGenerate' | 'isLoading' | 'comfyUIConnectionStatus' | 'comfyUIWorkflows' | 'selectedComfyUIWorkflow' | 'onSelectedComfyUIWorkflowChange' | 'comfyUICheckpointModels' | 'selectedComfyUICheckpoint' | 'onSelectedComfyUICheckpointChange' | 'comfyUILoraModels' | 'selectedComfyUILora' | 'onSelectedComfyUILoraChange'>> = (props) => {
    const { prompt, onPromptChange, onGenerate, isLoading, comfyUIConnectionStatus, comfyUIWorkflows, selectedComfyUIWorkflow, onSelectedComfyUIWorkflowChange, comfyUICheckpointModels, selectedComfyUICheckpoint, onSelectedComfyUICheckpointChange, comfyUILoraModels, selectedComfyUILora, onSelectedComfyUILoraChange } = props;

    const isConnected = comfyUIConnectionStatus === 'connected';

    return (
        <div className={`flex flex-col space-y-4 ${!isConnected ? 'opacity-50' : ''}`}>
            {!isConnected && (
                <div className="absolute inset-0 bg-base-100/50 flex items-center justify-center z-10 rounded-lg">
                    <p className="font-semibold text-text-secondary p-4 bg-base-300 rounded-md">Connect to ComfyUI in Settings</p>
                </div>
            )}
            <div>
                <label htmlFor="comfy-workflow" className="block text-sm font-medium text-text-secondary mb-1">Workflow</label>
                <select id="comfy-workflow" value={selectedComfyUIWorkflow.name} onChange={(e) => onSelectedComfyUIWorkflowChange(comfyUIWorkflows.find(w => w.name === e.target.value) || comfyUIWorkflows[0])} className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary" disabled={isLoading || !isConnected}>
                    {comfyUIWorkflows.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="comfy-checkpoint" className="block text-sm font-medium text-text-secondary mb-1">Checkpoint Model</label>
                <select id="comfy-checkpoint" value={selectedComfyUICheckpoint} onChange={(e) => onSelectedComfyUICheckpointChange(e.target.value)} className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary" disabled={isLoading || !isConnected || comfyUICheckpointModels.length === 0}>
                    {comfyUICheckpointModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>
            {selectedComfyUIWorkflow.json.includes("LoraLoader") && (
                <div>
                    <label htmlFor="comfy-lora" className="block text-sm font-medium text-text-secondary mb-1">LoRA Model</label>
                    <select id="comfy-lora" value={selectedComfyUILora} onChange={(e) => onSelectedComfyUILoraChange(e.target.value)} className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary" disabled={isLoading || !isConnected || comfyUILoraModels.length === 0}>
                        <option value="None">None</option>
                        {comfyUILoraModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            )}
            <div>
                <label htmlFor="prompt-subject-comfy" className="block text-sm font-medium text-text-secondary mb-1">Subject (Positive Prompt)</label>
                <textarea id="prompt-subject-comfy" rows={3} value={prompt.subject} onChange={(e) => onPromptChange('subject', e.target.value)} placeholder="e.g., A majestic lion, cinematic lighting..." className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary" disabled={isLoading || !isConnected} />
            </div>
             <div>
                <label htmlFor="prompt-background-comfy" className="block text-sm font-medium text-text-secondary mb-1">Background (Positive Prompt)</label>
                <textarea id="prompt-background-comfy" rows={3} value={prompt.background} onChange={(e) => onPromptChange('background', e.target.value)} placeholder="e.g., on a rocky cliff at sunset" className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary" disabled={isLoading || !isConnected} />
            </div>
            <div>
                <label htmlFor="prompt-negative-comfy" className="block text-sm font-medium text-text-secondary mb-1">Negative Prompt</label>
                <textarea id="prompt-negative-comfy" rows={2} value={prompt.negativePrompt} onChange={(e) => onPromptChange('negativePrompt', e.target.value)} placeholder="e.g., ugly, deformed, blurry..." className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary" disabled={isLoading || !isConnected} />
            </div>
            <button onClick={onGenerate} disabled={isLoading || !prompt.subject || !isConnected} className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/80 disabled:bg-base-300 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200">
                <GenerateIcon /> {isLoading ? 'Generating...' : 'Generate'}
            </button>
        </div>
    );
};

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
              <input id="brush-size" type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-2 bg-base-300 rounded-lg appearance-none cursor-pointer" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Brush Color (Mode)</label>
            <div className="flex gap-2">
                <button 
                    onClick={() => setBrushColor('#000000')} 
                    className={`flex-1 py-2 rounded-md border-2 ${brushColor === '#000000' ? 'border-brand-primary bg-gray-800 text-white' : 'border-base-300 bg-base-100 text-text-primary'}`}
                >
                    Hide (Black)
                </button>
                <button 
                    onClick={() => setBrushColor('#FFFFFF')} 
                    className={`flex-1 py-2 rounded-md border-2 ${brushColor === '#FFFFFF' ? 'border-brand-primary bg-white text-black' : 'border-base-300 bg-base-100 text-text-primary'}`}
                >
                    Reveal (White)
                </button>
            </div>
          </div>
        </div>
    </div>
  );
};

export const ControlPanel: React.FC<ControlPanelProps> = (props) => {
    return (
        <div className="flex flex-col h-full bg-base-200 text-text-primary shadow-xl overflow-hidden relative">
            {/* Header */}
            <div className="p-4 border-b border-base-300 flex items-center justify-between flex-shrink-0 bg-base-100">
                 <div className="flex items-center gap-2">
                    <LogoIcon />
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary">Creative Studio</h1>
                </div>
                <button onClick={props.onClose} className="md:hidden p-2 text-text-secondary hover:text-text-primary"><CloseIcon/></button>
            </div>

            {/* Tabs */}
            <div className="flex p-2 gap-2 bg-base-200 border-b border-base-300 flex-shrink-0">
                <TabButton label="Generate" icon={<GenerateIcon />} isActive={props.activeTab === 'generate'} onClick={() => props.setActiveTab('generate')} />
                <TabButton label="Edit" icon={<EditIcon />} isActive={props.activeTab === 'edit'} onClick={() => props.setActiveTab('edit')} disabled={!props.hasImage && props.layers.length === 0} />
                <TabButton label="Settings" icon={<SettingsIcon />} isActive={props.activeTab === 'settings'} onClick={() => props.setActiveTab('settings')} />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {props.activeTab === 'generate' && (
                    <div className="space-y-6 animate-fade-in">
                         {/* AI Engine Selector */}
                         <div className="bg-base-100 p-3 rounded-lg shadow-sm border border-base-300">
                            <label className="text-sm font-semibold text-text-secondary mb-2 block">AI Engine</label>
                            <div className="flex bg-base-200 rounded-md p-1">
                                <button 
                                    onClick={() => props.onAiEngineChange('gemini')}
                                    className={`flex-1 py-1 px-2 rounded text-sm font-medium transition-colors ${props.aiEngine === 'gemini' ? 'bg-brand-primary text-white shadow' : 'text-text-secondary hover:text-text-primary'}`}
                                >
                                    Gemini 2.5 (Fast)
                                </button>
                                <button 
                                    onClick={() => props.onAiEngineChange('comfyui')}
                                    className={`flex-1 py-1 px-2 rounded text-sm font-medium transition-colors ${props.aiEngine === 'comfyui' ? 'bg-brand-primary text-white shadow' : 'text-text-secondary hover:text-text-primary'}`}
                                >
                                    ComfyUI (Local)
                                </button>
                            </div>
                         </div>

                         {props.aiEngine === 'gemini' ? (
                             <GeminiGeneratePanel {...props} />
                         ) : (
                             <ComfyUIGeneratePanel {...props} />
                         )}
                         
                         <div className="border-t border-base-300 pt-4">
                             <h3 className="text-md font-semibold text-text-primary mb-3 flex items-center gap-2"><PexelsIcon /> Stock Photos (Pexels)</h3>
                             <PexelsPanel 
                                onPexelsSearch={props.onPexelsSearch}
                                pexelsPhotos={props.pexelsPhotos}
                                isPexelsLoading={props.isPexelsLoading}
                                pexelsError={props.pexelsError}
                                onSelectPexelsImage={props.onSelectPexelsImage}
                                isLoading={props.isLoading}
                             />
                         </div>
                    </div>
                )}

                {props.activeTab === 'edit' && (
                    <div className="space-y-6 animate-fade-in">
                        <LayersPanel 
                            layers={props.layers}
                            activeLayerId={props.activeLayerId}
                            onAddLayer={props.onAddLayer}
                            onDeleteLayer={props.onDeleteLayer}
                            onSelectLayer={props.onSelectLayer}
                            onUpdateLayer={props.onUpdateLayer}
                            onReorderLayers={props.onReorderLayers}
                            onCollapseLayers={props.onCollapseLayers}
                            onAddLayerMask={props.onAddLayerMask}
                            onDeleteLayerMask={props.onDeleteLayerMask}
                            onSelectLayerMask={props.onSelectLayerMask}
                            onInvertLayerMask={props.onInvertLayerMask}
                            isEditingMask={props.isEditingMask}
                            isLoading={props.isLoading}
                            onInteractionEndWithHistory={props.onInteractionEndWithHistory}
                        />

                        {/* Contextual Tools based on selection */}
                         {props.isEditingMask ? (
                            <div className="bg-base-100 p-4 rounded-lg shadow-sm border border-base-300">
                                <MaskingTools 
                                    brushSize={props.brushSize} setBrushSize={props.setBrushSize}
                                    brushColor={props.brushColor} setBrushColor={props.setBrushColor}
                                    isLoading={props.isLoading}
                                    autoMaskPrompt={props.autoMaskPrompt} setAutoMaskPrompt={props.setAutoMaskPrompt} onAutoMask={props.onAutoMask}
                                />
                            </div>
                        ) : props.activeLayerId && props.layers.find(l => l.id === props.activeLayerId)?.type === LayerType.ADJUSTMENT ? (
                            <div className="bg-base-100 p-4 rounded-lg shadow-sm border border-base-300">
                                <h3 className="text-md font-semibold text-text-primary mb-4 flex items-center gap-2"><FilterIcon/> Adjustments</h3>
                                <div className="space-y-4">
                                     <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Preset Filter</label>
                                        <select 
                                            value={props.layers.find(l => l.id === props.activeLayerId)?.adjustments?.filter || 'None'} 
                                            onChange={(e) => props.onLayerFilterChange(e.target.value)}
                                            className="w-full bg-base-100 border border-base-300 rounded-md p-2 text-sm"
                                        >
                                            {FILTERS.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                                        </select>
                                    </div>
                                    {/* Sliders for brightness, contrast, color balance */}
                                    {['brightness', 'contrast', 'red', 'green', 'blue'].map(adj => (
                                        <div key={adj}>
                                            <div className="flex justify-between text-xs text-text-secondary mb-1">
                                                <span className="capitalize">{adj}</span>
                                                <span>{props.layers.find(l => l.id === props.activeLayerId)?.adjustments?.[adj as keyof ImageAdjustments]}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="200" 
                                                value={props.layers.find(l => l.id === props.activeLayerId)?.adjustments?.[adj as keyof ImageAdjustments] || 100}
                                                onChange={(e) => props.onLayerAdjustmentChange(adj as keyof ImageAdjustments, Number(e.target.value))}
                                                className="w-full h-2 bg-base-300 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                    ))}
                                    <button onClick={props.onResetLayerAdjustments} className="w-full py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-base-200 rounded transition"><ResetIcon /> Reset Adjustments</button>
                                </div>
                            </div>
                        ) : props.activeLayerId && props.layers.find(l => l.id === props.activeLayerId)?.type === LayerType.PIXEL ? (
                             <div className="bg-base-100 p-4 rounded-lg shadow-sm border border-base-300 space-y-4">
                                <h3 className="text-md font-semibold text-text-primary mb-2 flex items-center gap-2"><DrawIcon/> Drawing & Shapes</h3>
                                <div className="flex gap-2 mb-2">
                                     <button onClick={() => props.setEditMode(EditMode.MOVE)} className={`flex-1 py-2 rounded-md border-2 ${props.editMode === EditMode.MOVE ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-base-300 hover:bg-base-200'}`} title="Move Tool"><MoveIcon /></button>
                                     <button onClick={() => props.setEditMode(EditMode.SKETCH)} className={`flex-1 py-2 rounded-md border-2 ${props.editMode === EditMode.SKETCH ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-base-300 hover:bg-base-200'}`} title="Draw Tool"><BrushIcon /></button>
                                </div>
                                {props.editMode === EditMode.SKETCH && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">Brush Size</label>
                                            <input type="range" min="1" max="50" value={props.brushSize} onChange={(e) => props.setBrushSize(Number(e.target.value))} className="w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">Color</label>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {props.colorPresets.map(color => (
                                                    <button key={color} onClick={() => props.setBrushColor(color)} className={`w-6 h-6 rounded-full border border-base-300 ${props.brushColor === color ? 'ring-2 ring-brand-primary ring-offset-1' : ''}`} style={{backgroundColor: color}} />
                                                ))}
                                                <button onClick={props.onAddColorPreset} className="w-6 h-6 rounded-full bg-base-200 flex items-center justify-center text-text-secondary hover:bg-base-300"><AddIcon /></button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input type="color" value={props.brushColor} onChange={(e) => props.setBrushColor(e.target.value)} className="h-8 w-full cursor-pointer rounded border border-base-300" />
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div className="border-t border-base-300 pt-4 mt-2">
                                     <h4 className="text-sm font-medium text-text-secondary mb-2">Clip Art & Shapes</h4>
                                     <select value={props.selectedClipArtCategoryName} onChange={(e) => props.setSelectedClipArtCategoryName(e.target.value)} className="w-full mb-3 p-2 rounded bg-base-200 border border-base-300 text-sm">
                                         {props.clipArtCategories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                     </select>
                                     <div className="grid grid-cols-4 gap-2">
                                         {props.clipArtCategories.find(c => c.name === props.selectedClipArtCategoryName)?.shapes.map((shape, i) => (
                                             <div key={i} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', shape.dataUrl); }} className="aspect-square bg-base-200 rounded p-1 cursor-grab hover:bg-base-300 flex items-center justify-center border border-transparent hover:border-brand-primary">
                                                 <img src={shape.dataUrl} alt={shape.name} className="max-w-full max-h-full" />
                                             </div>
                                         ))}
                                     </div>
                                     <p className="text-xs text-text-secondary mt-2">Drag and drop shapes onto the canvas.</p>
                                </div>
                                {props.selectedShapeId && (
                                    <button onClick={props.onDeleteSelectedShape} className="w-full mt-2 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition">Delete Selected Shape</button>
                                )}
                                {props.selectedClipArtCategoryName === 'Custom' && (
                                     <button onClick={props.onClearCustomShapes} className="w-full mt-2 py-2 text-xs text-red-500 hover:text-red-700 underline">Clear Saved Shapes</button>
                                )}
                                {props.layers.find(l => l.id === props.activeLayerId)?.strokes?.length ? (
                                    <div className="mt-4 pt-2 border-t border-base-300">
                                        <p className="text-xs text-text-secondary mb-2">Save current drawing as custom shape</p>
                                        <button onClick={() => {
                                            const name = prompt("Enter a name for your shape:");
                                            if(name) props.onSaveShape(name);
                                        }} className="w-full py-2 bg-base-200 text-text-primary rounded hover:bg-base-300 text-sm font-medium">Save as Clip Art</button>
                                    </div>
                                ) : null}
                             </div>
                        ) : (
                             // Image Layer Tools (General)
                            <div className="space-y-6">
                                <div className="bg-base-100 p-4 rounded-lg shadow-sm border border-base-300">
                                    <h3 className="text-md font-semibold text-text-primary mb-3 flex items-center gap-2"><EditIcon /> Smart Edit</h3>
                                    <InteractivePromptInput 
                                        part="edit" label="Instruction" placeholder="e.g., Change the hair color to blue"
                                        prompt={props.editPrompt} onPromptChange={(_p, v) => props.setEditPrompt(v)}
                                        onRewritePrompt={props.onRewritePrompt} rewritingPrompt={props.rewritingPrompt}
                                        onRandomPrompt={props.onRandomPrompt} randomizingPrompt={props.randomizingPrompt}
                                        isLoading={props.isLoading}
                                    />
                                    <button onClick={props.onEdit} disabled={props.isLoading || !props.editPrompt} className="w-full mt-3 bg-brand-primary text-white py-2 rounded-md hover:bg-brand-primary/80 disabled:bg-base-300 transition flex items-center justify-center gap-2">
                                        <EditIcon /> Apply Edit
                                    </button>
                                    <button onClick={props.onAnalyzeImage} disabled={props.isLoading} className="w-full mt-2 bg-base-200 text-text-secondary py-2 rounded-md hover:bg-base-300 transition text-sm">
                                        Analyze Image to Prompt
                                    </button>
                                </div>
                                
                                <div className="bg-base-100 p-4 rounded-lg shadow-sm border border-base-300">
                                    <h3 className="text-md font-semibold text-text-primary mb-3 flex items-center gap-2"><OutpaintIcon /> Outpainting</h3>
                                    <OutpaintControls 
                                        onOutpaint={props.onOutpaint} isLoading={props.isLoading}
                                        outpaintPrompt={props.outpaintPrompt} setOutpaintPrompt={props.setOutpaintPrompt}
                                        outpaintAmount={props.outpaintAmount} setOutpaintAmount={props.setOutpaintAmount}
                                    />
                                </div>
                                
                                <div className="bg-base-100 p-4 rounded-lg shadow-sm border border-base-300">
                                    <h3 className="text-md font-semibold text-text-primary mb-3 flex items-center gap-2"><PaletteIcon /> Style Transfer</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-16 h-16 bg-base-200 rounded border border-base-300 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                {props.styleImage ? <img src={props.styleImage} className="w-full h-full object-cover" alt="Style"/> : <span className="text-xs text-gray-400">No Image</span>}
                                            </div>
                                            <div className="flex-grow">
                                                <button onClick={props.onStyleImageUpload} className="text-sm bg-base-200 px-3 py-1 rounded hover:bg-base-300 transition">Upload Style Ref</button>
                                                {props.styleImage && <button onClick={props.onRemoveStyleImage} className="ml-2 text-xs text-red-500 hover:text-red-700">Remove</button>}
                                            </div>
                                        </div>
                                        {props.styleImage && (
                                            <>
                                                <div>
                                                    <label className="text-xs text-text-secondary block mb-1">Style Strength ({props.styleStrength}%)</label>
                                                    <input type="range" min="10" max="100" value={props.styleStrength} onChange={(e) => props.setStyleStrength(Number(e.target.value))} className="w-full" />
                                                </div>
                                                <button onClick={props.onApplyStyleTransfer} disabled={props.isLoading} className="w-full bg-brand-secondary text-white py-2 rounded-md hover:bg-brand-secondary/80 transition">Apply Style</button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-base-100 p-4 rounded-lg shadow-sm border border-base-300">
                                    <h3 className="text-md font-semibold text-text-primary mb-3 flex items-center gap-2"><RandomIcon /> Remix (Img2Img)</h3>
                                    <div className="space-y-3">
                                        <p className="text-sm text-text-secondary">Regenerate the image using the current canvas and your prompt.</p>
                                        <div>
                                            <label className="text-xs text-text-secondary block mb-1">Preservation ({props.remixPreservation}%)</label>
                                            <input type="range" min="10" max="100" value={props.remixPreservation} onChange={(e) => props.setRemixPreservation(Number(e.target.value))} className="w-full" />
                                            <div className="flex justify-between text-xs text-text-secondary px-1">
                                                <span>Creative</span>
                                                <span>Balanced</span>
                                                <span>Faithful</span>
                                            </div>
                                        </div>
                                        <button onClick={props.onRemixImage} disabled={props.isLoading || !props.editPrompt} className="w-full bg-brand-primary text-white py-2 rounded-md hover:bg-brand-primary/80 transition">
                                            Remix
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {props.activeTab === 'settings' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-base-100 p-4 rounded-lg shadow-sm border border-base-300">
                            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2"><SettingsIcon /> App Settings</h3>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-text-secondary mb-2">Theme</label>
                                <div className="flex items-center gap-2">
                                    <select value={props.activeTheme} onChange={(e) => props.onThemeChange(e.target.value)} className="flex-grow bg-base-100 border border-base-300 rounded-md p-2">
                                        {props.themes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                    </select>
                                    <ThemeSwitcher isDarkMode={props.isDarkMode} onToggle={props.onToggleThemeMode} />
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-text-secondary mb-2">Page Size</label>
                                <div className="grid grid-cols-2 gap-2">
                                     <button onClick={() => props.onPageSizeChange(512, 512)} className="py-2 bg-base-200 rounded hover:bg-base-300 text-sm">Square (512x512)</button>
                                     <button onClick={() => props.onPageSizeChange(1024, 1024)} className="py-2 bg-base-200 rounded hover:bg-base-300 text-sm">Large (1024x1024)</button>
                                     <button onClick={() => props.onPageSizeChange(768, 512)} className="py-2 bg-base-200 rounded hover:bg-base-300 text-sm">Landscape (768x512)</button>
                                     <button onClick={() => props.onPageSizeChange(512, 768)} className="py-2 bg-base-200 rounded hover:bg-base-300 text-sm">Portrait (512x768)</button>
                                </div>
                            </div>

                            <div className="mb-4 pt-4 border-t border-base-300">
                                <h4 className="text-md font-medium text-text-primary mb-2">API Keys</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Pexels API Key</label>
                                        <input 
                                            type="password" 
                                            value={props.pexelsApiKey} 
                                            onChange={(e) => props.onSetPexelsApiKey(e.target.value)} 
                                            placeholder="Enter Pexels API Key"
                                            className="w-full bg-base-100 border border-base-300 rounded-md p-2 text-sm"
                                        />
                                        <a href="https://www.pexels.com/api/" target="_blank" rel="noreferrer" className="text-xs text-brand-secondary hover:underline mt-1 block">Get a free key</a>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4 pt-4 border-t border-base-300">
                                <h4 className="text-md font-medium text-text-primary mb-2">ComfyUI Integration</h4>
                                <div className="space-y-3">
                                     <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Server Address</label>
                                        <input 
                                            type="text" 
                                            value={props.comfyUIServerAddress} 
                                            onChange={(e) => props.onComfyUIServerAddressChange(e.target.value)} 
                                            placeholder="http://127.0.0.1:8188"
                                            className="w-full bg-base-100 border border-base-300 rounded-md p-2 text-sm"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm font-medium ${props.comfyUIConnectionStatus === 'connected' ? 'text-green-500' : props.comfyUIConnectionStatus === 'error' ? 'text-red-500' : 'text-yellow-500'}`}>
                                            Status: {props.comfyUIConnectionStatus.charAt(0).toUpperCase() + props.comfyUIConnectionStatus.slice(1)}
                                        </span>
                                        <button onClick={props.onConnectToComfyUI} disabled={props.isLoading} className="px-3 py-1 bg-brand-primary text-white rounded text-sm hover:bg-brand-primary/80 disabled:opacity-50">
                                            {props.comfyUIConnectionStatus === 'connected' ? 'Refresh' : 'Connect'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 pt-4 border-t border-base-300">
                                <button onClick={props.onClearCustomShapes} className="text-red-500 text-sm hover:underline">Reset All App Data</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Global Actions Footer (Undo/Redo/Clear) */}
            <div className="p-3 bg-base-100 border-t border-base-300 flex justify-between items-center gap-2 flex-shrink-0">
                <button onClick={props.onUndo} disabled={!props.canUndo || props.isLoading} className="p-2 rounded-md bg-base-200 text-text-secondary hover:bg-base-300 disabled:opacity-50" title="Undo"><UndoIcon /></button>
                <button onClick={props.onClear} disabled={props.isLoading || (!props.hasImage && props.layers.length === 0)} className="p-2 rounded-md bg-base-200 text-text-secondary hover:bg-red-100 hover:text-red-600 disabled:opacity-50" title="Clear Canvas"><ClearIcon /></button>
                <button onClick={props.onReset} disabled={props.isLoading} className="p-2 rounded-md bg-base-200 text-text-secondary hover:bg-red-100 hover:text-red-600 disabled:opacity-50" title="Reset All"><ResetIcon /></button>
                <div className="flex-grow"></div>
                <button onClick={props.onOpenOptionsClick} className="flex items-center gap-2 px-3 py-2 bg-base-200 hover:bg-base-300 rounded-md text-sm font-medium text-text-primary transition-colors">
                     <OpenProjectIcon /> <span className="hidden sm:inline">Open</span>
                </button>
            </div>
        </div>
    );
};