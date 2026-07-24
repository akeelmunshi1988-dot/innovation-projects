import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Film, Plus, Pencil, Trash2, X, AlertTriangle, Upload, RefreshCw } from 'lucide-react';
import { getShowcaseVideos, createShowcaseVideo, updateShowcaseVideo, deleteShowcaseVideo } from '../services/api';
import type { ShowcaseVideo } from '../types';

type FormData = {
  title: string;
  description: string;
  video_url: string;
  poster_url: string;
  sort_order: string;
  is_active: boolean;
  is_intro: boolean;
};

function blankForm(isIntro: boolean): FormData {
  return { title: '', description: '', video_url: '', poster_url: '', sort_order: '0', is_active: true, is_intro: isIntro };
}

function videoToForm(v: ShowcaseVideo): FormData {
  return {
    title: v.title,
    description: v.description ?? '',
    video_url: v.video_url,
    poster_url: v.poster_url ?? '',
    sort_order: String(v.sort_order),
    is_active: v.is_active,
    is_intro: v.is_intro,
  };
}

interface DrawerProps {
  editing: ShowcaseVideo | null;
  defaultIsIntro: boolean;
  onClose: () => void;
  onSaved: (video: ShowcaseVideo) => void;
}

function VideoDrawer({ editing, defaultIsIntro, onClose, onSaved }: DrawerProps) {
  const [form, setForm] = useState<FormData>(editing ? videoToForm(editing) : blankForm(defaultIsIntro));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const posterFileRef = useRef<HTMLInputElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => firstRef.current?.focus(), 50); }, []);

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleVideoUpload = async (file: File) => {
    setUploadingVideo(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await axios.post<{ url: string; poster_url: string | null }>('/api/showcase-videos/upload-video', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set('video_url', data.url);
      if (data.poster_url) set('poster_url', data.poster_url);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Video upload failed.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handlePosterUpload = async (file: File) => {
    setUploadingPoster(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await axios.post<{ url: string }>('/api/showcase-videos/upload-poster', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set('poster_url', data.url);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Poster upload failed.');
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.video_url) { setError('Upload a video before saving.'); return; }
    setSaving(true);
    setError('');
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      video_url: form.video_url,
      poster_url: form.poster_url || null,
      sort_order: parseInt(form.sort_order) || 0,
      is_active: form.is_active,
      is_intro: form.is_intro,
    };
    try {
      const saved = editing
        ? await updateShowcaseVideo(editing.id, payload)
        : await createShowcaseVideo(payload);
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
          <div>
            <h2 className="text-cream-100 font-bold text-base">
              {editing ? 'Edit Showcase Video' : 'Add Showcase Video'}
            </h2>
            <p className="text-dark-500 text-xs mt-0.5">
              {form.is_intro ? 'Introductory Video (rotating homepage hero)' : 'Behind the Craft (homepage hover grid)'}
            </p>
          </div>
          <button onClick={onClose} className="text-dark-500 hover:text-cream-300 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Section</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set('is_intro', true)}
                className={`px-3 py-2.5 rounded-lg border-2 text-left transition-all ${
                  form.is_intro
                    ? 'border-gold-500 bg-gold-600/10 text-cream-100'
                    : 'border-dark-700 bg-dark-800 text-dark-300 hover:border-dark-500 hover:text-cream-300'
                }`}
              >
                <p className="text-sm font-semibold leading-none">Introductory</p>
                <p className="text-xs text-dark-400 mt-1">Rotating homepage hero</p>
              </button>
              <button
                type="button"
                onClick={() => set('is_intro', false)}
                className={`px-3 py-2.5 rounded-lg border-2 text-left transition-all ${
                  !form.is_intro
                    ? 'border-gold-500 bg-gold-600/10 text-cream-100'
                    : 'border-dark-700 bg-dark-800 text-dark-300 hover:border-dark-500 hover:text-cream-300'
                }`}
              >
                <p className="text-sm font-semibold leading-none">Behind the Craft</p>
                <p className="text-xs text-dark-400 mt-1">Homepage hover grid</p>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Title *</label>
            <input
              ref={firstRef}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
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
              placeholder="Short caption shown over the video…"
              rows={2}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60 resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Video *</label>
            {form.video_url && (
              <video src={form.video_url} muted loop className="w-full h-40 object-cover rounded-lg bg-dark-800 mb-2" />
            )}
            <input
              ref={videoFileRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => videoFileRef.current?.click()}
              disabled={uploadingVideo}
              className="btn-secondary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {uploadingVideo
                ? <><div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" /> Uploading…</>
                : <><Upload size={14} /> {form.video_url ? 'Replace video' : 'Upload video (MP4/WebM, max 50MB)'}</>}
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Poster Image (optional)</label>
            <p className="text-dark-500 text-xs -mt-0.5">Auto-generated from the video — upload your own to override it.</p>
            {form.poster_url && (
              <img src={form.poster_url} alt="Poster" className="w-full h-40 object-cover rounded-lg bg-dark-800 mb-2" />
            )}
            <input
              ref={posterFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handlePosterUpload(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => posterFileRef.current?.click()}
              disabled={uploadingPoster}
              className="btn-secondary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {uploadingPoster
                ? <><div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" /> Uploading…</>
                : <><Upload size={14} /> {form.poster_url ? 'Replace poster' : 'Upload poster (shown before video plays)'}</>}
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
              <p className="text-dark-500 text-xs">Controls play order within its section (lowest first).</p>
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
              disabled={saving || uploadingVideo || uploadingPoster}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                : editing ? 'Save Changes' : <><Plus size={15} /> Add Video</>}
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

function VideoCard({ v, onEdit, onDelete }: { v: ShowcaseVideo; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="card space-y-3">
      <div className="relative overflow-hidden rounded-lg bg-dark-800 aspect-video">
        {v.poster_url ? (
          <img src={v.poster_url} alt={v.title} className="w-full h-full object-cover" />
        ) : (
          <video src={v.video_url} muted className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-cream-100 font-semibold text-sm truncate">{v.title}</p>
          {v.description && <p className="text-dark-400 text-xs mt-0.5 line-clamp-2">{v.description}</p>}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${
          v.is_active ? 'bg-green-900/30 text-green-300 border-green-700/30' : 'bg-dark-700 text-dark-300 border-dark-600'
        }`}>
          {v.is_active ? 'Active' : 'Hidden'}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-dark-500">
        <span>Order: {v.sort_order}</span>
        <div className="flex items-center gap-3">
          <button onClick={onEdit} className="flex items-center gap-1 text-dark-400 hover:text-cream-200 transition-colors">
            <Pencil size={13} /> Edit
          </button>
          <button onClick={onDelete} className="flex items-center gap-1 text-dark-400 hover:text-red-400 transition-colors">
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoSection({
  title, hint, videos, loading, onAdd, onEdit, onDelete,
}: {
  title: string;
  hint: string;
  videos: ShowcaseVideo[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (v: ShowcaseVideo) => void;
  onDelete: (v: ShowcaseVideo) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-cream-100 font-bold text-lg">{title}</h2>
          <p className="text-dark-400 text-sm">{hint}</p>
        </div>
        <button onClick={onAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={14} /> Add Video
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 border border-dashed border-dark-700 rounded-xl">
          <Film size={28} className="text-dark-600" />
          <p className="text-dark-400 text-sm">No videos in this section yet.</p>
          <button onClick={onAdd} className="btn-secondary flex items-center gap-2 text-sm">
            <Plus size={14} /> Add Video
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {videos.map((v) => (
            <VideoCard key={v.id} v={v} onEdit={() => onEdit(v)} onDelete={() => onDelete(v)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ShowcaseVideos() {
  const [videos, setVideos] = useState<ShowcaseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editing, setEditing] = useState<ShowcaseVideo | null>(null);
  const [newVideoIsIntro, setNewVideoIsIntro] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShowcaseVideo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const data = await getShowcaseVideos();
      setVideos([...data].sort((a, b) => a.sort_order - b.sort_order));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVideos(); }, []);

  const handleSaved = () => {
    setShowDrawer(false);
    setEditing(null);
    fetchVideos();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteShowcaseVideo(deleteTarget.id);
      setDeleteTarget(null);
      await fetchVideos();
    } finally {
      setDeleting(false);
    }
  };

  const openAdd = (isIntro: boolean) => {
    setEditing(null);
    setNewVideoIsIntro(isIntro);
    setShowDrawer(true);
  };

  const openEdit = (v: ShowcaseVideo) => {
    setEditing(v);
    setShowDrawer(true);
  };

  const introVideos = videos.filter((v) => v.is_intro);
  const craftVideos = videos.filter((v) => !v.is_intro);

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Film size={22} className="text-gold-400" />
          <div>
            <h1 className="text-2xl font-bold text-cream-100">Homepage Videos</h1>
            <p className="text-dark-400 text-sm">Craft videos shown on your storefront homepage.</p>
          </div>
        </div>
        <button onClick={fetchVideos} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <VideoSection
        title="Introductory Videos"
        hint="Rotate one after another in the homepage hero — all active videos here play in sequence, in Order."
        videos={introVideos}
        loading={loading}
        onAdd={() => openAdd(true)}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <VideoSection
        title="Behind the Craft Videos"
        hint="Shown in the homepage hover grid, below the intro section."
        videos={craftVideos}
        loading={loading}
        onAdd={() => openAdd(false)}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      {showDrawer && (
        <VideoDrawer
          editing={editing}
          defaultIsIntro={newVideoIsIntro}
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
                <h3 className="text-cream-100 font-bold">Delete Video?</h3>
                <p className="text-dark-400 text-sm mt-0.5">"{deleteTarget.title}" will be permanently removed from the homepage.</p>
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
