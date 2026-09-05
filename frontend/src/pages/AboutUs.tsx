import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import DOMPurify from 'dompurify';
import {
  ArrowRight, Clock, Gem, Hand, Leaf, Mail, MapPin,
  MessageCircle, Phone, Ruler, ShieldCheck, Sparkles,
} from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import { getPublicSettings } from '../services/api';
import { PROSE_ALLOWED_TAGS, PROSE_ALLOWED_ATTR } from '../utils/richTextSanitize';
import { mergeAboutPage, type AboutPageContent } from '../data/aboutPageContent';

interface WorkshopPhoto {
  id: number;
  caption: string;
  description: string | null;
  image_url: string;
}

const FALLBACK_PHOTOS = [
  '/static/workshop/workshop-hand-weaving.jpg',
  '/static/workshop/workshop-warping-the-loom.jpg',
  '/static/workshop/workshop-raw-fibre-loom.jpg',
  '/static/workshop/workshop-hand-knotting-detail.jpg',
  '/static/workshop/workshop-braiding-by-hand.jpg',
  '/static/workshop/workshop-finished-piece.jpg',
];

function PrincipleIcon({ name, size = 18 }: { name: string; size?: number }) {
  switch (name) {
    case 'ruler': return <Ruler size={size} />;
    case 'leaf': return <Leaf size={size} />;
    case 'shield-check': return <ShieldCheck size={size} />;
    case 'gem': return <Gem size={size} />;
    case 'sparkles': return <Sparkles size={size} />;
    case 'clock': return <Clock size={size} />;
    case 'hand':
    default: return <Hand size={size} />;
  }
}

export default function AboutUs() {
  const [businessName, setBusinessName] = useState('Our Workshop');
  const [contactEmails, setContactEmails] = useState<string[]>([]);
  const [contactPhones, setContactPhones] = useState<string[]>([]);
  const [contactAddress, setContactAddress] = useState<string | null>(null);
  const [contactHours, setContactHours] = useState<string | null>(null);
  const [workshopPhotos, setWorkshopPhotos] = useState<WorkshopPhoto[]>([]);
  const [storyBody, setStoryBody] = useState<string | null>(null);
  const [aboutPage, setAboutPage] = useState<AboutPageContent>(() => mergeAboutPage(null));

  useEffect(() => {
    getPublicSettings()
      .then((data) => {
        if (data.business_name) setBusinessName(data.business_name);
        setContactEmails(data.contact_emails ?? []);
        setContactPhones(data.contact_phones ?? []);
        setContactAddress(data.contact_address ?? null);
        setContactHours(data.contact_hours ?? null);
        setStoryBody(data.about_us_content_html ?? null);
        setAboutPage(mergeAboutPage(data.about_page));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    axios.get('/api/customer/workshop-photos')
      .then(({ data }) => setWorkshopPhotos(data))
      .catch(() => {});
  }, []);

  const photo = (index: number) => workshopPhotos[index % Math.max(workshopPhotos.length, 1)]?.image_url
    ?? FALLBACK_PHOTOS[index % FALLBACK_PHOTOS.length];
  const caption = (index: number, fallback: string) => workshopPhotos[index % Math.max(workshopPhotos.length, 1)]?.caption || fallback;

  const sub = useMemo(() => (text: string) => (text || '').replace(/\{business\}/g, businessName), [businessName]);
  const paragraphs = (text: string) => sub(text).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const { hero, credentials, story, process, principles, founder, cta } = aboutPage;

  return (
    <CustomerLayout>
      <SEO
        title={`About ${businessName}`}
        description={`Discover ${businessName}'s artisan rug workshop, considered materials, and made-to-measure craftsmanship.`}
      />

      {/* Editorial hero */}
      {hero.enabled && (
        <section className="relative min-h-[560px] md:min-h-[640px] overflow-hidden flex items-end">
          <img
            src={hero.image_url || '/about-rug-living-room.png'}
            alt={hero.image_alt || 'Handcrafted rug in a warm, natural living room'}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/55 to-stone-950/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-transparent to-stone-950/15" />

          <div className="relative w-[94vw] max-w-none mx-auto px-4 pb-14 sm:pb-20">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-5">
                <span className="block w-10 h-px bg-white/50" />
                <p className="text-[11px] tracking-[0.3em] uppercase text-stone-200">{sub(hero.eyebrow)}</p>
              </div>
              <h1 className="font-serif font-light text-white text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight whitespace-pre-line">
                {sub(hero.heading)}
              </h1>
              <p className="mt-7 text-stone-200 text-base sm:text-lg leading-relaxed max-w-2xl">
                {sub(hero.body)}
              </p>
              {hero.cta_label && (
                <Link
                  to="/custom-rug-request"
                  className="mt-9 inline-flex items-center gap-3 border border-white/50 px-6 py-3.5 text-white text-xs tracking-[0.18em] uppercase hover:bg-white hover:text-stone-900 transition-colors"
                >
                  {sub(hero.cta_label)} <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>

          <div className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 rotate-90 origin-center items-center gap-3 text-white/60">
            <span className="text-[10px] tracking-[0.35em] uppercase">From loom to living space</span>
            <span className="w-12 h-px bg-white/40" />
          </div>
        </section>
      )}

      {/* Quiet credentials strip */}
      {credentials.enabled && credentials.items.length > 0 && (
        <section className="border-b border-stone-200 bg-white">
          <div className="w-[94vw] max-w-none mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-stone-200">
            {credentials.items.map((item, index) => (
              <div key={index} className="px-4 sm:px-6 lg:px-8 py-6">
                <p className="font-serif text-lg text-stone-900">{sub(item.title)}</p>
                <p className="text-stone-400 text-xs mt-1">{sub(item.subtitle)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Story — asymmetric editorial composition */}
      {story.enabled && (
        <section className="w-[94vw] max-w-none mx-auto px-4 py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-6 relative">
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={story.primary_image_url || photo(1)}
                  alt={story.primary_image_alt || caption(1, 'The rug-making workshop')}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="hidden sm:block absolute right-0 lg:-right-10 -bottom-10 w-[48%] aspect-square border-[10px] border-white overflow-hidden shadow-sm">
                <img
                  src={story.secondary_image_url || photo(2)}
                  alt={story.secondary_image_alt || caption(2, 'Natural fibres prepared for weaving')}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="lg:col-span-6 lg:col-start-7 lg:py-12">
              <p className="storefront-eyebrow mb-4">{sub(story.eyebrow)}</p>
              <h2 className="storefront-heading text-4xl lg:text-5xl whitespace-pre-line">
                {sub(story.heading)}
              </h2>
              {storyBody ? (
                <div
                  className="prose-content mt-8 text-stone-500 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(storyBody, {
                    ALLOWED_TAGS: PROSE_ALLOWED_TAGS,
                    ALLOWED_ATTR: PROSE_ALLOWED_ATTR,
                  }) }}
                />
              ) : (
                <div className="mt-8 space-y-5 text-stone-500 leading-relaxed">
                  <p>
                    We believe a rug should do more than complete a room. It should settle the
                    architecture, soften the way a space feels and become more personal with time.
                  </p>
                  <p>
                    Our workshop brings together inherited technique and a contemporary eye.
                    Working directly with skilled makers allows us to protect the integrity of the
                    craft while offering the freedom of custom scale, colour and material.
                  </p>
                </div>
              )}
              {story.quote && (
                <div className="mt-9 pt-7 border-t border-stone-200 flex gap-4">
                  <Gem size={20} className="text-stone-400 mt-1 flex-shrink-0" />
                  <p className="font-serif text-xl sm:text-2xl text-stone-800 leading-snug">
                    {sub(story.quote)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Process */}
      {process.enabled && process.steps.length > 0 && (
        <section className="bg-cream-200 text-stone-900 py-20 lg:py-24 overflow-hidden">
          <div className="w-[94vw] max-w-none mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end mb-14 lg:mb-16">
              <div className="lg:col-span-7">
                <p className="text-[11px] tracking-[0.3em] uppercase text-stone-500 mb-4">{sub(process.eyebrow)}</p>
                <h2 className="font-serif font-light text-4xl lg:text-5xl leading-[1.08] whitespace-pre-line">
                  {sub(process.heading)}
                </h2>
              </div>
              <p className="lg:col-span-4 lg:col-start-9 text-stone-600 leading-relaxed">
                {sub(process.intro)}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-0 border-t border-stone-300">
              {process.steps.map((step, index) => (
                <article key={index} className="group pt-8 pb-4 lg:pb-8 lg:px-7 lg:border-l first:border-l-0 first:pl-0 border-stone-300">
                  <div className="aspect-[4/3] overflow-hidden mb-7 bg-stone-900">
                    <img
                      src={step.image_url || photo(index + 2)}
                      alt={step.image_alt || caption(index + 2, step.title)}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-700"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-[10px] tracking-[0.25em] text-stone-500 mb-3">{step.number}</p>
                  <h3 className="font-serif text-2xl font-light mb-3">{sub(step.title)}</h3>
                  <p className="text-stone-600 text-sm leading-relaxed">{sub(step.text)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Principles */}
      {principles.enabled && principles.items.length > 0 && (
        <section className="bg-stone-50 border-b border-stone-200 py-20 lg:py-24">
          <div className="w-[94vw] max-w-none mx-auto px-4">
            <div className="max-w-2xl mb-14 lg:mb-16">
              <p className="storefront-eyebrow mb-4">{sub(principles.eyebrow)}</p>
              <h2 className="storefront-heading text-4xl lg:text-5xl">{sub(principles.heading)}</h2>
              <p className="text-stone-500 leading-relaxed mt-5">
                {sub(principles.intro)}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-stone-200 border border-stone-200">
              {principles.items.map((item, index) => (
                <article key={index} className="bg-white p-7 lg:p-8 min-h-[250px] flex flex-col">
                  <span className="w-11 h-11 rounded-full border border-stone-200 flex items-center justify-center text-stone-500">
                    <PrincipleIcon name={item.icon} />
                  </span>
                  <div className="mt-auto pt-10">
                    <h3 className="font-serif text-xl text-stone-900">{sub(item.title)}</h3>
                    <p className="text-stone-500 text-sm leading-relaxed mt-3">{sub(item.text)}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Founder */}
      {founder.enabled && (
        <section className="w-[94vw] max-w-none mx-auto px-4 py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-stone-200">
            <div className="relative min-h-[460px] lg:min-h-[660px] overflow-hidden">
              <img src={founder.image_url || photo(5)} alt={founder.image_alt || 'Inside the rug workshop'} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/65 via-transparent to-transparent" />
              <div className="absolute left-7 bottom-7 text-white">
                <p className="text-[10px] tracking-[0.25em] uppercase text-white/70">Inside the workshop</p>
                {founder.caption && <p className="font-serif text-2xl mt-1">{sub(founder.caption)}</p>}
              </div>
            </div>
            <div className="bg-white p-8 sm:p-12 lg:p-16 xl:p-20 flex flex-col justify-center">
              <Sparkles size={22} className="text-stone-400 mb-8" />
              <p className="storefront-eyebrow mb-4">{sub(founder.eyebrow)}</p>
              <h2 className="storefront-heading text-4xl lg:text-5xl">{sub(founder.heading)}</h2>
              <div className="mt-7 space-y-5 text-stone-500 leading-relaxed">
                {paragraphs(founder.body).map((p, index) => <p key={index}>{p}</p>)}
              </div>
              <div className="mt-10 pt-7 border-t border-stone-200">
                {founder.name && <p className="font-serif text-2xl text-stone-900">{sub(founder.name)}</p>}
                {founder.role && <p className="text-[10px] tracking-[0.25em] uppercase text-stone-400 mt-1">{sub(founder.role)}</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Consultation + contact */}
      {cta.enabled && (
        <section className="bg-cream-200 text-stone-900 py-20 lg:py-24">
          <div className="w-[94vw] max-w-none mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-0 items-center">
            <div className="lg:col-span-7 lg:pr-16">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-px bg-stone-400 flex-shrink-0" />
                <p className="text-[10px] sm:text-[11px] leading-none tracking-[0.24em] sm:tracking-[0.3em] uppercase text-stone-500">
                  {sub(cta.eyebrow)}
                </p>
              </div>
              <h2 className="font-serif font-light text-3xl sm:text-4xl lg:text-5xl leading-[1.08] tracking-tight max-w-2xl">
                {sub(cta.heading)}
              </h2>
              <p className="text-stone-600 leading-relaxed mt-6 max-w-xl">
                {sub(cta.body)}
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mt-9">
                {cta.primary_label && (
                  <Link to="/custom-rug-request" className="inline-flex justify-center items-center gap-3 bg-stone-900 text-white px-6 py-3.5 text-xs tracking-[0.18em] uppercase hover:bg-stone-800 transition-colors">
                    {sub(cta.primary_label)} <ArrowRight size={14} />
                  </Link>
                )}
                {cta.secondary_label && (
                  <Link to="/catalog" className="inline-flex justify-center items-center gap-3 border border-stone-400 px-6 py-3.5 text-xs tracking-[0.18em] uppercase hover:border-stone-700 transition-colors">
                    {sub(cta.secondary_label)}
                  </Link>
                )}
              </div>
            </div>

            <div className="lg:col-span-4 lg:col-start-9 border-t border-stone-300 pt-10 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
              <p className="font-serif text-2xl mb-8">Visit or speak with us</p>
              <div className="space-y-6">
                <ContactRow icon={Mail} label="Email">
                  {contactEmails.length > 0
                    ? contactEmails.map((email) => <a key={email} href={`mailto:${email}`} className="block hover:text-stone-900 transition-colors break-all">{email}</a>)
                    : <span>Details coming soon</span>}
                </ContactRow>
                <ContactRow icon={Phone} label="Telephone & WhatsApp">
                  {contactPhones.length > 0
                    ? contactPhones.map((phone) => (
                      <div key={phone} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <a href={`tel:${phone}`} className="hover:text-stone-900 transition-colors">{phone}</a>
                        <a href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 transition-colors">
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      </div>
                    ))
                    : <span>Details coming soon</span>}
                </ContactRow>
                <ContactRow icon={MapPin} label="Workshop">
                  <span className="whitespace-pre-line">{contactAddress || 'Address coming soon'}</span>
                </ContactRow>
                <ContactRow icon={Clock} label="Hours">
                  <span>{contactHours || 'By appointment'}</span>
                </ContactRow>
              </div>
            </div>
          </div>
        </section>
      )}
    </CustomerLayout>
  );
}

function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span className="w-9 h-9 rounded-full border border-stone-300 flex items-center justify-center text-stone-500 flex-shrink-0">
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] tracking-[0.22em] uppercase text-stone-500 mb-1.5">{label}</p>
        <div className="text-stone-600 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
