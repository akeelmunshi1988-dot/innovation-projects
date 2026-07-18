import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  DollarSign,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getDashboardStats } from '../services/api';
import type { DashboardStats } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { fmtTenant } from '../utils/currency';

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: 'badge-pending',
    in_production: 'badge-production',
    quality_check: 'badge-quality',
    shipped: 'badge-shipped',
    delivered: 'badge-delivered',
    draft: 'badge-draft',
    sent: 'badge-sent',
    accepted: 'badge-accepted',
    rejected: 'badge-rejected',
  };
  return map[status] ?? 'badge-draft';
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const fmt = (n: number, currency?: string | null) => fmtTenant(n, user!.tenant, currency);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch {
      setError('Failed to load dashboard data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-dark-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="card text-center max-w-md">
          <AlertTriangle size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-cream-200 font-semibold mb-2">Connection Error</p>
          <p className="text-dark-400 text-sm mb-4">{error}</p>
          <button onClick={fetchStats} className="btn-primary flex items-center gap-2 mx-auto">
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: 'Total Orders',
      value: stats.total_orders.toString(),
      icon: <ShoppingBag size={22} className="text-blue-400" />,
      bg: 'bg-blue-900/20 border-blue-700/30',
      sub: `${stats.orders_pending} pending · ${stats.orders_in_production} in production`,
    },
    {
      label: 'Total Revenue',
      value: fmt(stats.total_revenue),
      icon: <DollarSign size={22} className="text-green-400" />,
      bg: 'bg-green-900/20 border-green-700/30',
      sub: 'From accepted quotes',
    },
    {
      label: 'Active Quotes',
      value: stats.active_quotes.toString(),
      icon: <FileText size={22} className="text-gold-400" />,
      bg: 'bg-gold-900/20 border-gold-700/30',
      sub: 'Draft + sent',
    },
    {
      label: 'Low Stock Alerts',
      value: stats.low_stock_materials.toString(),
      icon: <AlertTriangle size={22} className={stats.low_stock_materials > 0 ? 'text-red-400' : 'text-dark-400'} />,
      bg: stats.low_stock_materials > 0
        ? 'bg-red-900/20 border-red-700/30'
        : 'bg-dark-800 border-dark-700',
      sub: 'Materials below 50 sqm',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cream-100">Dashboard</h1>
          <p className="text-dark-400 text-sm mt-1">Overview of your manufacturing operations</p>
        </div>
        <button onClick={fetchStats} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`card border ${card.bg} space-y-3`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-cream-400 text-xs font-medium uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-bold text-cream-100 mt-1">{card.value}</p>
              </div>
              <div className="p-2 bg-dark-800 rounded-lg">{card.icon}</div>
            </div>
            <p className="text-dark-400 text-xs">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-gold-400" />
            <h2 className="text-cream-100 font-semibold">Monthly Revenue</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.monthly_revenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2a25" />
              <XAxis dataKey="month" tick={{ fill: '#6b6358', fontSize: 11 }} />
              <YAxis
                tick={{ fill: '#6b6358', fontSize: 11 }}
                tickFormatter={(v) => fmt(v / 1000).replace(/\.00$/, '') + 'k'}
              />
              <Tooltip
                contentStyle={{ background: '#1e1b17', border: '1px solid #3c3630', borderRadius: 8 }}
                labelStyle={{ color: '#f9f4ec' }}
                formatter={(v: number) => [fmt(v), 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#d97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick actions */}
        <div className="card space-y-3">
          <h2 className="text-cream-100 font-semibold mb-1">Quick Actions</h2>
          {[
            { to: '/assistant', label: 'Ask AI Assistant', icon: '🤖', desc: 'Get instant answers' },
            { to: '/quote-builder', label: 'Build a Quote', icon: '📋', desc: 'Calculate pricing' },
            { to: '/catalog', label: 'View Catalog', icon: '📖', desc: 'Browse all rugs' },
            { to: '/inventory', label: 'Check Inventory', icon: '📦', desc: 'Stock levels' },
          ].map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex items-center gap-3 p-3 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors group"
            >
              <span className="text-lg">{action.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-cream-200 text-sm font-medium">{action.label}</p>
                <p className="text-dark-400 text-xs">{action.desc}</p>
              </div>
              <ArrowRight size={14} className="text-dark-500 group-hover:text-gold-400 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-gold-400" />
              <h2 className="text-cream-100 font-semibold">Recent Orders</h2>
            </div>
            <Link to="/orders" className="text-gold-500 hover:text-gold-400 text-xs flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {stats.recent_orders.length === 0 ? (
            <p className="text-dark-500 text-sm text-center py-6">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recent_orders.map((order) => (
                <div key={order.id} className="flex items-center gap-3 p-3 bg-dark-800 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-cream-200 text-sm font-medium truncate">
                      {order.rug_name ?? 'Custom Rug'}
                    </p>
                    <p className="text-dark-400 text-xs truncate">
                      {order.customer_name ?? 'Walk-in'} · #{order.id}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={statusBadge(order.status)}>{order.status.replace('_', ' ')}</span>
                    {order.final_price && (
                      <p className="text-gold-400 text-xs mt-1">{fmt(order.final_price, order.price_currency)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent quotes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-gold-400" />
              <h2 className="text-cream-100 font-semibold">Recent Quotes</h2>
            </div>
            <Link to="/quote-builder" className="text-gold-500 hover:text-gold-400 text-xs flex items-center gap-1">
              New quote <ArrowRight size={12} />
            </Link>
          </div>
          {stats.recent_quotes.length === 0 ? (
            <p className="text-dark-500 text-sm text-center py-6">No quotes yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recent_quotes.map((quote) => (
                <div key={quote.id} className="flex items-center gap-3 p-3 bg-dark-800 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-cream-200 text-sm font-medium truncate">
                      {quote.rug_name ?? 'Custom Rug'} × {quote.qty}
                    </p>
                    <p className="text-dark-400 text-xs truncate">
                      {quote.customer_name ?? 'No customer'} · #{quote.id}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={statusBadge(quote.status)}>{quote.status}</span>
                    {quote.final_price && (
                      <p className="text-gold-400 text-xs mt-1">{fmt(quote.final_price, quote.price_currency)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
