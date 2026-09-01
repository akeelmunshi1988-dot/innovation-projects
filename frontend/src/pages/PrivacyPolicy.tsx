import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import { getPublicSettings } from '../services/api';

const fallback = `<h2>Information we collect</h2><p>We collect information you provide when requesting a quote, placing an order, creating an account, or contacting us.</p><h2>How we use information</h2><p>We use this information to fulfil orders, provide customer support, improve our services, and meet legal obligations.</p><h2>Payments and service providers</h2><p>Payments and certain operational services may be handled by trusted providers under their own privacy practices. We do not sell your personal information.</p><h2>Your choices</h2><p>You may contact us to ask about, correct, or request deletion of your personal information, subject to applicable legal and record-keeping requirements.</p>`;

export default function PrivacyPolicy() {
  const [content, setContent] = useState('');
  useEffect(() => { getPublicSettings().then(s => setContent(s.privacy_policy_html || fallback)).catch(() => setContent(fallback)); }, []);
  return <CustomerLayout>
    <SEO title="Privacy Policy" description="Learn how we collect, use, store, and protect customer information." />
    <main className="w-[94vw] max-w-4xl mx-auto px-4 py-16">
      <p className="storefront-eyebrow text-stone-500">Your Privacy</p>
      <h1 className="storefront-heading text-4xl text-stone-900 mt-2 mb-10">Privacy Policy</h1>
      <div className="prose-content text-stone-600" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
    </main>
  </CustomerLayout>;
}
