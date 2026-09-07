import { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowDown, ArrowUp, Check, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getCatalog } from '../services/api';
import type { RugCatalog } from '../types';

export default function TrendingRugs() {
  const { user, updateTenant } = useAuth();
  const tenant = user!.tenant;
  const [catalog, setCatalog] = useState<RugCatalog[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>(tenant.trending_rug_ids ?? []);
  const [pickerId, setPickerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCatalog().then(setCatalog).catch(() => setError('Could not load the rug catalog.')).finally(() => setLoadingCatalog(false));
  }, []);

  const dirty = () => setSaved(false);
  const rugById = (id: number) => catalog.find((r) => r.id === id);
  const availableToAdd = catalog.filter((r) => !selectedIds.includes(r.id));

  const addSelected = () => {
    const id = Number(pickerId);
    if (!id || selectedIds.includes(id)) return;
    setSelectedIds((current) => [...current, id]);
    setPickerId('');
    dirty();
  };
  const removeSelected = (id: number) => {
    setSelectedIds((current) => current.filter((rid) => rid !== id));
    dirty();
  };
  const moveSelected = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= selectedIds.length) return;
    setSelectedIds((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    dirty();
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const { data } = await axios.patch('/api/tenant/settings', { trending_rug_ids: selectedIds });
      updateTenant(data);
      setSelectedIds(data.trending_rug_ids ?? []);
      setSaved(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not save this section.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-cream-100">Latest Trending Rug Designs</h1>
          <p className="text-dark-400 text-sm mt-1">
            Pick specific rugs for the homepage's "Latest Trending Rug Designs" section, in the order they should appear.
            Leave this list empty to show the newest rugs automatically, as it does today.
          </p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
          {saved ? <Check size={16} /> : <Save size={16} />} {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
      </div>

      {error && <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>}

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pickerId}
            onChange={(e) => setPickerId(e.target.value)}
            disabled={loadingCatalog || availableToAdd.length === 0}
            className="input-field flex-1 min-w-[200px] disabled:opacity-50"
          >
            <option value="">{loadingCatalog ? 'Loading rugs…' : availableToAdd.length === 0 ? 'All rugs added' : 'Select a rug to add…'}</option>
            {availableToAdd.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button type="button" onClick={addSelected} disabled={!pickerId} className="btn-secondary text-sm disabled:opacity-50">Add</button>
        </div>

        {selectedIds.length === 0 ? (
          <p className="text-dark-500 text-sm italic">No rugs selected — the homepage section falls back to the newest rugs automatically.</p>
        ) : (
          <div className="space-y-2">
            {selectedIds.map((id, index) => {
              const rug = rugById(id);
              return (
                <div key={id} className="flex items-center gap-3 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5">
                  <span className="text-dark-500 text-xs w-5 text-right">{index + 1}</span>
                  {rug?.image_url && <img src={rug.image_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />}
                  <span className="text-cream-100 text-sm flex-1 truncate">{rug ? rug.name : `Rug #${id} (no longer exists)`}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button type="button" onClick={() => moveSelected(index, -1)} disabled={index === 0} className="p-1.5 text-dark-400 hover:text-cream-100 disabled:opacity-30 transition-colors"><ArrowUp size={14} /></button>
                    <button type="button" onClick={() => moveSelected(index, 1)} disabled={index === selectedIds.length - 1} className="p-1.5 text-dark-400 hover:text-cream-100 disabled:opacity-30 transition-colors"><ArrowDown size={14} /></button>
                    <button type="button" onClick={() => removeSelected(id)} className="p-1.5 text-dark-400 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
