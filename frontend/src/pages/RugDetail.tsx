import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Clock, Layers, Package, Ruler,
  Zap, CheckCircle, AlertTriangle, Edit2,
  Trash2, X, Calculator, ChevronRight, ShoppingCart,
  TrendingUp, Star, RefreshCw, Upload, Image as ImageIcon,
  ArrowUp, ArrowDown, Maximize2,
} from 'lucide-react';
import axios from 'axios';
import {
  getRug, deleteRug, calculateQuote, getQuotes,
  addRugImage, updateRugImageOrder, deleteRugImage, getInventory,
} from '../services/api';
import type { RugCatalog, Quote, QuoteCalculateResponse, Material } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { fmtTenant } from '../utils/currency';
import { catalogSizeAreaSqm, toMetres, inputUnit } from '../utils/size';
import { CatalogDrawer } from './Catalog';

const MATERIAL_BADGE: Record<string, string> = {
  wool:      'bg-amber-900/40 text-amber-300 border border-amber-700/40',
  silk:      'bg-purple-900/40 text-purple-300 border border-purple-700/40',
  cotton:    'bg-blue-900/40 text-blue-300 border border-blue-700/40',
  synthetic: 'bg-teal-900/40 text-teal-300 border border-teal-700/40',
};

const PILE_BADGE: Record<string, string> = {
  low:    'bg-green-900/30 text-green-400 border border-green-800/40',
  medium: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/40',
  high:   'bg-orange-900/30 text-orange-400 border border-orange-800/40',
  flat:   'bg-dark-700 text-dark-300 border border-dark-600',
};

const STATUS_BADGE: Record<string, string> = {
  draft:    'bg-dark-700 text-dark-300',
  sent:     'bg-blue-900/40 text-blue-300',
  accepted: 'bg-green-900/40 text-green-300',
  rejected: 'bg-red-900/40 text-red-300',
};

export default function RugDetail() {
  const { user } = useAuth();
  const tenant = user!.tenant;
  const fmt = (n: number, currency?: string | null) => fmtTenant(n, tenant, currency);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [rug, setRug] = useState<RugCatalog | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);

  // Calculator
  const [calcW, setCalcW] = useState(tenant.default_size_unit === 'cm' ? '90' : '3');
  const [calcH, setCalcH] = useState(tenant.default_size_unit === 'cm' ? '120' : '4');
  const [calcQty, setCalcQty] = useState('1');
  const [calcRush, setCalcRush] = useState(false);
  const [calcResult, setCalcResult] = useState<QuoteCalculateResponse | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Shared catalog edit drawer
  const [editOpen, setEditOpen] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Gallery images
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [rugData, quotesPage, materialData] = await Promise.all([
        getRug(parseInt(id)),
        getQuotes({ rug_catalog_id: parseInt(id), page_size: 200 }),
        getInventory(),
      ]);
      setRug(rugData);
      setQuotes(quotesPage.items);
      setMaterials(materialData);
    } catch {
      setError('Failed to load rug details. Check the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Price calculator ─────────────────────────────────────────────────────────
  const handleCalculate = async () => {
    if (!rug) return;
    const w = parseFloat(calcW);
    const h = parseFloat(calcH);
    const qty = parseInt(calcQty);
    if (!w || !h || !qty) return;
    setCalcLoading(true);
    setCalcError(null);
    setCalcResult(null);
    try {
      const result = await calculateQuote({
        rug_id: rug.id,
        size_w: toMetres(w, tenant.default_size_unit),
        size_h: toMetres(h, tenant.default_size_unit),
        material_id: rug.material_id,
        qty,
        rush_order: calcRush,
      });
      setCalcResult(result);
    } catch (err: any) {
      setCalcError(err.response?.data?.detail || 'Calculation failed');
    } finally {
      setCalcLoading(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!rug) return;
    setDeleteLoading(true);
    try {
      await deleteRug(rug.id);
      navigate('/admin/catalog');
    } catch {
      setDeleteLoading(false);
      setDeleteConfirm(false);
    }
  };

  // ── Gallery images ───────────────────────────────────────────────────────────
  const handleGalleryImageUpload = async (files: File[]) => {
    if (!rug || files.length === 0) return;
    setGalleryUploading(true);
    setGalleryError(null);
    const firstOrder = rug.images.length > 0 ? Math.max(...rug.images.map((i) => i.sort_order)) + 1 : 0;
    const failures: string[] = [];
    for (const [index, file] of files.entries()) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const { data } = await axios.post<{ url: string }>('/api/catalog/upload-image', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        await addRugImage(rug.id, data.url, firstOrder + index);
      } catch (err: any) {
        failures.push(`${file.name}: ${err.response?.data?.detail ?? 'upload failed'}`);
      }
    }
    await load();
    if (failures.length > 0) setGalleryError(failures.join(' · '));
    setGalleryUploading(false);
  };

  const handleDeleteGalleryImage = async (imageId: number) => {
    try {
      await deleteRugImage(imageId);
      await load();
    } catch {
      setGalleryError('Failed to delete image.');
    }
  };

  const handleMoveGalleryImage = async (index: number, direction: 'up' | 'down') => {
    if (!rug) return;
    const images = [...rug.images].sort((a, b) => a.sort_order - b.sort_order);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= images.length) return;
    const a = images[index];
    const b = images[swapWith];
    try {
      await Promise.all([
        updateRugImageOrder(a.id, b.sort_order),
        updateRugImageOrder(b.id, a.sort_order),
      ]);
      await load();
    } catch {
      setGalleryError('Failed to reorder images.');
    }
  };

  // ── Loading / error states ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !rug) {
    return (
      <div className="p-6 space-y-4">
        <Link to="/admin/catalog" className="flex items-center gap-2 text-dark-400 hover:text-cream-200 text-sm w-fit">
          <ArrowLeft size={16} /> Back to Catalog
        </Link>
        <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-6 text-red-300 text-sm">
          {error ?? 'Rug not found.'}
        </div>
      </div>
    );
  }

  const totalRevenue = quotes
    .filter((q) => q.status === 'accepted')
    .reduce((sum, q) => sum + (q.final_price ?? 0), 0);

  return (
    <div className="p-6 space-y-6">

      {/* ── Breadcrumb + actions ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-dark-400">
          <Link to="/admin/catalog" className="hover:text-gold-400 transition-colors flex items-center gap-1">
            <BookOpen size={14} /> Catalog
          </Link>
          <ChevronRight size={13} />
          <span className="text-cream-300 font-medium truncate max-w-xs">{rug.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 text-dark-400 hover:text-cream-200 hover:bg-dark-800 rounded-lg transition-colors"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg text-dark-300 hover:text-cream-200 text-sm transition-colors"
          >
            <Edit2 size={14} /> Edit
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-800/40 rounded-lg text-red-400 text-sm transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* ── Hero image ── */}
      <div className="relative h-72 rounded-2xl overflow-hidden bg-dark-800 border border-dark-700">
        {rug.image_url ? (
          <img
            src={rug.image_url}
            alt={rug.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen size={56} className="text-dark-600" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950/90 via-dark-950/30 to-transparent" />
        {/* Name + weave overlaid */}
        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-dark-300 text-xs uppercase tracking-widest mb-1">
              {rug.weave_type ?? 'Custom'}
            </p>
            <h1 className="text-cream-100 font-bold text-3xl leading-tight">{rug.name}</h1>
          </div>
          <div className="flex-shrink-0 bg-dark-900/80 backdrop-blur-sm border border-gold-600/30 rounded-xl px-4 py-2.5 text-right">
            <p className="text-gold-400 font-bold text-2xl leading-none">
              {fmt(rug.base_price, rug.base_price_currency)}
            </p>
            <p className="text-dark-400 text-xs mt-0.5">
              total catalog price per rug
            </p>
          </div>
        </div>
      </div>

      {/* ── Stat tiles ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            icon: <Package size={16} />,
            label: 'Material',
            value: rug.material?.name ?? '—',
            sub: rug.material?.type,
            badge: MATERIAL_BADGE[rug.material?.type ?? ''],
          },
          {
            icon: <Layers size={16} />,
            label: 'Pile Height',
            value: rug.pile_height ? `${rug.pile_height} pile` : '—',
            badge: PILE_BADGE[rug.pile_height ?? ''],
          },
          {
            icon: <Clock size={16} />,
            label: 'Default Delivery',
            value: `${(rug.sizes.find((size) => size.is_default) ?? rug.sizes[0])?.lead_time_days ?? rug.lead_time_days} days`,
          },
          {
            icon: <TrendingUp size={16} />,
            label: 'Total Revenue',
            value: fmt(totalRevenue),
            sub: `${quotes.filter((q) => q.status === 'accepted').length} accepted quotes`,
          },
        ].map((tile) => (
          <div key={tile.label} className="bg-dark-900 border border-dark-700 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-cream-400 text-xs uppercase tracking-wider">
              {tile.icon} {tile.label}
            </div>
            <div>
              {tile.badge ? (
                <span className={`inline-block text-sm font-semibold px-2.5 py-0.5 rounded-full capitalize ${tile.badge}`}>
                  {tile.value}
                </span>
              ) : (
                <p className="text-cream-100 font-semibold text-lg">{tile.value}</p>
              )}
              {tile.sub && (
                <p className="text-dark-500 text-xs mt-0.5 capitalize">{tile.sub}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main 2-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left: Description + Specs + Material + Sizes */}
        <div className="lg:col-span-3 space-y-5">

          {/* Description */}
          {rug.description && (
            <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-2">
              <h2 className="text-cream-200 font-semibold text-sm uppercase tracking-wider">Description</h2>
              <p className="text-dark-300 leading-relaxed">{rug.description}</p>
            </div>
          )}

          {/* Gallery Images */}
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ImageIcon size={15} className="text-gold-400" />
                <h2 className="text-cream-200 font-semibold text-sm uppercase tracking-wider">Gallery Images</h2>
                <span className="text-dark-500 text-xs">({rug.images.length} additional)</span>
              </div>
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg text-dark-300 hover:text-cream-200 text-xs cursor-pointer transition-colors">
                {galleryUploading ? (
                  <div className="w-3.5 h-3.5 border border-gold-500/40 border-t-gold-500 rounded-full animate-spin" />
                ) : (
                  <Upload size={13} />
                )}
                Add Images
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={galleryUploading}
                  onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) handleGalleryImageUpload(files); e.target.value = ''; }}
                />
              </label>
            </div>
            <p className="text-dark-500 text-xs -mt-1">
              The cover image (set below in Edit) always shows first. These are extra photos shown in the slider on the storefront.
            </p>
            {galleryError && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg p-2.5">
                <AlertTriangle size={13} /> {galleryError}
              </div>
            )}
            {rug.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {[...rug.images].sort((a, b) => a.sort_order - b.sort_order).map((img, i, arr) => (
                  <div key={img.id} className="relative group rounded-xl overflow-hidden bg-dark-800 border border-dark-700 aspect-square">
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-dark-950/0 group-hover:bg-dark-950/60 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => setLightboxImage(img.image_url)}
                        className="p-1.5 rounded-lg bg-dark-900/80 text-cream-200 hover:text-gold-400 transition-colors"
                        title="Expand"
                      >
                        <Maximize2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveGalleryImage(i, 'up')}
                        disabled={i === 0}
                        className="p-1.5 rounded-lg bg-dark-900/80 text-cream-200 hover:text-gold-400 disabled:opacity-30 transition-colors"
                        title="Move earlier"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveGalleryImage(i, 'down')}
                        disabled={i === arr.length - 1}
                        className="p-1.5 rounded-lg bg-dark-900/80 text-cream-200 hover:text-gold-400 disabled:opacity-30 transition-colors"
                        title="Move later"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGalleryImage(img.id)}
                        className="p-1.5 rounded-lg bg-dark-900/80 text-red-400 hover:text-red-300 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Sizes */}
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Ruler size={15} className="text-gold-400" />
              <h2 className="text-cream-200 font-semibold text-sm uppercase tracking-wider">
                Available Sizes
              </h2>
              <span className="text-dark-500 text-xs">({rug.sizes.length} options)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {rug.sizes.map((size) => (
                <div
                  key={size.ft}
                  className="group relative bg-dark-800 hover:bg-dark-750 border border-dark-600 hover:border-gold-600/40 rounded-xl px-4 py-2.5 transition-all cursor-default"
                  title={size.cm ? undefined : 'No cm value entered yet'}
                >
                  <p className="text-cream-200 font-semibold text-sm">
                    {size.ft} ft{size.cm ? ` (${size.cm} cm)` : ''}
                  </p>
                  {(() => {
                    const area = catalogSizeAreaSqm(size);
                    if (area) {
                      return <p className="text-dark-500 text-xs">{area.toFixed(1)} m² · {size.lead_time_days ?? rug.lead_time_days} days</p>;
                    }
                    return <p className="text-dark-500 text-xs">{size.lead_time_days ?? rug.lead_time_days} days</p>;
                  })()}
                </div>
              ))}
            </div>
          </div>

          {/* Material detail */}
          {rug.material && (
            <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Star size={15} className="text-gold-400" />
                <h2 className="text-cream-200 font-semibold text-sm uppercase tracking-wider">Material Details</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Name', value: rug.material.name },
                  { label: 'Type', value: rug.material.type, badge: MATERIAL_BADGE[rug.material.type] },
                  { label: 'Color', value: rug.material.color },
                  {
                    label: 'Stock',
                    value: `${rug.material.stock_meters.toFixed(0)} m`,
                    highlight: rug.material.stock_meters < 50 ? 'text-orange-400' : 'text-green-400',
                  },
                  { label: 'Cost / m²', value: fmt(rug.material.cost_per_sqm, rug.material.cost_currency) },
                  {
                    label: 'Availability',
                    value: rug.material.is_available ? 'In Stock' : 'Unavailable',
                    highlight: rug.material.is_available ? 'text-green-400' : 'text-red-400',
                  },
                ].map((row) => (
                  <div key={row.label} className="bg-dark-800 rounded-lg p-3">
                    <p className="text-cream-400 text-xs uppercase tracking-wider">{row.label}</p>
                    {row.badge ? (
                      <span className={`mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${row.badge}`}>
                        {row.value}
                      </span>
                    ) : (
                      <p className={`text-sm font-medium mt-0.5 capitalize ${row.highlight ?? 'text-cream-200'}`}>
                        {row.value}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quote history */}
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={15} className="text-gold-400" />
                <h2 className="text-cream-200 font-semibold text-sm uppercase tracking-wider">Quote History</h2>
              </div>
              <span className="text-dark-500 text-xs">{quotes.length} quotes</span>
            </div>

            {quotes.length === 0 ? (
              <div className="text-center py-8 text-dark-500 text-sm">
                <ShoppingCart size={24} className="mx-auto mb-2 opacity-30" />
                No quotes yet for this rug
              </div>
            ) : (
              <div className="space-y-2">
                {quotes.slice(0, 8).map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between gap-3 bg-dark-800 rounded-xl px-3 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-dark-500 text-xs font-mono flex-shrink-0">#{q.id}</span>
                      <div className="min-w-0">
                        <p className="text-cream-300 truncate font-medium">
                          {q.customer?.name ?? 'Unknown customer'}
                        </p>
                        <p className="text-dark-500 text-xs">
                          {q.custom_size_w && q.custom_size_h
                            ? `${q.custom_size_w}m × ${q.custom_size_h}m`
                            : 'Custom size'}{' '}
                          · qty {q.qty}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${STATUS_BADGE[q.status] ?? 'bg-dark-700 text-dark-400'}`}>
                        {q.status}
                      </span>
                      <span className="text-cream-200 font-semibold">
                        {fmt(q.final_price ?? 0, q.price_currency)}
                      </span>
                    </div>
                  </div>
                ))}
                {quotes.length > 8 && (
                  <p className="text-dark-500 text-xs text-center pt-1">
                    +{quotes.length - 8} more quotes
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Sticky price calculator */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Calculator size={16} className="text-gold-400" />
              <h2 className="text-cream-200 font-semibold">Price Calculator</h2>
            </div>

            <div className="space-y-3">
              {/* Width × Height */}
              <div>
                <label className="text-cream-400 text-xs uppercase tracking-wider flex items-center gap-1 mb-1.5">
                  <Ruler size={11} /> Dimensions ({inputUnit(tenant.default_size_unit)})
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-0.5">
                    <input
                      type="number"
                      value={calcW}
                      onChange={(e) => { setCalcW(e.target.value); setCalcResult(null); }}
                      min={tenant.default_size_unit === 'cm' ? '30' : '1'}
                      step={tenant.default_size_unit === 'cm' ? '5' : '0.5'}
                      placeholder="Width"
                      className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-cream-100 focus:outline-none focus:border-gold-600 text-sm transition-colors"
                    />
                    <p className="text-dark-400 text-xs text-center">Width</p>
                  </div>
                  <span className="text-dark-400 font-bold text-lg">×</span>
                  <div className="flex-1 space-y-0.5">
                    <input
                      type="number"
                      value={calcH}
                      onChange={(e) => { setCalcH(e.target.value); setCalcResult(null); }}
                      min={tenant.default_size_unit === 'cm' ? '30' : '1'}
                      step={tenant.default_size_unit === 'cm' ? '5' : '0.5'}
                      placeholder="Length"
                      className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-cream-100 focus:outline-none focus:border-gold-600 text-sm transition-colors"
                    />
                    <p className="text-dark-400 text-xs text-center">Length</p>
                  </div>
                </div>
                {calcW && calcH && (
                  <p className="text-gold-400/70 text-xs mt-1.5 text-right">
                    {(toMetres(parseFloat(calcW), tenant.default_size_unit) * toMetres(parseFloat(calcH), tenant.default_size_unit)).toFixed(2)} m² per piece
                  </p>
                )}
              </div>

              {/* Qty */}
              <div>
                <label className="text-cream-400 text-xs uppercase tracking-wider flex items-center gap-1 mb-1.5">
                  <Package size={11} /> Quantity
                </label>
                <input
                  type="number"
                  value={calcQty}
                  onChange={(e) => { setCalcQty(e.target.value); setCalcResult(null); }}
                  min="1"
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-cream-100 focus:outline-none focus:border-gold-600 text-sm transition-colors"
                />
                <p className="text-dark-400 text-xs mt-1">10+ pieces qualifies for bulk discount</p>
              </div>

              {/* Rush toggle */}
              <button
                onClick={() => { setCalcRush((r) => !r); setCalcResult(null); }}
                className={`w-full flex items-center gap-2.5 p-3 rounded-xl border transition-all text-sm ${
                  calcRush
                    ? 'border-gold-600/50 bg-gold-600/10 text-gold-400'
                    : 'border-dark-600 bg-dark-800 text-dark-300 hover:border-dark-500'
                }`}
              >
                <Zap size={15} className={calcRush ? 'text-gold-400' : 'text-dark-500'} />
                <div className="text-left flex-1">
                  <p className="font-medium">Rush</p>
                  <p className="text-xs opacity-70">+25% surcharge · Faster than estimated</p>
                </div>
                {calcRush && <CheckCircle size={14} className="text-gold-400 flex-shrink-0" />}
              </button>
            </div>

            {/* Calculate button */}
            <button
              onClick={handleCalculate}
              disabled={calcLoading || !calcW || !calcH}
              className="w-full bg-gold-600 hover:bg-gold-500 disabled:bg-dark-700 disabled:text-dark-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {calcLoading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Calculating…</>
              ) : (
                <><Calculator size={15} /> Calculate Price</>
              )}
            </button>

            {calcError && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg p-2.5">
                <AlertTriangle size={13} /> {calcError}
              </div>
            )}

            {/* Result breakdown */}
            {calcResult && (
              <div className="space-y-3 pt-1">
                <div className="border-t border-dark-700" />

                {/* Warnings */}
                {!calcResult.moq_met && (
                  <div className="flex items-start gap-2 text-orange-400 text-xs bg-orange-900/20 border border-orange-800/40 rounded-lg p-2.5">
                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" /> {calcResult.moq_message}
                  </div>
                )}
                {!calcResult.material_available && (
                  <div className="flex items-start gap-2 text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg p-2.5">
                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" /> {calcResult.material_message}
                  </div>
                )}

                {/* Line items */}
                <div className="bg-dark-800 rounded-xl p-3.5 space-y-2 text-sm">
                  <div className="flex justify-between text-cream-300">
                    <span>Area ({calcResult.size_sqm} m² × {calcResult.total_sqm / calcResult.size_sqm} pcs)</span>
                    <span>{calcResult.total_sqm} m²</span>
                  </div>
                  <div className="flex justify-between text-cream-300">
                    <span>Catalog price per rug</span>
                    <span>{fmt(calcResult.catalog_price_per_piece, calcResult.price_currency)}</span>
                  </div>
                  <div className="flex justify-between text-dark-400 text-xs">
                    <span>Your material cost</span>
                    <span>{fmt(calcResult.material_cost_per_sqm, calcResult.price_currency)}/m²</span>
                  </div>
                  <div className="flex justify-between text-cream-200">
                    <span>Subtotal</span>
                    <span>{fmt(calcResult.subtotal, calcResult.price_currency)}</span>
                  </div>
                  {calcResult.bulk_discount > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Bulk discount</span>
                      <span>−{fmt(calcResult.bulk_discount, calcResult.price_currency)}</span>
                    </div>
                  )}
                  {calcResult.rush_surcharge > 0 && (
                    <div className="flex justify-between text-orange-400">
                      <span>Rush fee</span>
                      <span>+{fmt(calcResult.rush_surcharge, calcResult.price_currency)}</span>
                    </div>
                  )}
                  {calcResult.size_surcharge > 0 && (
                    <div className="flex justify-between text-cream-300">
                      <span>Large format surcharge</span>
                      <span>+{fmt(calcResult.size_surcharge, calcResult.price_currency)}</span>
                    </div>
                  )}
                  <div className="border-t border-dark-600 pt-2 flex justify-between font-bold text-cream-100">
                    <span>Total</span>
                    <span className="text-gold-400 text-xl">{fmt(calcResult.final_price, calcResult.price_currency)}</span>
                  </div>
                  <div className="flex justify-between text-dark-300 text-xs">
                    <span>Per piece</span>
                    <span>{fmt(calcResult.price_per_piece, calcResult.price_currency)}</span>
                  </div>
                </div>

                {/* Lead time */}
                <div className="flex items-center gap-2 bg-dark-800 rounded-xl px-3.5 py-2.5 text-sm">
                  <Clock size={14} className="text-gold-400 flex-shrink-0" />
                  <div>
                    <p className="text-cream-300">Estimated production</p>
                    <p className="text-cream-200 font-semibold">{calcResult.estimated_days} days</p>
                  </div>
                </div>

                {/* CTA */}
                <Link
                  to={`/quote-builder?rug_id=${rug.id}&size_w=${calcW}&size_h=${calcH}&qty=${calcQty}&rush_order=${calcRush}&material_id=${rug.material_id}`}
                  className="w-full flex items-center justify-center gap-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 text-cream-200 font-medium py-2.5 rounded-xl text-sm transition-colors"
                >
                  <ShoppingCart size={14} /> Open in Quote Builder
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Shared catalog edit drawer ── */}
      {editOpen && (
        <CatalogDrawer
          editing={rug}
          materials={materials}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setRug(updated);
            setEditOpen(false);
          }}
        />
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-red-800/40 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={22} className="text-red-400" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-cream-100 font-bold text-lg">Delete Rug?</h3>
              <p className="text-dark-400 text-sm">
                <span className="text-cream-300">"{rug.name}"</span> will be permanently removed from the catalog.
                This cannot be undone.
              </p>
            </div>
            {quotes.length > 0 && (
              <div className="bg-orange-900/20 border border-orange-800/40 rounded-lg p-3 text-orange-400 text-xs flex items-start gap-2">
                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                This rug has {quotes.length} associated quote{quotes.length > 1 ? 's' : ''}. They will lose the catalog reference.
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 bg-dark-800 hover:bg-dark-700 text-dark-300 font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 bg-red-700 hover:bg-red-600 disabled:bg-dark-700 disabled:text-dark-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {deleteLoading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Trash2 size={14} /> Delete</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-dark-950/90 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 text-cream-200 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImage}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
