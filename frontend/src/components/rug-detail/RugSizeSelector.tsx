import { Check } from 'lucide-react';
import { fmtSize, sortSizes } from '../../utils/size';
import type { CatalogSize } from '../../types';

interface RugSizeSelectorProps {
  sizes: CatalogSize[];
  unit: 'ft' | 'cm';
  onUnitChange: (unit: 'ft' | 'cm') => void;
  /** The selected catalog size's `ft` key; ignored while `custom` is true. */
  selectedKey: string | null;
  onSelect: (size: CatalogSize) => void;
  custom: boolean;
  onSelectCustom: () => void;
  customWidth: string;
  customLength: string;
  onCustomChange: (width: string, length: string) => void;
  customError: string | null;
}

// "6x9 ft" -> "6 × 9 ft" for display only; free-text labels pass through.
const prettySize = (label: string) => label.replace(/(\d)\s*[x×]\s*(\d)/i, '$1 × $2');

const tileClass = (selected: boolean) =>
  `relative flex min-h-[52px] items-center justify-center px-3 py-3 text-sm tracking-wide transition-all duration-300 motion-safe:active:scale-[0.98] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-showroom-charcoal ${
    selected
      ? 'border border-showroom-charcoal bg-showroom-charcoal text-white'
      : 'border border-showroom-border bg-white text-showroom-charcoal hover:border-showroom-gold'
  }`;

/**
 * Catalog sizes as selectable tiles plus a Custom Size option. A size with no
 * vendor-entered cm value is hidden in cm mode rather than shown with a
 * computed conversion — the rule documented in utils/size.ts.
 */
export default function RugSizeSelector({
  sizes, unit, onUnitChange, selectedKey, onSelect,
  custom, onSelectCustom, customWidth, customLength, onCustomChange, customError,
}: RugSizeSelectorProps) {
  const visible = sortSizes(sizes).filter((size) => fmtSize(size, unit));

  return (
    <fieldset aria-labelledby="rug-size-label" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span id="rug-size-label" className="text-[11px] font-medium uppercase tracking-[0.22em] text-showroom-charcoal">Select Size</span>
        <div className="flex items-center border border-showroom-border p-0.5" role="group" aria-label="Measurement unit">
          {(['ft', 'cm'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onUnitChange(option)}
              aria-pressed={unit === option}
              className={`px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] transition-colors duration-300 ${
                unit === option ? 'bg-showroom-charcoal text-white' : 'text-showroom-grey hover:text-showroom-charcoal'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visible.map((size) => {
          const selected = !custom && selectedKey === size.ft;
          return (
            <button
              key={size.ft}
              type="button"
              onClick={() => onSelect(size)}
              aria-pressed={selected}
              className={tileClass(selected)}
            >
              {prettySize(fmtSize(size, unit) ?? size.ft)}
              {selected && <Check size={12} strokeWidth={2} className="absolute right-2 top-2 text-showroom-gold" aria-hidden="true" />}
            </button>
          );
        })}
        <button type="button" onClick={onSelectCustom} aria-pressed={custom} aria-controls="custom-size-fields" className={tileClass(custom)}>
          Custom Size
          {custom && <Check size={12} strokeWidth={2} className="absolute right-2 top-2 text-showroom-gold" aria-hidden="true" />}
        </button>
      </div>

      {sizes.length > 0 && visible.length === 0 && (
        <p className="text-xs italic text-showroom-grey">
          No standard sizes listed in {unit} — switch to {unit === 'cm' ? 'ft' : 'cm'} or choose Custom Size.
        </p>
      )}

      {custom && (
        <div id="custom-size-fields" className="space-y-2 border-l border-showroom-gold/60 pl-4 motion-safe:animate-[showroom-fade_350ms_ease-out]">
          <div className="grid grid-cols-2 gap-3">
            {([
              ['custom-size-width', 'Width', customWidth, (value: string) => onCustomChange(value, customLength)],
              ['custom-size-length', 'Length', customLength, (value: string) => onCustomChange(customWidth, value)],
            ] as const).map(([id, label, value, change]) => (
              <div key={id}>
                <label htmlFor={id} className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-showroom-grey">
                  {label} ({unit})
                </label>
                <input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  min="0.1"
                  step={unit === 'cm' ? '1' : '0.1'}
                  value={value}
                  onChange={(event) => change(event.target.value)}
                  aria-invalid={Boolean(customError) && !(parseFloat(value) > 0)}
                  aria-describedby={customError ? 'custom-size-error' : undefined}
                  className="w-full border border-showroom-border bg-white px-3 py-2.5 text-sm text-showroom-charcoal transition-colors focus:border-showroom-charcoal focus:outline-none"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-showroom-grey">Woven to your exact measurements. Use the ft / cm switch above to change units.</p>
          {customError && <p id="custom-size-error" role="alert" className="text-xs text-red-700">{customError}</p>}
        </div>
      )}
    </fieldset>
  );
}
