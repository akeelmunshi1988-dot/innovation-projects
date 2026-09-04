/**
 * Shared shape + default copy for the public /about page.
 *
 * The admin "About Page" editor seeds its form from `ABOUT_PAGE_DEFAULTS` and
 * saves the whole structure to `tenant.about_page` (JSON). `AboutUs.tsx` renders
 * `mergeAboutPage(settings.about_page)` so any missing section or field silently
 * falls back to the copy below — the page can never render blank.
 *
 * `{business}` in any text field is replaced with the tenant's business name at
 * render time.
 */

export interface AboutHero {
  enabled: boolean;
  eyebrow: string;
  heading: string;
  body: string;
  cta_label: string;
  image_url: string;
  image_alt: string;
}

export interface AboutCredentialItem {
  title: string;
  subtitle: string;
}

export interface AboutCredentials {
  enabled: boolean;
  items: AboutCredentialItem[];
}

export interface AboutStory {
  enabled: boolean;
  eyebrow: string;
  heading: string;
  quote: string;
  // The body copy is edited separately as the rich-text "About Us Content"
  // field (tenant.about_us_content_html).
}

export interface AboutProcessStep {
  number: string;
  title: string;
  text: string;
}

export interface AboutProcess {
  enabled: boolean;
  eyebrow: string;
  heading: string;
  intro: string;
  steps: AboutProcessStep[];
}

export interface AboutPrincipleItem {
  icon: string;
  title: string;
  text: string;
}

export interface AboutPrinciples {
  enabled: boolean;
  eyebrow: string;
  heading: string;
  intro: string;
  items: AboutPrincipleItem[];
}

export interface AboutFounder {
  enabled: boolean;
  eyebrow: string;
  heading: string;
  body: string;
  name: string;
  role: string;
  caption: string;
  image_url: string;
  image_alt: string;
}

export interface AboutCta {
  enabled: boolean;
  eyebrow: string;
  heading: string;
  body: string;
  primary_label: string;
  secondary_label: string;
}

export interface AboutPageContent {
  hero: AboutHero;
  credentials: AboutCredentials;
  story: AboutStory;
  process: AboutProcess;
  principles: AboutPrinciples;
  founder: AboutFounder;
  cta: AboutCta;
}

/** Icon choices for the Principles cards — value stored, label shown in admin. */
export const ABOUT_PRINCIPLE_ICONS: [string, string][] = [
  ['hand', 'Hand / Artisan'],
  ['ruler', 'Ruler / Made to measure'],
  ['leaf', 'Leaf / Materials'],
  ['shield-check', 'Shield / Inspected'],
  ['gem', 'Gem / Premium'],
  ['sparkles', 'Sparkles / Craft'],
  ['clock', 'Clock / Time'],
  ['scissors', 'Scissors / Workshop'],
];

export const ABOUT_PAGE_DEFAULTS: AboutPageContent = {
  hero: {
    enabled: true,
    eyebrow: 'The story behind every thread',
    heading: 'Rugs with a sense\nof place and permanence.',
    body: 'At {business}, traditional rug making meets a more personal way of living. We create made-to-measure pieces with depth, restraint and the unmistakable character of work shaped by hand.',
    cta_label: 'Begin a custom rug',
    image_url: '/about-rug-living-room.png',
    image_alt: 'Handcrafted rug in a warm, natural living room',
  },
  credentials: {
    enabled: true,
    items: [
      { title: 'Made individually', subtitle: 'Never pulled from a production line' },
      { title: 'Sized for your space', subtitle: 'Proportion considered from the start' },
      { title: 'Reviewed by hand', subtitle: 'Quality checked before dispatch' },
    ],
  },
  story: {
    enabled: true,
    eyebrow: 'Our point of view',
    heading: 'Made slowly.\nLived with fully.',
    quote: '“Luxury is not excess. It is the time, judgement and human touch held within an object.”',
  },
  process: {
    enabled: true,
    eyebrow: 'The making of a rug',
    heading: 'From an idea on paper\nto a surface underfoot.',
    intro: 'A made-to-order rug passes through many hands. Each stage is deliberate, and each one leaves a quiet trace in the finished piece.',
    steps: [
      { number: '01', title: 'A considered beginning', text: 'Every rug begins with the room: its proportions, light, movement and atmosphere. We refine the scale, palette and construction before a single thread reaches the loom.' },
      { number: '02', title: 'Material selection', text: 'Fibres are chosen for both beauty and purpose—from resilient wool and relaxed cotton to luminous silk and performance-led blends.' },
      { number: '03', title: 'Made at the loom', text: 'Skilled hands translate the design knot by knot, line by line. This unhurried process gives each surface its depth, character and quiet individuality.' },
      { number: '04', title: 'Finished by hand', text: 'The rug is washed, stretched, carved where required and carefully inspected. Edges, pile, colour and dimensions are reviewed before dispatch.' },
    ],
  },
  principles: {
    enabled: true,
    eyebrow: 'What matters to us',
    heading: 'Beauty begins with integrity.',
    intro: 'The qualities you feel in a finished rug are the result of decisions made long before it enters a room—who makes it, what it is made from, and how carefully it is finished.',
    items: [
      { icon: 'hand', title: 'Artisan made', text: 'Human skill remains at the centre of every piece, from yarn preparation to final finishing.' },
      { icon: 'ruler', title: 'Made to measure', text: 'Proportion is part of the design. Every rug can be tailored to the dimensions of its setting.' },
      { icon: 'leaf', title: 'Thoughtful materials', text: 'We select fibres for longevity, tactility and the way they will live in your home.' },
      { icon: 'shield-check', title: 'Inspected individually', text: 'Each finished rug is reviewed by hand against the approved specification before it leaves us.' },
    ],
  },
  founder: {
    enabled: true,
    eyebrow: 'A note from the founder',
    heading: 'Craft is a responsibility.',
    body: 'For more than two decades, Haris Ahmed has worked alongside makers who understand that excellence is rarely one grand gesture. It is hundreds of small decisions, repeated with patience and care.\n\n{business} was founded to bring that standard directly to the people who will live with these rugs—to make the process more transparent, more personal and more faithful to the hands behind the work.',
    name: 'Haris Ahmed',
    role: 'Founder',
    caption: 'A culture of care and precision',
    image_url: '',
    image_alt: 'Inside the rug workshop',
  },
  cta: {
    enabled: true,
    eyebrow: 'Let us make something lasting',
    heading: 'Your room is the beginning of the design.',
    body: 'Share your dimensions, references and ideas. We will help you consider scale, material, colour and construction before your rug reaches the loom.',
    primary_label: 'Request a custom rug',
    secondary_label: 'Explore the collection',
  },
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** Merge a stored (possibly null / partial) `about_page` over the defaults. */
export function mergeAboutPage(stored: DeepPartial<AboutPageContent> | null | undefined): AboutPageContent {
  const s = stored ?? {};
  const list = <T,>(value: unknown, fallback: T[]): T[] => (Array.isArray(value) ? (value as T[]) : fallback);
  return {
    hero: { ...ABOUT_PAGE_DEFAULTS.hero, ...(s.hero ?? {}) },
    credentials: {
      ...ABOUT_PAGE_DEFAULTS.credentials,
      ...(s.credentials ?? {}),
      items: list(s.credentials?.items, ABOUT_PAGE_DEFAULTS.credentials.items),
    },
    story: { ...ABOUT_PAGE_DEFAULTS.story, ...(s.story ?? {}) },
    process: {
      ...ABOUT_PAGE_DEFAULTS.process,
      ...(s.process ?? {}),
      steps: list(s.process?.steps, ABOUT_PAGE_DEFAULTS.process.steps),
    },
    principles: {
      ...ABOUT_PAGE_DEFAULTS.principles,
      ...(s.principles ?? {}),
      items: list(s.principles?.items, ABOUT_PAGE_DEFAULTS.principles.items),
    },
    founder: { ...ABOUT_PAGE_DEFAULTS.founder, ...(s.founder ?? {}) },
    cta: { ...ABOUT_PAGE_DEFAULTS.cta, ...(s.cta ?? {}) },
  };
}
