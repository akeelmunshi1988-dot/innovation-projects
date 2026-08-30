import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowRight, Clock, Gem, Hand, Leaf, Mail, MapPin,
  MessageCircle, Phone, Ruler, ShieldCheck, Sparkles,
} from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import { getPublicSettings } from '../services/api';

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

const PROCESS = [
  {
    number: '01',
    title: 'A considered beginning',
    copy: 'Every rug begins with the room: its proportions, light, movement and atmosphere. We refine the scale, palette and construction before a single thread reaches the loom.',
  },
  {
    number: '02',
    title: 'Material selection',
    copy: 'Fibres are chosen for both beauty and purpose—from resilient wool and relaxed cotton to luminous silk and performance-led blends.',
  },
  {
    number: '03',
    title: 'Made at the loom',
    copy: 'Skilled hands translate the design knot by knot, line by line. This unhurried process gives each surface its depth, character and quiet individuality.',
  },
  {
    number: '04',
    title: 'Finished by hand',
    copy: 'The rug is washed, stretched, carved where required and carefully inspected. Edges, pile, colour and dimensions are reviewed before dispatch.',
  },
];

const PRINCIPLES = [
  { icon: Hand, title: 'Artisan made', copy: 'Human skill remains at the centre of every piece, from yarn preparation to final finishing.' },
  { icon: Ruler, title: 'Made to measure', copy: 'Proportion is part of the design. Every rug can be tailored to the dimensions of its setting.' },
  { icon: Leaf, title: 'Thoughtful materials', copy: 'We select fibres for longevity, tactility and the way they will live in your home.' },
  { icon: ShieldCheck, title: 'Inspected individually', copy: 'Each finished rug is reviewed by hand against the approved specification before it leaves us.' },
];

export default function AboutUs() {
  const [businessName, setBusinessName] = useState('Our Workshop');
  const [contactEmails, setContactEmails] = useState<string[]>([]);
  const [contactPhones, setContactPhones] = useState<string[]>([]);
  const [contactAddress, setContactAddress] = useState<string | null>(null);
  const [contactHours, setContactHours] = useState<string | null>(null);
  const [workshopPhotos, setWorkshopPhotos] = useState<WorkshopPhoto[]>([]);

  useEffect(() => {
    getPublicSettings()
      .then((data) => {
        if (data.business_name) setBusinessName(data.business_name);
        setContactEmails(data.contact_emails ?? []);
        setContactPhones(data.contact_phones ?? []);
        setContactAddress(data.contact_address ?? null);
        setContactHours(data.contact_hours ?? null);
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

  return (
    <CustomerLayout>
      <SEO
        title={`About ${businessName}`}
        description={`Discover ${businessName}'s artisan rug workshop, considered materials, and made-to-measure craftsmanship.`}
      />

      {/* Editorial hero */}
      <section className="relative min-h-[560px] md:min-h-[640px] overflow-hidden flex items-end">
        <img
          src="/about-rug-living-room.png"
          alt="Handcrafted rug in a warm, natural living room"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/55 to-stone-950/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-transparent to-stone-950/15" />

        <div className="relative w-[94vw] max-w-none mx-auto px-4 pb-14 sm:pb-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-10 h-px bg-white/50" />
              <p className="text-[11px] tracking-[0.3em] uppercase text-stone-200">The story behind every thread</p>
            </div>
            <h1 className="font-serif font-light text-white text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
              Rugs with a sense<br className="hidden sm:block" /> of place and permanence.
            </h1>
            <p className="mt-7 text-stone-200 text-base sm:text-lg leading-relaxed max-w-2xl">
              At {businessName}, traditional rug making meets a more personal way of living.
              We create made-to-measure pieces with depth, restraint and the unmistakable
              character of work shaped by hand.
            </p>
            <Link
              to="/custom-rug-request"
              className="mt-9 inline-flex items-center gap-3 border border-white/50 px-6 py-3.5 text-white text-xs tracking-[0.18em] uppercase hover:bg-white hover:text-stone-900 transition-colors"
            >
              Begin a custom rug <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 rotate-90 origin-center items-center gap-3 text-white/60">
          <span className="text-[10px] tracking-[0.35em] uppercase">From loom to living space</span>
          <span className="w-12 h-px bg-white/40" />
        </div>
      </section>

      {/* Quiet credentials strip */}
      <section className="border-b border-stone-200 bg-white">
        <div className="w-[94vw] max-w-none mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-stone-200">
          {[
            ['Made individually', 'Never pulled from a production line'],
            ['Sized for your space', 'Proportion considered from the start'],
            ['Reviewed by hand', 'Quality checked before dispatch'],
          ].map(([title, copy]) => (
            <div key={title} className="px-4 sm:px-6 lg:px-8 py-6">
              <p className="font-serif text-lg text-stone-900">{title}</p>
              <p className="text-stone-400 text-xs mt-1">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story — asymmetric editorial composition */}
      <section className="w-[94vw] max-w-none mx-auto px-4 py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-6 relative">
            <div className="aspect-[4/5] overflow-hidden">
              <img src={photo(1)} alt={caption(1, 'The rug-making workshop')} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="hidden sm:block absolute right-0 lg:-right-10 -bottom-10 w-[48%] aspect-square border-[10px] border-white overflow-hidden shadow-sm">
              <img src={photo(2)} alt={caption(2, 'Natural fibres prepared for weaving')} className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>

          <div className="lg:col-span-5 lg:col-start-8 lg:py-12">
            <p className="storefront-eyebrow mb-4">Our point of view</p>
            <h2 className="storefront-heading text-4xl lg:text-5xl">
              Made slowly.<br />Lived with fully.
            </h2>
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
            <div className="mt-9 pt-7 border-t border-stone-200 flex gap-4">
              <Gem size={20} className="text-stone-400 mt-1 flex-shrink-0" />
              <p className="font-serif text-xl sm:text-2xl text-stone-800 leading-snug">
                “Luxury is not excess. It is the time, judgement and human touch held within an object.”
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="bg-cream-200 text-stone-900 py-20 lg:py-24 overflow-hidden">
        <div className="w-[94vw] max-w-none mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end mb-14 lg:mb-16">
            <div className="lg:col-span-7">
              <p className="text-[11px] tracking-[0.3em] uppercase text-stone-500 mb-4">The making of a rug</p>
              <h2 className="font-serif font-light text-4xl lg:text-5xl leading-[1.08]">
                From an idea on paper<br />to a surface underfoot.
              </h2>
            </div>
            <p className="lg:col-span-4 lg:col-start-9 text-stone-600 leading-relaxed">
              A made-to-order rug passes through many hands. Each stage is deliberate,
              and each one leaves a quiet trace in the finished piece.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-0 border-t border-stone-300">
            {PROCESS.map((step, index) => (
              <article key={step.number} className="group pt-8 pb-4 lg:pb-8 lg:px-7 lg:border-l first:border-l-0 first:pl-0 border-stone-300">
                <div className="aspect-[4/3] overflow-hidden mb-7 bg-stone-900">
                  <img
                    src={photo(index + 2)}
                    alt={caption(index + 2, step.title)}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-700"
                    loading="lazy"
                  />
                </div>
                <p className="text-[10px] tracking-[0.25em] text-stone-500 mb-3">{step.number}</p>
                <h3 className="font-serif text-2xl font-light mb-3">{step.title}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">{step.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="bg-stone-50 border-b border-stone-200 py-20 lg:py-24">
        <div className="w-[94vw] max-w-none mx-auto px-4">
          <div className="max-w-2xl mb-14 lg:mb-16">
            <p className="storefront-eyebrow mb-4">What matters to us</p>
            <h2 className="storefront-heading text-4xl lg:text-5xl">Beauty begins with integrity.</h2>
            <p className="text-stone-500 leading-relaxed mt-5">
              The qualities you feel in a finished rug are the result of decisions made long
              before it enters a room—who makes it, what it is made from, and how carefully it is finished.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-stone-200 border border-stone-200">
            {PRINCIPLES.map(({ icon: Icon, title, copy }) => (
              <article key={title} className="bg-white p-7 lg:p-8 min-h-[250px] flex flex-col">
                <span className="w-11 h-11 rounded-full border border-stone-200 flex items-center justify-center text-stone-500">
                  <Icon size={18} />
                </span>
                <div className="mt-auto pt-10">
                  <h3 className="font-serif text-xl text-stone-900">{title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed mt-3">{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="w-[94vw] max-w-none mx-auto px-4 py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-stone-200">
          <div className="relative min-h-[460px] lg:min-h-[660px] overflow-hidden">
            <img src={photo(5)} alt="Inside the rug workshop" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/65 via-transparent to-transparent" />
            <div className="absolute left-7 bottom-7 text-white">
              <p className="text-[10px] tracking-[0.25em] uppercase text-white/70">Inside the workshop</p>
              <p className="font-serif text-2xl mt-1">A culture of care and precision</p>
            </div>
          </div>
          <div className="bg-white p-8 sm:p-12 lg:p-16 xl:p-20 flex flex-col justify-center">
            <Sparkles size={22} className="text-stone-400 mb-8" />
            <p className="storefront-eyebrow mb-4">A note from the founder</p>
            <h2 className="storefront-heading text-4xl lg:text-5xl">Craft is a responsibility.</h2>
            <div className="mt-7 space-y-5 text-stone-500 leading-relaxed">
              <p>
                For more than two decades, Haris Ahmed has worked alongside makers who understand
                that excellence is rarely one grand gesture. It is hundreds of small decisions,
                repeated with patience and care.
              </p>
              <p>
                {businessName} was founded to bring that standard directly to the people who will
                live with these rugs—to make the process more transparent, more personal and more
                faithful to the hands behind the work.
              </p>
            </div>
            <div className="mt-10 pt-7 border-t border-stone-200">
              <p className="font-serif text-2xl text-stone-900">Haris Ahmed</p>
              <p className="text-[10px] tracking-[0.25em] uppercase text-stone-400 mt-1">Founder</p>
            </div>
          </div>
        </div>
      </section>

      {/* Consultation + contact */}
      <section className="bg-cream-200 text-stone-900 py-20 lg:py-24">
        <div className="w-[94vw] max-w-none mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-0 items-center">
          <div className="lg:col-span-7 lg:pr-16">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-px bg-stone-400 flex-shrink-0" />
              <p className="text-[10px] sm:text-[11px] leading-none tracking-[0.24em] sm:tracking-[0.3em] uppercase text-stone-500">
                Let us make something lasting
              </p>
            </div>
            <h2 className="font-serif font-light text-3xl sm:text-4xl lg:text-5xl leading-[1.08] tracking-tight max-w-2xl">
              Your room is the beginning of the design.
            </h2>
            <p className="text-stone-600 leading-relaxed mt-6 max-w-xl">
              Share your dimensions, references and ideas. We will help you consider scale,
              material, colour and construction before your rug reaches the loom.
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mt-9">
              <Link to="/custom-rug-request" className="inline-flex justify-center items-center gap-3 bg-stone-900 text-white px-6 py-3.5 text-xs tracking-[0.18em] uppercase hover:bg-stone-800 transition-colors">
                Request a custom rug <ArrowRight size={14} />
              </Link>
              <Link to="/catalog" className="inline-flex justify-center items-center gap-3 border border-stone-400 px-6 py-3.5 text-xs tracking-[0.18em] uppercase hover:border-stone-700 transition-colors">
                Explore the collection
              </Link>
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
