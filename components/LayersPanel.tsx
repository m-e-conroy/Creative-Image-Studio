import React, { useState } from 'react';
import { Layer, LayerType } from '../types';
import { LayersIcon, VisibilityOnIcon, VisibilityOffIcon, AddLayerIcon, DeleteLayerIcon } from './Icons';

interface LayersPanelProps {
    layers: Layer[];
    activeLayerId: string | null;
    onAddLayer: (type: LayerType) => void;
    onDeleteLayer: (id: string) => void;
    onSelectLayer: (id: string) => void;
    onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
    onReorderLayers: (dragId: string, dropId: string) => void;
    isLoading: boolean;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
    layers, activeLayerId, onAddLayer, onDeleteLayer, onSelectLayer, onUpdateLayer, onReorderLayers, isLoading
}) => {
    const [draggedId, setDraggedId] = useState<string | null>(null);

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

    const activeLayer = layers.find(l => l.id === activeLayerId);

    return (
        <div className="space-y-3 p-3 bg-base-200/50 rounded-md">
            <h3 className="text-md font-semibold text-text-primary flex items-center gap-2"><LayersIcon/> Layers</h3>
            <div className="bg-base-100 rounded-md p-1 space-y-1 max-h-60 overflow-y-auto">
                {layers.slice().reverse().map(layer => {
                    const isActive = layer.id === activeLayerId;
                    return (
                        <div
                            key={layer.id}
                            draggable={!isLoading}
                            onDragStart={(e) => handleDragStart(e, layer.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, layer.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => onSelectLayer(layer.id)}
                            className={`flex items-center gap-2 p-2 rounded-md transition-all duration-150 ${isActive ? 'bg-brand-secondary/30 ring-2 ring-brand-secondary' : 'hover:bg-base-200'} ${draggedId === layer.id ? 'opacity-50' : ''} ${!isLoading ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        >
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
                            <span className="flex-grow text-sm truncate">{layer.name}</span>
                            <span className="text-xs text-text-secondary capitalize bg-base-200 px-2 py-0.5 rounded-full">{layer.type}</span>
                        </div>
                    );
                })}
            </div>
             <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={activeLayer?.name || ''}
                    onChange={(e) => activeLayer && onUpdateLayer(activeLayer.id, { name: e.target.value })}
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
                    className="w-24"
                    disabled={!activeLayer || isLoading}
                />
            </div>
            <div className="flex items-center justify-end gap-2">
                 <button
                    onClick={() => onAddLayer(LayerType.PIXEL)}
                    disabled={isLoading}
                    className="p-2 bg-base-100 text-text-secondary rounded-md hover:bg-base-300 disabled:opacity-50 transition"
                    title="Add New Pixel Layer"
                >
                    <AddLayerIcon />
                </button>
                <button
                    onClick={() => activeLayerId && onDeleteLayer(activeLayerId)}
                    disabled={isLoading || !activeLayerId || layers.length <= 1}
                    className="p-2 bg-base-100 text-text-secondary rounded-md hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="Delete Selected Layer"
                >
                    <DeleteLayerIcon />
                </button>
            </div>
        </div>
    );
};
