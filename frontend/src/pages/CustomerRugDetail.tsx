import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DOMPurify from 'dompurify';
import {
  Layers, Send, CheckCircle, AlertTriangle, Zap, Eye,
  ChevronRight, X, LogIn, UserPlus, EyeOff, FileText, ExternalLink, ShoppingBag,
  ChevronLeft, Upload, ChevronDown,
} from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import SocialLoginButtons from '../components/SocialLoginButtons';
import { fmtExact, currencySymbol } from '../utils/currency';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCart } from '../contexts/CartContext';
import { fmtSize, catalogSizeDims, toMetres, inputUnit, SIZE_UNITS } from '../utils/size';
import { getPublicSettings } from '../services/api';
import { COUNTRIES, detectCountry } from '../utils/countries';
import { PASSWORD_POLICY_HINT, passwordPolicyError } from '../utils/passwordPolicy';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import { useMeasurementUnit } from '../contexts/MeasurementContext';
import { PROSE_ALLOWED_TAGS, PROSE_ALLOWED_ATTR } from '../utils/richTextSanitize';
import type { CatalogSize, RugColorOption } from '../types';

const QUOTE_ROOM_TYPES = ['Living Room', 'Bedroom', 'Dining Room', 'Hallway / Entryway', 'Office', 'Outdoor', 'Other'];
const QUOTE_MATERIALS = [
  { value: 'wool', label: 'Wool' }, { value: 'silk', label: 'Silk' },
  { value: 'cotton', label: 'Cotton' }, { value: 'synthetic', label: 'Synthetic' },
  { value: 'no_preference', label: 'No preference' }, { value: 'other', label: 'Other' },
];
const QUOTE_BUDGETS = ['Under ₹25,000', '₹25,000 – ₹50,000', '₹50,000 – ₹1,00,000', '₹1,00,000 – ₹2,50,000', 'Above ₹2,50,000', 'Not sure yet'];
const QUOTE_DELIVERY = ['No preference', 'ASAP / Rush', 'Within 4 weeks', '1–2 months', '2–3 months or more'];
const MAX_QUOTE_IMAGES = 3;


interface RugDetail {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  about_content_html: string | null;
  additional_information_html: string | null;
  weave_type: string | null;
  pile_height: string | null;
  material: string;
  material_type: string;
  material_color: string;
  sizes: CatalogSize[];
  display_price: number | null;
  default_size: CatalogSize | null;
  base_price_currency: string | null;
  lead_time_days: number;
  image_url: string | null;
  images: { id: number; image_url: string; sort_order: number }[];
  available: boolean;
  inventory_quantity?: number | null;
  room_types: string[];
  color_options: RugColorOption[];
}

interface PriceResult {
  subtotal: number;
  final_price: number;
  price_per_piece: number;
  bulk_discount: number;
  rush_surcharge: number;
  pre_gst_price: number;
  gst_pct: number;
  gst_amount: number;
  gst_inclusive: boolean;
  shipping_cost: number;
  estimated_total: number;
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
interface ProductFAQ { id: number; question: string; answer: string; }


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
  const [faqs, setFaqs] = useState<ProductFAQ[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [activeQuote, setActiveQuote] = useState<{ quote_id: number; status: string; final_price: number | null; price_currency: string } | null>(null);

  const [priceResult, setPriceResult] = useState<PriceResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const { sizeUnit, setSizeUnit } = useMeasurementUnit();
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [expandedImage, setExpandedImage] = useState<{ src: string; alt: string } | null>(null);

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
  const [quoteModal, setQuoteModal] = useState(false);
  const [quoteDetails, setQuoteDetails] = useState({
    name: customer?.name ?? '', email: customer?.email ?? '', phone: '', company: '',
    room_type: QUOTE_ROOM_TYPES[0], material_preference: 'no_preference', material_other: '',
    budget_range: QUOTE_BUDGETS[0], expected_delivery: QUOTE_DELIVERY[0], notes: '',
    size_w: '', size_h: '', unit: 'ft',
    reference_image_urls: [] as string[], uploading: false,
  });

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
        setSelectedColor(data.color_options?.[0]?.name ?? '');
        if (data.slug && data.slug !== slug) {
          navigate(`/catalog/${data.slug}`, { replace: true });
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!rug?.id) return;
    axios.get('/api/customer/faqs', { params: { rug_id: rug.id } }).then(({ data }) => setFaqs(data)).catch(() => setFaqs([]));
  }, [rug?.id]);

  useEffect(() => {
    getPublicSettings()
      .then((data) => setSizeUnit(data.default_size_unit || 'ft'))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!rug?.sizes.length) return;
    const preferred = rug.sizes.find((size) => size.is_default) ?? rug.sizes[0];
    const dimensions = catalogSizeDims(preferred, inputUnit(sizeUnit));
    if (!dimensions) return;
    setForm((current) => ({
      ...current,
      size_w: String(dimensions[0]),
      size_h: String(dimensions[1]),
      shape: 'rect',
    }));
  }, [rug, sizeUnit]);

  useEffect(() => {
    if (!expandedImage) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpandedImage(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [expandedImage]);

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
  const selectedCatalogSize = rug?.sizes.find((size) => {
    const dimensions = catalogSizeDims(size, inputUnit(sizeUnit));
    return dimensions && form.size_w === String(dimensions[0]) && form.size_h === String(dimensions[1]);
  }) ?? rug?.sizes.find((size) => size.is_default) ?? rug?.sizes[0];
  const selectedLeadTimeDays = selectedCatalogSize?.lead_time_days ?? rug?.lead_time_days ?? 21;

  const calcPrice = async (selectedSize?: { size_w: string; size_h: string }) => {
    const selectedWidth = selectedSize?.size_w ?? form.size_w;
    const selectedHeight = selectedSize?.size_h ?? form.size_h;
    if (!rug || !selectedWidth || (form.shape !== 'circle' && !selectedHeight)) return;
    setCalcLoading(true);
    try {
      const { data } = await axios.post(`/api/customer/catalog/${rug.id}/estimate`, {
        size_w: toMetres(parseFloat(selectedWidth), sizeUnit),
        size_h: toMetres(parseFloat(form.shape === 'circle' ? selectedWidth : selectedHeight), sizeUnit),
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

  const openQuoteRequest = () => {
    if (!rug) return;
    const room = rug.room_types?.[0]?.replace(/_/g, ' ');
    const matchingRoom = QUOTE_ROOM_TYPES.find((option) => option.toLowerCase() === room?.toLowerCase());
    const material = QUOTE_MATERIALS.some((option) => option.value === rug.material_type)
      ? rug.material_type : 'other';
    const selectedSize = selectedCatalogSize;
    const selectedPrice = Number(selectedSize?.price ?? 0);
    const budget = selectedPrice < 25000 ? QUOTE_BUDGETS[0]
      : selectedPrice < 50000 ? QUOTE_BUDGETS[1]
        : selectedPrice < 100000 ? QUOTE_BUDGETS[2]
          : selectedPrice < 250000 ? QUOTE_BUDGETS[3] : QUOTE_BUDGETS[4];
    setQuoteDetails((current) => ({
      ...current,
      name: customer?.name ?? current.name,
      email: customer?.email ?? current.email,
      phone: current.phone,
      company: current.company,
      room_type: matchingRoom ?? current.room_type,
      material_preference: material,
      material_other: material === 'other' ? rug.material : '',
      budget_range: budget,
      size_w: selectedSize ? String(catalogSizeDims(selectedSize, 'ft')?.[0] ?? '') : '',
      size_h: selectedSize ? String(catalogSizeDims(selectedSize, 'ft')?.[1] ?? '') : '',
      unit: 'ft',
      expected_delivery: selectedLeadTimeDays <= 28 ? 'Within 4 weeks' : selectedLeadTimeDays <= 60 ? '1–2 months' : '2–3 months or more',
    }));
    setSubmitError(null);
    setQuoteModal(true);
  };

  const uploadQuoteReference = async (file: File) => {
    if (quoteDetails.reference_image_urls.length >= MAX_QUOTE_IMAGES) return;
    setQuoteDetails((current) => ({ ...current, uploading: true }));
    try {
      const body = new FormData();
      body.append('file', file);
      const { data } = await axios.post<{ url: string }>('/api/customer/custom-rug-request/upload-image', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setQuoteDetails((current) => ({
        ...current, reference_image_urls: [...current.reference_image_urls, data.url], uploading: false,
      }));
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail ?? 'Reference image upload failed.');
      setQuoteDetails((current) => ({ ...current, uploading: false }));
    }
  };

  const doSubmitQuote = async (name: string, email: string) => {
    if (!rug) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data } = await axios.post('/api/customer/request-quote', {
        name,
        email,
        phone: quoteDetails.phone || null,
        company: quoteDetails.company || null,
        rug_id: rug.id,
        size_w: toMetres(parseFloat(quoteDetails.size_w), quoteDetails.unit),
        size_h: toMetres(parseFloat(quoteDetails.size_h), quoteDetails.unit),
        qty: 1,
        rush_order: false,
        shape: 'rect',
        notes: quoteDetails.notes || null,
        room_type: quoteDetails.room_type || null,
        material_preference: quoteDetails.material_preference === 'other' ? quoteDetails.material_other : quoteDetails.material_preference,
        budget_range: quoteDetails.budget_range || null,
        expected_delivery: quoteDetails.expected_delivery || null,
        reference_image_urls: quoteDetails.reference_image_urls.length ? quoteDetails.reference_image_urls : null,
        selected_color: selectedColor || null,
      }, { headers: customerToken ? { Authorization: `Bearer ${customerToken}` } : {} });
      setQuoteResult({ quote_id: data.quote_id, final_price: data.final_price, lead_time_days: data.lead_time_days });
      setSubmitted(true);
      setQuoteModal(false);
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail || 'Failed to submit quote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitSelectedQuote = async () => {
    if (!rug) return;
    if (!quoteDetails.name.trim() || !quoteDetails.email.trim()) {
      setSubmitError('Name and email are required.');
      return;
    }
    if (!(parseFloat(quoteDetails.size_w) > 0) || !(parseFloat(quoteDetails.size_h) > 0)) {
      setSubmitError('Enter the requested rug width and length.');
      return;
    }
    if (quoteDetails.material_preference === 'other' && !quoteDetails.material_other.trim()) {
      setSubmitError('Please specify the preferred material.');
      return;
    }
    if (!isCustomerAuthenticated || !customer) {
      setAuthModal(true);
      return;
    }
    await doSubmitQuote(quoteDetails.name || customer.name, quoteDetails.email || customer.email);
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
        <div className="max-w-xl mx-auto px-4 py-32 text-center space-y-4">
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
  const hasSize = parseFloat(form.size_w) > 0 && (form.shape === 'circle' || parseFloat(form.size_h) > 0);
  const selectedColorOption = rug.color_options.find((color) => color.name === selectedColor);
  const coverImage = selectedColorOption?.image_url || rug.image_url;
  const scrollToConfigurator = () => {
    document.getElementById('rug-configurator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <CustomerLayout>
      <SEO
        title={rug.name}
        description={
          rug.description ??
          `${rug.name} — ${rug.material} rug${rug.weave_type ? `, ${rug.weave_type}` : ''}. Custom-made to your exact size.`
        }
        image={coverImage ?? undefined}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: rug.name,
            description: rug.description ?? undefined,
            image: coverImage ?? undefined,
            material: rug.material,
            ...(rug.display_price != null ? {
              offers: {
                '@type': 'Offer',
                price: rug.display_price,
                priceCurrency: currency,
                availability: rug.available
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock',
              },
            } : {}),
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
          ...(faqs.length ? [{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })),
          }] : []),
        ]}
      />
      <div className="w-[94vw] max-w-none mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-stone-400 min-w-0">
          <Link to="/" className="hover:text-stone-900 transition-colors">Home</Link>
          <ChevronRight size={11} />
          <Link to="/catalog" className="hover:text-stone-900 transition-colors">Collection</Link>
          <ChevronRight size={11} />
          <span className="text-stone-600 truncate">{rug.name}</span>
        </div>

        {/* Active quote banner */}
        {activeQuote && (
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 py-3 border ${
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
              className={`flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 border transition-colors flex-shrink-0 w-full sm:w-auto ${
                activeQuote.status === 'sent'
                  ? 'bg-stone-900 border-stone-900 text-white hover:bg-stone-800'
                  : 'border-stone-300 text-stone-600 hover:border-stone-600 hover:text-stone-900'
              }`}
            >
              {activeQuote.status === 'sent' ? 'Accept / Decline' : 'View Quote'} <ExternalLink size={10} />
            </Link>
          </div>
        )}

        {/* Two-panel hero: portrait cover (left) + wide lifestyle photo (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:items-stretch mb-10">
          {/* Cover shot — fixed, no slider */}
          <div className="lg:col-span-2 overflow-hidden bg-stone-100 aspect-[4/5] lg:aspect-auto lg:h-[clamp(470px,42vw,650px)]">
            {coverImage ? (
              <button
                type="button"
                onClick={() => setExpandedImage({ src: coverImage, alt: `${rug.name}${selectedColor ? ` — ${selectedColor}` : ''}` })}
                aria-label={`Expand ${rug.name} image`}
                className="block w-full h-full cursor-zoom-in"
              >
                <img key={coverImage} src={coverImage} alt={`${rug.name}${selectedColor ? ` — ${selectedColor}` : ''}`} className="w-full h-full object-cover" fetchPriority="high" />
              </button>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Layers size={48} className="text-stone-300" />
              </div>
            )}
          </div>

          {/* Lifestyle photo — first gallery image; falls back to the cover shot if none uploaded yet */}
          {(() => {
            const lifestyleImages = rug.images.length > 0 ? rug.images.map((img) => img.image_url) : (coverImage ? [coverImage] : []);
            if (lifestyleImages.length === 0) {
              return (
                <div className="lg:col-span-3 overflow-hidden bg-stone-100 aspect-[4/3] lg:aspect-auto lg:h-[clamp(470px,42vw,650px)]">
                  <div className="w-full h-full flex items-center justify-center">
                    <Layers size={48} className="text-stone-300" />
                  </div>
                </div>
              );
            }
            const current = Math.min(activeSlide, lifestyleImages.length - 1);
            return (
              <div className="lg:col-span-3 relative overflow-hidden bg-stone-100 group aspect-[4/3] lg:aspect-auto lg:h-[clamp(470px,42vw,650px)]">
                <button
                  type="button"
                  onClick={() => setExpandedImage({ src: lifestyleImages[current], alt: `${rug.name} in a room setting` })}
                  aria-label={`Expand ${rug.name} gallery image`}
                  className="block w-full h-full cursor-zoom-in"
                >
                  <img src={lifestyleImages[current]} alt={`${rug.name} in a room setting`} className="w-full h-full object-cover" loading="lazy" />
                </button>
                {lifestyleImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveSlide((current - 1 + lifestyleImages.length) % lifestyleImages.length)}
                      aria-label="Previous image"
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-8 lg:h-8 flex items-center justify-center bg-white/80 hover:bg-white text-stone-700 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSlide((current + 1) % lifestyleImages.length)}
                      aria-label="Next image"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-8 lg:h-8 flex items-center justify-center bg-white/80 hover:bg-white text-stone-700 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                      {lifestyleImages.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveSlide(i)}
                          aria-label={`Go to image ${i + 1}`}
                          className="w-5 h-5 flex items-center justify-center"
                        >
                          <span className={`block w-1.5 h-1.5 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/50 hover:bg-white/80'}`} />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>

        {/* Product summary: details + attributes + actions, aligned like the reference */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 items-start pb-4">
          <section className="md:col-span-2 lg:col-span-5 space-y-4 min-w-0">
            <div>
              <h1 className="font-serif text-3xl font-light text-stone-900">{rug.name}</h1>
              {rug.display_price != null && (
                <div className="flex flex-wrap items-end gap-x-2 gap-y-1 mt-3">
                  <p className="text-stone-900 font-medium text-xl">{displayPrice(rug.display_price, currency)}</p>
                  {rug.default_size && <p className="text-stone-400 text-xs pb-0.5">for {fmtSize(rug.default_size, sizeUnit)}</p>}
                </div>
              )}
            </div>

            {!rug.available && <p className="text-red-500 text-sm font-medium">Out of stock</p>}
            {rug.available && rug.inventory_quantity != null && rug.inventory_quantity <= 5 && (
              <p className="text-amber-600 text-sm">Only {rug.inventory_quantity} left</p>
            )}
          </section>

          <section className="lg:col-span-4 space-y-4 min-w-0" aria-label="Rug features">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full border border-stone-200 flex items-center justify-center flex-shrink-0">
                <Layers size={18} className="text-stone-500" />
              </span>
              <div>
                <p className="font-serif text-lg leading-tight text-stone-900">{rug.material}</p>
                <p className="text-stone-400 text-sm">{rug.material_type || 'Selected material'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full border border-stone-200 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={18} className="text-stone-500" />
              </span>
              <div>
                <p className="font-serif text-lg leading-tight text-stone-900 capitalize">{rug.weave_type || 'Handcrafted'}</p>
                <p className="text-stone-400 text-sm">Made by skilled artisans</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full border border-stone-200 flex items-center justify-center flex-shrink-0">
                <Zap size={18} className="text-stone-500" />
              </span>
              <div>
                <p className="font-serif text-lg leading-tight text-stone-900 capitalize">{rug.pile_height ? `${rug.pile_height} pile` : 'Made to order'}</p>
                <p className="text-stone-400 text-sm">Estimated in {selectedLeadTimeDays} days</p>
              </div>
            </div>
          </section>

          <section className="lg:col-span-3 space-y-4 lg:pt-2">
            <button
              type="button"
              onClick={openQuoteRequest}
              disabled={!rug.available}
              className="w-full storefront-cta-solid py-4"
            >
              Request a Quote
            </button>
            <button
              type="button"
              onClick={scrollToConfigurator}
              disabled={!rug.available}
              className="w-full storefront-cta-outline disabled:border-stone-200 disabled:text-stone-300 py-4"
            >
              Add to Cart
            </button>
          </section>
        </div>

        <div id="rug-configurator" className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start scroll-mt-32 pt-8 border-t border-stone-100">

          {/* Long-form product description */}
          <section className="lg:col-span-3 min-w-0">
            <h2 className="font-serif text-2xl font-light text-stone-900 mb-3">Description</h2>
            {rug.description ? (
              <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-line">{rug.description}</p>
            ) : rug.about_content_html ? (
              <div
                className="prose-content"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rug.about_content_html, {
                  ALLOWED_TAGS: PROSE_ALLOWED_TAGS,
                  ALLOWED_ATTR: PROSE_ALLOWED_ATTR,
                }) }}
              />
            ) : (
              <p className="text-stone-400 text-sm">No additional description is available.</p>
            )}
            {rug.additional_information_html && <div className="mt-10 pt-8 border-t border-stone-100">
              <h2 className="font-serif text-2xl font-light text-stone-900 mb-4">Additional Notes &amp; Information</h2>
              <div
                className="prose-content text-stone-600"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rug.additional_information_html, {
                  ALLOWED_TAGS: PROSE_ALLOWED_TAGS,
                  ALLOWED_ATTR: PROSE_ALLOWED_ATTR,
                }) }}
              />
            </div>}
          </section>

          {/* Direct-purchase configurator */}
          <div className="lg:col-span-2">
            <div className="space-y-5 w-full">
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
                    <h2 className="font-serif text-2xl font-light text-stone-900">Choose Size &amp; Purchase</h2>
                    <p className="text-stone-400 text-sm mt-1">Select an available size for an instant estimate and direct checkout.</p>
                  </div>

                  <form onSubmit={(event) => event.preventDefault()} className="p-4 sm:p-5">
                    <div className="space-y-4">
                    {rug.color_options.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-stone-400 text-xs font-medium uppercase tracking-widest">Color</p>
                        <div className="flex flex-wrap gap-2">
                          {rug.color_options.map((color) => {
                            const isSelected = selectedColor === color.name;
                            return (
                              <button
                                key={color.name}
                                type="button"
                                onClick={() => { setSelectedColor(color.name); setActiveSlide(0); }}
                                className={`flex items-center gap-2 border px-3 py-2 text-xs transition-colors ${isSelected ? 'border-stone-900 text-stone-900' : 'border-stone-200 text-stone-600 hover:border-stone-400'}`}
                                aria-pressed={isSelected}
                              >
                                <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} />
                                {color.name}
                                {isSelected && <CheckCircle size={12} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
                                onClick={() => {
                                  setForm((f) => ({ ...f, size_w: dispW, size_h: dispH }));
                                  setPriceResult(null);
                                  void calcPrice({ size_w: dispW, size_h: dispH });
                                }}
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
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <button type="button" onClick={() => void calcPrice()} disabled={calcLoading}
                          className="w-full flex items-center justify-center gap-2 text-xs font-medium text-stone-600 hover:text-stone-900 border border-stone-200 hover:border-stone-400 px-3 py-2.5 transition-colors uppercase tracking-wider"
                        >
                          {calcLoading
                            ? <div className="w-3.5 h-3.5 border border-stone-400 border-t-transparent rounded-full animate-spin" />
                            : <Zap size={13} />}
                          Estimate
                        </button>
                        {priceResult && (
                          <div className="mt-2 border border-stone-100 bg-stone-50 p-3 space-y-1.5">
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
                            <div className="flex justify-between text-xs pt-1 border-t border-stone-200">
                              <span className="text-stone-400">Shipping</span>
                              <span className="text-stone-700">
                                {priceResult.shipping_cost > 0 ? `+${displayPrice(priceResult.shipping_cost, priceResult.price_currency)}` : 'Free'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm font-medium pt-1 border-t border-stone-200">
                              <span className="text-stone-900">Estimated Total</span>
                              <span className="text-stone-900">{displayPrice(priceResult.estimated_total, priceResult.price_currency)}</span>
                            </div>
                            <p className="text-stone-400 text-xs">Expected delivery: ~{priceResult.estimated_days} days</p>
                            {!priceResult.material_available && (
                              <div className="border border-amber-200 bg-amber-50 p-3 space-y-2">
                                <p className="text-amber-800 text-xs leading-relaxed">
                                  Immediate checkout is unavailable for this size and quantity because current material stock is insufficient. This rug is still available for a custom quote.
                                </p>
                                <button
                                  type="button"
                                  onClick={openQuoteRequest}
                                  className="text-xs font-medium uppercase tracking-wider text-stone-900 border-b border-stone-500 pb-0.5"
                                >
                                  Request a Quote
                                </button>
                              </div>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2 mt-1">
                              <button type="button"
                                disabled={!priceResult.material_available}
                                onClick={() => {
                                  if (!priceResult.material_available) return;
                                  addItem({
                                    rug_id: rug.id, rug_name: rug.name, image_url: coverImage,
                                    size_w: sizeWMetres, size_h: sizeHMetres, shape: form.shape,
                                    qty: parseInt(form.qty) || 1, rush_order: form.rush_order,
                                    notes: form.notes || undefined,
                                    selected_color: selectedColor || undefined,
                                  });
                                  setAddedToCart(true);
                                  setTimeout(() => setAddedToCart(false), 2500);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 border border-stone-300 hover:border-stone-900 disabled:border-stone-200 disabled:text-stone-300 text-stone-900 text-xs font-medium tracking-widest uppercase py-2.5 transition-colors"
                              >
                                {addedToCart ? <><CheckCircle size={13} className="text-green-600" /> Added</> : <><ShoppingBag size={13} /> Add to Cart</>}
                              </button>
                              <button type="button"
                                disabled={!priceResult.material_available}
                                onClick={() => navigate('/checkout', {
                                  state: {
                                    items: [{
                                      rug_id: rug.id, rug_name: rug.name, image_url: coverImage,
                                      size_w: sizeWMetres, size_h: sizeHMetres,
                                      qty: parseInt(form.qty) || 1, rush_order: form.rush_order,
                                      shape: form.shape,
                                      notes: form.notes || undefined,
                                      selected_color: selectedColor || undefined,
                                      estimated_price: priceResult.final_price,
                                      rush_surcharge: priceResult.rush_surcharge,
                                      pre_gst_price: priceResult.pre_gst_price,
                                      gst_pct: priceResult.gst_pct, gst_amount: priceResult.gst_amount,
                                      gst_inclusive: priceResult.gst_inclusive,
                                      price_currency: priceResult.price_currency ?? 'INR',
                                      estimated_days: priceResult.estimated_days,
                                    }],
                                    name: form.name || undefined, email: form.email || undefined, phone: form.phone || undefined,
                                  },
                                })}
                                className="flex-1 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-medium tracking-widest uppercase py-2.5 transition-colors"
                              >
                                Buy Now
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {!hasSize && (
                      <div className="border border-stone-200 px-4 py-5 text-center">
                        <Zap size={18} className="mx-auto text-stone-300 mb-2" />
                        <p className="text-stone-600 text-sm">Your estimate will appear here</p>
                        <p className="text-stone-400 text-xs mt-1">Select a size above to continue.</p>
                      </div>
                    )}

                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
        {faqs.length > 0 && <section className="max-w-4xl border-t border-stone-100 pt-10 pb-4">
          <p className="storefront-eyebrow text-stone-400">Helpful answers</p>
          <h2 className="font-serif text-3xl font-light text-stone-900 mt-2 mb-6">Frequently Asked Questions</h2>
          <div className="divide-y divide-stone-200 border-y border-stone-200">{faqs.map(item => <div key={item.id}>
            <button type="button" onClick={() => setOpenFaq(openFaq === item.id ? null : item.id)} aria-expanded={openFaq === item.id} className="w-full flex items-center justify-between gap-4 py-5 text-left text-stone-900">
              <span className="font-medium">{item.question}</span><ChevronDown size={18} className={`flex-shrink-0 transition-transform ${openFaq === item.id ? 'rotate-180' : ''}`}/>
            </button>
            {openFaq === item.id && <p className="pb-5 pr-10 text-stone-600 text-sm leading-relaxed whitespace-pre-line">{item.answer}</p>}
          </div>)}</div>
        </section>}
      </div>

      {/* Full-screen image preview */}
      {expandedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expanded rug image"
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/90 p-4 sm:p-8"
          onClick={() => setExpandedImage(null)}
        >
          <button
            type="button"
            onClick={() => setExpandedImage(null)}
            aria-label="Close expanded image"
            className="absolute right-4 top-4 sm:right-6 sm:top-6 w-10 h-10 flex items-center justify-center bg-white text-stone-900 hover:bg-stone-100 transition-colors"
          >
            <X size={20} />
          </button>
          <img
            src={expandedImage.src}
            alt={expandedImage.alt}
            className="w-full h-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      {/* Quote request modal — rug is fixed; customer supplies the required size. */}
      {quoteModal && rug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-label="Request a quote" className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <div>
                <p className="text-stone-400 text-xs uppercase tracking-widest">Request a Quote</p>
                <h3 className="font-serif text-xl font-light text-stone-900 mt-0.5">{rug.name}</h3>
              </div>
              <button onClick={() => setQuoteModal(false)} className="text-stone-400 hover:text-stone-900 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex gap-3 bg-stone-50 border border-stone-100 p-3">
                {coverImage && <img src={coverImage} alt="" className="w-16 h-20 object-contain bg-white" />}
                <div className="min-w-0">
                  <p className="text-stone-900 text-sm font-medium">{rug.name}</p>
                  <p className="text-stone-500 text-xs mt-1">{rug.material}{rug.weave_type ? ` · ${rug.weave_type}` : ''}</p>
                  <p className="text-stone-400 text-xs mt-1">Rug details are pre-selected.</p>
                </div>
              </div>

              {isCustomerAuthenticated && customer ? (
                <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-2.5">
                  <CheckCircle size={13} className="text-green-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-stone-900 text-xs font-medium truncate">{customer.name}</p>
                    <p className="text-stone-400 text-xs truncate">{customer.email}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-stone-500 text-xs font-medium block mb-1 uppercase tracking-wider">Full Name *</label>
                    <input value={quoteDetails.name} onChange={(e) => setQuoteDetails((current) => ({ ...current, name: e.target.value }))}
                      className="w-full border border-stone-200 px-3 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400" />
                  </div>
                  <div>
                    <label className="text-stone-500 text-xs font-medium block mb-1 uppercase tracking-wider">Email *</label>
                    <input type="email" value={quoteDetails.email} onChange={(e) => setQuoteDetails((current) => ({ ...current, email: e.target.value }))}
                      className="w-full border border-stone-200 px-3 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400" />
                  </div>
                  <div>
                    <label className="text-stone-500 text-xs font-medium block mb-1 uppercase tracking-wider">Phone / WhatsApp</label>
                    <input value={quoteDetails.phone} onChange={(e) => setQuoteDetails((current) => ({ ...current, phone: e.target.value }))}
                      className="w-full border border-stone-200 px-3 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400" />
                  </div>
                  <div>
                    <label className="text-stone-500 text-xs font-medium block mb-1 uppercase tracking-wider">Company</label>
                    <input value={quoteDetails.company} onChange={(e) => setQuoteDetails((current) => ({ ...current, company: e.target.value }))}
                      className="w-full border border-stone-200 px-3 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400" />
                  </div>
                </div>
              )}

              <div>
                <label className="text-stone-500 text-xs font-medium block mb-1 uppercase tracking-wider">Requested Size *</label>
                <div className="grid grid-cols-[1fr_1fr_110px] gap-2">
                  <div>
                    <label className="text-stone-400 text-xs block mb-1" htmlFor="quote-size-width">Width</label>
                    <input id="quote-size-width" type="number" min="0.1" step="0.1" value={quoteDetails.size_w}
                      onChange={(e) => setQuoteDetails((current) => ({ ...current, size_w: e.target.value }))}
                      className="w-full border border-stone-200 px-3 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400" />
                  </div>
                  <div>
                    <label className="text-stone-400 text-xs block mb-1" htmlFor="quote-size-height">Height</label>
                    <input id="quote-size-height" type="number" min="0.1" step="0.1" value={quoteDetails.size_h}
                      onChange={(e) => setQuoteDetails((current) => ({ ...current, size_h: e.target.value }))}
                      className="w-full border border-stone-200 px-3 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400" />
                  </div>
                  <div>
                    <label className="text-stone-400 text-xs block mb-1" htmlFor="quote-size-unit">Unit</label>
                    <div className="relative">
                    <select value={quoteDetails.unit} onChange={(e) => setQuoteDetails((current) => ({ ...current, unit: e.target.value }))}
                      id="quote-size-unit"
                      className="w-full appearance-none border border-stone-200 bg-white px-2 pr-7 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400">
                      {SIZE_UNITS.filter((unit) => unit.code !== 'both').map((unit) => <option key={unit.code} value={unit.code}>{unit.label}</option>)}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" />
                    </div>
                  </div>
                </div>
                <p className="text-stone-400 text-xs mt-1">Enter the exact dimensions you want us to quote.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-500 text-xs font-medium block mb-1 uppercase tracking-wider">Room / Purpose</label>
                  <div className="relative">
                    <select value={quoteDetails.room_type} onChange={(e) => setQuoteDetails((current) => ({ ...current, room_type: e.target.value }))}
                      className="w-full appearance-none border border-stone-200 bg-white px-3 pr-8 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400">
                      {QUOTE_ROOM_TYPES.map((option) => <option key={option}>{option}</option>)}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  </div>
                </div>
                <div>
                  <label className="text-stone-500 text-xs font-medium block mb-1 uppercase tracking-wider">Material Preference</label>
                  <div className="relative">
                    <select value={quoteDetails.material_preference} onChange={(e) => setQuoteDetails((current) => ({ ...current, material_preference: e.target.value }))}
                      className="w-full appearance-none border border-stone-200 bg-white px-3 pr-8 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400">
                      {QUOTE_MATERIALS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  </div>
                </div>
                {quoteDetails.material_preference === 'other' && (
                  <div className="sm:col-span-2">
                    <input value={quoteDetails.material_other} onChange={(e) => setQuoteDetails((current) => ({ ...current, material_other: e.target.value }))}
                      placeholder="Specify material" className="w-full border border-stone-200 px-3 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400" />
                  </div>
                )}
                <div>
                  <label className="text-stone-500 text-xs font-medium block mb-1 uppercase tracking-wider">Budget Range</label>
                  <div className="relative">
                    <select value={quoteDetails.budget_range} onChange={(e) => setQuoteDetails((current) => ({ ...current, budget_range: e.target.value }))}
                      className="w-full appearance-none border border-stone-200 bg-white px-3 pr-8 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400">
                      {QUOTE_BUDGETS.map((option) => <option key={option}>{option}</option>)}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  </div>
                </div>
                <div>
                  <label className="text-stone-500 text-xs font-medium block mb-1 uppercase tracking-wider">Expected Delivery</label>
                  <div className="relative">
                    <select value={quoteDetails.expected_delivery} onChange={(e) => setQuoteDetails((current) => ({ ...current, expected_delivery: e.target.value }))}
                      className="w-full appearance-none border border-stone-200 bg-white px-3 pr-8 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400">
                      {QUOTE_DELIVERY.map((option) => <option key={option}>{option}</option>)}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-stone-500 text-xs font-medium block mb-1 uppercase tracking-wider">Describe Your Requirements</label>
                <textarea rows={3} maxLength={1500} value={quoteDetails.notes}
                  onChange={(e) => setQuoteDetails((current) => ({ ...current, notes: e.target.value }))}
                  placeholder="Colors, placement, changes, or anything else we should know…"
                  className="w-full border border-stone-200 px-3 py-2.5 text-stone-900 text-sm resize-none focus:outline-none focus:border-stone-400" />
              </div>

              <div>
                <label className="text-stone-500 text-xs font-medium block mb-2 uppercase tracking-wider">Reference Images ({quoteDetails.reference_image_urls.length}/{MAX_QUOTE_IMAGES})</label>
                <div className="flex flex-wrap gap-2">
                  {quoteDetails.reference_image_urls.map((url) => (
                    <div key={url} className="relative w-16 h-16 border border-stone-200">
                      <img src={url} alt="Reference" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setQuoteDetails((current) => ({ ...current, reference_image_urls: current.reference_image_urls.filter((item) => item !== url) }))}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center"><X size={11} /></button>
                    </div>
                  ))}
                  {quoteDetails.reference_image_urls.length < MAX_QUOTE_IMAGES && (
                    <label className="w-16 h-16 border border-dashed border-stone-300 flex items-center justify-center cursor-pointer hover:border-stone-500">
                      {quoteDetails.uploading ? <div className="w-4 h-4 border border-stone-400 border-t-transparent rounded-full animate-spin" /> : <Upload size={16} className="text-stone-400" />}
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={quoteDetails.uploading}
                        onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadQuoteReference(file); e.target.value = ''; }} />
                    </label>
                  )}
                </div>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-3 text-red-600 text-xs">
                  <AlertTriangle size={12} /> {submitError}
                </div>
              )}

              <button
                type="button"
                onClick={submitSelectedQuote}
                disabled={submitting || !hasSize}
                className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-medium tracking-widest uppercase py-3.5 transition-colors flex items-center justify-center gap-2"
              >
                {submitting
                  ? <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                  : isCustomerAuthenticated ? <Send size={13} /> : <LogIn size={13} />}
                {submitting ? 'Submitting…' : isCustomerAuthenticated ? 'Submit Quote Request' : 'Sign In & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

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
