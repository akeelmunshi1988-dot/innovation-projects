import { useCallback, useEffect, useRef, useState } from 'react';
import { getPublicSettings } from '../services/api';

// Bot checks for public forms — pairs with backend/app/core/bot_protection.py.
//
//   const bot = useBotProtection();
//   <form>{bot.fields} ...</form>
//   await axios.post(url, body, { headers: await bot.headers() });
//
// `fields` renders a hidden honeypot input plus, when the backend has a
// Turnstile key configured, Cloudflare's (usually invisible) human check.

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let siteKeyPromise: Promise<string | null> | null = null;
let scriptPromise: Promise<void> | null = null;

function loadSiteKey(): Promise<string | null> {
  siteKeyPromise ??= getPublicSettings()
    .then((s) => s.turnstile_site_key ?? null)
    .catch(() => null);
  return siteKeyPromise;
}

function loadTurnstileScript(): Promise<void> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { scriptPromise = null; reject(new Error('Turnstile failed to load')); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function useBotProtection() {
  const trapRef = useRef<HTMLInputElement>(null);
  // Callback-ref state so the widget renders whenever its container mounts — forms inside modals mount late.
  const [widgetEl, setWidgetEl] = useState<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const enabledRef = useRef(false);
  const tokenRef = useRef('');
  const waitersRef = useRef<((token: string) => void)[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadSiteKey().then(async (siteKey) => {
      if (!siteKey || cancelled) return;
      enabledRef.current = true;
      if (!widgetEl) return;
      await loadTurnstileScript();
      if (cancelled || !window.turnstile) return;
      tokenRef.current = '';
      widgetIdRef.current = window.turnstile.render(widgetEl, {
        sitekey: siteKey,
        appearance: 'interaction-only',
        callback: (t: string) => {
          const waiter = waitersRef.current.shift();
          if (waiter) waiter(t);
          else tokenRef.current = t;
        },
        'expired-callback': () => { tokenRef.current = ''; },
        'error-callback': () => { tokenRef.current = ''; },
      });
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [widgetEl]);

  // Headers for one protected request. Turnstile tokens are single-use, so this
  // consumes the current token (waiting briefly for one if the check is still
  // running) and starts a fresh check for the next submission.
  const headers = useCallback(async (): Promise<Record<string, string>> => {
    const h: Record<string, string> = {};
    const trap = trapRef.current?.value ?? '';
    if (trap) h['X-Form-Trap'] = trap;
    if (!enabledRef.current) return h;

    let token = tokenRef.current;
    tokenRef.current = '';
    if (!token) {
      token = await new Promise<string>((resolve) => {
        const waiter = (t: string) => { clearTimeout(timer); resolve(t); };
        const timer = setTimeout(() => {
          waitersRef.current = waitersRef.current.filter((w) => w !== waiter);
          resolve('');
        }, 15000);
        waitersRef.current.push(waiter);
      });
    }
    if (token) {
      h['X-Turnstile-Token'] = token;
      if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
    }
    return h;
  }, []);

  const fields = (
    <>
      <input
        ref={trapRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <div ref={setWidgetEl} className="empty:hidden" />
    </>
  );

  return { fields, headers };
}
