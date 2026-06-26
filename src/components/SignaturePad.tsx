import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

export function SignaturePad({ onChange }: { onChange: (blob: Blob | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      const context = canvas.getContext('2d');
      context?.scale(ratio, ratio);
      if (context) {
        context.lineWidth = 2.5;
        context.lineCap = 'round';
        context.strokeStyle = '#0f172a';
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext('2d');
    const { x, y } = point(event);
    context?.beginPath();
    context?.moveTo(x, y);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext('2d');
    const { x, y } = point(event);
    context?.lineTo(x, y);
    context?.stroke();
    hasInk.current = true;
  };

  const finish = () => {
    drawing.current = false;
    if (!hasInk.current) return onChange(null);
    canvasRef.current?.toBlob(blob => onChange(blob), 'image/png');
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.current = false;
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} className="h-40 w-full touch-none rounded-xl border bg-white" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} />
      <Button type="button" size="sm" variant="ghost" onClick={clear}>Rensa signatur</Button>
    </div>
  );
}
