import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, ChevronRight } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import type { LandingPageContent } from '../data/landingPages';

interface LandingRug {
  id: number;
  slug: string;
  name: string;
  material: string;
  weave_type: string;
  image_url: string | null;
}

/** Keyword landing pages (e.g. /moroccan-rugs) — content in src/data/landingPages.json. */
export default function LandingPage({ page }: { page: LandingPageContent }) {
  const [rugs, setRugs] = useState<LandingRug[]>([]);

  useEffect(() => {
    if (!page.rugSearch) return;
    axios.get('/api/customer/catalog', { params: { search: page.rugSearch, limit: 60 } })
      .then(({ data }) => setRugs(data.items))
      .catch(() => setRugs([]));
  }, [page.rugSearch]);

  const url = `${window.location.origin}${page.path}`;
  return (
    <CustomerLayout>
      <SEO
        title={page.seoTitle}
        description={page.description}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
              { '@type': 'ListItem', position: 2, name: page.title, item: url },
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: page.faq.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
          },
        ]}
      />
      <article className="w-[94vw] max-w-3xl mx-auto px-4 py-12 md:py-16">
        <nav className="flex items-center gap-2 text-xs text-stone-400 mb-8">
          <Link to="/" className="hover:text-stone-900">Home</Link>
          <ChevronRight size={11} />
          <span className="text-stone-600">{page.title}</span>
        </nav>
        <p className="storefront-eyebrow text-stone-500">{page.eyebrow}</p>
        <h1 className="storefront-heading text-4xl md:text-5xl text-stone-900 mt-2 mb-8">{page.title}</h1>
        <p className="text-lg text-stone-700 leading-8 mb-8">{page.intro}</p>
        <Link to={page.cta.to} className="storefront-link-arrow text-stone-900 mb-12">
          {page.cta.label} <ArrowRight size={14} />
        </Link>

        {page.sections.map((section) => (
          <section key={section.heading} className="mt-12">
            <h2 className="font-serif text-2xl md:text-3xl text-stone-900 mb-4">{section.heading}</h2>
            {section.paragraphs.map((p) => <p key={p} className="text-stone-600 leading-8 mb-4">{p}</p>)}
          </section>
        ))}
      </article>

      {rugs.length > 0 && (
        <section className="w-[94vw] mx-auto px-4 pb-8">
          <h2 className="font-serif text-3xl md:text-4xl text-stone-900 mb-8">{page.rugsHeading ?? 'From our collection'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
            {rugs.map((rug) => (
              <Link key={rug.id} to={`/catalog/${rug.slug}`} className="group block">
                <div className="aspect-[4/5] bg-white overflow-hidden">
                  {rug.image_url && (
                    <img src={rug.image_url} alt={`${rug.name}, handmade ${rug.material} rug`} loading="lazy" className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.03]" />
                  )}
                </div>
                <div className="pt-4 text-center space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">{rug.material} · {rug.weave_type}</p>
                  <h3 className="font-serif text-lg text-stone-900">{rug.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="w-[94vw] max-w-3xl mx-auto px-4 py-12 md:py-16">
        <h2 className="font-serif text-2xl md:text-3xl text-stone-900 mb-6">Frequently asked questions</h2>
        <div className="divide-y divide-stone-200 border-y border-stone-200">
          {page.faq.map((item) => (
            <div key={item.q} className="py-5">
              <h3 className="font-serif text-xl text-stone-900">{item.q}</h3>
              <p className="mt-2 text-stone-600 leading-7">{item.a}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3">
          <Link to={page.cta.to} className="storefront-link-arrow text-stone-900">{page.cta.label} <ArrowRight size={14} /></Link>
          {page.links?.map((link) => (
            <Link key={link.to} to={link.to} className="storefront-link-arrow text-stone-900">{link.label} <ArrowRight size={14} /></Link>
          ))}
        </div>
      </section>
    </CustomerLayout>
  );
}
