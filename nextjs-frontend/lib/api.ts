import type { CatalogResponse, CatalogRug, PublicSettings } from './types';

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dreamrugscreation.in';
const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

async function api<T>(path: string, revalidate = 120): Promise<T> {
  const response = await fetch(`${backendUrl}${path}`, { next: { revalidate } });
  if (!response.ok) throw new Error(`API ${response.status}: ${path}`);
  return response.json() as Promise<T>;
}

export const absoluteMediaUrl = (value?: string | null) => {
  if (!value) return '';
  if (/^https?:\/\//.test(value)) return value;
  return `${siteUrl}${value.startsWith('/') ? '' : '/'}${value}`;
};

export async function getSettings() {
  try { return await api<PublicSettings>('/api/customer/settings', 300); }
  catch { return {} as PublicSettings; }
}

export async function getCatalog(params: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value !== undefined && query.set(key, String(value)));
  try { return await api<CatalogResponse>(`/api/customer/catalog?${query}`, 60); }
  catch { return { items: [], total: 0, has_more: false }; }
}

export async function getRug(slug: string) {
  return api<CatalogRug>(`/api/customer/catalog/${encodeURIComponent(slug)}`, 60);
}
