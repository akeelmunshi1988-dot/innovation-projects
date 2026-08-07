import React, { useEffect, useState } from 'react';
import axios from 'axios';

type Provider = 'google' | 'facebook' | 'linkedin';

const LABELS: Record<Provider, string> = {
  google: 'Google',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

function ProviderIcon({ provider }: { provider: Provider }) {
  if (provider === 'google') {
    return (
      <svg width="15" height="15" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.85.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z" />
        <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33Z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
      </svg>
    );
  }
  if (provider === 'facebook') {
    return (
      <svg width="15" height="15" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#1877F2" d="M18 9a9 9 0 1 0-10.4 8.9v-6.3H5.3V9h2.3V7c0-2.28 1.36-3.54 3.44-3.54.99 0 2.03.18 2.03.18v2.24h-1.14c-1.13 0-1.48.7-1.48 1.42V9h2.52l-.4 2.6h-2.12v6.3A9 9 0 0 0 18 9Z" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#0A66C2" d="M16.7 0H1.3C.58 0 0 .56 0 1.26v15.48C0 17.44.58 18 1.3 18h15.4c.72 0 1.3-.56 1.3-1.26V1.26C18 .56 17.42 0 16.7 0ZM5.34 15.34H2.68V6.75h2.66v8.59ZM4 5.6a1.54 1.54 0 1 1 0-3.08 1.54 1.54 0 0 1 0 3.08Zm11.34 9.74h-2.66v-4.18c0-1-.02-2.28-1.39-2.28-1.4 0-1.61 1.09-1.61 2.21v4.25H7.02V6.75h2.55v1.17h.04c.36-.67 1.22-1.39 2.52-1.39 2.7 0 3.2 1.78 3.2 4.09v4.72Z" />
    </svg>
  );
}

interface SocialLoginButtonsProps {
  returnTo?: string;
  label?: string;
}

export default function SocialLoginButtons({ returnTo, label = 'Sign in with' }: SocialLoginButtonsProps) {
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    axios.get('/api/auth/customer/oauth/providers')
      .then(({ data }) => setProviders(data.providers ?? []))
      .catch(() => setProviders([]));
  }, []);

  if (providers.length === 0) return null;

  const path = returnTo ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-stone-200" />
        <span className="text-stone-400 text-xs uppercase tracking-wider">{label}</span>
        <div className="flex-1 h-px bg-stone-200" />
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${providers.length}, 1fr)` }}>
        {providers.map((provider) => (
          <a
            key={provider}
            href={`/api/auth/customer/oauth/${provider}/start?return_to=${encodeURIComponent(path)}`}
            className="flex items-center justify-center gap-2 border border-stone-200 hover:border-stone-400 px-3 py-2.5 text-stone-700 text-xs font-medium transition-colors"
          >
            <ProviderIcon provider={provider} />
            {providers.length === 1 ? LABELS[provider] : ''}
          </a>
        ))}
      </div>
    </div>
  );
}
