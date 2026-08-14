# Temporary access gate (India blocked unless keyed) — dreamrugscreation.in

Blocks visitors browsing from India — across the whole site, storefront pages
**and** `/api/*` — unless they hold a shared secret key. Everyone outside
India reaches the site freely, no key needed. Meant to be temporary, e.g. for
testing with your own India-based team before a market launch there.

## Prerequisite

Cloudflare has to actually be in front of the domain (DNS proxied through
Cloudflare — the orange cloud, not just using Cloudflare as a registrar). If
`dreamrugscreation.in` isn't on Cloudflare yet, do that first (see
`DEPLOYMENT.md` Phase 13 for the nameserver-switch steps) — a Worker can't
intercept traffic that never passes through Cloudflare's network.

## Deploy the Worker

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Create Worker**.
2. Name it something like `drc-access-gate`, then **Deploy** the default template.
3. **Edit code** → replace everything with the contents of
   [`access-gate-worker.js`](access-gate-worker.js) in this folder.
4. Generate a real secret and paste it in place of
   `REPLACE_WITH_A_LONG_RANDOM_SECRET`:
   ```bash
   openssl rand -hex 24
   ```
   (Don't commit the real key to git — this repo file should keep the
   placeholder. Keep the actual value somewhere private, e.g. a password
   manager, and paste it directly into the Worker's code in the dashboard.)
5. **Save and deploy**.
6. Go to the Worker's **Settings → Triggers → Routes → Add route**, and add
   both:
   - `dreamrugscreation.in/*`
   - `www.dreamrugscreation.in/*`

   This is what actually makes it run in front of every request to the site —
   creating the Worker alone does nothing until a route points traffic at it.

## Using it

Visitors outside India need nothing — the site just works normally for them.

Share this link with India-based testers who need access:
```
https://dreamrugscreation.in/?key=YOUR_SECRET_KEY_HERE
```
First load with a valid `?key=` sets a 30-day cookie, so after that the
`?key=` doesn't need to stay in the URL — normal browsing, and every API call
the frontend makes on its own, keeps working. Any India-based visitor without
a valid key (or with the wrong one) gets a plain 403.

Cookie expires after 30 days of no fresh visit with the key — share the link
again if that happens.

## Removing it (before real launch)

Dashboard → **Workers & Pages** → the Worker → **Settings → Triggers →
Routes** → delete both routes. The Worker stops intercepting traffic
immediately; no redeploy needed. (Leaving the Worker itself around unused is
harmless — routes are what matter.)

## Heads up

Because only India is gated, crawlers and real visitors from everywhere else
(including Googlebot, Bing, and social link-preview bots, which mostly crawl
from outside India) reach the site normally — the SEO/prerendering work from
earlier keeps working. The one thing to know: any India-based person who
finds the site organically (search, a shared link without `?key=`, etc.)
will hit the 403 instead of your storefront, so this isn't something to
leave running once you actually want Indian customers to reach the site.
