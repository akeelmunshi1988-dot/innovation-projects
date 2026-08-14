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

export default function SEO({ title, description, canonical, image, noindex, jsonLd }: SEOProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  // Default canonical is the path only — dropping query strings (filters, sort,
  // tracking params) so paginated/filtered views of the same page don't register
  // as separate, duplicate-content URLs to search engines.
  const url = canonical ?? (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined);

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
      {image && <meta property="og:image" content={image} />}

      {/* Twitter */}
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}

      {jsonLd && (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((block, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(block)}</script>
      ))}
    </Helmet>
  );
}
