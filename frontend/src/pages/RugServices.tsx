import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronDown, Send } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import { getPublicSettings } from '../services/api';

const button = 'inline-flex items-center justify-center bg-[#20221c] px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-white hover:bg-[#414436] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4';
// Matches the "Request a Quote" modal's form styling (CustomerRugDetail.tsx) so every
// customer-facing enquiry form on the site looks and feels the same.
const fieldLabel = 'text-stone-500 text-xs font-medium block mb-1 uppercase tracking-wider';
const input = 'w-full border border-stone-200 px-3 py-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-400';
const submitButton = 'w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-medium tracking-widest uppercase py-3.5 transition-colors flex items-center justify-center gap-2';
function SelectField({ name, label, options }: { name: string; label: string; options: string[] }) {
  return <div>
    <label className={fieldLabel}>{label}</label>
    <div className="relative">
      <select name={name} className={`${input} appearance-none bg-white pr-8`}>{options.map(option => <option key={option}>{option}</option>)}</select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
    </div>
  </div>;
}
const PROFESSIONS = [
  { value: 'architect', label: 'Architect' },
  { value: 'interior_designer', label: 'Interior Designer' },
  { value: 'retailer', label: 'Retailer / Rug Showroom' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'private_label', label: 'Private Label Brand' },
  { value: 'hospitality', label: 'Hospitality Company' },
];
function Intro({ label, title, children, dark }: { label: string; title: string; children: ReactNode; dark?: boolean }) {
  return <div>
    <p className={`storefront-eyebrow mb-6 ${dark ? 'text-white/80' : ''}`}>{label}</p>
    <h1 className={`storefront-heading max-w-2xl text-5xl md:text-6xl ${dark ? 'text-white' : ''}`}>{title}</h1>
    <div className="mt-8 max-w-lg space-y-6 text-sm leading-7 opacity-80">{children}</div>
  </div>;
}
function RoomPlan({ room }: { room: 'living' | 'dining' | 'bedroom' }) {
  return <svg viewBox="0 0 400 330" role="img" aria-label={`${room} rug placement diagram`} className="w-full bg-[#e7e0d4]">
    <defs><pattern id={`threads-${room}`} width="7" height="7" patternUnits="userSpaceOnUse"><path d="M1 0v7" stroke="#b79c87" strokeWidth="0.5" /></pattern></defs>
    {room === 'dining' ? <ellipse cx="200" cy="165" rx="156" ry="128" fill={`url(#threads-${room})`} stroke="#a9785d" /> : <rect x="48" y="35" width="304" height="260" fill={`url(#threads-${room})`} stroke="#a9785d" />}
    <g fill="#f8f5ef" stroke="#776e61" strokeWidth="2">
      {room === 'living' && <><rect x="72" y="55" width="256" height="60" rx="8" /><path d="M80 96h240M156 55v40M244 55v40" fill="none" /><rect x="130" y="144" width="140" height="76" rx="18" /><rect x="70" y="228" width="62" height="55" rx="8" /><rect x="268" y="228" width="62" height="55" rx="8" /></>}
      {room === 'dining' && <><rect x="120" y="89" width="160" height="154" rx="55" />{[100,160,220].map(y => <g key={y}><rect x="84" y={y} width="28" height="35" rx="4" /><rect x="288" y={y} width="28" height="35" rx="4" /></g>)}</>}
      {room === 'bedroom' && <><rect x="112" y="20" width="176" height="210" rx="5" /><rect x="122" y="30" width="70" height="40" rx="5" /><rect x="208" y="30" width="70" height="40" rx="5" /><path d="M112 82h176" /><rect x="60" y="22" width="38" height="38" /><rect x="302" y="22" width="38" height="38" /></>}
    </g>
  </svg>;
}
const TRADE_FIELD_LABELS: Record<string, string> = {
  first_name: 'First name', last_name: 'Last name', email: 'Email', phone: 'Phone',
  city: 'City', country: 'Country', profession: 'Which best describes you',
  company: 'Company / studio', website: 'Website / Instagram', project_type: 'Primary project type',
  project_brief: 'Tell us about your work',
};
function TradeForm({ phone, email, loading }: { phone: string; email: string; loading: boolean }) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(
      Object.keys(TRADE_FIELD_LABELS).map(key => [key, String(form.get(key) || '').trim()])
    );
    try {
      await axios.post('/api/customer/trade-enquiries', values);
    } catch {
      // best-effort — still let the customer reach the studio directly below
    } finally {
      setSubmitting(false);
    }
    const body = 'Trade enquiry\n\n' + Object.entries(TRADE_FIELD_LABELS)
      .map(([key, label]) => `${label}: ${values[key] || 'Not provided'}`).join('\n');
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
      setMessage('Your enquiry is ready in WhatsApp. Review it and press Send to submit.');
    } else if (email) {
      window.location.href = `mailto:${email}?subject=Trade%20enquiry&body=${encodeURIComponent(body)}`;
      setMessage('Your email draft is ready. Send it from your email app to submit.');
    }
  };
  return <form onSubmit={submit} className="space-y-6">
    <div className="border-b border-stone-300 pb-6"><p className="storefront-eyebrow">Trade partner enquiry</p><h2 className="storefront-heading mt-3 text-3xl">Tell us about your practice.</h2></div>
    <div className="grid gap-5 sm:grid-cols-2">{[
      { name: 'first_name', type: 'text', autoComplete: 'given-name' },
      { name: 'last_name', type: 'text', autoComplete: 'family-name' },
      { name: 'email', type: 'email', autoComplete: 'email' },
      { name: 'phone', type: 'tel', autoComplete: 'tel' },
      { name: 'city', type: 'text', autoComplete: 'address-level2' },
      { name: 'country', type: 'text', autoComplete: 'country-name' },
    ].map(({ name, type, autoComplete }) => <div key={name}>
      <label className={fieldLabel}>{TRADE_FIELD_LABELS[name]} *</label>
      <input name={name} required maxLength={150} type={type} autoComplete={autoComplete} className={input} />
    </div>)}</div>
    <fieldset className="border-y border-stone-300 py-5">
      <legend className={fieldLabel}>{TRADE_FIELD_LABELS.profession}? *</legend>
      <div className="grid gap-3 pt-3 sm:grid-cols-2 lg:grid-cols-3">{PROFESSIONS.map(({ value, label }) => <label key={value} className="flex items-center gap-2.5 border border-stone-200 px-3 py-2.5 text-sm text-stone-700 cursor-pointer transition-colors has-[:checked]:border-stone-400 has-[:checked]:bg-stone-50">
        <input type="radio" name="profession" value={value} required className="accent-stone-800" />{label}
      </label>)}</div>
    </fieldset>
    <div className="grid gap-5 sm:grid-cols-2">
      <div><label className={fieldLabel}>{TRADE_FIELD_LABELS.company} *</label><input name="company" required maxLength={200} className={input} /></div>
      <div><label className={fieldLabel}>{TRADE_FIELD_LABELS.website}</label><input name="website" maxLength={300} placeholder="https://" className={input} /></div>
    </div>
    <SelectField name="project_type" label={TRADE_FIELD_LABELS.project_type} options={['Residential', 'Hospitality', 'Commercial', 'Retail collection', 'Other']} />
    <div>
      <label className={fieldLabel}>{TRADE_FIELD_LABELS.project_brief} *</label>
      <textarea name="project_brief" required maxLength={2000} rows={5} placeholder="Project scope, sizes, quantities, materials, timeline and design direction" className={`${input} resize-none`} />
    </div>
    <label className="flex items-start gap-3 border border-stone-200 px-3 py-3 text-xs leading-5 text-stone-600 cursor-pointer transition-colors has-[:checked]:border-stone-400 has-[:checked]:bg-stone-50">
      <input type="checkbox" required className="mt-0.5 h-4 w-4 flex-shrink-0 accent-stone-800" />
      <span>I agree to share these details with the studio to discuss my enquiry. <Link to="/privacy-policy" className="underline hover:text-stone-900">Privacy policy</Link></span>
    </label>
    <button disabled={submitting || loading || (!phone && !email)} className={`${submitButton} disabled:opacity-50`}>
      {submitting ? <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={13} />}
      {submitting ? 'Submitting…' : loading ? 'Loading contact details…' : 'Submit Enquiry'}
    </button>
    {!loading && !phone && !email && <p className="text-sm">Contact details are temporarily unavailable. <Link to="/custom-rug-request" className="underline">Use our bespoke rug request form.</Link></p>}
    {message && <p role="status" className="text-sm leading-6">{message}</p>}
  </form>;
}

const DEFAULT_COLOUR_ITEMS = [
  { title: 'Pantone Colours', description: 'Reference a Pantone code or attach your selected swatch.', image_url: '/static/journey/design.jpg' },
  { title: 'ARS Wool & Viscose Silk', description: 'Wool Box 1200 and 1400 · ARS 1000 Viscose Silk Box.', image_url: '/static/materials/wool.jpg' },
  { title: 'Additional ARS Systems', description: 'ARS 600 Box · ARS 700 Viscose Silk Box.', image_url: '/static/materials/silk.jpg' },
];

export default function RugServices({ page }: { page: 'colour' | 'size' | 'trade' | 'tracking' }) {
  const [contact, setContact] = useState({ phone: '', email: '', loading: true });
  const [colour, setColour] = useState({
    eyebrow: 'Professional colour matching',
    heading: 'Specify colour with confidence.',
    body: 'Bring your palette into the conversation. Share a colour reference, fabric swatch or yarn sample with your rug brief so we can discuss the closest match for your chosen material.\n\nInclude the reference system and code, such as Pantone, when available. Screens and fibres can show colour differently; discuss a physical sample before confirming your final palette.',
    items: DEFAULT_COLOUR_ITEMS,
  });
  useEffect(() => { let active = true; getPublicSettings().then(settings => {
    if (!active) return;
    setContact({ phone: (settings.contact_phones?.[0] || '').replace(/\D/g, ''), email: settings.contact_emails?.[0] || '', loading: false });
    setColour({
      eyebrow: settings.colour_matching_eyebrow || 'Professional colour matching',
      heading: settings.colour_matching_heading || 'Specify colour with confidence.',
      body: settings.colour_matching_body || 'Bring your palette into the conversation. Share a colour reference, fabric swatch or yarn sample with your rug brief so we can discuss the closest match for your chosen material.\n\nInclude the reference system and code, such as Pantone, when available. Screens and fibres can show colour differently; discuss a physical sample before confirming your final palette.',
      items: settings.colour_matching_items?.length ? settings.colour_matching_items : DEFAULT_COLOUR_ITEMS,
    });

  }).catch(() => { if (active) setContact({ phone: '', email: '', loading: false }); }); return () => { active = false; }; }, []);
  const meta = {
    colour: ['Colour Matching', 'Plan your bespoke rug colour with reference codes, swatches and yarn samples.'],
    size: ['Rug Size Guide', 'Explore rug placement for living rooms, dining rooms and bedrooms.'],
    trade: ['Trade Enquiry', 'Discuss a rug project with our studio: design, materials, sizes and production requirements.'],
    tracking: ['Order Tracking', 'Find your rug order and follow the dispatch information shared with you.'],
  }[page];
  return <CustomerLayout><SEO title={meta[0]} description={meta[1]} />
    {page === 'colour' && <section className="bg-[#e8e2d6] px-[5vw] py-20 text-[#20221c] lg:py-28"><div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.4fr] lg:gap-[7vw]">
      <Intro label={colour.eyebrow} title={colour.heading}>{colour.body.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}{contact.email ? <a className={button} href={`mailto:${contact.email}?subject=Rug%20colour%20matching%20enquiry`}>Email a colour request ↗</a> : <Link className={button} to="/custom-rug-request">Start a colour request ↗</Link>}</Intro>
      <div className="grid gap-4 sm:grid-cols-2">{colour.items.map((item, index) => <figure key={item.title} className={`bg-[#f7f5ef] p-4 ${index === 0 ? 'sm:row-span-2' : ''}`}><img src={item.image_url} alt={item.title} className={`w-full object-contain bg-white ${index === 0 ? 'aspect-[4/5]' : 'aspect-[16/9]'}`} /><figcaption className="pt-4"><span className="storefront-eyebrow">0{index+1}</span><h2 className="storefront-heading mt-2 text-xl">{item.title}</h2><p className="mt-2 text-xs text-stone-600">{item.description}</p></figcaption></figure>)}</div>
    </div></section>}
    {page === 'size' && <><section className="bg-[#20221c] px-[5vw] py-20 text-[#f7f5ef] md:py-28"><Intro dark label="A considered fit" title="The right rug. The right proportions."><p>Start with the furniture, then find the rug that brings it together. These placement guides are a starting point; measure your own room before choosing a size.</p></Intro></section><section className="grid divide-y divide-stone-300 bg-[#f7f5ef] md:grid-cols-3 md:divide-x md:divide-y-0">{[
      {room:'living' as const,title:'Living Room',text:'Place the front legs of your sofa and chairs on the rug to connect the seating area. For a larger room, consider a rug that holds the full furniture arrangement.'},
      {room:'dining' as const,title:'Dining Room',text:'Allow enough rug beyond the table for chairs to stay on it when pulled out. Measure the table with its extensions in place and test your usual chair position.'},
      {room:'bedroom' as const,title:'Bedroom',text:'Extend the rug beyond the sides and foot of the bed for a comfortable landing. Account for bedside tables, door clearance and the space around the bed.'},
    ].map((item,index) => <article key={item.room} className="px-[4vw] py-14 text-[#20221c]"><p className="storefront-eyebrow">0{index+1}</p><h2 className="storefront-heading my-5 text-3xl">{item.title}</h2><RoomPlan room={item.room} /><p className="mt-6 text-sm leading-7 text-stone-600">{item.text}</p></article>)}</section><section className="bg-[#e8e2d6] px-[5vw] py-14 text-[#20221c]"><h2 className="storefront-heading text-3xl">Measure before you decide.</h2><p className="my-5 max-w-3xl text-sm leading-7 text-stone-600">Mark the proposed rug edges with tape, check furniture and doors, then note the width and length with your measurement unit. For a round rug, measure the diameter. Send your dimensions with your enquiry for a bespoke size.</p><Link to="/custom-rug-request" className={button}>Discuss your rug size ↗</Link></section></>}
    {page === 'trade' && <section className="bg-[#e8e2d6] px-[5vw] py-20 text-[#20221c] lg:py-28"><div className="grid gap-14 lg:grid-cols-[0.85fr_1.35fr] lg:gap-[8vw]"><Intro label="For design and trade professionals" title="Tell us about your practice and brief."><p>Share the intended use, sizes, quantities, materials and target date. Include your design direction so the studio can discuss development, sampling and production with you.</p><p>For architects, interior designers, retailers and hospitality teams planning their next rug project.</p></Intro><TradeForm {...contact} /></div></section>}
  </CustomerLayout>;
}
