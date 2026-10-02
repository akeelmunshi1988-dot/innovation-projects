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
const DIST = process.env.PRERENDER_DIST || path.join(__dirname, '..', 'dist');
const SITE_NAME = 'DreamRugsCreation';
const SITE_URL = (process.env.SITE_URL || 'https://dreamrugscreation.com').replace(/\/$/, '');
// Only needed to look up rug names/descriptions/images for /catalog/:id and the
// business name for /about — points at the backend API, not the frontend.
const API_URL = (process.env.PRERENDER_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const REQUIRE_API = process.env.REQUIRE_PRERENDER_API === 'true';

const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8');
const collectionContent = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'collectionContent.json'), 'utf-8'));

// Mirrors slugKey/findCollectionContent in src/data/collectionContent.ts.
function slugKey(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function findCollectionContent(facet, value) {
  const key = `${facet}/${slugKey(value)}`;
  if (collectionContent.pages[key]) return { details: collectionContent.pages[key], indexable: true };
  const alias = collectionContent.aliases[key];
  return alias && collectionContent.pages[alias] ? { details: collectionContent.pages[alias], indexable: false } : null;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function absoluteUrl(url) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Search results truncate descriptions around 155-160 characters; cut at a word
// boundary (mirrors clampDescription in src/components/SEO.tsx).
function clampDescription(text, max = 160) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > 80 ? space : cut.length).replace(/[\s,;:—-]+$/, '')}…`;
}

// Share previews need an image; pages without their own fall back to the hero.
let defaultImage = null;

function renderHead({ title, description: rawDescription, routePath, image, jsonLd, noindex }) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const description = clampDescription(rawDescription);
  const url = `${SITE_URL}${routePath}`;
  const absImage = absoluteUrl(image || defaultImage);

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
    // routePath is URL-encoded (it's also the canonical URL); nginx matches
    // try_files against the *decoded* $uri, so the file name must be decoded.
    const outFile = path.join(DIST, `${decodeURIComponent(routePath).replace(/^\//, '')}.html`);
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
  defaultImage = heroImage;
  const socialProfiles = Object.values(settings?.social_links || {}).filter(Boolean);

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
    ...(settings?.contact_address ? { address: { '@type': 'PostalAddress', streetAddress: settings.contact_address, addressCountry: 'IN' } } : {}),
    ...(socialProfiles.length ? { sameAs: socialProfiles } : {}),
  };

  // Lets Google show the business name (not the bare domain) as the site name in results.
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: businessName,
    url: `${SITE_URL}/`,
  };

  // Title/description mirror HOME_SEO_TITLE / HOME_SEO_DESCRIPTION in src/pages/CustomerHome.tsx.
  writeRoute('/', renderHead({
    routePath: '/',
    title: 'Handmade Rugs & Carpets from India',
    description: 'Hand-knotted and hand-tufted wool and silk rugs, woven in Bhadohi, India and made to your exact size and design. Custom carpets, shipped worldwide.',
    image: heroImage,
    jsonLd: [websiteJsonLd, organizationJsonLd],
  }), '<h1>Handmade Rugs &amp; Carpets from India, Made to Order</h1><p>Hand-knotted and hand-tufted wool and silk rugs, woven by master weavers in Bhadohi, India and made to your exact size, material and design. Custom carpets shipped worldwide.</p><nav><a href="/catalog">Explore the rug collection</a> <a href="/weaves/Hand-Knotted">Hand-knotted rugs</a> <a href="/custom-rug-request">Request a custom rug</a> <a href="/guides">Rug buying guides</a> <a href="/about">About our workshop</a></nav>');

  writeRoute('/about', renderHead({
    routePath: '/about',
    title: `About ${businessName}`,
    description: `Learn about ${businessName}'s craftsmanship, workshop, and the master weavers behind every handmade custom rug.`,
    image: settings?.about_page?.hero?.image_url,
  }), `<h1>About ${esc(businessName)}</h1><p>Discover our craftsmanship, workshop, materials, and the master weavers behind every handmade custom rug.</p><a href="/custom-rug-request">Begin a custom rug</a>`);

  const catalogHead = renderHead({
    routePath: '/catalog',
    title: 'Handmade Rugs & Carpets: Full Collection',
    description: 'Browse handmade rugs and carpets from India: hand-knotted, hand-tufted and flatweave designs in wool and silk. Every rug made to order in custom sizes.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Catalog', item: `${SITE_URL}/catalog` },
      ],
    },
  });
  writeRoute('/catalog', catalogHead, '<h1>Handmade Rugs &amp; Carpets</h1><p>Browse made-to-order hand-knotted, hand-tufted and flatweave rugs in wool, silk and natural fibres, handmade in India.</p>');

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
    noindex: true,
  }));

  // Static content pages — titles/descriptions mirror each page's <SEO> props.
  // [route, title, meta description, extra body copy for crawlers]
  const staticPages = [
    ['/colour-matching', 'Colour Matching', 'Plan your bespoke rug colour with reference codes, swatches and yarn samples.',
      'Match your handmade rug or carpet to your interior using Pantone or paint references, fabric swatches or yarn samples. Colours are confirmed with you before weaving starts.'],
    ['/rug-size-guide', 'Rug Size Guide', 'Explore rug placement for living rooms, dining rooms and bedrooms.',
      'Find the right rug or carpet size for your living room, dining room or bedroom. Every rug is made to order, so it can be woven to your exact measurements.'],
    ['/trade-enquiry', 'Trade Enquiry', 'Discuss a rug project with our studio: design, materials, sizes and production requirements.',
      'Interior designers, architects, hotels and retailers can commission handmade rugs and carpets from our workshop in Bhadohi, India, in custom designs, sizes and quantities, shipped worldwide.'],
    ['/order-tracking', 'Order Tracking', 'Find your rug order and follow the dispatch information shared with you.', ''],
    ['/refund-cancellation-policy', 'Refund & Cancellation Policy', 'Read our refund and order cancellation policy.', ''],
    ['/privacy-policy', 'Privacy Policy', 'Learn how we collect, use, store, and protect customer information.', ''],
  ];
  for (const [routePath, title, description, extra] of staticPages) {
    writeRoute(routePath, renderHead({ routePath, title, description }), `<h1>${esc(title)}</h1><p>${esc(description)}</p>${extra ? `<p>${esc(extra)}</p>` : ''}`);
  }

  // Buying guides — copy lives in src/data/guides.json (also read by GuidePage.tsx).
  const { guides } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'guides.json'), 'utf-8'));
  writeRoute('/guides', renderHead({
    routePath: '/guides',
    title: 'Rug & Carpet Buying Guides',
    description: 'Practical guides to buying handmade rugs and carpets: weaves, materials, custom sizes, care, and rug making in Bhadohi, India.',
  }), `<h1>Rug &amp; Carpet Buying Guides</h1><ul>${guides.map((g) => `<li><a href="/guides/${esc(g.slug)}">${esc(g.title)}</a><p>${esc(g.description)}</p></li>`).join('')}</ul>`);
  for (const guide of guides) {
    const routePath = `/guides/${guide.slug}`;
    writeRoute(routePath, renderHead({
      routePath,
      title: guide.seoTitle,
      description: guide.description,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: guide.title,
          description: guide.description,
          datePublished: guide.datePublished,
          mainEntityOfPage: `${SITE_URL}${routePath}`,
          author: { '@type': 'Organization', name: businessName },
          publisher: { '@type': 'Organization', name: businessName },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Rug Guides', item: `${SITE_URL}/guides` },
            { '@type': 'ListItem', position: 3, name: guide.title, item: `${SITE_URL}${routePath}` },
          ],
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: guide.faq.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
        },
      ],
    }), `<article><nav><a href="/">Home</a> &gt; <a href="/guides">Rug Guides</a></nav><h1>${esc(guide.title)}</h1><p>${esc(guide.intro)}</p>${guide.sections.map((sec) => `<h2>${esc(sec.heading)}</h2>${sec.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}`).join('')}<h2>Frequently asked questions</h2>${guide.faq.map((item) => `<h3>${esc(item.q)}</h3><p>${esc(item.a)}</p>`).join('')}${guide.related.map((l) => `<a href="${esc(l.to)}">${esc(l.label)}</a>`).join(' ')}</article>`);
  }

  // Collection landing pages (/collections/<facet>/<value>, /weaves/<weave>) —
  // the same URLs the storefront mega-menu links to (see collectionMenu in
  // src/data/storefrontMenu.ts) and the backend sitemap lists.
  try {
    const menu = await fetchJson(`${API_URL}/api/customer/menu-options`);
    const pretty = (value) => value.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const collectionPages = [
      ...(menu.spaces || []).map((v) => [`/collections/space/${encodeURIComponent(v)}`, 'space', v]),
      ...(menu.moods || []).map((v) => [`/collections/mood/${encodeURIComponent(v)}`, 'mood', v]),
      ...(menu.materials || []).map((v) => [`/collections/material/${encodeURIComponent(v)}`, 'material', v]),
      ...(menu.weaves || []).map((v) => [`/weaves/${encodeURIComponent(v)}`, 'weave', v]),
    ];
    for (const [routePath, facet, value] of collectionPages) {
      // Same copy and noindex rule as WeaveTypePage.tsx.
      const found = findCollectionContent(facet, value);
      const name = found?.indexable ? found.details.name : pretty(value);
      const details = found?.details;
      const title = found?.indexable ? details.seoTitle : `${name} Rugs`;
      const description = found?.indexable
        ? details.seoDescription
        : `Explore our ${name.toLowerCase()} rugs, handmade to order in custom sizes.`;
      const faq = found?.indexable ? details.faq || [] : [];
      const body = details
        ? `<p>${esc(details.intro)}</p><h2>${esc(details.eyebrow)}</h2><p>${esc(details.story)}</p><dl><dt>Best suited to</dt><dd>${esc(details.bestFor)}</dd><dt>Typical making time</dt><dd>${esc(details.making)}</dd><dt>Everyday care</dt><dd>${esc(details.care)}</dd></dl>`
        : `<p>${esc(description)}</p>`;
      const faqHtml = faq.length
        ? `<h2>${esc(name)} Rugs: FAQ</h2>${faq.map((item) => `<h3>${esc(item.q)}</h3><p>${esc(item.a)}</p>`).join('')}`
        : '';
      writeRoute(routePath, renderHead({
        routePath,
        title,
        description,
        noindex: !found?.indexable,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
              { '@type': 'ListItem', position: 2, name: 'Collection', item: `${SITE_URL}/catalog` },
              { '@type': 'ListItem', position: 3, name: `${name} Rugs`, item: `${SITE_URL}${routePath}` },
            ],
          },
          ...(faq.length ? [{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
          }] : []),
        ],
      }), `<h1>${esc(name)} Rugs</h1>${body}${faqHtml}<a href="/catalog">Browse the full rug collection</a> <a href="/guides">Rug buying guides</a>`);
    }
    console.log(`  (${collectionPages.length} collection page(s) prerendered)`);
  } catch (err) {
    console.warn(`  ! Could not prerender collection pages (${err.message}).`);
    if (REQUIRE_API) throw new Error(`Required collection prerender failed: ${err.message}`);
  }

  // /catalog/:id needs live rug data from the backend API. If it's unreachable at
  // build time (e.g. a local build with no backend running), skip it rather than
  // failing the whole frontend build — the SPA still works fine for users, it just
  // won't have baked-in meta for these routes until the next build with the API
  // reachable.
  try {
    // The catalog API caps limit at 60 — page through with has_more so every rug
    // gets its own prerendered page however large the catalog grows.
    const rugs = [];
    for (let offset = 0; ; offset += 60) {
      const page = await fetchJson(`${API_URL}/api/customer/catalog?limit=60&offset=${offset}`);
      const items = Array.isArray(page) ? page : page.items;
      if (!Array.isArray(items)) throw new Error('Catalog API returned an unexpected response shape');
      rugs.push(...items);
      if (Array.isArray(page) || !page.has_more || items.length === 0) break;
    }
    writeRoute('/catalog', catalogHead, `<h1>Handmade Rugs &amp; Carpets</h1><p>Browse made-to-order hand-knotted, hand-tufted and flatweave rugs in wool, silk and natural fibres, handmade in India.</p><ul>${rugs.map((rug) => `<li><a href="/catalog/${esc(rug.slug || String(rug.id))}">${esc(rug.name)}</a></li>`).join('')}</ul>`);
    for (const rug of rugs) {
      const slug = rug.slug || String(rug.id);
      // Mirrors the <SEO> title/description in CustomerRugDetail.tsx.
      const description = rug.description
        ?? `${rug.name}: a ${rug.material} rug${rug.weave_type ? `, ${rug.weave_type}` : ''}, handmade in India and custom-made to your exact size.`;
      const rugTitle = /\b(rug|carpet|dhurrie|runner)s?\b/i.test(rug.name) ? rug.name : `${rug.name} Rug`;
      const productImage = rug.images?.[0]?.image_url || rug.image_url;
      let aggregateRating = null;
      try {
        const reviews = await fetchJson(`${API_URL}/api/customer/catalog/${rug.id}/reviews`);
        if (reviews.review_count > 0) {
          aggregateRating = { '@type': 'AggregateRating', ratingValue: reviews.average_rating, reviewCount: reviews.review_count };
        }
      } catch { /* reviews are optional enrichment */ }
      writeRoute(`/catalog/${slug}`, renderHead({
        routePath: `/catalog/${slug}`,
        title: rugTitle,
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
            countryOfOrigin: 'IN',
            ...(aggregateRating ? { aggregateRating } : {}),
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
      }), `<article><nav><a href="/">Home</a> &gt; <a href="/catalog">Collection</a></nav><h1>${esc(rug.name)}</h1>${productImage ? `<img src="${esc(absoluteUrl(productImage))}" alt="${esc(`${rug.name}, handmade ${rug.material ? `${rug.material} ` : ''}rug`)}">` : ''}<p>${esc(description)}</p><dl><dt>Material</dt><dd>${esc(rug.material || '')}</dd>${rug.weave_type ? `<dt>Weave</dt><dd>${esc(rug.weave_type)}</dd>` : ''}</dl><a href="/custom-rug-request">Request this rug in your size</a></article>`);
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

  // /catalog and /project-gallery are also directories (they hold the per-rug /
  // per-project files). If nginx's try_files ever lacks `$uri.html`, it matches
  // the directory instead and 301s to /catalog/ — give that an index.html with
  // the same content so visitors still land on the right page, not a 403.
  for (const route of ['catalog', 'project-gallery']) {
    const dir = path.join(DIST, route);
    const page = path.join(DIST, `${route}.html`);
    if (fs.existsSync(page) && fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      fs.copyFileSync(page, path.join(dir, 'index.html'));
    }
  }

  console.log('Prerender complete.');
}

main().catch((err) => {
  console.error('Prerender failed:', err);
  // Local builds may proceed without the API. Production sets
  // REQUIRE_PRERENDER_API=true so broken product metadata blocks deployment.
  process.exitCode = REQUIRE_API ? 1 : 0;
});
