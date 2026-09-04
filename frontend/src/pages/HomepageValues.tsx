import { useState } from 'react';
import axios from 'axios';
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type ValueItem = { icon: string; title: string; description: string };

const DEFAULT_ITEMS: ValueItem[] = [
  { icon: 'pencil-ruler', title: 'Bespoke Design', description: 'Every rug is developed around your dimensions, palette, pattern, and intended space.' },
  { icon: 'scissors', title: 'Master Craftsmanship', description: 'Experienced artisans shape every detail by hand using time-honoured weaving techniques.' },
  { icon: 'gem', title: 'Premium Materials', description: 'Responsibly selected wool, silk, cotton, and performance fibres deliver beauty that lasts.' },
  { icon: 'globe', title: 'Export Quality', description: 'Careful inspection, secure packaging, and worldwide delivery support every finished rug.' },
];

const ICON_OPTIONS = [
  ['pencil-ruler', 'Design'], ['scissors', 'Craftsmanship'], ['gem', 'Premium'],
  ['globe', 'Worldwide'], ['palette', 'Colour'], ['shield', 'Quality'],
  ['package', 'Delivery'], ['leaf', 'Sustainable'],
];

const fieldClass = 'w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-cream-100 placeholder-dark-500 focus:border-gold-600/60 focus:outline-none';

export default function HomepageValues() {
  const { user, updateTenant } = useAuth();
  const tenant = user!.tenant;
  const [eyebrow, setEyebrow] = useState(tenant.homepage_values_eyebrow || 'Why Choose Us');
  const [headline, setHeadline] = useState(tenant.homepage_values_headline || 'Rugs designed with purpose.');
  const [accentHeadline, setAccentHeadline] = useState(tenant.homepage_values_headline_accent || 'Crafted to last for generations.');
  const [description, setDescription] = useState(tenant.homepage_values_description || 'From the first design conversation to final delivery, every decision is guided by skilled hands, dependable materials, and exacting quality standards.');
  const [items, setItems] = useState<ValueItem[]>(tenant.homepage_values_items?.length ? tenant.homepage_values_items : DEFAULT_ITEMS);
  const [enabled, setEnabled] = useState(tenant.homepage_values_enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const updateItem = (index: number, field: keyof ValueItem, value: string) => {
    setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
    setSaved(false);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems(current => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaved(false);
  };

  const save = async () => {
    if (items.some(item => !item.title.trim())) {
      setError('Every point needs a title.');
      return;
    }
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const { data } = await axios.patch('/api/tenant/settings', {
        homepage_values_eyebrow: eyebrow.trim(),
        homepage_values_headline: headline.trim(),
        homepage_values_headline_accent: accentHeadline.trim(),
        homepage_values_description: description.trim(),
        homepage_values_items: items,
        homepage_values_enabled: enabled,
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
          <h1 className="text-2xl font-semibold text-cream-100">Homepage Values</h1>
          <p className="mt-1 text-sm text-dark-400">Edit the company introduction and value cards displayed below the full-bleed image.</p>
        </div>
        <button type="button" onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-gold-500 disabled:opacity-50">
          {saved ? <Check size={16} /> : <Save size={16} />} {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      <section className="grid gap-5 rounded-xl border border-dark-700 bg-dark-900 p-5 md:grid-cols-2">
        <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Small section label</span><input value={eyebrow} onChange={event => { setEyebrow(event.target.value); setSaved(false); }} maxLength={100} className={fieldClass} /></label>
        <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Main headline</span><textarea value={headline} onChange={event => { setHeadline(event.target.value); setSaved(false); }} maxLength={250} rows={3} className={`${fieldClass} resize-none`} /><span className="block text-xs text-dark-500">Displayed in dark text.</span></label>
        <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Highlighted headline</span><textarea value={accentHeadline} onChange={event => { setAccentHeadline(event.target.value); setSaved(false); }} maxLength={250} rows={3} className={`${fieldClass} resize-none`} /><span className="block text-xs text-dark-500">Displayed in muted grey like the reference.</span></label>
        <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Supporting paragraph</span><textarea value={description} onChange={event => { setDescription(event.target.value); setSaved(false); }} maxLength={1000} rows={3} className={`${fieldClass} resize-none`} /></label>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-dark-700 bg-dark-800 p-4 md:col-span-2">
          <div><p className="text-sm font-medium text-cream-200">Show section on homepage</p><p className="mt-0.5 text-xs text-dark-500">Hide it temporarily without deleting your content.</p></div>
          <button type="button" onClick={() => { setEnabled(current => !current); setSaved(false); }} className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${enabled ? 'bg-gold-600 text-white' : 'bg-dark-700 text-dark-300'}`}>{enabled ? <Eye size={14} /> : <EyeOff size={14} />} {enabled ? 'Visible' : 'Hidden'}</button>
        </div>
      </section>

      <div className="flex items-center justify-between gap-4">
        <div><h2 className="font-semibold text-cream-100">Value points</h2><p className="mt-1 text-xs text-dark-500">Four points are recommended; up to six are supported.</p></div>
        <button type="button" disabled={items.length >= 6} onClick={() => { setItems(current => [...current, { icon: 'scissors', title: '', description: '' }]); setSaved(false); }} className="flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-cream-200 hover:bg-dark-700 disabled:opacity-40"><Plus size={15} /> Add point</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item, index) => (
          <article key={index} className="space-y-4 rounded-xl border border-dark-700 bg-dark-900 p-5">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-dark-400">Point {index + 1}</span><div className="flex gap-1"><button type="button" disabled={index === 0} onClick={() => moveItem(index, -1)} className="rounded border border-dark-700 p-2 text-dark-300 disabled:opacity-30"><ArrowUp size={14} /></button><button type="button" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)} className="rounded border border-dark-700 p-2 text-dark-300 disabled:opacity-30"><ArrowDown size={14} /></button><button type="button" onClick={() => { setItems(current => current.filter((_, itemIndex) => itemIndex !== index)); setSaved(false); }} className="rounded border border-red-900/60 p-2 text-red-400"><Trash2 size={14} /></button></div></div>
            <label className="space-y-1.5"><span className="text-xs text-cream-300">Icon</span><select value={item.icon} onChange={event => updateItem(index, 'icon', event.target.value)} className={fieldClass}>{ICON_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="space-y-1.5"><span className="text-xs text-cream-300">Title</span><input value={item.title} onChange={event => updateItem(index, 'title', event.target.value)} maxLength={100} className={fieldClass} /></label>
            <label className="space-y-1.5"><span className="text-xs text-cream-300">Description</span><textarea value={item.description} onChange={event => updateItem(index, 'description', event.target.value)} maxLength={300} rows={3} className={`${fieldClass} resize-none`} /></label>
          </article>
        ))}
      </div>
    </div>
  );
}
