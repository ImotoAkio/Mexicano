import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, WheelEvent as ReactWheelEvent } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  maxZoom?: number;
}

export function ZoomableImage({ src, alt, className = '', maxZoom = 5 }: ZoomableImageProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset when src changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [src]);

  const handleWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomSensitivity = 0.002;
    const delta = -e.deltaY * zoomSensitivity;
    let newScale = scale + delta;
    
    // Limit scale
    if (newScale < 1) newScale = 1;
    if (newScale > maxZoom) newScale = maxZoom;
    
    // If returning to normal scale, reset position
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
    
    setScale(newScale);
  };

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (scale <= 1) return; // Only allow drag if zoomed in
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    // Calculate new position
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Touch support for mobile
  const handleTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (scale <= 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStart.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    };
  };

  const handleTouchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (!isDragging || e.touches.length > 1) return; // Don't drag if pinching (multitouch)
    e.preventDefault();
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.current.x,
      y: touch.clientY - dragStart.current.y
    });
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.5, maxZoom));
  const zoomOut = () => {
    setScale(prev => {
      const newScale = Math.max(prev - 0.5, 1);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
      return newScale;
    });
  };
  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="relative group w-full h-full flex flex-col items-center justify-center">
      {/* Zoom Controls Overlay */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-md p-2 rounded-xl">
        <button 
          onClick={(e) => { e.stopPropagation(); zoomIn(); }}
          className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          title="Mais Zoom"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <div className="h-px bg-white/20 w-full" />
        <span className="text-white text-xs font-mono font-bold text-center">
          {Math.round(scale * 100)}%
        </span>
        <div className="h-px bg-white/20 w-full" />
        <button 
          onClick={(e) => { e.stopPropagation(); zoomOut(); }}
          className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          title="Menos Zoom"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); resetZoom(); }}
          className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          title="Resetar"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Image Container */}
      <div 
        ref={containerRef}
        className={`relative overflow-hidden w-full h-full flex items-center justify-center ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
        onWheel={handleWheel}
        onMouseDown={scale > 1 ? handleMouseDown : (e) => { e.stopPropagation(); zoomIn(); }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={`transition-transform duration-200 ease-out origin-center select-none pointer-events-none ${className}`}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
            willChange: 'transform'
          }}
        />
      </div>
      
      {scale > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white/90 px-4 py-2 rounded-full text-xs font-medium backdrop-blur-sm pointer-events-none z-50">
          Você pode arrastar a imagem para explorar os detalhes.
        </div>
      )}
    </div>
  );
}
