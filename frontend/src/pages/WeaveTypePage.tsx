import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Layers, Search, X } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import CollectionImageGrid, { useCollectionDisplay } from '../components/CollectionImageGrid';
import type { CatalogSize } from '../types';
import { findCollectionContent, type CategoryDetails, type CollectionFacet } from '../data/collectionContent';

interface WeaveRug {
  id: number;
  slug: string;
  name: string;
  material: string;
  weave_type: string;
  image_url: string | null;
  images: { id: number; image_url: string; sort_order: number }[];
  display_price: number | null;
  default_size: CatalogSize | null;
  available: boolean;
}

export default function WeaveTypePage() {
  const { weave = '', facet = '', value = '' } = useParams<{ weave?: string; facet?: string; value?: string }>();
  const isWeavePage = Boolean(weave);
  const categoryKey = isWeavePage ? weave : `${facet}/${value}`;
  const rawValue = isWeavePage ? weave : value;
  const prettyName = rawValue.replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  const found = isWeavePage || ['material', 'space', 'mood'].includes(facet)
    ? findCollectionContent((isWeavePage ? 'weave' : facet) as CollectionFacet, rawValue)
    : null;
  const details: CategoryDetails | undefined = found
    // Aliases borrow another page's copy but keep their own name.
    ? (found.indexable ? found.details : { ...found.details, name: prettyName, seoTitle: `${prettyName} Rugs` })
    : isWeavePage || ['material', 'space', 'mood'].includes(facet) ? {
      name: prettyName,
      seoTitle: `${prettyName} Rugs`,
      seoDescription: `Explore our ${prettyName.toLowerCase()} rugs, handmade to order in custom sizes.`,
      eyebrow: 'Discover the collection',
      intro: `Explore the ${prettyName.toLowerCase()} collection, in sizes and finishes to suit your space.`,
      story: 'Browse the designs below for material details, available sizes, and finishes. Each product page includes the details you need to choose your rug.',
      bestFor: 'See individual rugs for room suggestions',
      character: 'Discover the texture and finish of each design',
      making: 'See individual product details',
      care: 'Follow the care instructions for your rug',
    } : undefined;
  const indexable = Boolean(found?.indexable);
  const faq = details?.faq ?? [];
  const categoryLabel = isWeavePage
    ? 'Weave Type'
    : facet === 'space' ? 'Space' : facet === 'mood' ? 'Mood' : 'Material';
  const displayState = useCollectionDisplay(isWeavePage ? `weave/${weave}` : categoryKey);
  const [rugs, setRugs] = useState<WeaveRug[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [material, setMaterial] = useState('all');
  const [pile, setPile] = useState('all');
  const [sort, setSort] = useState('default');

  // Material/pile filter options come from the vendor's own catalog data
  // (Material table, PileHeightMaster) rather than a fixed guess baked into
  // the frontend — mirrors CustomerCatalog.tsx's /customer/menu-options usage.
  const [menuOptions, setMenuOptions] = useState<{ materials: string[]; weaves: string[]; piles: string[] }>({ materials: [], weaves: [], piles: [] });
  useEffect(() => {
    axios.get('/api/customer/menu-options').then(({ data }) => setMenuOptions(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!details) return;
    setLoading(true);
    const filterName = isWeavePage ? 'weave' : facet === 'space' ? 'room_type' : facet;
    axios.get('/api/customer/catalog', {
      params: {
        material: material !== 'all' ? material : undefined,
        pile: pile !== 'all' ? pile : undefined,
        search: debouncedSearch || undefined,
        sort,
        limit: 60,
        [filterName]: isWeavePage ? weave : value,
      },
    })
      .then(({ data }) => setRugs(data.items))
      .catch(() => setRugs([]))
      .finally(() => setLoading(false));
  }, [weave, facet, value, isWeavePage, material, pile, sort, debouncedSearch]);

  if (!details) return <Navigate to="/catalog" replace />;


  return (
    <CustomerLayout>
      <SEO
        title={details.seoTitle}
        description={details.seoDescription}
        // Near-duplicate database values (aliases) and values with no written
        // copy stay out of the index; see src/data/collectionContent.json.
        noindex={!indexable}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
              { '@type': 'ListItem', position: 2, name: 'Collection', item: `${window.location.origin}/catalog` },
              { '@type': 'ListItem', position: 3, name: `${details.name} Rugs`, item: `${window.location.origin}${window.location.pathname}` },
            ],
          },
          ...(faq.length ? [{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
          }] : []),
        ]}
      />

      <CollectionImageGrid state={displayState} title={`${details.name} Rugs`} eyebrow={`Shop by ${categoryLabel}`} />

      <section className="bg-[#f4f0e6] py-20 md:py-28">
        <div className="w-[94vw] max-w-none mx-auto px-4">
          <div className="grid md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10 md:gap-[6vw] items-start">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500 mb-4">Understanding the craft</p>
              <h2 className="font-serif text-4xl md:text-6xl leading-[0.95] text-stone-900">{details.eyebrow}</h2>
            </div>
            <div className="space-y-5 text-stone-600 leading-8 md:text-lg">
              <p>{details.intro}</p>
              <p>{details.story}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 border-t border-b border-stone-300 mt-16">
            {[
              ['Character', details.character],
              ['Typical making time', details.making],
              ['Best suited to', details.bestFor],
              ['Everyday care', details.care],
            ].map(([label, value]) => (
              <div key={label} className="py-7 lg:px-6 first:pl-0 border-b sm:border-b-0 lg:border-l first:border-l-0 border-stone-300">
                <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-3">{label}</p>
                <p className="font-serif text-xl text-stone-900 leading-snug">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {faq.length > 0 && (
        <section className="w-[94vw] mx-auto px-4 pt-20 md:pt-28">
          <p className="text-[10px] uppercase tracking-[0.25em] text-stone-400 mb-3">Questions</p>
          <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-10">{details.name} Rugs: FAQ</h2>
          <div className="divide-y divide-stone-200 border-y border-stone-200 max-w-4xl">
            {faq.map(item => (
              <details key={item.q} className="group py-5">
                <summary className="cursor-pointer list-none flex justify-between gap-6 font-serif text-xl text-stone-900">
                  {item.q}<span className="text-stone-400 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-stone-600 leading-7">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <section id="collection-rugs" className="w-[94vw] mx-auto px-4 py-20 md:py-28 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-5 mb-12">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone-400 mb-3">Explore the collection</p>
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900">Shop {details.name} Rugs</h2>
          </div>
          <p className="text-xs text-stone-400 uppercase tracking-wider">{rugs.length} {rugs.length === 1 ? 'rug' : 'rugs'}</p>
        </div>

        <div className="mb-12 border-y border-stone-200 py-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="relative flex-1 min-w-56 max-w-sm">
              <label htmlFor="category-rug-search" className="block text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-2">Search this collection</label>
              <Search size={14} className="absolute left-3 bottom-3 text-stone-400" />
              <input
                id="category-rug-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search rugs…"
                className="w-full border border-stone-200 bg-white py-2.5 pl-9 pr-9 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 bottom-3 text-stone-400 hover:text-stone-900">
                  <X size={14} />
                </button>
              )}
            </div>

            {facet !== 'material' && (
              <label className="block">
                <span className="block text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-2">Material</span>
                <select value={material} onChange={(event) => setMaterial(event.target.value)} className="min-w-36 border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-600 capitalize focus:outline-none focus:border-stone-500">
                  <option value="all">All materials</option>
                  {menuOptions.materials.map((m) => (
                    <option key={m} value={m} className="capitalize">{m}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="block">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-2">Pile height</span>
              <select value={pile} onChange={(event) => setPile(event.target.value)} className="min-w-36 border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-600 capitalize focus:outline-none focus:border-stone-500">
                <option value="all">All pile heights</option>
                {menuOptions.piles.map((p) => (
                  <option key={p} value={p} className="capitalize">{p}</option>
                ))}
              </select>
            </label>

            <label className="block md:ml-auto">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-2">Sort by</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="min-w-44 border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-600 focus:outline-none focus:border-stone-500">
                <option value="default">Featured</option>
                <option value="price-asc">Price: Low to high</option>
                <option value="price-desc">Price: High to low</option>
                <option value="lead-asc">Fastest delivery</option>
              </select>
            </label>

            {(search || material !== 'all' || pile !== 'all' || sort !== 'default') && (
              <button
                type="button"
                onClick={() => { setSearch(''); setMaterial('all'); setPile('all'); setSort('default'); }}
                className="h-[42px] inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 transition-colors"
              >
                <X size={13} /> Clear filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-28"><div className="w-6 h-6 border border-stone-400 border-t-transparent rounded-full animate-spin" /></div>
        ) : rugs.length === 0 ? (
          <div className="bg-stone-50 py-24 text-center">
            <Layers size={30} className="mx-auto text-stone-300 mb-4" />
            <p className="text-stone-500">No {details.name.toLowerCase()} rugs are currently published.</p>
            <Link to="/catalog" className="inline-flex items-center gap-2 mt-5 text-xs uppercase tracking-wider text-stone-900 border-b border-stone-400 pb-1">Browse all rugs <ArrowRight size={13} /></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
            {rugs.map((rug, index) => {
              const columnPosition = index % 3;
              const expansionPosition = columnPosition === 0
                ? 'lg:left-0 lg:origin-left'
                : columnPosition === 1
                  ? 'lg:left-1/2 lg:-translate-x-1/2 lg:origin-center'
                  : 'lg:right-0 lg:origin-right';
              return (
              <Link key={rug.id} to={`/catalog/${rug.slug}`} className="group relative block hover:z-30 focus-within:z-30">
                <div className="relative aspect-[4/5]">
                <div className={`absolute inset-y-0 w-full bg-stone-100 overflow-hidden transition-[width,left,right,transform,box-shadow] duration-500 ease-out lg:group-hover:w-[calc(200%+1.5rem)] lg:group-focus-within:w-[calc(200%+1.5rem)] lg:group-hover:shadow-2xl lg:group-focus-within:shadow-2xl ${expansionPosition}`}>
                  {rug.image_url ? (
                    <>
                      <img src={rug.image_url} alt={rug.name} loading="lazy" className={`w-full h-full object-contain bg-white transition-opacity duration-500 ${rug.images.length ? 'group-hover:opacity-0' : ''}`} />
                      {rug.images.length > 0 && <img src={rug.images[0].image_url} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 w-full h-full object-contain bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-500" />}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Layers className="text-stone-300" /></div>
                  )}
                  {!rug.available && <span className="absolute top-4 left-4 bg-white/90 px-3 py-1 text-[10px] uppercase tracking-wider text-stone-600">Out of stock</span>}
                </div>
                </div>
                <div className="pt-4 text-center space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">{rug.material} · {rug.weave_type}</p>
                  <h3 className="font-serif text-lg text-stone-900">{rug.name}</h3>
                </div>
              </Link>
            );})}
          </div>
        )}
      </section>
    </CustomerLayout>
  );
}
