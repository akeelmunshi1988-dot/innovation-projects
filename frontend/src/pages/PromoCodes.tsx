import React, { useEffect, useState } from 'react';
import { Tag, Plus, Pencil, Trash2, X, AlertTriangle, RefreshCw, Percent, IndianRupee, Truck } from 'lucide-react';
import { getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode } from '../services/api';
import type { PromoCode } from '../types';

type FormData = {
  code: string;
  discount_type: 'percentage' | 'flat' | 'free_shipping';
  discount_value: string;
  min_order_value: string;
  max_uses: string;
  one_per_customer: boolean;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
};

const BLANK: FormData = {
  code: '', discount_type: 'percentage', discount_value: '', min_order_value: '',
  max_uses: '', one_per_customer: false, starts_at: '', expires_at: '', is_active: true,
};

// datetime-local inputs want "YYYY-MM-DDTHH:mm"; ISO strings from the API carry seconds/offset
const toLocalInput = (iso: string | null): string => (iso ? iso.slice(0, 16) : '');

function promoToForm(p: PromoCode): FormData {
  return {
    code: p.code,
    discount_type: p.discount_type,
    discount_value: p.discount_value != null ? String(p.discount_value) : '',
    min_order_value: p.min_order_value != null ? String(p.min_order_value) : '',
    max_uses: p.max_uses != null ? String(p.max_uses) : '',
    one_per_customer: p.one_per_customer,
    starts_at: toLocalInput(p.starts_at),
    expires_at: toLocalInput(p.expires_at),
    is_active: p.is_active,
  };
}

const TYPE_LABEL: Record<FormData['discount_type'], string> = {
  percentage: 'Percentage off', flat: 'Flat amount off', free_shipping: 'Free shipping',
};
const TYPE_ICON: Record<FormData['discount_type'], React.ReactNode> = {
  percentage: <Percent size={12} />, flat: <IndianRupee size={12} />, free_shipping: <Truck size={12} />,
};

interface DrawerProps {
  editing: PromoCode | null;
  onClose: () => void;
  onSaved: (p: PromoCode) => void;
}

function PromoDrawer({ editing, onClose, onSaved }: DrawerProps) {
  const [form, setForm] = useState<FormData>(editing ? promoToForm(editing) : BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof FormData>(field: K, value: FormData[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) { setError('Code is required.'); return; }
    if (form.discount_type !== 'free_shipping' && !form.discount_value) {
      setError('Enter a discount value.'); return;
    }
    setSaving(true);
    setError('');
    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: form.discount_type === 'free_shipping' ? null : parseFloat(form.discount_value),
      min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : null,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      one_per_customer: form.one_per_customer,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      is_active: form.is_active,
    };
    try {
      const saved = editing
        ? await updatePromoCode(editing.id, payload)
        : await createPromoCode(payload);
      onSaved(saved);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-dark-900 border-l border-dark-700 z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700 flex-shrink-0">
          <h2 className="text-cream-100 font-bold text-base">
            {editing ? 'Edit Promo Code' : 'Add Promo Code'}
          </h2>
          <button onClick={onClose} className="text-dark-500 hover:text-cream-300 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Code *</label>
            <input
              value={form.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
              placeholder="e.g. WELCOME10"
              required
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 uppercase focus:outline-none focus:border-gold-600/60"
            />
            <p className="text-dark-500 text-xs">What customers type at checkout. Not case-sensitive.</p>
          </div>

          <div className="space-y-1">
            <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Discount Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['percentage', 'flat', 'free_shipping'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('discount_type', t)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-xs transition-colors ${
                    form.discount_type === t
                      ? 'bg-gold-600/15 border-gold-600/60 text-gold-300'
                      : 'bg-dark-800 border-dark-700 text-dark-300 hover:border-dark-600'
                  }`}
                >
                  {TYPE_ICON[t]}
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
            {form.discount_type === 'free_shipping' && (
              <p className="text-amber-400/80 text-xs">
                Note: shipping charges aren't part of checkout pricing yet, so this currently has no effect on the amount charged — it's tracked and ready for when shipping rates ship.
              </p>
            )}
          </div>

          {form.discount_type !== 'free_shipping' && (
            <div className="space-y-1">
              <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">
                {form.discount_type === 'percentage' ? 'Percentage Off (%) *' : 'Amount Off *'}
              </label>
              <input
                value={form.discount_value}
                onChange={(e) => set('discount_value', e.target.value)}
                type="number"
                min="0"
                max={form.discount_type === 'percentage' ? '100' : undefined}
                step="0.01"
                placeholder={form.discount_type === 'percentage' ? '10' : '500'}
                required
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Minimum Order Value</label>
              <input
                value={form.min_order_value}
                onChange={(e) => set('min_order_value', e.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="Optional"
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60"
              />
            </div>
            <div className="space-y-1">
              <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Total Use Cap</label>
              <input
                value={form.max_uses}
                onChange={(e) => set('max_uses', e.target.value)}
                type="number"
                min="1"
                placeholder="Unlimited"
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Starts</label>
              <input
                value={form.starts_at}
                onChange={(e) => set('starts_at', e.target.value)}
                type="datetime-local"
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm focus:outline-none focus:border-gold-600/60"
              />
            </div>
            <div className="space-y-1">
              <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">Expires</label>
              <input
                value={form.expires_at}
                onChange={(e) => set('expires_at', e.target.value)}
                type="datetime-local"
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm focus:outline-none focus:border-gold-600/60"
              />
            </div>
          </div>
          <p className="text-dark-500 text-xs -mt-2">Leave either blank for no start/end limit.</p>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => set('one_per_customer', !form.one_per_customer)} className="relative flex-shrink-0">
                <div className={`w-10 h-5 rounded-full transition-colors ${form.one_per_customer ? 'bg-gold-600' : 'bg-dark-700'}`} />
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.one_per_customer ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-cream-300 text-sm">One use per customer</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => set('is_active', !form.is_active)} className="relative flex-shrink-0">
              <div className={`w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-gold-600' : 'bg-dark-700'}`} />
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-cream-300 text-sm">{form.is_active ? 'Active' : 'Disabled'}</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-600/30 rounded-lg p-3 text-red-400 text-sm">
              <AlertTriangle size={13} className="flex-shrink-0" /> {error}
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
                : editing ? 'Save Changes' : <><Plus size={15} /> Add Promo Code</>}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary px-4">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function formatDiscount(p: PromoCode): string {
  if (p.discount_type === 'percentage') return `${p.discount_value}% off`;
  if (p.discount_type === 'flat') return `${p.discount_value} off`;
  return 'Free shipping';
}

export default function PromoCodes() {
  const [items, setItems] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await getPromoCodes();
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSaved = () => {
    setShowDrawer(false);
    setEditing(null);
    fetchItems();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePromoCode(deleteTarget.id);
      setDeleteTarget(null);
      await fetchItems();
    } finally {
      setDeleting(false);
    }
  };

  const isExpired = (p: PromoCode) => p.expires_at != null && new Date(p.expires_at) < new Date();
  const isMaxedOut = (p: PromoCode) => p.max_uses != null && p.used_count >= p.max_uses;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Tag size={22} className="text-gold-400" />
          <div>
            <h1 className="text-2xl font-bold text-cream-100">Promo Codes</h1>
            <p className="text-dark-400 text-sm">Discount codes customers can apply in the cart and at checkout.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchItems} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => { setEditing(null); setShowDrawer(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Add Promo Code
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Tag size={40} className="text-dark-600" />
          <p className="text-dark-400 text-sm">No promo codes yet.</p>
          <button onClick={() => { setEditing(null); setShowDrawer(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Add Promo Code
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((p) => {
            const expired = isExpired(p);
            const maxedOut = isMaxedOut(p);
            const effectivelyInactive = !p.is_active || expired || maxedOut;
            return (
              <div key={p.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-cream-100 font-mono font-bold text-base tracking-wide truncate">{p.code}</p>
                    <p className="text-dark-400 text-xs mt-0.5 flex items-center gap-1">
                      {TYPE_ICON[p.discount_type]} {formatDiscount(p)}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${
                    effectivelyInactive ? 'bg-dark-700 text-dark-300 border-dark-600' : 'bg-green-900/30 text-green-300 border-green-700/30'
                  }`}>
                    {!p.is_active ? 'Disabled' : expired ? 'Expired' : maxedOut ? 'Limit reached' : 'Active'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-dark-400">
                  {p.min_order_value != null && <p>Min order: {p.min_order_value}</p>}
                  {p.max_uses != null && <p>Used {p.used_count} / {p.max_uses}</p>}
                  {p.max_uses == null && p.used_count > 0 && <p>Used {p.used_count} time{p.used_count !== 1 ? 's' : ''}</p>}
                  {p.one_per_customer && <p>Limit: one use per customer</p>}
                  {p.expires_at && <p>Expires: {new Date(p.expires_at).toLocaleString()}</p>}
                </div>

                <div className="flex items-center justify-between text-xs text-dark-500 pt-2 border-t border-dark-800">
                  <span>Created {new Date(p.created_at).toLocaleDateString()}</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setEditing(p); setShowDrawer(true); }} className="flex items-center gap-1 text-dark-400 hover:text-cream-200 transition-colors">
                      <Pencil size={13} /> Edit
                    </button>
                    <button onClick={() => setDeleteTarget(p)} className="flex items-center gap-1 text-dark-400 hover:text-red-400 transition-colors">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showDrawer && (
        <PromoDrawer
          editing={editing}
          onClose={() => { setShowDrawer(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/70 backdrop-blur-sm">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-cream-100 font-bold">Delete Promo Code?</h3>
                <p className="text-dark-400 text-sm mt-0.5">"{deleteTarget.code}" will no longer be redeemable.</p>
              </div>
            </div>
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
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary px-5 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
