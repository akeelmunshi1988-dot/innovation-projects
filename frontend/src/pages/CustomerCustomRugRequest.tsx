import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronRight, CheckCircle, Upload, X, AlertTriangle, Send } from 'lucide-react';
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

export default function CustomerCustomRugRequest() {
  const navigate = useNavigate();
  const { customer, isCustomerAuthenticated } = useCustomerAuth();
  const { displayPrice, baseCurrency } = useCurrency();

  const [form, setForm] = useState({
    name: customer?.name ?? '',
    email: customer?.email ?? '',
    phone: '',
    company: '',
    room_type: ROOM_TYPES[0],
    size_w: '',
    size_h: '',
    unit: 'ft',
    material_preference: 'no_preference',
    material_other: '',
    budget_range: BUDGET_BANDS[0],
    expected_delivery: DELIVERY_EXPECTATIONS[0],
    notes: '',
  });
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<{ quote_id: number; message: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = async (file: File) => {
    if (images.length >= MAX_IMAGES) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await axios.post<{ url: string }>('/api/customer/custom-rug-request/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImages((prev) => [...prev, data.url]);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required.'); return; }
    if (!form.size_w.trim() || !form.size_h.trim()) { setError('Approximate size is required.'); return; }
    if (form.material_preference === 'other' && !form.material_other.trim()) { setError('Please specify the material you have in mind.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const sizeW = form.size_w ? toMetres(parseFloat(form.size_w), form.unit) : undefined;
      const sizeH = form.size_h ? toMetres(parseFloat(form.size_h), form.unit) : undefined;
      const { data } = await axios.post('/api/customer/custom-rug-request', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone || undefined,
        company: form.company || undefined,
        room_type: form.room_type || undefined,
        size_w: sizeW,
        size_h: sizeH,
        material_preference: form.material_preference === 'other' ? form.material_other.trim() : form.material_preference,
        budget_range: form.budget_range,
        expected_delivery: form.expected_delivery || undefined,
        notes: form.notes || undefined,
        reference_image_urls: images.length > 0 ? images : undefined,
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
          <h1 className="font-serif text-3xl font-light text-stone-900">Request Received</h1>
          <p className="text-stone-500 text-sm leading-relaxed">{submitted.message}</p>
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
          <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Bespoke Design</p>
          <h1 className="font-serif text-4xl font-light text-stone-900">Request a Custom Rug</h1>
          <p className="text-stone-500 text-sm mt-3 leading-relaxed max-w-lg">
            No catalog item in mind? Tell us about your space and vision — size, material, colors,
            budget — and our team will get back to you with a personalized quote within 24–48 hours.
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

          <div>
            <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Room / Purpose</label>
            <select name="room_type" value={form.room_type} onChange={handleChange}
              className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 text-sm focus:outline-none transition-colors bg-white"
            >
              {ROOM_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Approximate Size *</label>
            <div className="grid grid-cols-3 gap-3">
              <input type="number" min="0" step="0.1" name="size_w" value={form.size_w} onChange={handleChange} required placeholder="Width"
                className="border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors" />
              <input type="number" min="0" step="0.1" name="size_h" value={form.size_h} onChange={handleChange} required placeholder="Length"
                className="border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors" />
              <select name="unit" value={form.unit} onChange={handleChange}
                className="border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 text-sm focus:outline-none transition-colors bg-white"
              >
                {SIZE_UNITS.filter((u) => u.code !== 'both').map((u) => <option key={u.code} value={u.code}>{u.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Material Preference</label>
            <select name="material_preference" value={form.material_preference} onChange={handleChange}
              className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 text-sm focus:outline-none transition-colors bg-white"
            >
              {MATERIALS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            {form.material_preference === 'other' && (
              <input name="material_other" value={form.material_other} onChange={handleChange} required
                placeholder="Tell us the material you have in mind" maxLength={50}
                className="mt-3 w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors" />
            )}
          </div>

          <div>
            <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Budget Range</label>
            <select name="budget_range" value={form.budget_range} onChange={handleChange}
              className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 text-sm focus:outline-none transition-colors bg-white"
            >
              {BUDGET_BANDS.map((b, i) => <option key={b} value={b}>{budgetBandLabels[i]}</option>)}
            </select>
          </div>

          <div>
            <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Expected Delivery (optional)</label>
            <select name="expected_delivery" value={form.expected_delivery} onChange={handleChange}
              className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 text-sm focus:outline-none transition-colors bg-white"
            >
              {DELIVERY_EXPECTATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Describe Your Vision</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={4}
              placeholder="Colors, patterns, inspiration, anything else that helps us understand what you're picturing…"
              className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">
              Reference Images ({images.length}/{MAX_IMAGES})
            </label>
            <div className="flex flex-wrap gap-3">
              {images.map((url) => (
                <div key={url} className="relative w-20 h-20 border border-stone-200">
                  <img src={url} alt="Reference" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-stone-900 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="w-20 h-20 border border-dashed border-stone-300 hover:border-stone-500 flex items-center justify-center cursor-pointer transition-colors">
                  {uploading ? (
                    <div className="w-4 h-4 border border-stone-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload size={16} className="text-stone-400" />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }}
                  />
                </label>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-3 text-red-600 text-xs">
              <AlertTriangle size={12} className="flex-shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-medium tracking-widest uppercase py-4 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={13} />
            )}
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </form>
      </div>
    </CustomerLayout>
  );
}
