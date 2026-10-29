'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, Undo2 } from 'lucide-react';

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

export default function SignaturePad({ onChange, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const history = useRef<ImageData[]>([]);
  const [isEmpty, setIsEmpty] = useState(true);

  // Set up canvas dimensions on mount / resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // Save existing drawing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.putImageData(imageData, 0, 0);
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#111113';
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top };
  };

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.current.length > 20) history.current.shift();
  }, []);

  const onStart = useCallback((e: MouseEvent | TouchEvent) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    e.preventDefault();
    saveHistory();
    isDrawing.current = true;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [disabled, saveHistory]);

  const onMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawing.current || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    e.preventDefault();
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
    setIsEmpty(false);
  }, [disabled]);

  const onEnd = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  }, [onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onEnd);
    canvas.addEventListener('mouseleave', onEnd);
    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd);
    return () => {
      canvas.removeEventListener('mousedown', onStart);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onEnd);
      canvas.removeEventListener('mouseleave', onEnd);
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
    };
  }, [onStart, onMove, onEnd]);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    history.current = [];
    setIsEmpty(true);
    onChange(null);
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.current.length === 0) return;
    const ctx = canvas.getContext('2d')!;
    const prev = history.current.pop()!;
    ctx.putImageData(prev, 0, 0);
    if (history.current.length === 0) {
      setIsEmpty(true);
      onChange(null);
    } else {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        style={{
          position: 'relative',
          border: '2px dashed #D1D5DB',
          borderRadius: '0.75rem',
          background: disabled ? '#F9FAFB' : '#FFFFFF',
          overflow: 'hidden',
          transition: 'border-color 0.2s',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: '180px',
            cursor: disabled ? 'not-allowed' : 'crosshair',
            touchAction: 'none',
          }}
        />
        {isEmpty && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', fontStyle: 'italic' }}>
              ✍ Sign here
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={undo}
          disabled={disabled || isEmpty}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            fontSize: '0.75rem', fontWeight: 500, color: '#6B7280',
            padding: '0.375rem 0.75rem',
            background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '0.5rem',
            cursor: disabled || isEmpty ? 'not-allowed' : 'pointer',
            opacity: isEmpty ? 0.4 : 1,
          }}
        >
          <Undo2 size={13} />
          Undo
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={disabled || isEmpty}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            fontSize: '0.75rem', fontWeight: 500, color: '#DC2626',
            padding: '0.375rem 0.75rem',
            background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.5rem',
            cursor: disabled || isEmpty ? 'not-allowed' : 'pointer',
            opacity: isEmpty ? 0.4 : 1,
          }}
        >
          <Eraser size={13} />
          Clear
        </button>
      </div>
    </div>
  );
}
