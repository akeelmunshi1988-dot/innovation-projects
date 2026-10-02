import content from './collectionContent.json';

export interface CollectionFaq {
  q: string;
  a: string;
}

export interface CategoryDetails {
  name: string;
  seoTitle: string;
  seoDescription: string;
  eyebrow: string;
  intro: string;
  story: string;
  bestFor: string;
  character: string;
  making: string;
  care: string;
  faq?: CollectionFaq[];
}

export type CollectionFacet = 'weave' | 'space' | 'mood' | 'material';

const PAGES = content.pages as Record<string, CategoryDetails>;
const ALIASES = content.aliases as Record<string, string>;

// Database values arrive in any spelling ("Hand-Knotted", "living_room",
// "Wool & Silk") — normalise to the content keys. Mirrored in
// scripts/prerender.js and backend/app/main.py (_collection_slug_key).
export function slugKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Copy for a collection landing page. `indexable` is false for aliases (which
 * borrow another page's copy) and values with no written copy, so near-duplicate
 * pages are kept out of search results.
 */
export function findCollectionContent(facet: CollectionFacet, value: string): { details: CategoryDetails; indexable: boolean } | null {
  const key = `${facet}/${slugKey(value)}`;
  if (PAGES[key]) return { details: PAGES[key], indexable: true };
  const alias = ALIASES[key];
  return alias && PAGES[alias] ? { details: PAGES[alias], indexable: false } : null;
}
