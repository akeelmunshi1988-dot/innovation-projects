import data from './landingPages.json';

export interface LandingPageContent {
  path: string;
  seoTitle: string;
  description: string;
  eyebrow: string;
  title: string;
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
  faq: { q: string; a: string }[];
  rugSearch?: string;
  rugsHeading?: string;
  cta: { to: string; label: string };
  links?: { to: string; label: string }[];
}

export const LANDING_PAGES = data.pages as LandingPageContent[];
