export const SIZE_UNITS = [
  { code: 'ft', label: 'Feet (ft)' },
  { code: 'cm', label: 'Centimetres (cm)' },
  { code: 'both', label: 'Both (ft & cm)' },
];

import type { CatalogSize } from '../types';

const FT_TO_CM = 30.48;

function parseSize(size: string): [number, number] | null {
  const parts = size.split('x').map((p) => parseFloat(p.trim()));
  if (parts.length !== 2 || parts.some((p) => !Number.isFinite(p))) return null;
  return [parts[0], parts[1]];
}

/**
 * Sizes are entered/stored/priced canonically in feet — `unit` only ever
 * controls how a number is displayed or how a typed input is interpreted.
 * "both" is a display-only mode (show ft and cm together); anywhere a single
 * input widget needs one concrete unit to operate in (min/step/placeholder,
 * ft<->metres conversion), normalize "both" down to "ft" with this first.
 */
export function inputUnit(unit: string): 'ft' | 'cm' {
  return unit === 'cm' ? 'cm' : 'ft';
}

/**
 * Formats a catalog size for display in the given unit. Returns `null` when
 * `unit` is "cm" and the vendor hasn't entered a cm value for this size —
 * callers should skip/hide that size in cm mode rather than fall back to a
 * computed conversion (see CatalogSize's docstring for why).
 */
export function fmtSize(size: CatalogSize, unit: string = 'ft'): string | null {
  if (unit === 'cm') return size.cm ? `${size.cm} cm` : null;
  if (unit === 'both') return size.cm ? `${size.ft} ft (${size.cm} cm)` : `${size.ft} ft`;
  return `${size.ft} ft`;
}

/** Area in square metres for a catalog size — always computed from the required
 * `ft` field, regardless of display unit, since that's the canonical stored
 * dimension pricing is based on (a vendor-entered `cm` label is cosmetic only). */
export function catalogSizeAreaSqm(size: CatalogSize): number | null {
  const parsed = parseSize(size.ft);
  if (!parsed) return null;
  const [w, h] = parsed;
  return ((w * FT_TO_CM) / 100) * ((h * FT_TO_CM) / 100);
}

/**
 * Parses the stored width/height for a catalog size in the given unit, reading
 * the vendor-entered value verbatim (no conversion) — e.g. for populating a
 * quote form when a customer clicks a preset size button. Returns null if that
 * unit isn't available for this size (cm not entered).
 */
export function catalogSizeDims(size: CatalogSize, unit: 'ft' | 'cm'): [number, number] | null {
  if (unit === 'cm') return size.cm ? parseSize(size.cm) : null;
  return parseSize(size.ft);
}

/** Converts a feet-denominated *custom* (non-catalog) dimension into the given
 * display unit — for room-measurement inputs, not vendor-entered catalog sizes. */
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
  if (unit === 'both') {
    const ft = fmtDims(wM, hM, 'ft', shape);
    const cm = fmtDims(wM, hM, 'cm', shape);
    return `${ft} (${cm})`;
  }
  const w = fmtDim(wM, unit);
  if (shape === 'circle') return `⌀ ${w} ${unit}`;
  if (hM == null || !Number.isFinite(hM)) return '—';
  const h = fmtDim(hM, unit);
  return shape === 'oval' ? `${w}x${h} ${unit} (oval)` : `${w}x${h} ${unit}`;
}
