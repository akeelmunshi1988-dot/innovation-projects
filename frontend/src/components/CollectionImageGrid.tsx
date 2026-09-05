import { useEffect, useState } from 'react';
import axios from 'axios';

export interface CollectionImage { image_url: string; caption: string }
export interface CollectionDisplay { enabled: boolean; images: CollectionImage[] }

const fallbackDisplay: CollectionDisplay = { enabled: true, images: [
  { image_url: '/static/journey/design.jpg', caption: '' },
  { image_url: '/static/journey/weaving.jpg', caption: '' },
  { image_url: '/static/journey/delivery.jpg', caption: '' },
] };

export function useCollectionDisplay(category: string) {
  const [result, setResult] = useState<{ category: string; display: CollectionDisplay } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    axios.get<CollectionDisplay>('/api/customer/catalog-display', { params: { category }, signal: controller.signal })
      .then(({ data }) => setResult({ category, display: data }))
      .catch(() => { if (!controller.signal.aborted) setResult(null); });
    return () => controller.abort();
  }, [category]);
  return result?.category === category && result.display.enabled && result.display.images.every(image => image.image_url)
    ? result.display : fallbackDisplay;
}

export default function CollectionImageGrid({ images, title, eyebrow, target = '#collection-rugs' }: {
  images: CollectionImage[]; title: string; eyebrow: string; target?: string;
}) {
  return (
    <section className="overflow-hidden bg-[#0b1217] text-white">
      <div className="mx-auto w-[94vw] px-4 pt-10 pb-10 md:pt-16 md:pb-16">
        <p className="mb-8 text-[10px] uppercase tracking-[0.3em] text-[#d8b880]">{eyebrow}</p>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,3.2fr)_minmax(0,1fr)] md:gap-[3vw] items-start">
          <figure className="min-w-0 md:pr-[1vw]">
            <img src={images[0].image_url} alt={images[0].caption || `${title} detail`} className="aspect-[4/5] w-full object-cover" />
            {images[0].caption && <figcaption className="mt-5 text-sm md:text-base leading-relaxed text-white/80">{images[0].caption}</figcaption>}
          </figure>
          <figure className="order-first col-span-2 min-w-0 md:order-none md:col-span-1">
            <img src={images[1].image_url} alt={images[1].caption || `${title} collection`} fetchPriority="high" className="aspect-[16/10] w-full object-cover" />
            {images[1].caption && <figcaption className="mt-4 text-sm leading-relaxed text-white/70">{images[1].caption}</figcaption>}
          </figure>
          <figure className="min-w-0">
            <img src={images[2].image_url} alt={images[2].caption || `${title} texture`} className="aspect-[4/5] w-full object-cover" />
            {images[2].caption && <figcaption className="mt-5 text-sm md:text-base leading-relaxed text-white/80">{images[2].caption}</figcaption>}
            <a href={target} className="mt-6 inline-block border-b border-white/70 pb-1 text-sm hover:text-[#d8b880] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Explore the collection ↓</a>
          </figure>
        </div>
        <h1 className="mt-14 md:mt-24 uppercase font-black leading-[0.95] tracking-[-0.045em] text-[clamp(2.5rem,10vw,12rem)] [overflow-wrap:anywhere]" style={{ fontFamily: "'Arial Narrow', 'Roboto Condensed', Impact, sans-serif" }}>{title}</h1>
      </div>
    </section>
  );
}
