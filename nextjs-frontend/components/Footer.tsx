import Link from 'next/link';
import type { PublicSettings } from '@/lib/types';
export function Footer({ settings }: { settings: PublicSettings }) {
  return <footer className="footer"><div className="shell footer-grid">
    <div><div className="logo">{settings.business_name || 'DreamRugsCreation'}</div><p className="muted">Handcrafted rugs, made to order for timeless spaces.</p></div>
    <div><h3>Explore</h3><Link href="/catalog">Collection</Link><Link href="/custom-rug-request">Custom Rug</Link><Link href="/about">Our Story</Link></div>
    <div><h3>Contact</h3><p>{settings.contact_emails?.[0] || 'hello@dreamrugscreation.in'}</p><p>{settings.contact_phones?.[0] || '+91 9860321204'}</p></div>
  </div><div className="shell muted" style={{borderTop:'1px solid #393531',marginTop:50,paddingTop:24,fontSize:12}}>© {new Date().getFullYear()} DreamRugsCreation. All rights reserved.</div></footer>;
}
