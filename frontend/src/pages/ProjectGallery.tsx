import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { LayoutGrid, Plus, Pencil, Trash2, X, AlertTriangle, Upload, RefreshCw, Star, Image as ImageIcon, ArrowUp, ArrowDown, Maximize2 } from 'lucide-react';
import {
  getGalleryItems, createGalleryItem, updateGalleryItem, deleteGalleryItem,
  addGalleryImage, updateGalleryImageOrder, deleteGalleryImage,
} from '../services/api';
import type { ProjectGalleryItem, ProjectGalleryImage } from '../types';

type FormData = {
  image_url: string;
  caption: string;
  link_url: string;
  description: string;
  owner_name: string;
  owner_message: string;
  rating: string;
  sort_order: string;
  is_active: boolean;
};

const BLANK: FormData = {
  image_url: '', caption: '', link_url: '', description: '', owner_name: '', owner_message: '', rating: '', sort_order: '0', is_active: true,
};

function itemToForm(g: ProjectGalleryItem): FormData {
  return {
    image_url: g.image_url,
    caption: g.caption ?? '',
    link_url: g.link_url ?? '',
    description: g.description ?? '',
    owner_name: g.owner_name ?? '',
    owner_message: g.owner_message ?? '',
    rating: g.rating != null ? String(g.rating) : '',
    sort_order: String(g.sort_order),
    is_active: g.is_active,
  };
}

interface DrawerProps {
  editing: ProjectGalleryItem | null;
  onClose: () => void;
  onSaved: (g: ProjectGalleryItem) => void;
}

function GalleryDrawer({ editing, onClose, onSaved }: DrawerProps) {
  const [form, setForm] = useState<FormData>(editing ? itemToForm(editing) : BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageFileRef = useRef<HTMLInputElement>(null);

  // Extra project photos beyond the cover image above — needs an existing
  // item id, same "unavailable until first saved" constraint Catalog.tsx's
  // rug gallery images have.
  const [galleryImages, setGalleryImages] = useState<ProjectGalleryImage[]>(editing?.images ?? []);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryError, setGalleryError] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

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
        const { data } = await axios.post<{ url: string }>('/api/gallery-items/upload-image', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const created = await addGalleryImage(editing.id, data.url, firstOrder + index);
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
      await deleteGalleryImage(imageId);
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
        updateGalleryImageOrder(a.id, b.sort_order),
        updateGalleryImageOrder(b.id, a.sort_order),
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

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await axios.post<{ url: string }>('/api/gallery-items/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set('image_url', data.url);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.image_url) { setError('Upload an image before saving.'); return; }
    setSaving(true);
    setError('');
    const payload = {
      image_url: form.image_url,
      caption: form.caption.trim() || null,
      link_url: form.link_url.trim() || null,
      description: form.description.trim() || null,
      owner_name: form.owner_name.trim() || null,
      owner_message: form.owner_message.trim() || null,
      rating: form.rating ? parseInt(form.rating) : null,
      sort_order: parseInt(form.sort_order) || 0,
      is_active: form.is_active,
    };
    try {
      const saved = editing
        ? await updateGalleryItem(editing.id, payload)
        : await createGalleryItem(payload);
      onSaved(saved);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-dark-900 border-l border-dark-700 z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700 flex-shrink-0">
          <h2 className="text-cream-100 font-bold text-base">
            {editing ? 'Edit Gallery Item' : 'Add Gallery Item'}
          </h2>
          <button onClick={onClose} className="text-dark-500 hover:text-cream-300 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Image *</label>
            {form.image_url && (
              <img src={form.image_url} alt="Preview" className="w-full h-40 object-cover rounded-lg bg-dark-800 mb-2" />
            )}
            <input
              ref={imageFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => imageFileRef.current?.click()}
              disabled={uploadingImage}
              className="btn-secondary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {uploadingImage
                ? <><div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" /> Uploading…</>
                : <><Upload size={14} /> {form.image_url ? 'Replace image' : 'Upload image (JPEG/PNG/WebP, max 20MB)'}</>}
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Caption</label>
            <input
              value={form.caption}
              onChange={(e) => set('caption', e.target.value)}
              placeholder="e.g. Private residence, Dubai"
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60"
            />
          </div>

          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Link (optional)</label>
            <input
              value={form.link_url}
              onChange={(e) => set('link_url', e.target.value)}
              placeholder="https://…"
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60"
            />
            <p className="text-dark-500 text-xs">Leave empty to link the tile to this project's own detail page instead of an external URL.</p>
          </div>

          {/* Extra project photos — cover image above always shows first;
              needs an existing item id, so unavailable until first saved. */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon size={13} /> Additional Photos
              </label>
              {editing && (
                <label className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg text-dark-300 hover:text-cream-200 text-xs cursor-pointer transition-colors">
                  {galleryUploading ? (
                    <div className="w-3 h-3 border border-gold-500/40 border-t-gold-500 rounded-full animate-spin" />
                  ) : (
                    <Upload size={12} />
                  )}
                  Add Photos
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
                <p className="text-dark-500 text-xs">Shown alongside the cover image on this project's detail page.</p>
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
                          <button type="button" onClick={() => setLightboxImage(img.image_url)} className="p-1 rounded-lg bg-dark-900/80 text-cream-200 hover:text-gold-400 transition-colors" title="Expand">
                            <Maximize2 size={12} />
                          </button>
                          <button type="button" onClick={() => handleMoveGalleryImage(i, 'up')} disabled={0 === i} className="p-1 rounded-lg bg-dark-900/80 text-cream-200 hover:text-gold-400 disabled:opacity-30 transition-colors" title="Move earlier">
                            <ArrowUp size={12} />
                          </button>
                          <button type="button" onClick={() => handleMoveGalleryImage(i, 'down')} disabled={i === arr.length - 1} className="p-1 rounded-lg bg-dark-900/80 text-cream-200 hover:text-gold-400 disabled:opacity-30 transition-colors" title="Move later">
                            <ArrowDown size={12} />
                          </button>
                          <button type="button" onClick={() => handleDeleteGalleryImage(img.id)} className="p-1 rounded-lg bg-dark-900/80 text-red-400 hover:text-red-300 transition-colors" title="Delete">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-dark-500 text-xs">Save this item first, then come back to add more photos.</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="A few lines about this project — room, materials, the brief…"
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60 resize-none"
            />
          </div>

          <div className="border-t border-dark-700 pt-4 space-y-3">
            <p className="text-cream-300 text-xs font-semibold uppercase tracking-wider">From the Homeowner (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-dark-400 text-xs">Customer Name</label>
                <input
                  value={form.owner_name}
                  onChange={(e) => set('owner_name', e.target.value)}
                  placeholder="e.g. Priya Nair"
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60"
                />
              </div>
              <div className="space-y-1">
                <label className="text-dark-400 text-xs">Rating</label>
                <div className="flex items-center gap-1 h-[38px]">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set('rating', String(n) === form.rating ? '' : String(n))}
                      className="p-0.5"
                      title={`${n} star${1 === n ? '' : 's'}`}
                    >
                      <Star size={18} className={n <= parseInt(form.rating || '0') ? 'text-gold-400 fill-gold-400' : 'text-dark-600'} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-dark-400 text-xs">Personal Message</label>
              <textarea
                value={form.owner_message}
                onChange={(e) => set('owner_message', e.target.value)}
                rows={3}
                placeholder="A note from the customer about their finished rug…"
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60 resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Order</label>
              <input
                value={form.sort_order}
                onChange={(e) => set('sort_order', e.target.value)}
                type="number"
                min="0"
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm focus:outline-none focus:border-gold-600/60"
              />
            </div>
            <div className="flex items-center gap-3 pb-2">
              <button
                type="button"
                onClick={() => set('is_active', !form.is_active)}
                className="relative flex-shrink-0"
              >
                <div className={`w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-gold-600' : 'bg-dark-700'}`} />
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-cream-300 text-sm">{form.is_active ? 'Active' : 'Hidden'}</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-600/30 rounded-lg p-3 text-red-400 text-sm">
              <AlertTriangle size={13} className="flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                : editing ? 'Save Changes' : <><Plus size={15} /> Add Item</>}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary px-4">
              Cancel
            </button>
          </div>
        </form>
      </div>

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

export default function ProjectGallery() {
  const [items, setItems] = useState<ProjectGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editing, setEditing] = useState<ProjectGalleryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectGalleryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await getGalleryItems();
      setItems([...data].sort((a, b) => a.sort_order - b.sort_order));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSaved = () => {
    setShowDrawer(false);
    setEditing(null);
    fetchItems();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteGalleryItem(deleteTarget.id);
      setDeleteTarget(null);
      await fetchItems();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <LayoutGrid size={22} className="text-gold-400" />
          <div>
            <h1 className="text-2xl font-bold text-cream-100">Project Gallery</h1>
            <p className="text-dark-400 text-sm">
              Images shown in the Project Gallery section on your storefront homepage.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchItems} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => { setEditing(null); setShowDrawer(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Add Item
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <LayoutGrid size={40} className="text-dark-600" />
          <p className="text-dark-400 text-sm">No gallery items yet. Add your first project photo.</p>
          <button onClick={() => { setEditing(null); setShowDrawer(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Add Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((g) => (
            <div key={g.id} className="card space-y-3">
              <div className="relative overflow-hidden rounded-lg bg-dark-800 aspect-square">
                <img src={g.image_url} alt={g.caption ?? ''} className="w-full h-full object-cover" />
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-cream-100 font-semibold text-sm truncate">{g.caption || 'Untitled'}</p>
                  {g.owner_name && (
                    <p className="text-dark-400 text-xs mt-0.5 truncate flex items-center gap-1">
                      {g.owner_name}
                      {null != g.rating && <span className="text-gold-400 flex items-center gap-0.5"><Star size={10} className="fill-gold-400" />{g.rating}</span>}
                    </p>
                  )}
                  {g.link_url && <p className="text-dark-400 text-xs mt-0.5 truncate">{g.link_url}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${
                  g.is_active ? 'bg-green-900/30 text-green-300 border-green-700/30' : 'bg-dark-700 text-dark-300 border-dark-600'
                }`}>
                  {g.is_active ? 'Active' : 'Hidden'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-dark-500">
                <span>Order: {g.sort_order}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => { setEditing(g); setShowDrawer(true); }} className="flex items-center gap-1 text-dark-400 hover:text-cream-200 transition-colors">
                    <Pencil size={13} /> Edit
                  </button>
                  <button onClick={() => setDeleteTarget(g)} className="flex items-center gap-1 text-dark-400 hover:text-red-400 transition-colors">
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDrawer && (
        <GalleryDrawer
          editing={editing}
          onClose={() => { setShowDrawer(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/70 backdrop-blur-sm">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-cream-100 font-bold">Delete Item?</h3>
                <p className="text-dark-400 text-sm mt-0.5">"{deleteTarget.caption || 'This image'}" will be permanently removed from the homepage.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {deleting
                  ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting…</>
                  : 'Yes, Delete'}
              </button>
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary px-5 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
