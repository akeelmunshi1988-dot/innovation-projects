import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import CollectionImageGrid, { type CollectionDisplay, type CollectionImage } from '../components/CollectionImageGrid';

interface Category { key: string; label: string; href: string }
const emptyDisplay = (): CollectionDisplay => ({ enabled: true, images: Array.from({ length: 3 }, () => ({ image_url: '', caption: '' })) });
const errorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (error.response?.status === 413) return 'Image is too large for the server. Choose a smaller file.';
    if (error.response?.status === 500) return 'The server could not save this image. Check the catalog upload folder permissions.';
  }
  return 'Could not save or load images. Please try again.';
};

export default function CatalogDisplayImages() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState('default');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['default']);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [display, setDisplay] = useState<CollectionDisplay>(emptyDisplay);
  const [loadedCategory, setLoadedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get<Category[]>('/api/catalog-display-categories')
      .then(({ data }) => setCategories(data))
      .catch(error => setMessage(errorMessage(error)));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setMessage(''); setDirty(false);
    axios.get<CollectionDisplay>('/api/catalog-display', { params: { category }, signal: controller.signal })
      .then(({ data }) => { setDisplay(data); setLoadedCategory(category); })
      .catch(error => { if (!controller.signal.aborted) setMessage(errorMessage(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [category]);

  const patch = (index: number, change: Partial<CollectionImage>) => {
    setDisplay(current => ({ ...current, images: current.images.map((image, i) => i === index ? { ...image, ...change } : image) }));
    setDirty(true); setMessage('');
  };
  const selected = categories.find(item => item.key === category);

  const upload = async (index: number, file: File) => {
    if (file.size > 20 * 1024 * 1024) { setMessage('Choose an image smaller than 20 MB.'); return; }
    setBusy(true); setMessage('');
    try {
      const form = new FormData(); form.append('file', file);
      const { data } = await axios.post<{ url: string }>('/api/catalog/upload-image', form);
      patch(index, { image_url: data.url });
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  };

  const save = async () => {
    setBusy(true); setMessage('');
    try {
      await axios.put('/api/catalog-displays', { ...display, enabled: true, categories: selectedCategories });
      setDirty(false); setMessage(`Display images saved to ${selectedCategories.length} ${selectedCategories.length === 1 ? 'collection' : 'collections'}.`);
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold text-cream-100">Catalog display images</h1><p className="mt-2 text-sm text-dark-400">Choose display photos for each collection landing page. All rugs supplies the default images; individual categories can override them.</p></div>
      <div className="relative max-w-2xl space-y-2">
        <p id="display-category-label" className="text-sm text-cream-300">Categories</p>
        <button type="button" className="input-field flex w-full items-center justify-between text-left" aria-labelledby="display-category-label" aria-expanded={categoryMenuOpen} disabled={busy} onClick={() => setCategoryMenuOpen(open => !open)}>
          <span>{selectedCategories.length === categories.length && categories.length > 0 ? 'All collections' : selectedCategories.length === 1 ? categories.find(item => item.key === selectedCategories[0])?.label || 'All rugs (default)' : `${selectedCategories.length} collections selected`}</span><span aria-hidden="true">▾</span>
        </button>
        {categoryMenuOpen && <div className="max-h-96 overflow-y-auto rounded-lg border border-dark-600 bg-dark-900 p-4 shadow-xl" aria-label="Select collection categories">
          <label className="flex items-center gap-3 border-b border-dark-700 pb-3 text-sm font-semibold text-cream-100"><input type="checkbox" checked={categories.length > 0 && selectedCategories.length === categories.length} disabled={busy} onChange={event => { setSelectedCategories(event.target.checked ? categories.map(item => item.key) : [category]); setDirty(true); }} />All collections</label>
          {['default', 'weave', 'material', 'mood', 'space'].map(group => <div key={group} className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold-400">{{ default: 'Default', weave: 'Weave Type', material: 'Material', mood: 'Mood', space: 'Space' }[group]}</p>
            <div className="grid gap-2 sm:grid-cols-2">{categories.filter(item => group === 'default' ? item.key === 'default' : item.key.startsWith(`${group}/`)).map(item => <label key={item.key} className="flex items-center gap-3 text-sm text-cream-300"><input type="checkbox" checked={selectedCategories.includes(item.key)} disabled={busy} onChange={event => {
              const next = event.target.checked ? [...selectedCategories, item.key] : selectedCategories.filter(key => key !== item.key);
              if (!next.length) return;
              setSelectedCategories(next);
              // Adding categories keeps the current images ready to apply to all.
              if (!next.includes(category) && !dirty) setCategory(next[0]);
              else setDirty(true);
            }} />{item.label.replace(/^[^:]+: /, '')}</label>)}</div>
          </div>)}
          <button type="button" className="btn-secondary mt-4" onClick={() => setCategoryMenuOpen(false)}>Done</button>
        </div>}
        <p className="text-xs text-dark-400">Save applies these images to every selected collection. To load existing images for one category, use the selector below.</p>
        <label className="block text-xs text-cream-300">Load images from<select className="input-field mt-2 block w-full" value={category} disabled={busy} onChange={event => {
          if (!dirty || window.confirm('Discard unsaved image changes and load this category?')) { setCategory(event.target.value); setSelectedCategories([event.target.value]); }
        }}>{categories.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
      </div>
      {message && <p role="status" className="rounded-lg border border-dark-600 p-3 text-sm text-cream-200">{message}</p>}
      {loading ? <p className="text-dark-400">Loading display images…</p> : loadedCategory !== category ? <p className="text-dark-400">Reload the page to retry loading this category.</p> : <>
        <fieldset disabled={busy} className="space-y-6 disabled:opacity-60">

          <div className="grid gap-5 lg:grid-cols-[1fr_1.5fr_1fr]">
            {display.images.map((image, index) => <div key={index} className="rounded-xl border border-dark-700 bg-dark-900 p-4 space-y-4">
              <h2 className="font-semibold text-cream-200">{['Left image', 'Centre image (large)', 'Right image'][index]}</h2>
              <div className="aspect-[4/3] bg-dark-800 flex items-center justify-center overflow-hidden rounded-lg">{image.image_url ? <img src={image.image_url} alt={`${['Left', 'Centre', 'Right'][index]} preview`} className="h-full w-full object-cover" /> : <span className="text-sm text-dark-400">Choose an image</span>}</div>
              <label className="block text-xs text-cream-300 space-y-2">Upload image<input type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-xs" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(index, file); event.target.value = ''; }} /></label>
              <label className="block text-xs text-cream-300 space-y-2">Image URL<input className="input-field block w-full" value={image.image_url} maxLength={500} placeholder="https://… or /static/…" onChange={event => patch(index, { image_url: event.target.value })} /></label>
              <label className="block text-xs text-cream-300 space-y-2">Caption / image description<textarea className="input-field block w-full" value={image.caption} maxLength={180} rows={3} onChange={event => patch(index, { caption: event.target.value })} /></label>
            </div>)}
          </div>
          <div className="flex items-center gap-4"><button type="button" className="btn-primary disabled:opacity-40" disabled={!dirty} onClick={save}>{busy ? 'Saving…' : `Save to ${selectedCategories.length} ${selectedCategories.length === 1 ? 'collection' : 'collections'}`}</button>{selected && <Link to={selected.href} target="_blank" rel="noreferrer" className="text-sm text-gold-400 underline">View collection ↗</Link>}</div>
          <p className="text-xs text-dark-400">The three-image layout is always shown. Empty slots use default images, then photos from the category. Clear an image URL and save to restore its automatic image.</p>
        </fieldset>
        {display.images.every(image => image.image_url) && <div><h2 className="mb-3 text-sm text-cream-300">Preview</h2><CollectionImageGrid images={display.images} title={category === 'default' ? 'The Rug Collection' : `${selected?.label.split(': ')[1] || category} Rugs`} eyebrow="Collection preview" target={selected?.href || '/catalog'} /></div>}
      </>}
    </div>
  );
}
