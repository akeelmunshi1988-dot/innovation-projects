export const NAV = [
  { path: '/', label: 'Home' },
  { path: '/catalog', label: 'Collection' },
  { path: '/custom-rug-request', label: 'Create Your Bespoke Rug' },
  { path: '/about', label: 'About Us' },
];

// Mega menu shown on hovering "Collection" — mirrors the same Space/Mood/Material
// facets used on the homepage tabs and the catalog page's own filter pills.
export const MEGA_MENU = {
  space: {
    heading: 'Shop by Space',
    links: [
      { label: 'Living Room', to: '/collections/space/living_room' },
      { label: 'Bedroom', to: '/collections/space/bedroom' },
      { label: 'Dining Room', to: '/collections/space/dining_room' },
      { label: 'Entryway', to: '/collections/space/entryway' },
    ],
  },
  mood: {
    heading: 'Shop by Mood',
    links: [
      { label: 'Warm & Earthy', to: '/collections/mood/warm_earthy' },
      { label: 'Quiet Luxury', to: '/collections/mood/quiet_luxury' },
      { label: 'Modern Minimal', to: '/collections/mood/modern_minimal' },
      { label: 'Bohemian', to: '/collections/mood/bohemian' },
      { label: 'Bold & Artistic', to: '/collections/mood/bold_artistic' },
      { label: 'Timeless Traditional', to: '/collections/mood/timeless_traditional' },
    ],
  },
  material: {
    heading: 'Shop by Material',
    links: [
      { label: 'Wool', to: '/collections/material/wool' },
      { label: 'Silk', to: '/collections/material/silk' },
      { label: 'Cotton', to: '/collections/material/cotton' },
      { label: 'Synthetic', to: '/collections/material/synthetic' },
    ],
  },
  weave: {
    heading: 'Shop by Weave Type',
    links: [
      { label: 'Hand Knotted', to: '/weaves/hand-knotted' },
      { label: 'Hand Tufted', to: '/weaves/hand-tufted' },
      { label: 'Flatweave', to: '/weaves/flatweave' },
      { label: 'Machine Woven', to: '/weaves/machine-woven' },
    ],
  },
  quick: {
    heading: 'Quick Links',
    links: [
      { label: 'All Rugs', to: '/catalog' },
      { label: 'Create Your Bespoke Rug', to: '/custom-rug-request' },
    ],
  },
};

