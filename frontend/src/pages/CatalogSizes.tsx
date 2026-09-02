import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Ruler, Save, Trash2, X } from 'lucide-react';
import type { CatalogSizeMaster } from '../types';

export default function CatalogSizes() {
  const [sizes, setSizes] = useState<CatalogSizeMaster[]>([]);
  const [draft, setDraft] = useState({ ft: '', cm: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | 'new' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => axios.get('/api/catalog-sizes').then(({ data }) => setSizes(data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const addSize = async () => {
    if (!draft.ft.trim()) return;
    setSaving('new'); setMessage(null);
    try {
      await axios.post('/api/catalog-sizes', { ft: draft.ft.trim(), cm: draft.cm.trim() || null, sort_order: sizes.length, is_active: true });
      setDraft({ ft: '', cm: '' });
      await load();
      setMessage('Size added and associated with all catalog rugs.');
    } catch (error: any) { setMessage(error.response?.data?.detail || 'Could not add size.'); }
    finally { setSaving(null); }
  };

  const saveSize = async (size: CatalogSizeMaster) => {
    setSaving(size.id); setMessage(null);
    try {
      await axios.put(`/api/catalog-sizes/${size.id}`, size);
      await load();
      setMessage('Master size updated across associated rugs.');
    } catch (error: any) { setMessage(error.response?.data?.detail || 'Could not update size.'); }
    finally { setSaving(null); }
  };

  const removeSize = async (size: CatalogSizeMaster) => {
    setSaving(size.id); setMessage(null);
    try { await axios.delete(`/api/catalog-sizes/${size.id}`); await load(); }
    catch (error: any) { setMessage(error.response?.data?.detail || 'Could not delete size.'); }
    finally { setSaving(null); }
  };

  const update = (id: number, field: keyof CatalogSizeMaster, value: string | boolean) =>
    setSizes((current) => current.map((size) => size.id === id ? { ...size, [field]: value } : size));

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <p className="text-gold-500 text-xs uppercase tracking-widest mb-2">Catalog setup</p>
        <h1 className="text-cream-100 text-2xl font-semibold flex items-center gap-2"><Ruler size={22} /> Common Sizes</h1>
        <p className="text-dark-400 text-sm mt-2 max-w-2xl">Manage dimensions once for the entire catalog. Prices, delivery days, and the default choice remain specific to each rug.</p>
      </div>

      {message && <div className="flex items-center justify-between border border-dark-700 bg-dark-900 rounded-lg px-4 py-3 text-sm text-cream-300"><span>{message}</span><button onClick={() => setMessage(null)}><X size={14} /></button></div>}

      <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 p-4 border-b border-dark-700 bg-dark-800/50 text-dark-400 text-xs uppercase tracking-wider">
          <span>Size in feet</span><span>Size in centimetres</span><span className="w-36">Actions</span>
        </div>
        {loading ? <div className="py-16 text-center text-dark-400 text-sm">Loading sizes…</div> : sizes.map((size) => (
          <div key={size.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 p-4 border-b border-dark-800 last:border-0 items-center">
            <input value={size.ft} onChange={(e) => update(size.id, 'ft', e.target.value)} className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm focus:outline-none focus:border-gold-600" />
            <input value={size.cm ?? ''} onChange={(e) => update(size.id, 'cm', e.target.value)} placeholder="Optional" className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600" />
            <div className="w-36 flex items-center gap-2">
              <button onClick={() => saveSize(size)} disabled={saving !== null} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white text-xs"><Save size={13} /> Save</button>
              <button onClick={() => removeSize(size)} disabled={saving !== null} className="p-2 text-dark-500 hover:text-red-400 disabled:opacity-50" title="Delete unused size"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 p-4 bg-dark-950/40 items-center">
          <input value={draft.ft} onChange={(e) => setDraft((d) => ({ ...d, ft: e.target.value }))} placeholder="e.g. 6x9" className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600" />
          <input value={draft.cm} onChange={(e) => setDraft((d) => ({ ...d, cm: e.target.value }))} placeholder="e.g. 183x274" className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600" />
          <button onClick={addSize} disabled={!draft.ft.trim() || saving !== null} className="w-36 inline-flex justify-center items-center gap-1.5 px-3 py-2 rounded-lg bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white text-xs"><Plus size={13} /> Add Size</button>
        </div>
      </div>

      <p className="text-dark-500 text-xs">Sizes already used by rugs cannot be deleted. Deactivate or update them so existing orders and pricing remain intact.</p>
    </div>
  );
}
