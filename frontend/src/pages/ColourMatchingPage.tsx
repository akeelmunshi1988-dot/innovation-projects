import { useRef, useState } from 'react';
import axios from 'axios';
import { ArrowDown, ArrowUp, Check, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type ColourItem = { title: string; description: string; image_url: string };

const DEFAULT_ITEMS: ColourItem[] = [
  { title: 'Pantone Colours', description: 'Reference a Pantone code or attach your selected swatch.', image_url: '' },
  { title: 'ARS Wool & Viscose Silk', description: 'Wool Box 1200 and 1400 · ARS 1000 Viscose Silk Box.', image_url: '' },
  { title: 'Additional ARS Systems', description: 'ARS 600 Box · ARS 700 Viscose Silk Box.', image_url: '' },
];

const fieldClass = 'w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-cream-100 placeholder-dark-500 focus:border-gold-600/60 focus:outline-none';

export default function ColourMatchingPage() {
  const { user, updateTenant } = useAuth();
  const tenant = user!.tenant;
  const [eyebrow, setEyebrow] = useState(tenant.colour_matching_eyebrow || 'Professional colour matching');
  const [heading, setHeading] = useState(tenant.colour_matching_heading || 'Specify colour with confidence.');
  const [body, setBody] = useState(tenant.colour_matching_body || 'Bring your palette into the conversation. Share a colour reference, fabric swatch or yarn sample with your rug brief so we can discuss the closest match for your chosen material.\n\nInclude the reference system and code, such as Pantone, when available. Screens and fibres can show colour differently; discuss a physical sample before confirming your final palette.');
  const [items, setItems] = useState<ColourItem[]>(tenant.colour_matching_items?.length ? tenant.colour_matching_items : DEFAULT_ITEMS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const dirty = () => setSaved(false);

  const updateItem = (index: number, field: keyof ColourItem, value: string) => {
    setItems(current => current.map((item, i) => i === index ? { ...item, [field]: value } : item));
    dirty();
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems(current => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    dirty();
  };

  const handleImageUpload = async (index: number, file: File) => {
    setUploadingIndex(index);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await axios.post<{ url: string }>('/api/tenant/colour-matching-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateItem(index, 'image_url', data.url);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Image upload failed.');
    } finally {
      setUploadingIndex(null);
    }
  };

  const save = async () => {
    if (items.some(item => !item.title.trim())) {
      setError('Every item needs a title.');
      return;
    }
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const { data } = await axios.patch('/api/tenant/settings', {
        colour_matching_eyebrow: eyebrow.trim(),
        colour_matching_heading: heading.trim(),
        colour_matching_body: body.trim(),
        colour_matching_items: items,
      });
      updateTenant(data);
      setSaved(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not save this section.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cream-100">Colour Matching Page</h1>
          <p className="mt-1 text-sm text-dark-400">Edit the intro text and reference images shown on the public Colour Matching page.</p>
        </div>
        <button type="button" onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-gold-500 disabled:opacity-50">
          {saved ? <Check size={16} /> : <Save size={16} />} {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      <section className="grid gap-5 rounded-xl border border-dark-700 bg-dark-900 p-5 md:grid-cols-2">
        <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Small section label</span><input value={eyebrow} onChange={event => { setEyebrow(event.target.value); dirty(); }} maxLength={100} className={fieldClass} /></label>
        <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Heading</span><input value={heading} onChange={event => { setHeading(event.target.value); dirty(); }} maxLength={200} className={fieldClass} /></label>
        <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Body text</span><textarea value={body} onChange={event => { setBody(event.target.value); dirty(); }} maxLength={2000} rows={5} className={`${fieldClass} resize-none`} /><span className="block text-xs text-dark-500">A blank line starts a new paragraph.</span></label>
      </section>

      <div className="flex items-center justify-between gap-4">
        <div><h2 className="font-semibold text-cream-100">Reference images</h2><p className="mt-1 text-xs text-dark-500">Shown as a large image plus supporting items; up to six are supported.</p></div>
        <button type="button" disabled={items.length >= 6} onClick={() => { setItems(current => [...current, { title: '', description: '', image_url: '' }]); dirty(); }} className="flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-cream-200 hover:bg-dark-700 disabled:opacity-40"><Plus size={15} /> Add item</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item, index) => (
          <article key={index} className="space-y-4 rounded-xl border border-dark-700 bg-dark-900 p-5">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-dark-400">Item {index + 1}</span><div className="flex gap-1"><button type="button" disabled={index === 0} onClick={() => moveItem(index, -1)} className="rounded border border-dark-700 p-2 text-dark-300 disabled:opacity-30"><ArrowUp size={14} /></button><button type="button" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)} className="rounded border border-dark-700 p-2 text-dark-300 disabled:opacity-30"><ArrowDown size={14} /></button><button type="button" onClick={() => { setItems(current => current.filter((_, i) => i !== index)); dirty(); }} className="rounded border border-red-900/60 p-2 text-red-400"><Trash2 size={14} /></button></div></div>

            {item.image_url ? (
              <div className="flex items-center gap-3">
                <img src={item.image_url} alt={item.title} className="h-20 w-28 rounded-lg border border-dark-700 bg-dark-950 object-cover" />
                <button type="button" onClick={() => updateItem(index, 'image_url', '')} className="rounded border border-red-900/60 p-2 text-red-400"><X size={14} /></button>
              </div>
            ) : (
              <>
                <input
                  ref={el => { fileInputRefs.current[index] = el; }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(index, e.target.files[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[index]?.click()}
                  disabled={uploadingIndex === index}
                  className="flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-xs text-cream-200 hover:bg-dark-700 disabled:opacity-50"
                >
                  <Upload size={12} /> {uploadingIndex === index ? 'Uploading…' : 'Upload image'}
                </button>
              </>
            )}

            <label className="space-y-1.5"><span className="text-xs text-cream-300">Title</span><input value={item.title} onChange={event => updateItem(index, 'title', event.target.value)} maxLength={100} className={fieldClass} /></label>
            <label className="space-y-1.5"><span className="text-xs text-cream-300">Description</span><textarea value={item.description} onChange={event => updateItem(index, 'description', event.target.value)} maxLength={300} rows={3} className={`${fieldClass} resize-none`} /></label>
          </article>
        ))}
      </div>
    </div>
  );
}
