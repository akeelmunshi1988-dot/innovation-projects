import Link from 'next/link';
import type { PublicSettings } from '@/lib/types';

export function Header({ settings }: { settings: PublicSettings }) {
  const phone = settings.contact_phones?.[0] || '+91 9860321204';
  return <>
    <div className="announcement"><span>Handcrafted, made to order — every rug, every size.</span><span>⌖ Visit Us</span><span>☎ {phone}</span></div>
    <header className="header"><div className="shell header-inner">
      <nav className="nav"><Link href="/">Home</Link><Link href="/catalog">Collection</Link><Link href="/custom-rug-request">Custom Rug</Link><Link href="/about">About Us</Link></nav>
      <Link className="logo" href="/">◉ &nbsp;{settings.business_name || 'DreamRugsCreation'}</Link>
      <div className="actions"><span>INR⌄</span><Link href="/cart">Bag</Link><Link href="/login">Sign In</Link></div>
    </div></header>
  </>;
}
