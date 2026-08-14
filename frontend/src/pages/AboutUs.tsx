import { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import { getPublicSettings } from '../services/api';

interface Person {
  name: string;
  role: string;
  bio: string;
  initials: string;
}

const SHOW_TEAM = false;

const OWNER: Person = {
  name: 'Haris Ahmed',
  role: 'Founder',
  bio: 'With over two decades in the craft, our founder set out to bring authentic, hand-made rugs directly from the loom to your home — no middlemen, no compromises on quality. Every design that leaves our workshop is personally reviewed before it ships.',
  initials: 'HA',
};

const TEAM: Person[] = [
  {
    name: 'Production Head',
    role: 'Head of Production',
    bio: 'Oversees every rug from raw fibre to finished piece, working directly with our master weavers to maintain consistent quality across every order.',
    initials: 'PH',
  },
  {
    name: 'Quality Manager',
    role: 'Quality & Inspection Lead',
    bio: 'Hand-inspects every rug before dispatch — checking pile density, edge finishing, and colour consistency against the original order specification.',
    initials: 'QM',
  },
  {
    name: 'Customer Relations',
    role: 'Customer Experience Lead',
    bio: "Your first point of contact for custom orders, sizing questions, and order updates — here to make sure the process is as smooth as the rugs we make.",
    initials: 'CR',
  },
];

export default function AboutUs() {
  const [businessName, setBusinessName] = useState('Our Workshop');
  const [contactEmails, setContactEmails] = useState<string[]>([]);
  const [contactPhones, setContactPhones] = useState<string[]>([]);
  const [contactAddress, setContactAddress] = useState<string | null>(null);
  const [contactHours, setContactHours] = useState<string | null>(null);

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

  return (
    <CustomerLayout>
      <SEO
        title={`About ${businessName}`}
        description={`Learn about ${businessName}'s craftsmanship, workshop, and the master weavers behind every handmade custom rug.`}
      />
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-3">Our Story</p>
        <h1 className="font-serif text-5xl font-light text-stone-900 leading-[1.1] mb-6">
          About {businessName}
        </h1>
        <p className="text-stone-500 text-lg leading-relaxed max-w-2xl mx-auto">
          We are a family-run rug making workshop dedicated to preserving traditional
          hand-weaving techniques while bringing custom, made-to-order rugs to homes
          everywhere. Every piece is woven by hand, sized to your exact specification,
          and inspected before it ever leaves our workshop.
        </p>
      </section>

      {/* ── INTRODUCTION ─────────────────────────────────────────────── */}
      <section className="bg-stone-50 border-y border-stone-100 py-20">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <p className="text-xs tracking-[0.2em] uppercase text-stone-400">Who We Are</p>
            <h2 className="font-serif text-3xl font-light text-stone-900">
              Generations of craftsmanship, never mass-produced
            </h2>
            <p className="text-stone-500 leading-relaxed">
              What began as a single family loom has grown into a workshop trusted for
              custom, hand-made rugs — without compromising the principles it was founded
              on. Every rug is made to order, in the size and material you specify, by
              artisans who have refined this craft over generations.
            </p>
            <p className="text-stone-500 leading-relaxed">
              We work directly with our weavers and source natural materials responsibly,
              ensuring every rug that reaches your door reflects genuine craftsmanship —
              never a factory production line.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { v: '20+', l: 'Years of Craft' },
              { v: '500+', l: 'Rugs Delivered' },
              { v: '100%', l: 'Hand-Made' },
              { v: '4', l: 'Materials Offered' },
            ].map((s) => (
              <div key={s.l} className="bg-white border border-stone-200 p-6 text-center">
                <p className="font-serif text-3xl text-stone-900 font-light">{s.v}</p>
                <p className="text-stone-400 text-xs uppercase tracking-wider mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OWNER ────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Leadership</p>
          <h2 className="font-serif text-4xl font-light text-stone-900">Meet the Owner</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-8 items-start bg-stone-50 border border-stone-100 p-8">
          <div className="w-24 h-24 rounded-full bg-stone-900 text-white flex items-center justify-center flex-shrink-0 font-serif text-2xl">
            {OWNER.initials}
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-2xl font-light text-stone-900">{OWNER.name}</h3>
            <p className="text-xs tracking-widest uppercase text-stone-400">{OWNER.role}</p>
            <p className="text-stone-500 leading-relaxed pt-2">{OWNER.bio}</p>
          </div>
        </div>
      </section>

      {/* ── TEAM ─────────────────────────────────────────────────────── */}
      {SHOW_TEAM && (
      <section className="bg-stone-50 border-y border-stone-100 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">The People Behind the Rugs</p>
            <h2 className="font-serif text-4xl font-light text-stone-900">Our Team</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEAM.map((p) => (
              <div key={p.name} className="bg-white border border-stone-200 p-6 space-y-3">
                <div className="w-14 h-14 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-serif text-lg">
                  {p.initials}
                </div>
                <div>
                  <h3 className="text-stone-900 font-medium">{p.name}</h3>
                  <p className="text-xs tracking-widest uppercase text-stone-400 mt-0.5">{p.role}</p>
                </div>
                <p className="text-stone-500 text-sm leading-relaxed">{p.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ── CONTACT ──────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Get in Touch</p>
          <h2 className="font-serif text-4xl font-light text-stone-900">Contact Us</h2>
          <p className="text-stone-500 leading-relaxed mt-4">
            Have a question about a custom order, sizing, or materials? We'd love to hear from you.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-stone-200 p-6 space-y-2">
            <div className="text-stone-400"><Mail size={18} /></div>
            <p className="text-xs tracking-widest uppercase text-stone-400">Email</p>
            {contactEmails.length > 0 ? (
              contactEmails.map((e) => (
                <a key={e} href={`mailto:${e}`} className="block text-stone-900 text-sm hover:text-stone-600 transition-colors truncate" title={e}>{e}</a>
              ))
            ) : (
              <p className="text-stone-400 text-sm italic">Coming soon</p>
            )}
          </div>
          <div className="border border-stone-200 p-6 space-y-2">
            <div className="text-stone-400"><Phone size={18} /></div>
            <p className="text-xs tracking-widest uppercase text-stone-400">Phone</p>
            {contactPhones.length > 0 ? (
              contactPhones.map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <a href={`tel:${p}`} className="text-stone-900 text-sm hover:text-stone-600 transition-colors">{p}</a>
                  <a
                    href={`https://wa.me/${p.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 transition-colors"
                  >
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                </div>
              ))
            ) : (
              <p className="text-stone-400 text-sm italic">Coming soon</p>
            )}
          </div>
          <div className="border border-stone-200 p-6 space-y-2">
            <div className="text-stone-400"><MapPin size={18} /></div>
            <p className="text-xs tracking-widest uppercase text-stone-400">Workshop</p>
            <p className="text-stone-900 text-sm whitespace-pre-line">{contactAddress || 'Coming soon'}</p>
          </div>
          <div className="border border-stone-200 p-6 space-y-2">
            <div className="text-stone-400"><Clock size={18} /></div>
            <p className="text-xs tracking-widest uppercase text-stone-400">Hours</p>
            <p className="text-stone-900 text-sm">{contactHours || 'Coming soon'}</p>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
