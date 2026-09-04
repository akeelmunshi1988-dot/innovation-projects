import { useEffect, useState } from 'react';
import axios from 'axios';
import { ImagePlus, RefreshCw, Save, Trash2, Upload } from 'lucide-react';

interface PageImage {
  id: number;
  title: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

export default function CustomRugPageImages() {
  const [images, setImages] = useState<PageImage[]>([]);
  const [draft, setDraft] = useState({ title: '', image_url: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | 'new' | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get<PageImage[]>('/api/custom-rug-page-images');
      setImages(data);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Could not load grid images.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const upload = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await axios.post<{ url: string }>('/api/custom-rug-page-images/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url;
  };

  const uploadDraft = async (file: File) => {
    setBusy('new'); setMessage('');
    try {
      const url = await upload(file);
      setDraft(current => ({ ...current, image_url: url }));
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Image upload failed.');
    } finally {
      setBusy(null);
    }
  };

  const add = async () => {
    if (!draft.title.trim() || !draft.image_url) return;
    setBusy('new'); setMessage('');
    try {
      await axios.post('/api/custom-rug-page-images', {
        title: draft.title.trim(), image_url: draft.image_url, sort_order: images.length, is_active: true,
      });
      setDraft({ title: '', image_url: '' });
      await load();
      setMessage('Grid image added.');
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Could not add the grid image.');
    } finally {
      setBusy(null);
    }
  };

  const patchLocal = (id: number, patch: Partial<PageImage>) => setImages(current => current.map(image => image.id === id ? { ...image, ...patch } : image));

  const replace = async (id: number, file: File) => {
    setBusy(id); setMessage('');
    try {
      patchLocal(id, { image_url: await upload(file) });
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Image upload failed.');
    } finally {
      setBusy(null);
    }
  };

  const save = async (image: PageImage) => {
    if (!image.title.trim()) return;
    setBusy(image.id); setMessage('');
    try {
      await axios.put(`/api/custom-rug-page-images/${image.id}`, { ...image, title: image.title.trim() });
      await load();
      setMessage('Changes saved.');
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Could not save changes.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (image: PageImage) => {
    if (!window.confirm(`Delete “${image.title}”?`)) return;
    setBusy(image.id); setMessage('');
    try {
      await axios.delete(`/api/custom-rug-page-images/${image.id}`);
      await load();
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Could not delete the image.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs uppercase tracking-widest text-gold-500">Customize Your Rug</p><h1 className="flex items-center gap-2 text-2xl font-semibold text-cream-100"><ImagePlus size={22} /> Page Grid Images</h1><p className="mt-2 text-sm text-dark-400">Manage titled images shown above the custom rug request form. Maximum 10 images.</p></div>
        <button type="button" onClick={load} className="btn-secondary flex items-center gap-2 text-sm"><RefreshCw size={14} /> Refresh</button>
      </div>

      {message && <div className="rounded-lg border border-dark-700 bg-dark-900 px-4 py-3 text-sm text-cream-300">{message}</div>}

      <section className="grid gap-5 rounded-xl border border-dark-700 bg-dark-900 p-5 md:grid-cols-[180px_1fr_auto] md:items-end">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-dark-800">
          {draft.image_url ? <img src={draft.image_url} alt="New grid preview" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-dark-500"><ImagePlus size={30} /></div>}
        </div>
        <div className="space-y-3">
          <label className="block space-y-1"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Title *</span><input value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} maxLength={150} placeholder="e.g. Design Consultation" className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-cream-100 placeholder-dark-500 focus:border-gold-600 focus:outline-none" /></label>
          <label className="btn-secondary inline-flex cursor-pointer items-center gap-2 text-sm"><Upload size={14} /> {draft.image_url ? 'Replace image' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy !== null} onChange={event => { const file = event.target.files?.[0]; if (file) uploadDraft(file); event.target.value = ''; }} /></label>
        </div>
        <button type="button" onClick={add} disabled={busy !== null || images.length >= 10 || !draft.title.trim() || !draft.image_url} className="btn-primary disabled:opacity-40">{images.length >= 10 ? 'Limit reached' : 'Add image'}</button>
      </section>

      {loading ? <div className="py-20 text-center text-dark-400">Loading images…</div> : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {images.map(image => (
            <article key={image.id} className="space-y-4 rounded-xl border border-dark-700 bg-dark-900 p-4">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-dark-800"><img src={image.image_url} alt={image.title} className="h-full w-full object-cover" /><label className="absolute bottom-3 right-3 cursor-pointer rounded-lg bg-dark-950/85 p-2 text-white backdrop-blur" title="Replace image"><Upload size={15} /><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy !== null} onChange={event => { const file = event.target.files?.[0]; if (file) replace(image.id, file); event.target.value = ''; }} /></label></div>
              <label className="block space-y-1"><span className="text-xs uppercase tracking-wider text-dark-400">Title</span><input value={image.title} onChange={event => patchLocal(image.id, { title: event.target.value })} maxLength={150} className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-cream-100 focus:border-gold-600 focus:outline-none" /></label>
              <div className="grid grid-cols-2 gap-3"><label className="space-y-1"><span className="block text-xs uppercase tracking-wider text-dark-400">Order</span><input type="number" min="0" value={image.sort_order} onChange={event => patchLocal(image.id, { sort_order: Number(event.target.value) })} className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-cream-100 focus:outline-none" /></label><label className="flex items-end gap-2 pb-2 text-sm text-cream-300"><input type="checkbox" checked={image.is_active} onChange={event => patchLocal(image.id, { is_active: event.target.checked })} className="accent-gold-600" /> Visible</label></div>
              <div className="flex gap-2"><button type="button" onClick={() => save(image)} disabled={busy !== null || !image.title.trim()} className="btn-primary flex flex-1 items-center justify-center gap-2 text-sm disabled:opacity-40"><Save size={14} /> Save</button><button type="button" onClick={() => remove(image)} disabled={busy !== null} className="rounded-lg border border-red-900/70 px-3 text-red-400 hover:bg-red-950/30 disabled:opacity-40"><Trash2 size={15} /></button></div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
