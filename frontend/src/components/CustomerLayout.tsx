import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, User, Package, FileText, LogOut } from 'lucide-react';
import CustomerChat from './CustomerChat';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';

const NAV = [
  { path: '/shop', label: 'Home' },
  { path: '/shop/catalog', label: 'Collection' },
  { path: '/shop/visualizer', label: 'Visualizer' },
];

const USER_MENU = [
  { path: '/shop/my-orders', label: 'My Orders', icon: <Package size={13} /> },
  { path: '/shop/my-quotes', label: 'My Quotes', icon: <FileText size={13} /> },
];

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { customer, isCustomerAuthenticated, customerLogout } = useCustomerAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    setDropdownOpen(false);
    customerLogout();
    navigate('/shop');
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

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-40 bg-white transition-shadow duration-300 ${scrolled ? 'shadow-[0_1px_0_0_#e7e5e0]' : 'border-b border-stone-100'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-8">

          {/* Brand */}
          <Link to="/shop" className="flex-shrink-0">
            <span className="font-serif text-xl font-medium tracking-wide text-stone-900">LoomCraft</span>
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
            {isCustomerAuthenticated && customer ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center">
                    <User size={13} className="text-stone-600" />
                  </div>
                  <span className="font-medium">{customer.name.split(' ')[0]}</span>
                  <ChevronDown size={12} className={`transition-transform text-stone-400 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-3 w-52 bg-white border border-stone-200 shadow-lg z-50">
                    <div className="px-4 py-3 border-b border-stone-100">
                      <p className="text-stone-900 text-sm font-medium truncate">{customer.name}</p>
                      <p className="text-stone-400 text-xs truncate mt-0.5">{customer.email}</p>
                    </div>
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
                    <div className="border-t border-stone-100 py-1">
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={13} /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/shop/login" className="text-sm text-stone-500 hover:text-stone-900 transition-colors tracking-wide">
                Sign In
              </Link>
            )}

            <Link
              to="/shop/catalog"
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
            {NAV.map((n) => (
              <Link key={n.path} to={n.path}
                className="block py-2.5 text-sm text-stone-700 hover:text-stone-900 tracking-wide transition-colors border-b border-stone-50"
              >
                {n.label}
              </Link>
            ))}

            {isCustomerAuthenticated && customer ? (
              <div className="pt-3 space-y-1">
                <div className="flex items-center gap-2.5 py-2 border-b border-stone-100">
                  <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                    <User size={12} className="text-stone-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-stone-900 text-sm font-medium truncate">{customer.name}</p>
                    <p className="text-stone-400 text-xs truncate">{customer.email}</p>
                  </div>
                </div>
                {USER_MENU.map((item) => (
                  <Link key={item.path} to={item.path}
                    className="flex items-center gap-3 py-2.5 text-sm text-stone-600 hover:text-stone-900 transition-colors"
                  >
                    <span className="text-stone-400">{item.icon}</span> {item.label}
                  </Link>
                ))}
                <button onClick={handleLogout}
                  className="flex items-center gap-3 py-2.5 text-sm text-stone-500 hover:text-red-600 transition-colors w-full"
                >
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            ) : (
              <div className="pt-3 flex flex-col gap-2">
                <Link to="/shop/login" className="text-center py-2.5 text-sm text-stone-600 hover:text-stone-900 transition-colors">
                  Sign In
                </Link>
                <Link to="/shop/catalog"
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
          <div className="md:col-span-2 space-y-4">
            <span className="font-serif text-xl font-medium tracking-wide text-stone-900">LoomCraft</span>
            <p className="text-stone-500 text-sm leading-relaxed max-w-xs">
              Handcrafted custom rugs made to order from India's finest workshops. Every rug is unique, every size custom.
            </p>
            <p className="text-stone-400 text-xs">Powered by Claude AI · Made with care in India</p>
          </div>

          <div className="space-y-4">
            <p className="text-stone-900 text-xs font-semibold uppercase tracking-widest">Collection</p>
            <div className="space-y-2.5">
              {[
                { to: '/shop/catalog', label: 'All Rugs' },
                { to: '/shop/catalog?material=wool', label: 'Wool' },
                { to: '/shop/catalog?material=silk', label: 'Silk' },
                { to: '/shop/catalog?material=cotton', label: 'Cotton' },
                { to: '/shop/visualizer', label: 'Room Visualizer' },
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
                { to: '/shop/login', label: 'Sign In' },
                { to: '/shop/my-orders', label: 'My Orders' },
                { to: '/shop/my-quotes', label: 'My Quotes' },
                { to: '/login', label: 'Staff Portal' },
              ].map((l) => (
                <Link key={l.label} to={l.to}
                  className="block text-stone-500 hover:text-stone-900 text-sm transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-stone-200 py-5 text-center">
          <p className="text-stone-400 text-xs tracking-wide">© 2025 LoomCraft AI · UPI · Cards · Net Banking</p>
        </div>
      </footer>

      <CustomerChat />
    </div>
  );
}
