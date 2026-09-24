import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, Play } from 'lucide-react';

export interface LightboxMediaItem {
  id?: string;
  src: string;
  alt?: string;
  title?: string;
  caption?: string;
  type?: 'image' | 'video';
  videoUrl?: string;
}

interface MediaLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: LightboxMediaItem[];
  currentIndex?: number;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({
  isOpen,
  onClose,
  items,
  currentIndex = 0,
}) => {
  const [index, setIndex] = useState(currentIndex);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setIndex(currentIndex);
    setZoom(1);
  }, [currentIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setIndex((prev) => (prev - 1 + items.length) % items.length);
        setZoom(1);
      } else if (e.key === 'ArrowRight') {
        setIndex((prev) => (prev + 1) % items.length);
        setZoom(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items.length, onClose]);

  if (!isOpen || items.length === 0) return null;

  const currentItem = items[index] || items[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev - 1 + items.length) % items.length);
    setZoom(1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev + 1) % items.length);
    setZoom(1);
  };

  const toggleZoom = () => {
    setZoom((prev) => (prev === 1 ? 1.8 : 1));
  };

  return (
    <div
      className="fixed inset-0 z-[999999] flex flex-col items-center justify-between bg-black/95 text-white backdrop-blur-lg animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      {/* Lightbox Top Header */}
      <div
        className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400">
            {index + 1} / {items.length}
          </span>
          {currentItem.title && (
            <h3 className="text-sm font-bold text-white truncate max-w-md">{currentItem.title}</h3>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentItem.type !== 'video' && (
            <button
              type="button"
              onClick={toggleZoom}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer text-white"
              title={zoom === 1 ? 'Zoom In' : 'Zoom Out'}
            >
              {zoom === 1 ? <ZoomIn className="w-5 h-5" /> : <ZoomOut className="w-5 h-5" />}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer text-white"
            title="Close Lightbox (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Media Container */}
      <div
        className="relative flex-1 w-full flex items-center justify-center p-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {items.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md transition shadow-2xl cursor-pointer"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        )}

        <div className="relative flex items-center justify-center max-w-5xl max-h-[80vh] transition-transform duration-300">
          {currentItem.type === 'video' ? (
            <video
              src={currentItem.src || currentItem.videoUrl}
              controls
              autoPlay
              className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl"
            />
          ) : (
            <img
              src={currentItem.src}
              alt={currentItem.alt || currentItem.title || 'Lightbox Image'}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl transition-transform duration-300"
              style={{ transform: `scale(${zoom})` }}
            />
          )}
        </div>

        {items.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md transition shadow-2xl cursor-pointer"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        )}
      </div>

      {/* Lightbox Footer Caption */}
      {(currentItem.caption || currentItem.alt) && (
        <div
          className="w-full text-center px-6 py-4 bg-gradient-to-t from-black/80 to-transparent z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-semibold text-slate-300 max-w-xl mx-auto leading-relaxed">
            {currentItem.caption || currentItem.alt}
          </p>
        </div>
      )}
    </div>
  );
};
