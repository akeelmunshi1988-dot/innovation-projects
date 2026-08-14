/**
 * Temporary access gate for dreamrugscreation.in.
 *
 * Blocks visitors browsing from India (Cloudflare's built-in geo-IP,
 * request.cf.country) unless they hold a valid access key — either ?key= in
 * the URL, or the cookie a previous visit with a valid key already set.
 * Everyone outside India passes through freely, no key needed — this only
 * gates India traffic specifically (e.g. your own India-based team testing
 * before a market launch there), it does not restrict anyone else.
 *
 * Share a link like:
 *   https://dreamrugscreation.in/?key=YOUR_SECRET_KEY_HERE
 * First hit with a valid key (from India) sets a 30-day cookie so the browser
 * doesn't need to keep the query param — subsequent page loads and every
 * axios call the frontend makes (which never carry ?key=) still pass because
 * the cookie is present.
 *
 * This is meant to be temporary — see the REMOVING section in
 * CLOUDFLARE_ACCESS_GATE.md for how to take it back out once the site goes
 * live for real.
 */

const ACCESS_KEY = 'REPLACE_WITH_A_LONG_RANDOM_SECRET'; // e.g. output of: openssl rand -hex 24
const COOKIE_NAME = 'drc_access';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

function blockedResponse() {
  return new Response('Not available in your region.', {
    status: 403,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const country = request.cf?.country; // e.g. "IN"
    const keyInUrl = url.searchParams.get('key');
    const hasValidCookie = getCookie(request, COOKIE_NAME) === ACCESS_KEY;

    const hasKey = hasValidCookie || keyInUrl === ACCESS_KEY;
    // Only India is gated — anyone browsing from elsewhere passes through
    // freely regardless of key.
    const allowed = country !== 'IN' || hasKey;

    if (!allowed) {
      return blockedResponse();
    }

    const response = await fetch(request);

    // First time in with a valid key (and not already cookied): set the
    // cookie so later requests — including the frontend's own API calls,
    // which never carry ?key= — keep working without the query param.
    if (keyInUrl === ACCESS_KEY && !hasValidCookie) {
      const newResponse = new Response(response.body, response);
      newResponse.headers.append(
        'Set-Cookie',
        `${COOKIE_NAME}=${ACCESS_KEY}; Max-Age=${COOKIE_MAX_AGE}; Path=/; Secure; HttpOnly; SameSite=Lax`
      );
      return newResponse;
    }

    return response;
  },
};
