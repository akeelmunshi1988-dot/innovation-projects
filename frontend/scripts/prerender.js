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
const REQUIRE_API = process.env.REQUIRE_PRERENDER_API === 'true';

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

function writeRoute(routePath, headHtml, bodyHtml = '') {
  // Drop the generic <title>/<meta description> baked into the built index.html so
  // they don't sit next to our route-specific ones.
  let html = template
    .replace(/<title>.*?<\/title>/s, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/i, '');
  html = html.replace('</head>', `    ${headHtml}\n  </head>`);
  if (bodyHtml) {
    html = html.replace('<div id="root"></div>', `<div id="root"><main data-prerendered-content>${bodyHtml}</main></div>`);
  }

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
    if (REQUIRE_API) throw new Error(`Required prerender API is unavailable: ${err.message}`);
  }
  const businessName = settings?.business_name || SITE_NAME;
  const heroImage = settings?.hero_image_url || null;

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: businessName,
    url: `${SITE_URL}/`,
    ...(heroImage ? { image: absoluteUrl(heroImage) } : {}),
    ...(settings?.logo_url ? { logo: absoluteUrl(settings.logo_url) } : {}),
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
  }), '<h1>Handcrafted Custom Rugs, Made to Order</h1><p>Premium handcrafted rugs custom-made to your exact size, material, and design in wool, silk, cotton, and considered blends.</p><nav><a href="/catalog">Explore the rug collection</a> <a href="/custom-rug-request">Request a custom rug</a> <a href="/about">About our workshop</a></nav>');

  writeRoute('/about', renderHead({
    routePath: '/about',
    title: `About ${businessName}`,
    description: `Learn about ${businessName}'s craftsmanship, workshop, and the master weavers behind every handmade custom rug.`,
    image: settings?.about_page?.hero?.image_url,
  }), `<h1>About ${esc(businessName)}</h1><p>Discover our craftsmanship, workshop, materials, and the master weavers behind every handmade custom rug.</p><a href="/custom-rug-request">Begin a custom rug</a>`);

  const catalogHead = renderHead({
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
  });
  writeRoute('/catalog', catalogHead, '<h1>Handcrafted Rug Collection</h1><p>Browse made-to-order rugs in wool, silk, cotton, and considered blends.</p>');

  writeRoute('/custom-rug-request', renderHead({
    routePath: '/custom-rug-request',
    title: 'Request a Custom Rug',
    description: 'Request a made-to-order rug designed for your room, dimensions, material preferences, colours, and budget.',
  }), '<h1>Request a Custom Rug</h1><p>Share your dimensions, material preferences, colours, references, and budget with our rug-making team.</p><a href="/catalog">Explore the collection</a>');

  writeRoute('/project-gallery', renderHead({
    routePath: '/project-gallery',
    title: 'Custom Rug Projects',
    description: 'Explore completed custom rug projects and handcrafted rugs in residential and commercial interiors.',
  }), '<h1>Custom Rug Projects</h1><p>See handcrafted rugs made for real residential and commercial spaces.</p><a href="/custom-rug-request">Start your project</a>');

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
    const catalogPayload = await fetchJson(`${API_URL}/api/customer/catalog?limit=60`);
    const rugs = Array.isArray(catalogPayload) ? catalogPayload : catalogPayload.items;
    if (!Array.isArray(rugs)) throw new Error('Catalog API returned an unexpected response shape');
    writeRoute('/catalog', catalogHead, `<h1>Handcrafted Rug Collection</h1><p>Browse made-to-order rugs in wool, silk, cotton, and considered blends.</p><ul>${rugs.map((rug) => `<li><a href="/catalog/${esc(rug.slug || String(rug.id))}">${esc(rug.name)}</a></li>`).join('')}</ul>`);
    for (const rug of rugs) {
      const slug = rug.slug || String(rug.id);
      const description = rug.description
        ?? `${rug.name} — ${rug.material} rug${rug.weave_type ? `, ${rug.weave_type}` : ''}. Custom-made to your exact size.`;
      const productImage = rug.images?.[0]?.image_url || rug.image_url;
      writeRoute(`/catalog/${slug}`, renderHead({
        routePath: `/catalog/${slug}`,
        title: rug.name,
        description,
        image: productImage,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: rug.name,
            description,
            image: absoluteUrl(productImage) ?? undefined,
            material: rug.material,
            url: `${SITE_URL}/catalog/${slug}`,
            brand: { '@type': 'Brand', name: businessName },
            ...(rug.display_price != null ? { offers: {
                '@type': 'Offer',
                price: rug.display_price,
                priceCurrency: rug.base_price_currency || 'INR',
                availability: rug.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                url: `${SITE_URL}/catalog/${slug}`,
              } } : {}),
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
      }), `<article><nav><a href="/">Home</a> &gt; <a href="/catalog">Collection</a></nav><h1>${esc(rug.name)}</h1>${productImage ? `<img src="${esc(absoluteUrl(productImage))}" alt="${esc(rug.name)}">` : ''}<p>${esc(description)}</p><dl><dt>Material</dt><dd>${esc(rug.material || '')}</dd>${rug.weave_type ? `<dt>Weave</dt><dd>${esc(rug.weave_type)}</dd>` : ''}</dl><a href="/custom-rug-request">Request this rug in your size</a></article>`);
    }
    console.log(`  (${rugs.length} rug detail page(s) prerendered)`);
  } catch (err) {
    console.warn(`  ! Could not reach API at ${API_URL} for /catalog/:id pages (${err.message}). Skipping.`);
    if (REQUIRE_API) throw new Error(`Required product prerender failed: ${err.message}`);
  }

  try {
    const projects = await fetchJson(`${API_URL}/api/customer/gallery-items`);
    if (!Array.isArray(projects)) throw new Error('Project gallery API returned an unexpected response shape');
    writeRoute('/project-gallery', renderHead({
      routePath: '/project-gallery',
      title: 'Custom Rug Projects',
      description: 'Explore completed custom rug projects and handcrafted rugs in residential and commercial interiors.',
    }), `<h1>Custom Rug Projects</h1><p>See handcrafted rugs made for real residential and commercial spaces.</p><ul>${projects.map((project) => `<li><a href="/project-gallery/${project.id}">${esc(project.caption || `Custom rug project ${project.id}`)}</a></li>`).join('')}</ul>`);

    for (const summary of projects) {
      const project = await fetchJson(`${API_URL}/api/customer/gallery-items/${summary.id}`);
      const title = project.caption || `Custom Rug Project ${project.id}`;
      const description = project.description || 'A completed made-to-order rug project in its finished interior.';
      writeRoute(`/project-gallery/${project.id}`, renderHead({
        routePath: `/project-gallery/${project.id}`,
        title,
        description,
        image: project.image_url,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'ImageObject',
          name: title,
          description,
          contentUrl: absoluteUrl(project.image_url),
          creator: { '@type': 'Organization', name: businessName },
        },
      }), `<article><nav><a href="/">Home</a> &gt; <a href="/project-gallery">Project Gallery</a></nav><h1>${esc(title)}</h1><img src="${esc(absoluteUrl(project.image_url))}" alt="${esc(title)}"><p>${esc(description)}</p><a href="/custom-rug-request">Start a custom rug project</a></article>`);
    }
    console.log(`  (${projects.length} project detail page(s) prerendered)`);
  } catch (err) {
    console.warn(`  ! Could not prerender project pages (${err.message}).`);
    if (REQUIRE_API) throw new Error(`Required project prerender failed: ${err.message}`);
  }

  console.log('Prerender complete.');
}

main().catch((err) => {
  console.error('Prerender failed:', err);
  // Local builds may proceed without the API. Production sets
  // REQUIRE_PRERENDER_API=true so broken product metadata blocks deployment.
  process.exitCode = REQUIRE_API ? 1 : 0;
});
