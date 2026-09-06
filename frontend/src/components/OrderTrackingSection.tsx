import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import type { getPublicSettings } from '../services/api';

const DEFAULT_TRACKING_STEPS = [
  { title: 'Final inspection', description: 'Your rug is checked, rolled and securely packed.' },
  { title: 'Carrier collection', description: 'The carrier collects the completed shipment.' },
  { title: 'Tracking sent', description: 'We share the tracking number and live tracking link with you.' },
];

export default function OrderTrackingSection({ settings, standalone = false }: {
  settings: Awaited<ReturnType<typeof getPublicSettings>> | null;
  standalone?: boolean;
}) {
  const Heading = standalone ? 'h1' : 'h2';
  const email = settings?.contact_emails?.[0] || '';
  const tracking = {
    eyebrow: settings?.order_tracking_eyebrow || 'Order visibility',
    heading: settings?.order_tracking_heading || 'Follow your rug after dispatch.',
    body: settings?.order_tracking_body || 'Once your finished rug has passed final inspection and is collected for shipment, we send the tracking number and tracking link by email or WhatsApp. You can then follow the order until delivery.',
    shippingPolicyUrl: settings?.order_tracking_shipping_policy_url || '',
    carriers: settings?.order_tracking_carriers || [],
    steps: settings?.order_tracking_steps?.length ? settings.order_tracking_steps : DEFAULT_TRACKING_STEPS,
    mediaUrl: settings?.order_tracking_media_url || '',
    mediaType: settings?.order_tracking_media_type,
  };
  return (<section className="bg-[#20221c] px-[5vw] py-20 text-[#f7f5ef] lg:py-28"><div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-[8vw]"><div><p className="mb-6 text-[10px] uppercase tracking-[0.24em] text-[#c3a27c]">{tracking.eyebrow}</p><Heading className="font-serif text-4xl leading-tight md:text-5xl">{tracking.heading}</Heading><div className="mt-8 max-w-lg space-y-6 text-sm leading-7 text-white/80"><p>{tracking.body}</p>{tracking.shippingPolicyUrl && <a href={tracking.shippingPolicyUrl} target="_blank" rel="noreferrer" className="inline-flex border-b border-white pb-2 text-xs uppercase tracking-wider">Read Our Shipping Policy ↗</a>}<Link to="/my-orders" className="inline-flex border-b border-white pb-2 text-xs uppercase tracking-wider">View my orders ↗</Link><p className="text-xs">Need help locating a shipment? Include your order number when contacting the studio.</p>{email && <a href={`mailto:${email}?subject=Order%20tracking%20help`} className="inline-block border-b border-white text-sm">Contact the studio ↗</a>}{tracking.mediaUrl && (tracking.mediaType === 'video' ? <video src={tracking.mediaUrl} className="mt-4 aspect-video w-full max-w-md object-cover" controls /> : <img src={tracking.mediaUrl} alt="" className="mt-4 aspect-video w-full max-w-md object-cover" />)}</div></div><div className="bg-[#f0ece3] p-8 text-[#20221c] md:p-12">{tracking.carriers.length > 0 && <div className="flex flex-wrap items-center justify-center gap-6 pb-8 border-b border-stone-300">{tracking.carriers.map((carrier, index) => <Fragment key={carrier.label}>{index > 0 && <span className="text-xs text-stone-400">or</span>}<img src={carrier.image_url} alt={carrier.label} className="h-20 w-auto max-w-[220px] object-contain" /></Fragment>)}</div>}{tracking.steps.map((step,index) => <div key={step.title} className="flex gap-5 border-t border-stone-300 py-6 first:border-t-0">
      <span className="storefront-eyebrow pt-1">0{index+1}</span><div><h2 className="storefront-heading text-xl">{step.title}</h2><p className="mt-2 text-xs leading-6 text-stone-600">{step.description}</p></div></div>)}</div></div></section>);
}
