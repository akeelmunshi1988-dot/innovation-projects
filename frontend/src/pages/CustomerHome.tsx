import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, CornerDownLeft, Layers, Zap, Play, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import { useCurrency } from '../contexts/CurrencyContext';
import { getPublicSettings } from '../services/api';
import type { Testimonial, ProjectGalleryItem, CatalogSize } from '../types';

interface ShowcaseVideo {
  id: number;
  title: string;
  description: string | null;
  video_url: string;
  poster_url: string | null;
  is_intro?: boolean;
}

interface CatalogRug {
  id: number;
  slug: string;
  name: string;
  description: string;
  material: string;
  material_type: string;
  weave_type: string;
  pile_height: string;
  image_url: string | null;
  images: { id: number; image_url: string; sort_order: number }[];
  display_price: number | null;
  default_size: CatalogSize | null;
  lead_time_days: number;
  sizes: CatalogSize[];
  available: boolean;
}

const SHOW_HERO = true;
const SHOW_FEATURED_RUGS = false;
// "Our Craft" section: true = full-bleed background video, false = full-width static image
// (uses the intro video's poster image, or falls back to the first workshop photo)
const SHOW_CRAFT_VIDEO = true;
// Fallback full-bleed hero image (Pexels, "beige and brown rug with a leaf design" by Beyzanur K.),
// used until the admin uploads a custom one under Business Settings → General.
const HERO_IMAGE_URL = 'https://images.pexels.com/photos/28379848/pexels-photo-28379848.jpeg?auto=compress&cs=tinysrgb&w=1920';

interface WorkshopPhoto {
  id: number;
  caption: string;
  description: string | null;
  image_url: string;
}

const HOW = [
  { n: '01', title: 'Buyer Request',                 desc: 'Share your vision, room dimensions, and style — our team scopes your custom rug request.' },
  { n: '02', title: 'CAD Approval',                  desc: 'A CAD rendering of your design is prepared and shared for sign-off before any material is touched.' },
  { n: '03', title: 'Material Dyeing',                desc: 'Wool, silk, cotton, or synthetic fibres are dyed in-house to your approved colourway.' },
  { n: '04', title: 'Color Check',                    desc: 'Dyed yarn is matched against the approved palette for consistency before weaving begins.' },
  { n: '05', title: 'Weaving',                        desc: 'Master artisans hand-knot every rug on traditional looms, weeks or months in the making.' },
  { n: '06', title: 'Finishing, Washing & Stretching', desc: 'Each rug is trimmed, washed, and stretched to its final shape and pile.' },
  { n: '07', title: 'Quality Check',                  desc: 'Every piece is checked for weave density, accurate sizing, and dye consistency before it ships.' },
  { n: '08', title: 'Packaging & Delivery',           desc: 'Packed and shipped worldwide, with export documentation handled for you door to door.' },
];

const WHY_LOOMCRAFT = [
  { stat: '20+', label: 'Years Craftsmanship', desc: 'Two decades weaving for discerning homes and hospitality brands worldwide.' },
  { stat: '100%', label: 'Artisan-Made', desc: 'Every rug is hand-knotted by skilled weavers — no machine shortcuts.' },
  { stat: 'MTO', label: 'Made-to-Order', desc: 'Every size and every colourway is woven specifically for your space.' },
  { stat: 'Export', label: 'Export Quality', desc: 'Rigorous quality control meets the standards of international buyers.' },
];

const TRUST_BAR = ['Handmade', 'Custom Sizes', 'Worldwide Shipping', 'Family Workshop', 'Sustainable Materials'];

const SHOP_TABS = [
  { key: 'space' as const, label: 'Shop by Space' },
  { key: 'mood' as const, label: 'Shop by Mood' },
  { key: 'material' as const, label: 'Shop by Material' },
];

const ROOM_TYPES = [
  { v: 'living_room', label: 'Living Room', image: '/static/shop-by-space/living_room.jpg' },
  { v: 'bedroom', label: 'Bedroom', image: '/static/shop-by-space/bedroom.jpg' },
  { v: 'dining_room', label: 'Dining Room', image: '/static/shop-by-space/dining_room.jpg' },
  { v: 'entryway', label: 'Entryway', image: '/static/shop-by-space/entryway.jpg' },
];

const MATERIAL_TEXTURES = [
  { id: 'wool', label: 'Wool', desc: 'Warm, durable, naturally stain-resistant', image: '/static/materials/wool.jpg' },
  { id: 'silk', label: 'Silk', desc: 'Lustrous, formal spaces, exceptional sheen', image: '/static/materials/silk.jpg' },
  { id: 'cotton', label: 'Cotton', desc: 'Casual, easy-care, vibrant colours', image: '/static/materials/cotton.jpg' },
  { id: 'synthetic', label: 'Synthetic', desc: 'Stain-proof, outdoor, budget-friendly', image: '/static/materials/synthetic.jpg' },
];

const MOOD_TAGS = [
  { v: 'warm_earthy', label: 'Warm & Earthy' },
  { v: 'quiet_luxury', label: 'Quiet Luxury' },
  { v: 'modern_minimal', label: 'Modern Minimal' },
  { v: 'bohemian', label: 'Bohemian' },
  { v: 'bold_artistic', label: 'Bold & Artistic' },
  { v: 'timeless_traditional', label: 'Timeless Traditional' },
];

// Five-image editorial composition modelled on the reference. Each additional
// set repeats the art-directed canvas so every CMS image remains visible.
const GALLERY_MOSAIC_LAYOUTS = [
  'col-span-2 aspect-[4/3] md:aspect-auto md:col-start-1 md:col-span-5 md:row-start-1 md:row-span-4',
  'col-span-1 aspect-square md:aspect-auto md:col-start-10 md:col-span-3 md:row-start-1 md:row-span-3',
  'col-span-1 aspect-square md:aspect-auto md:col-start-1 md:col-span-3 md:row-start-6 md:row-span-3',
  'col-span-1 aspect-[3/4] md:aspect-auto md:col-start-4 md:col-span-3 md:row-start-7 md:row-span-4',
  'col-span-1 aspect-[3/4] md:aspect-auto md:col-start-7 md:col-span-5 md:row-start-5 md:row-span-6',
] as const;

export default function CustomerHome() {
  const [catalog, setCatalog] = useState<CatalogRug[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [sort, setSort] = useState<'newest' | 'popular'>('newest');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [videos, setVideos] = useState<ShowcaseVideo[]>([]);
  const [introIndex, setIntroIndex] = useState(0);
  const [aiConsultantEnabled, setAiConsultantEnabled] = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [heroImages, setHeroImages] = useState<{ image_url: string; alt_text?: string }[]>([]);
  const [heroSlide, setHeroSlide] = useState(0);
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  const [heroEyebrow, setHeroEyebrow] = useState<string | null>(null);
  const [heroHeading, setHeroHeading] = useState<string | null>(null);
  const [heroCtaLabel, setHeroCtaLabel] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<{ email: string | null; phone: string | null; address: string | null }>({ email: null, phone: null, address: null });
  const [workshopPhotos, setWorkshopPhotos] = useState<WorkshopPhoto[]>([]);
  const [journeySteps, setJourneySteps] = useState<{ id: number; title: string; description: string | null }[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [galleryItems, setGalleryItems] = useState<ProjectGalleryItem[]>([]);
  const [testimonialSlide, setTestimonialSlide] = useState(0);
  const [shopTab, setShopTab] = useState<'space' | 'mood' | 'material'>('space');
  const { displayPrice } = useCurrency();

  useEffect(() => {
    setCatalogLoading(true);
    axios.get('/api/customer/catalog', { params: { sort, limit: 20 } })
      .then(({ data }) => { setCatalog(data.items); setCatalogTotal(data.total); })
      .catch(() => {})
      .finally(() => setCatalogLoading(false));
  }, [sort]);

  useEffect(() => {
    axios.get('/api/customer/showcase-videos')
      .then(({ data }) => setVideos(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    axios.get('/api/customer/workshop-photos')
      .then(({ data }) => setWorkshopPhotos(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    axios.get('/api/customer/journey-steps')
      .then(({ data }) => setJourneySteps(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    getPublicSettings()
      .then((data) => {
        setAiConsultantEnabled(data.ai_assistant_enabled);
        setBusinessName(data.business_name || '');
        setHeroImageUrl(data.hero_image_url || null);
        setHeroImages(data.hero_images || []);
        setHeroEyebrow(data.hero_eyebrow || null);
        setHeroHeading(data.hero_heading || null);
        setHeroCtaLabel(data.hero_cta_label || null);
        setContactInfo({
          email: data.contact_emails?.[0] ?? null,
          phone: data.contact_phones?.[0] ?? null,
          address: data.contact_address,
        });
      })
      .catch(() => setAiConsultantEnabled(true))
      .finally(() => setHeroImageLoaded(true));
  }, []);

  useEffect(() => {
    if (heroImages.length < 2) return;
    const timer = window.setInterval(() => setHeroSlide(current => (current + 1) % heroImages.length), 6000);
    return () => window.clearInterval(timer);
  }, [heroImages.length]);

  useEffect(() => {
    axios.get('/api/customer/testimonials')
      .then(({ data }) => setTestimonials(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    axios.get('/api/customer/gallery-items')
      .then(({ data }) => setGalleryItems(data))
      .catch(() => {});
  }, []);

  const featured = catalog.slice(0, 6);
  const introVideos = videos.filter((v) => v.is_intro).length > 0
    ? videos.filter((v) => v.is_intro)
    : videos.slice(0, 1);
  const gridVideos = videos.filter((v) => !introVideos.includes(v));
  const introVideo = introVideos[introIndex % (introVideos.length || 1)];
  const craftImageUrl = introVideo?.poster_url || workshopPhotos[0]?.image_url || null;
  const journeyStepsDisplay = journeySteps.length > 0
    ? journeySteps.map((s, i) => ({ n: String(i + 1).padStart(2, '0'), title: s.title, desc: s.description || '' }))
    : HOW;
  const showCraftSection = SHOW_CRAFT_VIDEO ? Boolean(introVideo) : Boolean(craftImageUrl);
  const slides = heroImages.length ? heroImages : [{ image_url: heroImageUrl || HERO_IMAGE_URL, alt_text: 'Handcrafted rug' }];
  const activeHero = slides[heroSlide % slides.length];
  const heroImage = heroImageLoaded ? activeHero.image_url : null;

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: businessName || 'DreamRugsCreation',
    url: siteUrl,
    image: heroImage,
    ...(contactInfo.email || contactInfo.phone
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            ...(contactInfo.email ? { email: contactInfo.email } : {}),
            ...(contactInfo.phone ? { telephone: contactInfo.phone } : {}),
          },
        }
      : {}),
    ...(contactInfo.address ? { address: contactInfo.address } : {}),
  };

  const openChat = (msg: string) => {
    window.dispatchEvent(new CustomEvent('loomcraftrugs:ask', { detail: { message: msg } }));
  };

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) { openChat(chatInput.trim()); setChatInput(''); }
  };

  return (
    <CustomerLayout>
      <SEO
        title="Handcrafted Custom Rugs, Made to Order"
        description="Premium handcrafted rugs custom-made to your exact size, material, and design — wool, silk, cotton, and synthetic weaves from India's finest workshops."
        image={heroImage ?? undefined}
        jsonLd={organizationJsonLd}
      />

      {/* ── HERO (full-bleed image, text centered directly on the image) ─── */}
      {SHOW_HERO && (
        <>
          <section className="relative w-full overflow-hidden aspect-[3/2] md:aspect-auto md:min-h-[640px] flex items-center justify-center">
            {heroImage ? (
              <img
                key={heroImage}
                src={heroImage}
                alt={activeHero.alt_text || 'Handcrafted rug'}
                className="absolute inset-0 w-full h-full object-cover animate-[fadeIn_.7s_ease-out]"
                fetchPriority="high"
                loading="eager"
              />
            ) : (
              <div className="absolute inset-0 bg-stone-100 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
              </div>
            )}

            <div className="relative max-w-xl px-6 text-center space-y-5">
              <p className="storefront-eyebrow text-white/80">{heroEyebrow || `${WHY_LOOMCRAFT[0].stat} Years in the Making`}</p>
              <h1 className="storefront-heading text-4xl md:text-5xl text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.4)]">
                {heroHeading || (<>Made for <em className="font-normal not-italic">Timeless</em> Spaces.</>)}
              </h1>
              <Link to="/catalog" className="storefront-link-arrow text-white justify-center">
                {heroCtaLabel || 'Explore Collection'} <ArrowRight size={14} />
              </Link>
            </div>
            {slides.length > 1 && <>
              <button type="button" aria-label="Previous hero image" onClick={() => setHeroSlide(current => (current - 1 + slides.length) % slides.length)} className="absolute left-4 md:left-8 z-10 p-3 rounded-full bg-black/25 hover:bg-black/45 text-white"><ChevronLeft size={22}/></button>
              <button type="button" aria-label="Next hero image" onClick={() => setHeroSlide(current => (current + 1) % slides.length)} className="absolute right-4 md:right-8 z-10 p-3 rounded-full bg-black/25 hover:bg-black/45 text-white"><ChevronRight size={22}/></button>
              <div className="absolute bottom-6 inset-x-0 z-10 flex justify-center gap-2">{slides.map((_, index) => <button key={index} type="button" aria-label={`Show hero image ${index + 1}`} onClick={() => setHeroSlide(index)} className={`h-1.5 rounded-full transition-all ${index === heroSlide ? 'w-8 bg-white' : 'w-2 bg-white/55'}`}/>)}</div>
            </>}
          </section>

          {/* Stat strip */}
          <div className="border-b border-stone-100">
            <div className="w-[94vw] max-w-none mx-auto px-4 py-6 flex flex-wrap gap-10 justify-center sm:justify-start">
              {[
                { v: `${catalogTotal || 8}+`, l: 'Designs' },
                { v: '4',     l: 'Materials' },
                { v: '7–60', l: 'Day Delivery' },
              ].map((s) => (
                <div key={s.l}>
                  <p className="font-serif text-2xl text-stone-900 font-light">{s.v}</p>
                  <p className="text-stone-400 text-xs uppercase tracking-wider mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── TRUST BAR ──────────────────────────────────────────────────── */}
      <section className="border-y border-stone-100 bg-stone-50">
        <div className="w-[94vw] max-w-none mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          {TRUST_BAR.map((t, i) => (
            <React.Fragment key={t}>
              <span className="text-stone-500 text-xs uppercase tracking-widest">{t}</span>
              {i < TRUST_BAR.length - 1 && <span className="hidden sm:inline text-stone-300">·</span>}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ── OUR CRAFT (text left ~40% / video right ~60%) ────────────────── */}
      {showCraftSection && (
        <section className="py-20">
          <div className="w-[94vw] max-w-none mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-12 lg:gap-16 items-center">

              {/* Description */}
              <div className="space-y-6">
                <p className="font-serif text-2xl md:text-3xl font-light text-stone-900 leading-snug">
                  Every rug that leaves our workshop passes through the hands of master weavers
                  who have spent years perfecting their craft — hand-knotting, natural dyeing,
                  and meticulous finishing, checked for weave density, accurate sizing, and
                  colourfast dyes before anything ships.
                </p>
                <Link to="/catalog" className="storefront-link-arrow">
                  Explore Collection <ArrowRight size={14} />
                </Link>
              </div>

              {/* Video / image — contained, not full-bleed */}
              <div className="relative overflow-hidden bg-stone-100 w-full" style={{ aspectRatio: '4/3' }}>
                {SHOW_CRAFT_VIDEO ? (
                  <>
                    {introVideo.poster_url && (
                      <img
                        src={introVideo.poster_url}
                        alt={introVideo.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <video
                      key={introVideo.id}
                      className="absolute inset-0 w-full h-full object-cover"
                      src={introVideo.video_url}
                      poster={introVideo.poster_url || undefined}
                      autoPlay
                      muted
                      loop={introVideos.length <= 1}
                      playsInline
                      onEnded={() => setIntroIndex((i) => (i + 1) % introVideos.length)}
                    />
                  </>
                ) : (
                  <img
                    src={craftImageUrl!}
                    alt="Our Craft"
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── WHY US ─────────────────────────────────────────────────────── */}
      <section className="w-[94vw] max-w-none mx-auto px-4 py-20">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">{businessName ? `Why ${businessName}` : 'Why Choose Us'}</p>
          <h2 className="font-serif text-4xl font-light text-stone-900">Craftsmanship you can trust</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-stone-200">
          {WHY_LOOMCRAFT.map((w) => (
            <div key={w.label} className="bg-cream-200 p-8 space-y-2">
              <p className="font-serif text-3xl font-light text-stone-900">{w.stat}</p>
              <p className="text-stone-900 text-sm font-medium">{w.label}</p>
              <p className="text-stone-500 text-xs leading-relaxed">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BEHIND THE CRAFT (hover-to-play video grid) ──────────────────── */}
      {gridVideos.length > 0 && (
        <section className="bg-stone-50 border-y border-stone-100 py-20">
          <div className="w-[94vw] max-w-none mx-auto px-4">
            <div className="mb-12">
              <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">See It Made</p>
              <h2 className="font-serif text-4xl font-light text-stone-900">Behind the Craft</h2>
            </div>

            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
                {
                  1: 'lg:grid-cols-1',
                  2: 'lg:grid-cols-2',
                  3: 'lg:grid-cols-3',
                }[gridVideos.length] ?? 'lg:grid-cols-4'
              }`}
            >
              {gridVideos.map((v) => (
                <CraftVideoCard key={v.id} video={v} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURED COLLECTION ───────────────────────────────────────── */}
      {SHOW_FEATURED_RUGS && (
        <section className="w-[94vw] max-w-none mx-auto px-4 py-20">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Our Collection</p>
              <h2 className="font-serif text-4xl font-light text-stone-900">Featured Rugs</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex border border-stone-200">
                {(['newest', 'popular'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={`text-xs px-4 py-2 font-medium uppercase tracking-wider transition-colors ${
                      sort === s
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    {s === 'newest' ? 'Newest' : 'Popular'}
                  </button>
                ))}
              </div>
              <Link
                to="/catalog"
                className="text-sm text-stone-500 hover:text-stone-900 transition-colors border-b border-stone-300 hover:border-stone-900 pb-0.5"
              >
                View All
              </Link>
            </div>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10 transition-opacity duration-200 ${catalogLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            {featured.map((rug) => (
              <Link
                key={rug.id}
                to={`/catalog/${rug.slug}`}
                className="group block"
              >
                {/* Image */}
                <div className="relative overflow-hidden bg-stone-100 aspect-[4/5]">
                  {rug.image_url ? (
                    <img
                      src={rug.image_url}
                      alt={rug.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Layers size={32} className="text-stone-300" />
                    </div>
                  )}
                  {!rug.available && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <span className="text-stone-500 text-xs tracking-widest uppercase">Unavailable</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="pt-4 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-lg font-light text-stone-900 leading-snug">{rug.name}</h3>
                    {rug.display_price != null && <p className="text-stone-900 text-sm font-medium flex-shrink-0">{displayPrice(rug.display_price)}{rug.default_size && <span className="text-stone-400 text-xs"> · {rug.default_size.ft} ft</span>}</p>}
                  </div>
                  <p className="text-stone-400 text-sm capitalize">
                    {[rug.material, rug.weave_type].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-stone-400 text-xs">{rug.lead_time_days} days · {rug.sizes.length} sizes</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── INSIDE THE WORKSHOP (editorial bento mosaic) ─────────────────── */}
      {!SHOW_FEATURED_RUGS && workshopPhotos.length > 0 && (
        <section className="w-[94vw] max-w-none mx-auto px-4 py-24">
          <div className="mb-14 max-w-2xl">
            <p className="storefront-eyebrow mb-2">Behind the Scenes</p>
            <h2 className="storefront-heading text-4xl mb-4">Inside the Workshop</h2>
            <p className="text-stone-500 leading-relaxed">
              A look at the people and process behind every rug — from raw fibre
              to the finished piece that reaches your door.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 auto-rows-[180px] lg:auto-rows-[220px] gap-4">
            {workshopPhotos.map((p, i) => (
              <div
                key={p.id}
                className={`group relative overflow-hidden bg-stone-100 ${
                  i === 0 ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'
                }`}
              >
                <img
                  src={p.image_url}
                  alt={p.caption}
                  className="w-full h-full object-cover scale-100 group-hover:scale-[1.06] transition-transform duration-[1200ms] ease-out"
                  loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/5 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className={`text-white font-serif font-light ${i === 0 ? 'text-2xl' : 'text-base'}`}>{p.caption}</p>
                  {p.description && (
                    <p className="text-stone-300 text-xs tracking-wide mt-1 max-w-xs opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      {p.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}


      {/* ── CUSTOM RUG JOURNEY (horizontal step flow, wraps into rows) ───── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cream-100 via-white to-cream-100 py-20">
        <div
          className="absolute inset-0 opacity-60 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #ddbf9155 1px, transparent 1px)', backgroundSize: '26px 26px' }}
        />
        <div className="absolute -top-28 -left-20 w-80 h-80 bg-cream-400/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -right-20 w-80 h-80 bg-stone-300/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-[94vw] max-w-6xl mx-auto px-4">
          <div className="text-center mb-20">
            <p className="storefront-eyebrow mb-2">The Process</p>
            <h2 className="storefront-heading text-4xl">Custom Rug Journey</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-16">
            {journeyStepsDisplay.map((step, i) => {
              const isLast = i === journeyStepsDisplay.length - 1;
              const isRowEnd = (i + 1) % 4 === 0;
              return (
                <div
                  key={step.n}
                  className={`group relative ${i % 2 === 1 ? 'lg:translate-y-6' : ''}`}
                >
                  <div className="relative bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 px-6 pt-9 pb-6 overflow-hidden">
                    <span className="absolute -top-4 right-2 font-serif text-7xl text-stone-100 group-hover:text-cream-300 transition-colors duration-300 select-none leading-none">
                      {step.n}
                    </span>

                    <div className="relative w-11 h-11 rounded-full bg-stone-900 text-white flex items-center justify-center font-serif text-sm mb-4">
                      {step.n}
                    </div>
                    <h3 className="relative text-stone-900 font-medium text-base">{step.title}</h3>
                    {step.desc && (
                      <p className="relative text-stone-500 text-sm leading-relaxed mt-2">{step.desc}</p>
                    )}
                  </div>

                  {!isLast && !isRowEnd && (
                    <div className="hidden lg:flex absolute top-1/2 -right-8 -translate-y-1/2 items-center justify-center text-cream-600 z-10">
                      <ArrowRight size={20} strokeWidth={1.5} />
                    </div>
                  )}
                  {!isLast && isRowEnd && (
                    <div className="hidden lg:flex absolute -bottom-11 right-4 items-center justify-center text-cream-600 z-10">
                      <CornerDownLeft size={20} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SHOP BY SPACE / MOOD / MATERIAL (tabbed) ─────────────────────── */}
      <section className="bg-stone-50 border-y border-stone-100 py-20">
        <div className="w-[94vw] max-w-none mx-auto px-4">
          <div className="text-center mb-10">
            <p className="storefront-eyebrow mb-2">Find Your Fit</p>
            <h2 className="storefront-heading text-4xl mb-8">Shop the Way You Like</h2>

            <div className="inline-flex items-center gap-1 p-1.5 bg-white border border-stone-200 rounded-full shadow-sm">
              {SHOP_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setShopTab(t.key)}
                  className={`px-6 py-2.5 rounded-full text-xs font-medium tracking-[0.15em] uppercase transition-all duration-300 ${
                    shopTab === t.key
                      ? 'bg-stone-900 text-white shadow-md'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {shopTab === 'space' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {ROOM_TYPES.map((s) => (
                <Link
                  key={s.v}
                  to={`/catalog/space/${s.v}`}
                  className="group relative overflow-hidden bg-cream-200 aspect-square flex items-center justify-center text-center p-6"
                >
                  <img
                    src={s.image}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-stone-900/35 group-hover:bg-stone-900/45 transition-colors duration-500" />
                  <span className="relative font-serif text-xl font-light text-white">{s.label}</span>
                </Link>
              ))}
            </div>
          )}

          {shopTab === 'mood' && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {MOOD_TAGS.map((m) => (
                <Link
                  key={m.v}
                  to={`/catalog/mood/${m.v}`}
                  className="storefront-cta-outline bg-white px-5 py-2.5"
                >
                  {m.label}
                </Link>
              ))}
            </div>
          )}

          {shopTab === 'material' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {MATERIAL_TEXTURES.map((mat) => (
                <Link
                  key={mat.id}
                  to={`/catalog/material/${mat.id}`}
                  className="group relative overflow-hidden bg-cream-200 aspect-square flex items-center justify-center text-center p-6"
                >
                  <img
                    src={mat.image}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-stone-900/35 group-hover:bg-stone-900/45 transition-colors duration-500" />
                  <div className="relative space-y-2">
                    <p className="font-serif text-xl font-light text-white">{mat.label}</p>
                    <p className="text-stone-200 text-xs leading-relaxed">{mat.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── LATEST TRENDING RUG DESIGNS ──────────────────────────────────── */}
      {catalog.length > 0 && (
        <section className="w-[94vw] max-w-none mx-auto px-4 py-20">
          <h2 className="storefront-heading text-4xl text-center mb-12">Latest Trending Rug Designs</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-10">
            {catalog.slice(0, 5).map((rug) => (
              <Link key={rug.id} to={`/catalog/${rug.slug}`} className="group block">
                <div className="relative overflow-hidden bg-stone-100 aspect-[3/4.5]">
                  {rug.image_url ? (
                    <>
                      <img
                        src={rug.image_url}
                        alt={rug.name}
                        loading="lazy"
                        className={`w-full h-full object-cover transition-opacity duration-500 ${rug.images?.length > 0 ? 'group-hover:opacity-0' : ''}`}
                      />
                      {rug.images?.length > 0 && (
                        <img
                          src={rug.images[0].image_url}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        />
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Layers size={28} className="text-stone-300" />
                    </div>
                  )}
                </div>
                <div className="pt-4 space-y-1 text-center">
                  <h3 className="font-serif text-base font-light text-stone-900 leading-snug">{rug.name}</h3>
                  {rug.display_price != null && <p className="text-stone-500 text-sm">
                    {displayPrice(rug.display_price)}{rug.default_size && <span className="text-stone-400 text-xs"> · {rug.default_size.ft} ft</span>}
                  </p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS (slider, 2 dark spotlight cards per page) ────────── */}
      {testimonials.length > 0 && (() => {
        const PAGE_SIZE = 2;
        const totalPages = Math.max(1, Math.ceil(testimonials.length / PAGE_SIZE));
        const currentPage = Math.min(testimonialSlide, totalPages - 1);
        const pageItems = testimonials.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

        return (
          <section className="bg-stone-50 border-y border-stone-100 py-20">
            <div className="w-[94vw] max-w-none mx-auto px-4">
              <div className="mb-12 max-w-2xl">
                <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Testimonials</p>
                <h2 className="font-serif text-4xl font-light text-stone-900">What Buyers Say</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pageItems.map((t) => (
                  <div
                    key={t.id}
                    className={`relative overflow-hidden bg-[#4a4d52] p-10 md:p-12 flex flex-col justify-between ${
                      pageItems.length === 1 ? 'md:col-span-2' : ''
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute -top-3 left-6 font-serif leading-none text-white/10 text-8xl md:text-9xl pointer-events-none select-none"
                    >
                      “
                    </span>

                    <div className="relative space-y-5">
                      {t.rating != null && (
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={13} className={i < t.rating! ? 'text-white fill-white' : 'text-white/20'} />
                          ))}
                        </div>
                      )}
                      <p className="font-serif text-xl md:text-2xl font-light italic leading-snug text-white">
                        {t.quote}
                      </p>
                    </div>

                    <div className="relative flex items-center gap-3 pt-6">
                      {t.photo_url ? (
                        <img src={t.photo_url} alt={t.author_name} width={44} height={44} loading="lazy" className="w-11 h-11 rounded-full object-cover ring-2 ring-white/15" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white text-sm font-medium">
                          {t.author_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-white text-sm font-medium">{t.author_name}</p>
                        <p className="text-stone-300 text-xs">{[t.author_title, t.country].filter(Boolean).join(' · ')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-10">
                  <button
                    type="button"
                    onClick={() => setTestimonialSlide((currentPage - 1 + totalPages) % totalPages)}
                    aria-label="Previous testimonials"
                    className="w-9 h-9 rounded-full flex items-center justify-center border border-stone-300 text-stone-600 hover:border-stone-900 hover:bg-stone-900 hover:text-white transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTestimonialSlide(i)}
                        aria-label={`Go to testimonials page ${i + 1}`}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentPage ? 'bg-stone-900' : 'bg-stone-300 hover:bg-stone-500'}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setTestimonialSlide((currentPage + 1) % totalPages)}
                    aria-label="Next testimonials"
                    className="w-9 h-9 rounded-full flex items-center justify-center border border-stone-300 text-stone-600 hover:border-stone-900 hover:bg-stone-900 hover:text-white transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* ── PROJECT GALLERY (dark-canvas editorial mosaic) ────────────────
          Inspired by the loose, irregular image wall in the Carpet demo.
          Every published project is rendered; the deterministic span pattern
          creates a random-looking composition without layout shifts. */}
      {galleryItems.length > 0 && (() => {
        return (
          <section
            className="relative overflow-hidden bg-[#0b1217] py-24 md:py-32"
            style={{
              backgroundImage: 'radial-gradient(circle at 18% 22%, rgba(255,255,255,.035), transparent 25%), linear-gradient(115deg, transparent 35%, rgba(255,255,255,.025) 35.1%, transparent 35.3%)',
            }}
          >
            <div className="w-[94vw] max-w-none mx-auto px-4 mb-16 md:mb-24">
              <p className="text-xs tracking-[0.3em] uppercase text-rug-400 mb-4">Project Gallery</p>
              {/* Edge-to-edge, viewport-scaled type — the point of this
                  reference is that the headline dominates the section at
                  any screen size, not a modest capped heading, so this
                  deliberately keeps scaling with vw all the way up rather
                  than settling into a fixed max-width text size. Uses the
                  storefront's own font-serif (Cormorant Garamond) at its
                  bold weight rather than a separate display face, so this
                  section still reads as the same typeface family as every
                  other heading on the site — just scaled and weighted up. */}
              <h2
                className="font-black uppercase text-[#c53d16] leading-[0.82] tracking-[-0.045em] text-[13vw] xl:text-[9.5vw] 2xl:text-[148px]"
                style={{ fontFamily: "'Arial Narrow', 'Roboto Condensed', Impact, sans-serif", fontStretch: 'condensed' }}
              >
                Rugs in Their<br />New Homes
              </h2>
              <Link
                to="/project-gallery"
                className="inline-flex items-center gap-2 mt-8 text-xs font-medium tracking-[0.15em] uppercase text-cream-100 hover:text-rug-400 transition-colors pb-1 border-b border-cream-100/30 hover:border-rug-400"
              >
                View Full Gallery <ArrowRight size={14} />
              </Link>
            </div>

            <div className="w-[94vw] max-w-none mx-auto px-2 md:px-4">
              {Array.from({ length: Math.ceil(galleryItems.length / GALLERY_MOSAIC_LAYOUTS.length) }).map((_, groupIndex) => (
                <div
                  key={groupIndex}
                  className="grid grid-cols-2 gap-4 mb-4 md:mb-16 md:grid-cols-12 md:grid-rows-[repeat(10,minmax(0,92px))] lg:grid-rows-[repeat(10,minmax(0,110px))] md:gap-0"
                >
                  {galleryItems
                    .slice(groupIndex * GALLERY_MOSAIC_LAYOUTS.length, (groupIndex + 1) * GALLERY_MOSAIC_LAYOUTS.length)
                    .map((g, i) => {
                      const layout = GALLERY_MOSAIC_LAYOUTS[i];
                      const tile = (
                        <div className="group relative w-full h-full overflow-hidden bg-dark-900">
                          <img
                            src={g.image_url}
                            alt={g.caption ?? ''}
                            className="w-full h-full object-cover scale-100 group-hover:scale-[1.045] transition-transform duration-[1200ms] ease-out"
                            loading="lazy"
                          />
                          {g.caption && (
                            <div className="absolute inset-0 bg-gradient-to-t from-dark-950/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end">
                              <p className="text-cream-100 font-serif text-lg font-light px-5 pb-4">{g.caption}</p>
                            </div>
                          )}
                        </div>
                      );
                      const className = `${layout} md:p-3`;
                      return g.link_url ? (
                        <a key={g.id} href={g.link_url} target="_blank" rel="noreferrer" className={className}>
                          {tile}
                        </a>
                      ) : (
                        <Link key={g.id} to={`/project-gallery/${g.id}`} className={className}>
                          {tile}
                        </Link>
                      );
                    })}
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* ── AI CONSULTANT ─────────────────────────────────────────────── */}
      {aiConsultantEnabled && (
        <section className="bg-stone-900 py-20">
          <div className="max-w-2xl mx-auto px-4 text-center space-y-6">
            <p className="text-xs tracking-[0.2em] uppercase text-stone-400">AI Consultant</p>
            <h2 className="font-serif text-4xl font-light text-white">
              Not sure which rug suits your space?
            </h2>
            <p className="text-stone-400 leading-relaxed">
              Our AI consultant knows every material, weave, and sizing guide. Ask anything — available 24/7.
            </p>

            <form onSubmit={handleAskSubmit} className="flex gap-0 mt-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="e.g. Best rug for a 12×10 ft living room?"
                className="flex-1 bg-stone-800 border border-stone-700 focus:border-stone-500 px-4 py-3.5 text-white placeholder-stone-500 text-sm focus:outline-none transition-colors"
              />
              <button
                type="submit"
                className="bg-white hover:bg-stone-100 text-stone-900 font-medium px-6 py-3.5 text-sm flex items-center gap-2 transition-colors flex-shrink-0"
              >
                <Zap size={14} /> Ask
              </button>
            </form>

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {[
                'Best rug for high-traffic areas?',
                'Wool vs silk — which is better?',
                'Rug size for a 6-seater dining table?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => openChat(q)}
                  className="text-xs text-stone-400 hover:text-white border border-stone-700 hover:border-stone-500 rounded-full px-3 py-1.5 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

    </CustomerLayout>
  );
}

function CraftVideoCard({ video }: { video: ShowcaseVideo }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const play = () => {
    setIsPlaying(true);
    videoRef.current?.play().catch(() => {});
  };

  const stop = () => {
    setIsPlaying(false);
    const el = videoRef.current;
    if (el) { el.pause(); el.currentTime = 0; }
  };

  return (
    <div
      className="group relative overflow-hidden bg-stone-100 aspect-[3/4] cursor-pointer"
      onMouseEnter={play}
      onMouseLeave={stop}
      onClick={() => (isPlaying ? stop() : play())}
    >
      {video.poster_url ? (
        <img
          src={video.poster_url}
          alt={video.title}
          loading="lazy"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}
        />
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}>
          <Layers size={28} className="text-stone-300" />
        </div>
      )}

      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0'}`}
        src={video.video_url}
        muted
        loop
        playsInline
        preload="none"
      />

      <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/10 transition-colors duration-300" />

      {!isPlaying && (
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
          <Play size={13} className="text-stone-900 ml-0.5" fill="currentColor" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-stone-900/70 to-transparent">
        <p className="text-white text-sm font-medium">{video.title}</p>
        {video.description && (
          <p className="text-stone-300 text-xs mt-0.5 line-clamp-1">{video.description}</p>
        )}
      </div>
    </div>
  );
}
