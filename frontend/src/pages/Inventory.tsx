import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, CheckCircle, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { getInventory, restockMaterial, createMaterial, deleteMaterial } from '../services/api';
import type { Material } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { fmtTenant, CURRENCIES } from '../utils/currency';

const LOW_STOCK = 50;

const MATERIAL_TYPES = ['wool', 'silk', 'cotton', 'synthetic'];

const typeColors: Record<string, string> = {
  wool:      'bg-amber-900/30 text-amber-300 border-amber-700/30',
  silk:      'bg-purple-900/30 text-purple-300 border-purple-700/30',
  cotton:    'bg-blue-900/30 text-blue-300 border-blue-700/30',
  synthetic: 'bg-teal-900/30 text-teal-300 border-teal-700/30',
};

const BLANK_FORM = { name: '', type: 'wool', color: '', stock_meters: '', cost_per_sqm: '', cost_currency: '', is_available: true };

const Inventory: React.FC = () => {
  const { user } = useAuth();
  const tenant  = user!.tenant;

  const [materials, setMaterials]     = useState<Material[]>([]);
  const [loading, setLoading]         = useState(true);

  // restock
  const [restockId, setRestockId]     = useState<number | null>(null);
  const [restockQty, setRestockQty]   = useState('');
  const [restockNotes, setRestockNotes] = useState('');
  const [restocking, setRestocking]   = useState(false);

  // add material drawer
  const [showAdd, setShowAdd]         = useState(false);
  const [form, setForm]               = useState(BLANK_FORM);
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState('');

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const data = await getInventory();
      setMaterials(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInventory(); }, []);

  const handleRestock = async (materialId: number) => {
    const qty = parseFloat(restockQty);
    if (!qty || qty <= 0) return;
    setRestocking(true);
    try {
      await restockMaterial(materialId, qty, restockNotes || undefined);
      setRestockId(null); setRestockQty(''); setRestockNotes('');
      await fetchInventory();
    } finally {
      setRestocking(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSaveError('');
    try {
      await createMaterial({
        name:          form.name.trim(),
        type:          form.type,
        color:         form.color.trim(),
        stock_meters:  parseFloat(form.stock_meters) || 0,
        cost_per_sqm:  parseFloat(form.cost_per_sqm),
        cost_currency: form.cost_currency || tenant.base_currency,
        is_available:  form.is_available,
      });
      setShowAdd(false);
      setForm(BLANK_FORM);
      await fetchInventory();
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || 'Failed to add material.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true); setDeleteError('');
    try {
      await deleteMaterial(deleteTarget.id);
      setDeleteTarget(null);
      await fetchInventory();
    } catch (err: any) {
      setDeleteError(err.response?.data?.detail || 'Failed to delete material.');
      setDeleting(false);
    }
  };

  const lowStockCount = materials.filter((m) => m.stock_meters < LOW_STOCK).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Package size={22} className="text-gold-400" />
          <div>
            <h1 className="text-2xl font-bold text-cream-100">Inventory</h1>
            <p className="text-dark-400 text-sm">{materials.length} materials tracked</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-1.5">
              <AlertTriangle size={14} className="text-red-400" />
              <span className="text-red-300 text-sm font-medium">{lowStockCount} low stock</span>
            </div>
          )}
          <button onClick={fetchInventory} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => { setShowAdd(true); setSaveError(''); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Add Material
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Package size={40} className="text-dark-600" />
          <p className="text-dark-400 text-sm">No materials yet. Add your first material to get started.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Add Material
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {materials.map((material) => {
            const isLow       = material.stock_meters < LOW_STOCK;
            const stockPct    = Math.min((material.stock_meters / 500) * 100, 100);
            const isRestocking = restockId === material.id;

            return (
              <div key={material.id} className={`card space-y-4 ${isLow ? 'border-red-700/40' : ''}`}>
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-cream-100 font-semibold text-sm leading-snug">{material.name}</h3>
                      {isLow
                        ? <AlertTriangle size={13} className="text-red-400" />
                        : <CheckCircle size={13} className="text-green-400" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        typeColors[material.type] ?? 'bg-dark-700 text-dark-300 border-dark-600'
                      }`}>
                        {material.type}
                      </span>
                      <span className="text-dark-500 text-xs">{material.color}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="text-right">
                      <p className="text-cream-100 font-bold">{material.stock_meters.toFixed(0)}</p>
                      <p className="text-dark-500 text-xs">sqm</p>
                    </div>
                    <button
                      onClick={() => { setDeleteTarget(material); setDeleteError(''); }}
                      className="text-dark-600 hover:text-red-400 transition-colors p-0.5 mt-0.5"
                      title="Delete material"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Cost per sqm */}
                <div className="flex items-center justify-between bg-dark-800 rounded-lg px-3 py-2">
                  <span className="text-dark-400 text-xs uppercase tracking-wider">Cost / sqm</span>
                  <div className="text-right">
                    <span className="text-cream-100 font-semibold text-sm">
                      {fmtTenant(material.cost_per_sqm, tenant, material.cost_currency)}
                    </span>
                    {material.cost_currency && material.cost_currency !== tenant.currency && (
                      <span className="text-dark-500 text-xs ml-1">({material.cost_currency})</span>
                    )}
                  </div>
                </div>

                {/* Stock bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className={isLow ? 'text-red-400' : 'text-dark-400'}>
                      {isLow ? 'LOW STOCK' : 'In Stock'}
                    </span>
                    <span className="text-dark-400">{material.stock_meters.toFixed(1)} sqm</span>
                  </div>
                  <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isLow ? 'bg-red-500' : stockPct > 60 ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${stockPct}%` }}
                    />
                  </div>
                </div>

                {/* Availability */}
                <div className="flex items-center justify-between text-xs">
                  <span className={material.is_available ? 'text-green-400' : 'text-red-400'}>
                    {material.is_available ? '● Available' : '● Unavailable'}
                  </span>
                  <span className="text-dark-500">
                    {isLow
                      ? `Need ${(LOW_STOCK - material.stock_meters).toFixed(0)} sqm to reach safe level`
                      : 'Stock level: OK'}
                  </span>
                </div>

                {/* Restock form */}
                {isRestocking ? (
                  <div className="space-y-2 pt-2 border-t border-dark-700">
                    <input
                      type="number"
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value)}
                      placeholder="Quantity (sqm)"
                      min="1"
                      className="input-field w-full text-sm"
                    />
                    <input
                      type="text"
                      value={restockNotes}
                      onChange={(e) => setRestockNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      className="input-field w-full text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRestock(material.id)}
                        disabled={restocking || !restockQty}
                        className="btn-primary flex-1 text-sm py-2 disabled:opacity-50"
                      >
                        {restocking ? 'Saving...' : 'Confirm Restock'}
                      </button>
                      <button
                        onClick={() => { setRestockId(null); setRestockQty(''); setRestockNotes(''); }}
                        className="btn-secondary text-sm py-2 px-3"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setRestockId(material.id)}
                    className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
                  >
                    <Plus size={14} /> Restock
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Material Drawer ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-dark-950/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />

          {/* Panel */}
          <div className="w-full max-w-md bg-dark-900 border-l border-dark-700 flex flex-col shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
              <h2 className="text-cream-100 font-bold text-lg">Add Material</h2>
              <button onClick={() => setShowAdd(false)} className="text-dark-400 hover:text-cream-200 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAdd} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="space-y-1">
                <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Material Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. New Zealand Wool"
                  required
                  className="input-field w-full text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    required
                    className="input-field w-full text-sm"
                  >
                    {MATERIAL_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Color *</label>
                  <input
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    placeholder="e.g. Natural White"
                    required
                    className="input-field w-full text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Cost / sqm *</label>
                  <div className="flex gap-1.5">
                    <input
                      value={form.cost_per_sqm}
                      onChange={(e) => setForm((f) => ({ ...f, cost_per_sqm: e.target.value }))}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      required
                      className="input-field flex-1 min-w-0 text-sm"
                    />
                    <select
                      value={form.cost_currency || tenant.base_currency}
                      onChange={(e) => setForm((f) => ({ ...f, cost_currency: e.target.value }))}
                      className="input-field w-20 text-sm px-2"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.code}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Initial Stock (sqm)</label>
                  <input
                    value={form.stock_meters}
                    onChange={(e) => setForm((f) => ({ ...f, stock_meters: e.target.value }))}
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="0"
                    className="input-field w-full text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, is_available: !f.is_available }))}
                  className="relative flex-shrink-0"
                >
                  <div className={`w-10 h-5 rounded-full transition-colors ${form.is_available ? 'bg-gold-600' : 'bg-dark-700'}`} />
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_available ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-cream-300 text-sm">{form.is_available ? 'Mark as available' : 'Mark as unavailable'}</span>
              </div>

              {saveError && (
                <div className="flex items-center gap-2 bg-red-900/20 border border-red-600/30 rounded-lg p-3 text-red-400 text-sm">
                  <AlertTriangle size={13} className="flex-shrink-0" /> {saveError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                    : <><Plus size={15} /> Add Material</>}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary px-4">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Dialog ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/70 backdrop-blur-sm">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-cream-100 font-bold">Delete Material?</h3>
                <p className="text-dark-400 text-sm mt-0.5">"{deleteTarget.name}" will be permanently removed.</p>
              </div>
            </div>

            <p className="text-dark-300 text-xs bg-dark-800 border border-dark-700 rounded-lg px-3 py-2">
              If this material is assigned to any rug in the catalog, deletion will be blocked. Remove it from the catalog first.
            </p>

            {deleteError && (
              <div className="flex items-center gap-2 bg-red-900/20 border border-red-600/30 rounded-lg p-3 text-red-400 text-sm">
                <AlertTriangle size={13} className="flex-shrink-0" /> {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {deleting
                  ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting…</>
                  : 'Yes, Delete'}
              </button>
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(''); }}
                className="btn-secondary px-5 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
