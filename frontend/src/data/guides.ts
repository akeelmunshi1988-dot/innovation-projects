import data from './guides.json';

export interface Guide {
  slug: string;
  seoTitle: string;
  title: string;
  description: string;
  datePublished: string;
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
  faq: { q: string; a: string }[];
  related: { to: string; label: string }[];
}

export const GUIDES = data.guides as Guide[];
