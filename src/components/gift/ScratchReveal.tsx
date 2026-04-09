"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScratchRevealProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  brushSize?: number;
  onComplete?: () => void;
  percentToReveal?: number;
  coverColor?: string;
  scratchImage?: string;
}

export const ScratchReveal: React.FC<ScratchRevealProps> = ({
  children,
  width = 300,
  height = 150,
  brushSize = 20,
  onComplete,
  percentToReveal = 50,
  coverColor = "#E2E8F0",
  scratchImage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isScratching, setIsScratching] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    // Fill with cover color
    ctx.fillStyle = coverColor;
    ctx.fillRect(0, 0, width, height);

    // Add some noise or texture to the cover
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    for (let i = 0; i < 1000; i++) {
        ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
    }

    // Add text instructions
    ctx.fillStyle = "#64748B";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Scratch to reveal message", width / 2, height / 2 + 5);

  }, [width, height, coverColor]);

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealed) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();

    checkRevealContent();
  };

  const checkRevealContent = () => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealed) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) {
        transparentPixels++;
      }
    }

    const percent = (transparentPixels / (canvas.width * canvas.height)) * 100;
    if (percent >= percentToReveal) {
      setIsRevealed(true);
      if (onComplete) onComplete();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsScratching(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) scratch(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isScratching) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) scratch(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMouseUp = () => setIsScratching(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsScratching(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) scratch(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isScratching) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) scratch(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
  };

  const handleTouchEnd = () => setIsScratching(false);

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden rounded-xl bg-white border border-slate-100 shadow-inner"
      style={{ width, height }}
    >
      <div className="flex h-full w-full items-center justify-center p-4">
        {children}
      </div>
      
      {!isRevealed && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-10 cursor-crosshair transition-opacity duration-500"
          style={{ opacity: isRevealed ? 0 : 1 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      )}
    </div>
  );
};
