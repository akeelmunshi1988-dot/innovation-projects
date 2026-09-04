import { useState } from 'react';
import axios from 'axios';
import { ArrowRight, Check, Eye, EyeOff, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_DESCRIPTION = 'Every rug that leaves our workshop passes through the hands of master weavers who have spent years perfecting their craft — hand-knotting, natural dyeing, and meticulous finishing, checked for weave density, accurate sizing, and colourfast dyes before anything ships.';

export default function HomepageIntroduction() {
  const { user, updateTenant } = useAuth();
  const tenant = user!.tenant;
  const [titleLineOne, setTitleLineOne] = useState(tenant.homepage_intro_title_line_one || 'Rug Making');
  const [titleLineTwo, setTitleLineTwo] = useState(tenant.homepage_intro_title_line_two || '& Weaving');
  const [label, setLabel] = useState(tenant.homepage_intro_label || 'Final Product');
  const [description, setDescription] = useState(tenant.homepage_intro_description || DEFAULT_DESCRIPTION);
  const [ctaLabel, setCtaLabel] = useState(tenant.homepage_intro_cta_label || 'Explore Collection');
  const [ctaUrl, setCtaUrl] = useState(tenant.homepage_intro_cta_url || '/catalog');
  const [enabled, setEnabled] = useState(tenant.homepage_intro_enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const inputClass = 'w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-cream-100 placeholder-dark-500 focus:border-gold-600/60 focus:outline-none';

  const save = async () => {
    if (!titleLineOne.trim() || !titleLineTwo.trim() || !description.trim()) {
      setError('Both title lines and the description are required.');
      return;
    }
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const { data } = await axios.patch('/api/tenant/settings', {
        homepage_intro_title_line_one: titleLineOne.trim(),
        homepage_intro_title_line_two: titleLineTwo.trim(),
        homepage_intro_label: label.trim(),
        homepage_intro_description: description.trim(),
        homepage_intro_cta_label: ctaLabel.trim(),
        homepage_intro_cta_url: ctaUrl.trim(),
        homepage_intro_enabled: enabled,
      });
      updateTenant(data);
      setSaved(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not save the introduction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cream-100">Homepage Introduction</h1>
          <p className="mt-1 text-sm text-dark-400">Edit the oversized title and content shown beside the introductory video.</p>
        </div>
        <button type="button" onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-gold-500 disabled:opacity-50">
          {saved ? <Check size={16} /> : <Save size={16} />} {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      <section className="grid gap-5 rounded-xl border border-dark-700 bg-dark-900 p-5 md:grid-cols-2">
        <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Large title — line 1</span><input value={titleLineOne} onChange={event => { setTitleLineOne(event.target.value); setSaved(false); }} maxLength={100} className={inputClass} /></label>
        <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Large title — line 2</span><input value={titleLineTwo} onChange={event => { setTitleLineTwo(event.target.value); setSaved(false); }} maxLength={100} className={inputClass} /></label>
        <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Right-side label</span><input value={label} onChange={event => { setLabel(event.target.value); setSaved(false); }} maxLength={100} className={inputClass} /></label>
        <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Right-side description</span><textarea value={description} onChange={event => { setDescription(event.target.value); setSaved(false); }} maxLength={1500} rows={6} className={`${inputClass} resize-none`} /></label>
        <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Link text</span><input value={ctaLabel} onChange={event => { setCtaLabel(event.target.value); setSaved(false); }} maxLength={60} className={inputClass} /></label>
        <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Link destination</span><input value={ctaUrl} onChange={event => { setCtaUrl(event.target.value); setSaved(false); }} maxLength={300} placeholder="/catalog" className={inputClass} /><span className="block text-xs text-dark-500">Use an internal path such as /catalog.</span></label>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-dark-700 bg-dark-800 p-4 md:col-span-2">
          <div><p className="text-sm font-medium text-cream-200">Show introduction on homepage</p><p className="mt-0.5 text-xs text-dark-500">An introductory video must also be active under Homepage Videos.</p></div>
          <button type="button" onClick={() => { setEnabled(current => !current); setSaved(false); }} className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${enabled ? 'bg-gold-600 text-white' : 'bg-dark-700 text-dark-300'}`}>{enabled ? <Eye size={14} /> : <EyeOff size={14} />} {enabled ? 'Visible' : 'Hidden'}</button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl bg-[#f3f1e8] p-8 text-[#191d27]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{label || 'Final Product'}</p>
        <p className="mt-5 font-condensed text-6xl font-medium uppercase leading-[0.9] tracking-[-0.04em]">{titleLineOne || 'Rug Making'}<br />{titleLineTwo || '& Weaving'}</p>
        <p className="mt-7 max-w-2xl font-serif text-2xl font-light leading-snug">{description}</p>
        {ctaLabel && <span className="mt-7 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">{ctaLabel} <ArrowRight size={14} /></span>}
      </section>
    </div>
  );
}
