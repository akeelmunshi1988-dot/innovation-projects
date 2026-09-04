import { useRef, useState } from 'react';
import axios from 'axios';
import { Check, Eye, EyeOff, ImagePlus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function HomepageFullBleedImage() {
  const { user, updateTenant } = useAuth();
  const tenant = user!.tenant;
  const [imageUrl, setImageUrl] = useState(tenant.homepage_full_bleed_image_url || '');
  const [altText, setAltText] = useState(tenant.homepage_full_bleed_alt_text || '');
  const [enabled, setEnabled] = useState(tenant.homepage_full_bleed_enabled ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File) => {
    setUploading(true);
    setSaved(false);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await axios.post('/api/tenant/homepage-full-bleed-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateTenant(data);
      setImageUrl(data.homepage_full_bleed_image_url || '');
      setEnabled(data.homepage_full_bleed_enabled ?? true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const { data } = await axios.patch('/api/tenant/settings', {
        homepage_full_bleed_image_url: imageUrl,
        homepage_full_bleed_alt_text: altText.trim(),
        homepage_full_bleed_enabled: enabled,
      });
      updateTenant(data);
      setImageUrl(data.homepage_full_bleed_image_url || '');
      setAltText(data.homepage_full_bleed_alt_text || '');
      setEnabled(data.homepage_full_bleed_enabled ?? true);
      setSaved(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not save the section.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cream-100">Homepage Full-Bleed Image</h1>
          <p className="mt-1 text-sm text-dark-400">Choose the wide image displayed directly below the homepage introduction.</p>
        </div>
        <button type="button" onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-gold-500 disabled:opacity-50">
          {saved ? <Check size={16} /> : <Save size={16} />} {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      <section className="space-y-5 rounded-xl border border-dark-700 bg-dark-900 p-5">
        <div className="relative flex aspect-[18/5] min-h-[220px] items-center justify-center overflow-hidden rounded-lg bg-dark-800">
          {imageUrl ? (
            <img src={imageUrl} alt={altText || 'Homepage full-bleed preview'} className="h-full w-full object-cover" />
          ) : (
            <div className="text-center text-dark-400">
              <ImagePlus size={30} className="mx-auto mb-3" />
              <p className="text-sm">No full-bleed image selected</p>
            </div>
          )}
          {imageUrl && !enabled && <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded bg-dark-950/85 px-2.5 py-1.5 text-xs text-cream-200"><EyeOff size={13} /> Hidden on storefront</span>}
        </div>

        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => {
          const file = event.target.files?.[0];
          if (file) uploadImage(file);
          event.target.value = '';
        }} />

        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-800 px-4 py-2.5 text-sm text-cream-200 hover:bg-dark-700 disabled:opacity-50">
            <ImagePlus size={16} /> {uploading ? 'Uploading…' : imageUrl ? 'Replace image' : 'Choose image'}
          </button>
          {imageUrl && <button type="button" onClick={() => { setImageUrl(''); setSaved(false); }} className="flex items-center gap-2 rounded-lg border border-red-900/60 px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/40"><Trash2 size={15} /> Remove image</button>}
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Image alt text</span>
          <input value={altText} onChange={event => { setAltText(event.target.value); setSaved(false); }} maxLength={200} placeholder="Describe the room or rug shown in the image" className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-cream-100 placeholder-dark-500 focus:border-gold-600/60 focus:outline-none" />
          <span className="block text-xs text-dark-500">Used by screen readers and search engines.</span>
        </label>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-dark-700 bg-dark-800 p-4">
          <div>
            <p className="text-sm font-medium text-cream-200">Show section on homepage</p>
            <p className="mt-0.5 text-xs text-dark-500">The section also stays hidden until an image has been selected.</p>
          </div>
          <button type="button" aria-label={enabled ? 'Hide section' : 'Show section'} onClick={() => { setEnabled(current => !current); setSaved(false); }} className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-colors ${enabled ? 'bg-gold-600 text-white' : 'bg-dark-700 text-dark-300'}`}>
            {enabled ? <Eye size={14} /> : <EyeOff size={14} />} {enabled ? 'Visible' : 'Hidden'}
          </button>
        </div>
      </section>

      <p className="text-xs text-dark-500">Recommended: a landscape image at least 1920 px wide. The storefront crops it with “cover” so the rectangle is always filled edge to edge.</p>
    </div>
  );
}
