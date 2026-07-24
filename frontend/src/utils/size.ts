export const SIZE_UNITS = [
  { code: 'ft', label: 'Feet (ft)' },
  { code: 'cm', label: 'Centimetres (cm)' },
];

const FT_TO_CM = 30.48;

function parseSize(size: string): [number, number] | null {
  const parts = size.split('x').map((p) => parseFloat(p.trim()));
  if (parts.length !== 2 || parts.some((p) => !Number.isFinite(p))) return null;
  return [parts[0], parts[1]];
}

/**
 * `size` is stored canonically in feet, e.g. "4x6". Formats for display in the
 * given unit — sizes are never converted at rest, only at render time.
 */
export function fmtSize(size: string, unit: string = 'ft'): string {
  const parsed = parseSize(size);
  if (!parsed) return size;
  const [w, h] = parsed;
  if (unit === 'cm') {
    return `${Math.round(w * FT_TO_CM)}x${Math.round(h * FT_TO_CM)} cm`;
  }
  return `${size} ft`;
}

/** Area in square metres for a feet-denominated stored size string. */
export function sizeAreaSqm(size: string): number | null {
  const parsed = parseSize(size);
  if (!parsed) return null;
  const [w, h] = parsed;
  return ((w * FT_TO_CM) / 100) * ((h * FT_TO_CM) / 100);
}

/** Converts a feet-denominated catalog dimension into the given display unit. */
export function feetToUnit(valueFt: number, unit: string): number {
  return unit === 'cm' ? Math.round(valueFt * FT_TO_CM) : valueFt;
}

/** Converts a value entered in the given display unit into metres (the unit quote pricing is denominated in). */
export function toMetres(value: number, unit: string): number {
  if (!Number.isFinite(value)) return 0;
  return unit === 'cm' ? value / 100 : value * 0.3048;
}

/**
 * Formats a single dimension already stored in metres (e.g. Quote.custom_size_w/h)
 * as a plain number string in the given display unit — no unit suffix, so callers
 * can compose it with their own separator/label, e.g. `${fmtDim(w, unit)}x${fmtDim(h, unit)} ${unit}`.
 */
export function fmtDim(valueM: number, unit: string): string {
  if (!Number.isFinite(valueM)) return '';
  return unit === 'cm' ? String(Math.round(valueM * 100)) : (valueM / 0.3048).toFixed(1);
}

/**
 * Formats a full width×height (or diameter, for circle) display string from
 * metres-denominated stored dimensions, e.g. for quote/order size fields.
 */
export function fmtDims(
  wM: number | null | undefined,
  hM: number | null | undefined,
  unit: string,
  shape: string = 'rect',
): string {
  if (wM == null || !Number.isFinite(wM)) return '—';
  const w = fmtDim(wM, unit);
  if (shape === 'circle') return `⌀ ${w} ${unit}`;
  if (hM == null || !Number.isFinite(hM)) return '—';
  const h = fmtDim(hM, unit);
  return shape === 'oval' ? `${w}x${h} ${unit} (oval)` : `${w}x${h} ${unit}`;
}
