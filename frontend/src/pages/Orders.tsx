import React, { useEffect, useState } from 'react';
import { ShoppingBag, Filter, RefreshCw, Calendar, ChevronDown, Receipt, MapPin, AlertTriangle, Search, X } from 'lucide-react';
import { getOrders, updateOrderStatus, getOrderBreakdown } from '../services/api';
import type { Order, QuoteCalculateResponse } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { fmtTenant } from '../utils/currency';

type Breakdown = QuoteCalculateResponse & {
  stored_final_price: number | null;
  price_currency: string;
  shipping_address: string | null;
  margin_locked: boolean;
  gst_locked: boolean;
};

const ALL_STATUSES = ['pending', 'in_production', 'quality_check', 'shipped', 'delivered'];

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  in_production: 'In Production',
  quality_check: 'Quality Check',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

const statusClass: Record<string, string> = {
  pending: 'badge-pending',
  in_production: 'badge-production',
  quality_check: 'badge-quality',
  shipped: 'badge-shipped',
  delivered: 'badge-delivered',
};

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const Orders: React.FC = () => {
  const { user } = useAuth();
  const fmt = (n: number, currency?: string | null) => fmtTenant(n, user!.tenant, currency);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [breakdowns, setBreakdowns] = useState<Record<number, Breakdown | 'loading' | 'error'>>({});

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await getOrders(filterStatus || undefined, search || undefined);
      setOrders(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const toggleExpand = (orderId: number) => {
    const next = expandedId === orderId ? null : orderId;
    setExpandedId(next);
    if (next !== null && !breakdowns[next]) {
      setBreakdowns((prev) => ({ ...prev, [next]: 'loading' }));
      getOrderBreakdown(next)
        .then((data) => setBreakdowns((prev) => ({ ...prev, [next]: data })))
        .catch(() => setBreakdowns((prev) => ({ ...prev, [next]: 'error' })));
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const updated = await updateOrderStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch {
      // silently fail
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShoppingBag size={22} className="text-gold-400" />
          <div>
            <h1 className="text-2xl font-bold text-cream-100">Orders</h1>
            <p className="text-dark-400 text-sm">{orders.length} orders</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex items-center gap-1.5">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer, rug…"
                className="input-field text-sm pl-7 pr-7 w-44"
              />
              {search && (
                <button type="button" onClick={() => { setSearch(''); fetchOrders(); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
                  <X size={12} />
                </button>
              )}
            </div>
            <button type="submit" className="btn-secondary text-xs px-3 py-2">Search</button>
          </form>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-dark-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field text-sm pr-8"
            >
              <option value="">All statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel[s]}
                </option>
              ))}
            </select>
          </div>
          <button onClick={fetchOrders} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus('')}
          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
            filterStatus === ''
              ? 'bg-gold-600/20 text-gold-400 border-gold-600/40'
              : 'bg-dark-800 text-dark-400 border-dark-700 hover:text-cream-200'
          }`}
        >
          All
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              filterStatus === s
                ? 'bg-gold-600/20 text-gold-400 border-gold-600/40'
                : 'bg-dark-800 text-dark-400 border-dark-700 hover:text-cream-200'
            }`}
          >
            {statusLabel[s]}
          </button>
        ))}
      </div>

      {/* Orders table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-16">
          <ShoppingBag size={36} className="text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const quote = order.quote;
            const isExpanded = expandedId === order.id;
            const bd = breakdowns[order.id];
            return (
              <div key={order.id} className="card space-y-0 overflow-hidden">
                {/* Row */}
                <div
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={() => toggleExpand(order.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-cream-100 font-semibold text-sm">Order #{order.id}</span>
                      <span className={statusClass[order.status]}>{statusLabel[order.status]}</span>
                      {quote?.rush_order && (
                        <span className="text-xs bg-orange-900/50 text-orange-300 border border-orange-700/50 px-2 py-0.5 rounded-full">
                          EARLY
                        </span>
                      )}
                    </div>
                    <p className="text-dark-400 text-xs mt-0.5 truncate">
                      {quote?.rug_catalog?.name ?? 'Custom Rug'} · {quote?.customer?.name ?? 'No customer'}
                    </p>
                  </div>

                  <div className="hidden sm:flex items-center gap-1 text-dark-400 text-xs">
                    <Calendar size={12} />
                    Est: {fmtDate(order.estimated_delivery)}
                  </div>

                  {quote?.final_price && (
                    <div className="text-gold-400 font-semibold text-sm flex-shrink-0">
                      {fmt(quote.final_price, quote?.price_currency)}
                    </div>
                  )}

                  <ChevronDown
                    size={16}
                    className={`text-dark-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-dark-700 space-y-4">
                    {/* Top row: order info + status controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Order details */}
                      <div className="space-y-2">
                        <h4 className="text-cream-400 text-xs uppercase tracking-wider">Order Details</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-dark-400">Rug</span>
                            <span className="text-cream-200">{quote?.rug_catalog?.name ?? '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-dark-400">Size</span>
                            <span className="text-cream-200">
                              {quote?.custom_size_w && quote?.custom_size_h
                                ? `${quote.custom_size_w} × ${quote.custom_size_h} m`
                                : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-dark-400">Qty</span>
                            <span className="text-cream-200">{quote?.qty ?? '—'} pcs</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-dark-400">Material</span>
                            <span className="text-cream-200">{quote?.material?.name ?? '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-dark-400">Customer</span>
                            <span className="text-cream-200">{quote?.customer?.name ?? '—'}</span>
                          </div>
                          {typeof bd === 'object' && bd.shipping_address && (
                            <div className="flex justify-between gap-2">
                              <span className="text-dark-400 flex items-center gap-1 flex-shrink-0">
                                <MapPin size={11} /> Ship to
                              </span>
                              <span className="text-cream-300 text-xs text-right">{bd.shipping_address}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status controls */}
                      <div className="space-y-2">
                        <h4 className="text-cream-400 text-xs uppercase tracking-wider">Update Status</h4>
                        <div className="grid grid-cols-1 gap-1.5">
                          {ALL_STATUSES.map((s) => (
                            <button
                              key={s}
                              disabled={order.status === s || updatingId === order.id}
                              onClick={() => handleStatusChange(order.id, s)}
                              className={`
                                text-sm px-3 py-2 rounded-lg border text-left transition-all
                                ${order.status === s
                                  ? 'bg-gold-600/20 border-gold-600/40 text-gold-300 font-semibold'
                                  : 'bg-dark-800 border-dark-700 text-dark-400 hover:text-cream-200 hover:border-dark-600'
                                }
                                disabled:opacity-50 disabled:cursor-not-allowed
                              `}
                            >
                              {statusLabel[s]}{order.status === s && ' ✓'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Cost calculation panel */}
                    <div className="bg-dark-800 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-dark-700">
                        <Receipt size={14} className="text-gold-400" />
                        <h4 className="text-cream-200 text-xs font-semibold uppercase tracking-wider">Cost Calculation</h4>
                      </div>

                      {bd === 'loading' && (
                        <div className="flex justify-center py-6">
                          <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}

                      {bd === 'error' && (
                        <div className="flex items-center gap-2 px-4 py-4 text-red-400 text-xs">
                          <AlertTriangle size={13} />
                          Could not load calculation — quote may be missing size or material data.
                        </div>
                      )}

                      {typeof bd === 'object' && (() => {
                        const currency = bd.price_currency || quote?.price_currency || 'INR';
                        const fmtB = (n: number) => fmt(n, currency);
                        return (
                          <div className="p-4 space-y-3">
                            {/* Rate info row */}
                            <div className="grid grid-cols-3 gap-2 text-xs text-center">
                              <div className="bg-dark-700/60 rounded-lg px-2 py-2">
                                <p className="text-dark-400 mb-0.5">Material cost</p>
                                <p className="text-cream-200 font-medium">{fmtB(bd.material_cost_per_sqm)}/sqm</p>
                              </div>
                              <div className="bg-dark-700/60 rounded-lg px-2 py-2">
                                <p className="text-dark-400 mb-0.5">
                                  Margin
                                  {bd.margin_locked && (
                                    <span className="ml-1 text-gold-500" title="Locked at order time">🔒</span>
                                  )}
                                </p>
                                <p className="text-cream-200 font-medium">{bd.profit_margin_pct.toFixed(0)}%</p>
                              </div>
                              <div className="bg-dark-700/60 rounded-lg px-2 py-2">
                                <p className="text-dark-400 mb-0.5">Selling rate</p>
                                <p className="text-cream-200 font-medium">{fmtB(bd.base_price_per_sqm)}/sqm</p>
                              </div>
                            </div>
                            {(!bd.margin_locked || !bd.gst_locked) && (
                              <p className="text-amber-500/80 text-xs flex items-center gap-1">
                                <AlertTriangle size={10} />
                                Rates reflect current settings — order predates rate locking.
                              </p>
                            )}

                            {/* Breakdown lines */}
                            <div className="space-y-1.5">
                              {bd.breakdown.map((item, i) => {
                                const label = item.label ?? item.rule ?? '';
                                const isGst = label.toLowerCase().startsWith('gst');
                                const isDiscount = item.amount < 0;
                                const isRush = (item as { type?: string }).type === 'rush_fee';
                                return (
                                  <div key={i} className={`flex items-start justify-between gap-3 py-1.5 text-sm ${
                                    i < bd.breakdown.length - 1 ? 'border-b border-dark-700' : ''
                                  }`}>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-medium ${isGst ? 'text-blue-300' : isDiscount ? 'text-green-400' : isRush ? 'text-orange-300' : 'text-cream-300'}`}>
                                        {label}
                                      </p>
                                      {item.description && (
                                        <p className="text-dark-500 text-xs mt-0.5 truncate">{item.description}</p>
                                      )}
                                    </div>
                                    <span className={`text-sm font-semibold flex-shrink-0 ${
                                      isGst ? 'text-blue-300' : isDiscount ? 'text-green-400' : 'text-cream-100'
                                    }`}>
                                      {item.amount < 0
                                        ? `−${fmtB(Math.abs(item.amount))}`
                                        : `+${fmtB(item.amount)}`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Totals */}
                            <div className="border-t border-dark-600 pt-3 space-y-1.5">
                              <div className="flex justify-between text-sm">
                                <span className="text-dark-400">Pre-tax total</span>
                                <span className="text-cream-200">{fmtB(bd.pre_gst_price)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-blue-400">GST ({bd.gst_pct.toFixed(0)}%)</span>
                                <span className="text-blue-300">+{fmtB(bd.gst_amount)}</span>
                              </div>
                              <div className="flex justify-between text-base font-bold pt-1 border-t border-dark-600">
                                <span className="text-cream-100">Total (incl. GST)</span>
                                <span className="text-gold-400">{fmtB(bd.final_price)}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-dark-500">Per piece</span>
                                <span className="text-dark-400">{fmtB(bd.price_per_piece)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Orders;
