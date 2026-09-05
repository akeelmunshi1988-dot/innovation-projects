import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { NAV, MEGA_MENU } from '../data/storefrontMenu';

const groups = [
  { title: 'Main menu', items: NAV.map(item => ({ key: `nav:${item.path}`, label: item.label })) },
  ...Object.entries(MEGA_MENU).map(([key, group]) => ({ title: group.heading, items: [
    { key: `heading:${key}`, label: group.heading },
    ...group.links.map(item => ({ key: `link:${item.to}`, label: item.label })),
  ] })),
];

export default function WebsiteMenu() {
  const { user, updateTenant } = useAuth();
  const [labels, setLabels] = useState<Record<string, string>>(user!.tenant.storefront_menu_labels || {});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const save = async () => {
    setBusy(true); setMessage('');
    try {
      const { data } = await axios.patch('/api/tenant/settings', { storefront_menu_labels: labels });
      updateTenant(data); setLabels(data.storefront_menu_labels || {}); setMessage('Website menu saved.');
    } catch { setMessage('Could not save menu titles. Please try again.'); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
    <div><h1 className="text-2xl font-semibold text-cream-100">Website Menu</h1><p className="mt-2 text-sm text-dark-400">Edit the main menu and collection dropdown titles. Leave a field blank to use its default title.</p></div>
    {message && <p role="status" className="text-sm text-cream-200">{message}</p>}
    <fieldset disabled={busy} className="space-y-6">
      {groups.map(group => <section key={group.title} className="rounded-xl border border-dark-700 bg-dark-900 p-5">
        <h2 className="mb-4 font-semibold text-cream-100">{group.title}</h2>
        <div className="grid gap-4 sm:grid-cols-2">{group.items.map(item => <label key={item.key} className="space-y-2 text-sm text-cream-300"><span>{item.label}</span><input className="input-field block w-full" maxLength={60} value={labels[item.key] || ''} placeholder={item.label} onChange={event => { setLabels(current => ({ ...current, [item.key]: event.target.value })); setMessage(''); }} /></label>)}</div>
      </section>)}
      <button type="button" onClick={save} className="btn-primary">{busy ? 'Saving…' : 'Save menu titles'}</button>
    </fieldset>
    <section className="rounded-xl bg-cream-100 p-5 text-stone-700"><p className="mb-4 text-xs uppercase tracking-wider text-stone-500">Main menu preview</p><div className="flex flex-wrap gap-6 text-sm">{NAV.map(item => <span key={item.path}>{labels[`nav:${item.path}`]?.trim() || item.label}</span>)}</div></section>
  </div>;
}
