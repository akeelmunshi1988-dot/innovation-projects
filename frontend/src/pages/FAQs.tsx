import { useEffect, useState } from 'react';
import axios from 'axios';
import { HelpCircle, Pencil, Plus, Trash2, X } from 'lucide-react';

interface FAQ { id: number; question: string; answer: string; rug_catalog_id: number | null; sort_order: number; is_active: boolean }
interface Rug { id: number; name: string }
const empty = { question: '', answer: '', rug_catalog_id: '', sort_order: '0', is_active: true };

export default function FAQs() {
  const [items, setItems] = useState<FAQ[]>([]);
  const [rugs, setRugs] = useState<Rug[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => axios.get('/api/faqs').then(({ data }) => setItems(data));
  useEffect(() => {
    load().catch(() => setError('Could not load FAQs.'));
    axios.get('/api/catalog').then(({ data }) => setRugs(Array.isArray(data) ? data : data.items ?? [])).catch(() => {});
  }, []);

  const edit = (item: FAQ) => {
    setEditing(item.id);
    setForm({ question: item.question, answer: item.answer, rug_catalog_id: item.rug_catalog_id == null ? '' : String(item.rug_catalog_id), sort_order: String(item.sort_order), is_active: item.is_active });
  };
  const reset = () => { setEditing(null); setForm(empty); setError(''); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    const payload = { ...form, rug_catalog_id: form.rug_catalog_id ? Number(form.rug_catalog_id) : null, sort_order: Number(form.sort_order) || 0 };
    try {
      if (editing) await axios.put(`/api/faqs/${editing}`, payload); else await axios.post('/api/faqs', payload);
      reset(); await load();
    } catch (err: any) { setError(err.response?.data?.detail || 'Could not save FAQ.'); }
    finally { setSaving(false); }
  };
  const remove = async (id: number) => {
    if (!window.confirm('Delete this FAQ?')) return;
    await axios.delete(`/api/faqs/${id}`); await load();
  };

  return <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
    <div><h1 className="text-cream-100 text-2xl font-semibold flex items-center gap-2"><HelpCircle size={24} /> FAQs</h1><p className="text-dark-400 text-sm mt-1">Manage common questions and product-specific questions shown on rug detail pages.</p></div>
    <form onSubmit={save} className="bg-dark-900 border border-dark-700 rounded-xl p-5 space-y-4">
      <div className="flex justify-between"><h2 className="text-cream-100 font-medium">{editing ? 'Edit FAQ' : 'Add FAQ'}</h2>{editing && <button type="button" onClick={reset}><X className="text-dark-400" size={18}/></button>}</div>
      <div className="grid md:grid-cols-[1fr_240px_100px] gap-4">
        <label className="text-xs uppercase tracking-wider text-cream-300">Question *<input required minLength={2} maxLength={500} value={form.question} onChange={e => setForm({...form, question:e.target.value})} className="mt-1.5 w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-cream-100 normal-case"/></label>
        <label className="text-xs uppercase tracking-wider text-cream-300">Show on<select value={form.rug_catalog_id} onChange={e => setForm({...form, rug_catalog_id:e.target.value})} className="mt-1.5 w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-cream-100 normal-case"><option value="">All product pages</option>{rugs.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <label className="text-xs uppercase tracking-wider text-cream-300">Order<input type="number" min="0" max="10000" value={form.sort_order} onChange={e => setForm({...form, sort_order:e.target.value})} className="mt-1.5 w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-cream-100 normal-case"/></label>
      </div>
      <label className="block text-xs uppercase tracking-wider text-cream-300">Answer *<textarea required minLength={2} maxLength={10000} rows={4} value={form.answer} onChange={e => setForm({...form, answer:e.target.value})} className="mt-1.5 w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-cream-100 normal-case resize-y"/></label>
      <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm text-cream-300"><input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active:e.target.checked})}/> Visible on storefront</label><button disabled={saving} className="bg-gold-600 hover:bg-gold-500 text-white px-5 py-2.5 rounded-lg text-sm disabled:opacity-50"><Plus size={15} className="inline mr-1"/>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add FAQ'}</button></div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
    <div className="space-y-3">{items.map(item => <div key={item.id} className="bg-dark-900 border border-dark-700 rounded-xl p-4 flex gap-4"><div className="flex-1"><div className="flex gap-2 items-center"><p className="text-cream-100 font-medium">{item.question}</p>{!item.is_active && <span className="text-xs bg-dark-700 text-dark-300 px-2 py-0.5 rounded">Hidden</span>}</div><p className="text-dark-400 text-sm mt-1 whitespace-pre-line">{item.answer}</p><p className="text-dark-500 text-xs mt-2">{item.rug_catalog_id ? rugs.find(r => r.id === item.rug_catalog_id)?.name || `Catalog #${item.rug_catalog_id}` : 'All products'} · Order {item.sort_order}</p></div><button onClick={() => edit(item)} className="text-dark-400 hover:text-gold-400"><Pencil size={17}/></button><button onClick={() => remove(item.id)} className="text-dark-400 hover:text-red-400"><Trash2 size={17}/></button></div>)}{items.length === 0 && <p className="text-dark-400 text-sm py-8 text-center">No FAQs added yet.</p>}</div>
  </div>;
}
