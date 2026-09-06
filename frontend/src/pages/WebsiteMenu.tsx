import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { NAV, collectionMenu } from '../data/storefrontMenu';

export default function WebsiteMenu() {
  const [options, setOptions] = useState<{ materials: string[]; weaves: string[]; spaces: string[]; moods: string[] }>({ materials: [], weaves: [], spaces: [], moods: [] });
  useEffect(() => {
    axios.get('/api/customer/menu-options').then(({ data }) => setOptions(data)).catch(() => setMessage('Could not load collection menu options.'));
  }, []);
  const groups = [
    { title: 'Main menu', visibilityKey: null, items: NAV.map(item => ({ key: `nav:${item.path}`, label: item.label })) },
    ...Object.entries(collectionMenu(options)).map(([key, group]) => ({ title: group.heading, visibilityKey: `heading:${key}`, items: [
      { key: `heading:${key}`, label: group.heading },
      ...group.links.map(item => ({ key: `link:${item.to}`, label: item.label })),
    ] })),
  ];
  const { user, updateTenant } = useAuth();
  const [labels, setLabels] = useState<Record<string, string>>(user!.tenant.storefront_menu_labels || {});
  const [visibility, setVisibility] = useState<Record<string, boolean>>(user!.tenant.storefront_menu_visibility || {});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const save = async () => {
    setBusy(true); setMessage('');
    try {
      const { data } = await axios.patch('/api/tenant/settings', { storefront_menu_labels: labels, storefront_menu_visibility: visibility });
      updateTenant(data); setVisibility(data.storefront_menu_visibility || {}); setLabels(data.storefront_menu_labels || {}); setMessage('Website menu saved.');
    } catch { setMessage('Could not save menu titles. Please try again.'); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
    <div><h1 className="text-2xl font-semibold text-cream-100">Website Menu</h1><p className="mt-2 text-sm text-dark-400">Edit the main menu and collection dropdown titles. Uncheck Visible to hide a link or an entire collection group. Leave a field blank to use its default title. Material names come from Inventory. Spaces, moods, and weave types come from Collection Masters; manage available options there.</p></div>
    {message && <p role="status" className="text-sm text-cream-200">{message}</p>}
    <fieldset disabled={busy} className="space-y-6">
      {groups.map(group => <section key={group.title} className="rounded-xl border border-dark-700 bg-dark-900 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-cream-100">{group.title}</h2>
          {group.visibilityKey && <label className="flex items-center gap-2 text-sm text-cream-300"><input type="checkbox" checked={visibility[group.visibilityKey] !== false} onChange={event => { setVisibility(current => ({ ...current, [group.visibilityKey!]: event.target.checked })); setMessage(''); }} aria-label={`Show entire ${group.title} section`} />Show entire section</label>}
        </div>
        {group.visibilityKey && visibility[group.visibilityKey] === false && <p className="mb-4 text-xs text-dark-400">This section and all its links are hidden from the customer menu. Individual link settings are preserved.</p>}
        <div className="grid gap-4 sm:grid-cols-2">{group.items.map(item => <div key={item.key} className="space-y-2 text-sm text-cream-300">
          <div className="flex items-center justify-between gap-3"><label htmlFor={`title-${item.key}`}>{item.label}</label>{!item.key.startsWith('heading:') && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={visibility[item.key] !== false} onChange={event => { setVisibility(current => ({ ...current, [item.key]: event.target.checked })); setMessage(''); }} aria-label={`Show ${item.label}`} />Visible</label>}</div>
          <input id={`title-${item.key}`} className="input-field block w-full" maxLength={60} value={labels[item.key] || ''} placeholder={item.label} onChange={event => { setLabels(current => ({ ...current, [item.key]: event.target.value })); setMessage(''); }} />
        </div>)}</div>
      </section>)}
      <button type="button" onClick={save} className="btn-primary">{busy ? 'Saving…' : 'Save website menu'}</button>
    </fieldset>
    <section className="rounded-xl bg-cream-100 p-5 text-stone-700"><p className="mb-4 text-xs uppercase tracking-wider text-stone-500">Main menu preview</p><div className="flex flex-wrap gap-6 text-sm">{NAV.filter(item => visibility[`nav:${item.path}`] !== false).map(item => <span key={item.path}>{labels[`nav:${item.path}`]?.trim() || item.label}</span>)}</div></section>
  </div>;
}
