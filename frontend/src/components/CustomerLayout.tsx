import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, User, Package, FileText, LogOut, LayoutDashboard, Mail, Download, Send, Check, ShoppingBag } from 'lucide-react';
import axios from 'axios';
import CustomerChat from './CustomerChat';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCart } from '../contexts/CartContext';
import { getPublicSettings } from '../services/api';
import { applyBranding } from '../utils/branding';

// Full logo lockup (mark + wordmark + tagline) — used in the footer where there's
// room for it to read clearly; the header uses just the icon mark (tenant.logo_url)
// since the nav bar is too short for the wordmark to stay legible.
const FOOTER_LOGO_URL = '/static/branding/44203c3d28564ce58a5df25f86fb78f5.png';

const NAV = [
  { path: '/', label: 'Home' },
  { path: '/catalog', label: 'Collection' },
  { path: '/visualizer', label: 'Visualizer' },
  { path: '/about', label: 'About Us' },
];

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
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);
  const { displayCurrency, setDisplayCurrency, availableCurrencies } = useCurrency();
  const { itemCount } = useCart();

  useEffect(() => {
    getPublicSettings()
      .then((data) => {
        setChatEnabled(data.ai_assistant_enabled);
        setBusinessName(data.business_name || 'Store');
        setLogoUrl(data.logo_url);
        applyBranding(data.business_name, data.logo_url);
        setCatalogPdfUrl(data.catalog_pdf_url);
        setCertifications(data.certifications || []);
      })
      .catch(() => { setChatEnabled(true); setBusinessName('Store'); });
  }, []);

  const BrandName = ({ className }: { className: string }) =>
    businessName === null
      ? <span className={`${className} inline-block bg-stone-200 rounded animate-pulse text-transparent select-none`}>Loading</span>
      : <span className={className}>{businessName}</span>;

  const BrandLockup = ({ className, markSize = 32 }: { className: string; markSize?: number }) => (
    <span className="inline-flex items-center gap-2.5">
      {logoUrl && (
        <img src={logoUrl} alt="" className="flex-shrink-0 object-contain" style={{ height: markSize, width: markSize }} />
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
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-8">

          {/* Brand */}
          <Link to="/" className="flex-shrink-0">
            <BrandLockup className="font-serif text-xl font-medium tracking-wide text-stone-900" markSize={46} />
          </Link>

          {/* Desktop nav — centered */}
          <nav className="hidden md:flex items-center gap-7 flex-1 justify-center">
            {NAV.map((n) => {
              const active = location.pathname === n.path;
              return (
                <Link
                  key={n.path}
                  to={n.path}
                  className={`text-sm tracking-wide transition-colors pb-0.5 ${
                    active
                      ? 'text-stone-900 border-b border-stone-900'
                      : 'text-stone-500 hover:text-stone-900 border-b border-transparent hover:border-stone-300'
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          {/* Right area */}
          <div className="hidden md:flex items-center gap-5 ml-auto">
            <div className="relative" ref={currencyRef}>
              <button
                onClick={() => setCurrencyOpen((o) => !o)}
                className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900 transition-colors"
              >
                {displayCurrency}
                <ChevronDown size={12} className={`transition-transform text-stone-400 ${currencyOpen ? 'rotate-180' : ''}`} />
              </button>
              {currencyOpen && (
                <div className="absolute right-0 top-full mt-3 w-44 bg-white border border-stone-200 shadow-lg z-50 py-1">
                  {availableCurrencies.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setDisplayCurrency(c.code); setCurrencyOpen(false); }}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                        displayCurrency === c.code ? 'text-stone-900 font-medium bg-stone-50' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                      }`}
                    >
                      <span>{c.code}</span>
                      <span className="text-stone-400">{c.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link to="/cart" className="relative text-stone-500 hover:text-stone-900 transition-colors">
              <ShoppingBag size={18} />
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

            <Link
              to="/catalog"
              className="bg-stone-900 hover:bg-stone-800 text-white text-xs tracking-widest uppercase font-medium px-5 py-2.5 transition-colors"
            >
              Shop Now
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="ml-auto md:hidden text-stone-700 p-1"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-stone-100 px-6 py-5 space-y-1">
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
            {NAV.map((n) => (
              <Link key={n.path} to={n.path}
                className="block py-2.5 text-sm text-stone-700 hover:text-stone-900 tracking-wide transition-colors border-b border-stone-50"
              >
                {n.label}
              </Link>
            ))}
            <Link to="/cart"
              className="flex items-center gap-2 py-2.5 text-sm text-stone-700 hover:text-stone-900 tracking-wide transition-colors border-b border-stone-50"
            >
              <ShoppingBag size={14} /> Cart{itemCount > 0 ? ` (${itemCount})` : ''}
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
              <div className="pt-3 flex flex-col gap-2">
                <Link to="/login" className="text-center py-2.5 text-sm text-stone-600 hover:text-stone-900 transition-colors">
                  Sign In
                </Link>
                <Link to="/catalog"
                  className="text-center bg-stone-900 text-white text-xs tracking-widest uppercase font-medium py-3 transition-colors"
                >
                  Shop Now
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 pt-16">{children}</main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-stone-50 border-t border-stone-200 mt-24">
        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
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
            <p className="text-stone-900 text-xs font-semibold uppercase tracking-widest">Collection</p>
            <div className="space-y-2.5">
              {[
                { to: '/catalog', label: 'All Rugs' },
                { to: '/catalog?material=wool', label: 'Wool' },
                { to: '/catalog?material=silk', label: 'Silk' },
                { to: '/catalog?material=cotton', label: 'Cotton' },
                { to: '/visualizer', label: 'Room Visualizer' },
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
            <p className="text-stone-900 text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5">
              <Mail size={12} /> Newsletter
            </p>
            <p className="text-stone-500 text-sm leading-relaxed">
              New collections, workshop stories, and offers — straight to your inbox.
            </p>
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
                  className="bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white px-4 py-2.5 flex-shrink-0 transition-colors"
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

        {certifications.length > 0 && (
          <div className="border-t border-stone-200 py-8">
            <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
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

      {chatEnabled && <CustomerChat />}
    </div>
  );
}
