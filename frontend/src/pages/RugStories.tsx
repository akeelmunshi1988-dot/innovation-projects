import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  ScrollText, Plus, Pencil, Trash2, X, AlertTriangle, Upload, RefreshCw,
  ArrowUp, ArrowDown, Film, Image as ImageIcon, ExternalLink,
} from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';
import { getCatalog, getStories, createStory, updateStory, deleteStory } from '../services/api';
import type { RugCatalog, RugStory, RugStoryMedia } from '../types';

type FormData = {
  title: string;
  slug: string;
  inspiration: string;
  body_html: string;
  cover_image_url: string;
  media: RugStoryMedia[];
  rug_id: string;
  sort_order: string;
  is_published: boolean;
};

const BLANK: FormData = {
  title: '', slug: '', inspiration: '', body_html: '', cover_image_url: '', media: [], rug_id: '', sort_order: '0', is_published: true,
};

function storyToForm(s: RugStory): FormData {
  return {
    title: s.title,
    slug: s.slug,
    inspiration: s.inspiration ?? '',
    body_html: s.body_html ?? '',
    cover_image_url: s.cover_image_url ?? '',
    media: s.media ?? [],
    rug_id: s.rug_id != null ? String(s.rug_id) : '',
    sort_order: String(s.sort_order),
    is_published: s.is_published,
  };
}

const inputCls = 'w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60';
const labelCls = 'text-cream-300 text-xs font-semibold uppercase tracking-wider';
const MAX_MEDIA = 40;

interface DrawerProps {
  editing: RugStory | null;
  rugs: RugCatalog[];
  onClose: () => void;
  onSaved: () => void;
}

function StoryDrawer({ editing, rugs, onClose, onSaved }: DrawerProps) {
  const [form, setForm] = useState<FormData>(editing ? storyToForm(editing) : BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<'image' | 'video' | null>(null);
  const [mediaError, setMediaError] = useState('');
  const coverRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormData>(field: K, value: FormData[K]) => setForm((f) => ({ ...f, [field]: value }));

  const upload = async (file: File, kind: 'image' | 'video') => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await axios.post<{ url: string; poster_url?: string | null }>(`/api/stories/upload-${kind}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  };

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    setError('');
    try {
      const { url } = await upload(file, 'image');
      set('cover_image_url', url);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Cover upload failed.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleMediaUpload = async (files: File[], kind: 'image' | 'video') => {
    if (files.length === 0) return;
    setUploadingMedia(kind);
    setMediaError('');
    const failures: string[] = [];
    for (const file of files) {
      if (form.media.length >= MAX_MEDIA) { failures.push(`${file.name}: limit of ${MAX_MEDIA} photos/videos reached`); continue; }
      try {
        const data = await upload(file, kind);
        const item: RugStoryMedia = { type: kind, url: data.url, poster_url: data.poster_url ?? null, caption: null };
        setForm((f) => ({ ...f, media: [...f.media, item] }));
      } catch (err: any) {
        failures.push(`${file.name}: ${err.response?.data?.detail ?? 'upload failed'}`);
      }
    }
    if (failures.length > 0) setMediaError(failures.join(' · '));
    setUploadingMedia(null);
  };

  const updateMedia = (index: number, patch: Partial<RugStoryMedia>) =>
    setForm((f) => ({ ...f, media: f.media.map((m, i) => (i === index ? { ...m, ...patch } : m)) }));

  const moveMedia = (index: number, direction: -1 | 1) =>
    setForm((f) => {
      const target = index + direction;
      if (target < 0 || target >= f.media.length) return f;
      const media = [...f.media];
      [media[index], media[target]] = [media[target], media[index]];
      return { ...f, media };
    });

  const removeMedia = (index: number) => setForm((f) => ({ ...f, media: f.media.filter((_, i) => i !== index) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Give the story a title.'); return; }
    setSaving(true);
    setError('');
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || null,
      inspiration: form.inspiration.trim() || null,
      // Tiptap leaves "<p></p>" behind when the editor is cleared.
      body_html: form.body_html.replace(/<p><\/p>/g, '').trim() ? form.body_html : null,
      cover_image_url: form.cover_image_url || null,
      media: form.media.map((m) => ({ ...m, caption: m.caption?.trim() || null })),
      rug_id: form.rug_id ? parseInt(form.rug_id) : null,
      sort_order: parseInt(form.sort_order) || 0,
      is_published: form.is_published,
    };
    try {
      if (editing) await updateStory(editing.id, payload as Partial<RugStory>);
      else await createStory(payload as Partial<RugStory>);
      onSaved();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((d: any) => d.msg).join(' · ') : 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || uploadingCover || uploadingMedia !== null;

  return (
    <>
      <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-2xl bg-dark-900 border-l border-dark-700 z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700 flex-shrink-0">
          <h2 className="text-cream-100 font-bold text-base">{editing ? 'Edit Story' : 'New Design Story'}</h2>
          <button onClick={onClose} className="text-dark-500 hover:text-cream-300 transition-colors p-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div className="space-y-1">
            <label className={labelCls}>Design name *</label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. The World Map Rug" className={inputCls} />
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Page address</label>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-dark-500 flex-shrink-0">/stories/</span>
              <input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="generated from the name" className={inputCls} />
            </div>
            <p className="text-dark-500 text-xs">Leave empty to build it from the name. Changing it later breaks links already shared.</p>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Inspiration</label>
            <input
              value={form.inspiration}
              onChange={(e) => set('inspiration', e.target.value)}
              maxLength={300}
              placeholder="e.g. Inspired by 17th-century sea charts and the spice routes"
              className={inputCls}
            />
            <p className="text-dark-500 text-xs">One line, shown under the title and on the stories listing.</p>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Linked catalog rug (optional)</label>
            <select value={form.rug_id} onChange={(e) => set('rug_id', e.target.value)} className={inputCls}>
              <option value="">— None —</option>
              {rugs.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <p className="text-dark-500 text-xs">The story page links to this rug, and the rug's page links back to the story.</p>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Cover image</label>
            {form.cover_image_url && (
              <div className="relative">
                <img src={form.cover_image_url} alt="Cover preview" className="w-full h-48 object-cover rounded-lg bg-dark-800" />
                <button type="button" onClick={() => set('cover_image_url', '')} className="absolute top-2 right-2 p-1 rounded-lg bg-dark-900/80 text-red-400 hover:text-red-300" title="Remove cover">
                  <Trash2 size={13} />
                </button>
              </div>
            )}
            <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = ''; }} />
            <button type="button" onClick={() => coverRef.current?.click()} disabled={uploadingCover}
              className="btn-secondary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50">
              {uploadingCover
                ? <><div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" /> Uploading…</>
                : <><Upload size={14} /> {form.cover_image_url ? 'Replace cover' : 'Upload cover (JPEG/PNG/WebP, max 20MB)'}</>}
            </button>
            <p className="text-dark-500 text-xs">Shown large at the top of the story page. Falls back to the linked rug's photo.</p>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>The story</label>
            <RichTextEditor
              value={form.body_html}
              onChange={(html) => set('body_html', html)}
              placeholder="Where did the idea come from? What did the artisans have to solve? How long did it take on the loom?"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className={labelCls}>Photos &amp; videos</label>
              <div className="flex items-center gap-2">
                {(['image', 'video'] as const).map((kind) => (
                  <label key={kind} className={`flex items-center gap-1.5 px-2.5 py-1 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg text-dark-300 hover:text-cream-200 text-xs cursor-pointer transition-colors ${uploadingMedia ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploadingMedia === kind
                      ? <div className="w-3 h-3 border border-gold-500/40 border-t-gold-500 rounded-full animate-spin" />
                      : kind === 'image' ? <ImageIcon size={12} /> : <Film size={12} />}
                    {kind === 'image' ? 'Add photos' : 'Add video'}
                    <input
                      type="file"
                      multiple={kind === 'image'}
                      accept={kind === 'image' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/webm,video/quicktime'}
                      className="hidden"
                      disabled={uploadingMedia !== null}
                      onChange={(e) => { const files = Array.from(e.target.files ?? []); handleMediaUpload(files, kind); e.target.value = ''; }}
                    />
                  </label>
                ))}
              </div>
            </div>
            <p className="text-dark-500 text-xs">Sketches, inspiration references, work-in-progress and finished shots. Videos: MP4/WebM/MOV, max 50MB. Shown in this order.</p>
            {mediaError && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg p-2">
                <AlertTriangle size={12} /> {mediaError}
              </div>
            )}
            {form.media.length > 0 && (
              <div className="space-y-2">
                {form.media.map((m, i) => (
                  <div key={`${m.url}-${i}`} className="flex gap-3 items-start bg-dark-800/60 border border-dark-700 rounded-lg p-2">
                    <div className="w-24 h-20 flex-shrink-0 rounded-md overflow-hidden bg-dark-800 relative">
                      {m.type === 'image'
                        ? <img src={m.url} alt="" className="w-full h-full object-cover" />
                        : <video src={m.url} poster={m.poster_url ?? undefined} muted preload="metadata" className="w-full h-full object-cover" />}
                      {m.type === 'video' && <Film size={14} className="absolute bottom-1 left-1 text-white drop-shadow" />}
                    </div>
                    <input
                      value={m.caption ?? ''}
                      onChange={(e) => updateMedia(i, { caption: e.target.value })}
                      maxLength={300}
                      placeholder="Caption (optional)"
                      className={`${inputCls} flex-1`}
                    />
                    <div className="flex flex-col gap-1">
                      <button type="button" onClick={() => moveMedia(i, -1)} disabled={i === 0} className="p-1 rounded text-dark-300 hover:text-gold-400 disabled:opacity-30" title="Move earlier"><ArrowUp size={13} /></button>
                      <button type="button" onClick={() => moveMedia(i, 1)} disabled={i === form.media.length - 1} className="p-1 rounded text-dark-300 hover:text-gold-400 disabled:opacity-30" title="Move later"><ArrowDown size={13} /></button>
                      <button type="button" onClick={() => removeMedia(i)} className="p-1 rounded text-red-400 hover:text-red-300" title="Remove"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <label className={labelCls}>Order</label>
              <input value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} type="number" min="0" className={inputCls} />
            </div>
            <div className="flex items-center gap-3 pb-2">
              <button type="button" onClick={() => set('is_published', !form.is_published)} className="relative flex-shrink-0" aria-label="Toggle published">
                <div className={`w-10 h-5 rounded-full transition-colors ${form.is_published ? 'bg-gold-600' : 'bg-dark-700'}`} />
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_published ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-cream-300 text-sm">{form.is_published ? 'Published' : 'Draft'}</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-600/30 rounded-lg p-3 text-red-400 text-sm">
              <AlertTriangle size={13} className="flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={busy} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                : editing ? 'Save Changes' : <><Plus size={15} /> Create Story</>}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary px-4">Cancel</button>
          </div>
        </form>
      </div>
    </>
  );
}

export default function RugStories() {
  const [stories, setStories] = useState<RugStory[]>([]);
  const [rugs, setRugs] = useState<RugCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editing, setEditing] = useState<RugStory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RugStory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStories = async () => {
    setLoading(true);
    try {
      setStories(await getStories());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
    getCatalog().then((data) => setRugs([...data].sort((a, b) => a.name.localeCompare(b.name)))).catch(() => {});
  }, []);

  const openNew = () => { setEditing(null); setShowDrawer(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStory(deleteTarget.id);
      setDeleteTarget(null);
      await fetchStories();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ScrollText size={22} className="text-gold-400" />
          <div>
            <h1 className="text-2xl font-bold text-cream-100">Design Stories</h1>
            <p className="text-dark-400 text-sm">
              The story behind each unique design — its inspiration, photos and videos — each on its own page at /stories.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchStories} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> New Story
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <ScrollText size={40} className="text-dark-600" />
          <p className="text-dark-400 text-sm">No stories yet. Write the story behind your first unique design.</p>
          <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> New Story
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {stories.map((s) => {
            const cover = s.cover_image_url || s.rug?.image_url;
            const videos = s.media.filter((m) => m.type === 'video').length;
            const photos = s.media.length - videos;
            return (
              <div key={s.id} className="card space-y-3">
                <div className="relative overflow-hidden rounded-lg bg-dark-800 aspect-[4/3] flex items-center justify-center">
                  {cover ? <img src={cover} alt={s.title} className="w-full h-full object-cover" /> : <ScrollText size={28} className="text-dark-600" />}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-cream-100 font-semibold text-sm truncate">{s.title}</p>
                    {s.inspiration && <p className="text-dark-400 text-xs mt-0.5 line-clamp-2">{s.inspiration}</p>}
                    <p className="text-dark-500 text-xs mt-1">
                      {photos} photo{photos === 1 ? '' : 's'} · {videos} video{videos === 1 ? '' : 's'}
                      {s.rug && <> · linked to {s.rug.name}</>}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${
                    s.is_published ? 'bg-green-900/30 text-green-300 border-green-700/30' : 'bg-dark-700 text-dark-300 border-dark-600'
                  }`}>
                    {s.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-dark-500">
                  <span>Order: {s.sort_order}</span>
                  <div className="flex items-center gap-3">
                    {s.is_published && (
                      <a href={`/stories/${s.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-dark-400 hover:text-cream-200 transition-colors">
                        <ExternalLink size={13} /> View
                      </a>
                    )}
                    <button onClick={() => { setEditing(s); setShowDrawer(true); }} className="flex items-center gap-1 text-dark-400 hover:text-cream-200 transition-colors">
                      <Pencil size={13} /> Edit
                    </button>
                    <button onClick={() => setDeleteTarget(s)} className="flex items-center gap-1 text-dark-400 hover:text-red-400 transition-colors">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showDrawer && (
        <StoryDrawer
          editing={editing}
          rugs={rugs}
          onClose={() => { setShowDrawer(false); setEditing(null); }}
          onSaved={() => { setShowDrawer(false); setEditing(null); fetchStories(); }}
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
                <h3 className="text-cream-100 font-bold">Delete Story?</h3>
                <p className="text-dark-400 text-sm mt-0.5">"{deleteTarget.title}" and its page at /stories/{deleteTarget.slug} will be removed.</p>
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
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary px-5 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
