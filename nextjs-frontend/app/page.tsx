import Link from 'next/link';
import { absoluteMediaUrl, getCatalog, getSettings, siteUrl } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

const fallbackHero='/room-canvas.jpg';
export default async function Home() {
  const [settings,catalog]=await Promise.all([getSettings(),getCatalog({limit:6,sort:'newest'})]);
  const hero=absoluteMediaUrl(settings.hero_image_url)||fallbackHero;
  const jsonLd={ '@context':'https://schema.org','@type':'HomeAndConstructionBusiness',name:settings.business_name||'DreamRugsCreation',url:siteUrl,image:absoluteMediaUrl(hero),telephone:settings.contact_phones?.[0],email:settings.contact_emails?.[0] };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
    <section className="hero" style={{backgroundImage:`url(${hero})`}}><div className="hero-content"><div className="eyebrow">{settings.hero_eyebrow||'20+ years in the making'}</div><h1>{settings.hero_heading||'Made for Timeless Spaces.'}</h1><Link className="button light" href="/catalog">{settings.hero_cta_label||'Explore Collection'} →</Link></div></section>
    <div className="shell trust"><span>Handmade</span><span>Custom Sizes</span><span>Worldwide Shipping</span><span>Family Workshop</span><span>Sustainable Materials</span></div>
    <section className="section"><div className="shell story"><div><div className="eyebrow">Every rug tells a story</div><h2 className="section-title">Crafted slowly.<br/>Made to endure.</h2><p className="muted" style={{lineHeight:1.8}}>Every rug that leaves our workshop passes through the hands of master weavers who have spent years perfecting their craft — hand-knotting, natural dyeing, and meticulous finishing.</p><Link className="eyebrow" href="/about">Behind the craft →</Link></div><img src="/about-rug-living-room.png" alt="Handcrafted rug in a refined living room"/></div></section>
    {catalog.items.length>0&&<section className="section" style={{background:'#faf8f4'}}><div className="shell"><div className="eyebrow">The collection</div><h2 className="section-title">Rugs made for living</h2><div className="grid">{catalog.items.slice(0,6).map(r=><ProductCard key={r.id} rug={r}/>)}</div></div></section>}
  </>;
}
