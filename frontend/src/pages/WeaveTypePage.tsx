import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Layers, Search, X } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import type { CatalogSize } from '../types';

interface WeaveRug {
  id: number;
  slug: string;
  name: string;
  material: string;
  weave_type: string;
  image_url: string | null;
  images: { id: number; image_url: string; sort_order: number }[];
  display_price: number | null;
  default_size: CatalogSize | null;
  available: boolean;
}

interface CategoryDetails {
  name: string;
  eyebrow: string;
  intro: string;
  story: string;
  bestFor: string;
  character: string;
  making: string;
  care: string;
}

const WEAVES: Record<string, CategoryDetails> = {
  'hand-knotted': {
    name: 'Hand Knotted',
    eyebrow: 'The pinnacle of rug craftsmanship',
    intro: 'Every knot is tied individually by hand, creating heirloom rugs with exceptional definition, character, and longevity.',
    story: 'A hand-knotted rug begins on a vertical loom, where an artisan ties thousands of individual knots around the foundation threads. The density and precision of those knots allow intricate patterns, nuanced colour transitions, and a surface that becomes more beautiful with age.',
    bestFor: 'Living rooms, dining rooms, formal spaces, and collectors seeking a lasting investment.',
    character: 'Detailed, durable and one of a kind',
    making: 'Several months',
    care: 'Vacuum gently and rotate periodically',
  },
  'hand-tufted': {
    name: 'Hand Tufted',
    eyebrow: 'Plush texture, shaped by hand',
    intro: 'Yarn is placed into a stretched canvas by hand to build a soft, expressive pile with excellent design flexibility.',
    story: 'Using a handheld tufting tool, artisans guide yarn through a canvas foundation before securing the reverse with a backing. This technique creates a dense, comfortable surface and makes bold shapes, sculpted details, and custom colour stories possible in less time than hand knotting.',
    bestFor: 'Bedrooms, lounges, family rooms, and interiors that call for softness underfoot.',
    character: 'Plush, versatile and richly textured',
    making: 'Several weeks',
    care: 'Vacuum without a beater bar',
  },
  flatweave: {
    name: 'Flatweave',
    eyebrow: 'Lightweight, practical and reversible',
    intro: 'Warp and weft threads are interlaced without a pile, producing a slim, durable rug with a crisp graphic quality.',
    story: 'Flatweaves are made by passing horizontal weft yarns over and under vertical warp yarns. With no raised pile, they are easy to move, layer, and maintain. Their low profile works especially well beneath doors and dining furniture while showing geometric patterns with clarity.',
    bestFor: 'Dining rooms, entryways, kitchens, layered rooms, and other high-traffic spaces.',
    character: 'Light, crisp and often reversible',
    making: 'Two to four weeks',
    care: 'Vacuum regularly and use a rug pad',
  },
  'machine-woven': {
    name: 'Machine Woven',
    eyebrow: 'Reliable performance for everyday rooms',
    intro: 'Precision looms create consistent patterns and resilient surfaces that balance design, practicality, and accessible pricing.',
    story: 'Computer-guided looms weave yarn at speed with even tension and repeatable detail. The construction is particularly suited to easy-care fibres and dependable everyday rugs, offering a broad range of styles with shorter production times.',
    bestFor: 'Busy households, outdoor rooms, children’s spaces, rentals, and high-traffic areas.',
    character: 'Consistent, resilient and easy-care',
    making: 'Days to a few weeks',
    care: 'Follow the fibre-specific care label',
  },
};

const COLLECTIONS: Record<string, CategoryDetails> = {
  'space/living_room': {
    name: 'Living Room', eyebrow: 'The foundation of a room made for gathering',
    intro: 'Living-room rugs anchor furniture, soften acoustics, and bring the colours of your most-used space together.',
    story: 'The right living-room rug establishes the scale and mood of the entire room. A generous size lets the front legs of sofas and chairs sit comfortably on the rug, connecting separate pieces into one inviting conversation area while adding warmth and texture underfoot.',
    bestFor: 'Conversation areas, family rooms, open-plan seating, and formal lounges.', character: 'Grounded, welcoming and expressive', making: 'Sized around your seating plan', care: 'Rotate regularly for even wear',
  },
  'space/bedroom': {
    name: 'Bedroom', eyebrow: 'A softer beginning and end to every day',
    intro: 'Bedroom rugs introduce quiet colour, warmth, and a comfortable landing beside and beneath the bed.',
    story: 'A bedroom rug should feel calm and generous. Placed beneath the bed or as runners along either side, it frames the room’s focal point and gives bare feet a soft surface. Low-contrast patterns and tactile natural fibres support a restful atmosphere.',
    bestFor: 'Primary bedrooms, guest rooms, children’s rooms, and bedside runners.', character: 'Soft, restful and intimate', making: 'Custom-sized to your bed', care: 'Vacuum gently and rotate seasonally',
  },
  'space/dining_room': {
    name: 'Dining Room', eyebrow: 'Designed to frame every shared meal',
    intro: 'Dining rugs define the table area and add comfort while standing up to moving chairs and everyday entertaining.',
    story: 'For a balanced dining room, the rug should extend far enough beyond the table for chairs to remain on it when pulled out. Durable, lower-pile constructions make movement easy and help the dining setting read as one composed centrepiece.',
    bestFor: 'Dining tables, breakfast areas, open-plan kitchens, and entertaining spaces.', character: 'Structured, durable and convivial', making: 'Proportioned to table and chairs', care: 'Blot spills promptly; vacuum often',
  },
  'space/entryway': {
    name: 'Entryway', eyebrow: 'A considered welcome from the first step',
    intro: 'Entryway rugs set the tone for the home while handling concentrated foot traffic with confidence.',
    story: 'An entrance rug introduces colour and craftsmanship at the threshold. A resilient construction, practical pile height, and well-fitted rug pad keep the surface secure and easy to maintain while protecting the floor beneath.',
    bestFor: 'Foyers, hallways, doorways, vestibules, and transition spaces.', character: 'Durable, welcoming and distinctive', making: 'Fitted to clear doors and edges', care: 'Shake out and vacuum frequently',
  },
  'mood/warm_earthy': {
    name: 'Warm & Earthy', eyebrow: 'Natural tones with an instinctive sense of home',
    intro: 'Clay, sand, ochre, olive, and warm neutrals create interiors that feel grounded and deeply comfortable.',
    story: 'Warm and earthy rugs borrow their palette from soil, stone, timber, and sun-baked landscapes. Their organic colours pair naturally with wood, leather, linen, and handmade objects, adding depth without making a room feel overly formal.',
    bestFor: 'Relaxed living rooms, natural-material interiors, and layered neutral schemes.', character: 'Grounded, organic and comforting', making: 'Built through layered natural colour', care: 'Rotate to balance natural light exposure',
  },
  'mood/quiet_luxury': {
    name: 'Quiet Luxury', eyebrow: 'Refinement that reveals itself slowly',
    intro: 'Subtle colour, exceptional fibres, and restrained detail create a lasting sense of understated refinement.',
    story: 'Quiet luxury favours material quality over obvious ornament. Fine tonal shifts, considered texture, and beautifully finished edges allow these rugs to support an interior rather than dominate it, rewarding a closer look and ageing gracefully.',
    bestFor: 'Serene bedrooms, elegant lounges, tailored interiors, and tonal schemes.', character: 'Refined, tactile and understated', making: 'Focused on fibre and finishing', care: 'Use gentle suction and professional cleaning',
  },
  'mood/modern_minimal': {
    name: 'Modern Minimal', eyebrow: 'Clarity of form, texture, and proportion',
    intro: 'Clean geometry and edited palettes bring warmth to modern rooms without interrupting their visual calm.',
    story: 'Modern minimal rugs rely on proportion, negative space, and subtle surface variation. Simple does not mean plain: shifts in pile, hand-drawn lines, and quiet tonal contrast give the room depth while preserving an uncluttered architectural feeling.',
    bestFor: 'Contemporary apartments, modern homes, studios, and streamlined offices.', character: 'Clean, calm and architectural', making: 'Precision-led and deliberately edited', care: 'Vacuum regularly to preserve clean texture',
  },
  'mood/bohemian': {
    name: 'Bohemian', eyebrow: 'Collected character with an easy spirit',
    intro: 'Expressive pattern, tactile layers, and globally inspired colour make every bohemian room feel personal.',
    story: 'Bohemian rugs embrace individuality through motifs, irregularities, and unexpected colour combinations. They work beautifully with vintage furniture, plants, art, and textiles, giving a layered room a unifying foundation without making it feel coordinated.',
    bestFor: 'Creative homes, eclectic rooms, reading corners, and relaxed layered interiors.', character: 'Free-spirited, layered and expressive', making: 'Rich in pattern and artisan detail', care: 'Rotate and vacuum gently',
  },
  'mood/bold_artistic': {
    name: 'Bold & Artistic', eyebrow: 'A floor piece with the presence of art',
    intro: 'Confident colour, expressive shapes, and unexpected composition turn the rug into the room’s focal point.',
    story: 'Bold artistic rugs are designed to lead rather than follow. Abstract forms, saturated colour, and sculpted texture can define an otherwise restrained interior or join an already expressive collection of furniture and art.',
    bestFor: 'Statement living rooms, creative studios, hospitality spaces, and art-led interiors.', character: 'Expressive, vivid and individual', making: 'Composed like an artwork', care: 'Protect strong colours from direct sunlight',
  },
  'mood/timeless_traditional': {
    name: 'Timeless Traditional', eyebrow: 'Patterns shaped by generations of craft',
    intro: 'Classic medallions, borders, and botanical motifs bring history and enduring structure to a room.',
    story: 'Traditional rugs use balanced layouts and established motifs to create a sense of permanence. Their layered palettes are remarkably versatile, complementing antiques and contemporary furniture alike while carrying the visual memory of historic weaving traditions.',
    bestFor: 'Formal rooms, heritage homes, libraries, dining rooms, and collected interiors.', character: 'Detailed, balanced and enduring', making: 'Rooted in historic pattern language', care: 'Rotate regularly and clean professionally',
  },
  'material/wool': {
    name: 'Wool', eyebrow: 'Naturally resilient, warm, and beautifully tactile',
    intro: 'Wool is the enduring rug fibre: soft underfoot, resilient in daily use, and rich in natural texture.',
    story: 'Wool fibres have a natural crimp that helps a rug recover from footsteps and furniture. They accept dye beautifully, resist soiling, and provide warmth and acoustic comfort, making wool an exceptionally versatile choice for handcrafted rugs.',
    bestFor: 'Living rooms, bedrooms, dining rooms, and hardworking family spaces.', character: 'Soft, resilient and naturally insulating', making: 'Suited to every artisan construction', care: 'Vacuum gently; blot spills immediately',
  },
  'material/silk': {
    name: 'Silk', eyebrow: 'Luminous detail with exceptional finesse',
    intro: 'Silk brings fluid softness, fine pattern definition, and a distinctive sheen that changes with the light.',
    story: 'The smooth surface of silk reflects light in different directions, giving a rug remarkable visual movement. Its fine fibres allow artisans to achieve intricate detail and subtle colour, making silk rugs especially suited to considered, lower-traffic interiors.',
    bestFor: 'Formal lounges, primary bedrooms, dressing rooms, and collectible statement pieces.', character: 'Lustrous, refined and finely detailed', making: 'Slow, precise and highly skilled', care: 'Professional specialist cleaning only',
  },
  'material/cotton': {
    name: 'Cotton', eyebrow: 'Relaxed comfort with everyday versatility',
    intro: 'Cotton offers a lighter hand, clear colour, and an easygoing character for casual contemporary rooms.',
    story: 'Cotton yarn creates rugs that feel breathable and approachable. It is particularly effective in flatwoven and low-profile constructions, where its softness and colour clarity support practical, informal interiors.',
    bestFor: 'Bedrooms, kitchens, children’s rooms, casual lounges, and layered spaces.', character: 'Light, soft and easygoing', making: 'Ideal for nimble, versatile weaves', care: 'Follow the individual cleaning label',
  },
  'material/synthetic': {
    name: 'Synthetic', eyebrow: 'Practical performance for life in motion',
    intro: 'Modern performance fibres offer colour stability, easy maintenance, and dependable durability for busy spaces.',
    story: 'Purpose-made synthetic yarns can resist moisture, stains, fading, and intensive wear. They make considered rug design accessible in spaces where practicality is essential, including outdoor rooms and active family homes.',
    bestFor: 'Patios, playrooms, high-traffic areas, pet-friendly homes, and hospitality use.', character: 'Durable, practical and easy-care', making: 'Consistent and efficient', care: 'Clean according to the specific fibre label',
  },
};

export default function WeaveTypePage() {
  const { weave = '', facet = '', value = '' } = useParams<{ weave?: string; facet?: string; value?: string }>();
  const isWeavePage = Boolean(weave);
  const categoryKey = isWeavePage ? weave : `${facet}/${value}`;
  const details = isWeavePage ? WEAVES[categoryKey] : COLLECTIONS[categoryKey];
  const categoryLabel = isWeavePage
    ? 'Weave Type'
    : facet === 'space' ? 'Space' : facet === 'mood' ? 'Mood' : 'Material';
  const [rugs, setRugs] = useState<WeaveRug[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [material, setMaterial] = useState('all');
  const [pile, setPile] = useState('all');
  const [sort, setSort] = useState('default');

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!details) return;
    setLoading(true);
    const filterName = isWeavePage ? 'weave' : facet === 'space' ? 'room_type' : facet;
    axios.get('/api/customer/catalog', {
      params: {
        material: material !== 'all' ? material : undefined,
        pile: pile !== 'all' ? pile : undefined,
        search: debouncedSearch || undefined,
        sort,
        limit: 60,
        [filterName]: isWeavePage ? weave : value,
      },
    })
      .then(({ data }) => setRugs(data.items))
      .catch(() => setRugs([]))
      .finally(() => setLoading(false));
  }, [weave, facet, value, details, isWeavePage, material, pile, sort, debouncedSearch]);

  if (!details) return <Navigate to="/catalog" replace />;

  const heroImage = rugs[0]?.images[0]?.image_url || rugs[0]?.image_url;

  return (
    <CustomerLayout>
      <SEO
        title={`${details.name} Rugs — Guide & Collection`}
        description={`${details.intro} Learn what makes this category distinctive and shop our available collection.`}
      />

      <section className="relative min-h-[60vh] md:min-h-[72vh] bg-[#0b1217] overflow-hidden flex items-end">
        {heroImage && <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1217] via-[#0b1217]/55 to-[#0b1217]/20" />
        <div className="relative w-[94vw] mx-auto px-4 py-16 md:py-24">
          <p className="text-[#d8582f] text-xs uppercase tracking-[0.3em] mb-5">Shop by {categoryLabel}</p>
          <h1
            className="text-white uppercase font-black leading-[0.78] tracking-[-0.045em] text-[14vw] md:text-[10vw]"
            style={{ fontFamily: "'Arial Narrow', 'Roboto Condensed', Impact, sans-serif" }}
          >
            {details.name}
          </h1>
          <p className="mt-8 max-w-xl text-cream-100/80 text-base md:text-lg leading-relaxed">{details.intro}</p>
        </div>
      </section>

      <section className="bg-[#f4f0e6] py-20 md:py-28">
        <div className="w-[94vw] max-w-none mx-auto px-4">
          <div className="grid md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10 md:gap-[6vw] items-start">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500 mb-4">Understanding the craft</p>
              <h2 className="font-serif text-4xl md:text-6xl leading-[0.95] text-stone-900">{details.eyebrow}</h2>
            </div>
            <p className="text-stone-600 leading-8 md:text-lg">{details.story}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 border-t border-b border-stone-300 mt-16">
            {[
              ['Character', details.character],
              ['Typical making time', details.making],
              ['Best suited to', details.bestFor],
              ['Everyday care', details.care],
            ].map(([label, value]) => (
              <div key={label} className="py-7 lg:px-6 first:pl-0 border-b sm:border-b-0 lg:border-l first:border-l-0 border-stone-300">
                <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-3">{label}</p>
                <p className="font-serif text-xl text-stone-900 leading-snug">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-[94vw] mx-auto px-4 py-20 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-5 mb-12">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone-400 mb-3">Explore the collection</p>
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900">Shop {details.name} Rugs</h2>
          </div>
          <p className="text-xs text-stone-400 uppercase tracking-wider">{rugs.length} {rugs.length === 1 ? 'rug' : 'rugs'}</p>
        </div>

        <div className="mb-12 border-y border-stone-200 py-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="relative flex-1 min-w-56 max-w-sm">
              <label htmlFor="category-rug-search" className="block text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-2">Search this collection</label>
              <Search size={14} className="absolute left-3 bottom-3 text-stone-400" />
              <input
                id="category-rug-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search rugs…"
                className="w-full border border-stone-200 bg-white py-2.5 pl-9 pr-9 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 bottom-3 text-stone-400 hover:text-stone-900">
                  <X size={14} />
                </button>
              )}
            </div>

            {facet !== 'material' && (
              <label className="block">
                <span className="block text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-2">Material</span>
                <select value={material} onChange={(event) => setMaterial(event.target.value)} className="min-w-36 border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-600 focus:outline-none focus:border-stone-500">
                  <option value="all">All materials</option>
                  <option value="wool">Wool</option>
                  <option value="silk">Silk</option>
                  <option value="cotton">Cotton</option>
                  <option value="synthetic">Synthetic</option>
                </select>
              </label>
            )}

            <label className="block">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-2">Pile height</span>
              <select value={pile} onChange={(event) => setPile(event.target.value)} className="min-w-36 border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-600 focus:outline-none focus:border-stone-500">
                <option value="all">All pile heights</option>
                <option value="flat">Flat</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="block md:ml-auto">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-2">Sort by</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="min-w-44 border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-600 focus:outline-none focus:border-stone-500">
                <option value="default">Featured</option>
                <option value="price-asc">Price: Low to high</option>
                <option value="price-desc">Price: High to low</option>
                <option value="lead-asc">Fastest delivery</option>
              </select>
            </label>

            {(search || material !== 'all' || pile !== 'all' || sort !== 'default') && (
              <button
                type="button"
                onClick={() => { setSearch(''); setMaterial('all'); setPile('all'); setSort('default'); }}
                className="h-[42px] inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 transition-colors"
              >
                <X size={13} /> Clear filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-28"><div className="w-6 h-6 border border-stone-400 border-t-transparent rounded-full animate-spin" /></div>
        ) : rugs.length === 0 ? (
          <div className="bg-stone-50 py-24 text-center">
            <Layers size={30} className="mx-auto text-stone-300 mb-4" />
            <p className="text-stone-500">No {details.name.toLowerCase()} rugs are currently published.</p>
            <Link to="/catalog" className="inline-flex items-center gap-2 mt-5 text-xs uppercase tracking-wider text-stone-900 border-b border-stone-400 pb-1">Browse all rugs <ArrowRight size={13} /></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
            {rugs.map((rug, index) => {
              const columnPosition = index % 3;
              const expansionPosition = columnPosition === 0
                ? 'lg:left-0 lg:origin-left'
                : columnPosition === 1
                  ? 'lg:left-1/2 lg:-translate-x-1/2 lg:origin-center'
                  : 'lg:right-0 lg:origin-right';
              return (
              <Link key={rug.id} to={`/catalog/${rug.slug}`} className="group relative block hover:z-30 focus-within:z-30">
                <div className="relative aspect-[4/5]">
                <div className={`absolute inset-y-0 w-full bg-stone-100 overflow-hidden transition-[width,left,right,transform,box-shadow] duration-500 ease-out lg:group-hover:w-[calc(200%+1.5rem)] lg:group-focus-within:w-[calc(200%+1.5rem)] lg:group-hover:shadow-2xl lg:group-focus-within:shadow-2xl ${expansionPosition}`}>
                  {rug.image_url ? (
                    <>
                      <img src={rug.image_url} alt={rug.name} loading="lazy" className={`w-full h-full object-cover transition-opacity duration-500 ${rug.images.length ? 'group-hover:opacity-0' : ''}`} />
                      {rug.images.length > 0 && <img src={rug.images[0].image_url} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500" />}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Layers className="text-stone-300" /></div>
                  )}
                  {!rug.available && <span className="absolute top-4 left-4 bg-white/90 px-3 py-1 text-[10px] uppercase tracking-wider text-stone-600">Out of stock</span>}
                </div>
                </div>
                <div className="pt-4 text-center space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">{rug.material} · {rug.weave_type}</p>
                  <h3 className="font-serif text-lg text-stone-900">{rug.name}</h3>
                </div>
              </Link>
            );})}
          </div>
        )}
      </section>
    </CustomerLayout>
  );
}
