export const SIZE_UNITS = [
  { code: 'ft', label: 'Feet (ft)' },
  { code: 'cm', label: 'Centimetres (cm)' },
  { code: 'both', label: 'Both (ft & cm)' },
];

import type { CatalogSize } from '../types';

const FT_TO_CM = 30.48;

// Matches only a plain "6x9"-style compact size — used to decide whether a
// stored ft/cm string needs its unit suffix appended (see fmtSize) or is
// already a complete, free-text label (e.g. "3 round ft") that should be
// shown verbatim rather than double-suffixed into "3 round ft ft".
const COMPACT_SIZE_RE = /^\d+(\.\d+)?\s*x\s*\d+(\.\d+)?$/i;

function parseSize(size: string): [number, number] | null {
  const parts = size.split('x').map((p) => parseFloat(p.trim()));
  if (parts.length === 2 && parts.every((p) => Number.isFinite(p))) return [parts[0], parts[1]];
  // No "x" separator — a round/diameter-only size (e.g. "3 round ft") has a
  // single leading number instead of width x height. Treat that number as
  // both dimensions (a circle's bounding square) so it flows through the
  // same width/height-based area/quote-form logic as every other size,
  // without needing a separate "round" code path throughout the app.
  const single = parseFloat(size.trim());
  return Number.isFinite(single) ? [single, single] : null;
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
// Appends the unit label only to a plain "6x9"-style value; a free-text
// label like "3 round ft" or "90 round cm" already reads as a complete
// phrase and is shown verbatim instead of becoming "3 round ft ft".
function withUnitSuffix(value: string, unitLabel: string): string {
  return COMPACT_SIZE_RE.test(value) ? `${value} ${unitLabel}` : value;
}

export function fmtSize(size: CatalogSize, unit: string = 'ft'): string | null {
  if (unit === 'cm') return size.cm ? withUnitSuffix(size.cm, 'cm') : null;
  if (unit === 'both') return size.cm ? `${withUnitSuffix(size.ft, 'ft')} (${withUnitSuffix(size.cm, 'cm')})` : withUnitSuffix(size.ft, 'ft');
  return withUnitSuffix(size.ft, 'ft');
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

/** Ascending numeric feet dimensions, without mutating the source list. */
export function compareSizes(a: { ft: string }, b: { ft: string }): number {
  const dimensions = (value: string) => {
    const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(?:ft|feet|')?\s*[x×X]\s*(\d+(?:\.\d+)?)/);
    return match ? [Number(match[1]), Number(match[2])] : null;
  };
  const left = dimensions(a.ft), right = dimensions(b.ft);
  if (left && right) return left[0] - right[0] || left[1] - right[1];
  if (left) return -1;
  if (right) return 1;
  return a.ft.localeCompare(b.ft, undefined, { numeric: true });
}

export function sortSizes<T extends { ft: string }>(sizes: readonly T[]): T[] {
  return [...sizes].sort(compareSizes);
}
