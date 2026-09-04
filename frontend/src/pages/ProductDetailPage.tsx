import { useState } from 'react';
import axios from 'axios';
import { Check, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import RichTextEditor from '../components/RichTextEditor';

/**
 * Groups every tenant-wide block that renders on the storefront rug detail page
 * (`CustomerRugDetail`) into one admin screen. These fields previously lived
 * scattered through the giant Business Settings → General tab.
 *
 * All four fields are plain `PATCH /api/tenant/settings` columns — no dedicated
 * backend route needed.
 */
export default function ProductDetailPage() {
  const { user, updateTenant } = useAuth();
  const tenant = user!.tenant;

  const [defaultNotes, setDefaultNotes] = useState(tenant.default_catalog_additional_information_html ?? '');
  const [rugSample, setRugSample] = useState(tenant.rug_sample_information_html ?? '');
  const [careAdvice, setCareAdvice] = useState(tenant.rug_care_advice_html ?? '');
  const [shippingReturns, setShippingReturns] = useState(tenant.rug_shipping_returns_html ?? '');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const dirty =
    defaultNotes !== (tenant.default_catalog_additional_information_html ?? '') ||
    rugSample !== (tenant.rug_sample_information_html ?? '') ||
    careAdvice !== (tenant.rug_care_advice_html ?? '') ||
    shippingReturns !== (tenant.rug_shipping_returns_html ?? '');

  const bind = (setter: (v: string) => void) => (html: string) => {
    setter(html);
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const { data } = await axios.patch('/api/tenant/settings', {
        default_catalog_additional_information_html: defaultNotes,
        rug_sample_information_html: rugSample,
        rug_care_advice_html: careAdvice,
        rug_shipping_returns_html: shippingReturns,
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
          <label className="block text-cream-300 text-xs font-semibold uppercase tracking-wider">Default Product Notes &amp; Information</label>
          <RichTextEditor
            value={defaultNotes}
            onChange={bind(setDefaultNotes)}
            placeholder="Add common care instructions, delivery notes, disclaimers, or other information that should appear on every product."
          />
          <p className="text-dark-500 text-xs">
            Shown under Description on every rug unless that catalog entry has its own Additional Notes &amp; Information override.
          </p>
        </div>

        <div className="border-t border-dark-700 pt-6 space-y-6">
          <div>
            <h2 className="text-cream-100 font-semibold text-sm">Expandable Sections</h2>
            <p className="text-dark-500 text-xs mt-1">Common content shown in the collapsible sections on every rug detail page.</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-cream-300 text-xs font-semibold uppercase tracking-wider">Rug Sample</label>
            <RichTextEditor
              value={rugSample}
              onChange={bind(setRugSample)}
              placeholder="Explain how customers can request a rug sample, any fees, delivery times, and return conditions."
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-cream-300 text-xs font-semibold uppercase tracking-wider">Care Advice</label>
            <RichTextEditor
              value={careAdvice}
              onChange={bind(setCareAdvice)}
              placeholder="Add cleaning, vacuuming, stain treatment, rotation, and professional-care guidance."
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-cream-300 text-xs font-semibold uppercase tracking-wider">Shipping &amp; Returns</label>
            <RichTextEditor
              value={shippingReturns}
              onChange={bind(setShippingReturns)}
              placeholder="Explain shipping times, delivery coverage, charges, returns, and custom-order restrictions."
            />
          </div>
        </div>
      </section>
    </div>
  );
}
