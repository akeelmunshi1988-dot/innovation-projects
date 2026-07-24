import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  Calculator,
  ShoppingBag,
  Package,
  Users,
  FileText,
  Menu,
  X,
  Scissors,
  Store,
  LogOut,
  CreditCard,
  Zap,
  Settings,
  Film,
  Image,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { applyBranding } from '../utils/branding';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: '/admin/assistant', label: 'AI Assistant', icon: <MessageSquare size={18} /> },
  { path: '/admin/catalog', label: 'Catalog', icon: <BookOpen size={18} /> },
  { path: '/admin/showcase-videos', label: 'Homepage Videos', icon: <Film size={18} /> },
  { path: '/admin/workshop-photos', label: 'Workshop Photos', icon: <Image size={18} /> },
  { path: '/admin/quote-builder', label: 'Quote Builder', icon: <Calculator size={18} /> },
  { path: '/admin/quotes', label: 'Quotes', icon: <FileText size={18} /> },
  { path: '/admin/orders', label: 'Orders', icon: <ShoppingBag size={18} /> },
  { path: '/admin/inventory', label: 'Inventory', icon: <Package size={18} /> },
  { path: '/admin/customers', label: 'Customers', icon: <Users size={18} /> },
  { path: '/', label: 'Customer Shop', icon: <Store size={18} /> },
  { path: '/admin/billing', label: 'Billing', icon: <CreditCard size={18} /> },
  { path: '/admin/settings', label: 'Settings', icon: <Settings size={18} /> },
];

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleNavItems = navItems.filter(
    (item) => item.path !== '/admin/assistant' || user?.tenant.ai_assistant_vendor_enabled !== false
  );

  useEffect(() => {
    if (user) applyBranding(user.tenant.name, user.tenant.logo_url);
  }, [user?.tenant.name, user?.tenant.logo_url]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-dark-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-dark-900 border-r border-dark-700
          flex flex-col z-30 transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-dark-700">
          <div className="w-9 h-9 bg-gold-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Scissors size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-cream-100 font-bold text-base leading-tight">{user?.tenant.name ?? 'LoomCraftRugs AI'}</h1>
            <p className="text-dark-400 text-xs">Rug Manufacturing System</p>
          </div>
          <button
            className="ml-auto lg:hidden text-dark-400 hover:text-cream-200"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {visibleNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                    ${isActive
                      ? 'bg-gold-600/20 text-gold-400 border border-gold-600/30'
                      : 'text-dark-300 hover:text-cream-200 hover:bg-dark-800'
                    }
                  `}
                >
                  <span className={isActive ? 'text-gold-400' : 'text-dark-400'}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* AI Credits meter */}
        {user && user.tenant.ai_assistant_vendor_enabled !== false && (() => {
          const plan = user.tenant.plan;
          const used = user.tenant.ai_credits_used ?? 0;
          const limits: Record<string, number> = { starter: 200, growth: 1000, pro: -1 };
          const limit = limits[plan] ?? 200;
          const unlimited = limit < 0;
          const pct = unlimited ? 0 : Math.min(100, Math.round(used / limit * 100));
          const exhausted = !unlimited && used >= limit;
          return (
            <div className="px-4 pb-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-dark-500 text-xs flex items-center gap-1">
                  <Zap size={10} className="text-gold-500" /> AI queries
                </span>
                <span className={`text-xs font-medium ${exhausted ? 'text-red-400' : 'text-dark-400'}`}>
                  {unlimited ? `${used} used` : `${used}/${limit}`}
                </span>
              </div>
              {!unlimited && (
                <div className="h-1 bg-dark-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      exhausted ? 'bg-red-500' : pct > 80 ? 'bg-orange-500' : 'bg-gold-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          );
        })()}

        {/* User + Logout */}
        <div className="px-4 py-4 border-t border-dark-700 space-y-3">
          {user && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gold-600/20 border border-gold-600/30 flex items-center justify-center text-gold-400 text-xs font-bold flex-shrink-0">
                {(user.full_name || user.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-cream-200 text-xs font-medium truncate">{user.full_name || user.email}</p>
                <p className="text-dark-500 text-xs truncate">{user.tenant.name}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-dark-800 transition-colors text-xs font-medium"
          >
            <LogOut size={13} /> Sign Out
          </button>
          <p className="text-dark-600 text-xs px-1">Powered by Claude AI</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-dark-900 border-b border-dark-700 flex items-center px-4 gap-4 flex-shrink-0">
          <button
            className="lg:hidden text-dark-400 hover:text-cream-200"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-cream-200 font-semibold text-sm">
              {navItems.find((n) => n.path === location.pathname)?.label ?? 'LoomCraftRugs AI'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-dark-500 text-xs hidden sm:block">
                {user.tenant.name}
                <span className="ml-1.5 bg-dark-800 border border-dark-600 rounded px-1.5 py-0.5 text-dark-400 capitalize">{user.tenant.plan}</span>
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-dark-400 text-xs">Live</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
