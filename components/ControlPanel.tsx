import React from 'react';
import { EditMode, ImageStyle, Filter, PromptState, PromptPart, LightingStyle, CompositionRule } from '../types';
import { INITIAL_STYLES, SUPPORTED_ASPECT_RATIOS, FILTERS, LIGHTING_STYLES, COMPOSITION_RULES } from '../constants';
import { BrushIcon, ClearIcon, DrawIcon, EditIcon, GenerateIcon, MaskIcon, ResetIcon, FilterIcon, RewriteIcon } from './Icons';

type Tab = 'generate' | 'edit' | 'filters';

interface ControlPanelProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  prompt: PromptState;
  onPromptChange: (part: PromptPart, value: string) => void;
  onRewritePrompt: (part: PromptPart) => void;
  rewritingPrompt: PromptPart | null;
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
      ${isActive ? 'bg-brand-primary text-white' : 'bg-base-200 hover:bg-base-300 text-text-secondary'}
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

const PromptInput: React.FC<{
  part: PromptPart;
  label: string;
  placeholder: string;
  prompt: PromptState;
  onPromptChange: (part: PromptPart, value: string) => void;
  onRewritePrompt: (part: PromptPart) => void;
  rewritingPrompt: PromptPart | null;
  isLoading: boolean;
}> = ({ part, label, placeholder, prompt, onPromptChange, onRewritePrompt, rewritingPrompt, isLoading }) => (
  <div>
    <label htmlFor={`prompt-${part}`} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
    <div className="relative">
      <textarea
        id={`prompt-${part}`}
        rows={2}
        value={prompt[part]}
        onChange={(e) => onPromptChange(part, e.target.value)}
        placeholder={placeholder}
        className="w-full bg-base-200 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition pr-10"
        disabled={isLoading || !!rewritingPrompt}
      />
      <button
        onClick={() => onRewritePrompt(part)}
        disabled={isLoading || !!rewritingPrompt || !prompt[part]}
        className="absolute top-2 right-2 p-1 rounded-full bg-base-100/50 text-text-secondary hover:bg-brand-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
        aria-label={`Enhance ${part} prompt`}
        title={`Enhance ${part} prompt`}
      >
        {rewritingPrompt === part ? <MiniLoader /> : <RewriteIcon />}
      </button>
    </div>
  </div>
);


const GenerateTab: React.FC<Pick<ControlPanelProps, 'prompt' | 'onPromptChange' | 'onRewritePrompt' | 'rewritingPrompt' | 'style' | 'setStyle' | 'lighting' | 'setLighting' | 'composition' | 'setComposition' | 'aspectRatio' | 'setAspectRatio' | 'numImages' | 'setNumImages' | 'onGenerate' | 'isLoading'>> = ({
  prompt, onPromptChange, onRewritePrompt, rewritingPrompt, style, setStyle, lighting, setLighting, composition, setComposition, aspectRatio, setAspectRatio, numImages, setNumImages, onGenerate, isLoading
}) => (
  <div className="flex flex-col space-y-4">
    <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">1. Describe Your Image</h2>
    <PromptInput part="subject" label="Subject" placeholder="e.g., A majestic lion" prompt={prompt} onPromptChange={onPromptChange} onRewritePrompt={onRewritePrompt} rewritingPrompt={rewritingPrompt} isLoading={isLoading} />
    <PromptInput part="foreground" label="Foreground" placeholder="e.g., wearing a golden crown" prompt={prompt} onPromptChange={onPromptChange} onRewritePrompt={onRewritePrompt} rewritingPrompt={rewritingPrompt} isLoading={isLoading} />
    <PromptInput part="background" label="Background" placeholder="e.g., on a rocky cliff at sunset" prompt={prompt} onPromptChange={onPromptChange} onRewritePrompt={onRewritePrompt} rewritingPrompt={rewritingPrompt} isLoading={isLoading} />
    
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label htmlFor="style" className="block text-sm font-medium text-text-secondary mb-1">Artistic Style</label>
        <select id="style" value={style.name} onChange={(e) => setStyle(INITIAL_STYLES.find(s => s.name === e.target.value) || INITIAL_STYLES[0])} className="w-full bg-base-200 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition" disabled={isLoading || !!rewritingPrompt}>
          {INITIAL_STYLES.map(s => <option key={s.name}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="lighting" className="block text-sm font-medium text-text-secondary mb-1">Lighting Style</label>
        <select id="lighting" value={lighting.name} onChange={(e) => setLighting(LIGHTING_STYLES.find(l => l.name === e.target.value) || LIGHTING_STYLES[0])} className="w-full bg-base-200 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition" disabled={isLoading || !!rewritingPrompt}>
          {LIGHTING_STYLES.map(l => <option key={l.name}>{l.name}</option>)}
        </select>
      </div>
    </div>

    <div>
        <label htmlFor="composition" className="block text-sm font-medium text-text-secondary mb-1">Composition</label>
        <select id="composition" value={composition.name} onChange={(e) => setComposition(COMPOSITION_RULES.find(c => c.name === e.target.value) || COMPOSITION_RULES[0])} className="w-full bg-base-200 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition" disabled={isLoading || !!rewritingPrompt}>
          {COMPOSITION_RULES.map(c => <option key={c.name}>{c.name}</option>)}
        </select>
      </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label htmlFor="aspectRatio" className="block text-sm font-medium text-text-secondary mb-1">Image Size</label>
        <select id="aspectRatio" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-base-200 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition" disabled={isLoading || !!rewritingPrompt}>
          {SUPPORTED_ASPECT_RATIOS.map(ar => <option key={ar.value} value={ar.value}>{ar.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="numImages" className="block text-sm font-medium text-text-secondary mb-1">Images ({numImages})</label>
        <input id="numImages" type="range" min="1" max="4" value={numImages} onChange={(e) => setNumImages(Number(e.target.value))} className="w-full h-2 bg-base-200 rounded-lg appearance-none cursor-pointer" disabled={isLoading || !!rewritingPrompt} />
      </div>
    </div>

    <button onClick={onGenerate} disabled={isLoading || !prompt.subject || !!rewritingPrompt} className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/80 disabled:bg-base-300 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200">
      <GenerateIcon /> {isLoading ? 'Generating...' : 'Generate'}
    </button>
  </div>
);

const EditTab: React.FC<Pick<ControlPanelProps, 'editPrompt' | 'setEditPrompt' | 'editMode' | 'setEditMode' | 'brushSize' | 'setBrushSize' | 'brushColor' | 'setBrushColor' | 'onEdit' | 'onClear' | 'onReset' | 'isLoading'>> = ({
  editPrompt, setEditPrompt, editMode, setEditMode, brushSize, setBrushSize, brushColor, setBrushColor, onEdit, onClear, onReset, isLoading
}) => (
    <div className="flex flex-col space-y-4">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">2. Edit Your Creation</h2>
        <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Editing Mode</label>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setEditMode(EditMode.MASK)} disabled={isLoading} className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md transition text-sm ${editMode === EditMode.MASK ? 'bg-brand-secondary text-white' : 'bg-base-200 hover:bg-base-300'}`}><MaskIcon /> Mask</button>
                <button onClick={() => setEditMode(EditMode.SKETCH)} disabled={isLoading} className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md transition text-sm ${editMode === EditMode.SKETCH ? 'bg-brand-secondary text-white' : 'bg-base-200 hover:bg-base-300'}`}><DrawIcon /> Sketch</button>
            </div>
        </div>
        <div>
            <label htmlFor="brush-size" className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2"><BrushIcon/> Brush Options</label>
            <div className="flex items-center gap-4">
                <input id="brush-size" type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-2 bg-base-200 rounded-lg appearance-none cursor-pointer" disabled={isLoading} />
                {editMode === EditMode.SKETCH && (<input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="w-10 h-10 p-1 bg-base-200 border border-base-300 rounded-md cursor-pointer" disabled={isLoading} />)}
            </div>
        </div>
        <div>
            <label htmlFor="edit-prompt" className="block text-sm font-medium text-text-secondary mb-1">Editing Prompt</label>
            <textarea id="edit-prompt" rows={3} value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder={editMode === EditMode.MASK ? "e.g., Turn the masked area into a river" : "e.g., Add a red boat based on my sketch"} className="w-full bg-base-200 border border-base-300 rounded-md p-2 focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary transition" disabled={isLoading} />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <button onClick={onClear} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-base-300 hover:bg-base-300/80 disabled:bg-base-300/50 text-text-secondary font-bold py-2 px-4 rounded-md transition"><ClearIcon /> Clear</button>
            <button onClick={onReset} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-base-300 hover:bg-base-300/80 disabled:bg-base-300/50 text-text-secondary font-bold py-2 px-4 rounded-md transition"><ResetIcon /> Reset</button>
        </div>
        <button onClick={onEdit} disabled={isLoading || !editPrompt} className="w-full flex items-center justify-center gap-2 bg-brand-secondary hover:bg-brand-secondary/80 disabled:bg-base-300 text-white font-bold py-2 px-4 rounded-md transition duration-200"><EditIcon /> Apply Edit</button>
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
                        ${activeFilter.name === filter.name ? 'bg-brand-secondary text-white ring-2 ring-offset-2 ring-offset-base-200 ring-brand-secondary' : 'bg-base-200 hover:bg-base-300 text-text-secondary'}
                    `}
                >
                    {filter.name}
                </button>
            ))}
         </div>
    </div>
);


export const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const { activeTab, setActiveTab, hasImage } = props;

  return (
    <div className="flex flex-col space-y-6">
      <div className="grid grid-cols-3 gap-2 p-1 bg-base-300/50 rounded-lg">
        <TabButton label="Generate" icon={<GenerateIcon />} isActive={activeTab === 'generate'} onClick={() => setActiveTab('generate')} />
        <TabButton label="Edit" icon={<EditIcon />} isActive={activeTab === 'edit'} onClick={() => setActiveTab('edit')} disabled={!hasImage} />
        <TabButton label="Filters" icon={<FilterIcon />} isActive={activeTab === 'filters'} onClick={() => setActiveTab('filters')} disabled={!hasImage} />
      </div>

      <div className="p-4 bg-base-300/50 rounded-lg">
        {activeTab === 'generate' && <GenerateTab {...props} />}
        {activeTab === 'edit' && hasImage && <EditTab {...props} />}
        {activeTab === 'filters' && hasImage && <FiltersTab {...props} />}
      </div>
    </div>
  );
};
