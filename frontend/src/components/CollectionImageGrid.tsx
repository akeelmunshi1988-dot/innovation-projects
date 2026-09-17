import { useEffect, useState } from 'react';
import axios from 'axios';

export interface CollectionImage { image_url: string; caption: string }
export interface CollectionDisplay { enabled: boolean; images: CollectionImage[] }

export type CollectionDisplayState =
  | { status: 'loading' }
  | { status: 'ready'; display: CollectionDisplay }
  | { status: 'hidden' };

// If nothing usable comes back within this window (slow/hung request), give up
// and hide the grid rather than spinning forever.
const GRID_TIMEOUT_MS = 10000;

export function useCollectionDisplay(category: string): CollectionDisplayState {
  const [state, setState] = useState<CollectionDisplayState>({ status: 'loading' });

  useEffect(() => {
    setState({ status: 'loading' });
    const controller = new AbortController();
    let settled = false;

    axios.get<CollectionDisplay>('/api/customer/catalog-display', { params: { category }, signal: controller.signal })
      .then(({ data }) => {
        settled = true;
        // No stock/bundled fallback images — either the catalog produced 3 real
        // photos, or there's nothing to show.
        if (data.enabled && data.images.length === 3 && data.images.every(image => image.image_url)) {
          setState({ status: 'ready', display: data });
        } else {
          setState({ status: 'hidden' });
        }
      })
      .catch(() => {
        settled = true;
        if (!controller.signal.aborted) setState({ status: 'hidden' });
      });

    const timeout = window.setTimeout(() => {
      if (!settled) setState({ status: 'hidden' });
    }, GRID_TIMEOUT_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [category]);

  return state;
}

/** Renders the real image, or a loading placeholder in its place — never a generic stock substitute. */
function ImageSlot({ src, alt, className }: { src?: string | null; alt: string; className: string }) {
  if (src) return <img src={src} alt={alt} className={className} loading="lazy" />;
  return (
    <div className={`${className} flex items-center justify-center bg-white/5`} role="status" aria-label="Loading image">
      <span className="w-6 h-6 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
    </div>
  );
}

export default function CollectionImageGrid({ state, title, eyebrow, target = '#collection-rugs' }: {
  state: CollectionDisplayState; title: string; eyebrow: string; target?: string;
}) {
  const images = state.status === 'ready' ? state.display.images : undefined;

  return (
    <section className="overflow-hidden bg-[#0b1217] text-white">
      <div className="mx-auto w-[94vw] px-4 pt-10 pb-10 md:pt-16 md:pb-16">
        {state.status !== 'hidden' && (
          <>
            <p className="mb-8 text-[10px] uppercase tracking-[0.3em] text-[#d8b880]">{eyebrow}</p>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,3.2fr)_minmax(0,1fr)] md:gap-[3vw] items-start">
              <figure className="min-w-0 md:pr-[1vw]">
                <ImageSlot src={images?.[0].image_url} alt={images?.[0].caption || `${title} detail`} className="aspect-[4/5] w-full object-cover" />
                {images?.[0].caption && <figcaption className="mt-5 text-sm md:text-base leading-relaxed text-white/80">{images[0].caption}</figcaption>}
              </figure>
              <figure className="order-first col-span-2 min-w-0 md:order-none md:col-span-1">
                <ImageSlot src={images?.[1].image_url} alt={images?.[1].caption || `${title} collection`} className="aspect-[16/10] w-full object-cover" />
                {images?.[1].caption && <figcaption className="mt-4 text-sm leading-relaxed text-white/70">{images[1].caption}</figcaption>}
              </figure>
              <figure className="min-w-0">
                <ImageSlot src={images?.[2].image_url} alt={images?.[2].caption || `${title} texture`} className="aspect-[4/5] w-full object-cover" />
                {images?.[2].caption && <figcaption className="mt-5 text-sm md:text-base leading-relaxed text-white/80">{images[2].caption}</figcaption>}
                <a href={target} className="mt-6 inline-block border-b border-white/70 pb-1 text-sm hover:text-[#d8b880] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Explore the collection ↓</a>
              </figure>
            </div>
          </>
        )}
        <h1 className="mt-14 md:mt-24 uppercase font-black leading-[0.95] tracking-[-0.045em] text-[clamp(2.5rem,10vw,12rem)] [overflow-wrap:anywhere]" style={{ fontFamily: "'Arial Narrow', 'Roboto Condensed', Impact, sans-serif" }}>{title}</h1>
      </div>
    </section>
  );
}
