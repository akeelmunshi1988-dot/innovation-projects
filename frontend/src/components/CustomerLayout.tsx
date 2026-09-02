import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, User, Package, FileText, LogOut, LayoutDashboard, Mail, Download, Send, Check, ShoppingCart, Phone, MapPin, MessageCircle } from 'lucide-react';
import axios from 'axios';
import CustomerChat from './CustomerChat';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCart } from '../contexts/CartContext';
import { useMeasurementUnit } from '../contexts/MeasurementContext';
import { getPublicSettings } from '../services/api';
import { applyBranding } from '../utils/branding';

// Full logo lockup (mark + wordmark + tagline) — used in the footer where there's
// room for it to read clearly; the header uses just the icon mark (tenant.logo_url)
// since the nav bar is too short for the wordmark to stay legible.
const FOOTER_LOGO_URL = '/static/branding/44203c3d28564ce58a5df25f86fb78f5.png';

const NAV = [
  { path: '/', label: 'Home' },
  { path: '/catalog', label: 'Collection' },
  { path: '/custom-rug-request', label: 'Custom Rug' },
  { path: '/about', label: 'About Us' },
];

// Mega menu shown on hovering "Collection" — mirrors the same Space/Mood/Material
// facets used on the homepage tabs and the catalog page's own filter pills.
const MEGA_MENU = {
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
      { label: 'Custom Rug Request', to: '/custom-rug-request' },
    ],
  },
};

const USER_MENU = [
  { path: '/my-orders', label: 'My Orders', icon: <Package size={13} /> },
  { path: '/my-quotes', label: 'My Quotes', icon: <FileText size={13} /> },
];

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { customer, isCustomerAuthenticated, customerLogout } = useCustomerAuth();
  const { user: adminUser, isAuthenticated: isAdminAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [catalogPdfUrl, setCatalogPdfUrl] = useState<string | null>(null);
  const [certifications, setCertifications] = useState<{ label: string; image_url: string }[]>([]);
  const [contactEmails, setContactEmails] = useState<string[]>([]);
  const [contactPhones, setContactPhones] = useState<string[]>([]);
  const [contactAddress, setContactAddress] = useState<string | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [infoBarDismissed, setInfoBarDismissed] = useState(false);
  const [announcements, setAnnouncements] = useState<{ id: number; text: string; link_url: string | null }[]>([]);
  const [announceIndex, setAnnounceIndex] = useState(0);
  const [announceFading, setAnnounceFading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);
  const { displayCurrency, setDisplayCurrency, availableCurrencies } = useCurrency();
  const { itemCount } = useCart();
  const { sizeUnit, setSizeUnit } = useMeasurementUnit();

  useEffect(() => {
    if (!localStorage.getItem('cookie_consent')) setShowCookieBanner(true);
  }, []);

  const handleCookieConsent = (choice: 'accepted' | 'declined') => {
    localStorage.setItem('cookie_consent', choice);
    setShowCookieBanner(false);
  };

  useEffect(() => {
    axios.get('/api/customer/announcement-messages')
      .then(({ data }) => setAnnouncements(data))
      .catch(() => {});
  }, []);

  // Rotates through admin-configured announcement messages with a brief fade —
  // stays put if there's only one (or none, where a default line renders instead).
  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      setAnnounceFading(true);
      setTimeout(() => {
        setAnnounceIndex((i) => (i + 1) % announcements.length);
        setAnnounceFading(false);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  const activeAnnouncement = announcements[announceIndex % (announcements.length || 1)];

  useEffect(() => {
    getPublicSettings()
      .then((data) => {
        setChatEnabled(data.ai_assistant_enabled);
        setBusinessName(data.business_name || 'Store');
        setLogoUrl(data.logo_url);
        applyBranding(data.business_name, data.logo_url);
        setCatalogPdfUrl(data.catalog_pdf_url);
        setCertifications(data.certifications || []);
        setContactEmails(data.contact_emails ?? []);
        setContactPhones(data.contact_phones ?? []);
        setContactAddress(data.contact_address);
      })
      .catch(() => { setChatEnabled(true); setBusinessName('Store'); });
  }, []);

  const BrandName = ({ className }: { className: string }) =>
    businessName === null
      ? <span className={`${className} inline-block bg-stone-200 rounded animate-pulse text-transparent select-none`}>Loading</span>
      : <span className={className}>{businessName}</span>;

  const BrandLockup = ({ className, markSize = 32, markWidth }: { className: string; markSize?: number; markWidth?: number }) => (
    <span className="inline-flex items-center gap-1.5">
      {logoUrl && (
        <img src={logoUrl} alt="" className="flex-shrink-0 object-contain" style={{ height: markSize, width: markWidth ?? markSize }} />
      )}
      <BrandName className={className} />
    </span>
  );

  // Admin browsing the shop — treat as logged in using admin session
  const isAdminBrowsing = isAdminAuthenticated && !isCustomerAuthenticated;
  const displayName = isCustomerAuthenticated && customer
    ? customer.name
    : isAdminBrowsing && adminUser
      ? adminUser.full_name || adminUser.email
      : null;
  const displayEmail = isCustomerAuthenticated && customer
    ? customer.email
    : isAdminBrowsing && adminUser
      ? adminUser.email
      : null;

  const handleLogout = () => {
    setDropdownOpen(false);
    customerLogout();
    navigate('/');
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterStatus('submitting');
    try {
      await axios.post('/api/customer/newsletter-subscribe', { email: newsletterEmail.trim(), source: 'homepage_footer' });
      setNewsletterEmail('');
      setNewsletterStatus('done');
    } catch {
      setNewsletterStatus('error');
    }
  };

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!currencyOpen) return;
    const handler = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node))
        setCurrencyOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [currencyOpen]);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-40 bg-white transition-shadow duration-300 ${scrolled ? 'shadow-[0_1px_0_0_#e7e5e0]' : 'border-b border-stone-100'}`}>
        {/* Top announcement bar — dismissible */}
        {!infoBarDismissed && (
          <div className="relative flex items-center justify-center gap-6 bg-stone-900 text-stone-200 text-xs tracking-wide px-10 h-8">
            <span className={`truncate transition-opacity duration-300 ${announceFading ? 'opacity-0' : 'opacity-100'}`}>
              {activeAnnouncement?.link_url ? (
                <a href={activeAnnouncement.link_url} className="hover:text-white transition-colors">
                  {activeAnnouncement.text}
                </a>
              ) : (
                activeAnnouncement?.text ?? 'Handcrafted, made to order — every rug, every size.'
              )}
            </span>
            {(contactPhones[0] || contactAddress) && (
              <span className="hidden md:flex items-center gap-6 text-stone-400 flex-shrink-0">
                {contactAddress && (
                  <span className="inline-flex items-center gap-1.5"><MapPin size={11} /> Visit Us</span>
                )}
                {contactPhones[0] && (
                  <a href={`tel:${contactPhones[0]}`} className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
                    <Phone size={11} /> {contactPhones[0]}
                  </a>
                )}
              </span>
            )}
            <button
              onClick={() => setInfoBarDismissed(true)}
              aria-label="Dismiss"
              className="absolute right-3 text-stone-400 hover:text-white transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <div className="relative w-[94vw] max-w-none mx-auto px-4 h-[70px] flex items-center gap-8">

          {/* Desktop nav — left */}
          <nav className="hidden lg:flex items-center gap-7 h-full">
            {NAV.map((n) => {
              const active = location.pathname === n.path;
              const link = (
                <Link
                  to={n.path}
                  className={`storefront-nav-link border-b ${
                    active
                      ? 'text-stone-900 border-stone-900'
                      : 'text-stone-500 hover:text-stone-900 border-transparent hover:border-stone-300'
                  }`}
                >
                  {n.label}
                </Link>
              );

              if (n.path !== '/catalog') return <React.Fragment key={n.path}>{link}</React.Fragment>;

              // "Collection" gets a mega menu — the wrapper spans the full header
              // row height so the mouse never crosses a hover-dead-zone on its way
              // down into the panel below.
              return (
                <div key={n.path} className="group/mega h-full flex items-center">
                  {link}
                  <div
                    className={`hidden group-hover/mega:block fixed left-0 right-0 bg-cream-200 border-t border-b border-stone-100 shadow-lg z-30 ${
                      infoBarDismissed ? 'top-[70px]' : 'top-[102px]'
                    }`}
                  >
                    <div className="w-[94vw] max-w-none mx-auto px-4 py-10 grid grid-cols-6 gap-8">
                      {(Object.keys(MEGA_MENU) as (keyof typeof MEGA_MENU)[]).map((key) => (
                        <div key={key} className="space-y-3">
                          <p className="text-stone-900 text-xs font-semibold uppercase tracking-widest">{MEGA_MENU[key].heading}</p>
                          <div className="space-y-2.5">
                            {MEGA_MENU[key].links.map((l) => (
                              <Link key={l.to} to={l.to} className="block text-stone-500 hover:text-stone-900 text-sm transition-colors">
                                {l.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                      <Link to="/catalog" className="group/promo relative overflow-hidden bg-stone-100 aspect-[4/5] block">
                        <img
                          src="/static/shop-by-space/living_room.jpg"
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover group-hover/promo:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />
                        <span className="absolute bottom-4 left-4 right-4 text-white font-serif text-lg font-light">
                          Explore the Full Collection
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Brand — centered on desktop, left-aligned on mobile */}
          <Link
            to="/"
            className="inline-flex items-center -ml-3 lg:absolute lg:left-1/2 lg:-ml-0 lg:-translate-x-1/2"
          >
            <BrandLockup className="font-serif text-xl font-medium tracking-wide text-[#85501b]" markSize={46} />
          </Link>

          {/* Right area */}
          <div className="hidden lg:flex items-center gap-5 ml-auto">
            <div className="flex items-center border border-stone-200 p-0.5" aria-label="Measurement unit">
              {(['ft', 'cm'] as const).map((unit) => (
                <button key={unit} onClick={() => setSizeUnit(unit)} className={`px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${sizeUnit === unit ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-900'}`}>
                  {unit}
                </button>
              ))}
            </div>
            <div className="relative" ref={currencyRef}>
              <button
                onClick={() => setCurrencyOpen((o) => !o)}
                className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900 transition-colors"
              >
                {displayCurrency}
                <ChevronDown size={12} className={`transition-transform text-stone-400 ${currencyOpen ? 'rotate-180' : ''}`} />
              </button>
              {currencyOpen && (
                <div className="absolute right-0 top-full mt-3 w-60 bg-white border border-stone-200 shadow-lg z-50 py-1">
                  {availableCurrencies.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setDisplayCurrency(c.code); setCurrencyOpen(false); }}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                        displayCurrency === c.code ? 'text-stone-900 font-medium bg-stone-50' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                      }`}
                    >
                      <span className="flex items-baseline gap-1.5">
                        <span>{c.code}</span>
                        <span className="text-stone-400 text-xs">{c.country}</span>
                      </span>
                      <span className="text-stone-400">{c.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link to="/cart" className="relative text-stone-500 hover:text-stone-900 transition-colors">
              <ShoppingCart size={18} />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-stone-900 text-white text-[10px] leading-4 text-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {(isCustomerAuthenticated && customer) || isAdminBrowsing ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center">
                    <User size={13} className="text-stone-600" />
                  </div>
                  <span className="font-medium">{displayName?.split(' ')[0]}</span>
                  {isAdminBrowsing && (
                    <span className="text-xs bg-stone-900 text-white px-1.5 py-0.5 tracking-wider uppercase">Admin</span>
                  )}
                  <ChevronDown size={12} className={`transition-transform text-stone-400 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-3 w-52 bg-white border border-stone-200 shadow-lg z-50">
                    <div className="px-4 py-3 border-b border-stone-100">
                      <p className="text-stone-900 text-sm font-medium truncate">{displayName}</p>
                      <p className="text-stone-400 text-xs truncate mt-0.5">{displayEmail}</p>
                    </div>
                    {isCustomerAuthenticated && (
                      <div className="py-1">
                        {USER_MENU.map((item) => (
                          <Link key={item.path} to={item.path}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors"
                          >
                            <span className="text-stone-400">{item.icon}</span>
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                    {isAdminBrowsing && (
                      <div className="py-1">
                        <Link to="/admin"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors"
                        >
                          <LayoutDashboard size={13} className="text-stone-400" /> Admin Panel
                        </Link>
                      </div>
                    )}
                    {isCustomerAuthenticated && (
                      <div className="border-t border-stone-100 py-1">
                        <button onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut size={13} /> Sign out
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="text-sm text-stone-500 hover:text-stone-900 transition-colors tracking-wide">
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="ml-auto lg:hidden text-stone-700 p-1"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-t border-stone-100 px-6 py-5 space-y-1">
            <div className="flex items-center gap-2 pb-3 mb-1 border-b border-stone-50 flex-wrap">
              <span className="text-stone-400 text-xs uppercase tracking-wider">Currency</span>
              {availableCurrencies.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setDisplayCurrency(c.code)}
                  className={`text-xs px-2 py-1 border transition-colors ${
                    displayCurrency === c.code ? 'border-stone-900 text-stone-900 font-medium' : 'border-stone-200 text-stone-500'
                  }`}
                >
                  {c.code}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pb-3 mb-1 border-b border-stone-50">
              <span className="text-stone-400 text-xs uppercase tracking-wider">Measurements</span>
              {(['ft', 'cm'] as const).map((unit) => (
                <button key={unit} onClick={() => setSizeUnit(unit)} className={`text-xs uppercase px-2 py-1 border ${sizeUnit === unit ? 'border-stone-900 text-stone-900 font-medium' : 'border-stone-200 text-stone-500'}`}>{unit}</button>
              ))}
            </div>
            {NAV.map((n) => (
              <Link key={n.path} to={n.path}
                className="block py-2.5 text-sm text-stone-700 hover:text-stone-900 tracking-wide transition-colors border-b border-stone-50"
              >
                {n.label}
              </Link>
            ))}
            <div className="py-3 border-b border-stone-100">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2">Shop by Weave Type</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {MEGA_MENU.weave.links.map((item) => (
                  <Link key={item.to} to={item.to} className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <Link to="/cart"
              className="flex items-center gap-2 py-2.5 text-sm text-stone-700 hover:text-stone-900 tracking-wide transition-colors border-b border-stone-50"
            >
              <ShoppingCart size={14} /> Cart{itemCount > 0 ? ` (${itemCount})` : ''}
            </Link>

            {(isCustomerAuthenticated && customer) || isAdminBrowsing ? (
              <div className="pt-3 space-y-1">
                <div className="flex items-center gap-2.5 py-2 border-b border-stone-100">
                  <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                    <User size={12} className="text-stone-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-stone-900 text-sm font-medium truncate">{displayName}</p>
                      {isAdminBrowsing && (
                        <span className="text-xs bg-stone-900 text-white px-1.5 py-0.5 tracking-wider uppercase flex-shrink-0">Admin</span>
                      )}
                    </div>
                    <p className="text-stone-400 text-xs truncate">{displayEmail}</p>
                  </div>
                </div>
                {isCustomerAuthenticated && USER_MENU.map((item) => (
                  <Link key={item.path} to={item.path}
                    className="flex items-center gap-3 py-2.5 text-sm text-stone-600 hover:text-stone-900 transition-colors"
                  >
                    <span className="text-stone-400">{item.icon}</span> {item.label}
                  </Link>
                ))}
                {isAdminBrowsing && (
                  <Link to="/admin"
                    className="flex items-center gap-3 py-2.5 text-sm text-stone-600 hover:text-stone-900 transition-colors"
                  >
                    <LayoutDashboard size={13} className="text-stone-400" /> Admin Panel
                  </Link>
                )}
                {isCustomerAuthenticated && (
                  <button onClick={handleLogout}
                    className="flex items-center gap-3 py-2.5 text-sm text-stone-500 hover:text-red-600 transition-colors w-full"
                  >
                    <LogOut size={13} /> Sign out
                  </button>
                )}
              </div>
            ) : (
              <div className="pt-3">
                <Link to="/login" className="text-center block py-2.5 text-sm text-stone-600 hover:text-stone-900 transition-colors">
                  Sign In
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Page content */}
      <main className={`flex-1 ${infoBarDismissed ? 'pt-[70px]' : 'pt-[102px]'}`}>{children}</main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-stone-50 border-t border-stone-200 mt-24">
        <div className="w-[94vw] max-w-none mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-[1.3fr_0.8fr_0.8fr_1.6fr] gap-10">
          <div className="space-y-4">
            <img src={FOOTER_LOGO_URL} alt={businessName ?? 'Dream Rugs Creation'} className="w-[200px] h-auto" />
            <p className="text-stone-500 text-sm leading-relaxed max-w-xs">
              Handcrafted custom rugs made to order from India's finest workshops. Every rug is unique, every size custom.
            </p>
            <p className="text-stone-400 text-xs">Made with care in India</p>

            {catalogPdfUrl && (
              <a
                href={catalogPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-stone-700 hover:text-stone-900 text-sm border-b border-stone-300 hover:border-stone-900 pb-0.5 transition-colors"
              >
                <Download size={14} /> Download Lookbook
              </a>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-stone-900 text-xs font-semibold uppercase tracking-widest">Shop</p>
            <div className="space-y-2.5">
              {[
                { to: '/catalog', label: 'All Rugs' },
                { to: '/catalog/material/wool', label: 'Wool' },
                { to: '/catalog/material/silk', label: 'Silk' },
                { to: '/catalog/material/cotton', label: 'Cotton' },
              ].map((l) => (
                <Link key={l.label} to={l.to}
                  className="block text-stone-500 hover:text-stone-900 text-sm transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-stone-900 text-xs font-semibold uppercase tracking-widest">Account</p>
            <div className="space-y-2.5">
              {[
                { to: '/about', label: 'About Us' },
                { to: '/login', label: 'Sign In' },
                { to: '/my-orders', label: 'My Orders' },
                { to: '/my-quotes', label: 'My Quotes' },
                { to: '/refund-cancellation-policy', label: 'Refund & Cancellation' },
                { to: '/privacy-policy', label: 'Privacy Policy' },
                { to: '/admin/login', label: 'Staff Portal' },
              ].map((l) => (
                <Link key={l.label} to={l.to}
                  className="block text-stone-500 hover:text-stone-900 text-sm transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p className="storefront-heading text-2xl">Let us inspire you</p>
            <p className="text-stone-500 text-sm leading-relaxed">New collections, workshop stories, and offers — straight to your inbox.</p>
            {newsletterStatus === 'done' ? (
              <p className="flex items-center gap-1.5 text-stone-600 text-sm">
                <Check size={14} /> Thanks — you're subscribed.
              </p>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="flex gap-0">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Your email"
                  className="flex-1 min-w-0 bg-white border border-stone-300 focus:border-stone-500 px-3 py-2.5 text-stone-900 placeholder-stone-400 text-sm focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={newsletterStatus === 'submitting'}
                  className="storefront-cta-solid px-4 flex-shrink-0"
                >
                  <Send size={14} />
                </button>
              </form>
            )}
            {newsletterStatus === 'error' && (
              <p className="text-red-500 text-xs mt-1.5">Something went wrong — please try again.</p>
            )}
          </div>
        </div>

        {(contactEmails.length > 0 || contactPhones.length > 0 || contactAddress) && (
          <div className="border-t border-stone-200 py-8">
            <div className="w-[94vw] max-w-none mx-auto px-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm">
              {contactEmails.map((e) => (
                <a key={e} href={`mailto:${e}`} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors">
                  <Mail size={14} className="flex-shrink-0" /> {e}
                </a>
              ))}
              {contactPhones.map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <a href={`tel:${p}`} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors">
                    <Phone size={14} className="flex-shrink-0" /> {p}
                  </a>
                  <a
                    href={`https://wa.me/${p.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors"
                  >
                    <MessageCircle size={14} /> Chat
                  </a>
                </div>
              ))}
              {contactAddress && (
                <p className="flex items-center gap-2 text-stone-500">
                  <MapPin size={14} className="flex-shrink-0" /> {contactAddress}
                </p>
              )}
            </div>
          </div>
        )}

        {certifications.length > 0 && (
          <div className="border-t border-stone-200 py-8">
            <div className="w-[94vw] max-w-none mx-auto px-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {certifications.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <img src={c.image_url} alt={c.label} className="w-8 h-8 object-contain" />
                  <span className="text-stone-500 text-xs uppercase tracking-wider">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-stone-200 py-5 text-center">
          <p className="text-stone-400 text-xs tracking-wide">
            © {new Date().getFullYear()} <BrandName className="inline-block align-middle" /> · UPI · Cards · Net Banking
          </p>
        </div>
      </footer>

      {showCookieBanner && (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-stone-900 border-t border-stone-700">
          <div className="w-[94vw] max-w-none mx-auto px-4 py-4 flex flex-col sm:flex-row items-center gap-4">
            <p className="flex-1 text-stone-300 text-sm text-center sm:text-left">
              We use cookies to keep you signed in, remember your cart, and understand how the site is used.
            </p>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => handleCookieConsent('declined')}
                className="text-stone-400 hover:text-white text-sm transition-colors"
              >
                Decline
              </button>
              <button
                onClick={() => handleCookieConsent('accepted')}
                className="bg-white hover:bg-stone-200 text-stone-900 text-sm font-medium px-5 py-2 transition-colors"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {chatEnabled && <CustomerChat businessName={businessName} />}
    </div>
  );
}
