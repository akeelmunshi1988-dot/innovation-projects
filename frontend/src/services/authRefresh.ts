import axios from 'axios';

// Shared by both the staff and customer auth contexts (and the staff api.ts
// response interceptor) — the refresh_token httpOnly cookie isn't scoped to
// either one, so a single POST /api/auth/refresh works for whichever session
// is active. Dedupes concurrent calls behind one in-flight promise so a burst
// of parallel 401s (or both contexts mounting at once) doesn't fire multiple
// refresh requests, each of which would rotate the cookie and invalidate the
// others.
let inFlight: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (!inFlight) {
    inFlight = axios
      .post('/api/auth/refresh', {}, { withCredentials: true })
      .then(({ data }) => data.access_token as string)
      .catch(() => null)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}
