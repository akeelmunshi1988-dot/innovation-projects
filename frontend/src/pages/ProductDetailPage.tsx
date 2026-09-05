import { useState } from 'react';
import axios from 'axios';
import { ArrowDown, ArrowUp, Check, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import RichTextEditor from '../components/RichTextEditor';
import type { ProductAccordionSection } from '../types';

const labelClass = 'block text-cream-300 text-xs font-semibold uppercase tracking-wider';
const fieldClass = 'input-field w-full text-sm';

let nextSectionId = 0;
const newSectionId = () => `new-${Date.now()}-${nextSectionId++}`;

// Defined at module scope (not inside ProductDetailPage) so its identity stays stable
// across re-renders — a component nested inside another component's body gets a new
// function reference on every render, which makes React remount the whole subtree
// (losing focus/input state) on every keystroke. See AboutPage.tsx for the same fix.
const SectionEditor = ({
  section,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  section: ProductAccordionSection;
  index: number;
  count: number;
  onChange: (patch: Partial<ProductAccordionSection>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) => (
  <div className="rounded-lg border border-dark-700 bg-dark-800 p-4 space-y-3">
    <div className="flex items-center justify-between gap-3">
      <input
        value={section.title}
        placeholder="Section title (e.g. Rug Sample)"
        maxLength={160}
        onChange={(e) => onChange({ title: e.target.value })}
        className={`${fieldClass} font-medium`}
      />
      <div className="flex items-center gap-1 flex-shrink-0">
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="rounded p-1.5 text-dark-400 hover:text-cream-200 disabled:opacity-30" title="Move up">
          <ArrowUp size={14} />
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} className="rounded p-1.5 text-dark-400 hover:text-cream-200 disabled:opacity-30" title="Move down">
          <ArrowDown size={14} />
        </button>
        <button type="button" onClick={onRemove} className="rounded p-1.5 text-red-400 hover:text-red-300" title="Remove section">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
    <RichTextEditor
      value={section.html}
      onChange={(html) => onChange({ html })}
      placeholder="Content shown when a customer expands this section on the rug detail page."
    />
  </div>
);

/**
 * Groups every tenant-wide block that renders on the storefront rug detail page
 * (`CustomerRugDetail`) into one admin screen. These fields previously lived
 * scattered through the giant Business Settings → General tab.
 *
 * All fields are plain `PATCH /api/tenant/settings` columns — no dedicated
 * backend route needed. The "Product Details" accordion itself is fixed (its
 * fields — material, weave, pile, color, additional notes — come from each
 * catalog entry, not from here); the sections below it are an open-ended list
 * the vendor can add to or remove from freely.
 */
export default function ProductDetailPage() {
  const { user, updateTenant } = useAuth();
  const tenant = user!.tenant;

  const [defaultNotes, setDefaultNotes] = useState(tenant.default_catalog_additional_information_html ?? '');
  const [sections, setSections] = useState<ProductAccordionSection[]>(tenant.product_accordion_sections ?? []);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const touched = () => setSaved(false);

  const dirty =
    defaultNotes !== (tenant.default_catalog_additional_information_html ?? '') ||
    JSON.stringify(sections) !== JSON.stringify(tenant.product_accordion_sections ?? []);

  const updateSection = (index: number, patch: Partial<ProductAccordionSection>) => {
    setSections((current) => current.map((section, i) => (i === index ? { ...section, ...patch } : section)));
    touched();
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    setSections((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    touched();
  };

  const removeSection = (index: number) => {
    setSections((current) => current.filter((_, i) => i !== index));
    touched();
  };

  const addSection = () => {
    setSections((current) => [...current, { id: newSectionId(), title: '', html: '' }]);
    touched();
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const { data } = await axios.patch('/api/tenant/settings', {
        default_catalog_additional_information_html: defaultNotes,
        product_accordion_sections: sections,
      });
      updateTenant(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not save the product detail content.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cream-100">Product Detail Page</h1>
          <p className="mt-1 text-sm text-dark-400">
            Shared content shown on every storefront rug detail page. Per-rug overrides still live on each catalog entry.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-gold-500 disabled:opacity-50"
        >
          {saved ? <Check size={16} /> : <Save size={16} />} {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      <section className="space-y-6 rounded-xl border border-dark-700 bg-dark-900 p-5">
        <div className="space-y-1.5">
          <label className={labelClass}>Default Product Notes &amp; Information</label>
          <RichTextEditor
            value={defaultNotes}
            onChange={(html) => { setDefaultNotes(html); touched(); }}
            placeholder="Add common care instructions, delivery notes, disclaimers, or other information that should appear on every product."
          />
          <p className="text-dark-500 text-xs">
            Shown under Description on every rug unless that catalog entry has its own Additional Notes &amp; Information override.
          </p>
        </div>

        <div className="border-t border-dark-700 pt-6 space-y-4">
          <div>
            <h2 className="text-cream-100 font-semibold text-sm">Expandable Sections</h2>
            <p className="text-dark-500 text-xs mt-1">
              Shown as collapsible sections on every rug detail page, right after the fixed "Product Details" section. Add as
              many as you need, in any order.
            </p>
          </div>

          {sections.length === 0 && (
            <p className="text-dark-500 text-xs italic">No sections yet — add one below.</p>
          )}

          <div className="space-y-3">
            {sections.map((section, index) => (
              <SectionEditor
                key={section.id}
                section={section}
                index={index}
                count={sections.length}
                onChange={(patch) => updateSection(index, patch)}
                onMove={(direction) => moveSection(index, direction)}
                onRemove={() => removeSection(index)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addSection}
            className="flex items-center gap-2 rounded-lg border border-dashed border-dark-600 px-3 py-2 text-xs text-dark-300 hover:text-cream-200"
          >
            <Plus size={13} /> Add section
          </button>
        </div>
      </section>
    </div>
  );
}
