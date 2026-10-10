import { useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, Layers } from 'lucide-react';

export interface GalleryImage {
  src: string;
  alt: string;
}

interface RugGalleryProps {
  images: GalleryImage[];
  activeIndex: number;
  onChange: (index: number) => void;
  onExpand: (index: number) => void;
}

/**
 * Main product image plus same-sized thumbnails. Every frame uses
 * object-contain on the ivory ground so a rug's four corners are never
 * cropped, whatever the photo's proportions — cover shots are portrait,
 * room photos landscape.
 */
export default function RugGallery({ images, activeIndex, onChange, onExpand }: RugGalleryProps) {
  // Hover zoom follows the pointer; only on devices with a real hover pointer
  // (see the `pointer-fine` guard below), so touch users just tap to expand.
  const [zoomOrigin, setZoomOrigin] = useState<string | null>(null);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center bg-showroom-ivory lg:aspect-[6/5]">
        <Layers size={48} className="text-showroom-border" />
      </div>
    );
  }

  const current = Math.min(activeIndex, images.length - 1);
  const image = images[current];
  const step = (delta: number) => onChange((current + delta + images.length) % images.length);

  return (
    <div className="space-y-3">
      <div className="group relative aspect-square overflow-hidden bg-showroom-ivory lg:aspect-[6/5]">
        <button
          type="button"
          onClick={() => onExpand(current)}
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setZoomOrigin(`${((event.clientX - rect.left) / rect.width) * 100}% ${((event.clientY - rect.top) / rect.height) * 100}%`);
          }}
          onMouseLeave={() => setZoomOrigin(null)}
          aria-label={`View ${image.alt} full screen`}
          className="block h-full w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-showroom-charcoal"
        >
          <img
            key={image.src}
            src={image.src}
            alt={image.alt}
            // Lower-case attribute: React 18 doesn't recognise `fetchPriority` and warns.
            {...{ fetchpriority: current === 0 ? 'high' : 'auto' }}
            decoding="async"
            style={zoomOrigin ? { transformOrigin: zoomOrigin } : undefined}
            className={`h-full w-full object-contain p-4 sm:p-8 motion-safe:animate-[showroom-fade_450ms_ease-out] motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out ${
              zoomOrigin ? '[@media(hover:hover)_and_(pointer:fine)]:scale-[1.6]' : ''
            }`}
          />
        </button>

        <span className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center bg-white/85 text-showroom-charcoal opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true">
          <Expand size={15} strokeWidth={1.5} />
        </span>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-white/85 text-showroom-charcoal transition-opacity duration-300 hover:bg-white lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
            >
              <ChevronLeft size={18} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-white/85 text-showroom-charcoal transition-opacity duration-300 hover:bg-white lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
            >
              <ChevronRight size={18} strokeWidth={1.5} />
            </button>
            <span className="pointer-events-none absolute bottom-3 left-3 bg-white/85 px-2 py-1 text-[11px] tabular-nums tracking-wider text-showroom-grey">
              {current + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <ul className="grid grid-cols-6 gap-2 sm:gap-3" aria-label="Product images">
          {images.map((thumb, index) => {
            const selected = index === current;
            return (
              <li key={`${thumb.src}-${index}`}>
                <button
                  type="button"
                  onClick={() => onChange(index)}
                  aria-label={`Show image ${index + 1}: ${thumb.alt}`}
                  aria-current={selected ? 'true' : undefined}
                  className={`block aspect-square w-full overflow-hidden bg-showroom-ivory outline-none ring-offset-2 transition-all duration-300 focus-visible:ring-1 focus-visible:ring-showroom-charcoal ${
                    selected ? 'ring-1 ring-showroom-charcoal' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={thumb.src} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain p-1.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
