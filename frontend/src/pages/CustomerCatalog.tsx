import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Search, Layers, X } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';

interface CatalogRug {
  id: number;
  name: string;
  description: string;
  material: string;
  material_type: string;
  weave_type: string;
  pile_height: string;
  image_url: string | null;
  base_price_per_sqm: number;
  lead_time_days: number;
  sizes: string[];
  available: boolean;
}

const SORT_OPTIONS = [
  { value: 'default',    label: 'Featured' },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'lead-asc',   label: 'Fastest delivery' },
];

export default function CustomerCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalog, setCatalog] = useState<CatalogRug[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('default');

  const materialParam = searchParams.get('material') ?? 'all';
  const pileParam     = searchParams.get('pile')     ?? 'all';

  useEffect(() => {
    axios.get('/api/customer/catalog')
      .then(({ data }) => setCatalog(data))
      .finally(() => setLoading(false));
  }, []);

  const materials   = ['all', ...Array.from(new Set(catalog.map((r) => r.material_type).filter(Boolean)))];
  const pileHeights = ['all', ...Array.from(new Set(catalog.map((r) => r.pile_height).filter(Boolean)))];

  const setFilter = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val === 'all') next.delete(key);
    else next.set(key, val);
    setSearchParams(next);
  };

  const clearFilters = () => setSearchParams({});
  const hasActiveFilters = materialParam !== 'all' || pileParam !== 'all';

  let filtered = catalog.filter((r) => {
    const bySearch   = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase());
    const byMaterial = materialParam === 'all' || r.material_type === materialParam;
    const byPile     = pileParam === 'all' || r.pile_height === pileParam;
    return bySearch && byMaterial && byPile;
  });

  if (sort === 'price-asc')  filtered = [...filtered].sort((a, b) => a.base_price_per_sqm - b.base_price_per_sqm);
  if (sort === 'price-desc') filtered = [...filtered].sort((a, b) => b.base_price_per_sqm - a.base_price_per_sqm);
  if (sort === 'lead-asc')   filtered = [...filtered].sort((a, b) => a.lead_time_days - b.lead_time_days);

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-6">

        {/* ── Page header ───────────────────────────────────────────── */}
        <div className="py-14 border-b border-stone-100">
          <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Our Collection</p>
          <h1 className="font-serif text-5xl font-light text-stone-900">All Rugs</h1>
        </div>

        {/* ── Filter bar ─────────────────────────────────────────────── */}
        <div className="py-5 border-b border-stone-100 flex flex-wrap items-center gap-4">

          {/* Search */}
          <div className="relative flex-1 min-w-52 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rugs…"
              className="w-full border border-stone-200 focus:border-stone-400 pl-8 pr-3 py-2 text-stone-900 text-sm placeholder-stone-400 focus:outline-none transition-colors"
            />
          </div>

          {/* Material pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-stone-400 uppercase tracking-wider">Material:</span>
            {materials.map((m) => (
              <button
                key={m}
                onClick={() => setFilter('material', m)}
                className={`text-xs px-3 py-1.5 border capitalize transition-colors ${
                  materialParam === m
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-900'
                }`}
              >
                {m === 'all' ? 'All' : m}
              </button>
            ))}
          </div>

          {/* Pile pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-stone-400 uppercase tracking-wider">Pile:</span>
            {pileHeights.map((p) => (
              <button
                key={p}
                onClick={() => setFilter('pile', p)}
                className={`text-xs px-3 py-1.5 border capitalize transition-colors ${
                  pileParam === p
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-900'
                }`}
              >
                {p === 'all' ? 'All' : `${p} pile`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Clear */}
            {hasActiveFilters && (
              <button onClick={clearFilters}
                className="text-xs text-stone-400 hover:text-stone-900 flex items-center gap-1 transition-colors"
              >
                <X size={11} /> Clear
              </button>
            )}

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
              {filtered.length} {filtered.length === 1 ? 'rug' : 'rugs'}
            </p>
          </div>
        </div>

        {/* ── Grid ───────────────────────────────────────────────────── */}
        <div className="py-12">
          {loading ? (
            <div className="flex justify-center py-32">
              <div className="w-6 h-6 border border-stone-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
              {filtered.map((rug) => (
                <Link
                  key={rug.id}
                  to={`/catalog/${rug.id}`}
                  className="group block"
                >
                  {/* Image */}
                  <div className="relative overflow-hidden bg-stone-100 aspect-[4/5]">
                    {rug.image_url ? (
                      <img
                        src={rug.image_url}
                        alt={rug.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Layers size={28} className="text-stone-300" />
                      </div>
                    )}
                    {!rug.available && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <span className="text-stone-500 text-xs tracking-widest uppercase">Unavailable</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="pt-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-base font-light text-stone-900 leading-snug">{rug.name}</h3>
                      <p className="text-stone-900 text-sm flex-shrink-0">
                        ₹{rug.base_price_per_sqm}<span className="text-stone-400 text-xs">/m²</span>
                      </p>
                    </div>
                    <p className="text-stone-400 text-sm capitalize">
                      {[rug.material, rug.weave_type].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-stone-400 text-xs">{rug.lead_time_days} days delivery · {rug.sizes.length} sizes</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
