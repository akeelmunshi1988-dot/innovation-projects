// Build-time head-injection "prerender": after `vite build`, this writes a static
// index.html per public route with the correct <title>/<meta description>/canonical/
// OG/Twitter/JSON-LD baked into the raw HTML.
//
// Why: this is a client-rendered SPA, so the file Vite emits at dist/index.html has
// no route-specific metadata — every route serves the same generic shell. Googlebot
// executes JS and eventually sees react-helmet-async's tags, but on a delayed second
// rendering pass with a limited budget; crawlers that never execute JS at all (Bing,
// and social-preview bots for WhatsApp/LinkedIn/Slack) only ever see the raw HTML, so
// without this they get the generic shell's meta for every shared link.
//
// This does NOT prerender visible body content (the React app still hydrates and
// renders normally) — it only fixes the <head> crawlers and share-preview bots read
// before any JS runs. Injected tags carry data-rh="true", the same marker
// react-helmet-async stamps on server-rendered tags, so on hydration Helmet
// recognizes and replaces them in place instead of duplicating them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');
const SITE_NAME = 'DreamRugsCreation';
const SITE_URL = (process.env.SITE_URL || 'https://dreamrugscreation.in').replace(/\/$/, '');
// Only needed to look up rug names/descriptions/images for /catalog/:id and the
// business name for /about — points at the backend API, not the frontend.
const API_URL = (process.env.PRERENDER_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8');

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function absoluteUrl(url) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function renderHead({ title, description, routePath, image, jsonLd, noindex }) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${routePath}`;
  const absImage = absoluteUrl(image);

  const tags = [
    `<title data-rh="true">${esc(fullTitle)}</title>`,
    `<meta data-rh="true" name="description" content="${esc(description)}">`,
    `<meta data-rh="true" name="robots" content="${noindex ? 'noindex, nofollow' : 'index, follow'}">`,
    `<link data-rh="true" rel="canonical" href="${esc(url)}">`,
    `<meta data-rh="true" property="og:type" content="website">`,
    `<meta data-rh="true" property="og:site_name" content="${esc(SITE_NAME)}">`,
    `<meta data-rh="true" property="og:title" content="${esc(fullTitle)}">`,
    `<meta data-rh="true" property="og:description" content="${esc(description)}">`,
    `<meta data-rh="true" property="og:url" content="${esc(url)}">`,
  ];
  if (absImage) tags.push(`<meta data-rh="true" property="og:image" content="${esc(absImage)}">`);
  tags.push(`<meta data-rh="true" name="twitter:card" content="${absImage ? 'summary_large_image' : 'summary'}">`);
  tags.push(`<meta data-rh="true" name="twitter:title" content="${esc(fullTitle)}">`);
  tags.push(`<meta data-rh="true" name="twitter:description" content="${esc(description)}">`);
  if (absImage) tags.push(`<meta data-rh="true" name="twitter:image" content="${esc(absImage)}">`);

  for (const block of jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []) {
    tags.push(`<script data-rh="true" type="application/ld+json">${JSON.stringify(block)}</script>`);
  }
  return tags.join('\n    ');
}

function writeRoute(routePath, headHtml) {
  // Drop the generic <title>/<meta description> baked into the built index.html so
  // they don't sit next to our route-specific ones.
  let html = template
    .replace(/<title>.*?<\/title>/s, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/i, '');
  html = html.replace('</head>', `    ${headHtml}\n  </head>`);

  // Written as <route>.html (a *file*, not <route>/index.html) so nginx's
  // `try_files $uri $uri.html ...` finds it as a direct file match. A directory
  // match (`$uri/`) makes nginx 301-redirect bare URLs like /catalog/1 to
  // /catalog/1/ before serving the index — a hop plenty of non-JS crawlers and
  // link-preview bots won't reliably follow, which would defeat the entire point.
  if (routePath === '/') {
    fs.writeFileSync(path.join(DIST, 'index.html'), html);
  } else {
    const outFile = path.join(DIST, `${routePath.replace(/^\//, '')}.html`);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, html);
  }
  console.log(`  ✓ ${routePath}`);
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function main() {
  console.log(`Prerendering head metadata (SITE_URL=${SITE_URL})...`);

  let settings = null;
  try {
    settings = await fetchJson(`${API_URL}/api/customer/settings`);
  } catch (err) {
    console.warn(`  ! Could not reach API at ${API_URL} for business settings (${err.message}). Using defaults.`);
  }
  const businessName = settings?.business_name || SITE_NAME;
  const heroImage = settings?.hero_image_url || null;

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: businessName,
    url: `${SITE_URL}/`,
    ...(heroImage ? { image: absoluteUrl(heroImage) } : {}),
    ...(settings?.contact_emails?.[0] || settings?.contact_phones?.[0]
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            ...(settings.contact_emails?.[0] ? { email: settings.contact_emails[0] } : {}),
            ...(settings.contact_phones?.[0] ? { telephone: settings.contact_phones[0] } : {}),
          },
        }
      : {}),
    ...(settings?.contact_address ? { address: settings.contact_address } : {}),
  };

  writeRoute('/', renderHead({
    routePath: '/',
    title: 'Handcrafted Custom Rugs, Made to Order',
    description: "Premium handcrafted rugs custom-made to your exact size, material, and design — wool, silk, cotton, and synthetic weaves from India's finest workshops. Visualize any rug in your room before you order.",
    image: heroImage,
    jsonLd: organizationJsonLd,
  }));

  writeRoute('/about', renderHead({
    routePath: '/about',
    title: `About ${businessName}`,
    description: `Learn about ${businessName}'s craftsmanship, workshop, and the master weavers behind every handmade custom rug.`,
  }));

  writeRoute('/catalog', renderHead({
    routePath: '/catalog',
    title: 'Rug Collection — Wool, Silk, Cotton & Synthetic',
    description: 'Browse our full collection of handcrafted rugs in wool, silk, cotton, and synthetic weaves. Every design available in custom sizes, made to order.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Catalog', item: `${SITE_URL}/catalog` },
      ],
    },
  }));

  writeRoute('/pricing', renderHead({
    routePath: '/pricing',
    title: 'Pricing',
    description: 'Simple, INR-priced software for rug manufacturers — AI assistant, customer portal, and quote builder. UPI and card payments, GST invoicing, no USD billing.',
  }));

  // /catalog/:id needs live rug data from the backend API. If it's unreachable at
  // build time (e.g. a local build with no backend running), skip it rather than
  // failing the whole frontend build — the SPA still works fine for users, it just
  // won't have baked-in meta for these routes until the next build with the API
  // reachable.
  try {
    const rugs = await fetchJson(`${API_URL}/api/customer/catalog`);
    for (const rug of rugs) {
      const slug = rug.slug || String(rug.id);
      const description = rug.description
        ?? `${rug.name} — ${rug.material} rug${rug.weave_type ? `, ${rug.weave_type}` : ''}. Custom-made to your exact size.`;
      writeRoute(`/catalog/${slug}`, renderHead({
        routePath: `/catalog/${slug}`,
        title: rug.name,
        description,
        image: rug.image_url,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: rug.name,
            description,
            image: absoluteUrl(rug.image_url) ?? undefined,
            material: rug.material,
            offers: {
              '@type': 'Offer',
              price: rug.base_price_per_sqm,
              priceCurrency: rug.base_price_currency || 'INR',
              availability: rug.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
              { '@type': 'ListItem', position: 2, name: 'Collection', item: `${SITE_URL}/catalog` },
              { '@type': 'ListItem', position: 3, name: rug.name, item: `${SITE_URL}/catalog/${slug}` },
            ],
          },
        ],
      }));
    }
    console.log(`  (${rugs.length} rug detail page(s) prerendered)`);
  } catch (err) {
    console.warn(`  ! Could not reach API at ${API_URL} for /catalog/:id pages (${err.message}). Skipping.`);
  }

  console.log('Prerender complete.');
}

main().catch((err) => {
  console.error('Prerender failed:', err);
  // Non-fatal: the SPA build itself already succeeded and works without this step.
  process.exitCode = 0;
});
