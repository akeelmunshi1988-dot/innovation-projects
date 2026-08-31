import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getSettings, siteUrl } from '@/lib/api';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'DreamRugsCreation — Handcrafted Custom Rugs', template: '%s | DreamRugsCreation' },
  description: 'Premium handcrafted rugs custom-made to your exact size, material and design.',
  alternates: { canonical: '/' },
  openGraph: { type:'website', siteName:'DreamRugsCreation', locale:'en_IN' },
};

export default async function RootLayout({ children }: Readonly<{children:React.ReactNode}>) {
  const settings = await getSettings();
  return <html lang="en"><body><Header settings={settings}/><main>{children}</main><Footer settings={settings}/></body></html>;
}
