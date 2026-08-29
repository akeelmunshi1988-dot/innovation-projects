import { Plus, X } from 'lucide-react';
import type { CatalogSize } from '../types';

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
  const addRow = () => onChange([...value, { ft: '', cm: '', is_default: value.length === 0 }]);
  const removeRow = (i: number) => {
    const removedDefault = value[i]?.is_default;
    const next = value.filter((_, idx) => idx !== i);
    if (removedDefault && next.length > 0) next[0] = { ...next[0], is_default: true };
    onChange(next);
  };
  const updateRow = (i: number, field: 'ft' | 'cm', v: string) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, [field]: v } : row)));
  const setDefault = (i: number) =>
    onChange(value.map((row, idx) => ({ ...row, is_default: idx === i })));

  return (
    <div className="space-y-1.5">
      <label className="text-cream-300 text-xs font-semibold uppercase tracking-wider">
        Available Sizes{' '}
        <span className="text-dark-500 normal-case font-normal">
          — feet required, cm optional (type it yourself; not calculated from feet)
        </span>
      </label>

      <div className="space-y-2">
        {value.map((row, i) => (
          <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
            <label className="flex flex-col items-center gap-1 text-[10px] text-dark-400 cursor-pointer" title="Use this as the default storefront size">
              <input
                type="radio"
                name="default-rug-size"
                checked={Boolean(row.is_default)}
                onChange={() => setDefault(i)}
                className="accent-gold-500"
              />
              Default
            </label>
            <input
              value={row.ft}
              onChange={(e) => updateRow(i, 'ft', e.target.value)}
              placeholder="6x9 (ft)"
              className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60"
            />
            <input
              value={row.cm ?? ''}
              onChange={(e) => updateRow(i, 'cm', e.target.value)}
              placeholder="183x274 (cm, optional)"
              className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/60"
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="text-dark-500 hover:text-red-400 transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 text-gold-400 hover:text-gold-300 text-xs font-medium transition-colors pt-1"
      >
        <Plus size={13} /> Add Size
      </button>
      <p className="text-dark-500 text-xs">The selected default size is used to calculate the total storefront price from material cost and margin.</p>
    </div>
  );
}
