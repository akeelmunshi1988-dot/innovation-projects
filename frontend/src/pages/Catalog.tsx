import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, Clock, Layers, RefreshCw, Plus, Pencil, Trash2, X, AlertTriangle, Check, Upload, Link2 } from 'lucide-react';
import axios from 'axios';
import { getCatalog, createRug, updateRug, deleteRug, getInventory } from '../services/api';
import type { RugCatalog, Material } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { fmtTenant, CURRENCIES } from '../utils/currency';

const PILE_OPTIONS   = ['low', 'medium', 'high', 'flat'];
const WEAVE_OPTIONS  = ['hand-knotted', 'hand-tufted', 'flatweave', 'machine-woven'];

const typeColors: Record<string, string> = {
  wool:      'bg-amber-900/40 text-amber-300 border-amber-700/40',
  silk:      'bg-purple-900/40 text-purple-300 border-purple-700/40',
  cotton:    'bg-blue-900/40 text-blue-300 border-blue-700/40',
  synthetic: 'bg-teal-900/40 text-teal-300 border-teal-700/40',
};

const pileColors: Record<string, string> = {
  low:    'bg-green-900/30 text-green-400',
  medium: 'bg-yellow-900/30 text-yellow-400',
  high:   'bg-orange-900/30 text-orange-400',
  flat:   'bg-dark-700 text-dark-300',
};

// ── Blank form ────────────────────────────────────────────────────────────────

type FormData = {
  name: string;
  description: string;
  material_id: string;
  base_price: string;
  base_price_currency: string;
  pile_height: string;
  weave_type: string;
  lead_time_days: string;
  image_url: string;
  sizes_raw: string;
};

const BLANK: FormData = {
  name: '', description: '', material_id: '', base_price: '', base_price_currency: '',
  pile_height: 'medium', weave_type: 'hand-knotted',
  lead_time_days: '21', image_url: '', sizes_raw: '',
};

function rugToForm(r: RugCatalog): FormData {
  return {
    name: r.name,
    description: r.description ?? '',
    material_id: String(r.material_id),
    base_price: String(r.base_price),
    base_price_currency: r.base_price_currency ?? '',
    pile_height: r.pile_height ?? 'medium',
    weave_type: r.weave_type ?? 'hand-knotted',
    lead_time_days: String(r.lead_time_days),
    image_url: r.image_url ?? '',
    sizes_raw: r.sizes.join(', '),
  };
}

// ── Drawer ────────────────────────────────────────────────────────────────────

interface DrawerProps {
  editing: RugCatalog | null;
  materials: Material[];
  onClose: () => void;
  onSaved: (rug: RugCatalog) => void;
}

function CatalogDrawer({ editing, materials, onClose, onSaved }: DrawerProps) {
  const { user } = useAuth();
  const tenant = user!.tenant;

  const [form, setForm]         = useState<FormData>(editing ? rugToForm(editing) : BLANK);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const fileRef                 = useRef<HTMLInputElement>(null);
  const firstRef                = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await axios.post<{ url: string }>('/api/catalog/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set('image_url', data.url);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => { setTimeout(() => firstRef.current?.focus(), 50); }, []);

  const set = (field: keyof FormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      name:                form.name.trim(),
      description:         form.description.trim() || null,
      material_id:         parseInt(form.material_id),
      base_price:          parseFloat(form.base_price),
      base_price_currency: form.base_price_currency || tenant.base_currency,
      pile_height:         form.pile_height || null,
      weave_type:          form.weave_type || null,
      lead_time_days:      parseInt(form.lead_time_days) || 21,
      image_url:           form.image_url.trim() || null,
      sizes:               form.sizes_raw.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      const saved = editing
        ? await updateRug(editing.id, payload)
        : await createRug(payload);
      onSaved(saved);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-dark-900 border-l border-dark-700 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700 flex-shrink-0">
          <h2 className="text-cream-100 font-bold text-base">
            {editing ? 'Edit Rug' : 'Add New Rug'}
          </h2>
          <button onClick={onClose} className="text-dark-500 hover:text-cream-300 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* Name */}
          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Name *</label>
            <input
              ref={firstRef}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Vintage Kilim Runner"
              required
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Brief product description…"
              rows={3}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60 resize-none"
            />
          </div>

          {/* Material */}
          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Material *</label>
            <select
              value={form.material_id}
              onChange={(e) => set('material_id', e.target.value)}
              required
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm focus:outline-none focus:border-gold-600/60"
            >
              <option value="">Select material…</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Price + Lead time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Floor / Reference Price per sqm *</label>
              <div className="flex gap-1.5">
                <input
                  value={form.base_price}
                  onChange={(e) => set('base_price', e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="45.00"
                  required
                  className="flex-1 min-w-0 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60"
                />
                <select
                  value={form.base_price_currency || tenant.base_currency}
                  onChange={(e) => set('base_price_currency', e.target.value)}
                  className="w-20 bg-dark-800 border border-dark-700 rounded-lg px-2 py-2 text-cream-100 text-sm focus:outline-none focus:border-gold-600/60"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>
              <p className="text-dark-500 text-xs">Quote price = material cost × (1 + margin%)</p>
            </div>
            <div className="space-y-1">
              <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Expected Delivery (days) *</label>
              <input
                value={form.lead_time_days}
                onChange={(e) => set('lead_time_days', e.target.value)}
                type="number"
                min="1"
                placeholder="21"
                required
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60"
              />
            </div>
          </div>

          {/* Pile + Weave */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Pile Height</label>
              <select
                value={form.pile_height}
                onChange={(e) => set('pile_height', e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm focus:outline-none focus:border-gold-600/60"
              >
                <option value="">None</option>
                {PILE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Weave Type</label>
              <select
                value={form.weave_type}
                onChange={(e) => set('weave_type', e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm focus:outline-none focus:border-gold-600/60"
              >
                <option value="">None</option>
                {WEAVE_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>

          {/* Sizes */}
          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">
              Available Sizes <span className="text-dark-500 normal-case font-normal">(comma-separated, e.g. 2x3, 4x6, 6x9)</span>
            </label>
            <input
              value={form.sizes_raw}
              onChange={(e) => set('sizes_raw', e.target.value)}
              placeholder="2x3, 4x6, 5x8, 6x9, 8x10"
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60"
            />
            {form.sizes_raw && (
              <div className="flex flex-wrap gap-1 pt-1">
                {form.sizes_raw.split(',').map((s) => s.trim()).filter(Boolean).map((s) => (
                  <span key={s} className="text-xs bg-dark-700 text-dark-300 border border-dark-600 rounded px-2 py-0.5">{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Image */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Image</label>
              <div className="flex gap-1">
                <button type="button" onClick={() => setImageMode('upload')}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-all ${imageMode === 'upload' ? 'border-gold-600/50 bg-gold-600/10 text-gold-400' : 'border-dark-700 text-dark-400 hover:text-cream-300'}`}>
                  <Upload size={10} /> Upload
                </button>
                <button type="button" onClick={() => setImageMode('url')}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-all ${imageMode === 'url' ? 'border-gold-600/50 bg-gold-600/10 text-gold-400' : 'border-dark-700 text-dark-400 hover:text-cream-300'}`}>
                  <Link2 size={10} /> URL
                </button>
              </div>
            </div>

            {imageMode === 'upload' ? (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageUpload(f); }}
                className="relative flex flex-col items-center justify-center gap-2 border-2 border-dashed border-dark-600 hover:border-gold-600/50 rounded-xl p-5 cursor-pointer transition-colors group"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                ) : form.image_url ? (
                  <img src={form.image_url} alt="preview" className="h-28 w-full object-cover rounded-lg" />
                ) : (
                  <>
                    <Upload size={22} className="text-dark-500 group-hover:text-gold-500 transition-colors" />
                    <p className="text-dark-400 text-xs text-center">Click or drag &amp; drop<br /><span className="text-dark-600">JPEG, PNG, WebP · max 5 MB</span></p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                />
                {form.image_url && !uploading && (
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); set('image_url', ''); }}
                    className="absolute top-2 right-2 bg-dark-800 rounded-full p-1 text-dark-400 hover:text-red-400 transition-colors">
                    <X size={12} />
                  </button>
                )}
              </div>
            ) : (
              <>
                <input
                  value={form.image_url}
                  onChange={(e) => set('image_url', e.target.value)}
                  placeholder="https://… or /rugs/my-rug.jpg"
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60"
                />
                {form.image_url && (
                  <img src={form.image_url} alt="preview"
                    className="mt-1.5 h-24 w-full object-cover rounded-lg border border-dark-700"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-600/30 rounded-lg p-2.5 text-red-400 text-xs">
              <AlertTriangle size={12} className="flex-shrink-0" /> {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-dark-700 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl text-dark-300 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={saving}
            className="flex-1 py-2.5 bg-gold-600 hover:bg-gold-500 disabled:bg-dark-700 disabled:text-dark-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
            ) : (
              <><Check size={15} /> {editing ? 'Save Changes' : 'Add to Catalog'}</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Delete confirm dialog ─────────────────────────────────────────────────────

interface DeleteDialogProps {
  rug: RugCatalog;
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
}

function DeleteDialog({ rug, onCancel, onConfirm, deleting }: DeleteDialogProps) {
  return (
    <>
      <div className="fixed inset-0 bg-dark-950/70 backdrop-blur-sm z-50" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-sm space-y-4 pointer-events-auto shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-900/30 border border-red-700/40 rounded-xl flex items-center justify-center flex-shrink-0">
              <Trash2 size={16} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-cream-100 font-bold">Delete rug?</h3>
              <p className="text-dark-400 text-sm mt-0.5">
                "<span className="text-cream-300">{rug.name}</span>" will be permanently removed from the catalog.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl text-dark-300 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {deleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 size={14} />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const Catalog: React.FC = () => {
  const { user } = useAuth();
  const tenant = user!.tenant;
  const fmt = (n: number, currency?: string | null) => fmtTenant(n, tenant, currency);

  const [rugs, setRugs]           = useState<RugCatalog[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');

  const [drawer, setDrawer]           = useState<'new' | RugCatalog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RugCatalog | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const fetchCatalog = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, mats] = await Promise.all([getCatalog(), getInventory()]);
      setRugs(data);
      setMaterials(mats);
    } catch {
      setError('Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCatalog(); }, []);

  const handleSaved = (saved: RugCatalog) => {
    setRugs((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id);
      return idx >= 0 ? prev.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...prev];
    });
    setDrawer(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRug(deleteTarget.id);
      setRugs((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // keep dialog open — user can retry
    } finally {
      setDeleting(false);
    }
  };

  const filtered = rugs.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.weave_type ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BookOpen size={22} className="text-gold-400" />
          <div>
            <h1 className="text-2xl font-bold text-cream-100">Rug Catalog</h1>
            <p className="text-dark-400 text-sm">{rugs.length} products</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rugs..."
              className="input-field pl-9 text-sm w-48"
            />
          </div>
          <button onClick={fetchCatalog} className="btn-secondary flex items-center gap-2 text-sm p-2">
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setDrawer('new')}
            className="flex items-center gap-1.5 bg-gold-600 hover:bg-gold-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <Plus size={16} /> Add Rug
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((rug) => (
          <div key={rug.id} className="card hover:border-gold-700/50 transition-colors duration-200 overflow-hidden !p-0 relative group">
            {/* Edit / Delete overlay buttons */}
            <div className="absolute top-2 left-2 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setDrawer(rug)}
                className="flex items-center gap-1 bg-dark-900/90 backdrop-blur-sm border border-dark-700 hover:border-gold-600/50 text-dark-300 hover:text-gold-400 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
              >
                <Pencil size={11} /> Edit
              </button>
              <button
                onClick={() => setDeleteTarget(rug)}
                className="flex items-center gap-1 bg-dark-900/90 backdrop-blur-sm border border-dark-700 hover:border-red-600/50 text-dark-300 hover:text-red-400 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
              >
                <Trash2 size={11} /> Delete
              </button>
            </div>

            <Link to={`/catalog/${rug.id}`} className="block">
              {/* Image */}
              <div className="relative h-48 bg-dark-800 overflow-hidden">
                {rug.image_url ? (
                  <img
                    src={rug.image_url}
                    alt={rug.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={32} className="text-dark-600" />
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-dark-900/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-right">
                  <p className="text-gold-400 font-bold text-base leading-none">
                    {rug.material
                      ? fmt(rug.material.cost_per_sqm * (1 + (rug.profit_margin_pct ?? tenant.default_profit_margin_pct ?? 40) / 100), rug.material.cost_currency)
                      : fmt(rug.base_price, rug.base_price_currency)}
                  </p>
                  <p className="text-dark-400 text-xs">selling / sqm</p>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-cream-100 font-semibold leading-snug">{rug.name}</h3>
                    {rug.weave_type && (
                      <span className="text-dark-400 text-xs capitalize">{rug.weave_type}</span>
                    )}
                  </div>
                </div>

                {rug.description && (
                  <p className="text-dark-400 text-sm leading-relaxed line-clamp-3">{rug.description}</p>
                )}

                {rug.material && (
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${typeColors[rug.material.type] ?? 'bg-dark-700 text-dark-300 border-dark-600'}`}>
                      {rug.material.type}
                    </span>
                    <span className="text-dark-400 text-xs">{rug.material.name}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {rug.pile_height && (
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${pileColors[rug.pile_height] ?? 'bg-dark-700 text-dark-300'}`}>
                      <Layers size={11} />
                      {rug.pile_height} pile
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-dark-800 rounded-lg text-xs text-dark-400">
                    <Clock size={11} />
                    {rug.lead_time_days} days lead
                  </div>
                </div>

                <div>
                  <p className="text-dark-300 text-xs mb-1.5 uppercase tracking-wider">Available Sizes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rug.sizes.map((size) => (
                      <span key={size} className="bg-dark-800 text-dark-300 text-xs px-2 py-0.5 rounded border border-dark-700">
                        {size}m
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-16 text-dark-500">
          <BookOpen size={32} className="mx-auto mb-3 opacity-40" />
          {search ? (
            <p>No rugs matching "{search}"</p>
          ) : (
            <>
              <p className="font-medium">No rugs in catalog yet</p>
              <button
                onClick={() => setDrawer('new')}
                className="mt-3 text-gold-400 hover:text-gold-300 text-sm underline"
              >
                Add your first rug
              </button>
            </>
          )}
        </div>
      )}

      {/* Drawer */}
      {drawer !== null && (
        <CatalogDrawer
          editing={drawer === 'new' ? null : drawer}
          materials={materials}
          onClose={() => setDrawer(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete dialog */}
      {deleteTarget && (
        <DeleteDialog
          rug={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
};

export default Catalog;
