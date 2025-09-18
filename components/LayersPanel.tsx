import React, { useState } from 'react';
import { Layer, LayerType } from '../types';
import { LayersIcon, VisibilityOnIcon, VisibilityOffIcon, AddLayerIcon, TrashIcon, LayerMaskIcon, DrawIcon, AdjustmentLayerIcon, AddIcon } from './Icons';

interface LayersPanelProps {
    layers: Layer[];
    activeLayerId: string | null;
    isEditingMask: boolean;
    onAddLayer: (type: LayerType) => void;
    onDeleteLayer: (id: string) => void;
    onSelectLayer: (id: string) => void;
    onSelectLayerMask: (id: string) => void;
    onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
    onReorderLayers: (dragId: string, dropId: string) => void;
    onAddLayerMask: (id: string) => void;
    onDeleteLayerMask: (id: string) => void;
    isLoading: boolean;
    onInteractionEndWithHistory: () => void;
}

const LayerItem: React.FC<{
    layer: Layer;
    isActive: boolean;
    isEditingMask: boolean;
    onSelectLayer: (id: string) => void;
    onSelectLayerMask: (id: string) => void;
    onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
    onAddLayerMask: (id: string) => void;
    onDeleteLayerMask: (id: string) => void;
    isLoading: boolean;
}> = ({ layer, isActive, isEditingMask, onSelectLayer, onSelectLayerMask, onUpdateLayer, onAddLayerMask, onDeleteLayerMask, isLoading }) => {
    
    const layerThumbStyle = {
        backgroundImage: layer.type === LayerType.IMAGE && layer.src ? `url(${layer.src})` : 'none',
    };
    const maskThumbStyle = {
        backgroundImage: layer.maskSrc ? `url(${layer.maskSrc})` : 'none',
        backgroundColor: 'white'
    };

    const handleToggleMask = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdateLayer(layer.id, { maskEnabled: !layer.maskEnabled });
    };
    
    const isPixelBased = layer.type === LayerType.IMAGE || layer.type === LayerType.PIXEL;

    return (
        <div className={`flex items-center gap-2 p-2 rounded-md transition-all duration-150 bg-base-100 ${isActive ? 'bg-brand-secondary/20' : 'hover:bg-base-200'} ${!isLoading ? 'cursor-pointer' : 'cursor-not-allowed'}`} onClick={() => onSelectLayer(layer.id)}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onUpdateLayer(layer.id, { isVisible: !layer.isVisible });
                }}
                className="p-1 rounded-full text-text-secondary hover:bg-base-300 disabled:opacity-50"
                disabled={isLoading}
                title={layer.isVisible ? 'Hide Layer' : 'Show Layer'}
            >
                {layer.isVisible ? <VisibilityOnIcon /> : <VisibilityOffIcon />}
            </button>

            <div
                className={`w-10 h-10 rounded bg-base-200 bg-cover bg-center ring-2 flex items-center justify-center ${isActive && !isEditingMask ? 'ring-brand-primary' : 'ring-transparent'}`}
                style={layerThumbStyle}
            >
                {layer.type === LayerType.ADJUSTMENT && <AdjustmentLayerIcon className="w-6 h-6 text-text-secondary"/>}
                {layer.type === LayerType.PIXEL && <DrawIcon/>}
            </div>

            {isPixelBased && (
                <div className="relative">
                    <div
                        onClick={(e) => { e.stopPropagation(); layer.maskSrc ? onSelectLayerMask(layer.id) : onAddLayerMask(layer.id); }}
                        className={`w-10 h-10 rounded bg-cover bg-center ring-2 flex items-center justify-center text-text-secondary ${isActive && isEditingMask ? 'ring-brand-primary' : 'ring-transparent'} ${layer.maskSrc ? '' : 'bg-base-200 hover:bg-base-300'}`}
                        style={maskThumbStyle}
                        title={layer.maskSrc ? "Edit Layer Mask" : "Add Layer Mask"}
                    >
                        {!layer.maskSrc && <LayerMaskIcon className="w-6 h-6" />}
                    </div>
                    {layer.maskSrc && (
                        <button 
                            onClick={handleToggleMask} 
                            className={`absolute -bottom-1 -left-1 p-0.5 rounded-full text-white text-xs ${layer.maskEnabled ? 'bg-green-500' : 'bg-gray-500'}`}
                            title={layer.maskEnabled ? "Disable Mask" : "Enable Mask"}
                        >
                           {layer.maskEnabled ? <VisibilityOnIcon/> : <VisibilityOffIcon/>}
                        </button>
                    )}
                </div>
            )}

            <span className={`flex-grow text-sm truncate px-1 ${!isPixelBased ? 'col-start-3' : ''}`}>{layer.name}</span>
            
            {layer.maskSrc && isPixelBased && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDeleteLayerMask(layer.id); }}
                    className="p-1 rounded-full text-text-secondary hover:bg-red-500 hover:text-white disabled:opacity-50"
                    disabled={isLoading}
                    title="Delete Layer Mask"
                >
                   <TrashIcon/>
                </button>
            )}
        </div>
    );
};

export const LayersPanel: React.FC<LayersPanelProps> = (props) => {
    const { layers, activeLayerId, onAddLayer, onDeleteLayer, onUpdateLayer, onReorderLayers, isLoading, onInteractionEndWithHistory } = props;
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropId: string) => {
        e.preventDefault();
        if (draggedId && draggedId !== dropId) {
            onReorderLayers(draggedId, dropId);
        }
        setDraggedId(null);
    };

    const handleDragEnd = () => {
        setDraggedId(null);
    };

    const handleAddLayer = (type: LayerType) => {
        onAddLayer(type);
        setIsAddMenuOpen(false);
    };

    const activeLayer = layers.find(l => l.id === activeLayerId);
    
    // Layers are displayed in reverse order of the state array.
    const reversedLayers = layers.slice().reverse();
    // Find the indices of visible adjustment layers in the display order.
    const adjustmentIndices = reversedLayers
        .map((l, i) => (l.type === LayerType.ADJUSTMENT && l.isVisible ? i : -1))
        .filter(i => i !== -1);

    return (
        <div className="space-y-3 p-3 bg-base-200/50 rounded-md">
            <h3 className="text-md font-semibold text-text-primary flex items-center gap-2"><LayersIcon/> Layers</h3>
            <div className="bg-base-100 rounded-md p-1 space-y-1 max-h-60 overflow-y-auto">
                {reversedLayers.map((layer, index) => {
                    // A layer is affected if its index in the display list is greater than
                    // the index of any visible adjustment layer.
                    const isAffected = adjustmentIndices.some(adjIndex => index > adjIndex);
                    return (
                        <div
                            key={layer.id}
                            draggable={!isLoading}
                            onDragStart={(e) => handleDragStart(e, layer.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, layer.id)}
                            onDragEnd={handleDragEnd}
                            className={`${draggedId === layer.id ? 'opacity-30' : ''} ${isAffected ? 'ml-3 border-l-2 border-brand-secondary/30' : ''} transition-all duration-150`}
                        >
                           <LayerItem {...props} layer={layer} isActive={layer.id === activeLayerId} />
                        </div>
                    )
                })}
            </div>
             <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={activeLayer?.name || ''}
                    onChange={(e) => activeLayer && onUpdateLayer(activeLayer.id, { name: e.target.value })}
                    onBlur={() => onInteractionEndWithHistory()}
                    placeholder="Layer Name"
                    className="flex-grow bg-base-100 border border-base-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-brand-secondary"
                    disabled={!activeLayer || isLoading}
                />
                <label htmlFor="layer-opacity" className="sr-only">Opacity</label>
                <input
                    id="layer-opacity"
                    type="range"
                    min="0"
                    max="100"
                    value={activeLayer?.opacity || 100}
                    onChange={(e) => activeLayer && onUpdateLayer(activeLayer.id, { opacity: Number(e.target.value) })}
                    onMouseUp={() => onInteractionEndWithHistory()}
                    className="w-24"
                    disabled={!activeLayer || isLoading}
                />
            </div>
            <div className="flex items-center justify-end gap-2 relative">
                 <button
                    onClick={() => setIsAddMenuOpen(prev => !prev)}
                    disabled={isLoading}
                    className="p-2 bg-base-100 text-text-secondary rounded-md hover:bg-base-300 disabled:opacity-50 transition"
                    title="Add New Layer"
                >
                    <AddIcon />
                </button>
                {isAddMenuOpen && (
                    <div className="absolute bottom-full right-10 mb-2 w-48 bg-base-200 rounded-md shadow-lg z-10 p-1">
                        <button onClick={() => handleAddLayer(LayerType.PIXEL)} className="w-full text-left flex items-center gap-2 p-2 text-sm rounded hover:bg-base-300"><DrawIcon /> New Pixel Layer</button>
                        <button onClick={() => handleAddLayer(LayerType.ADJUSTMENT)} className="w-full text-left flex items-center gap-2 p-2 text-sm rounded hover:bg-base-300"><AdjustmentLayerIcon className="w-5 h-5"/> New Adjustment Layer</button>
                    </div>
                )}
                <button
                    onClick={() => activeLayerId && onDeleteLayer(activeLayerId)}
                    disabled={isLoading || !activeLayerId}
                    className="p-2 bg-base-100 text-text-secondary rounded-md hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="Delete Selected Layer"
                >
                    <TrashIcon />
                </button>
            </div>
        </div>
    );
};