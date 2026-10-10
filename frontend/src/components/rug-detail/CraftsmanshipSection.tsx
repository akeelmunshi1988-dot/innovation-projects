import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight } from 'lucide-react';
import type { WorkshopPhoto } from '../../types';

// Only facts the site already states elsewhere (homepage SEO copy, /about,
// the guides) — no invented heritage claims.
const TRUST_POINTS = [
  { title: 'Handmade in Bhadohi, India', body: 'Woven by master artisans in India’s historic carpet-weaving region.' },
  { title: 'Made to Order', body: 'Every rug begins on the loom only once it is commissioned for you.' },
  { title: 'Custom Dimensions', body: 'Any size, from a compact runner to a room-sized statement piece.' },
];

/**
 * Editorial craftsmanship band below the main product area: the workshop
 * photos the admin manages for /about (first three), plus brand trust points.
 */
export default function CraftsmanshipSection() {
  const [photos, setPhotos] = useState<WorkshopPhoto[]>([]);

  useEffect(() => {
    axios.get<WorkshopPhoto[]>('/api/customer/workshop-photos')
      .then(({ data }) => setPhotos(data.slice(0, 3)))
      .catch(() => setPhotos([]));
  }, []);

  return (
    <section aria-labelledby="craft-heading" className="-mx-4 bg-showroom-ivory px-4 py-16 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-showroom-gold">Materials &amp; Craftsmanship</p>
          <h2 id="craft-heading" className="mt-3 font-serif text-3xl font-light leading-tight text-showroom-charcoal sm:text-4xl">
            The Details Make the Difference
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-showroom-grey">
            From hand-dyed yarn to the final wash and finish, each rug passes through many skilled hands before it reaches your home.
          </p>
          <dl className="mt-8 divide-y divide-showroom-border border-y border-showroom-border">
            {TRUST_POINTS.map((point) => (
              <div key={point.title} className="py-4">
                <dt className="font-serif text-lg text-showroom-charcoal">{point.title}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-showroom-grey">{point.body}</dd>
              </div>
            ))}
          </dl>
          <Link to="/about" className="storefront-link-arrow mt-8">
            Our workshop <ArrowRight size={13} />
          </Link>
        </div>

        {photos.length > 0 && (
          <ul className={`grid gap-6 sm:grid-cols-3 lg:col-span-8 ${photos.length < 3 ? 'sm:grid-cols-2' : ''}`}>
            {photos.map((photo, index) => (
              <li key={photo.id} className={index === 1 ? 'sm:mt-12' : ''}>
                <div className="aspect-[4/5] overflow-hidden bg-white">
                  <img src={photo.image_url} alt={photo.caption} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                </div>
                {/* Admin captions are often numbered for /about ("2. The Art of…"). */}
                <p className="mt-4 font-serif text-lg leading-snug text-showroom-charcoal">{photo.caption.replace(/^\s*\d+\.\s*/, '')}</p>
                {photo.description && <p className="mt-1.5 text-sm leading-relaxed text-showroom-grey">{photo.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
