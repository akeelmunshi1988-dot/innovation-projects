import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Crop, X } from 'lucide-react';

type Point = [number, number];

interface CornerCropModalProps {
  file: File;
  onComplete: (url: string) => void;
  onCancel: () => void;
}

const HIT_RADIUS = 28;
const COLORS = ['#f97316', '#eab308', '#22c55e', '#3b82f6'];

// Full-image rectangle — "no crop" until the admin actually drags a corner.
const defaultPoints = (w: number, h: number): Point[] => [
  [0, 0],
  [w, 0],
  [w, h],
  [0, h],
];

export default function CornerCropModal({ file, onComplete, onCancel }: CornerCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const objectUrlRef = useRef<string>('');
  const latestPointsRef = useRef<Point[]>([]);
  const dragAllStartRef = useRef<Point | null>(null);

  const [imageDims, setImageDims] = useState({ w: 0, h: 0 });
  const [points, setPoints] = useState<Point[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [draggingAll, setDraggingAll] = useState(false);
  const [submitting, setSubmitting] = useState<'crop' | 'original' | null>(null);
  const [error, setError] = useState('');

  // Load the file into an <img>, size the canvas to its natural resolution.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    const img = new Image();
    img.onload = () => {
      setImageDims({ w: img.naturalWidth, h: img.naturalHeight });
      setPoints(defaultPoints(img.naturalWidth, img.naturalHeight));
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => { latestPointsRef.current = points; }, [points]);

  // Draw the image + quad outline + numbered draggable corner dots.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || imageDims.w === 0 || points.length !== 4) return;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.src = objectUrlRef.current;
    img.onload = () => {
      canvas.width = imageDims.w;
      canvas.height = imageDims.h;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0);

      const r = Math.max(14, canvas.width / 55);
      const lw = Math.max(3, canvas.width / 300);

      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < 4; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fill();

      points.forEach(([x, y], i) => {
        ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0,0,0,0.40)'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = COLORS[i]; ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(18, canvas.width / 60)}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), x, y);
      });
    };
  }, [points, imageDims]);

  const toCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = 'touches' in e ? e.touches[0] ?? e.changedTouches[0] : e;
    return [(src.clientX - rect.left) * scaleX, (src.clientY - rect.top) * scaleY];
  };

  const nearestPoint = (x: number, y: number): number | null => {
    let best: number | null = null;
    let bestDist = HIT_RADIUS;
    points.forEach(([px, py], i) => {
      const d = Math.hypot(px - x, py - y);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  };

  const isInsideQuad = (x: number, y: number): boolean => {
    const pts = latestPointsRef.current;
    if (pts.length < 4) return false;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };

  const handleDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const [x, y] = toCanvasCoords(e);
    const idx = nearestPoint(x, y);
    if (idx !== null) {
      e.preventDefault();
      setDraggingIdx(idx);
    } else if (isInsideQuad(x, y)) {
      e.preventDefault();
      dragAllStartRef.current = [x, y];
      setDraggingAll(true);
    }
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (draggingIdx === null && !draggingAll) return;
    const [x, y] = toCanvasCoords(e);
    if (draggingIdx !== null) {
      setPoints(prev => { const n = [...prev]; n[draggingIdx] = [x, y]; return n; });
    } else if (draggingAll && dragAllStartRef.current) {
      const dx = x - dragAllStartRef.current[0];
      const dy = y - dragAllStartRef.current[1];
      dragAllStartRef.current = [x, y];
      setPoints(prev => prev.map(([px, py]) => [px + dx, py + dy] as Point));
    }
  };

  const handleUp = () => {
    setDraggingIdx(null);
    setDraggingAll(false);
    dragAllStartRef.current = null;
  };

  const resetCorners = () => setPoints(defaultPoints(imageDims.w, imageDims.h));

  const applyCrop = async () => {
    setSubmitting('crop'); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('corners', JSON.stringify(points));
      const { data } = await axios.post<{ url: string }>('/api/catalog/upload-image-cropped', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onComplete(data.url);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Crop failed.');
    } finally {
      setSubmitting(null);
    }
  };

  const useOriginal = async () => {
    setSubmitting('original'); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await axios.post<{ url: string }>('/api/catalog/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onComplete(data.url);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Upload failed.');
    } finally {
      setSubmitting(null);
    }
  };

  const busy = submitting !== null;

  return (
    <>
      <div className="fixed inset-0 bg-dark-950/70 backdrop-blur-sm z-50" onClick={() => !busy && onCancel()} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-2xl space-y-4 pointer-events-auto shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gold-600/20 border border-gold-600/40 rounded-xl flex items-center justify-center flex-shrink-0">
                <Crop size={16} className="text-gold-400" />
              </div>
              <div>
                <h3 className="text-cream-100 font-bold">Adjust corners</h3>
                <p className="text-dark-400 text-sm mt-0.5">
                  Drag the 4 corners onto the rug's actual edges to straighten a photo taken at an angle,
                  or drag inside the outline to move all four at once.
                </p>
              </div>
            </div>
            <button onClick={() => !busy && onCancel()} className="text-dark-400 hover:text-cream-200 transition-colors flex-shrink-0">
              <X size={18} />
            </button>
          </div>

          <div className="bg-dark-950 rounded-xl overflow-hidden border border-dark-700">
            {imageDims.w === 0 ? (
              <div className="aspect-video flex items-center justify-center text-dark-500 text-sm">Loading image…</div>
            ) : (
              <canvas
                ref={canvasRef}
                className="w-full h-auto max-h-[60vh] object-contain touch-none cursor-move"
                onMouseDown={handleDown}
                onMouseMove={handleMove}
                onMouseUp={handleUp}
                onMouseLeave={handleUp}
                onTouchStart={handleDown}
                onTouchMove={handleMove}
                onTouchEnd={handleUp}
              />
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={resetCorners}
              disabled={busy || imageDims.w === 0}
              className="text-dark-400 hover:text-cream-200 text-xs transition-colors disabled:opacity-50"
            >
              Reset corners
            </button>
            <div className="flex-1" />
            <button
              onClick={() => !busy && onCancel()}
              disabled={busy}
              className="py-2 px-4 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl text-dark-300 text-sm transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={useOriginal}
              disabled={busy || imageDims.w === 0}
              className="py-2 px-4 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl text-dark-300 text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting === 'original' && <div className="w-3.5 h-3.5 border-2 border-dark-400/40 border-t-dark-300 rounded-full animate-spin" />}
              Use Original
            </button>
            <button
              onClick={applyCrop}
              disabled={busy || imageDims.w === 0}
              className="py-2 px-4 bg-gold-600 hover:bg-gold-500 disabled:opacity-60 text-dark-950 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              {submitting === 'crop' && <div className="w-3.5 h-3.5 border-2 border-dark-950/30 border-t-dark-950 rounded-full animate-spin" />}
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
