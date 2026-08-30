import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, Clock, Layers, RefreshCw, Plus, Pencil, Trash2, X, AlertTriangle, Check, Upload, Link2, Image as ImageIcon, ArrowUp, ArrowDown, Maximize2 } from 'lucide-react';
import axios from 'axios';
import { getCatalog, createRug, updateRug, deleteRug, getInventory, addRugImage, updateRugImageOrder, deleteRugImage } from '../services/api';
import type { RugCatalog, Material, RugImage, CatalogSize } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { fmtTenant } from '../utils/currency';
import CornerCropModal from '../components/CornerCropModal';
import RichTextEditor from '../components/RichTextEditor';
import SizesEditor from '../components/SizesEditor';

const PILE_OPTIONS   = ['low', 'medium', 'high', 'flat'];
const WEAVE_OPTIONS  = ['hand-knotted', 'hand-tufted', 'flatweave', 'machine-woven'];
const ROOM_TYPE_OPTIONS = ['living_room', 'bedroom', 'dining_room', 'entryway'];
const MOOD_TAG_OPTIONS  = ['warm_earthy', 'quiet_luxury', 'modern_minimal', 'bohemian', 'bold_artistic', 'timeless_traditional'];
const tagLabel = (v: string) => v.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

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
  about_content_html: string;
  material_id: string;
  pile_height: string;
  weave_type: string;
  lead_time_days: string;
  image_url: string;
  sizes: CatalogSize[];
  room_types: string[];
  mood_tags: string[];
};

const BLANK: FormData = {
  name: '', description: '', about_content_html: '', material_id: '',
  pile_height: 'medium', weave_type: 'hand-knotted',
  lead_time_days: '21', image_url: '', sizes: [], room_types: [], mood_tags: [],
};

function rugToForm(r: RugCatalog): FormData {
  const hasDefaultSize = r.sizes.some((size) => size.is_default);
  return {
    name: r.name,
    description: r.description ?? '',
    about_content_html: r.about_content_html ?? '',
    material_id: String(r.material_id),
    pile_height: r.pile_height ?? 'medium',
    weave_type: r.weave_type ?? 'hand-knotted',
    lead_time_days: String(r.lead_time_days),
    image_url: r.image_url ?? '',
    sizes: r.sizes.map((size, index) => ({
      ...size,
      price: size.price ?? r.base_price,
      is_default: hasDefaultSize ? Boolean(size.is_default) : index === 0,
    })),
    room_types: r.room_types ?? [],
    mood_tags: r.mood_tags ?? [],
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
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileRef                 = useRef<HTMLInputElement>(null);
  const firstRef                = useRef<HTMLInputElement>(null);

  // Gallery images — only manageable once the rug exists (needs an id to attach to)
  const [galleryImages, setGalleryImages] = useState<RugImage[]>(editing?.images ?? []);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryError, setGalleryError] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const handleGalleryImageUpload = async (files: File[]) => {
    if (!editing || files.length === 0) return;
    setGalleryUploading(true);
    setGalleryError('');
    const firstOrder = galleryImages.length > 0 ? Math.max(...galleryImages.map((i) => i.sort_order)) + 1 : 0;
    const failures: string[] = [];
    for (const [index, file] of files.entries()) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const { data } = await axios.post<{ url: string }>('/api/catalog/upload-image', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const created = await addRugImage(editing.id, data.url, firstOrder + index);
        setGalleryImages((prev) => [...prev, created]);
      } catch (err: any) {
        failures.push(`${file.name}: ${err.response?.data?.detail ?? 'upload failed'}`);
      }
    }
    if (failures.length > 0) setGalleryError(failures.join(' · '));
    setGalleryUploading(false);
  };

  const handleDeleteGalleryImage = async (imageId: number) => {
    try {
      await deleteRugImage(imageId);
      setGalleryImages((prev) => prev.filter((i) => i.id !== imageId));
    } catch {
      setGalleryError('Failed to delete image.');
    }
  };

  const handleMoveGalleryImage = async (index: number, direction: 'up' | 'down') => {
    const sorted = [...galleryImages].sort((a, b) => a.sort_order - b.sort_order);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[swapWith];
    try {
      const [updatedA, updatedB] = await Promise.all([
        updateRugImageOrder(a.id, b.sort_order),
        updateRugImageOrder(b.id, a.sort_order),
      ]);
      setGalleryImages((prev) => prev.map((img) => {
        if (img.id === updatedA.id) return updatedA;
        if (img.id === updatedB.id) return updatedB;
        return img;
      }));
    } catch {
      setGalleryError('Failed to reorder images.');
    }
  };

  // Opens the corner-crop modal instead of uploading directly — the modal's
  // own "Apply Crop" / "Use Original" actions do the actual upload.
  const handleImageUpload = (file: File) => {
    if (!file) return;
    setCropFile(file);
  };

  useEffect(() => { setTimeout(() => firstRef.current?.focus(), 50); }, []);

  const set = (field: keyof FormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const toggleTag = (field: 'room_types' | 'mood_tags', value: string) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value) ? f[field].filter((v) => v !== value) : [...f[field], value],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const materialId = Number(form.material_id);
    const leadTimeDays = Number(form.lead_time_days);
    if (
      !form.name.trim()
      || !form.material_id || !Number.isInteger(materialId) || materialId < 1
      || !form.lead_time_days || !Number.isInteger(leadTimeDays) || leadTimeDays < 1
    ) {
      setError('Complete all required fields with valid values.');
      setSaving(false);
      return;
    }
    const validSizes = form.sizes.filter((s) => s.ft.trim());
    const defaultSize = validSizes.find((s) => s.is_default);
    if (validSizes.length === 0 || !defaultSize) {
      setError('Add at least one size and select its Default option.');
      setSaving(false);
      return;
    }
    if (validSizes.some((size) => !Number.isFinite(Number(size.price)) || Number(size.price) < 0)) {
      setError('Enter a valid total price for every size.');
      setSaving(false);
      return;
    }
    const payload = {
      name:                form.name.trim(),
      description:         form.description.trim() || null,
      about_content_html:  form.about_content_html || null,
      material_id:         materialId,
      // Legacy columns remain populated from the default size for backwards
      // compatibility; pricing calculations read sizes[].price.
      base_price:          Number(defaultSize.price),
      base_price_currency: tenant.base_currency,
      pile_height:         form.pile_height || null,
      weave_type:          form.weave_type || null,
      lead_time_days:      leadTimeDays,
      image_url:           form.image_url.trim() || null,
      sizes:               validSizes.map((s) => ({
        ft: s.ft.trim(),
        cm: s.cm?.trim() || null,
        is_default: Boolean(s.is_default),
        price: Number(s.price),
      })),
      room_types:          form.room_types,
      mood_tags:           form.mood_tags,
    };
    try {
      const saved = editing
        ? await updateRug(editing.id, payload)
        : await createRug(payload);
      onSaved(saved);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail)
        ? detail.map((item: any) => item?.msg).filter(Boolean).join(' ') || 'Some catalog fields are invalid.'
        : typeof detail === 'string' ? detail : 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full sm:max-w-2xl xl:max-w-3xl bg-dark-900 border-l border-dark-700 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 xl:px-8 py-4 border-b border-dark-700 flex-shrink-0">
          <h2 className="text-cream-100 font-bold text-base">
            {editing ? 'Edit Rug' : 'Add New Rug'}
          </h2>
          <button onClick={onClose} className="text-dark-500 hover:text-cream-300 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form id="catalog-rug-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 sm:px-6 xl:px-8 py-5 space-y-4">

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
            <p className="text-dark-500 text-xs">Short plain-text summary — used for search and page meta description.</p>
          </div>

          {/* About This Rug (rich text) */}
          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">About This Rug</label>
            <RichTextEditor
              value={form.about_content_html}
              onChange={(html) => set('about_content_html', html)}
              placeholder="Tell the story of this rug — craftsmanship, materials, inspiration…"
            />
            <p className="text-dark-500 text-xs">Rich content shown in the "About this rug" section on the storefront. Falls back to the plain description above when empty.</p>
          </div>

          {/* Gallery Images — needs an existing rug id, so unavailable until first saved */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon size={13} /> Gallery Images
              </label>
              {editing && (
                <label className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg text-dark-300 hover:text-cream-200 text-xs cursor-pointer transition-colors">
                  {galleryUploading ? (
                    <div className="w-3 h-3 border border-gold-500/40 border-t-gold-500 rounded-full animate-spin" />
                  ) : (
                    <Upload size={12} />
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
              )}
            </div>
            {editing ? (
              <>
                <p className="text-dark-500 text-xs">The cover image above always shows first. These are extra photos shown in the slider on the storefront.</p>
                {galleryError && (
                  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg p-2">
                    <AlertTriangle size={12} /> {galleryError}
                  </div>
                )}
                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {[...galleryImages].sort((a, b) => a.sort_order - b.sort_order).map((img, i, arr) => (
                      <div key={img.id} className="relative group rounded-lg overflow-hidden bg-dark-800 border border-dark-700 aspect-square">
                        <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-dark-950/0 group-hover:bg-dark-950/60 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => setLightboxImage(img.image_url)}
                            className="p-1 rounded-lg bg-dark-900/80 text-cream-200 hover:text-gold-400 transition-colors"
                            title="Expand"
                          >
                            <Maximize2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveGalleryImage(i, 'up')}
                            disabled={i === 0}
                            className="p-1 rounded-lg bg-dark-900/80 text-cream-200 hover:text-gold-400 disabled:opacity-30 transition-colors"
                            title="Move earlier"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveGalleryImage(i, 'down')}
                            disabled={i === arr.length - 1}
                            className="p-1 rounded-lg bg-dark-900/80 text-cream-200 hover:text-gold-400 disabled:opacity-30 transition-colors"
                            title="Move later"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGalleryImage(img.id)}
                            className="p-1 rounded-lg bg-dark-900/80 text-red-400 hover:text-red-300 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-dark-500 text-xs">Save this rug first — you'll be able to add gallery images once it exists.</p>
            )}
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

          {/* Lead time */}
          <div>
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
          <SizesEditor value={form.sizes} onChange={(sizes) => setForm((f) => ({ ...f, sizes }))} />

          {/* Shop by Space / Shop by Mood tags */}
          <div className="space-y-1.5">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Shop by Space</label>
            <div className="flex flex-wrap gap-1.5">
              {ROOM_TYPE_OPTIONS.map((v) => (
                <button key={v} type="button" onClick={() => toggleTag('room_types', v)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${form.room_types.includes(v) ? 'border-gold-600/50 bg-gold-600/10 text-gold-400' : 'border-dark-700 text-dark-400 hover:text-cream-300'}`}>
                  {tagLabel(v)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Shop by Mood</label>
            <div className="flex flex-wrap gap-1.5">
              {MOOD_TAG_OPTIONS.map((v) => (
                <button key={v} type="button" onClick={() => toggleTag('mood_tags', v)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${form.mood_tags.includes(v) ? 'border-gold-600/50 bg-gold-600/10 text-gold-400' : 'border-dark-700 text-dark-400 hover:text-cream-300'}`}>
                  {tagLabel(v)}
                </button>
              ))}
            </div>
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
                {form.image_url ? (
                  <img src={form.image_url} alt="preview" className="h-28 w-full object-cover rounded-lg" />
                ) : (
                  <>
                    <Upload size={22} className="text-dark-500 group-hover:text-gold-500 transition-colors" />
                    <p className="text-dark-400 text-xs text-center">Click or drag &amp; drop<br /><span className="text-dark-600">JPEG, PNG, WebP · max 20 MB</span></p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                />
                {form.image_url && (
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
            type="submit"
            form="catalog-rug-form"
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

      {cropFile && (
        <CornerCropModal
          file={cropFile}
          onComplete={(url) => { set('image_url', url); setCropFile(null); }}
          onCancel={() => setCropFile(null)}
        />
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
              className="input-field pl-9 pr-8 text-sm w-48"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-500 hover:text-cream-300">
                <X size={13} />
              </button>
            )}
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

            <Link to={`/admin/catalog/${rug.id}`} className="block">
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
                    {fmt(rug.base_price, rug.base_price_currency)}
                  </p>
                  <p className="text-dark-400 text-xs">total price per rug</p>
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
                      <span
                        key={size.ft}
                        className={`text-xs px-2 py-0.5 rounded border ${size.cm ? 'bg-dark-800 text-dark-300 border-dark-700' : 'bg-dark-800/50 text-dark-500 border-dark-700/60'}`}
                        title={size.cm ? undefined : 'No cm value entered yet'}
                      >
                        {size.ft} ft{size.cm ? ` (${size.cm} cm)` : ''}
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
