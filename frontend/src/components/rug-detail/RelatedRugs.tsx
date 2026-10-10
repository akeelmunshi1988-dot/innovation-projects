import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight } from 'lucide-react';

interface RelatedRug {
  id: number;
  slug: string | null;
  name: string;
  image_url: string | null;
  weave_type: string | null;
  material: string;
}

interface RelatedRugsProps {
  rugId: number;
  weave: string | null;
  material: string;
}

const MAX_RELATED = 4;
// Each query over-fetches, since the material top-up largely overlaps the weave matches.

/**
 * "You May Also Love": same weave first, topped up with the same material,
 * via the existing public catalog filters — never the current rug, never a
 * duplicate. Renders nothing when the catalog has no related rugs.
 */
export default function RelatedRugs({ rugId, weave, material }: RelatedRugsProps) {
  const [rugs, setRugs] = useState<RelatedRug[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchBy = (params: Record<string, string>) =>
      axios.get<{ items: RelatedRug[] }>('/api/customer/catalog', { params: { ...params, limit: MAX_RELATED * 3 } })
        .then(({ data }) => data.items ?? [])
        .catch(() => [] as RelatedRug[]);

    (async () => {
      const picked = new Map<number, RelatedRug>();
      const add = (items: RelatedRug[]) => items.forEach((item) => {
        if (item.id !== rugId && picked.size < MAX_RELATED) picked.set(item.id, item);
      });
      if (weave) add(await fetchBy({ weave }));
      if (picked.size < MAX_RELATED && material) add(await fetchBy({ material }));
      if (!cancelled) setRugs([...picked.values()]);
    })();
    return () => { cancelled = true; };
  }, [rugId, weave, material]);

  if (rugs.length === 0) return null;

  return (
    <section aria-labelledby="related-rugs-heading" className="border-t border-showroom-border pt-16">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-showroom-gold">Curated for you</p>
          <h2 id="related-rugs-heading" className="mt-2 font-serif text-3xl font-light text-showroom-charcoal sm:text-4xl">You May Also Love</h2>
        </div>
        <Link to="/catalog" className="storefront-link-arrow hidden whitespace-nowrap sm:inline-flex">
          View collection <ArrowRight size={13} />
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-8">
        {rugs.map((rug) => (
          <li key={rug.id}>
            <Link to={`/catalog/${rug.slug || rug.id}`} className="group block">
              <div className="aspect-[4/5] overflow-hidden bg-showroom-ivory">
                {rug.image_url && (
                  <img
                    src={rug.image_url}
                    alt={rug.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain p-4 transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.03]"
                  />
                )}
              </div>
              <p className="mt-4 font-serif text-lg leading-snug text-showroom-charcoal transition-colors group-hover:text-showroom-gold">{rug.name}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-showroom-grey">
                {[rug.weave_type, rug.material].filter(Boolean).join(' · ')}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
