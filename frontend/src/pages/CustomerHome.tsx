import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Layers, Zap, Play, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import { useCurrency } from '../contexts/CurrencyContext';
import { getPublicSettings } from '../services/api';
import type { Testimonial, ProjectGalleryItem } from '../types';

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
  base_price_per_sqm: number;
  lead_time_days: number;
  sizes: string[];
  available: boolean;
}

const MATERIALS = [
  { id: 'wool',      label: 'Wool',      desc: 'Warm, durable, naturally stain-resistant',   image: '/rugs/rug-beni-ourain.jpg' },
  { id: 'silk',      label: 'Silk',      desc: 'Lustrous, formal spaces, exceptional sheen',  image: '/rugs/rug-tabriz.jpg' },
  { id: 'cotton',    label: 'Cotton',    desc: 'Casual, easy-care, vibrant colours',           image: '/rugs/rug-geometric.jpg' },
  { id: 'synthetic', label: 'Synthetic', desc: 'Stain-proof, outdoor, budget-friendly',        image: '/rugs/rug-outdoor.jpg' },
];

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
  { n: '01', title: 'Design',             desc: 'Share your vision, room dimensions, and style — our team translates it into a custom rug design.' },
  { n: '02', title: 'Material',            desc: 'Choose from wool, silk, cotton, or synthetic fibres, each sourced for durability and colourfastness.' },
  { n: '03', title: 'Weaving',             desc: 'Master artisans hand-knot every rug on traditional looms, weeks or months in the making.' },
  { n: '04', title: 'Quality Inspection',  desc: 'Every piece is checked for weave density, accurate sizing, and dye consistency before it ships.' },
  { n: '05', title: 'Global Delivery',     desc: 'Packed and shipped worldwide, with export documentation handled for you door to door.' },
];

const WHY_LOOMCRAFT = [
  { stat: '30+', label: 'Years Craftsmanship', desc: 'Three decades weaving for discerning homes and hospitality brands worldwide.' },
  { stat: '100%', label: 'Artisan-Made', desc: 'Every rug is hand-knotted by skilled weavers — no machine shortcuts.' },
  { stat: 'MTO', label: 'Made-to-Order', desc: 'Every size and every colourway is woven specifically for your space.' },
  { stat: 'Export', label: 'Export Quality', desc: 'Rigorous quality control meets the standards of international buyers.' },
];

const TRUST_BAR = ['Handmade', 'Custom Sizes', 'Worldwide Shipping', 'Family Workshop', 'Sustainable Materials'];

export default function CustomerHome() {
  const [catalog, setCatalog] = useState<CatalogRug[]>([]);
  const [sort, setSort] = useState<'newest' | 'popular'>('newest');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [videos, setVideos] = useState<ShowcaseVideo[]>([]);
  const [introIndex, setIntroIndex] = useState(0);
  const [aiConsultantEnabled, setAiConsultantEnabled] = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  const [contactInfo, setContactInfo] = useState<{ email: string | null; phone: string | null; address: string | null }>({ email: null, phone: null, address: null });
  const [workshopPhotos, setWorkshopPhotos] = useState<WorkshopPhoto[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [galleryItems, setGalleryItems] = useState<ProjectGalleryItem[]>([]);
  const [gallerySlide, setGallerySlide] = useState(0);
  const [testimonialSlide, setTestimonialSlide] = useState(0);
  const { displayPrice } = useCurrency();

  useEffect(() => {
    setCatalogLoading(true);
    axios.get('/api/customer/catalog', { params: { sort } })
      .then(({ data }) => setCatalog(data))
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
    getPublicSettings()
      .then((data) => {
        setAiConsultantEnabled(data.ai_assistant_enabled);
        setBusinessName(data.business_name || '');
        setHeroImageUrl(data.hero_image_url || null);
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
  const showCraftSection = SHOW_CRAFT_VIDEO ? Boolean(introVideo) : Boolean(craftImageUrl);
  const heroImage = heroImageLoaded ? (heroImageUrl || HERO_IMAGE_URL) : null;

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
        description="Premium handcrafted rugs custom-made to your exact size, material, and design — wool, silk, cotton, and synthetic weaves from India's finest workshops. Visualize any rug in your room before you order."
        image={heroImage ?? undefined}
        jsonLd={organizationJsonLd}
      />

      {/* ── HERO (full-bleed cinematic image, text overlaid) ─────────────── */}
      {SHOW_HERO && (
        <section className="relative w-full overflow-hidden min-h-[640px] flex items-end">
          {heroImage ? (
            <img
              src={heroImage}
              alt="Handcrafted rug"
              className="absolute inset-0 w-full h-full object-cover"
              fetchPriority="high"
              loading="eager"
            />
          ) : (
            <div className="absolute inset-0 bg-stone-100 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/60 to-stone-900/25" />

          <div className="relative max-w-7xl mx-auto px-6 pb-16 pt-32 w-full">
            <div className="max-w-xl space-y-7">
              <p className="text-xs tracking-[0.2em] uppercase text-stone-200 font-medium">
                Handcrafted Custom Rugs · Worldwide Shipping
              </p>
              <h1 className="font-serif text-6xl md:text-7xl font-light text-white leading-[1.05] tracking-tight">
                Handcrafted Rugs.<br />
                Made for <em className="font-normal not-italic">Timeless</em> Spaces.
              </h1>
              <p className="text-stone-200 text-lg leading-relaxed max-w-md">
                Every rug made to your exact size and specification, from India's finest workshops. Custom dimensions, premium materials, delivered to your door.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to="/catalog"
                  className="inline-flex items-center gap-3 bg-white hover:bg-stone-100 text-stone-900 text-xs tracking-widest uppercase font-medium px-8 py-4 transition-colors"
                >
                  Explore Collection <ArrowRight size={14} />
                </Link>
                <Link
                  to="/custom-rug-request"
                  className="inline-flex items-center gap-3 border border-white/50 hover:border-white text-white text-xs tracking-widest uppercase font-medium px-8 py-4 transition-colors"
                >
                  Request Custom Rug
                </Link>
              </div>

              {/* Stats */}
              <div className="flex gap-10 pt-4 border-t border-white/20">
                {[
                  { v: `${catalog.length || 8}+`, l: 'Designs' },
                  { v: '4',     l: 'Materials' },
                  { v: '7–60', l: 'Day Delivery' },
                ].map((s) => (
                  <div key={s.l}>
                    <p className="font-serif text-2xl text-white font-light">{s.v}</p>
                    <p className="text-stone-300 text-xs uppercase tracking-wider mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── TRUST BAR ──────────────────────────────────────────────────── */}
      <section className="border-y border-stone-100 bg-stone-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
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
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-12 lg:gap-16 items-center">

              {/* Description */}
              <div className="space-y-6">
                <p className="text-xs tracking-[0.2em] uppercase text-stone-400">Our Craft</p>
                <h2 className="font-serif text-4xl font-light text-stone-900 leading-tight">
                  Where tradition meets<br />precision
                </h2>
                <p className="text-stone-500 leading-relaxed">
                  Every rug that leaves our workshop passes through the hands of master weavers
                  who have spent years perfecting their craft. We blend time-honoured
                  techniques — hand-knotting, natural dyeing, meticulous finishing — with
                  rigorous quality control at every stage, so each piece meets the standards
                  discerning buyers expect: consistent weave density, accurate sizing, and
                  colourfast dyes.
                </p>
                <p className="text-stone-500 leading-relaxed">
                  From raw fibre to finished rug, nothing ships until it earns our mark of approval.
                </p>
                <ul className="space-y-2 pt-2">
                  {['Hand-knotted, made to order', 'Natural, colourfast dyes', 'Quality-checked before dispatch'].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-stone-600">
                      <span className="w-1 h-1 rounded-full bg-stone-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    to="/catalog"
                    className="inline-flex items-center gap-3 bg-stone-900 hover:bg-stone-800 text-white text-xs tracking-widest uppercase font-medium px-8 py-4 transition-colors"
                  >
                    Explore Collection <ArrowRight size={14} />
                  </Link>
                  <Link
                    to="/visualizer"
                    className="text-sm text-stone-600 hover:text-stone-900 transition-colors border-b border-stone-300 hover:border-stone-900 pb-0.5"
                  >
                    Try Room Visualizer
                  </Link>
                </div>
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
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">{businessName ? `Why ${businessName}` : 'Why Choose Us'}</p>
          <h2 className="font-serif text-4xl font-light text-stone-900">Craftsmanship you can trust</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-stone-200">
          {WHY_LOOMCRAFT.map((w) => (
            <div key={w.label} className="bg-white p-8 space-y-2">
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
          <div className="max-w-7xl mx-auto px-6">
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
        <section className="max-w-7xl mx-auto px-6 py-20">
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
                    <p className="text-stone-900 text-sm font-medium flex-shrink-0">{displayPrice(rug.base_price_per_sqm)}<span className="text-stone-400 text-xs">/sqm</span></p>
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

      {/* ── INSIDE THE WORKSHOP ───────────────────────────────────────── */}
      {!SHOW_FEATURED_RUGS && workshopPhotos.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Behind the Scenes</p>
            <h2 className="font-serif text-4xl font-light text-stone-900 mb-4">Inside the Workshop</h2>
            <p className="text-stone-500 leading-relaxed">
              A look at the people and process behind every rug — from raw fibre
              to the finished piece that reaches your door.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workshopPhotos.map((p) => (
              <div key={p.id} className="group relative overflow-hidden bg-stone-100 aspect-[4/3]">
                <img
                  src={p.image_url}
                  alt={p.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-stone-900/80 via-stone-900/10 to-transparent">
                  <p className="text-white font-serif text-lg font-light">{p.caption}</p>
                  {p.description && <p className="text-stone-300 text-xs mt-0.5">{p.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── MATERIALS ─────────────────────────────────────────────────── */}
      <section className="bg-stone-50 border-y border-stone-100 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Materials</p>
            <h2 className="font-serif text-4xl font-light text-stone-900">Shop by Material</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-stone-200">
            {MATERIALS.map((m) => (
              <Link
                key={m.id}
                to={`/catalog?material=${m.id}`}
                className="group relative overflow-hidden bg-white p-8 space-y-3 hover:bg-stone-50 transition-colors"
              >
                <img
                  src={m.image}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-15 transition-opacity duration-300 pointer-events-none"
                />
                <p className="relative font-serif text-2xl font-light text-stone-900">{m.label}</p>
                <p className="relative text-stone-500 text-sm leading-relaxed">{m.desc}</p>
                <p className="relative text-xs text-stone-400 group-hover:text-stone-900 transition-colors flex items-center gap-1.5 pt-2">
                  Browse {m.label} <ArrowRight size={11} />
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CUSTOM RUG JOURNEY ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="mb-12">
          <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">The Process</p>
          <h2 className="font-serif text-4xl font-light text-stone-900">Custom Rug Journey</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {HOW.map((step) => (
            <div key={step.n} className="-m-6 p-6 space-y-4 rounded hover:bg-stone-50 transition-colors">
              <p className="font-serif text-5xl font-light text-stone-200">{step.n}</p>
              <h3 className="text-stone-900 font-medium text-base">{step.title}</h3>
              <p className="text-stone-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS (slider, 2 dark spotlight cards per page) ────────── */}
      {testimonials.length > 0 && (() => {
        const PAGE_SIZE = 2;
        const totalPages = Math.max(1, Math.ceil(testimonials.length / PAGE_SIZE));
        const currentPage = Math.min(testimonialSlide, totalPages - 1);
        const pageItems = testimonials.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

        return (
          <section className="bg-stone-50 border-y border-stone-100 py-20">
            <div className="max-w-7xl mx-auto px-6">
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

      {/* ── PROJECT GALLERY (slider, whole/uncropped images) ─────────────── */}
      {galleryItems.length > 0 && (() => {
        const current = Math.min(gallerySlide, galleryItems.length - 1);
        const g = galleryItems[current];
        const tile = (
          <div className="relative bg-stone-100 w-full aspect-[21/9] flex items-center justify-center">
            <img
              src={g.image_url}
              alt={g.caption ?? ''}
              className="w-full h-full object-contain"
              loading="lazy"
            />
            {g.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent flex items-end pointer-events-none">
                <p className="text-white font-serif text-xl md:text-2xl font-light px-6 md:px-10 pb-6 md:pb-8">{g.caption}</p>
              </div>
            )}
          </div>
        );
        return (
          <section className="py-20">
            <div className="max-w-7xl mx-auto px-6 mb-12 max-w-2xl">
              <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Project Gallery</p>
              <h2 className="font-serif text-4xl font-light text-stone-900">Rugs in Their New Homes</h2>
            </div>
            <div className="relative group">
              {g.link_url ? (
                <a href={g.link_url} target="_blank" rel="noreferrer" className="block">{tile}</a>
              ) : (
                tile
              )}
              {galleryItems.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setGallerySlide((current - 1 + galleryItems.length) % galleryItems.length)}
                    aria-label="Previous project"
                    className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-white/80 hover:bg-white text-stone-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setGallerySlide((current + 1) % galleryItems.length)}
                    aria-label="Next project"
                    className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-white/80 hover:bg-white text-stone-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                    {galleryItems.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setGallerySlide(i)}
                        aria-label={`Go to project ${i + 1}`}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/50 hover:bg-white/80'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        );
      })()}

      {/* ── AI CONSULTANT ─────────────────────────────────────────────── */}
      {aiConsultantEnabled && (
        <section className="bg-stone-900 py-20">
          <div className="max-w-2xl mx-auto px-6 text-center space-y-6">
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

      {/* ── VISUALIZER CTA ────────────────────────────────────────────── */}
      <section className="bg-stone-50 border-y border-stone-100 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="border border-stone-200 bg-white p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center md:text-left">
              <p className="text-xs tracking-[0.2em] uppercase text-stone-400">AI Room Visualizer</p>
              <h2 className="font-serif text-4xl font-light text-stone-900">
                See it in your room<br />before you order
              </h2>
              <p className="text-stone-500 text-sm max-w-md leading-relaxed">
                Upload a photo of your space, choose a rug, click 4 floor corners — our AI composites the rug into your room in seconds.
              </p>
            </div>
            <Link
              to="/visualizer"
              className="flex-shrink-0 inline-flex items-center gap-3 bg-stone-900 hover:bg-stone-800 text-white text-xs tracking-widest uppercase font-medium px-8 py-4 transition-colors"
            >
              Try Free <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

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
