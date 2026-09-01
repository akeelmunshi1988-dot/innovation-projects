import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import { getPublicSettings } from '../services/api';

const fallback = `<h2>Cancellation</h2><p>Please contact us as soon as possible if you need to cancel an order. Eligibility and any refund depend on the order's production status.</p><h2>Refunds</h2><p>Approved refunds are returned to the original payment method. Custom-made rugs may not be refundable after production has started.</p>`;

export default function RefundCancellationPolicy() {
  const [content, setContent] = useState('');
  useEffect(() => { getPublicSettings().then(s => setContent(s.refund_cancellation_policy_html || fallback)).catch(() => setContent(fallback)); }, []);
  return <CustomerLayout>
    <SEO title="Refund & Cancellation Policy" description="Read our refund and order cancellation policy." />
    <main className="w-[94vw] max-w-4xl mx-auto px-4 py-16">
      <p className="storefront-eyebrow text-stone-500">Customer Care</p>
      <h1 className="storefront-heading text-4xl text-stone-900 mt-2 mb-10">Refund &amp; Cancellation Policy</h1>
      <div className="prose-content text-stone-600" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
    </main>
  </CustomerLayout>;
}
