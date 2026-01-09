import { useState, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface ImageZoomProps {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}

export const ImageZoom = ({ src, alt, open, onClose }: ImageZoomProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.5, 1));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    }
  }, [isDragging, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scale > 1 && e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging && scale > 1 && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y,
      });
    }
  }, [isDragging, scale]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setScale((prev) => Math.min(Math.max(prev + delta, 1), 4));
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (scale === 1) {
      setScale(2);
    } else {
      handleReset();
    }
  }, [scale]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
        {/* Controls */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleZoomOut}
            disabled={scale <= 1}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-white text-sm min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleZoomIn}
            disabled={scale >= 4}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-white/30" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full text-white bg-black/50 hover:bg-black/70"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Image container */}
        <div
          ref={containerRef}
          className="w-full h-[90vh] flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain select-none transition-transform duration-100"
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            }}
            draggable={false}
          />
        </div>

        {/* Instructions */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs text-center">
          <p>Double-click to zoom • Drag to pan • Scroll to zoom</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
