import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Clock, Layers, Package, Ruler,
  DollarSign, Zap, CheckCircle, AlertTriangle, Edit2,
  Trash2, X, Calculator, ChevronRight, ShoppingCart,
  TrendingUp, Star, RefreshCw,
} from 'lucide-react';
import {
  getRug, updateRug, deleteRug, calculateQuote, getQuotes,
} from '../services/api';
import type { RugCatalog, Quote, QuoteCalculateResponse } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { fmtTenant, CURRENCIES } from '../utils/currency';

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

  // Calculator
  const [calcW, setCalcW] = useState('3');
  const [calcH, setCalcH] = useState('4');
  const [calcQty, setCalcQty] = useState('1');
  const [calcRush, setCalcRush] = useState(false);
  const [calcResult, setCalcResult] = useState<QuoteCalculateResponse | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editPile, setEditPile] = useState('');
  const [editWeave, setEditWeave] = useState('');
  const [editLead, setEditLead] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editSizes, setEditSizes] = useState('');
  const [editMargin, setEditMargin] = useState('');
  const [editHsn, setEditHsn] = useState('');
  const [editPriceCurrency, setEditPriceCurrency] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [rugData, allQuotes] = await Promise.all([
        getRug(parseInt(id)),
        getQuotes(),
      ]);
      setRug(rugData);
      setQuotes(allQuotes.filter((q) => q.rug_catalog_id === parseInt(id)));
      // seed edit form
      setEditName(rugData.name);
      setEditDesc(rugData.description ?? '');
      setEditPrice(String(rugData.base_price));
      setEditPile(rugData.pile_height ?? '');
      setEditWeave(rugData.weave_type ?? '');
      setEditLead(String(rugData.lead_time_days));
      setEditImage(rugData.image_url ?? '');
      setEditSizes(rugData.sizes.join(', '));
      setEditMargin(rugData.profit_margin_pct != null ? String(rugData.profit_margin_pct) : '');
      setEditHsn(rugData.hsn_code ?? '5703');
      setEditPriceCurrency(rugData.base_price_currency ?? tenant.base_currency);
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
        size_w: w,
        size_h: h,
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

  // ── Edit submit ──────────────────────────────────────────────────────────────
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rug) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const sizes = editSizes.split(',').map((s) => s.trim()).filter(Boolean);
      const updated = await updateRug(rug.id, {
        name: editName,
        description: editDesc || null,
        base_price: parseFloat(editPrice),
        base_price_currency: editPriceCurrency || tenant.base_currency,
        pile_height: editPile || null,
        weave_type: editWeave || null,
        lead_time_days: parseInt(editLead),
        image_url: editImage || null,
        sizes,
        profit_margin_pct: editMargin !== '' ? parseFloat(editMargin) : null,
        hsn_code: editHsn || null,
      });
      setRug(updated);
      setEditOpen(false);
    } catch (err: any) {
      setEditError(err.response?.data?.detail || 'Update failed');
    } finally {
      setEditLoading(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!rug) return;
    setDeleteLoading(true);
    try {
      await deleteRug(rug.id);
      navigate('/catalog');
    } catch {
      setDeleteLoading(false);
      setDeleteConfirm(false);
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
        <Link to="/catalog" className="flex items-center gap-2 text-dark-400 hover:text-cream-200 text-sm w-fit">
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
          <Link to="/catalog" className="hover:text-gold-400 transition-colors flex items-center gap-1">
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
              {fmt(rug.material ? rug.material.cost_per_sqm * (1 + (rug.profit_margin_pct ?? (user?.tenant?.default_profit_margin_pct ?? 40)) / 100) : rug.base_price, rug.material?.cost_currency ?? rug.base_price_currency)}
            </p>
            <p className="text-dark-400 text-xs mt-0.5">
              selling/m² · {rug.profit_margin_pct ?? (user?.tenant?.default_profit_margin_pct ?? 40)}% margin
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
            label: 'Expected Delivery',
            value: `${rug.lead_time_days} days`,
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
                  key={size}
                  className="group relative bg-dark-800 hover:bg-dark-750 border border-dark-600 hover:border-gold-600/40 rounded-xl px-4 py-2.5 transition-all cursor-default"
                >
                  <p className="text-cream-200 font-semibold text-sm">{size}m</p>
                  {(() => {
                    const [w, h] = size.split('x').map(Number);
                    if (w && h) {
                      return <p className="text-dark-500 text-xs">{(w * h).toFixed(1)} m²</p>;
                    }
                    return null;
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
                  <Ruler size={11} /> Dimensions (meters)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-0.5">
                    <input
                      type="number"
                      value={calcW}
                      onChange={(e) => { setCalcW(e.target.value); setCalcResult(null); }}
                      min="0.5"
                      step="0.5"
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
                      min="0.5"
                      step="0.5"
                      placeholder="Length"
                      className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-cream-100 focus:outline-none focus:border-gold-600 text-sm transition-colors"
                    />
                    <p className="text-dark-400 text-xs text-center">Length</p>
                  </div>
                </div>
                {calcW && calcH && (
                  <p className="text-gold-400/70 text-xs mt-1.5 text-right">
                    {(parseFloat(calcW) * parseFloat(calcH)).toFixed(2)} m² per piece
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
                  <p className="font-medium">Early Delivery</p>
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
                    <span>Selling rate</span>
                    <span>{fmt(calcResult.subtotal / calcResult.total_sqm, calcResult.price_currency)}/m²</span>
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
                      <span>Early delivery fee</span>
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

      {/* ── Edit Modal ── */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-dark-700">
              <div>
                <h3 className="text-cream-100 font-bold text-lg">Edit Rug</h3>
                <p className="text-dark-400 text-xs mt-0.5">Update catalog details</p>
              </div>
              <button onClick={() => setEditOpen(false)} className="text-dark-400 hover:text-cream-200 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-cream-300 text-xs font-medium uppercase tracking-wider">Name</label>
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2.5 text-cream-100 focus:outline-none focus:border-gold-600 text-sm transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-cream-300 text-xs font-medium uppercase tracking-wider">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2.5 text-cream-100 focus:outline-none focus:border-gold-600 text-sm resize-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-cream-300 text-xs font-medium uppercase tracking-wider">
                    <DollarSign size={10} className="inline" /> Base Price / m²
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2.5 text-cream-100 focus:outline-none focus:border-gold-600 text-sm transition-colors flex-1 min-w-0"
                    />
                    <select
                      value={editPriceCurrency}
                      onChange={(e) => setEditPriceCurrency(e.target.value)}
                      className="bg-dark-800 border border-dark-600 rounded-lg px-2 py-2.5 text-cream-100 focus:outline-none focus:border-gold-600 text-sm transition-colors w-20"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.code}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-cream-300 text-xs font-medium uppercase tracking-wider">
                    <Clock size={10} className="inline" /> Expected Delivery (days)
                  </label>
                  <input
                    required
                    type="number"
                    value={editLead}
                    onChange={(e) => setEditLead(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2.5 text-cream-100 focus:outline-none focus:border-gold-600 text-sm transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-cream-300 text-xs font-medium uppercase tracking-wider">
                  Profit Margin % <span className="text-dark-500 normal-case font-normal">(overrides tenant default)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="0.5"
                    value={editMargin}
                    onChange={(e) => setEditMargin(e.target.value)}
                    placeholder={`Tenant default (${user?.tenant?.default_profit_margin_pct ?? 40}%)`}
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2.5 text-cream-100 focus:outline-none focus:border-gold-600 text-sm transition-colors pr-8 placeholder-dark-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm">%</span>
                </div>
                {editMargin && (
                  <p className="text-dark-500 text-xs">
                    Selling = material cost × {(1 + parseFloat(editMargin) / 100).toFixed(2)}×
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-cream-300 text-xs font-medium uppercase tracking-wider">
                  HSN Code <span className="text-dark-500 normal-case font-normal">(GST invoice)</span>
                </label>
                <select
                  value={editHsn}
                  onChange={(e) => setEditHsn(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2.5 text-cream-100 focus:outline-none focus:border-gold-600 text-sm transition-colors"
                >
                  <option value="5701">5701 — Knotted (hand-knotted)</option>
                  <option value="5702">5702 — Woven (not tufted)</option>
                  <option value="5703">5703 — Tufted carpets</option>
                  <option value="5704">5704 — Felt carpets</option>
                  <option value="5705">5705 — Other carpets</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-cream-300 text-xs font-medium uppercase tracking-wider">Pile Height</label>
                  <select
                    value={editPile}
                    onChange={(e) => setEditPile(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2.5 text-cream-100 focus:outline-none focus:border-gold-600 text-sm transition-colors"
                  >
                    <option value="">— none —</option>
                    {['low', 'medium', 'high', 'flat'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-cream-300 text-xs font-medium uppercase tracking-wider">Weave Type</label>
                  <input
                    value={editWeave}
                    onChange={(e) => setEditWeave(e.target.value)}
                    placeholder="e.g. hand-knotted"
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2.5 text-cream-100 focus:outline-none focus:border-gold-600 text-sm transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-cream-300 text-xs font-medium uppercase tracking-wider">
                  Sizes (comma-separated, e.g. 2x3, 4x6, 6x9)
                </label>
                <input
                  value={editSizes}
                  onChange={(e) => setEditSizes(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2.5 text-cream-100 focus:outline-none focus:border-gold-600 text-sm transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-cream-300 text-xs font-medium uppercase tracking-wider">Image URL</label>
                <input
                  value={editImage}
                  onChange={(e) => setEditImage(e.target.value)}
                  placeholder="https://…"
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2.5 text-cream-100 focus:outline-none focus:border-gold-600 text-sm transition-colors"
                />
              </div>

              {editError && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg p-2.5">
                  <AlertTriangle size={13} /> {editError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 bg-dark-800 hover:bg-dark-700 text-dark-300 font-medium py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 bg-gold-600 hover:bg-gold-500 disabled:bg-dark-700 disabled:text-dark-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {editLoading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                    : 'Save Changes'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
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
    </div>
  );
}
