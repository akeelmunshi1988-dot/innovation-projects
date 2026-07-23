import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Layers, Zap, Play } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import { currencySymbol } from '../utils/currency';
import { getPublicSettings } from '../services/api';

const sym = currencySymbol('INR');

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
  { id: 'wool',      label: 'Wool',      desc: 'Warm, durable, naturally stain-resistant' },
  { id: 'silk',      label: 'Silk',      desc: 'Lustrous, formal spaces, exceptional sheen' },
  { id: 'cotton',    label: 'Cotton',    desc: 'Casual, easy-care, vibrant colours' },
  { id: 'synthetic', label: 'Synthetic', desc: 'Stain-proof, outdoor, budget-friendly' },
];

const SHOW_HERO = false;

const HOW = [
  { n: '01', title: 'Browse & Choose',   desc: 'Explore our collection, filter by material, size, and style. Every design is available in custom dimensions.' },
  { n: '02', title: 'Visualise It',      desc: 'Upload a photo of your room and place any rug using our AI visualizer — see it before you order.' },
  { n: '03', title: 'We Craft & Deliver', desc: 'Request a quote, confirm your order, and our craftsmen begin production. Delivered to your door.' },
];

export default function CustomerHome() {
  const [catalog, setCatalog] = useState<CatalogRug[]>([]);
  const [sort, setSort] = useState<'newest' | 'popular'>('newest');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [videos, setVideos] = useState<ShowcaseVideo[]>([]);
  const [introIndex, setIntroIndex] = useState(0);
  const [aiConsultantEnabled, setAiConsultantEnabled] = useState(true);

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
    getPublicSettings()
      .then((data) => setAiConsultantEnabled(data.ai_assistant_enabled))
      .catch(() => setAiConsultantEnabled(true));
  }, []);

  const featured = catalog.slice(0, 6);
  const introVideos = videos.filter((v) => v.is_intro).length > 0
    ? videos.filter((v) => v.is_intro)
    : videos.slice(0, 1);
  const gridVideos = videos.filter((v) => !introVideos.includes(v));
  const introVideo = introVideos[introIndex % (introVideos.length || 1)];

  const openChat = (msg: string) => {
    window.dispatchEvent(new CustomEvent('loomcraftrugs:ask', { detail: { message: msg } }));
  };

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) { openChat(chatInput.trim()); setChatInput(''); }
  };

  return (
    <CustomerLayout>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      {SHOW_HERO && (
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Text */}
            <div className="space-y-8">
              <p className="text-xs tracking-[0.2em] uppercase text-stone-400 font-medium">
                Handcrafted Custom Rugs · Made in India
              </p>
              <h1 className="font-serif text-6xl md:text-7xl font-light text-stone-900 leading-[1.05] tracking-tight">
                Rugs that tell<br />
                <em className="font-normal not-italic">your</em> story
              </h1>
              <p className="text-stone-500 text-lg leading-relaxed max-w-md">
                Every rug made to your exact size and specification, from India's finest workshops. Custom dimensions, premium materials, delivered to your door.
              </p>

              {/* Stats */}
              <div className="flex gap-10 pt-4 border-t border-stone-100">
                {[
                  { v: `${catalog.length || 8}+`, l: 'Designs' },
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

            {/* Rug mosaic */}
            <div className="hidden lg:grid grid-cols-2 gap-3">
              {featured.slice(0, 4).map((rug, i) => (
                <Link
                  key={rug.id}
                  to={`/catalog/${rug.id}`}
                  className={`group relative overflow-hidden bg-stone-100 ${i === 0 ? 'row-span-2' : ''}`}
                  style={{ aspectRatio: i === 0 ? '3/4' : '4/3' }}
                >
                  {rug.image_url ? (
                    <img
                      src={rug.image_url}
                      alt={rug.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Layers size={28} className="text-stone-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/10 transition-colors duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-stone-900/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-white text-xs font-medium truncate">{rug.name}</p>
                    <p className="text-stone-300 text-xs">{sym}{rug.base_price_per_sqm}/sqm</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── OUR CRAFT (intro description + featured video) ──────────────── */}
      {introVideo && (
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-16 lg:gap-20 items-center">

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
                  className="text-sm text-stone-500 hover:text-stone-900 transition-colors border-b border-stone-300 hover:border-stone-900 pb-0.5"
                >
                  Try Room Visualizer
                </Link>
              </div>
            </div>

            {/* Featured intro video */}
            <div className="relative">
              {/* Offset accent frame */}
              <div className="hidden sm:block absolute -bottom-4 -right-4 w-full h-full bg-stone-900/90 rounded-2xl" />

              <div className="relative overflow-hidden bg-stone-100 aspect-[4/3] rounded-2xl shadow-2xl ring-1 ring-stone-900/5">
                {introVideo.poster_url && (
                  <img
                    src={introVideo.poster_url}
                    alt={introVideo.title}
                    className="absolute inset-0 w-full h-full object-cover"
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
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-stone-900/80 via-stone-900/20 to-transparent">
                  <p className="text-white font-serif text-xl font-light">{introVideo.title}</p>
                  {introVideo.description && (
                    <p className="text-stone-300 text-sm mt-1">{introVideo.description}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── BEHIND THE CRAFT (hover-to-play video grid) ──────────────────── */}
      {gridVideos.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 pb-24">
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
        </section>
      )}

      {/* ── FEATURED COLLECTION ───────────────────────────────────────── */}
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
              to={`/catalog/${rug.id}`}
              className="group block"
            >
              {/* Image */}
              <div className="relative overflow-hidden bg-stone-100 aspect-[4/5]">
                {rug.image_url ? (
                  <img
                    src={rug.image_url}
                    alt={rug.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
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
                  <p className="text-stone-900 text-sm font-medium flex-shrink-0">{sym}{rug.base_price_per_sqm}<span className="text-stone-400 text-xs">/sqm</span></p>
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
                className="group bg-white p-8 space-y-3 hover:bg-stone-50 transition-colors"
              >
                <p className="font-serif text-2xl font-light text-stone-900">{m.label}</p>
                <p className="text-stone-500 text-sm leading-relaxed">{m.desc}</p>
                <p className="text-xs text-stone-400 group-hover:text-stone-900 transition-colors flex items-center gap-1.5 pt-2">
                  Browse {m.label} <ArrowRight size={11} />
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="mb-12">
          <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">The Process</p>
          <h2 className="font-serif text-4xl font-light text-stone-900">How It Works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {HOW.map((step) => (
            <div key={step.n} className="space-y-4">
              <p className="font-serif text-5xl font-light text-stone-200">{step.n}</p>
              <h3 className="text-stone-900 font-medium text-base">{step.title}</h3>
              <p className="text-stone-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

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
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="border border-stone-200 p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8">
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
