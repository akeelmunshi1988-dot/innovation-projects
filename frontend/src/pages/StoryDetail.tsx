import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import DOMPurify from 'dompurify';
import { ChevronRight, ChevronLeft, X, ScrollText, ArrowRight } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import { PROSE_ALLOWED_TAGS, PROSE_ALLOWED_ATTR } from '../utils/richTextSanitize';
import type { RugStory } from '../types';

/**
 * Public /stories/:slug — the story behind one unique design: inspiration,
 * admin-written rich text, its photos and videos, and a link to the
 * catalog rug it describes. Data from GET /customer/stories/:slug.
 */
export default function StoryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [story, setStory] = useState<RugStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expandedImage, setExpandedImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    axios.get(`/api/customer/stories/${encodeURIComponent(slug)}`)
      .then(({ data }) => setStory(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!expandedImage) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpandedImage(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expandedImage]);

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center py-32">
          <div className="w-10 h-10 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
        </div>
      </CustomerLayout>
    );
  }

  if (notFound || !story) {
    return (
      <CustomerLayout>
        <SEO title="Story Not Found" description="This design story could not be found." noindex />
        <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
          <ScrollText size={36} className="text-stone-300 mx-auto" />
          <h2 className="storefront-heading text-2xl">Story Not Found</h2>
          <Link to="/stories" className="storefront-link-arrow justify-center">All Design Stories <ChevronRight size={14} /></Link>
        </div>
      </CustomerLayout>
    );
  }

  const cover = story.cover_image_url || story.rug?.image_url || null;
  const rugLink = story.rug ? `/catalog/${story.rug.slug || story.rug.id}` : null;
  const bodyHtml = story.body_html
    ? DOMPurify.sanitize(story.body_html, { ALLOWED_TAGS: PROSE_ALLOWED_TAGS, ALLOWED_ATTR: PROSE_ALLOWED_ATTR })
    : '';
  const plainBody = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return (
    <CustomerLayout>
      <SEO
        title={`${story.title} — The Story Behind the Design`}
        description={story.inspiration || plainBody || `The story behind ${story.title}, a unique handmade rug design.`}
        image={cover ?? undefined}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: story.title,
          description: story.inspiration || undefined,
          image: cover ? [new URL(cover, window.location.origin).href] : undefined,
          dateModified: story.updated_at || undefined,
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <section className="bg-[#f3f1e8] pt-8 pb-16 md:pb-24">
        <div className="mx-auto w-[90vw]">
          <nav className="flex items-center gap-2 text-xs text-stone-400 mb-12 md:mb-16" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-stone-900 transition-colors">Home</Link>
            <ChevronRight size={11} />
            <Link to="/stories" className="hover:text-stone-900 transition-colors">Design Stories</Link>
            <ChevronRight size={11} />
            <span className="text-stone-600 truncate">{story.title}</span>
          </nav>
          <p className="mb-8 text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">The Story Behind the Design</p>
          <div className="grid gap-10 md:grid-cols-12 md:items-end">
            <h1 className="font-condensed text-[clamp(3rem,5.1vw,6.2rem)] font-medium uppercase leading-[0.98] tracking-[-0.035em] text-[#191d27] md:col-span-10">
              {story.title}
            </h1>
            {story.inspiration && (
              <p className="text-base leading-relaxed text-stone-500 md:col-span-6 md:col-start-7 md:text-lg">
                <span className="text-[#9b9a93] font-condensed uppercase tracking-[0.06em] text-lg md:text-xl mr-2">Inspiration —</span>
                {story.inspiration}
              </p>
            )}
          </div>
        </div>
      </section>

      {cover && (
        <div className="mx-auto w-[90vw] -mt-8 md:-mt-12">
          <button
            type="button"
            onClick={() => setExpandedImage({ src: cover, alt: story.title })}
            className="block w-full bg-stone-100 cursor-zoom-in"
          >
            <img src={cover} alt={story.title} className="block w-full max-h-[80vh] object-cover" />
          </button>
        </div>
      )}

      {/* ── Story + linked rug ─────────────────────────────────────────── */}
      <div className="mx-auto w-[90vw] py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <article className={`${rugLink ? 'lg:col-span-7' : 'lg:col-span-8 lg:col-start-3'} prose-content text-lg`}>
          {bodyHtml
            ? <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            : story.inspiration && <p>{story.inspiration}</p>}
        </article>

        {story.rug && rugLink && (
          <aside className="lg:col-span-4 lg:col-start-9 h-fit lg:sticky lg:top-28 border border-stone-200 bg-[#f7f5ef] p-6 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">This Design</p>
            {story.rug.image_url && (
              <Link to={rugLink} className="block bg-white">
                <img src={story.rug.image_url} alt={story.rug.name} loading="lazy" className="w-full aspect-[3/4] object-contain" />
              </Link>
            )}
            <h2 className="font-serif text-xl font-light text-stone-900 leading-snug">{story.rug.name}</h2>
            <div className="flex flex-col gap-3">
              <Link
                to={rugLink}
                className="inline-flex items-center justify-center gap-2 bg-[#191d27] px-6 py-3.5 font-condensed text-lg font-medium uppercase tracking-[0.04em] text-white transition-colors hover:bg-rug-700"
              >
                View this rug <ArrowRight size={16} />
              </Link>
              <Link
                to="/custom-rug-request"
                className="inline-flex items-center justify-center border border-stone-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700 transition-colors hover:border-stone-900 hover:text-stone-900"
              >
                Commission your own version
              </Link>
            </div>
          </aside>
        )}
      </div>

      {/* ── Photos & videos ────────────────────────────────────────────── */}
      {story.media.length > 0 && (
        <section className="border-t border-stone-200 bg-[#f7f5ef] py-16 md:py-24">
          <div className="mx-auto w-[90vw]">
            <p className="mb-10 text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">From Sketch to Loom</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 items-start gap-6 md:gap-8">
              {story.media.map((m, i) => {
                const alt = m.caption || `${story.title} — ${m.type === 'video' ? 'video' : 'photo'} ${i + 1}`;
                // A lone trailing item spans the full width rather than leaving a gap.
                const wide = story.media.length % 2 === 1 && i === story.media.length - 1;
                return (
                  <figure key={`${m.url}-${i}`} className={`${wide ? 'sm:col-span-2' : ''} ${i % 2 === 1 ? 'sm:mt-14' : ''}`}>
                    {m.type === 'video' ? (
                      <video
                        src={m.url}
                        poster={m.poster_url ?? undefined}
                        controls
                        playsInline
                        preload="metadata"
                        className="block w-full bg-stone-900"
                        aria-label={alt}
                      />
                    ) : (
                      <button type="button" onClick={() => setExpandedImage({ src: m.url, alt })} className="block w-full bg-stone-100 cursor-zoom-in">
                        <img src={m.url} alt={alt} loading="lazy" className="block w-full h-auto" />
                      </button>
                    )}
                    {m.caption && <figcaption className="pt-3 text-sm text-stone-500">{m.caption}</figcaption>}
                  </figure>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto w-[90vw] py-10 border-t border-stone-100">
        <Link to="/stories" className="storefront-link-arrow">
          <ChevronLeft size={13} /> All Design Stories
        </Link>
      </div>

      {expandedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expanded photo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/90 p-4 sm:p-8"
          onClick={() => setExpandedImage(null)}
        >
          <button
            type="button"
            onClick={() => setExpandedImage(null)}
            aria-label="Close expanded image"
            className="absolute right-4 top-4 sm:right-6 sm:top-6 w-10 h-10 flex items-center justify-center bg-white text-stone-900 hover:bg-stone-100 transition-colors"
          >
            <X size={20} />
          </button>
          <img
            src={expandedImage.src}
            alt={expandedImage.alt}
            className="w-full h-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </CustomerLayout>
  );
}
