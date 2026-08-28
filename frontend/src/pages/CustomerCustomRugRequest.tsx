import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronRight, CheckCircle, Upload, X, AlertTriangle, Send, Plus, Trash2 } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { SIZE_UNITS, toMetres } from '../utils/size';

const ROOM_TYPES = ['Living Room', 'Bedroom', 'Dining Room', 'Hallway / Entryway', 'Office', 'Outdoor', 'Other'];

const MATERIALS = [
  { value: 'wool', label: 'Wool' },
  { value: 'silk', label: 'Silk' },
  { value: 'cotton', label: 'Cotton' },
  { value: 'synthetic', label: 'Synthetic' },
  { value: 'no_preference', label: 'No preference' },
  { value: 'other', label: 'Other' },
];

// Canonical values submitted/stored — always in the tenant's base currency (INR),
// so admin-side filtering/comparison stays consistent regardless of which currency
// the customer viewed the form in. Only the displayed label is converted below.
const BUDGET_BANDS = [
  'Under ₹25,000',
  '₹25,000 – ₹50,000',
  '₹50,000 – ₹1,00,000',
  '₹1,00,000 – ₹2,50,000',
  'Above ₹2,50,000',
  'Not sure yet',
];
const BUDGET_THRESHOLDS = [25000, 50000, 100000, 250000];

const DELIVERY_EXPECTATIONS = [
  'No preference',
  'ASAP / Rush',
  'Within 4 weeks',
  '1–2 months',
  '2–3 months or more',
];

const MAX_IMAGES = 3;
const MAX_RUGS = 10;

interface RugSpec {
  room_type: string;
  size_w: string;
  size_h: string;
  unit: string;
  material_preference: string;
  material_other: string;
  budget_range: string;
  expected_delivery: string;
  notes: string;
  images: string[];
  uploading: boolean;
}

const defaultRug = (): RugSpec => ({
  room_type: ROOM_TYPES[0],
  size_w: '',
  size_h: '',
  unit: 'ft',
  material_preference: 'no_preference',
  material_other: '',
  budget_range: BUDGET_BANDS[0],
  expected_delivery: DELIVERY_EXPECTATIONS[0],
  notes: '',
  images: [],
  uploading: false,
});

export default function CustomerCustomRugRequest() {
  const navigate = useNavigate();
  const { customer, isCustomerAuthenticated } = useCustomerAuth();
  const { displayPrice, baseCurrency } = useCurrency();

  const [form, setForm] = useState({
    name: customer?.name ?? '',
    email: customer?.email ?? '',
    phone: '',
    company: '',
  });
  const [rugs, setRugs] = useState<RugSpec[]>([defaultRug()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<{ quote_ids: number[]; message: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const updateRug = (index: number, patch: Partial<RugSpec>) => {
    setRugs((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };
  const addRug = () => setRugs((prev) => (prev.length >= MAX_RUGS ? prev : [...prev, defaultRug()]));
  const removeRug = (index: number) => setRugs((prev) => prev.filter((_, i) => i !== index));

  const handleImageUpload = async (index: number, file: File) => {
    if (rugs[index].images.length >= MAX_IMAGES) return;
    updateRug(index, { uploading: true });
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await axios.post<{ url: string }>('/api/customer/custom-rug-request/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRugs((prev) => prev.map((r, i) => (i === index ? { ...r, images: [...r.images, data.url] } : r)));
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Image upload failed.');
    } finally {
      updateRug(index, { uploading: false });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required.'); return; }
    for (const rug of rugs) {
      if (!rug.size_w.trim() || !rug.size_h.trim()) { setError('Approximate size is required for every rug.'); return; }
      if (rug.material_preference === 'other' && !rug.material_other.trim()) {
        setError('Please specify the material for each rug where you selected "Other".');
        return;
      }
    }
    setSubmitting(true);
    setError('');
    try {
      const { data } = await axios.post('/api/customer/custom-rug-request', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone || undefined,
        company: form.company || undefined,
        items: rugs.map((rug) => ({
          room_type: rug.room_type || undefined,
          size_w: toMetres(parseFloat(rug.size_w), rug.unit),
          size_h: toMetres(parseFloat(rug.size_h), rug.unit),
          material_preference: rug.material_preference === 'other' ? rug.material_other.trim() : rug.material_preference,
          budget_range: rug.budget_range,
          expected_delivery: rug.expected_delivery || undefined,
          notes: rug.notes || undefined,
          reference_image_urls: rug.images.length > 0 ? rug.images : undefined,
        })),
      });
      setSubmitted(data);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <CustomerLayout>
        <SEO title="Custom Rug Request Received" description="Your custom rug request has been received." noindex />
        <div className="max-w-xl mx-auto px-6 py-24 text-center space-y-5">
          <CheckCircle size={44} className="text-green-600 mx-auto" />
          <h1 className="storefront-heading text-3xl">Request Received</h1>
          <p className="text-stone-500 text-sm leading-relaxed">{submitted.message}</p>
          {submitted.quote_ids.length > 1 && (
            <p className="text-stone-400 text-xs">
              {submitted.quote_ids.length} rugs received as one request — we'll quote and can ship them together.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link to="/my-quotes" className="text-sm text-stone-700 hover:text-stone-900 border-b border-stone-300 hover:border-stone-900 pb-0.5 transition-colors">
              View My Quotes
            </Link>
            <Link to="/catalog" className="text-sm text-stone-700 hover:text-stone-900 border-b border-stone-300 hover:border-stone-900 pb-0.5 transition-colors">
              Continue Browsing
            </Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  // Labels shown to the customer are converted to their detected currency; the
  // underlying values submitted/stored stay the canonical INR bands (BUDGET_BANDS)
  // so admin-side data stays comparable across every request regardless of who's viewing it.
  const [t0, t1, t2, t3] = BUDGET_THRESHOLDS.map((v) => displayPrice(v, baseCurrency));
  const budgetBandLabels = [
    `Under ${t0}`,
    `${t0} – ${t1}`,
    `${t1} – ${t2}`,
    `${t2} – ${t3}`,
    `Above ${t3}`,
    'Not sure yet',
  ];

  return (
    <CustomerLayout>
      <SEO title="Request a Custom Rug" description="Tell us about the rug you have in mind — size, material, style, and budget — and our team will send you a personalized quote." />
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">

        <div className="flex items-center gap-2 text-xs text-stone-400">
          <Link to="/" className="hover:text-stone-900 transition-colors">Home</Link>
          <ChevronRight size={11} />
          <span className="text-stone-600">Request a Custom Rug</span>
        </div>

        <div className="pb-6 border-b border-stone-100">
          <p className="storefront-eyebrow mb-2">Bespoke Design</p>
          <h1 className="storefront-heading text-4xl">Request a Custom Rug</h1>
          <p className="text-stone-500 text-sm mt-3 leading-relaxed max-w-lg">
            No catalog item in mind? Tell us about your space and vision — size, material, colors,
            budget — and our team will get back to you with a personalized quote within 24–48 hours.
            Need more than one rug? Add as many as you like below — we'll quote them together.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {!isCustomerAuthenticated && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Full Name *</label>
                <input name="name" value={form.name} onChange={handleChange} required placeholder="Your name"
                  className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Email *</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@example.com"
                  className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Phone / WhatsApp</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210"
                  className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Company</label>
                <input name="company" value={form.company} onChange={handleChange} placeholder="Optional"
                  className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors" />
              </div>
            </div>
          )}

          <div className="space-y-5">
            {rugs.map((rug, i) => (
              <div key={i} className="border border-stone-200 p-5 space-y-5 relative">
                <div className="flex items-center justify-between">
                  <p className="text-stone-900 font-serif text-lg font-light">Rug {i + 1}</p>
                  {rugs.length > 1 && (
                    <button type="button" onClick={() => removeRug(i)}
                      className="text-stone-400 hover:text-red-600 transition-colors flex items-center gap-1 text-xs"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Room / Purpose</label>
                  <select value={rug.room_type} onChange={(e) => updateRug(i, { room_type: e.target.value })}
                    className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 text-sm focus:outline-none transition-colors bg-white"
                  >
                    {ROOM_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Approximate Size *</label>
                  <div className="grid grid-cols-3 gap-3">
                    <input type="number" min="0" step="0.1" value={rug.size_w} onChange={(e) => updateRug(i, { size_w: e.target.value })} required placeholder="Width"
                      className="border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors" />
                    <input type="number" min="0" step="0.1" value={rug.size_h} onChange={(e) => updateRug(i, { size_h: e.target.value })} required placeholder="Length"
                      className="border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors" />
                    <select value={rug.unit} onChange={(e) => updateRug(i, { unit: e.target.value })}
                      className="border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 text-sm focus:outline-none transition-colors bg-white"
                    >
                      {SIZE_UNITS.filter((u) => u.code !== 'both').map((u) => <option key={u.code} value={u.code}>{u.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Material Preference</label>
                  <select value={rug.material_preference} onChange={(e) => updateRug(i, { material_preference: e.target.value })}
                    className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 text-sm focus:outline-none transition-colors bg-white"
                  >
                    {MATERIALS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  {rug.material_preference === 'other' && (
                    <input value={rug.material_other} onChange={(e) => updateRug(i, { material_other: e.target.value })} required
                      placeholder="Tell us the material you have in mind" maxLength={50}
                      className="mt-3 w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors" />
                  )}
                </div>

                <div>
                  <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Budget Range</label>
                  <select value={rug.budget_range} onChange={(e) => updateRug(i, { budget_range: e.target.value })}
                    className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 text-sm focus:outline-none transition-colors bg-white"
                  >
                    {BUDGET_BANDS.map((b, bi) => <option key={b} value={b}>{budgetBandLabels[bi]}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Expected Delivery (optional)</label>
                  <select value={rug.expected_delivery} onChange={(e) => updateRug(i, { expected_delivery: e.target.value })}
                    className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 text-sm focus:outline-none transition-colors bg-white"
                  >
                    {DELIVERY_EXPECTATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Describe Your Vision</label>
                  <textarea value={rug.notes} onChange={(e) => updateRug(i, { notes: e.target.value.slice(0, 1500) })} rows={4} maxLength={1500}
                    placeholder="Colors, patterns, inspiration, anything else that helps us understand what you're picturing…"
                    className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors resize-none"
                  />
                  <p className="text-stone-400 text-xs mt-1 text-right">{rug.notes.length}/1500</p>
                </div>

                <div>
                  <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">
                    Reference Images ({rug.images.length}/{MAX_IMAGES})
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {rug.images.map((url) => (
                      <div key={url} className="relative w-20 h-20 border border-stone-200">
                        <img src={url} alt="Reference" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => updateRug(i, { images: rug.images.filter((u) => u !== url) })}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-stone-900 text-white rounded-full flex items-center justify-center"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                    {rug.images.length < MAX_IMAGES && (
                      <label className="w-20 h-20 border border-dashed border-stone-300 hover:border-stone-500 flex items-center justify-center cursor-pointer transition-colors">
                        {rug.uploading ? (
                          <div className="w-4 h-4 border border-stone-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload size={16} className="text-stone-400" />
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          disabled={rug.uploading}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(i, f); e.target.value = ''; }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {rugs.length < MAX_RUGS && (
              <button type="button" onClick={addRug}
                className="w-full border border-dashed border-stone-300 hover:border-stone-500 text-stone-500 hover:text-stone-900 text-xs font-medium tracking-widest uppercase py-3 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={13} /> Add Another Rug
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-3 text-red-600 text-xs">
              <AlertTriangle size={12} className="flex-shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || rugs.some((r) => r.uploading)}
            className="w-full storefront-cta-solid py-4 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={13} />
            )}
            {submitting ? 'Submitting…' : rugs.length > 1 ? `Submit Request (${rugs.length} Rugs)` : 'Submit Request'}
          </button>
        </form>
      </div>
    </CustomerLayout>
  );
}
