import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/cn';

const ZoomableImage = ({ src, alt, className }) => {
    const [scale, setScale] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    
    const containerRef = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Use springs for smooth movement
    const springX = useSpring(x, { stiffness: 300, damping: 30 });
    const springY = useSpring(y, { stiffness: 300, damping: 30 });

    const handleWheel = (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return; 
        e.preventDefault();

        const zoomSpeed = 0.2;
        const delta = -e.deltaY;
        const newScale = Math.min(Math.max(scale + (delta > 0 ? zoomSpeed : -zoomSpeed) * scale, 1), 20);
        
        setScale(newScale);
        if (newScale === 1) {
            x.set(0);
            y.set(0);
        }
    };

    const resetZoom = () => {
        setScale(1);
        x.set(0);
        y.set(0);
    };

    const zoomIn = () => setScale(prev => Math.min(prev * 1.5, 20));
    const zoomOut = () => {
        const newScale = Math.max(prev => prev / 1.5, 1);
        setScale(newScale);
        if (newScale === 1) {
            x.set(0);
            y.set(0);
        }
    };

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            const onWheel = (e) => handleWheel(e);
            container.addEventListener('wheel', onWheel, { passive: false });
            return () => container.removeEventListener('wheel', onWheel);
        }
    }, [scale]);

    const handleDoubleClick = () => {
        if (scale > 1) resetZoom();
        else setScale(3);
    };

    return (
        <div className="relative group w-full h-full flex flex-col items-center bg-transparent">
            {/* Toolbar */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-[60] opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/20 shadow-2xl">
                <button onClick={zoomIn} className="p-2.5 hover:bg-white/10 rounded-xl text-white transition-colors" title="Zoom In"><ZoomIn className="w-5 h-5" /></button>
                <button onClick={zoomOut} className="p-2.5 hover:bg-white/10 rounded-xl text-white transition-colors" title="Zoom Out"><ZoomOut className="w-5 h-5" /></button>
                <button onClick={resetZoom} className="p-2.5 hover:bg-white/10 rounded-xl text-white transition-colors" title="Reset Zoom"><RotateCcw className="w-5 h-5" /></button>
                <div className="w-px h-6 bg-white/10 mx-2" />
                <div className="px-3 text-xs font-black text-white min-w-[50px] text-center">
                    {Math.round(scale * 100)}%
                </div>
            </div>

            <div 
                ref={containerRef}
                className={cn(
                    "relative w-full h-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing",
                    className
                )}
                onDoubleClick={handleDoubleClick}
            >
                <motion.div
                    drag={scale > 1}
                    dragMomentum={false}
                    style={{
                        scale,
                        x,
                        y,
                        width: '100%',
                        height: '100%',
                    }}
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={() => setIsDragging(false)}
                    className="flex items-center justify-center touch-none"
                >
                    <img 
                        src={src} 
                        alt={alt} 
                        draggable={false}
                        className="max-w-full max-h-full object-contain pointer-events-none select-none drop-shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                    />
                </motion.div>
            </div>

            {/* Hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">
                    Scroll to Zoom • Drag to Pan • Double Click to Toggle
                </p>
            </div>
        </div>
    );
};

export default ZoomableImage;
