import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, X } from 'lucide-react';
import type { CatalogSize, CatalogSizeMaster } from '../types';

interface SizesEditorProps {
  value: CatalogSize[];
  onChange: (sizes: CatalogSize[]) => void;
}

/**
 * Admin editor for a rug's standard sizes. Feet is required per row; cm is a
 * plain optional text field the vendor types themselves — never computed from
 * the feet value. A size with no cm entered simply isn't offered in cm mode on
 * the customer-facing site (see frontend/src/utils/size.ts).
 */
export default function SizesEditor({ value, onChange }: SizesEditorProps) {
  const [masterSizes, setMasterSizes] = useState<CatalogSizeMaster[]>([]);

  useEffect(() => {
    axios.get('/api/catalog-sizes').then(({ data }) => setMasterSizes(data)).catch(() => setMasterSizes([]));
  }, []);

  useEffect(() => {
    if (value.length > 0 || masterSizes.length === 0) return;
    const active = masterSizes.filter((size) => size.is_active);
    onChange(active.map((size, index) => ({ master_size_id: size.id, ft: size.ft, cm: size.cm, price: 0, lead_time_days: null, is_default: index === 0 })));
  }, [masterSizes, value.length, onChange]);

  const addRow = () => {
    const next = masterSizes.find((size) => size.is_active && !value.some((row) => row.master_size_id === size.id));
    if (next) onChange([...value, { master_size_id: next.id, ft: next.ft, cm: next.cm, price: 0, lead_time_days: null, is_default: value.length === 0 }]);
  };
  const removeRow = (i: number) => {
    const removedDefault = value[i]?.is_default;
    const next = value.filter((_, idx) => idx !== i);
    if (removedDefault && next.length > 0) next[0] = { ...next[0], is_default: true };
    onChange(next);
  };
  const updateRow = (i: number, field: 'ft' | 'cm' | 'price' | 'lead_time_days', v: string | number | null) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, [field]: v } : row)));
  const setDefault = (i: number) =>
    onChange(value.map((row, idx) => ({ ...row, is_default: idx === i })));

  return (
    <div className="space-y-1.5">
      <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">
        Available Sizes <span className="text-dark-500 normal-case font-normal">— dimensions come from Common Sizes</span>
      </label>

      <div className="space-y-2">
        {value.map((row, i) => (
          <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(110px,0.7fr)_minmax(100px,0.6fr)_auto] items-end gap-2">
            <label className="flex flex-col items-center gap-1 text-[10px] text-dark-400 cursor-pointer" title="Use this as the default storefront size">
              Default
              <input
                type="radio"
                name="default-rug-size"
                checked={Boolean(row.is_default)}
                onChange={() => setDefault(i)}
                className="accent-gold-500"
              />
            </label>
            <div>
              <label className="text-dark-400 text-[10px] block mb-1" htmlFor={`rug-size-ft-${i}`}>Size (ft)</label>
              <input
                id={`rug-size-ft-${i}`}
                value={row.ft}
                readOnly
                className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-dark-300 text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-dark-400 text-[10px] block mb-1" htmlFor={`rug-size-delivery-${i}`}>Delivery Days</label>
              <input
                id={`rug-size-delivery-${i}`}
                value={row.lead_time_days ?? ''}
                onChange={(e) => updateRow(i, 'lead_time_days', e.target.value === '' ? null : Number(e.target.value))}
                type="number"
                min="1"
                step="1"
                placeholder="Days"
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60"
              />
            </div>
            <div>
              <label className="text-dark-400 text-[10px] block mb-1" htmlFor={`rug-size-price-${i}`}>Total Price</label>
              <input
                id={`rug-size-price-${i}`}
                value={row.price ?? ''}
                onChange={(e) => updateRow(i, 'price', Number(e.target.value))}
                type="number"
                min="0"
                step="0.01"
                placeholder="Total price"
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60"
              />
            </div>
            <div>
              <label className="text-dark-400 text-[10px] block mb-1" htmlFor={`rug-size-cm-${i}`}>Size (cm, optional)</label>
              <input
                id={`rug-size-cm-${i}`}
                value={row.cm ?? ''}
                readOnly
                placeholder="Not set in master"
                className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-dark-300 text-sm placeholder-dark-600 cursor-not-allowed"
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-dark-400 text-[10px]">Remove</span>
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label={`Remove size ${row.ft || i + 1}`}
                className="h-[38px] text-dark-500 hover:text-red-400 transition-colors flex items-center"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        disabled={!masterSizes.some((size) => size.is_active && !value.some((row) => row.master_size_id === size.id))}
        className="flex items-center gap-1.5 text-gold-400 hover:text-gold-300 disabled:text-dark-600 text-xs font-medium transition-colors pt-1"
      >
        <Plus size={13} /> Add Next Common Size
      </button>
      <p className="text-dark-500 text-xs">Manage dimensions under Common Sizes. Set only price, delivery days, and the default option here.</p>
    </div>
  );
}
