import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  /** Defaults to the current path (window.location) if omitted. */
  canonical?: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_NAME = 'DreamRugsCreation';

// Search results truncate descriptions around 155-160 characters; cut at a word boundary.
function clampDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : cut.length).replace(/[\s,;:—-]+$/, '')}…`;
}

export default function SEO({ title, description: rawDescription, canonical, image, noindex, jsonLd }: SEOProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const description = clampDescription(rawDescription);
  // Default canonical is the path only — dropping query strings (filters, sort,
  // tracking params) so paginated/filtered views of the same page don't register
  // as separate, duplicate-content URLs to search engines.
  const url = canonical ?? (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined);
  const absoluteImage = image && typeof window !== 'undefined'
    ? new URL(image, window.location.origin).toString()
    : image;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      {url && <link rel="canonical" href={url} />}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {url && <meta property="og:url" content={url} />}
      {absoluteImage && <meta property="og:image" content={absoluteImage} />}

      {/* Twitter */}
      <meta name="twitter:card" content={absoluteImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {absoluteImage && <meta name="twitter:image" content={absoluteImage} />}

      {jsonLd && (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((block, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(block)}</script>
      ))}
    </Helmet>
  );
}
