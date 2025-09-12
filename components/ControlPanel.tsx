import React, { useState, useEffect } from 'react';
import { EditMode, ImageStyle, Filter, PromptState, PromptPart, LightingStyle, CompositionRule } from '../types';
import { INITIAL_STYLES, SUPPORTED_ASPECT_RATIOS, FILTERS, LIGHTING_STYLES, COMPOSITION_RULES } from '../constants';
import { BrushIcon, ClearIcon, DrawIcon, EditIcon, GenerateIcon, MaskIcon, ResetIcon, FilterIcon, RewriteIcon, RandomIcon, UploadIcon, OutpaintIcon, ArrowUpIcon, ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, CropIcon, IdeaIcon } from './Icons';

type Tab = 'generate' | 'edit' | 'filters';

interface ControlPanelProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  prompt: PromptState;
  onPromptChange: (part: PromptPart, value: string) => void;
  onRewritePrompt: (part: PromptPart) => void;
  rewritingPrompt: PromptPart | null;
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
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
  numImages: number;
  setNumImages: (value: number) => void;
  onGenerate: () => void;
  onEdit: () => void;
  onOutpaint: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onCrop: () => void;
  cropRectActive: boolean;
  onUploadClick: () => void;
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
  activeFilter: Filter;
  setActiveFilter: (filter: Filter) => void;
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
            className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition pr-20 text-text-primary"
            disabled={isLoading || !!rewritingPrompt || !!randomizingPrompt}
          />
          <div className="absolute top-2 right-2 flex items-center space-x-1">
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


const GenerateTab: React.FC<Pick<ControlPanelProps, 'prompt' | 'onPromptChange' | 'onRewritePrompt' | 'rewritingPrompt' | 'onRandomPrompt' | 'randomizingPrompt' | 'onGetSuggestions' | 'subjectSuggestions' | 'backgroundSuggestions' | 'suggestionsLoading' | 'style' | 'setStyle' | 'lighting' | 'setLighting' | 'composition' | 'setComposition' | 'aspectRatio' | 'setAspectRatio' | 'numImages' | 'setNumImages' | 'onGenerate' | 'isLoading'>> = ({
  prompt, onPromptChange, onRewritePrompt, rewritingPrompt, onRandomPrompt, randomizingPrompt, onGetSuggestions, subjectSuggestions, backgroundSuggestions, suggestionsLoading, style, setStyle, lighting, setLighting, composition, setComposition, aspectRatio, setAspectRatio, numImages, setNumImages, onGenerate, isLoading
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

    <div>
        <label htmlFor="composition" className="block text-sm font-medium text-text-secondary mb-1">Composition</label>
        <select id="composition" value={composition.name} onChange={(e) => setComposition(COMPOSITION_RULES.find(c => c.name === e.target.value) || COMPOSITION_RULES[0])} className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition" disabled={isLoading || !!rewritingPrompt || !!randomizingPrompt}>
          {COMPOSITION_RULES.map(c => <option key={c.name}>{c.name}</option>)}
        </select>
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

const OutpaintControls: React.FC<{ onOutpaint: ControlPanelProps['onOutpaint'], isLoading: boolean }> = ({ onOutpaint, isLoading }) => (
    <div className="flex flex-col items-center space-y-3">
        <p className="text-sm text-text-secondary text-center">Click a direction to expand the canvas. The AI will fill the new space.</p>
        <div className="grid grid-cols-3 grid-rows-3 gap-2 w-40">
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
);

const CropControls: React.FC<{ onCrop: () => void, onClear: () => void, isLoading: boolean, cropRectActive: boolean }> = ({ onCrop, onClear, isLoading, cropRectActive }) => (
    <div className="flex flex-col items-center space-y-3">
        <p className="text-sm text-text-secondary text-center">Click and drag on the image to select an area to crop.</p>
        <div className="w-full grid grid-cols-2 gap-2">
           <button onClick={onClear} disabled={isLoading || !cropRectActive} className="w-full flex items-center justify-center gap-2 bg-base-300 hover:bg-base-300/80 disabled:opacity-50 text-text-secondary font-bold py-2 px-4 rounded-md transition"><ClearIcon /> Clear Selection</button>
           <button onClick={onCrop} disabled={isLoading || !cropRectActive} className="w-full flex items-center justify-center gap-2 bg-brand-secondary hover:bg-brand-secondary/80 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-md transition duration-200"><CropIcon /> Apply Crop</button>
        </div>
    </div>
);


const EditTab: React.FC<Pick<ControlPanelProps, 'editPrompt' | 'setEditPrompt' | 'editMode' | 'setEditMode' | 'brushSize' | 'setBrushSize' | 'brushColor' | 'setBrushColor' | 'onEdit' | 'onClear' | 'onReset' | 'isLoading' | 'onRandomPrompt' | 'randomizingPrompt' | 'onOutpaint' | 'onCrop' | 'cropRectActive'>> = ({
  editPrompt, setEditPrompt, editMode, setEditMode, brushSize, setBrushSize, brushColor, setBrushColor, onEdit, onClear, onReset, isLoading, onRandomPrompt, randomizingPrompt, onOutpaint, onCrop, cropRectActive
}) => (
    <div className="flex flex-col space-y-4">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">2. Edit Your Creation</h2>
        <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Editing Mode</label>
            <div className="grid grid-cols-4 gap-2">
                <button onClick={() => setEditMode(EditMode.MASK)} disabled={isLoading} className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md transition text-sm ${editMode === EditMode.MASK ? 'bg-brand-secondary text-white' : 'bg-base-100 hover:bg-base-300'}`}><MaskIcon /> Mask</button>
                <button onClick={() => setEditMode(EditMode.SKETCH)} disabled={isLoading} className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md transition text-sm ${editMode === EditMode.SKETCH ? 'bg-brand-secondary text-white' : 'bg-base-100 hover:bg-base-300'}`}><DrawIcon /> Sketch</button>
                <button onClick={() => setEditMode(EditMode.OUTPAINT)} disabled={isLoading} className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md transition text-sm ${editMode === EditMode.OUTPAINT ? 'bg-brand-secondary text-white' : 'bg-base-100 hover:bg-base-300'}`}><OutpaintIcon /> Outpaint</button>
                <button onClick={() => setEditMode(EditMode.CROP)} disabled={isLoading} className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md transition text-sm ${editMode === EditMode.CROP ? 'bg-brand-secondary text-white' : 'bg-base-100 hover:bg-base-300'}`}><CropIcon /> Crop</button>
            </div>
        </div>
        
        {editMode === EditMode.OUTPAINT ? (
            <OutpaintControls onOutpaint={onOutpaint} isLoading={isLoading} />
        ) : editMode === EditMode.CROP ? (
            <CropControls onCrop={onCrop} onClear={onClear} isLoading={isLoading} cropRectActive={cropRectActive} />
        ) : (
        <>
            <div>
                <label htmlFor="brush-size" className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2"><BrushIcon/> Brush Options</label>
                <div className="flex items-center gap-4">
                    <input id="brush-size" type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-2 bg-base-300 rounded-lg appearance-none cursor-pointer" disabled={isLoading} />
                    {editMode === EditMode.SKETCH && (<input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="w-10 h-10 p-1 bg-base-100 border border-base-300 rounded-md cursor-pointer" disabled={isLoading} />)}
                </div>
            </div>
            <div>
                <label htmlFor="edit-prompt" className="block text-sm font-medium text-text-secondary mb-1">Editing Prompt</label>
                <div className="relative">
                    <textarea id="edit-prompt" rows={3} value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder={editMode === EditMode.MASK ? "e.g., Turn the masked area into a river" : "e.g., Add a red boat based on my sketch"} className="w-full bg-base-100 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary transition text-text-primary pr-10" disabled={isLoading || randomizingPrompt === 'edit'} />
                    <button
                        onClick={() => onRandomPrompt('edit')}
                        disabled={isLoading || randomizingPrompt === 'edit'}
                        className="absolute top-2 right-2 p-1 rounded-full bg-base-200/50 text-text-secondary hover:bg-brand-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                        aria-label="Generate random edit prompt"
                        title="Generate random edit prompt"
                    >
                        {randomizingPrompt === 'edit' ? <MiniLoader /> : <RandomIcon />}
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={onClear} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-base-300 hover:bg-base-300/80 disabled:bg-base-300/50 text-text-secondary font-bold py-2 px-4 rounded-md transition"><ClearIcon /> Clear</button>
                <button onClick={onReset} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-base-300 hover:bg-base-300/80 disabled:bg-base-300/50 text-text-secondary font-bold py-2 px-4 rounded-md transition"><ResetIcon /> Reset</button>
            </div>
            <button onClick={onEdit} disabled={isLoading || !editPrompt} className="w-full flex items-center justify-center gap-2 bg-brand-secondary hover:bg-brand-secondary/80 disabled:bg-base-300 text-white font-bold py-2 px-4 rounded-md transition duration-200"><EditIcon /> Apply Edit</button>
        </>
        )}
    </div>
);

const FiltersTab: React.FC<Pick<ControlPanelProps, 'activeFilter' | 'setActiveFilter' | 'isLoading'>> = ({
    activeFilter, setActiveFilter, isLoading
}) => (
    <div className="flex flex-col space-y-4">
         <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">3. Apply Filters</h2>
         <div className="grid grid-cols-2 gap-2">
            {FILTERS.map(filter => (
                <button
                    key={filter.name}
                    onClick={() => setActiveFilter(filter)}
                    disabled={isLoading}
                    className={`py-2 px-3 rounded-md transition text-sm font-semibold text-center
                        ${activeFilter.name === filter.name ? 'bg-brand-secondary text-white ring-2 ring-offset-2 ring-offset-base-200 ring-brand-secondary' : 'bg-base-100 hover:bg-base-300 text-text-secondary'}
                    `}
                >
                    {filter.name}
                </button>
            ))}
         </div>
    </div>
);


export const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const { activeTab, setActiveTab, hasImage, onUploadClick, isLoading } = props;

  return (
    <div className="flex flex-col space-y-6">
      <div className="grid grid-cols-3 gap-2 p-1 bg-base-100 rounded-lg">
        <TabButton label="Generate" icon={<GenerateIcon />} isActive={activeTab === 'generate'} onClick={() => setActiveTab('generate')} />
        <TabButton label="Edit" icon={<EditIcon />} isActive={activeTab === 'edit'} onClick={() => setActiveTab('edit')} disabled={!hasImage} />
        <TabButton label="Filters" icon={<FilterIcon />} isActive={activeTab === 'filters'} onClick={() => setActiveTab('filters')} disabled={!hasImage} />
      </div>
      
      <div className="px-1">
          <button 
            onClick={onUploadClick} 
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-base-100 hover:bg-base-300 disabled:opacity-50 text-text-secondary font-bold py-2 px-4 rounded-md transition duration-200 border border-base-300"
          >
            <UploadIcon /> Upload Image to Edit
          </button>
        </div>

      <div className="p-4 bg-base-100/50 rounded-lg">
        {activeTab === 'generate' && <GenerateTab {...props} />}
        {activeTab === 'edit' && hasImage && <EditTab {...props} />}
        {activeTab === 'filters' && hasImage && <FiltersTab {...props} />}
      </div>
    </div>
  );
};