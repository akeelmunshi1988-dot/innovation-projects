import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import { GUIDES } from '../data/guides';

export default function GuidesIndex() {
  return (
    <CustomerLayout>
      <SEO
        title="Rug & Carpet Buying Guides"
        description="Practical guides to buying handmade rugs and carpets: weaves, materials, custom sizes, care, and rug making in Bhadohi, India."
      />
      <main className="w-[94vw] max-w-4xl mx-auto px-4 py-12 md:py-16">
        <p className="storefront-eyebrow text-stone-500">Learn</p>
        <h1 className="storefront-heading text-4xl md:text-5xl text-stone-900 mt-2 mb-4">Rug &amp; Carpet Buying Guides</h1>
        <p className="text-lg text-stone-600 leading-8 mb-12">Everything you need to choose, order and look after a handmade rug.</p>
        <ul className="divide-y divide-stone-200 border-y border-stone-200">
          {GUIDES.map((guide) => (
            <li key={guide.slug} className="py-6">
              <Link to={`/guides/${guide.slug}`} className="group block">
                <h2 className="font-serif text-2xl text-stone-900 group-hover:underline">{guide.title}</h2>
                <p className="mt-2 text-stone-600 leading-7">{guide.description}</p>
                <span className="storefront-link-arrow text-stone-900 mt-3">Read the guide <ArrowRight size={14} /></span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </CustomerLayout>
  );
}
