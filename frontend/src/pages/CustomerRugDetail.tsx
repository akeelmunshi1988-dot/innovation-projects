import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DOMPurify from 'dompurify';
import {
  Layers, Send, CheckCircle, AlertTriangle, Zap, Eye,
  ChevronRight, X, LogIn, UserPlus, EyeOff, FileText, ExternalLink,
  ChevronLeft, Upload, ChevronDown, Grid3x3, Ruler, MapPin, PencilRuler,
} from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import SocialLoginButtons from '../components/SocialLoginButtons';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { catalogSizeDims, toMetres, fmtDim, inputUnit, SIZE_UNITS } from '../utils/size';
import { getPublicSettings } from '../services/api';
import type { ProductAccordionSection } from '../types';
import { COUNTRIES, SHIPPING_COUNTRY_CODES, detectCountry } from '../utils/countries';
import { PASSWORD_POLICY_HINT, passwordPolicyError } from '../utils/passwordPolicy';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import { useMeasurementUnit } from '../contexts/MeasurementContext';
import { PROSE_ALLOWED_TAGS, PROSE_ALLOWED_ATTR } from '../utils/richTextSanitize';
import type { CatalogSize, RugColorOption, RugStorySummary } from '../types';
import { useBotProtection } from '../hooks/useBotProtection';
import RugReviews, { StarRating, useRugReviews } from '../components/RugReviews';
import RugGallery from '../components/rug-detail/RugGallery';
import RugSizeSelector from '../components/rug-detail/RugSizeSelector';
import RelatedRugs from '../components/rug-detail/RelatedRugs';
import CraftsmanshipSection from '../components/rug-detail/CraftsmanshipSection';

const QUOTE_ROOM_TYPES = ['Living Room', 'Bedroom', 'Dining Room', 'Hallway / Entryway', 'Office', 'Outdoor', 'Other'];
const QUOTE_DELIVERY = ['No preference', 'ASAP / Early Delivery', 'Within 6-7 weeks', '1–2 months', '2–3 months or more'];
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

interface SharedProductContent {
  product_accordion_sections: ProductAccordionSection[];
  catalog_pdf_url: string | null;
}


export default function CustomerRugDetail() {
  const bot = useBotProtection();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { customer, customerToken, isCustomerAuthenticated, customerLogin, customerRegister } = useCustomerAuth();
  const [rug, setRug] = useState<RugDetail | null>(null);
  const { summary: reviewSummary, reload: reloadReviews } = useRugReviews(rug?.id);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [faqs, setFaqs] = useState<ProductFAQ[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openProductInfo, setOpenProductInfo] = useState<string | null>(null);
  const [sharedProductContent, setSharedProductContent] = useState<SharedProductContent>({
    product_accordion_sections: [],
    catalog_pdf_url: null,
  });
  // Flat storefront shipping charge (null/0 = free) — feeds the Offer's shippingDetails markup.
  const [shippingRate, setShippingRate] = useState(0);

  const [activeQuote, setActiveQuote] = useState<{ quote_id: number; status: string; final_price: number | null; price_currency: string } | null>(null);

  const { sizeUnit, setSizeUnit } = useMeasurementUnit();
  // Identifies the selected standard size independent of display unit (a size's
  // `ft` value is always present, unlike `cm`) — see the size-seeding effect
  // below for why the selection can't be tracked from form.size_w/size_h alone.
  const [selectedSizeKey, setSelectedSizeKey] = useState<string | null>(null);
  // Custom Size tile: while on, form.size_w/size_h hold the customer's own
  // typed dimensions instead of a catalog size's.
  const [customSize, setCustomSize] = useState(false);
  const [customSizeError, setCustomSizeError] = useState<string | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  // Lets the lightbox keyboard handler step through images computed at render time.
  const lightboxStepRef = useRef<(delta: number) => void>(() => {});
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [expandedImage, setExpandedImage] = useState<{ src: string; alt: string } | null>(null);
  const [expandedImageIndex, setExpandedImageIndex] = useState(0);

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
  const [quoteMaterials, setQuoteMaterials] = useState<{ id: number; name: string }[]>([]);
  const [quoteMaterialsError, setQuoteMaterialsError] = useState(false);
  // Design story written for this rug, if any (admin /admin/stories).
  const [story, setStory] = useState<RugStorySummary | null>(null);
  useEffect(() => {
    if (!rug?.id) return;
    axios.get<RugStorySummary[]>('/api/customer/stories')
      .then(({ data }) => setStory(data.find((s) => s.rug_id === rug.id) ?? null))
      .catch(() => setStory(null));
  }, [rug?.id]);

  useEffect(() => {
    axios.get<{ id: number; name: string }[]>('/api/customer/materials')
      .then(({ data }) => setQuoteMaterials(data))
      .catch(() => setQuoteMaterialsError(true));
  }, []);
  const [quoteDetails, setQuoteDetails] = useState({
    name: customer?.name ?? '', email: customer?.email ?? '', phone: '', company: '',
    room_type: QUOTE_ROOM_TYPES[0], material_preference: 'no_preference', material_other: '',
    budget_range: '', expected_delivery: QUOTE_DELIVERY[0], notes: '',
    size_w: '', size_h: '', unit: 'ft', qty: '1',
    reference_image_urls: [] as string[], uploading: false,
  });

  // Optional auth modal. Guests can submit a quote without creating an account,
  // but can sign in/register first if they want the request in My Quotes.
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
      .then((data) => {
        setSizeUnit(data.default_size_unit || 'ft');
        setSharedProductContent({
          product_accordion_sections: data.product_accordion_sections,
          catalog_pdf_url: data.catalog_pdf_url,
        });
        setShippingRate(data.default_shipping_rate ?? 0);
      })
      .catch(() => {});
  }, []);

  // Reset the tracked selection when navigating to a different rug.
  useEffect(() => {
    setSelectedSizeKey(null);
    setCustomSize(false);
    setCustomSizeError(null);
    setDescriptionExpanded(false);
  }, [rug?.id]);

  // Re-derives form.size_w/size_h from the selected size (falling back to the
  // catalog default) every time the rug, the display unit, or the selection
  // itself changes. Keying the lookup on selectedSizeKey (a size's `ft` value,
  // always present) rather than re-matching form.size_w/size_h against the new
  // unit's numbers is what makes this safe across a unit switch — matching by
  // the *previous* unit's raw numbers against the *new* unit is exactly what
  // silently left size_w/size_h holding stale, wrong-unit numbers (e.g. a `6`
  // meant as feet getting reinterpreted as 6cm) whenever the selected size had
  // no vendor-entered cm value, which is what broke pricing when toggling to
  // cm on such rugs.
  useEffect(() => {
    if (!rug?.sizes.length || customSize) return;
    const target = (selectedSizeKey ? rug.sizes.find((size) => size.ft === selectedSizeKey) : undefined)
      ?? rug.sizes.find((size) => size.is_default) ?? rug.sizes[0];
    const dimensions = catalogSizeDims(target, inputUnit(sizeUnit));
    setForm((current) => ({
      ...current,
      size_w: dimensions ? String(dimensions[0]) : '',
      size_h: dimensions ? String(dimensions[1]) : '',
      shape: 'rect',
    }));
    // A previous estimate is for the old unit's dimensions and no longer
    // applies once we can't represent the selected size in the new unit.
  }, [rug, sizeUnit, selectedSizeKey, customSize]);

  useEffect(() => {
    if (!expandedImage) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpandedImage(null);
      if (event.key === 'ArrowLeft') lightboxStepRef.current(-1);
      if (event.key === 'ArrowRight') lightboxStepRef.current(1);
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

  const selectedCatalogSize = (selectedSizeKey ? rug?.sizes.find((size) => size.ft === selectedSizeKey) : undefined)
    ?? rug?.sizes.find((size) => size.is_default) ?? rug?.sizes[0];
  const selectedLeadTimeDays = selectedCatalogSize?.lead_time_days ?? rug?.lead_time_days ?? 21;

  const selectCatalogSize = (size: CatalogSize) => {
    // Every listed size is selectable regardless of whether its label parses
    // into numeric width/height (e.g. a free-text size like "3 round ft") —
    // only the quote form's size_w/size_h prefill depends on that; when it
    // can't be parsed, those are left blank for the customer to fill in.
    const dims = catalogSizeDims(size, inputUnit(sizeUnit));
    setCustomSize(false);
    setCustomSizeError(null);
    setSelectedSizeKey(size.ft);
    setForm((current) => ({
      ...current,
      size_w: dims ? String(dims[0]) : '',
      size_h: dims ? String(dims[1]) : '',
    }));
  };

  // Custom dimensions are re-expressed in the new unit (via the shared size
  // helpers) rather than reinterpreted, so 6 ft never silently becomes 6 cm.
  const changeSizeUnit = (next: 'ft' | 'cm') => {
    const previous = inputUnit(sizeUnit);
    if (customSize && previous !== next) {
      const convert = (value: string) => (parseFloat(value) > 0 ? String(Number(fmtDim(toMetres(parseFloat(value), previous), next))) : value);
      setForm((current) => ({ ...current, size_w: convert(current.size_w), size_h: convert(current.size_h) }));
    }
    setSizeUnit(next);
  };

  const openQuoteRequest = () => {
    if (!rug) return;
    if (customSize && !(parseFloat(form.size_w) > 0 && parseFloat(form.size_h) > 0)) {
      setCustomSizeError('Enter a width and length greater than zero to continue.');
      document.getElementById('custom-size-width')?.focus();
      return;
    }
    const room = rug.room_types?.[0]?.replace(/_/g, ' ');
    const matchingRoom = QUOTE_ROOM_TYPES.find((option) => option.toLowerCase() === room?.toLowerCase());
    const material = quoteMaterials.find(option => option.name === rug.material)?.name || 'other';
    const selectedSize = selectedCatalogSize;
    setQuoteDetails((current) => ({
      ...current,
      name: customer?.name ?? current.name,
      email: customer?.email ?? current.email,
      phone: current.phone,
      company: current.company,
      room_type: matchingRoom ?? current.room_type,
      material_preference: material,
      material_other: material === 'other' ? rug.material : '',
      budget_range: current.budget_range,
      size_w: form.size_w || (selectedSize ? String(catalogSizeDims(selectedSize, inputUnit(sizeUnit))?.[0] ?? '') : ''),
      size_h: form.size_h || (selectedSize ? String(catalogSizeDims(selectedSize, inputUnit(sizeUnit))?.[1] ?? '') : ''),
      unit: inputUnit(sizeUnit),
      qty: form.qty || '1',
      expected_delivery: form.rush_order ? 'ASAP / Early Delivery' : selectedLeadTimeDays <= 49 ? 'Within 6-7 weeks' : selectedLeadTimeDays <= 60 ? '1–2 months' : '2–3 months or more',
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
        qty: Math.max(1, parseInt(quoteDetails.qty) || 1),
        rush_order: quoteDetails.expected_delivery === 'ASAP / Early Delivery',
        shape: 'rect',
        notes: quoteDetails.notes || null,
        room_type: quoteDetails.room_type || null,
        material_preference: quoteDetails.material_preference === 'other' ? quoteDetails.material_other.trim() : quoteDetails.material_preference,
        budget_range: quoteDetails.budget_range.trim() || null,
        expected_delivery: quoteDetails.expected_delivery || null,
        reference_image_urls: quoteDetails.reference_image_urls.length ? quoteDetails.reference_image_urls : null,
        selected_color: selectedColor || null,
      }, { headers: { ...(await bot.headers()), ...(customerToken ? { Authorization: `Bearer ${customerToken}` } : {}) } });
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
    if (!(parseInt(quoteDetails.qty) > 0)) {
      setSubmitError('Quantity must be at least 1.');
      return;
    }
    if (quoteDetails.material_preference === 'other' && !quoteDetails.material_other.trim()) {
      setSubmitError('Please specify the preferred material.');
      return;
    }
    await doSubmitQuote(
      quoteDetails.name || customer?.name || '',
      quoteDetails.email || customer?.email || '',
    );
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
          authForm.phone || undefined, authForm.company || undefined, undefined, await bot.headers(),
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

  const currency = rug.base_price_currency ?? 'INR';
  const hasSize = parseFloat(form.size_w) > 0 && (form.shape === 'circle' || parseFloat(form.size_h) > 0);
  const selectedColorOption = rug.color_options.find((color) => color.name === selectedColor);
  const coverImage = selectedColorOption?.image_url || rug.image_url;
  const previewImages = [
    ...(coverImage ? [{ src: coverImage, alt: `${rug.name}${selectedColor ? ` — ${selectedColor}` : ''}` }] : []),
    ...rug.images
      .filter((image) => image.image_url !== coverImage)
      .map((image) => ({ src: image.image_url, alt: `${rug.name} in a room setting` })),
  ];
  const openImageCarousel = (src: string, alt: string) => {
    const index = previewImages.findIndex((image) => image.src === src);
    setExpandedImageIndex(index >= 0 ? index : 0);
    setExpandedImage({ src, alt });
  };
  const showCarouselImage = (index: number) => {
    if (!previewImages.length) return;
    const normalizedIndex = (index + previewImages.length) % previewImages.length;
    setExpandedImageIndex(normalizedIndex);
    setExpandedImage(previewImages[normalizedIndex]);
  };
  lightboxStepRef.current = (delta) => showCarouselImage(expandedImageIndex + delta);
  const scrollToConfigurator = () => {
    document.getElementById('rug-configurator')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  // Material / weave / pile now live in the specifications list beside the
  // gallery; the accordion keeps only the rug's own extra HTML, if any.
  const productInfoSections = [
    ...(rug.additional_information_html ? [{
      id: 'product',
      label: 'Additional Information',
      html: rug.additional_information_html,
      fallback: '',
    }] : []),
    // Vendor-defined, open-ended list — as many (or as few) sections as the
    // admin adds in Product Detail Page settings; unlike "Product Details"
    // above, these carry no fixed identity or fallback copy.
    ...sharedProductContent.product_accordion_sections.map((section) => ({
      id: section.id,
      label: section.title,
      html: section.html,
      fallback: '',
    })),
  ];
  // Plain words ("high", "flat") read better capitalised; measured values ("8-9 MM") stay as entered.
  const pileLabel = rug.pile_height && /^[a-z\s_-]+$/.test(rug.pile_height)
    ? rug.pile_height.replace(/[_-]/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
    : rug.pile_height;
  // const leadWeeks = Math.max(1, Math.ceil(selectedLeadTimeDays / 7));
  const specifications = [
    { icon: Layers, label: 'Material', value: rug.material },
    { icon: Grid3x3, label: 'Weaving Technique', value: rug.weave_type },
    { icon: Ruler, label: 'Pile Height', value: pileLabel },
    { icon: MapPin, label: 'Origin', value: 'Handmade in Bhadohi, India' },
    { icon: PencilRuler, label: 'Customisation', value: 'Custom sizes & colours on request' },
    // Hidden for now at the owner's request; restore by uncommenting (and re-adding Clock to the lucide import).
    // { icon: Clock, label: 'Production Lead Time', value: `Approx. ${leadWeeks} week${leadWeeks === 1 ? '' : 's'}, made to order` },
  ].filter((spec) => spec.value);
  const subtitleParts = [rug.weave_type, rug.material].filter((part): part is string => Boolean(part));
  const hasStorySection = Boolean(story || rug.about_content_html);
  const canonicalProductUrl = `${window.location.origin}/catalog/${rug.slug}`;
  const structuredImageUrl = coverImage ? new URL(coverImage, window.location.origin).toString() : undefined;
  return (
    <CustomerLayout>
      <SEO
        // "Rug" in the title matches what people search; skip it when the name already says so.
        title={/\b(rug|carpet|dhurrie|runner)s?\b/i.test(rug.name) ? rug.name : `${rug.name} Rug`}
        description={
          rug.description ??
          `${rug.name}: a ${rug.material} rug${rug.weave_type ? `, ${rug.weave_type}` : ''}, handmade in India and custom-made to your exact size.`
        }
        image={coverImage ?? undefined}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: rug.name,
            description: rug.description ?? undefined,
            image: structuredImageUrl,
            material: rug.material,
            url: canonicalProductUrl,
            brand: { '@type': 'Brand', name: 'DreamRugsCreation' },
            countryOfOrigin: 'IN',
            ...(reviewSummary && reviewSummary.review_count > 0 ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: reviewSummary.average_rating,
                reviewCount: reviewSummary.review_count,
              },
            } : {}),
            ...(rug.display_price != null ? {
              offers: {
                '@type': 'Offer',
                price: rug.display_price,
                priceCurrency: currency,
                availability: rug.available
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock',
                url: canonicalProductUrl,
                // Custom-made rugs: no returns once delivered (see /refund-cancellation-policy).
                hasMerchantReturnPolicy: {
                  '@type': 'MerchantReturnPolicy',
                  applicableCountry: SHIPPING_COUNTRY_CODES,
                  returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
                },
                shippingDetails: {
                  '@type': 'OfferShippingDetails',
                  shippingRate: { '@type': 'MonetaryAmount', value: shippingRate, currency },
                  shippingDestination: SHIPPING_COUNTRY_CODES.map((addressCountry) => ({ '@type': 'DefinedRegion', addressCountry })),
                },
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
      <div className="w-[94vw] max-w-none mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 space-y-16 lg:space-y-24 text-showroom-charcoal">
        <div className="space-y-6">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-showroom-grey min-w-0">
            <Link to="/" className="hover:text-showroom-charcoal transition-colors">Home</Link>
            <ChevronRight size={11} aria-hidden="true" />
            <Link to="/catalog" className="hover:text-showroom-charcoal transition-colors">Collection</Link>
            <ChevronRight size={11} aria-hidden="true" />
            <span className="text-showroom-charcoal truncate" aria-current="page">{rug.name}</span>
          </nav>

          {/* Active quote banner */}
          {activeQuote && (
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 py-3 border ${
              activeQuote.status === 'sent'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-showroom-ivory border-showroom-border'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={15} className={activeQuote.status === 'sent' ? 'text-blue-500 flex-shrink-0' : 'text-showroom-grey flex-shrink-0'} />
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${activeQuote.status === 'sent' ? 'text-blue-800' : 'text-showroom-charcoal'}`}>
                    {activeQuote.status === 'sent' ? 'Your quote is ready for review' : 'Quote under review'}
                  </p>
                  <p className="text-xs text-showroom-grey">
                    Quote #{activeQuote.quote_id}
                  </p>
                </div>
              </div>
              <Link
                to="/my-quotes"
                className={`flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 border transition-colors flex-shrink-0 w-full sm:w-auto ${
                  activeQuote.status === 'sent'
                    ? 'bg-showroom-charcoal border-showroom-charcoal text-white hover:bg-stone-800'
                    : 'border-showroom-border text-showroom-charcoal hover:border-showroom-charcoal'
                }`}
              >
                {activeQuote.status === 'sent' ? 'Accept / Decline' : 'View Quote'} <ExternalLink size={10} />
              </Link>
            </div>
          )}

          {/* Main product area: gallery 60% / details 40% */}
          {/* DOM order (gallery, details, Good to Know) is the mobile order; on desktop
              Good to Know moves under the gallery, beside the lower half of the details panel. */}
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-x-14 xl:gap-x-20 lg:gap-y-14">
            <div className="lg:col-span-3 lg:col-start-1 lg:row-start-1 min-w-0">
              <RugGallery
                images={previewImages}
                activeIndex={activeSlide}
                onChange={setActiveSlide}
                onExpand={(index) => openImageCarousel(previewImages[index].src, previewImages[index].alt)}
              />
            </div>

            {/* Sticky only where the whole panel fits under the 102px fixed header, so it can never hide the quote button. */}
            <div className="lg:col-span-2 lg:col-start-4 lg:row-start-1 lg:row-span-2 min-w-0 lg:self-start lg:[@media(min-height:900px)]:sticky lg:[@media(min-height:900px)]:top-[126px]">
              <div className="space-y-8">
                <header className="space-y-3">
                  {rug.weave_type && (
                    <Link
                      to={`/weaves/${encodeURIComponent(rug.weave_type)}`}
                      className="inline-block text-[11px] font-medium uppercase tracking-[0.28em] text-showroom-gold hover:text-showroom-charcoal transition-colors"
                    >
                      {rug.weave_type} Collection
                    </Link>
                  )}
                  <h1 className="font-serif text-4xl font-light leading-[1.08] tracking-tight text-showroom-charcoal sm:text-5xl">{rug.name}</h1>
                  {subtitleParts.length > 0 && (
                    // Wraps normally: weave names like "Hand-knotted Indo-Tibetan" are long on phones.
                    <p className="text-xs uppercase tracking-[0.2em] text-showroom-grey">
                      {subtitleParts.map((part, index) => (
                        <span key={part} className="inline-block">
                          {index > 0 && <span className="px-3 text-showroom-border" aria-hidden="true">|</span>}
                          {part}
                        </span>
                      ))}
                    </p>
                  )}
                  {reviewSummary && reviewSummary.review_count > 0 && (
                    <a href="#reviews" className="inline-flex items-center gap-2 text-sm text-showroom-grey hover:text-showroom-charcoal transition-colors">
                      <StarRating value={reviewSummary.average_rating ?? 0} size={14} />
                      <span>{reviewSummary.average_rating?.toFixed(1)} · {reviewSummary.review_count} review{reviewSummary.review_count === 1 ? '' : 's'}</span>
                    </a>
                  )}
                  {!rug.available && <p className="text-red-600 text-sm font-medium">Currently unavailable</p>}
                  {rug.available && rug.inventory_quantity != null && rug.inventory_quantity <= 5 && (
                    <p className="text-amber-700 text-sm">Only {rug.inventory_quantity} left</p>
                  )}
                </header>

                {rug.description && (
                  <div>
                    <p className={`whitespace-pre-line text-[15px] leading-relaxed text-showroom-grey ${descriptionExpanded ? '' : 'line-clamp-3'}`}>
                      {rug.description}
                    </p>
                    {rug.description.length > 180 && (
                      <button
                        type="button"
                        onClick={() => setDescriptionExpanded((open) => !open)}
                        aria-expanded={descriptionExpanded}
                        className="mt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-showroom-charcoal border-b border-showroom-gold pb-0.5 hover:text-showroom-gold transition-colors"
                      >
                        {descriptionExpanded ? 'Read less' : 'Read more'}
                      </button>
                    )}
                  </div>
                )}

                {/* Specifications */}
                <dl className="divide-y divide-showroom-border border-y border-showroom-border">
                  {specifications.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-4 py-3">
                      <Icon size={16} strokeWidth={1.25} className="flex-shrink-0 text-showroom-gold" aria-hidden="true" />
                      <dt className="w-32 flex-shrink-0 text-[11px] uppercase tracking-[0.16em] text-showroom-grey sm:w-40">{label}</dt>
                      <dd className="min-w-0 text-sm text-showroom-charcoal">{value}</dd>
                    </div>
                  ))}
                </dl>

                {submitted && quoteResult ? (
                  <div className="border border-showroom-border bg-showroom-ivory p-8 text-center space-y-3 motion-safe:animate-[showroom-fade_400ms_ease-out]" role="status">
                    <CheckCircle size={34} strokeWidth={1.25} className="text-showroom-gold mx-auto" />
                    <h2 className="font-serif text-2xl font-light text-showroom-charcoal">Quote Requested</h2>
                    <p className="text-showroom-charcoal text-sm">Quote #{quoteResult.quote_id}</p>
                    <p className="text-showroom-grey text-sm">We'll contact you within 24 hours to confirm details.</p>
                    <p className="text-showroom-grey text-xs">Expected delivery: {quoteResult.lead_time_days} days</p>
                    <Link to="/catalog" className="inline-block text-sm text-showroom-charcoal border-b border-showroom-gold pb-0.5 hover:text-showroom-gold transition-colors">
                      Continue browsing
                    </Link>
                  </div>
                ) : (
                  <form id="rug-configurator" onSubmit={(event) => { event.preventDefault(); openQuoteRequest(); }} className="space-y-8 scroll-mt-32">
                    {rug.color_options.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-showroom-charcoal">
                          Colour{selectedColor && <span className="ml-2 normal-case tracking-normal font-normal text-showroom-grey">{selectedColor}</span>}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {rug.color_options.map((color) => {
                            const isSelected = selectedColor === color.name;
                            return (
                              <button
                                key={color.name}
                                type="button"
                                onClick={() => { setSelectedColor(color.name); setActiveSlide(0); }}
                                className={`flex items-center gap-2 border px-3 py-2 text-xs transition-colors duration-300 ${isSelected ? 'border-showroom-charcoal text-showroom-charcoal' : 'border-showroom-border text-showroom-grey hover:border-showroom-gold'}`}
                                aria-pressed={isSelected}
                              >
                                <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} />
                                {color.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <RugSizeSelector
                      sizes={rug.sizes}
                      unit={inputUnit(sizeUnit)}
                      onUnitChange={changeSizeUnit}
                      selectedKey={selectedCatalogSize?.ft ?? null}
                      onSelect={selectCatalogSize}
                      custom={customSize}
                      onSelectCustom={() => { setCustomSize(true); setCustomSizeError(null); }}
                      customWidth={form.size_w}
                      customLength={form.size_h}
                      onCustomChange={(width, length) => {
                        setCustomSizeError(null);
                        setForm((current) => ({ ...current, size_w: width, size_h: length }));
                      }}
                      customError={customSizeError}
                    />

                    {/* Request a quote */}
                    <div className="bg-showroom-ivory px-6 py-7 space-y-4">
                      <h2 className="font-serif text-2xl font-light text-showroom-charcoal">Made for Your Space</h2>
                      <p className="text-sm leading-relaxed text-showroom-grey">
                        Every rug is thoughtfully handcrafted to order. Select your preferred dimensions or request a rug made specifically for your space.
                      </p>
                      <button
                        type="submit"
                        disabled={!rug.available}
                        className="group w-full storefront-cta-solid bg-showroom-charcoal px-3 py-4 inline-flex items-center justify-center gap-2 sm:gap-3 text-[11px] sm:text-xs tracking-[0.1em] sm:tracking-[0.2em] disabled:cursor-not-allowed"
                      >
                        Request a Personalised Quote
                        <span aria-hidden="true" className="transition-transform duration-300 motion-safe:group-hover:translate-x-1">→</span>
                      </button>
                      {FEATURE_FLAGS.SHOW_DIRECT_PURCHASE && (
                        <button type="button" onClick={scrollToConfigurator} disabled={!rug.available} className="w-full storefront-cta-outline disabled:border-stone-200 disabled:text-stone-300 py-4">
                          Add to Cart
                        </button>
                      )}
                      <p className="text-center text-xs text-showroom-grey">No account needed · We reply within 24 hours</p>
                    </div>
                    {bot.fields}
                  </form>
                )}
              </div>
            </div>

            {/* Vendor-managed information (samples, care, shipping, …) */}
            {(productInfoSections.length > 0 || sharedProductContent.catalog_pdf_url) && (
              <section aria-labelledby="rug-info-heading" className="lg:col-span-3 lg:col-start-1 lg:row-start-2 min-w-0 lg:self-start">
                <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-showroom-gold">Care &amp; Delivery</p>
                <h2 id="rug-info-heading" className="mt-2 mb-4 font-serif text-3xl font-light leading-tight text-showroom-charcoal">Good to Know</h2>
                <div className="divide-y divide-showroom-border border-y border-showroom-border">
                  {productInfoSections.map((section) => {
                    const expanded = openProductInfo === section.id;
                    const content = section.html || section.fallback;
                    return (
                      <div key={section.id}>
                        <button
                          type="button"
                          onClick={() => setOpenProductInfo(expanded ? null : section.id)}
                          aria-expanded={expanded}
                          className="w-full flex items-center justify-between gap-4 py-5 text-left text-showroom-charcoal hover:text-showroom-gold transition-colors"
                        >
                          <span className="font-serif text-xl">{section.label}</span>
                          <ChevronDown size={18} strokeWidth={1.5} className={`flex-shrink-0 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </button>
                        {expanded && (
                          <div
                            className="prose-content text-showroom-grey text-sm leading-relaxed pb-6 pr-6 motion-safe:animate-[showroom-fade_300ms_ease-out]"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content, {
                              ALLOWED_TAGS: PROSE_ALLOWED_TAGS,
                              ALLOWED_ATTR: PROSE_ALLOWED_ATTR,
                            }) }}
                          />
                        )}
                      </div>
                    );
                  })}
                  {sharedProductContent.catalog_pdf_url && (
                    <a
                      href={sharedProductContent.catalog_pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-4 py-5 text-showroom-charcoal hover:text-showroom-gold transition-colors"
                    >
                      <span className="font-serif text-xl">Tearsheet</span>
                      <ExternalLink size={15} />
                    </a>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* The story behind the rug */}
        {hasStorySection && (
          <section aria-labelledby="rug-story-heading" className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-showroom-gold">The Design</p>
              <h2 id="rug-story-heading" className="mt-3 font-serif text-3xl font-light leading-tight text-showroom-charcoal sm:text-4xl">The Story Behind the Rug</h2>
            </div>
            <div className="lg:col-span-8 space-y-8 max-w-3xl">
              {rug.about_content_html && (
                <div
                  className="prose-content text-showroom-grey"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rug.about_content_html, {
                    ALLOWED_TAGS: PROSE_ALLOWED_TAGS,
                    ALLOWED_ATTR: PROSE_ALLOWED_ATTR,
                  }) }}
                />
              )}
              {story && (
                <Link
                  to={`/stories/${story.slug}`}
                  className="group grid grid-cols-[96px_1fr] sm:grid-cols-[160px_1fr] items-center gap-6 border-y border-showroom-border py-6"
                >
                  <div className="aspect-square overflow-hidden bg-showroom-ivory">
                    {story.cover_image_url && <img src={story.cover_image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.03]" />}
                  </div>
                  <div className="min-w-0 space-y-2">
                    <p className="font-serif text-2xl font-light text-showroom-charcoal leading-snug">{story.title}</p>
                    {story.inspiration && <p className="text-sm text-showroom-grey line-clamp-2">{story.inspiration}</p>}
                    <span className="storefront-link-arrow">
                      Read the story <ChevronRight size={13} className="transition-transform motion-safe:group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </section>
        )}

        <CraftsmanshipSection />

        <RugReviews rugId={rug.id} rugName={rug.name} summary={reviewSummary} onSubmitted={reloadReviews} />
        {faqs.length > 0 && <section className="max-w-4xl border-t border-showroom-border pt-10 pb-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-showroom-gold">Helpful answers</p>
          <h2 className="font-serif text-3xl font-light text-showroom-charcoal mt-3 mb-6">Frequently Asked Questions</h2>
          <div className="divide-y divide-showroom-border border-y border-showroom-border">{faqs.map(item => <div key={item.id}>
            <button type="button" onClick={() => setOpenFaq(openFaq === item.id ? null : item.id)} aria-expanded={openFaq === item.id} className="w-full flex items-center justify-between gap-4 py-5 text-left text-showroom-charcoal">
              <span className="font-medium">{item.question}</span><ChevronDown size={18} strokeWidth={1.5} className={`flex-shrink-0 transition-transform duration-300 ${openFaq === item.id ? 'rotate-180' : ''}`}/>
            </button>
            {openFaq === item.id && <p className="pb-5 pr-10 text-showroom-grey text-sm leading-relaxed whitespace-pre-line">{item.answer}</p>}
          </div>)}</div>
        </section>}

        <RelatedRugs rugId={rug.id} weave={rug.weave_type} material={rug.material} />
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
          {previewImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); showCarouselImage(expandedImageIndex - 1); }}
                aria-label="Previous image"
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-white/90 hover:bg-white text-stone-900 transition-colors"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); showCarouselImage(expandedImageIndex + 1); }}
                aria-label="Next image"
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-white/90 hover:bg-white text-stone-900 transition-colors"
              >
                <ChevronRight size={22} />
              </button>
              <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full bg-stone-950/65 px-4 py-2" onClick={(event) => event.stopPropagation()}>
                {previewImages.map((image, index) => (
                  <button
                    key={`${image.src}-${index}`}
                    type="button"
                    onClick={() => showCarouselImage(index)}
                    aria-label={`Show image ${index + 1}`}
                    aria-current={expandedImageIndex === index ? 'true' : undefined}
                    className={`rounded-full transition-all ${expandedImageIndex === index ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/80'}`}
                  />
                ))}
                <span className="ml-1 text-[11px] tabular-nums text-white/80">{expandedImageIndex + 1}/{previewImages.length}</span>
              </div>
            </>
          )}
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
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-stone-50 border border-stone-200 px-3 py-3">
                    <div>
                      <p className="text-stone-900 text-xs font-medium">Continue as a guest</p>
                      <p className="text-stone-500 text-xs mt-0.5">No account is required to request a quote.</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button type="button" onClick={() => {
                        setAuthMode('login');
                        setAuthError('');
                        setAuthForm((current) => ({ ...current, email: quoteDetails.email || current.email }));
                        setAuthModal(true);
                      }}
                        className="border border-stone-300 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-stone-700 hover:border-stone-900 hover:text-stone-900 transition-colors">
                        Sign In
                      </button>
                      <button type="button" onClick={() => {
                        setAuthMode('register');
                        setAuthError('');
                        setAuthForm((current) => ({
                          ...current,
                          name: quoteDetails.name || current.name,
                          email: quoteDetails.email || current.email,
                          phone: quoteDetails.phone || current.phone,
                          company: quoteDetails.company || current.company,
                        }));
                        setAuthModal(true);
                      }}
                        className="bg-stone-900 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-white hover:bg-stone-700 transition-colors">
                        Register
                      </button>
                    </div>
                  </div>
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
                  <label className="text-stone-500 text-xs font-medium block mb-1 uppercase tracking-wider">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quoteDetails.qty}
                    onChange={(e) => setQuoteDetails((current) => ({ ...current, qty: e.target.value }))}
                    className="w-full border border-stone-200 px-3 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400"
                  />
                </div>
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
                    <select aria-label="Material Preference" value={quoteDetails.material_preference} onChange={(e) => setQuoteDetails((current) => ({ ...current, material_preference: e.target.value }))}
                      className="w-full appearance-none border border-stone-200 bg-white px-3 pr-8 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400">
                      <option value="no_preference">No preference</option>
                      {quoteMaterials.map(option => <option key={option.id} value={option.name}>{option.name}</option>)}
                      <option value="other">Other</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  </div>
                </div>
                {quoteMaterialsError && <p className="text-xs text-stone-500 sm:col-span-2">Materials could not be loaded. Use Other to enter your preference.</p>}
                {quoteDetails.material_preference === 'other' && (
                  <div className="sm:col-span-2">
                    <input value={quoteDetails.material_other} onChange={(e) => setQuoteDetails((current) => ({ ...current, material_other: e.target.value }))}
                      maxLength={150} placeholder="Specify material" className="w-full border border-stone-200 px-3 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400" />
                  </div>
                )}
                <div>
                  <label htmlFor="quote-estimated-budget" className="text-stone-500 text-xs font-medium block mb-1 uppercase tracking-wider">Estimated Budget</label>
                  <input id="quote-estimated-budget" type="text" maxLength={100} value={quoteDetails.budget_range} onChange={(e) => setQuoteDetails(current => ({ ...current, budget_range: e.target.value }))} placeholder="e.g. GBP 500–1,000 total or USD 500 per rug" className="w-full border border-stone-200 bg-white px-3 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400" />
                  <p className="mt-1 text-xs text-stone-400">Include currency and whether the budget is per rug or total.</p>
                </div>
                <div>
                  <label className="text-stone-500 text-xs font-medium block mb-1 uppercase tracking-wider">Expected Delivery</label>
                  <div className="relative">
                    <select value={quoteDetails.expected_delivery} onChange={(e) => setQuoteDetails((current) => ({ ...current, expected_delivery: e.target.value }))}
                      className="w-full appearance-none border border-stone-200 bg-white px-3 pr-8 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400">
                      {QUOTE_DELIVERY.map((option) => <option key={option} value={option}>{option === 'ASAP / Early Delivery' ? 'ASAP / Early Delivery (extra cost)' : option}</option>)}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  </div>
                  {quoteDetails.expected_delivery === 'ASAP / Early Delivery' && <p className="mt-1 text-xs text-amber-700">Early delivery incurs an extra cost. The final charge and delivery date will be confirmed in your quote.</p>}
                </div>
              </div>

              <div>
                <label className="text-stone-500 text-xs font-medium block mb-1 uppercase tracking-wider">Describe Your Requirements <span className="normal-case font-normal">(maximum 3,000 characters)</span></label>
                <textarea aria-label="Describe Your Requirements" aria-describedby="quote-requirements-count" rows={3} maxLength={3000} value={quoteDetails.notes}
                  onChange={(e) => setQuoteDetails((current) => ({ ...current, notes: e.target.value }))}
                  placeholder="Colors, placement, changes, or anything else we should know…"
                  className="w-full border border-stone-200 px-3 py-2.5 text-stone-900 text-sm resize-none focus:outline-none focus:border-stone-400" />
                <p id="quote-requirements-count" className="mt-1 text-right text-xs text-stone-400">{quoteDetails.notes.length}/3,000 characters</p>
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
                  : <Send size={13} />}
                {submitting ? 'Submitting…' : 'Submit Quote Request'}
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
