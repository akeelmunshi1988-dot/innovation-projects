import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, CornerDownLeft, Layers, Zap, Play, Star, ChevronLeft, ChevronRight, PencilRuler, Scissors, Gem, Globe2, Palette, ShieldCheck, PackageCheck, Leaf, CheckCircle2 } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import { getPublicSettings } from '../services/api';
import type { Testimonial, ProjectGalleryItem, CatalogSize } from '../types';

interface ShowcaseVideo {
  id: number;
  title: string;
  description: string | null;
  video_url: string;
  poster_url: string | null;
  is_intro?: boolean;
  tab_name?: string | null;
}

interface HeroSlide {
  image_url: string;
  alt_text?: string;
  eyebrow?: string;
  headline?: string;
  button_text?: string;
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

interface HomepageValueItem {
  icon: string;
  title: string;
  description: string;
}

const DEFAULT_HOMEPAGE_VALUES: HomepageValueItem[] = [
  { icon: 'pencil-ruler', title: 'Bespoke Design', description: 'Every rug is developed around your dimensions, palette, pattern, and intended space.' },
  { icon: 'scissors', title: 'Master Craftsmanship', description: 'Experienced artisans shape every detail by hand using time-honoured weaving techniques.' },
  { icon: 'gem', title: 'Premium Materials', description: 'Responsibly selected wool, silk, cotton, and performance fibres deliver beauty that lasts.' },
  { icon: 'globe', title: 'Export Quality', description: 'Careful inspection, secure packaging, and worldwide delivery support every finished rug.' },
];

const DEFAULT_INTRO_DESCRIPTION = 'Every rug that leaves our workshop passes through the hands of master weavers who have spent years perfecting their craft — hand-knotting, natural dyeing, and meticulous finishing, checked for weave density, accurate sizing, and colourfast dyes before anything ships.';

function HomepageValueIcon({ name }: { name: string }) {
  const props = { size: 48, strokeWidth: 1.4 };
  switch (name) {
    case 'pencil-ruler': return <PencilRuler {...props} />;
    case 'gem': return <Gem {...props} />;
    case 'globe': return <Globe2 {...props} />;
    case 'palette': return <Palette {...props} />;
    case 'shield': return <ShieldCheck {...props} />;
    case 'package': return <PackageCheck {...props} />;
    case 'leaf': return <Leaf {...props} />;
    default: return <Scissors {...props} />;
  }
}

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
  const [materialsCount, setMaterialsCount] = useState(0);
  const [sort, setSort] = useState<'newest' | 'popular'>('newest');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [videos, setVideos] = useState<ShowcaseVideo[]>([]);
  const [introIndex, setIntroIndex] = useState(0);
  const [activeVideoTab, setActiveVideoTab] = useState('Craftsmanship');
  const [aiConsultantEnabled, setAiConsultantEnabled] = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [heroImages, setHeroImages] = useState<HeroSlide[]>([]);
  const [heroSlide, setHeroSlide] = useState(0);
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  const [heroEyebrow, setHeroEyebrow] = useState<string | null>(null);
  const [heroHeading, setHeroHeading] = useState<string | null>(null);
  const [heroCtaLabel, setHeroCtaLabel] = useState<string | null>(null);
  const [fullBleedImage, setFullBleedImage] = useState<{ imageUrl: string | null; altText: string | null; enabled: boolean }>({ imageUrl: null, altText: null, enabled: true });
  const [homepageValues, setHomepageValues] = useState({
    eyebrow: 'Why Choose Us',
    headline: 'Rugs designed with purpose.',
    accentHeadline: 'Crafted to last for generations.',
    description: 'From the first design conversation to final delivery, every decision is guided by skilled hands, dependable materials, and exacting quality standards.',
    items: DEFAULT_HOMEPAGE_VALUES,
    enabled: true,
  });
  const [homepageIntro, setHomepageIntro] = useState({
    trustedByText: '',
    titleLineOne: 'Rug Making',
    titleLineTwo: '& Weaving',
    label: 'Final Product',
    description: DEFAULT_INTRO_DESCRIPTION,
    ctaLabel: 'Explore Collection',
    ctaUrl: '/catalog',
    enabled: true,
  });
  const [homepageContact, setHomepageContact] = useState({
    imageUrl: null as string | null,
    imageAlt: 'A rug artisan at work',
    heading: 'Have Questions?\nGet in Touch!',
    consentText: 'I agree that my submitted data is being collected and stored.',
    buttonLabel: 'Send Message',
    successMessage: 'Thank you. Your enquiry has been sent successfully.',
    enabled: true,
  });
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '', consent: false });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactInfo, setContactInfo] = useState<{ email: string | null; phone: string | null; address: string | null }>({ email: null, phone: null, address: null });
  const [workshopPhotos, setWorkshopPhotos] = useState<WorkshopPhoto[]>([]);
  const [journeySteps, setJourneySteps] = useState<{ id: number; title: string; description: string | null }[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [galleryItems, setGalleryItems] = useState<ProjectGalleryItem[]>([]);
  const [shopTab, setShopTab] = useState<'space' | 'mood' | 'material'>('space');

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
        setFullBleedImage({
          imageUrl: data.homepage_full_bleed_image_url || null,
          altText: data.homepage_full_bleed_alt_text || null,
          enabled: data.homepage_full_bleed_enabled,
        });
        setHomepageValues({
          eyebrow: data.homepage_values_eyebrow || `Why ${data.business_name || 'Choose Us'}`,
          headline: data.homepage_values_headline || 'Rugs designed with purpose.',
          accentHeadline: data.homepage_values_headline_accent || 'Crafted to last for generations.',
          description: data.homepage_values_description || 'From the first design conversation to final delivery, every decision is guided by skilled hands, dependable materials, and exacting quality standards.',
          items: data.homepage_values_items.length ? data.homepage_values_items : DEFAULT_HOMEPAGE_VALUES,
          enabled: data.homepage_values_enabled,
        });
        setHomepageIntro({
          trustedByText: data.homepage_intro_trusted_by_text || '',
          titleLineOne: data.homepage_intro_title_line_one || 'Rug Making',
          titleLineTwo: data.homepage_intro_title_line_two || '& Weaving',
          label: data.homepage_intro_label || 'Final Product',
          description: data.homepage_intro_description || DEFAULT_INTRO_DESCRIPTION,
          ctaLabel: data.homepage_intro_cta_label || 'Explore Collection',
          ctaUrl: data.homepage_intro_cta_url || '/catalog',
          enabled: data.homepage_intro_enabled,
        });
        setHomepageContact({
          imageUrl: data.homepage_contact_image_url || null,
          imageAlt: data.homepage_contact_image_alt || 'A rug artisan at work',
          heading: data.homepage_contact_heading || 'Have Questions?\nGet in Touch!',
          consentText: data.homepage_contact_consent_text || 'I agree that my submitted data is being collected and stored.',
          buttonLabel: data.homepage_contact_button_label || 'Send Message',
          successMessage: data.homepage_contact_success_message || 'Thank you. Your enquiry has been sent successfully.',
          enabled: data.homepage_contact_enabled,
        });
        setMaterialsCount(data.materials_count ?? 0);
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
  const videoTabNames = Array.from(new Set(gridVideos.map((video) => video.tab_name || 'Craftsmanship')));
  const selectedVideoTab = videoTabNames.includes(activeVideoTab) ? activeVideoTab : (videoTabNames[0] || 'Craftsmanship');
  const visibleGridVideos = gridVideos.filter((video) => (video.tab_name || 'Craftsmanship') === selectedVideoTab);
  const introVideo = introVideos[introIndex % (introVideos.length || 1)];
  const craftImageUrl = introVideo?.poster_url || workshopPhotos[0]?.image_url || null;
  const journeyStepsDisplay = journeySteps.length > 0
    ? journeySteps.map((s, i) => ({ n: String(i + 1).padStart(2, '0'), title: s.title, desc: s.description || '' }))
    : HOW;
  const showCraftSection = SHOW_CRAFT_VIDEO ? Boolean(introVideo) : Boolean(craftImageUrl);
  const slides = heroImages.length ? heroImages : [{ image_url: heroImageUrl || HERO_IMAGE_URL, alt_text: 'Handcrafted rug' }];
  const heroIndex = heroSlide % slides.length;
  const activeHero = slides[heroIndex];
  const heroImage = heroImageLoaded ? activeHero.image_url : null;
  const ratedProjects = galleryItems.filter((project) => project.rating != null);
  const averageProjectRating = ratedProjects.length > 0
    ? ratedProjects.reduce((total, project) => total + (project.rating || 0), 0) / ratedProjects.length
    : null;
  const ratingCustomers = ratedProjects
    .filter((project) => project.owner_name?.trim())
    .slice(0, 4);
  const randomizedWorkshopPhotos = useMemo(() => {
    const shuffled = [...workshopPhotos];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }, [workshopPhotos]);

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

  const handleContactSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setContactSubmitting(true);
    setContactSubmitted(false);
    setContactError('');
    try {
      await axios.post('/api/customer/homepage-enquiries', contactForm);
      setContactForm({ name: '', email: '', subject: '', message: '', consent: false });
      setContactSubmitted(true);
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      setContactError(typeof detail === 'string' ? detail : 'We could not send your message. Please try again.');
    } finally {
      setContactSubmitting(false);
    }
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
          <section className="relative w-full overflow-hidden h-[calc(100svh-8rem)] min-h-[520px] md:h-[calc(100svh-9rem)] md:min-h-[640px] flex items-center justify-center">
            {heroImageLoaded ? (
              /* All slides stay mounted and stacked; only opacity changes, so
                 switching images is a true crossfade with no reload flash. */
              <div className="absolute inset-0">
                {slides.map((slide, index) => (
                  <img
                    key={`${slide.image_url}-${index}`}
                    src={slide.image_url}
                    alt={slide.alt_text || 'Handcrafted rug'}
                    aria-hidden={index !== heroIndex}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[900ms] ease-in-out motion-reduce:transition-none ${
                      index === heroIndex ? 'opacity-100' : 'opacity-0'
                    }`}
                    fetchPriority={index === 0 ? 'high' : 'low'}
                    loading="eager"
                    decoding="async"
                  />
                ))}
              </div>
            ) : (
              <div className="absolute inset-0 bg-stone-100 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
              </div>
            )}

            <div className="relative max-w-xl px-6 text-center space-y-5">
              <p className="storefront-eyebrow text-white/80">{activeHero.eyebrow || heroEyebrow || `${WHY_LOOMCRAFT[0].stat} Years in the Making`}</p>
              <h1 className="storefront-heading text-4xl md:text-5xl text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.4)]">
                {activeHero.headline || heroHeading || (<>Made for <em className="font-normal not-italic">Timeless</em> Spaces.</>)}
              </h1>
              <Link to="/catalog" className="storefront-link-arrow text-white justify-center">
                {activeHero.button_text || heroCtaLabel || 'Explore Collection'} <ArrowRight size={14} />
              </Link>
            </div>
            {slides.length > 1 && <>
              <div className="absolute bottom-6 left-4 z-10 flex gap-2 md:left-8">
                <button type="button" aria-label="Previous hero image" onClick={() => setHeroSlide(current => (current - 1 + slides.length) % slides.length)} className="rounded-full bg-black/25 p-3 text-white hover:bg-black/45"><ChevronLeft size={22}/></button>
                <button type="button" aria-label="Next hero image" onClick={() => setHeroSlide(current => (current + 1) % slides.length)} className="rounded-full bg-black/25 p-3 text-white hover:bg-black/45"><ChevronRight size={22}/></button>
              </div>
              <div className="absolute bottom-6 inset-x-0 z-10 flex justify-center gap-2">{slides.map((_, index) => <button key={index} type="button" aria-label={`Show hero image ${index + 1}`} onClick={() => setHeroSlide(index)} className={`h-1.5 rounded-full transition-all ${index === heroIndex ? 'w-8 bg-white' : 'w-2 bg-white/55'}`}/>)}</div>
            </>}
          </section>

          {/* Stat strip */}
          <div className="border-b border-stone-100">
            <div className="w-[94vw] max-w-none mx-auto px-4 py-6 flex flex-wrap gap-10 justify-center sm:justify-start">
              {[
                { v: `${catalogTotal || 8}+`, l: 'Designs' },
                { v: `${materialsCount || 4}`, l: 'Materials' },
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

      {/* ── INTRODUCTION (reference-led editorial composition) ───────────── */}
      {showCraftSection && homepageIntro.enabled && (
        <section id="introduction" className="overflow-hidden bg-[#f3f1e8]">
          <div className="relative mx-auto flex w-[90vw] flex-col gap-10 py-16 lg:block lg:h-[min(920px,calc(100svh-80px))] lg:min-h-[800px] lg:py-0">
              {/* Compact media window, positioned like the reference image tile. */}
              <div className="relative order-1 aspect-[1.5/1] w-full overflow-hidden bg-stone-200 sm:w-[78%] lg:absolute lg:left-0 lg:top-[10%] lg:w-[32%]">
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

              {/* Small, condensed information block on the upper-right. */}
              <div className="order-2 lg:absolute lg:right-[2%] lg:top-[17%] lg:w-[36%]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    {homepageIntro.label}
                  </p>
                  <h2 className="mt-5 max-w-2xl font-serif text-[clamp(2rem,2.35vw,3rem)] font-light leading-[1.16] tracking-[-0.02em] text-[#262522]">
                    {homepageIntro.description}
                  </h2>
                  {homepageIntro.ctaLabel && <Link to={homepageIntro.ctaUrl} className="mt-8 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#262522] transition-colors hover:text-rug-700">
                    {homepageIntro.ctaLabel} <ArrowRight size={16} />
                  </Link>
                  }
              </div>

              {/* Oversized lower-left typography is the visual anchor. */}
              <div className="order-3 mt-6 lg:absolute lg:bottom-[2%] lg:left-0 lg:mt-0 lg:w-[53%]">
                <p className="font-condensed text-[clamp(4.2rem,8.2vw,9.5rem)] font-medium uppercase leading-[0.88] tracking-[-0.045em] text-[#191d27]">
                  {homepageIntro.titleLineOne}<br />{homepageIntro.titleLineTwo}
                </p>
              </div>

              {(averageProjectRating != null || homepageIntro.trustedByText) && (
                  <div className="order-4 flex flex-col items-start lg:absolute lg:bottom-[5%] lg:right-[2%] lg:items-center">
                    {ratingCustomers.length > 0 && <div className="flex items-center">
                      {ratingCustomers.map((project, index) => {
                        const initials = project.owner_name!
                          .trim()
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join('')
                          .toUpperCase();
                        const matchingCustomerPhoto = testimonials.find((testimonial) => (
                          testimonial.photo_url
                          && testimonial.author_name.trim().toLocaleLowerCase() === project.owner_name!.trim().toLocaleLowerCase()
                        ))?.photo_url;
                        return (
                          <div
                            key={project.id}
                            title={project.owner_name || undefined}
                            className={`relative flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[#f3f1e8] text-sm font-semibold tracking-wide text-white ${index > 0 ? '-ml-3' : ''} ${['bg-[#496a73]', 'bg-[#a15f46]', 'bg-[#947555]', 'bg-[#48567c]'][index % 4]}`}
                          >
                            {matchingCustomerPhoto ? (
                              <img src={matchingCustomerPhoto} alt={project.owner_name || 'Customer'} className="h-full w-full rounded-full object-cover" loading="lazy" />
                            ) : initials}
                          </div>
                        );
                      })}
                    </div>}
                    <p className={`${ratingCustomers.length > 0 ? 'mt-5' : ''} text-lg text-stone-500`}>
                      Trusted by <span className="font-medium text-[#191d27]">{homepageIntro.trustedByText || `${ratedProjects.length}+ customers`}</span>
                    </p>
                    {averageProjectRating != null && <div className="mt-3 flex items-center gap-2" aria-label={`${averageProjectRating.toFixed(1)} out of 5 stars`}>
                      <div className="flex gap-0.5" aria-hidden="true">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} size={20} className={star <= Math.round(averageProjectRating) ? 'fill-rug-700 text-rug-700' : 'fill-stone-300 text-stone-300'} />
                        ))}
                      </div>
                      <span className="font-condensed text-base font-medium text-[#191d27]">/ {averageProjectRating.toFixed(1)}</span>
                    </div>}
                  </div>
              )}

              <a href="#introduction-end" className="order-5 hidden items-center gap-3 font-condensed text-base font-medium uppercase text-[#191d27] lg:absolute lg:bottom-[5%] lg:left-[65%] lg:flex">
                Scroll <span className="text-2xl font-light">↓</span>
              </a>
              <span id="introduction-end" className="absolute bottom-0" aria-hidden="true" />
              </div>
        </section>
      )}

      {fullBleedImage.enabled && fullBleedImage.imageUrl && (
        <section className="h-[clamp(360px,28vw,620px)] w-full overflow-hidden bg-stone-200" aria-label="Featured interior">
          <img
            src={fullBleedImage.imageUrl}
            alt={fullBleedImage.altText || 'Featured handcrafted rug interior'}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </section>
      )}

      {/* ── COMPANY VALUES (fully admin-managed) ────────────────────────── */}
      {homepageValues.enabled && homepageValues.items.length > 0 && (
        <section className="bg-[#f3f1e8] py-20 md:py-28">
          <div className="mx-auto w-[90vw]">
            <p className="mb-8 text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">{homepageValues.eyebrow}</p>
            <div className="grid gap-10 md:grid-cols-12 md:items-end">
              <h2 className="font-condensed text-[clamp(3rem,5.1vw,6.2rem)] font-medium uppercase leading-[0.98] tracking-[-0.035em] text-[#191d27] md:col-span-10">
                {homepageValues.headline}{' '}
                <span className="text-[#9b9a93]">{homepageValues.accentHeadline}</span>
              </h2>
              {homepageValues.description && (
                <p className="text-base leading-relaxed text-stone-500 md:col-span-6 md:col-start-7 md:text-lg">
                  {homepageValues.description}
                </p>
              )}
            </div>

            <div className="mt-16 grid grid-cols-1 border-l border-t border-stone-300 sm:grid-cols-2 lg:grid-cols-4">
              {homepageValues.items.map((item, index) => (
                <article key={`${item.title}-${index}`} className="flex min-h-[330px] flex-col border-b border-r border-stone-300 p-8 md:p-10">
                  <div className="text-rug-700"><HomepageValueIcon name={item.icon} /></div>
                  <div className="mt-auto pt-16">
                    <h3 className="font-condensed text-2xl font-medium uppercase leading-tight text-[#191d27]">{item.title}</h3>
                    {item.description && <p className="mt-4 text-base leading-relaxed text-stone-500">{item.description}</p>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── BEHIND THE CRAFT (hover-to-play video grid) ──────────────────── */}
      {gridVideos.length > 0 && (
        <section className="bg-stone-50 border-y border-stone-100 py-20">
          <div className="w-[94vw] max-w-none mx-auto px-4">
            <div className="mb-12">
              <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">See It Made</p>
              <h2 className="font-serif text-4xl font-light text-stone-900">Behind the Craft</h2>
              {videoTabNames.length > 0 && (
                <div className="flex flex-wrap gap-x-7 gap-y-3 mt-8 border-b border-stone-200" role="tablist" aria-label="Craft video categories">
                  {videoTabNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      role="tab"
                      aria-selected={selectedVideoTab === name}
                      onClick={() => setActiveVideoTab(name)}
                      className={`pb-3 text-xs font-medium uppercase tracking-[0.14em] border-b-2 -mb-px transition-colors ${selectedVideoTab === name ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-700'}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {visibleGridVideos.map((v, index) => {
                const columnPosition = index % 4;
                const expansionPosition = columnPosition === 0
                  ? 'lg:left-0 lg:origin-left'
                  : columnPosition === 3
                    ? 'lg:right-0 lg:origin-right'
                    : 'lg:left-1/2 lg:-translate-x-1/2 lg:origin-center';

                return (
                  <CraftVideoCard key={v.id} video={v} expansionPosition={expansionPosition} />
                );
              })}
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
                  <div className="flex items-start gap-2">
                    <h3 className="font-serif text-lg font-light text-stone-900 leading-snug">{rug.name}</h3>
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

      {/* ── INSIDE THE WORKSHOP (randomized editorial mosaic) ────────────── */}
      {!SHOW_FEATURED_RUGS && workshopPhotos.length > 0 && (
        <section className="overflow-hidden bg-[#f3f1e8] py-16 md:py-24">
          <div className="mx-auto w-[92vw]">
            <div className="grid gap-8 pb-12 md:grid-cols-12 md:items-end md:pb-16">
              <h2 className="font-condensed text-[clamp(3.2rem,5.4vw,6.5rem)] font-medium uppercase leading-[0.98] tracking-[-0.035em] text-[#191d27] md:col-span-9">
                Inside the Workshop. <span className="text-[#9b9a93]">Where every thread</span> becomes a story.
              </h2>
              <p className="text-base leading-relaxed text-stone-500 md:col-span-6 md:col-start-7 md:text-lg">
                Step inside the hands-on process behind every rug, from raw fibre and colour preparation to patient weaving and meticulous finishing by our master artisans.
              </p>
            </div>

            <div className="columns-1 gap-3 sm:columns-2 lg:columns-3 lg:gap-4">
              {randomizedWorkshopPhotos.map((photo) => (
                <figure key={photo.id} className="group relative mb-3 break-inside-avoid overflow-hidden bg-stone-200 lg:mb-4">
                  <img
                    src={photo.image_url}
                    alt={photo.caption}
                    className="block h-auto w-full transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                    loading="lazy"
                    onError={(event) => { event.currentTarget.style.display = 'none'; }}
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 translate-y-full bg-[#191d27]/85 px-4 py-3 text-sm text-white backdrop-blur-sm transition-transform duration-300 group-hover:translate-y-0">
                    {photo.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
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

        <div className="relative w-[94vw] max-w-none mx-auto px-4">
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
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS (reference-style masonry wall) ──────────────────── */}
      {testimonials.length > 0 && (
        <section className="border-y border-stone-200 bg-[#f7f5ef] py-24 md:py-36">
          <div className="mx-auto w-[90vw]">
            <header className="mx-auto mb-16 max-w-4xl text-center md:mb-24">
              <p className="font-condensed text-sm font-medium uppercase tracking-[0.18em] text-[#191d27]">Testimonials</p>
              <h2 className="mt-8 font-condensed text-[clamp(3.2rem,5vw,6.25rem)] font-medium uppercase leading-[0.95] tracking-[-0.035em] text-[#191d27]">
                Client feedback that<br className="hidden sm:block" /> drives our work
              </h2>
            </header>

            <div className="columns-1 gap-6 sm:columns-2 xl:columns-4 xl:gap-8">
              {testimonials.map((testimonial, index) => {
                const initials = testimonial.author_name
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map(part => part[0])
                  .join('')
                  .toUpperCase();
                return (
                  <article key={testimonial.id} className="mb-6 break-inside-avoid border border-[#ddd9cb] bg-[#eeece2] p-8 md:p-10 xl:mb-8">
                    {testimonial.photo_url ? (
                      <img src={testimonial.photo_url} alt={testimonial.author_name} width={72} height={72} loading="lazy" className="h-[72px] w-[72px] rounded-full object-cover" />
                    ) : (
                      <div className={`flex h-[72px] w-[72px] items-center justify-center rounded-full text-base font-semibold tracking-wide text-white ${['bg-[#536b70]', 'bg-[#9b634b]', 'bg-[#847052]', 'bg-[#4f5b78]'][index % 4]}`}>
                        {initials}
                      </div>
                    )}

                    <h3 className="mt-7 font-condensed text-2xl font-medium uppercase leading-none text-[#191d27]">{testimonial.author_name}</h3>
                    {(testimonial.author_title || testimonial.country) && (
                      <p className="mt-2 text-base text-stone-500">{[testimonial.author_title, testimonial.country].filter(Boolean).join(', ')}</p>
                    )}
                    <p className="mt-9 text-lg leading-[1.45] text-[#242833] md:text-xl">{testimonial.quote}</p>

                    {testimonial.rating != null && (
                      <div className="mt-8 flex gap-1" aria-label={`${testimonial.rating} out of 5 stars`}>
                        {Array.from({ length: 5 }).map((_, starIndex) => (
                          <Star key={starIndex} size={14} className={starIndex < testimonial.rating! ? 'fill-rug-700 text-rug-700' : 'fill-stone-300 text-stone-300'} />
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

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

      {/* ── HOMEPAGE CONTACT (admin-managed image and content) ─────────── */}
      {homepageContact.enabled && homepageContact.imageUrl && (
        <section id="contact" className="grid min-h-[760px] bg-[#f4f2eb] lg:grid-cols-[59%_41%]">
          <div className="relative min-h-[420px] overflow-hidden lg:min-h-[760px]">
            <img
              src={homepageContact.imageUrl}
              alt={homepageContact.imageAlt}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>

          <div className="flex bg-[#f8f7f2] px-6 py-14 sm:px-10 lg:px-[clamp(2.5rem,4vw,5rem)] lg:py-16">
            <div className="my-auto w-full">
              <h2 className="whitespace-pre-line font-condensed text-[clamp(3rem,4.3vw,5.25rem)] font-medium uppercase leading-[0.92] tracking-[-0.025em] text-[#191d27]">
                {homepageContact.heading}
              </h2>

              {contactSubmitted ? (
                <div className="mt-10 flex min-h-[330px] flex-col items-center justify-center border border-[#ded9c9] bg-white/40 px-8 text-center">
                  <CheckCircle2 size={46} strokeWidth={1.3} className="text-rug-700" />
                  <p className="mt-5 max-w-md font-serif text-2xl leading-snug text-[#262522]">{homepageContact.successMessage}</p>
                  <button type="button" onClick={() => setContactSubmitted(false)} className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-rug-700 hover:text-rug-800">Send another message</button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="mt-10 space-y-5">
                  <input required maxLength={150} value={contactForm.name} onChange={event => setContactForm(current => ({ ...current, name: event.target.value }))} placeholder="Name" autoComplete="name" className="h-[68px] w-full border border-[#ded9c9] bg-transparent px-5 text-base text-stone-900 outline-none placeholder:text-[#aea789] focus:border-rug-600" />
                  <input required type="email" maxLength={200} value={contactForm.email} onChange={event => setContactForm(current => ({ ...current, email: event.target.value }))} placeholder="Email" autoComplete="email" className="h-[68px] w-full border border-[#ded9c9] bg-transparent px-5 text-base text-stone-900 outline-none placeholder:text-[#aea789] focus:border-rug-600" />
                  <input required maxLength={250} value={contactForm.subject} onChange={event => setContactForm(current => ({ ...current, subject: event.target.value }))} placeholder="Subject" className="h-[68px] w-full border border-[#ded9c9] bg-transparent px-5 text-base text-stone-900 outline-none placeholder:text-[#aea789] focus:border-rug-600" />
                  <textarea required maxLength={5000} rows={6} value={contactForm.message} onChange={event => setContactForm(current => ({ ...current, message: event.target.value }))} placeholder="Message" className="min-h-[190px] w-full resize-y border border-[#ded9c9] bg-transparent px-5 py-5 text-base text-stone-900 outline-none placeholder:text-[#aea789] focus:border-rug-600" />
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-[#8d876f]">
                    <input required type="checkbox" checked={contactForm.consent} onChange={event => setContactForm(current => ({ ...current, consent: event.target.checked }))} className="mt-0.5 h-5 w-5 shrink-0 accent-[#c53d16]" />
                    <span>{homepageContact.consentText}</span>
                  </label>
                  {contactError && <p role="alert" className="text-sm text-red-700">{contactError}</p>}
                  <button type="submit" disabled={contactSubmitting} className="flex h-[72px] w-full items-center justify-center bg-[#c73d14] font-condensed text-xl font-medium uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#a83212] disabled:cursor-wait disabled:opacity-65">
                    {contactSubmitting ? 'Sending…' : homepageContact.buttonLabel}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

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

function CraftVideoCard({ video, expansionPosition }: { video: ShowcaseVideo; expansionPosition: string }) {
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
      className="group relative aspect-[3/4] cursor-pointer hover:z-30 focus-within:z-30"
      onMouseEnter={play}
      onMouseLeave={stop}
      onClick={() => (isPlaying ? stop() : play())}
    >
      <div className={`absolute inset-y-0 w-full overflow-hidden bg-stone-100 transition-[width,left,right,transform,box-shadow] duration-500 ease-out lg:group-hover:w-[calc(200%+1rem)] lg:group-focus-within:w-[calc(200%+1rem)] lg:group-hover:shadow-2xl lg:group-focus-within:shadow-2xl ${expansionPosition}`}>
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
    </div>
  );
}
