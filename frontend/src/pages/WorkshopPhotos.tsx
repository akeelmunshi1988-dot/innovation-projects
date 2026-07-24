import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Image as ImageIcon, Plus, Pencil, Trash2, X, AlertTriangle, Upload, RefreshCw } from 'lucide-react';
import { getWorkshopPhotos, createWorkshopPhoto, updateWorkshopPhoto, deleteWorkshopPhoto } from '../services/api';
import type { WorkshopPhoto } from '../types';

type FormData = {
  caption: string;
  description: string;
  image_url: string;
  sort_order: string;
  is_active: boolean;
};

const BLANK: FormData = {
  caption: '', description: '', image_url: '', sort_order: '0', is_active: true,
};

function photoToForm(p: WorkshopPhoto): FormData {
  return {
    caption: p.caption,
    description: p.description ?? '',
    image_url: p.image_url,
    sort_order: String(p.sort_order),
    is_active: p.is_active,
  };
}

interface DrawerProps {
  editing: WorkshopPhoto | null;
  onClose: () => void;
  onSaved: (photo: WorkshopPhoto) => void;
}

function PhotoDrawer({ editing, onClose, onSaved }: DrawerProps) {
  const [form, setForm] = useState<FormData>(editing ? photoToForm(editing) : BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => firstRef.current?.focus(), 50); }, []);

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await axios.post<{ url: string }>('/api/workshop-photos/upload-image', fd, {
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
      caption: form.caption.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url,
      sort_order: parseInt(form.sort_order) || 0,
      is_active: form.is_active,
    };
    try {
      const saved = editing
        ? await updateWorkshopPhoto(editing.id, payload)
        : await createWorkshopPhoto(payload);
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
            {editing ? 'Edit Workshop Photo' : 'Add Workshop Photo'}
          </h2>
          <button onClick={onClose} className="text-dark-500 hover:text-cream-300 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Caption *</label>
            <input
              ref={firstRef}
              value={form.caption}
              onChange={(e) => set('caption', e.target.value)}
              placeholder="e.g. Hand-Knotting"
              required
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60"
            />
          </div>

          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Short caption shown over the photo…"
              rows={2}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60 resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Photo *</label>
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
                : <><Upload size={14} /> {form.image_url ? 'Replace photo' : 'Upload photo (JPEG/PNG/WebP, max 20MB)'}</>}
            </button>
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
              <p className="text-dark-500 text-xs">Controls display order (lowest first).</p>
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
                : editing ? 'Save Changes' : <><Plus size={15} /> Add Photo</>}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary px-4">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default function WorkshopPhotos() {
  const [photos, setPhotos] = useState<WorkshopPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editing, setEditing] = useState<WorkshopPhoto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkshopPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const data = await getWorkshopPhotos();
      setPhotos([...data].sort((a, b) => a.sort_order - b.sort_order));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPhotos(); }, []);

  const handleSaved = () => {
    setShowDrawer(false);
    setEditing(null);
    fetchPhotos();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteWorkshopPhoto(deleteTarget.id);
      setDeleteTarget(null);
      await fetchPhotos();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ImageIcon size={22} className="text-gold-400" />
          <div>
            <h1 className="text-2xl font-bold text-cream-100">Workshop Photos</h1>
            <p className="text-dark-400 text-sm">
              Photos shown in the "Inside the Workshop" gallery on your storefront homepage.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchPhotos} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => { setEditing(null); setShowDrawer(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Add Photo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <ImageIcon size={40} className="text-dark-600" />
          <p className="text-dark-400 text-sm">No workshop photos yet. Add your first photo to bring "Inside the Workshop" to life.</p>
          <button onClick={() => { setEditing(null); setShowDrawer(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Add Photo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {photos.map((p) => (
            <div key={p.id} className="card space-y-3">
              <div className="relative overflow-hidden rounded-lg bg-dark-800 aspect-[4/3]">
                <img src={p.image_url} alt={p.caption} className="w-full h-full object-cover" />
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-cream-100 font-semibold text-sm truncate">{p.caption}</p>
                  {p.description && <p className="text-dark-400 text-xs mt-0.5 line-clamp-2">{p.description}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${
                  p.is_active ? 'bg-green-900/30 text-green-300 border-green-700/30' : 'bg-dark-700 text-dark-300 border-dark-600'
                }`}>
                  {p.is_active ? 'Active' : 'Hidden'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-dark-500">
                <span>Order: {p.sort_order}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => { setEditing(p); setShowDrawer(true); }} className="flex items-center gap-1 text-dark-400 hover:text-cream-200 transition-colors">
                    <Pencil size={13} /> Edit
                  </button>
                  <button onClick={() => setDeleteTarget(p)} className="flex items-center gap-1 text-dark-400 hover:text-red-400 transition-colors">
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDrawer && (
        <PhotoDrawer
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
                <h3 className="text-cream-100 font-bold">Delete Photo?</h3>
                <p className="text-dark-400 text-sm mt-0.5">"{deleteTarget.caption}" will be permanently removed from the homepage.</p>
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
