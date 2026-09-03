import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Search, Layers, X, Plus, Minus } from 'lucide-react';
import type { CatalogSize, RugColorOption } from '../types';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import { useMeasurementUnit } from '../contexts/MeasurementContext';
import { fmtSize } from '../utils/size';

interface CatalogRug {
  id: number;
  slug: string;
  name: string;
  description: string;
  material: string;
  material_type: string;
  weave_type: string;
  pile_height: string;
  image_url: string | null;
  images: { id: number; image_url: string; sort_order: number }[];
  display_price: number | null;
  default_size: CatalogSize | null;
  lead_time_days: number;
  sizes: CatalogSize[];
  room_types: string[];
  mood_tags: string[];
  available: boolean;
  inventory_quantity?: number | null;
  color_options: RugColorOption[];
}

const SORT_OPTIONS = [
  { value: 'default',    label: 'Featured' },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'lead-asc',   label: 'Fastest delivery' },
];

const ROOM_TYPE_OPTIONS = ['living_room', 'bedroom', 'dining_room', 'entryway'];
const MOOD_TAG_OPTIONS  = ['warm_earthy', 'quiet_luxury', 'modern_minimal', 'bohemian', 'bold_artistic', 'timeless_traditional'];
const MATERIAL_OPTIONS  = ['wool', 'silk', 'cotton', 'synthetic'];
const PILE_OPTIONS      = ['low', 'medium', 'high', 'flat'];
const tagLabel = (v: string) => v.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

const PAGE_SIZE = 12;

export default function CustomerCatalog() {
  const [searchParams] = useSearchParams();
  const { value: pathValue } = useParams<{ value?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState<CatalogRug[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('default');
  const [colorPreviewByRug, setColorPreviewByRug] = useState<Record<number, string>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { sizeUnit, setSizeUnit } = useMeasurementUnit();

  // The primary facet (room/mood/material) lives as a clean URL segment —
  // e.g. /catalog/space/bedroom — set by whichever `useParams` route matched.
  // The other two facet types, plus pile, ride along as query params on top.
  const pathFacet: 'room_type' | 'mood' | 'material' | null =
    location.pathname.startsWith('/catalog/space/')    ? 'room_type' :
    location.pathname.startsWith('/catalog/mood/')     ? 'mood' :
    location.pathname.startsWith('/catalog/material/') ? 'material' : null;

  const materialParam = pathFacet === 'material'  ? (pathValue ?? 'all') : (searchParams.get('material')  ?? 'all');
  const pileParam     = searchParams.get('pile') ?? 'all';
  const roomParam     = pathFacet === 'room_type' ? (pathValue ?? 'all') : (searchParams.get('room_type') ?? 'all');
  const moodParam     = pathFacet === 'mood'      ? (pathValue ?? 'all') : (searchParams.get('mood')      ?? 'all');

  const [filtersOpen, setFiltersOpen] = useState(() =>
    pathFacet !== null || ['material', 'pile', 'room_type', 'mood'].some((k) => searchParams.get(k))
  );

  // Debounce free-text search so we don't hit the backend on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = (offset: number) =>
    axios.get('/api/customer/catalog', { params: {
      sort,
      room_type: roomParam !== 'all' ? roomParam : undefined,
      mood: moodParam !== 'all' ? moodParam : undefined,
      material: materialParam !== 'all' ? materialParam : undefined,
      pile: pileParam !== 'all' ? pileParam : undefined,
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset,
    } });

  // Filters/sort/search changed — reset and load the first page
  useEffect(() => {
    setLoading(true);
    fetchPage(0)
      .then(({ data }) => {
        setItems(data.items);
        setTotal(data.total);
        setHasMore(data.has_more);
      })
      .finally(() => setLoading(false));
  }, [materialParam, pileParam, roomParam, moodParam, sort, debouncedSearch]);

  // Infinite scroll — load the next page when the sentinel comes into view
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
        setLoadingMore(true);
        fetchPage(items.length)
          .then(({ data }) => {
            setItems((prev) => [...prev, ...data.items]);
            setHasMore(data.has_more);
          })
          .finally(() => setLoadingMore(false));
      }
    }, { rootMargin: '400px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [items.length, hasMore, loading, loadingMore, materialParam, pileParam, roomParam, moodParam, sort, debouncedSearch]);

  // Builds a clean URL for the given filter state: whichever of room_type/mood/material
  // is active takes the path segment (room_type > mood > material priority when more
  // than one is active), the rest ride as query params alongside pile.
  const buildCatalogUrl = (overrides: Partial<{ room_type: string; mood: string; material: string; pile: string }>) => {
    const current = { room_type: roomParam, mood: moodParam, material: materialParam, pile: pileParam, ...overrides };

    let facet: 'space' | 'mood' | 'material' | null = null;
    let facetValue = '';
    if (current.room_type !== 'all') { facet = 'space'; facetValue = current.room_type; }
    else if (current.mood !== 'all') { facet = 'mood'; facetValue = current.mood; }
    else if (current.material !== 'all') { facet = 'material'; facetValue = current.material; }

    const params = new URLSearchParams();
    if (facet !== 'space' && current.room_type !== 'all') params.set('room_type', current.room_type);
    if (facet !== 'mood' && current.mood !== 'all') params.set('mood', current.mood);
    if (facet !== 'material' && current.material !== 'all') params.set('material', current.material);
    if (current.pile !== 'all') params.set('pile', current.pile);

    const path = facet ? `/catalog/${facet}/${facetValue}` : '/catalog';
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  };

  const setFilter = (key: 'material' | 'pile' | 'room_type' | 'mood', val: string) => {
    navigate(buildCatalogUrl({ [key]: val }));
  };

  const clearFilters = () => navigate('/catalog');
  const hasActiveFilters = materialParam !== 'all' || pileParam !== 'all' || roomParam !== 'all' || moodParam !== 'all';

  return (
    <CustomerLayout>
      <SEO
        title="Rug Collection — Wool, Silk, Cotton & Synthetic"
        description="Browse our full collection of handcrafted rugs in wool, silk, cotton, and synthetic weaves. Every design available in custom sizes, made to order."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
            { '@type': 'ListItem', position: 2, name: 'Catalog', item: `${window.location.origin}/catalog` },
          ],
        }}
      />
      <div className="w-[94vw] max-w-none mx-auto px-4">

        {/* ── Page header ───────────────────────────────────────────── */}
        <div className="py-14 border-b border-stone-100 text-center">
          <h1 className="storefront-heading text-4xl">Latest Rug Designs</h1>
        </div>

        {/* ── Filter bar ─────────────────────────────────────────────── */}
        <div className="py-5 border-b border-stone-100">
          <div className="flex flex-wrap items-center gap-4">

            {/* Search */}
            <div className="relative flex-1 min-w-52 max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rugs…"
                className="w-full border border-stone-200 focus:border-stone-400 pl-8 pr-8 py-2 text-stone-900 text-sm placeholder-stone-400 focus:outline-none transition-colors"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filters toggle */}
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className={`relative flex items-center gap-2 text-xs font-medium uppercase tracking-wider px-3 py-2 border transition-colors ${
                filtersOpen ? 'bg-stone-900 text-white border-stone-900' : 'text-stone-600 border-stone-200 hover:border-stone-400 hover:text-stone-900'
              }`}
            >
              {filtersOpen ? <Minus size={13} /> : <Plus size={13} />}
              Filters
              {hasActiveFilters && !filtersOpen && (
                <span className="w-1.5 h-1.5 rounded-full bg-stone-900" />
              )}
            </button>

            <div className="flex items-center gap-3 ml-auto">
              {/* Clear */}
              {hasActiveFilters && (
                <button onClick={clearFilters}
                  className="text-xs text-stone-400 hover:text-stone-900 flex items-center gap-1 transition-colors"
                >
                  <X size={11} /> Clear
                </button>
              )}

              {/* Measurement unit */}
              <div className="flex items-center border border-stone-200 p-0.5" aria-label="Measurement unit">
                {(['ft', 'cm'] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setSizeUnit(unit)}
                    className={`px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                      sizeUnit === unit ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="text-xs border border-stone-200 px-3 py-2 text-stone-600 focus:outline-none focus:border-stone-400 transition-colors"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <p className="text-stone-400 text-xs whitespace-nowrap">
                {total} {total === 1 ? 'rug' : 'rugs'}
              </p>
            </div>
          </div>

          {filtersOpen && (
            <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-stone-100">
              {/* Material */}
              <div className="space-y-1">
                <label className="block text-xs text-stone-400 uppercase tracking-wider">Material</label>
                <select
                  value={materialParam}
                  onChange={(e) => setFilter('material', e.target.value)}
                  className="text-xs border border-stone-200 px-3 py-2 text-stone-700 capitalize focus:outline-none focus:border-stone-400 transition-colors min-w-32"
                >
                  {['all', ...MATERIAL_OPTIONS].map((m) => (
                    <option key={m} value={m} className="capitalize">{m === 'all' ? 'All' : m}</option>
                  ))}
                </select>
              </div>

              {/* Pile */}
              <div className="space-y-1">
                <label className="block text-xs text-stone-400 uppercase tracking-wider">Pile</label>
                <select
                  value={pileParam}
                  onChange={(e) => setFilter('pile', e.target.value)}
                  className="text-xs border border-stone-200 px-3 py-2 text-stone-700 capitalize focus:outline-none focus:border-stone-400 transition-colors min-w-32"
                >
                  {['all', ...PILE_OPTIONS].map((p) => (
                    <option key={p} value={p}>{p === 'all' ? 'All' : `${p} pile`}</option>
                  ))}
                </select>
              </div>

              {/* Shop by Space */}
              <div className="space-y-1">
                <label className="block text-xs text-stone-400 uppercase tracking-wider">Space</label>
                <select
                  value={roomParam}
                  onChange={(e) => setFilter('room_type', e.target.value)}
                  className="text-xs border border-stone-200 px-3 py-2 text-stone-700 focus:outline-none focus:border-stone-400 transition-colors min-w-36"
                >
                  {['all', ...ROOM_TYPE_OPTIONS].map((r) => (
                    <option key={r} value={r}>{r === 'all' ? 'All' : tagLabel(r)}</option>
                  ))}
                </select>
              </div>

              {/* Shop by Mood */}
              <div className="space-y-1">
                <label className="block text-xs text-stone-400 uppercase tracking-wider">Mood</label>
                <select
                  value={moodParam}
                  onChange={(e) => setFilter('mood', e.target.value)}
                  className="text-xs border border-stone-200 px-3 py-2 text-stone-700 focus:outline-none focus:border-stone-400 transition-colors min-w-40"
                >
                  {['all', ...MOOD_TAG_OPTIONS].map((m) => (
                    <option key={m} value={m}>{m === 'all' ? 'All' : tagLabel(m)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Grid ───────────────────────────────────────────────────── */}
        <div className="py-12">
          {loading ? (
            <div className="flex justify-center py-32">
              <div className="w-6 h-6 border border-stone-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-32 space-y-3">
              <Layers size={32} className="mx-auto text-stone-300" />
              <p className="text-stone-400 text-sm">No rugs match your filters.</p>
              <button onClick={clearFilters}
                className="text-xs text-stone-400 hover:text-stone-900 underline underline-offset-4 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
              {items.map((rug) => {
                const previewImage = colorPreviewByRug[rug.id] || rug.image_url;
                return (
                <Link
                  key={rug.id}
                  to={`/catalog/${rug.slug}`}
                  className="group block"
                  onMouseLeave={() => setColorPreviewByRug((current) => ({ ...current, [rug.id]: '' }))}
                >
                  {/* Image — hovers to the first gallery/lifestyle shot when one exists */}
                  <div className="relative overflow-hidden bg-stone-100 aspect-[4/5]">
                    {previewImage ? (
                      <>
                        <img
                          key={previewImage}
                          src={previewImage}
                          alt={rug.name}
                          loading="lazy"
                          className={`w-full h-full object-cover transition-opacity duration-500 ${rug.images.length > 0 && !colorPreviewByRug[rug.id] ? 'group-hover:opacity-0' : ''}`}
                        />
                        {rug.images.length > 0 && !colorPreviewByRug[rug.id] && (
                          <img
                            src={rug.images[0].image_url}
                            alt=""
                            loading="lazy"
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          />
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Layers size={28} className="text-stone-300" />
                      </div>
                    )}
                    {!rug.available && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <span className="text-stone-600 text-xs tracking-widest uppercase">Out of stock</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="pt-4 space-y-1 text-center">
                    <h3 className="font-serif text-base font-light text-stone-900 leading-snug">{rug.name}</h3>
                    {rug.color_options.length > 0 && (
                      <div className="flex items-center justify-center gap-1.5 py-1" aria-label={`${rug.color_options.length} color options`}>
                        {rug.color_options.slice(0, 6).map((color) => (
                          <span key={color.name} title={`${color.name}${color.image_url ? ' — preview' : ''}`} tabIndex={color.image_url ? 0 : -1}
                            onMouseEnter={() => color.image_url && setColorPreviewByRug((current) => ({ ...current, [rug.id]: color.image_url! }))}
                            onFocus={() => color.image_url && setColorPreviewByRug((current) => ({ ...current, [rug.id]: color.image_url! }))}
                            className={`w-3.5 h-3.5 rounded-full border border-black/10 ${color.image_url ? 'cursor-pointer ring-offset-1 focus:ring-1 focus:ring-stone-500 outline-none' : ''}`}
                            style={{ backgroundColor: color.hex }} />
                        ))}
                        {rug.color_options.length > 6 && <span className="text-stone-400 text-[10px]">+{rug.color_options.length - 6}</span>}
                      </div>
                    )}
                  </div>
                </Link>
              );})}
            </div>
          )}

          {/* Infinite scroll trigger */}
          {!loading && items.length > 0 && (
            <div ref={sentinelRef} className="flex justify-center py-12">
              {loadingMore && (
                <div className="w-5 h-5 border border-stone-400 border-t-transparent rounded-full animate-spin" />
              )}
              {!hasMore && (
                <p className="text-stone-400 text-xs uppercase tracking-wider">You've reached the end of the collection</p>
              )}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
