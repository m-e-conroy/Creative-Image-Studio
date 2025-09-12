import React from 'react';
import { EditIcon } from './Icons';

interface ImageGalleryProps {
  images: string[];
  onSelectImage: (imageUrl: string) => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, onSelectImage }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-base-200 rounded-lg animate-fade-in">
      <h2 className="text-xl font-bold text-text-primary mb-4">Select an Image to Edit</h2>
      <div className="grid grid-cols-2 gap-4 overflow-y-auto p-2">
        {images.map((src, index) => (
          <div key={index} className="relative group cursor-pointer aspect-square" onClick={() => onSelectImage(src)}>
            <img src={src} alt={`Generated image ${index + 1}`} className="rounded-md w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md">
                <EditIcon />
                <p className="text-white font-bold mt-1">Select & Edit</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};