import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import { GUIDES } from '../data/guides';

export default function GuidePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) return <Navigate to="/guides" replace />;

  const url = `${window.location.origin}/guides/${guide.slug}`;
  return (
    <CustomerLayout>
      <SEO
        title={guide.seoTitle}
        description={guide.description}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: guide.title,
            description: guide.description,
            datePublished: guide.datePublished,
            mainEntityOfPage: url,
            author: { '@type': 'Organization', name: 'DreamRugsCreation' },
            publisher: { '@type': 'Organization', name: 'DreamRugsCreation' },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
              { '@type': 'ListItem', position: 2, name: 'Rug Guides', item: `${window.location.origin}/guides` },
              { '@type': 'ListItem', position: 3, name: guide.title, item: url },
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: guide.faq.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
          },
        ]}
      />
      <article className="w-[94vw] max-w-3xl mx-auto px-4 py-12 md:py-16">
        <nav className="flex items-center gap-2 text-xs text-stone-400 mb-8">
          <Link to="/" className="hover:text-stone-900">Home</Link>
          <ChevronRight size={11} />
          <Link to="/guides" className="hover:text-stone-900">Rug Guides</Link>
        </nav>
        <p className="storefront-eyebrow text-stone-500">Rug Guide</p>
        <h1 className="storefront-heading text-4xl md:text-5xl text-stone-900 mt-2 mb-8">{guide.title}</h1>
        <p className="text-lg text-stone-700 leading-8 mb-12">{guide.intro}</p>

        {guide.sections.map((section) => (
          <section key={section.heading} className="mb-10">
            <h2 className="font-serif text-2xl md:text-3xl text-stone-900 mb-4">{section.heading}</h2>
            {section.paragraphs.map((p) => <p key={p} className="text-stone-600 leading-8 mb-4">{p}</p>)}
          </section>
        ))}

        <section className="mt-14">
          <h2 className="font-serif text-2xl md:text-3xl text-stone-900 mb-6">Frequently asked questions</h2>
          <div className="divide-y divide-stone-200 border-y border-stone-200">
            {guide.faq.map((item) => (
              <div key={item.q} className="py-5">
                <h3 className="font-serif text-xl text-stone-900">{item.q}</h3>
                <p className="mt-2 text-stone-600 leading-7">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3">
          {guide.related.map((link) => (
            <Link key={link.to} to={link.to} className="storefront-link-arrow text-stone-900">
              {link.label} <ArrowRight size={14} />
            </Link>
          ))}
        </div>
      </article>
    </CustomerLayout>
  );
}
