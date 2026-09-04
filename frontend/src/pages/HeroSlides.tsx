import { useRef, useState } from 'react';
import axios from 'axios';
import { ArrowDown, ArrowUp, Check, ImagePlus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeroSlide {
  image_url: string;
  alt_text?: string;
  eyebrow?: string;
  headline?: string;
  button_text?: string;
}

const fieldClass = 'w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60';

export default function HeroSlides() {
  const { user, updateTenant } = useAuth();
  const tenant = user!.tenant;
  const initialSlides = tenant.hero_images?.length
    ? tenant.hero_images
    : (tenant.hero_image_url ? [{ image_url: tenant.hero_image_url }] : []);
  const [slides, setSlides] = useState<HeroSlide[]>(initialSlides);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const updateSlide = (index: number, field: keyof HeroSlide, value: string) => {
    setSlides(current => current.map((slide, i) => i === index ? { ...slide, [field]: value } : slide));
    setSaved(false);
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    setSlides(current => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaved(false);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await axios.post('/api/tenant/hero-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateTenant(data);
      setSlides(data.hero_images || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Hero image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const saveSlides = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const { data } = await axios.patch('/api/tenant/settings', {
        hero_images: slides,
        hero_image_url: slides[0]?.image_url || '',
      });
      updateTenant(data);
      setSlides(data.hero_images || []);
      setSaved(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not save hero slides.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-cream-100 text-2xl font-semibold">Homepage Hero</h1>
          <p className="text-dark-400 text-sm mt-1">Manage carousel images and the content displayed on each slide.</p>
        </div>
        <div className="flex gap-3">
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => {
            const file = event.target.files?.[0];
            if (file) uploadImage(file);
            event.target.value = '';
          }} />
          <button type="button" disabled={uploading || slides.length >= 12} onClick={() => inputRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-800 px-4 py-2.5 text-sm text-cream-200 hover:bg-dark-700 disabled:opacity-50">
            <ImagePlus size={16} /> {uploading ? 'Uploading…' : 'Add slide'}
          </button>
          <button type="button" disabled={saving} onClick={saveSlides} className="flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-gold-500 disabled:opacity-50">
            {saved ? <Check size={16} /> : <Save size={16} />} {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}
      {slides.length === 0 && <div className="rounded-xl border border-dashed border-dark-600 bg-dark-900 p-12 text-center text-dark-400">Add an image to create the first hero slide.</div>}

      <div className="space-y-5">
        {slides.map((slide, index) => (
          <article key={`${slide.image_url}-${index}`} className="grid gap-5 rounded-xl border border-dark-700 bg-dark-900 p-5 lg:grid-cols-[280px_1fr]">
            <div className="space-y-3">
              <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-dark-800">
                <img src={slide.image_url} alt={slide.alt_text || `Hero slide ${index + 1}`} className="h-full w-full object-cover" />
                <span className="absolute left-3 top-3 rounded bg-dark-950/80 px-2 py-1 text-xs font-medium text-cream-100">Slide {index + 1}</span>
              </div>
              <div className="flex gap-2">
                <button type="button" aria-label="Move slide up" disabled={index === 0} onClick={() => moveSlide(index, -1)} className="rounded border border-dark-700 p-2 text-dark-300 hover:text-cream-100 disabled:opacity-30"><ArrowUp size={15} /></button>
                <button type="button" aria-label="Move slide down" disabled={index === slides.length - 1} onClick={() => moveSlide(index, 1)} className="rounded border border-dark-700 p-2 text-dark-300 hover:text-cream-100 disabled:opacity-30"><ArrowDown size={15} /></button>
                <button type="button" onClick={() => { setSlides(current => current.filter((_, i) => i !== index)); setSaved(false); }} className="ml-auto flex items-center gap-1.5 rounded border border-red-900/60 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40"><Trash2 size={14} /> Remove</button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Hero eyebrow text</span><input value={slide.eyebrow || ''} onChange={e => updateSlide(index, 'eyebrow', e.target.value)} maxLength={100} placeholder="20+ Years in the Making" className={fieldClass} /><span className="block text-xs text-dark-500">Small line above this slide's headline. Blank uses the default.</span></label>
              <label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Hero headline</span><input value={slide.headline || ''} onChange={e => updateSlide(index, 'headline', e.target.value)} maxLength={200} placeholder="Made for Timeless Spaces." className={fieldClass} /><span className="block text-xs text-dark-500">Main headline for this slide. Blank uses the default.</span></label>
              <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Hero button text</span><input value={slide.button_text || ''} onChange={e => updateSlide(index, 'button_text', e.target.value)} maxLength={50} placeholder="Explore Collection" className={fieldClass} /></label>
              <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Image alt text</span><input value={slide.alt_text || ''} onChange={e => updateSlide(index, 'alt_text', e.target.value)} maxLength={200} placeholder="Describe the image" className={fieldClass} /></label>
            </div>
          </article>
        ))}
      </div>
      <p className="text-xs text-dark-500">Maximum 12 slides. Carousel order follows the order shown here.</p>
    </div>
  );
}
