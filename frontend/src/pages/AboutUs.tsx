import { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import { getPublicSettings } from '../services/api';

interface Person {
  name: string;
  role: string;
  bio: string;
  initials: string;
}

const OWNER: Person = {
  name: 'Owner Name',
  role: 'Founder & Managing Director',
  bio: 'With over two decades in the craft, our founder set out to bring authentic, hand-made rugs directly from the loom to your home — no middlemen, no compromises on quality. Every design that leaves our workshop is personally reviewed before it ships.',
  initials: 'ON',
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

  useEffect(() => {
    getPublicSettings()
      .then((data) => { if (data.business_name) setBusinessName(data.business_name); })
      .catch(() => {});
  }, []);

  return (
    <CustomerLayout>
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
              Craftsmanship passed down, not mass produced
            </h2>
            <p className="text-stone-500 leading-relaxed">
              What started as a small family loom has grown into a workshop trusted for
              custom, hand-made rugs — without losing the values we started with. Every
              rug is made to order, in the size and material you choose, by weavers who
              have practiced this craft for generations.
            </p>
            <p className="text-stone-500 leading-relaxed">
              We work directly with our weavers and source natural materials responsibly,
              so every rug that reaches your door reflects real craftsmanship — not a
              factory line.
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

      {/* ── CONTACT ──────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Get in Touch</p>
          <h2 className="font-serif text-4xl font-light text-stone-900">Contact Us</h2>
          <p className="text-stone-500 leading-relaxed mt-4">
            Have a question about a custom order, sizing, or materials? We'd love to hear from you.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <Mail size={18} />, label: 'Email', value: 'hello@yourbusiness.com' },
            { icon: <Phone size={18} />, label: 'Phone', value: '+91 00000 00000' },
            { icon: <MapPin size={18} />, label: 'Workshop', value: 'Your City, India' },
            { icon: <Clock size={18} />, label: 'Hours', value: 'Mon–Sat, 9am–6pm' },
          ].map((c) => (
            <div key={c.label} className="border border-stone-200 p-6 space-y-2">
              <div className="text-stone-400">{c.icon}</div>
              <p className="text-xs tracking-widest uppercase text-stone-400">{c.label}</p>
              <p className="text-stone-900 text-sm">{c.value}</p>
            </div>
          ))}
        </div>
      </section>
    </CustomerLayout>
  );
}
