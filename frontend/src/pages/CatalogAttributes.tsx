import { useEffect, useState } from 'react';
import axios from 'axios';
import { Layers3, Plus, Save, Trash2, X } from 'lucide-react';
import type { CatalogAttributeMaster } from '../types';

type MasterListProps = {
  title: string;
  description: string;
  endpoint: string;
  example: string;
};

function MasterList({ title, description, endpoint, example }: MasterListProps) {
  const [items, setItems] = useState<CatalogAttributeMaster[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | 'new' | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get<CatalogAttributeMaster[]>(endpoint);
      setItems(data);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || `Could not load ${title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [endpoint]);

  const updateLocal = (id: number, field: 'name' | 'is_active', value: string | boolean) => {
    setItems(current => current.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const add = async () => {
    if (!draft.trim()) return;
    setSaving('new'); setMessage('');
    try {
      await axios.post(endpoint, { name: draft.trim(), sort_order: items.length, is_active: true });
      setDraft('');
      await load();
      setMessage(`${title.slice(0, -1)} added.`);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Could not add the value.');
    } finally {
      setSaving(null);
    }
  };

  const save = async (item: CatalogAttributeMaster) => {
    if (!item.name.trim()) return;
    setSaving(item.id); setMessage('');
    try {
      await axios.put(`${endpoint}/${item.id}`, { ...item, name: item.name.trim() });
      await load();
      setMessage('Changes saved. Existing catalog rugs were updated where required.');
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Could not save the value.');
    } finally {
      setSaving(null);
    }
  };

  const remove = async (item: CatalogAttributeMaster) => {
    if (!window.confirm(`Delete “${item.name}”?`)) return;
    setSaving(item.id); setMessage('');
    try {
      await axios.delete(`${endpoint}/${item.id}`);
      await load();
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Could not delete the value.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-dark-700 bg-dark-900">
      <div className="border-b border-dark-700 bg-dark-800/50 p-5">
        <h2 className="text-lg font-semibold text-cream-100">{title}</h2>
        <p className="mt-1 text-sm text-dark-400">{description}</p>
      </div>

      {message && <div className="mx-4 mt-4 flex items-center justify-between rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-xs text-cream-300"><span>{message}</span><button type="button" onClick={() => setMessage('')}><X size={13} /></button></div>}

      {loading ? <div className="py-14 text-center text-sm text-dark-400">Loading…</div> : (
        <div>
          {items.map(item => (
            <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-dark-800 p-4">
              <input value={item.name} onChange={event => updateLocal(item.id, 'name', event.target.value)} maxLength={100} className="rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-cream-100 focus:border-gold-600 focus:outline-none" />
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-dark-300"><input type="checkbox" checked={item.is_active} onChange={event => updateLocal(item.id, 'is_active', event.target.checked)} className="accent-gold-600" /> Active</label>
                <button type="button" onClick={() => save(item)} disabled={saving !== null || !item.name.trim()} className="rounded-lg bg-gold-600 p-2 text-white hover:bg-gold-500 disabled:opacity-40" title="Save"><Save size={14} /></button>
                <button type="button" onClick={() => remove(item)} disabled={saving !== null} className="p-2 text-dark-500 hover:text-red-400 disabled:opacity-40" title="Delete unused value"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_auto] gap-3 bg-dark-950/40 p-4">
            <input value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add(); } }} placeholder={example} maxLength={100} className="rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-cream-100 placeholder-dark-500 focus:border-gold-600 focus:outline-none" />
            <button type="button" onClick={add} disabled={saving !== null || !draft.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-gold-600 px-3 py-2 text-xs text-white hover:bg-gold-500 disabled:opacity-40"><Plus size={13} /> Add</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function CatalogAttributes() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div>
        <p className="mb-2 text-xs uppercase tracking-widest text-gold-500">Catalog setup</p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-cream-100"><Layers3 size={22} /> Weave & Pile Masters</h1>
        <p className="mt-2 max-w-3xl text-sm text-dark-400">Manage the choices offered in the catalog form. Deactivated values remain on existing rugs but cannot be selected for new ones.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <MasterList title="Weave Types" description="Construction methods available for catalog rugs." endpoint="/api/catalog-weave-types" example="e.g. soumak" />
        <MasterList title="Pile Heights" description="Pile classifications available for catalog rugs." endpoint="/api/catalog-pile-heights" example="e.g. plush" />
      </div>
    </div>
  );
}
