import React, { useEffect, useState } from 'react';
import { ShoppingBag, Filter, RefreshCw, Calendar, ChevronDown, Receipt, MapPin, AlertTriangle, Search, X } from 'lucide-react';
import { getOrders, updateOrderStatus, getOrderBreakdown, getCancelEligibility, cancelOrder, combineOrders } from '../services/api';
import type { CancelEligibility } from '../services/api';
import type { Order, QuoteCalculateResponse } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { fmtAs } from '../utils/currency';
import { currencyForCountry } from '../utils/countries';
import { fmtDims } from '../utils/size';

type Breakdown = QuoteCalculateResponse & {
  stored_final_price: number | null;
  price_currency: string;
  customer_country: string | null;
  shipping_address: string | null;
  margin_locked: boolean;
  gst_locked: boolean;
};

const ALL_STATUSES = ['pending', 'in_production', 'quality_check', 'shipped', 'delivered', 'cancelled'];

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  in_production: 'In Production',
  quality_check: 'Quality Check',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const statusClass: Record<string, string> = {
  pending: 'badge-pending',
  in_production: 'badge-production',
  quality_check: 'badge-quality',
  shipped: 'badge-shipped',
  delivered: 'badge-delivered',
  cancelled: 'badge-cancelled',
};

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const Orders: React.FC = () => {
  const { user } = useAuth();
  // Order totals shown per-row use the currency implied by that customer's own country
  // (falling back to the tenant's display currency when unmapped/unsupported).
  const fmtForCustomer = (n: number, currency: string | null | undefined, country: string | null | undefined) =>
    fmtAs(n, currency, currencyForCountry(country, user!.tenant.currency), user!.tenant);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [breakdowns, setBreakdowns] = useState<Record<number, Breakdown | 'loading' | 'error'>>({});
  const [shipPrompt, setShipPrompt] = useState<{ orderId: number; value: string } | null>(null);

  // Cancel order + refund confirmation
  const [cancelModal, setCancelModal] = useState<{ orderId: number; eligibility: CancelEligibility | 'loading' | 'error' } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Combine multiple pending orders (same customer) into one
  const [selectedForCombine, setSelectedForCombine] = useState<number[]>([]);
  const [combineModalOpen, setCombineModalOpen] = useState(false);
  const [combining, setCombining] = useState(false);
  const [combineError, setCombineError] = useState('');

  const toggleCombineSelect = (orderId: number) => {
    setSelectedForCombine((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]));
  };

  const handleConfirmCombine = async () => {
    setCombining(true);
    setCombineError('');
    try {
      const merged = await combineOrders(selectedForCombine);
      setOrders((prev) => {
        const withoutMerged = prev.filter((o) => !selectedForCombine.includes(o.id) || o.id === merged.id);
        return withoutMerged.map((o) => (o.id === merged.id ? merged : o));
      });
      setSelectedForCombine([]);
      setCombineModalOpen(false);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to combine orders.';
      setCombineError(msg);
    } finally {
      setCombining(false);
    }
  };

  const openCancelModal = async (orderId: number) => {
    setCancelError('');
    setCancelModal({ orderId, eligibility: 'loading' });
    try {
      const eligibility = await getCancelEligibility(orderId);
      setCancelModal({ orderId, eligibility });
    } catch {
      setCancelModal({ orderId, eligibility: 'error' });
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModal) return;
    setCancelling(true);
    setCancelError('');
    try {
      const updated = await cancelOrder(cancelModal.orderId);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setCancelModal(null);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to cancel order.';
      setCancelError(msg);
    } finally {
      setCancelling(false);
    }
  };

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
    if (next !== null && (!breakdowns[next] || breakdowns[next] === 'error')) {
      setBreakdowns((prev) => ({ ...prev, [next]: 'loading' }));
      getOrderBreakdown(next)
        .then((data) => setBreakdowns((prev) => ({ ...prev, [next]: data })))
        .catch(() => setBreakdowns((prev) => ({ ...prev, [next]: 'error' })));
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: string, shippingCost?: number) => {
    setUpdatingId(orderId);
    try {
      const updated = await updateOrderStatus(orderId, newStatus, shippingCost);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch {
      // silently fail
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmShipped = async (orderId: number) => {
    if (!shipPrompt || shipPrompt.orderId !== orderId) return;
    await handleStatusChange(orderId, 'shipped', parseFloat(shipPrompt.value) || 0);
    setShipPrompt(null);
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

      {/* Combine-orders action bar */}
      {selectedForCombine.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-gold-900/10 border border-gold-700/30 rounded-lg px-4 py-2.5 flex-wrap">
          <p className="text-gold-300 text-sm">{selectedForCombine.length} order{selectedForCombine.length === 1 ? '' : 's'} selected</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedForCombine([])} className="text-dark-400 hover:text-cream-200 text-xs transition-colors">
              Clear
            </button>
            <button
              onClick={() => setCombineModalOpen(true)}
              disabled={selectedForCombine.length < 2}
              className="bg-gold-600 hover:bg-gold-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Combine into One Order ({selectedForCombine.length})
            </button>
          </div>
        </div>
      )}

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
            const itemCount = order.items?.length ?? (quote ? 1 : 0);
            const orderTotal = order.items && order.items.length > 0
              ? order.items.reduce((sum, it) => sum + (it.quote?.final_price ?? 0), 0)
              : quote?.final_price ?? 0;
            return (
              <div key={order.id} className="card space-y-0 overflow-hidden">
                {/* Row */}
                <div
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={() => toggleExpand(order.id)}
                >
                  {order.status === 'pending' && (
                    <input
                      type="checkbox"
                      checked={selectedForCombine.includes(order.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleCombineSelect(order.id)}
                      className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-gold-600 focus:ring-gold-600/50 flex-shrink-0"
                      title="Select to combine with other pending orders"
                    />
                  )}
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
                      {quote?.rug_catalog?.name ?? 'Custom Rug'}{itemCount > 1 ? ` +${itemCount - 1} more` : ''} · {quote?.customer?.name ?? 'No customer'}
                    </p>
                  </div>

                  <div className="hidden sm:flex items-center gap-1 text-dark-400 text-xs">
                    <Calendar size={12} />
                    Est: {fmtDate(order.estimated_delivery)}
                  </div>

                  {orderTotal > 0 && (
                    <div className="text-gold-400 font-semibold text-sm flex-shrink-0">
                      {fmtForCustomer(orderTotal, quote?.price_currency, quote?.customer?.country)}
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
                    {itemCount > 1 && order.items && (
                      <div className="bg-dark-800 border border-dark-700 rounded-lg divide-y divide-dark-700">
                        {order.items.map((it) => (
                          <div key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                            <span className="text-cream-200">{it.quote?.rug_catalog?.name ?? 'Custom Rug'} × {it.quote?.qty ?? 1}</span>
                            {it.quote?.final_price != null && (
                              <span className="text-gold-400">{fmtForCustomer(it.quote.final_price, it.quote.price_currency, it.quote.customer?.country)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
                              {fmtDims(quote?.custom_size_w, quote?.custom_size_h, user!.tenant.default_size_unit ?? 'ft')}
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
                          {order.shipping_cost != null && (
                            <div className="flex justify-between">
                              <span className="text-dark-400">Shipping cost</span>
                              <span className="text-cream-200">{order.shipping_cost > 0 ? fmtForCustomer(order.shipping_cost, quote?.price_currency, quote?.customer?.country) : 'Free'}</span>
                            </div>
                          )}
                          {order.promo_code && (
                            <div className="flex justify-between">
                              <span className="text-dark-400">Promo applied</span>
                              <span className="text-green-400">
                                {order.promo_code}{order.discount_amount ? ` (−${fmtForCustomer(order.discount_amount, quote?.price_currency, quote?.customer?.country)})` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status controls */}
                      <div className="space-y-2">
                        <h4 className="text-cream-400 text-xs uppercase tracking-wider">Update Status</h4>
                        <div className="grid grid-cols-1 gap-1.5">
                          {ALL_STATUSES.filter((s) => s !== 'cancelled').map((s) => (
                            <button
                              key={s}
                              disabled={order.status === s || updatingId === order.id}
                              onClick={() => {
                                if (s === 'shipped') {
                                  setShipPrompt({
                                    orderId: order.id,
                                    value: String(order.shipping_cost ?? user!.tenant.default_shipping_rate ?? 0),
                                  });
                                } else {
                                  handleStatusChange(order.id, s);
                                }
                              }}
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
                        {shipPrompt?.orderId === order.id && (
                          <div className="bg-dark-800 border border-gold-600/40 rounded-lg p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <label className="text-dark-400 text-xs">Shipping cost ({user!.tenant.base_currency})</label>
                            <input
                              type="number" min="0" step="0.01" autoFocus
                              value={shipPrompt.value}
                              onChange={(e) => setShipPrompt({ orderId: order.id, value: e.target.value })}
                              className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-1.5 text-cream-100 text-sm focus:outline-none focus:border-gold-600/60"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleConfirmShipped(order.id)}
                                disabled={updatingId === order.id}
                                className="flex-1 bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                              >
                                {updatingId === order.id ? 'Saving…' : 'Confirm Shipped'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShipPrompt(null)}
                                className="px-3 text-dark-400 hover:text-cream-200 text-xs transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Cancel order + refund */}
                        {order.status === 'cancelled' ? (
                          order.refund_id ? (
                            <div className="bg-red-900/10 border border-red-700/30 rounded-lg p-3 text-xs space-y-1">
                              <p className="text-red-300 font-semibold">
                                Refunded {fmtForCustomer(order.refund_amount ?? 0, order.quote?.price_currency, order.quote?.customer?.country)}
                              </p>
                              <p className="text-dark-500">
                                Razorpay status: {order.refund_status ?? 'processed'}
                                {order.refunded_at && ` · ${fmtDate(order.refunded_at)}`}
                              </p>
                            </div>
                          ) : (
                            <p className="text-dark-500 text-xs">Cancelled — no online payment on file, nothing to refund.</p>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => openCancelModal(order.id)}
                            className="w-full text-sm px-3 py-2 rounded-lg border border-red-800/50 bg-red-950/20 text-red-400 hover:bg-red-900/30 transition-colors text-left"
                          >
                            Cancel Order
                          </button>
                        )}
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
                          <button
                            onClick={() => {
                              setBreakdowns((prev) => ({ ...prev, [order.id]: 'loading' }));
                              getOrderBreakdown(order.id)
                                .then((data) => setBreakdowns((prev) => ({ ...prev, [order.id]: data })))
                                .catch(() => setBreakdowns((prev) => ({ ...prev, [order.id]: 'error' })));
                            }}
                            className="text-gold-400 hover:text-gold-300 underline ml-1"
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {typeof bd === 'object' && (() => {
                        const currency = bd.price_currency || quote?.price_currency || 'INR';
                        const country = bd.customer_country ?? quote?.customer?.country;
                        const fmtB = (n: number) => fmtForCustomer(n, currency, country);
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
                                <p className="text-dark-400 mb-0.5">Catalog price</p>
                                <p className="text-cream-200 font-medium">{fmtB(bd.catalog_price_per_piece)} / rug</p>
                              </div>
                            </div>
                            {(!bd.margin_locked || !bd.gst_locked) && (
                              <p className="text-amber-500/80 text-xs flex items-center gap-1">
                                <AlertTriangle size={10} />
                                Rates reflect current settings — order predates rate locking.
                              </p>
                            )}
                            {!bd.moq_met && (
                              <p className="text-amber-500/80 text-xs flex items-center gap-1">
                                <AlertTriangle size={10} />
                                {bd.moq_message}
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
                              {bd.gst_inclusive && (
                                <>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-dark-400">Pre-tax total</span>
                                    <span className="text-cream-200">{fmtB(bd.pre_gst_price)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-blue-400">GST ({bd.gst_pct.toFixed(0)}%)</span>
                                    <span className="text-blue-300">+{fmtB(bd.gst_amount)}</span>
                                  </div>
                                </>
                              )}
                              <div className="flex justify-between text-base font-bold pt-1 border-t border-dark-600">
                                <span className="text-cream-100">{bd.gst_inclusive ? 'Total (incl. GST)' : 'Total'}</span>
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

      {/* Cancel Order + Refund Confirmation Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-400" />
                <h2 className="text-cream-100 font-semibold">Cancel Order #{cancelModal.orderId}</h2>
              </div>
              <button onClick={() => setCancelModal(null)} className="text-dark-400 hover:text-cream-300"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {cancelModal.eligibility === 'loading' && (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {cancelModal.eligibility === 'error' && (
                <p className="text-red-400 text-sm">Could not check cancellation eligibility. Please try again.</p>
              )}
              {cancelModal.eligibility !== 'loading' && cancelModal.eligibility !== 'error' && (() => {
                const elig = cancelModal.eligibility as CancelEligibility;
                if (!elig.eligible) {
                  return (
                    <div className="flex items-start gap-2 bg-red-900/20 border border-red-600/30 rounded-lg p-3 text-red-400 text-sm">
                      <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                      <span>{elig.reason}</span>
                    </div>
                  );
                }
                return (
                  <>
                    {elig.has_payment ? (
                      <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 space-y-2">
                        <p className="text-cream-200 text-sm">
                          This order was paid online. Cancelling while the order is{' '}
                          <span className="text-cream-100 font-medium">{elig.status.replace('_', ' ')}</span> refunds{' '}
                          <span className="text-gold-400 font-semibold">
                            {Math.round(elig.refund_pct * 100)}%
                          </span>{' '}
                          per policy —{' '}
                          <span className="text-gold-400 font-semibold">
                            {fmtAs(elig.refund_amount, elig.price_currency, elig.price_currency, user!.tenant)}
                          </span>{' '}
                          to the customer via Razorpay.
                        </p>
                        <p className="text-dark-500 text-xs">
                          Refunds are processed instantly when possible, otherwise within 5–7 business days.
                        </p>
                      </div>
                    ) : (
                      <p className="text-dark-400 text-sm">
                        No online payment is on file for this order — cancelling will just update its status, with nothing to refund.
                      </p>
                    )}
                  </>
                );
              })()}
              {cancelError && (
                <div className="flex items-center gap-2 bg-red-900/20 border border-red-600/30 rounded-lg p-2.5 text-red-400 text-xs">
                  <AlertTriangle size={13} /> {cancelError}
                </div>
              )}
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setCancelModal(null)} className="flex-1 py-2.5 rounded-xl border border-dark-600 text-dark-300 text-sm hover:bg-dark-700 transition-colors">
                Keep Order
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={
                  cancelling ||
                  cancelModal.eligibility === 'loading' ||
                  cancelModal.eligibility === 'error' ||
                  !(cancelModal.eligibility as CancelEligibility).eligible
                }
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {cancelling ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <AlertTriangle size={14} />}
                {cancelling ? 'Cancelling…' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Combine Orders Confirmation Modal */}
      {combineModalOpen && (() => {
        const selectedOrders = orders.filter((o) => selectedForCombine.includes(o.id));
        const combinedTotal = selectedOrders.reduce((sum, o) => {
          const t = o.items && o.items.length > 0
            ? o.items.reduce((s, it) => s + (it.quote?.final_price ?? 0), 0)
            : o.quote?.final_price ?? 0;
          return sum + t;
        }, 0);
        const anyCurrency = selectedOrders[0]?.quote?.price_currency;
        const anyCountry = selectedOrders[0]?.quote?.customer?.country;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={16} className="text-gold-400" />
                  <h2 className="text-cream-100 font-semibold">Combine {selectedOrders.length} Orders</h2>
                </div>
                <button onClick={() => setCombineModalOpen(false)} className="text-dark-400 hover:text-cream-300"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-dark-800 border border-dark-700 rounded-lg divide-y divide-dark-700">
                  {selectedOrders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-cream-200">
                        Order #{o.id} — {o.quote?.rug_catalog?.name ?? 'Custom Rug'}{o.items && o.items.length > 1 ? ` +${o.items.length - 1} more` : ''}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-dark-400 text-sm">
                  These will merge into a single order (kept as the lowest-numbered one), with one shipping charge and a combined total of{' '}
                  <span className="text-gold-400 font-semibold">{fmtForCustomer(combinedTotal, anyCurrency, anyCountry)}</span>.
                  The other order records will be removed.
                </p>
                {combineError && (
                  <div className="flex items-center gap-2 bg-red-900/20 border border-red-600/30 rounded-lg p-2.5 text-red-400 text-xs">
                    <AlertTriangle size={13} /> {combineError}
                  </div>
                )}
              </div>
              <div className="flex gap-3 px-5 pb-5">
                <button onClick={() => setCombineModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-dark-600 text-dark-300 text-sm hover:bg-dark-700 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCombine}
                  disabled={combining}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold-600 hover:bg-gold-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {combining ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ShoppingBag size={14} />}
                  {combining ? 'Combining…' : 'Confirm Combine'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Orders;
