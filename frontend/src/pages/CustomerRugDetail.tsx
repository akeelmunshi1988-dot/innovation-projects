import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DOMPurify from 'dompurify';
import {
  Layers, Send, CheckCircle, AlertTriangle, Zap, Eye,
  ChevronRight, X, LogIn, UserPlus, EyeOff, FileText, ExternalLink, ShoppingBag,
  ChevronLeft,
} from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import SocialLoginButtons from '../components/SocialLoginButtons';
import { fmtExact, currencySymbol } from '../utils/currency';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCart } from '../contexts/CartContext';
import { fmtSize, catalogSizeDims, toMetres, inputUnit } from '../utils/size';
import { getPublicSettings } from '../services/api';
import { COUNTRIES, detectCountry } from '../utils/countries';
import { PASSWORD_POLICY_HINT, passwordPolicyError } from '../utils/passwordPolicy';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import { PROSE_ALLOWED_TAGS, PROSE_ALLOWED_ATTR } from '../utils/richTextSanitize';
import type { CatalogSize } from '../types';


interface RugDetail {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  about_content_html: string | null;
  weave_type: string | null;
  pile_height: string | null;
  material: string;
  material_type: string;
  material_color: string;
  sizes: CatalogSize[];
  base_price_per_sqm: number;
  base_price_currency: string | null;
  lead_time_days: number;
  image_url: string | null;
  images: { id: number; image_url: string; sort_order: number }[];
  available: boolean;
}

interface PriceResult {
  size_sqm: number;
  total_sqm: number;
  subtotal: number;
  final_price: number;
  price_per_piece: number;
  bulk_discount: number;
  rush_surcharge: number;
  pre_gst_price: number;
  gst_pct: number;
  gst_amount: number;
  gst_inclusive: boolean;
  material_available: boolean;
  estimated_days: number;
  standard_days: number;
  rush_days: number;
  rush_available: boolean;
  price_currency?: string;
}

type RugShape = 'rect' | 'circle' | 'oval';

interface QuoteForm {
  name: string;
  email: string;
  phone: string;
  size_w: string;
  size_h: string;
  qty: string;
  rush_order: boolean;
  notes: string;
  shape: RugShape;
}


export default function CustomerRugDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { customer, customerToken, isCustomerAuthenticated, customerLogin, customerRegister } = useCustomerAuth();
  const { displayPrice } = useCurrency();
  const { addItem } = useCart();
  const [addedToCart, setAddedToCart] = useState(false);
  const [rug, setRug] = useState<RugDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [activeQuote, setActiveQuote] = useState<{ quote_id: number; status: string; final_price: number | null; price_currency: string } | null>(null);

  const [priceResult, setPriceResult] = useState<PriceResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [sizeUnit, setSizeUnit] = useState('ft');
  const [activeSlide, setActiveSlide] = useState(0);

  const [form, setForm] = useState<QuoteForm>({
    name: '', email: '', phone: '',
    size_w: '', size_h: '', qty: '1',
    rush_order: false, notes: '',
    shape: 'rect',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [quoteResult, setQuoteResult] = useState<{ quote_id: number; final_price: number; lead_time_days: number } | null>(null);

  // Auth modal (shown when unauthenticated user tries to submit)
  const [authModal, setAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', phone: '', company: '', country: detectCountry() });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthPwd, setShowAuthPwd] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setActiveSlide(0);
    setLoading(true);
    setNotFound(false);
    // `slug` also accepts a legacy numeric id (see backend get_public_rug) so old
    // /catalog/<id> links still resolve — once loaded, canonicalize the address
    // bar to the real slug URL so the visible URL and future shares use it.
    axios.get(`/api/customer/catalog/${slug}`)
      .then(({ data }) => {
        setRug(data);
        if (data.slug && data.slug !== slug) {
          navigate(`/catalog/${data.slug}`, { replace: true });
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    getPublicSettings()
      .then((data) => setSizeUnit(data.default_size_unit || 'ft'))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!rug || !isCustomerAuthenticated || !customerToken) return;
    axios.get(`/api/customer/quotes?rug_id=${rug.id}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    }).then(({ data }) => {
      const active = (data as any[]).find(q => q.status === 'sent' || q.status === 'draft');
      setActiveQuote(active ?? null);
    }).catch(() => {});
  }, [rug, isCustomerAuthenticated, customerToken]);

  const effectiveSizeH = form.shape === 'circle' ? form.size_w : form.size_h;
  // form.size_w/size_h are entered in `sizeUnit`; quote pricing is denominated in metres.
  const sizeWMetres = toMetres(parseFloat(form.size_w), sizeUnit);
  const sizeHMetres = toMetres(parseFloat(effectiveSizeH), sizeUnit);

  const calcPrice = async () => {
    if (!rug || !form.size_w || (form.shape !== 'circle' && !form.size_h)) return;
    setCalcLoading(true);
    try {
      const { data } = await axios.post(`/api/customer/catalog/${rug.id}/estimate`, {
        size_w: sizeWMetres,
        size_h: sizeHMetres,
        qty: parseInt(form.qty) || 1,
        rush_order: form.rush_order,
        shape: form.shape,
      });
      setPriceResult(data);
      // Auto-clear rush if the estimate shows it saves no time
      if (!data.rush_available && form.rush_order) {
        setForm(f => ({ ...f, rush_order: false }));
      }
    } catch (err: any) {
      console.error('Price estimate failed:', err.response?.data?.detail || err.message);
    } finally {
      setCalcLoading(false);
    }
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const doSubmitQuote = async (name: string, email: string) => {
    if (!rug) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data } = await axios.post('/api/customer/request-quote', {
        name,
        email,
        phone: form.phone || null,
        rug_id: rug.id,
        size_w: sizeWMetres,
        size_h: sizeHMetres,
        qty: parseInt(form.qty) || 1,
        rush_order: form.rush_order,
        shape: form.shape,
        notes: form.notes || null,
      }, { headers: customerToken ? { Authorization: `Bearer ${customerToken}` } : {} });
      setQuoteResult({ quote_id: data.quote_id, final_price: data.final_price, lead_time_days: data.lead_time_days });
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail || 'Failed to submit quote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rug) return;
    if (!isCustomerAuthenticated || !customer) {
      setAuthModal(true);
      return;
    }
    await doSubmitQuote(customer.name, customer.email);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      let name = authForm.name;
      let email = authForm.email;
      if (authMode === 'login') {
        const user = await customerLogin(authForm.email, authForm.password);
        name = user.name;
        email = user.email;
      } else {
        const policyError = passwordPolicyError(authForm.password);
        if (policyError) { setAuthError(policyError); setAuthLoading(false); return; }
        await customerRegister(
          authForm.name, authForm.email, authForm.password, authForm.country,
          authForm.phone || undefined, authForm.company || undefined,
        );
      }
      setAuthModal(false);
      await doSubmitQuote(name, email);
    } catch (err: any) {
      setAuthError(err.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex justify-center items-center h-64">
          <div className="w-6 h-6 border border-stone-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </CustomerLayout>
    );
  }

  if (notFound || !rug) {
    return (
      <CustomerLayout>
        <SEO title="Rug Not Found" description="This rug is no longer available in our catalog." noindex />
        <div className="max-w-xl mx-auto px-6 py-32 text-center space-y-4">
          <Layers size={36} className="mx-auto text-stone-300" />
          <h2 className="font-serif text-2xl font-light text-stone-900">Rug not found</h2>
          <Link to="/catalog" className="text-sm text-stone-500 hover:text-stone-900 transition-colors border-b border-stone-300 pb-0.5">
            ← Back to Collection
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  const currency = rug?.base_price_currency ?? priceResult?.price_currency ?? 'INR';
  const sym = currencySymbol(currency);

  const hasSize = parseFloat(form.size_w) > 0 && (form.shape === 'circle' || parseFloat(form.size_h) > 0);

  return (
    <CustomerLayout>
      <SEO
        title={rug.name}
        description={
          rug.description ??
          `${rug.name} — ${rug.material} rug${rug.weave_type ? `, ${rug.weave_type}` : ''}. Custom-made to your exact size, starting at ${sym}${rug.base_price_per_sqm}/m².`
        }
        image={rug.image_url ?? undefined}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: rug.name,
            description: rug.description ?? undefined,
            image: rug.image_url ?? undefined,
            material: rug.material,
            offers: {
              '@type': 'Offer',
              price: rug.base_price_per_sqm,
              priceCurrency: currency,
              availability: rug.available
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
              { '@type': 'ListItem', position: 2, name: 'Collection', item: `${window.location.origin}/catalog` },
              { '@type': 'ListItem', position: 3, name: rug.name, item: `${window.location.origin}/catalog/${rug.slug}` },
            ],
          },
        ]}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <Link to="/" className="hover:text-stone-900 transition-colors">Home</Link>
          <ChevronRight size={11} />
          <Link to="/catalog" className="hover:text-stone-900 transition-colors">Collection</Link>
          <ChevronRight size={11} />
          <span className="text-stone-600">{rug.name}</span>
        </div>

        {/* Active quote banner */}
        {activeQuote && (
          <div className={`flex items-center justify-between gap-4 px-4 py-3 border ${
            activeQuote.status === 'sent'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-stone-50 border-stone-200'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <FileText size={15} className={activeQuote.status === 'sent' ? 'text-blue-500 flex-shrink-0' : 'text-stone-400 flex-shrink-0'} />
              <div className="min-w-0">
                <p className={`text-sm font-medium ${activeQuote.status === 'sent' ? 'text-blue-800' : 'text-stone-600'}`}>
                  {activeQuote.status === 'sent' ? 'Your quote is ready for review' : 'Quote under review'}
                </p>
                <p className="text-xs text-stone-400">
                  Quote #{activeQuote.quote_id}
                  {activeQuote.final_price != null && activeQuote.status === 'sent' && (
                    <> · <span className="font-medium text-stone-700">
                      {currencySymbol(activeQuote.price_currency)}{fmtExact(activeQuote.final_price, activeQuote.price_currency)}
                    </span></>
                  )}
                </p>
              </div>
            </div>
            <Link
              to="/my-quotes"
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border transition-colors flex-shrink-0 ${
                activeQuote.status === 'sent'
                  ? 'bg-stone-900 border-stone-900 text-white hover:bg-stone-800'
                  : 'border-stone-300 text-stone-600 hover:border-stone-600 hover:text-stone-900'
              }`}
            >
              {activeQuote.status === 'sent' ? 'Accept / Decline' : 'View Quote'} <ExternalLink size={10} />
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Left: Image + Details */}
          <div className="lg:col-span-3 space-y-8">

            {/* Hero image / slider */}
            {(() => {
              const slides = [
                ...(rug.image_url ? [rug.image_url] : []),
                ...rug.images.map((img) => img.image_url),
              ];
              if (slides.length === 0) {
                return (
                  <div className="overflow-hidden bg-stone-100" style={{ aspectRatio: '4/3' }}>
                    <div className="w-full h-full flex items-center justify-center">
                      <Layers size={48} className="text-stone-300" />
                    </div>
                  </div>
                );
              }
              const current = Math.min(activeSlide, slides.length - 1);
              return (
                <div className="space-y-2">
                  <div className="relative overflow-hidden bg-stone-100 group" style={{ aspectRatio: '4/3' }}>
                    <img src={slides[current]} alt={`${rug.name} — view ${current + 1}`} className="w-full h-full object-cover" fetchPriority="high" />
                    {slides.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveSlide((current - 1 + slides.length) % slides.length)}
                          aria-label="Previous image"
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white text-stone-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSlide((current + 1) % slides.length)}
                          aria-label="Next image"
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white text-stone-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronRight size={16} />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                          {slides.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setActiveSlide(i)}
                              aria-label={`Go to image ${i + 1}`}
                              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/50 hover:bg-white/80'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {slides.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {slides.map((src, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveSlide(i)}
                          className={`flex-shrink-0 w-16 h-16 overflow-hidden border transition-colors ${
                            i === current ? 'border-stone-900' : 'border-stone-200 hover:border-stone-400'
                          }`}
                        >
                          <img src={src} alt="" loading="lazy" width={64} height={64} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Name + meta */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-serif text-3xl font-light text-stone-900">{rug.name}</h1>
                  {rug.weave_type && <p className="text-stone-400 text-sm capitalize mt-1">{rug.weave_type}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-stone-900 font-medium text-xl">{displayPrice(rug.base_price_per_sqm, currency)}</p>
                  <p className="text-stone-400 text-xs">per m²</p>
                </div>
              </div>

              {/* Minimal tags */}
              <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                {rug.material && <span>{rug.material}</span>}
                {rug.pile_height && <><span>·</span><span className="capitalize">{rug.pile_height} pile</span></>}
                <span>·</span><span>{rug.lead_time_days} days delivery</span>
                {!rug.available && <><span>·</span><span className="text-red-500">Currently unavailable</span></>}
              </div>
            </div>

            {/* About this rug */}
            {(rug.about_content_html || rug.description) && (
              <div className="border-t border-stone-100 pt-6 space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">About</h2>
                {rug.about_content_html ? (
                  <div
                    className="prose-content"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rug.about_content_html, {
                      ALLOWED_TAGS: PROSE_ALLOWED_TAGS,
                      ALLOWED_ATTR: PROSE_ALLOWED_ATTR,
                    }) }}
                  />
                ) : (
                  <p className="text-stone-600 text-sm leading-relaxed">{rug.description}</p>
                )}
              </div>
            )}

            {/* Visualizer CTA */}
            <Link
              to={`/visualizer?rug_id=${rug.id}`}
              className="flex items-center justify-between border border-stone-200 hover:border-stone-400 p-5 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <Eye size={18} className="text-stone-400 group-hover:text-stone-900 transition-colors flex-shrink-0" />
                <div>
                  <p className="text-stone-900 font-medium text-sm">See it in your room</p>
                  <p className="text-stone-400 text-xs mt-0.5">Upload a photo and place this rug on your floor</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-stone-400 group-hover:text-stone-900 transition-colors" />
            </Link>
          </div>

          {/* Right: Quote form */}
          <div className="lg:col-span-2">
            <div className="sticky top-[102px] space-y-5">
              {submitted && quoteResult ? (
                <div className="border border-green-200 bg-green-50 p-8 text-center space-y-4">
                  <CheckCircle size={40} className="text-green-600 mx-auto" />
                  <h3 className="font-serif text-2xl font-light text-stone-900">Quote Requested</h3>
                  <p className="text-stone-600 text-sm">
                    Quote #{quoteResult.quote_id} — Total{' '}
                    <span className="font-medium text-stone-900">{quoteResult.final_price != null ? displayPrice(quoteResult.final_price, currency) : '—'}</span>
                  </p>
                  <p className="text-stone-500 text-sm">We'll contact you within 24 hours to confirm details.</p>
                  <p className="text-stone-400 text-xs">Expected delivery: {quoteResult.lead_time_days} days</p>
                  <Link to="/catalog" className="inline-block text-sm text-stone-500 hover:text-stone-900 transition-colors border-b border-stone-300 pb-0.5">
                    Continue browsing
                  </Link>
                </div>
              ) : (
                <div className="border border-stone-200">
                  <div className="px-5 py-4 border-b border-stone-100">
                    <h2 className="font-serif text-xl font-light text-stone-900">Request a Quote</h2>
                    <p className="text-stone-400 text-xs mt-0.5">Free · No commitment</p>
                  </div>

                  <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Standard Sizes — only sizes with a value in the current unit are
                        offered; a size missing a vendor-entered cm value simply isn't
                        shown when browsing in cm, rather than falling back to a computed
                        conversion (see utils/size.ts). */}
                    {rug.sizes.filter((size) => catalogSizeDims(size, inputUnit(sizeUnit))).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-stone-400 text-xs font-medium uppercase tracking-widest">Standard Sizes</p>
                        <div className="flex flex-wrap gap-1.5">
                          {rug.sizes.map((size) => {
                            const dims = catalogSizeDims(size, inputUnit(sizeUnit));
                            if (!dims) return null;
                            const dispW = String(dims[0]);
                            const dispH = String(dims[1]);
                            const isSelected = form.size_w === dispW && form.size_h === dispH;
                            return (
                              <button key={size.ft} type="button"
                                onClick={() => setForm((f) => ({ ...f, size_w: dispW, size_h: dispH }))}
                                className={`border px-3 py-1.5 text-xs transition-colors ${
                                  isSelected
                                    ? 'bg-stone-900 border-stone-900 text-white'
                                    : 'border-stone-200 text-stone-600 hover:border-stone-400 hover:text-stone-900'
                                }`}
                              >
                                {fmtSize(size, sizeUnit)}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-stone-400 text-xs">Or enter custom dimensions below</p>
                      </div>
                    )}

                    {/* Shape selector */}
                    <div className="space-y-1.5">
                      <p className="text-stone-400 text-xs font-medium uppercase tracking-widest">Shape</p>
                      <div className="flex gap-2">
                        {(['rect', 'circle', 'oval'] as const).map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setForm(f => ({
                              ...f,
                              shape: s,
                              size_h: s === 'circle' ? f.size_w : f.size_h,
                            }))}
                            className={`px-3 py-1.5 border text-xs transition-colors ${
                              form.shape === s
                                ? 'bg-stone-900 border-stone-900 text-white'
                                : 'border-stone-200 text-stone-600 hover:border-stone-400 hover:text-stone-900'
                            }`}
                          >
                            {s === 'rect' ? 'Rectangle' : s === 'circle' ? 'Circle' : 'Oval'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Size inputs */}
                    {form.shape === 'circle' ? (
                      <div className="max-w-[160px]">
                        <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Diameter ({inputUnit(sizeUnit)}) *</label>
                        <input
                          type="number" name="size_w" value={form.size_w}
                          onChange={e => setForm(f => ({ ...f, size_w: e.target.value, size_h: e.target.value }))}
                          placeholder={sizeUnit === 'cm' ? '300' : '10'} step={sizeUnit === 'cm' ? '1' : '0.1'} min={sizeUnit === 'cm' ? '30' : '1'} required
                          className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                        />
                        {form.size_w && parseFloat(form.size_w) > 0 && (
                          <p className="text-stone-400 text-xs mt-1">
                            Area ≈ {(Math.PI * (toMetres(parseFloat(form.size_w), sizeUnit) / 2) ** 2).toFixed(2)} m²
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">
                            {form.shape === 'oval' ? `Width / Axis A (${inputUnit(sizeUnit)})` : `Width (${inputUnit(sizeUnit)})`} *
                          </label>
                          <input type="number" name="size_w" value={form.size_w} onChange={handleFormChange}
                            placeholder={sizeUnit === 'cm' ? '240' : '8'} step={sizeUnit === 'cm' ? '1' : '0.1'} min={sizeUnit === 'cm' ? '30' : '1'} required
                            className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">
                            {form.shape === 'oval' ? `Height / Axis B (${inputUnit(sizeUnit)})` : `Height (${inputUnit(sizeUnit)})`} *
                          </label>
                          <input type="number" name="size_h" value={form.size_h} onChange={handleFormChange}
                            placeholder={sizeUnit === 'cm' ? '180' : '6'} step={sizeUnit === 'cm' ? '1' : '0.1'} min={sizeUnit === 'cm' ? '30' : '1'} required
                            className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                          />
                        </div>
                        {form.shape === 'oval' && form.size_w && form.size_h && parseFloat(form.size_w) > 0 && parseFloat(form.size_h) > 0 && (
                          <p className="col-span-2 text-stone-400 text-xs -mt-1">
                            Area ≈ {(Math.PI * (sizeWMetres / 2) * (sizeHMetres / 2)).toFixed(2)} m²
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Quantity</label>
                        <input type="number" name="qty" value={form.qty} onChange={handleFormChange} min="1"
                          className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 text-sm focus:outline-none transition-colors"
                        />
                      </div>
                      <div className="flex items-end pb-0.5">
                        {priceResult && !priceResult.rush_available ? (
                          <div className="w-full">
                            <div className="flex items-center gap-2 opacity-40 cursor-not-allowed">
                              <div className="relative flex-shrink-0">
                                <div className="w-9 h-5 rounded-full bg-stone-200">
                                  <div className="absolute top-0.5 translate-x-0.5 w-4 h-4 rounded-full bg-white shadow" />
                                </div>
                              </div>
                              <div>
                                <p className="text-stone-700 text-xs font-medium">Rush</p>
                                <p className="text-stone-400 text-xs">+25% fee</p>
                              </div>
                            </div>
                            <p className="text-amber-600 text-xs mt-1 leading-snug">
                              Already at minimum production time ({priceResult.standard_days}d) — no rush benefit
                            </p>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 cursor-pointer w-full">
                            <div className="relative flex-shrink-0">
                              <input type="checkbox" name="rush_order" checked={form.rush_order} onChange={handleFormChange} className="sr-only" />
                              <div className={`w-9 h-5 rounded-full transition-colors ${form.rush_order ? 'bg-stone-900' : 'bg-stone-200'}`}>
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.rush_order ? 'translate-x-5' : 'translate-x-0.5'}`} />
                              </div>
                            </div>
                            <div>
                              <p className="text-stone-700 text-xs font-medium">Rush</p>
                              <p className="text-stone-400 text-xs">
                                {priceResult
                                  ? `${priceResult.standard_days}d → ${priceResult.rush_days}d · +25% fee`
                                  : '+25% fee'}
                              </p>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Price estimate + Place Order */}
                    {hasSize && (
                      <div>
                        <div className="flex gap-2">
                          <button type="button" onClick={calcPrice} disabled={calcLoading}
                            className="flex-1 flex items-center justify-center gap-2 text-xs font-medium text-stone-600 hover:text-stone-900 border border-stone-200 hover:border-stone-400 px-3 py-2.5 transition-colors uppercase tracking-wider"
                          >
                            {calcLoading
                              ? <div className="w-3.5 h-3.5 border border-stone-400 border-t-transparent rounded-full animate-spin" />
                              : <Zap size={13} />}
                            Estimate
                          </button>
                          <button type="submit" disabled={submitting || !rug.available}
                            className="flex-1 flex items-center justify-center gap-2 text-xs font-medium bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white px-3 py-2.5 transition-colors uppercase tracking-wider"
                          >
                            {submitting
                              ? <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                              : <Send size={13} />}
                            Request Quote
                          </button>
                        </div>
                        {priceResult && (
                          <div className="mt-2 border border-stone-100 bg-stone-50 p-3 space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-stone-400">Area</span>
                              <span className="text-stone-700">{priceResult.size_sqm.toFixed(2)} m²</span>
                            </div>
                            {priceResult.bulk_discount > 0 && (
                              <div className="flex justify-between text-xs">
                                <span className="text-green-600">Bulk discount</span>
                                <span className="text-green-600">−{displayPrice(priceResult.bulk_discount, priceResult.price_currency)}</span>
                              </div>
                            )}
                            {priceResult.rush_surcharge > 0 && (
                              <div className="flex justify-between text-xs">
                                <span className="text-amber-600">Rush fee</span>
                                <span className="text-amber-600">+{displayPrice(priceResult.rush_surcharge, priceResult.price_currency)}</span>
                              </div>
                            )}
                            {priceResult.gst_inclusive && (
                              <>
                                <div className="flex justify-between text-xs pt-1 border-t border-stone-200">
                                  <span className="text-stone-400">Pre-tax</span>
                                  <span className="text-stone-700">{displayPrice(priceResult.pre_gst_price, priceResult.price_currency)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-stone-400">Tax ({priceResult.gst_pct?.toFixed(0)}%)</span>
                                  <span className="text-stone-700">+{displayPrice(priceResult.gst_amount, priceResult.price_currency)}</span>
                                </div>
                              </>
                            )}
                            <div className="flex justify-between text-sm font-medium pt-1 border-t border-stone-200">
                              <span className="text-stone-900">{priceResult.gst_inclusive ? 'Total (incl. Tax)' : 'Total'}</span>
                              <span className="text-stone-900">{displayPrice(priceResult.final_price, priceResult.price_currency)}</span>
                            </div>
                            <p className="text-stone-400 text-xs">Expected delivery: ~{priceResult.estimated_days} days</p>
                            <div className="flex gap-2 mt-1">
                              <button type="button"
                                onClick={() => {
                                  addItem({
                                    rug_id: rug.id, rug_name: rug.name, image_url: rug.image_url,
                                    size_w: sizeWMetres, size_h: sizeHMetres, shape: form.shape,
                                    qty: parseInt(form.qty) || 1, rush_order: form.rush_order,
                                    notes: form.notes || undefined,
                                  });
                                  setAddedToCart(true);
                                  setTimeout(() => setAddedToCart(false), 2500);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 border border-stone-300 hover:border-stone-900 text-stone-900 text-xs font-medium tracking-widest uppercase py-2.5 transition-colors"
                              >
                                {addedToCart ? <><CheckCircle size={13} className="text-green-600" /> Added</> : <><ShoppingBag size={13} /> Add to Cart</>}
                              </button>
                              <button type="button"
                                onClick={() => navigate('/checkout', {
                                  state: {
                                    items: [{
                                      rug_id: rug.id, rug_name: rug.name, image_url: rug.image_url,
                                      size_w: sizeWMetres, size_h: sizeHMetres,
                                      qty: parseInt(form.qty) || 1, rush_order: form.rush_order,
                                      shape: form.shape,
                                      notes: form.notes || undefined,
                                      estimated_price: priceResult.final_price,
                                      pre_gst_price: priceResult.pre_gst_price,
                                      gst_pct: priceResult.gst_pct, gst_amount: priceResult.gst_amount,
                                      gst_inclusive: priceResult.gst_inclusive,
                                      price_currency: priceResult.price_currency ?? 'INR',
                                      estimated_days: priceResult.estimated_days,
                                    }],
                                    name: form.name || undefined, email: form.email || undefined, phone: form.phone || undefined,
                                  },
                                })}
                                className="flex-1 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium tracking-widest uppercase py-2.5 transition-colors"
                              >
                                Buy Now
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="border-t border-stone-100 pt-4 space-y-3">
                      {isCustomerAuthenticated && customer ? (
                        <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-2.5">
                          <CheckCircle size={13} className="text-green-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-stone-900 text-xs font-medium truncate">{customer.name}</p>
                            <p className="text-stone-400 text-xs truncate">{customer.email}</p>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setAuthModal(true)}
                          className="w-full flex items-center gap-3 border border-stone-200 hover:border-stone-400 px-3 py-3 transition-colors text-left"
                        >
                          <LogIn size={14} className="text-stone-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-stone-700 text-xs font-medium">Sign in to request a quote</p>
                            <p className="text-stone-400 text-xs">Login or create a free account</p>
                          </div>
                        </button>
                      )}
                      <textarea name="notes" value={form.notes} onChange={handleFormChange}
                        placeholder="Any special requirements?" rows={2}
                        className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors resize-none"
                      />
                    </div>

                    {submitError && (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-3 text-red-600 text-xs">
                        <AlertTriangle size={12} /> {submitError}
                      </div>
                    )}

                    <button type="submit" disabled={submitting || !rug.available}
                      className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-medium tracking-widest uppercase py-4 transition-colors flex items-center justify-center gap-2"
                    >
                      {submitting
                        ? <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                        : isCustomerAuthenticated ? <Send size={13} /> : <LogIn size={13} />}
                      {submitting ? 'Submitting…' : isCustomerAuthenticated ? 'Request Quote' : 'Sign In & Request Quote'}
                    </button>
                    <p className="text-stone-400 text-xs text-center">Free quote · No commitment · UPI / Card</p>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auth modal */}
      {authModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h3 className="font-serif text-lg font-light text-stone-900">
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </h3>
              <button onClick={() => setAuthModal(false)} className="text-stone-400 hover:text-stone-900 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex border-b border-stone-100">
              <button onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`flex-1 py-2.5 text-xs font-medium tracking-wider uppercase transition-colors ${
                  authMode === 'login' ? 'text-stone-900 border-b-2 border-stone-900' : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                Sign In
              </button>
              <button onClick={() => { setAuthMode('register'); setAuthError(''); }}
                className={`flex-1 py-2.5 text-xs font-medium tracking-wider uppercase transition-colors ${
                  authMode === 'register' ? 'text-stone-900 border-b-2 border-stone-900' : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="p-5 space-y-3">
              {authMode === 'register' && (
                <input type="text" placeholder="Full name *" required value={authForm.name}
                  onChange={(e) => setAuthForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                />
              )}
              <input type="email" placeholder="Email address *" required value={authForm.email}
                onChange={(e) => setAuthForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
              />
              <div className="relative">
                <input type={showAuthPwd ? 'text' : 'password'} placeholder="Password *" required
                  minLength={authMode === 'register' ? 8 : 1} value={authForm.password}
                  onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 pr-10 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                />
                <button type="button" onClick={() => setShowAuthPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  {showAuthPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {authMode === 'register' && (
                <p className="text-stone-400 text-xs">{PASSWORD_POLICY_HINT}</p>
              )}
              {authMode === 'register' && (
                <>
                  <input type="tel" placeholder="Phone / WhatsApp" value={authForm.phone}
                    onChange={(e) => setAuthForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                  />
                  <input type="text" placeholder="Company / Business (optional)" value={authForm.company}
                    onChange={(e) => setAuthForm((f) => ({ ...f, company: e.target.value }))}
                    className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                  />
                  <select required value={authForm.country}
                    onChange={(e) => setAuthForm((f) => ({ ...f, country: e.target.value }))}
                    className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 text-sm focus:outline-none transition-colors bg-white"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </>
              )}

              {authError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-2.5 text-red-600 text-xs">
                  <AlertTriangle size={12} className="flex-shrink-0" /> {authError}
                </div>
              )}

              <button type="submit" disabled={authLoading}
                className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-medium tracking-widest uppercase py-3.5 transition-colors flex items-center justify-center gap-2"
              >
                {authLoading
                  ? <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                  : authMode === 'login'
                    ? <><LogIn size={13} /> Sign In & Request Quote</>
                    : <><UserPlus size={13} /> Register & Request Quote</>}
              </button>
            </form>
            <div className="px-5 pb-5">
              <SocialLoginButtons />
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}
