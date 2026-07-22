import { useState, useEffect } from 'react';
import { Search, Package, Truck, Clock, MapPin, AlertTriangle, ChevronDown, ChevronUp, Download, LogIn, RefreshCw, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import { getMyOrders, getCustomerOrderBreakdown } from '../services/api';
import type { CustomerOrder, OrderBreakdown } from '../services/api';
import { fmtExact } from '../utils/currency';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import axios from 'axios';

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  pending:       { label: 'Order Placed',   color: 'text-amber-700 border-amber-200 bg-amber-50',    dot: 'bg-amber-400' },
  confirmed:     { label: 'Confirmed',      color: 'text-blue-700 border-blue-200 bg-blue-50',       dot: 'bg-blue-500' },
  in_production: { label: 'In Production',  color: 'text-purple-700 border-purple-200 bg-purple-50', dot: 'bg-purple-500' },
  shipped:       { label: 'Shipped',        color: 'text-teal-700 border-teal-200 bg-teal-50',       dot: 'bg-teal-500' },
  delivered:     { label: 'Delivered',      color: 'text-green-700 border-green-200 bg-green-50',    dot: 'bg-green-500' },
  cancelled:     { label: 'Cancelled',      color: 'text-red-600 border-red-200 bg-red-50',          dot: 'bg-red-400' },
};

function OrderCard({ order, email, customerToken }: { order: CustomerOrder; email: string; customerToken: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [breakdown, setBreakdown] = useState<OrderBreakdown | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState(false);
  const currency = order.price_currency || 'INR';
  const fmt = (n: number) => fmtExact(n, currency);
  const meta = STATUS_META[order.status] ?? { label: order.status, color: 'text-stone-500 border-stone-200 bg-stone-50', dot: 'bg-stone-300' };

  const handleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !breakdown && !breakdownLoading) {
      setBreakdownLoading(true);
      setBreakdownError(false);
      try {
        const bd = await getCustomerOrderBreakdown(order.order_id, email);
        setBreakdown(bd);
      } catch {
        setBreakdownError(true);
      } finally {
        setBreakdownLoading(false);
      }
    }
  };

  const downloadInvoice = async () => {
    if (!customerToken) return;
    setDownloading(true);
    try {
      const response = await axios.get(`/api/customer/orders/${order.order_id}/invoice`, {
        headers: { Authorization: `Bearer ${customerToken}` },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-order-${order.order_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    } finally {
      setDownloading(false);
    }
  };

  const bd = breakdown;

  return (
    <div className="border border-stone-200">
      <button
        onClick={handleExpand}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-stone-50 transition-colors"
      >
        <Package size={16} className="text-stone-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-serif text-base font-light text-stone-900 truncate">{order.rug_name}</p>
          <p className="text-stone-400 text-xs mt-0.5">Order #{order.order_id} · {order.created_at ?? '—'}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {order.final_price != null && (
            <span className="text-stone-900 font-medium text-sm">{fmt(order.final_price)}</span>
          )}
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 border font-medium ${meta.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
            {meta.label}
          </span>
          {expanded ? <ChevronUp size={13} className="text-stone-400" /> : <ChevronDown size={13} className="text-stone-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-stone-100 px-5 py-5 space-y-4 bg-white">

          {/* Specs grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4">
            <div>
              <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">
                {order.rug_shape === 'circle' ? 'Diameter' : 'Size'} (per piece)
              </p>
              <p className="text-stone-900 text-sm">{order.size}</p>
              {order.size_sqm != null && (
                <p className="text-stone-400 text-xs mt-0.5">{order.size_sqm.toFixed(2)} m²</p>
              )}
            </div>
            <div>
              <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Quantity</p>
              <p className="text-stone-900 text-sm">{order.qty} pc{order.qty !== 1 ? 's' : ''}</p>
              {order.total_sqm != null && (
                <p className="text-stone-400 text-xs mt-0.5">{order.total_sqm.toFixed(2)} m² total</p>
              )}
            </div>
            <div>
              <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Est. Delivery</p>
              <p className="text-stone-900 text-sm flex items-center gap-1">
                <Clock size={11} className="text-stone-400" />
                {order.estimated_delivery ? `By ${order.estimated_delivery}` : 'TBD'}
              </p>
            </div>
            <div>
              <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Type</p>
              <p className={`text-sm ${order.rush_order ? 'text-amber-600' : 'text-stone-500'}`}>
                {order.rush_order ? 'Early Delivery' : 'Standard'}
              </p>
            </div>
            {order.material_name && (
              <div>
                <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Material</p>
                <p className="text-stone-900 text-sm">{order.material_name}</p>
              </div>
            )}
            {order.weave_type && (
              <div>
                <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Weave</p>
                <p className="text-stone-900 text-sm capitalize">{order.weave_type}</p>
              </div>
            )}
            {order.price_per_piece != null && order.qty > 1 && (
              <div>
                <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Price / Piece</p>
                <p className="text-stone-900 text-sm">{fmt(order.price_per_piece)}</p>
              </div>
            )}
            {order.base_price_per_sqm != null && (
              <div>
                <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Rate / m²</p>
                <p className="text-stone-900 text-sm">{fmt(order.base_price_per_sqm)}</p>
              </div>
            )}
          </div>

          {/* Detailed price breakdown — lazy loaded from QuoteEngine */}
          <div className="border border-stone-100 bg-stone-50 px-4 py-3 space-y-1.5">
            <p className="text-stone-400 text-xs uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Layers size={11} /> Price Calculation
            </p>

            {breakdownLoading && (
              <div className="flex items-center gap-2 py-2">
                <div className="w-3.5 h-3.5 border border-stone-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-stone-400 text-xs">Loading breakdown…</span>
              </div>
            )}

            {breakdownError && (
              <p className="text-stone-400 text-xs py-1">Could not load detailed breakdown.</p>
            )}

            {bd && !breakdownLoading && (
              <>
                {/* Unit cost row */}
                <div className="flex justify-between text-xs pb-1.5 border-b border-stone-200 mb-1">
                  <span className="text-stone-500">
                    Selling rate: {fmt(bd.base_price_per_sqm)}/m² × {bd.total_sqm.toFixed(2)} m²
                  </span>
                  <span className="text-stone-700">{fmt(bd.subtotal)}</span>
                </div>

                {/* Line items from engine */}
                {bd.breakdown.slice(1).map((line, i) => {
                  const label = line.rule ?? line.label ?? '';
                  const isNegative = line.amount < 0;
                  const isRush = label.toLowerCase().includes('rush');
                  const isDiscount = isNegative || label.toLowerCase().includes('discount');
                  const colorClass = isDiscount
                    ? 'text-green-600'
                    : isRush
                    ? 'text-amber-600'
                    : label.toLowerCase().includes('gst')
                    ? 'text-stone-400'
                    : 'text-stone-500';
                  return (
                    <div key={i} className="flex justify-between text-xs">
                      <span className={colorClass}>{label}</span>
                      <span className={colorClass}>
                        {isNegative ? `−${fmt(Math.abs(line.amount))}` : `+${fmt(line.amount)}`}
                      </span>
                    </div>
                  );
                })}

                {/* Pre-tax subtotal */}
                <div className="flex justify-between text-xs pt-1.5 border-t border-stone-200">
                  <span className="text-stone-400">Pre-tax total</span>
                  <span className="text-stone-700">{fmt(bd.pre_gst_price)}</span>
                </div>

                {/* GST */}
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">GST ({bd.gst_pct.toFixed(0)}%)</span>
                  <span className="text-stone-700">+{fmt(bd.gst_amount)}</span>
                </div>

                {/* Margin note */}
                <p className="text-stone-300 text-xs pt-1">
                  Margin: {bd.profit_margin_pct.toFixed(0)}% · Material cost: {fmt(bd.material_cost_per_sqm)}/m²
                </p>
              </>
            )}

            {/* Fallback when breakdown not yet loaded — show stored fields */}
            {!bd && !breakdownLoading && !breakdownError && order.final_price != null && (
              <>
                {order.base_price != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-400">Subtotal</span>
                    <span className="text-stone-700">{fmt(order.base_price)}</span>
                  </div>
                )}
                {order.manual_discount_pct != null && order.manual_discount_pct > 0 && order.base_price != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">Discount ({order.manual_discount_pct}%)</span>
                    <span className="text-green-600">−{fmt(Math.round(order.base_price * order.manual_discount_pct) / 100)}</span>
                  </div>
                )}
                {order.rush_order && (
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-600">Early delivery surcharge</span>
                    <span className="text-amber-600">included</span>
                  </div>
                )}
                {order.pre_gst_price != null && (
                  <div className="flex justify-between text-xs pt-1 border-t border-stone-200">
                    <span className="text-stone-400">Pre-tax</span>
                    <span className="text-stone-700">{fmt(order.pre_gst_price)}</span>
                  </div>
                )}
                {order.gst_pct != null && order.gst_amount != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-400">GST ({order.gst_pct.toFixed(0)}%)</span>
                    <span className="text-stone-700">+{fmt(order.gst_amount)}</span>
                  </div>
                )}
              </>
            )}

            {/* Total line — always shown */}
            {order.final_price != null && (
              <div className="flex justify-between text-sm font-medium pt-1.5 border-t border-stone-200">
                <span className="text-stone-900">Total (incl. GST)</span>
                <span className="text-stone-900">{fmt(order.final_price)}</span>
              </div>
            )}
          </div>

          {order.shipping_address && (
            <div className="bg-stone-50 border border-stone-100 px-4 py-3">
              <p className="text-stone-400 text-xs uppercase tracking-widest mb-1 flex items-center gap-1">
                <MapPin size={11} /> Deliver To
              </p>
              <p className="text-stone-700 text-sm whitespace-pre-line">{order.shipping_address}</p>
            </div>
          )}

          {order.estimated_delivery && (
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 px-3 py-2">
              <Truck size={13} className="text-teal-600 flex-shrink-0" />
              <p className="text-stone-600 text-xs">
                Estimated delivery: <span className="text-stone-900 font-medium">{order.estimated_delivery}</span>
              </p>
            </div>
          )}

          {customerToken && (
            <button
              onClick={downloadInvoice}
              disabled={downloading}
              className="flex items-center gap-2 border border-stone-200 hover:border-stone-400 text-stone-500 hover:text-stone-900 text-xs font-medium px-4 py-2 transition-colors disabled:opacity-50 uppercase tracking-wider"
            >
              {downloading
                ? <div className="w-3.5 h-3.5 border border-stone-400 border-t-transparent rounded-full animate-spin" />
                : <Download size={13} />}
              Download Invoice
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

export default function CustomerMyOrders() {
  const { customer, customerToken, isCustomerAuthenticated } = useCustomerAuth();
  const navigate = useNavigate();

  // Authenticated state
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [sizeMin, setSizeMin] = useState('');
  const [sizeMax, setSizeMax] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Guest search state
  const [email, setEmail] = useState('');
  const [guestOrders, setGuestOrders] = useState<CustomerOrder[]>([]);
  const [guestTotal, setGuestTotal] = useState(0);
  const [guestPage, setGuestPage] = useState(1);
  const [guestLoadingMore, setGuestLoadingMore] = useState(false);
  const [searchedEmail, setSearchedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  interface FetchOpts { status: string; sortBy: string; sizeMin: string; sizeMax: string; dateFrom: string; dateTo: string; }

  const fetchOrders = async (pageNum: number, opts: FetchOpts, append: boolean) => {
    if (!customer) return;
    append ? setLoadingMore(true) : setAuthLoading(true);
    try {
      const res = await getMyOrders(customer.email, pageNum, PAGE_SIZE, {
        status: opts.status,
        sort_by: opts.sortBy,
        size_min: opts.sizeMin ? parseFloat(opts.sizeMin) : undefined,
        size_max: opts.sizeMax ? parseFloat(opts.sizeMax) : undefined,
        date_from: opts.dateFrom || undefined,
        date_to: opts.dateTo || undefined,
      });
      setTotal(res.total);
      setOrders(prev => append ? [...prev, ...res.items] : res.items);
      setPage(pageNum);
    } finally {
      append ? setLoadingMore(false) : setAuthLoading(false);
    }
  };

  const currentOpts = (): FetchOpts => ({ status: filter, sortBy, sizeMin, sizeMax, dateFrom, dateTo });

  useEffect(() => {
    if (!isCustomerAuthenticated || !customer) return;
    fetchOrders(1, currentOpts(), false);
  }, [isCustomerAuthenticated, customer?.email]);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setOrders([]);
    fetchOrders(1, { ...currentOpts(), status: newFilter }, false);
  };

  const handleSortChange = (val: string) => {
    setSortBy(val);
    setOrders([]);
    fetchOrders(1, { ...currentOpts(), sortBy: val }, false);
  };

  const handleApplyFilters = () => {
    setOrders([]);
    fetchOrders(1, currentOpts(), false);
  };

  const handleClearFilters = () => {
    setSizeMin(''); setSizeMax(''); setDateFrom(''); setDateTo('');
    setOrders([]);
    fetchOrders(1, { ...currentOpts(), sizeMin: '', sizeMax: '', dateFrom: '', dateTo: '' }, false);
  };

  const hasActiveFilters = !!(sizeMin || sizeMax || dateFrom || dateTo);

  const handleLoadMore = () => fetchOrders(page + 1, currentOpts(), true);

  const handleGuestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true); setError(null); setSearched(false);
    setGuestOrders([]); setGuestTotal(0); setGuestPage(1);
    try {
      const res = await getMyOrders(email.trim(), 1, PAGE_SIZE);
      setGuestOrders(res.items);
      setGuestTotal(res.total);
      setSearchedEmail(email.trim());
      setSearched(true);
    } catch {
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLoadMore = async () => {
    const nextPage = guestPage + 1;
    setGuestLoadingMore(true);
    try {
      const res = await getMyOrders(searchedEmail, nextPage, PAGE_SIZE);
      setGuestOrders(prev => [...prev, ...res.items]);
      setGuestPage(nextPage);
    } finally {
      setGuestLoadingMore(false);
    }
  };

  const hasMore = orders.length < total;
  const guestHasMore = guestOrders.length < guestTotal;

  // ── Authenticated view ────────────────────────────────────────────────────────
  if (isCustomerAuthenticated && customer) {
    return (
      <CustomerLayout>
        <div className="max-w-3xl mx-auto px-6">
          <div className="py-14 border-b border-stone-100 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Account</p>
              <h1 className="font-serif text-4xl font-light text-stone-900">My Orders</h1>
              <p className="text-stone-400 text-sm mt-1">
                {customer.name} · {total} order{total !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => fetchOrders(1, currentOpts(), false)}
                disabled={authLoading}
                className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-wider"
              >
                <RefreshCw size={12} className={authLoading ? 'animate-spin' : ''} /> Refresh
              </button>
              <button
                onClick={() => navigate('/my-quotes')}
                className="text-xs text-stone-500 hover:text-stone-900 transition-colors border-b border-stone-300 pb-0.5 uppercase tracking-wider"
              >
                View My Quotes
              </button>
            </div>
          </div>

          {/* Status filter tabs */}
          <div className="py-4 flex gap-2 flex-wrap border-b border-stone-100">
            {[
              { key: 'all',           label: 'All' },
              { key: 'pending',       label: 'Placed' },
              { key: 'confirmed',     label: 'Confirmed' },
              { key: 'in_production', label: 'In Production' },
              { key: 'shipped',       label: 'Shipped' },
              { key: 'delivered',     label: 'Delivered' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleFilterChange(key)}
                className={`text-xs px-3 py-1.5 border transition-colors ${
                  filter === key
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort & filter bar */}
          <div className="py-3 border-b border-stone-100">
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Sort</p>
                <select
                  value={sortBy}
                  onChange={e => handleSortChange(e.target.value)}
                  className="border border-stone-200 text-stone-700 text-xs px-2.5 py-2 focus:outline-none focus:border-stone-400 bg-white"
                >
                  <option value="date_desc">Date — Newest First</option>
                  <option value="date_asc">Date — Oldest First</option>
                  <option value="price_asc">Price — Low to High</option>
                  <option value="price_desc">Price — High to Low</option>
                </select>
              </div>

              <div>
                <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Size (m²)</p>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min="0" step="0.5"
                    value={sizeMin} onChange={e => setSizeMin(e.target.value)}
                    placeholder="Min"
                    className="w-20 border border-stone-200 text-stone-700 text-xs px-2 py-2 focus:outline-none focus:border-stone-400 placeholder-stone-300"
                  />
                  <span className="text-stone-300 text-xs">–</span>
                  <input
                    type="number" min="0" step="0.5"
                    value={sizeMax} onChange={e => setSizeMax(e.target.value)}
                    placeholder="Max"
                    className="w-20 border border-stone-200 text-stone-700 text-xs px-2 py-2 focus:outline-none focus:border-stone-400 placeholder-stone-300"
                  />
                </div>
              </div>

              <div>
                <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Date Range</p>
                <div className="flex items-center gap-1">
                  <input
                    type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="border border-stone-200 text-stone-700 text-xs px-2 py-2 focus:outline-none focus:border-stone-400"
                  />
                  <span className="text-stone-300 text-xs">–</span>
                  <input
                    type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="border border-stone-200 text-stone-700 text-xs px-2 py-2 focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>

              <div className="flex gap-2 pb-0.5">
                <button
                  onClick={handleApplyFilters}
                  className="text-xs px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white uppercase tracking-wider transition-colors"
                >
                  Apply
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="text-xs px-3 py-2 border border-stone-200 hover:border-stone-400 text-stone-500 hover:text-stone-900 uppercase tracking-wider transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="py-8 space-y-3">
            {authLoading && (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border border-stone-400 border-t-stone-900 rounded-full animate-spin" />
              </div>
            )}

            {!authLoading && orders.length === 0 && (
              <div className="text-center py-20 space-y-4">
                <Package size={32} className="text-stone-300 mx-auto" />
                <p className="text-stone-400 text-sm">
                  {filter === 'all' ? 'No orders yet.' : `No ${filter.replace('_', ' ')} orders.`}
                </p>
              </div>
            )}

            {orders.map(o => <OrderCard key={o.order_id} order={o} email={customer.email} customerToken={customerToken} />)}

            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full py-3 border border-stone-200 hover:border-stone-400 text-stone-500 hover:text-stone-900 text-xs font-medium tracking-widest uppercase transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingMore
                  ? <div className="w-3.5 h-3.5 border border-stone-400 border-t-transparent rounded-full animate-spin" />
                  : null}
                {loadingMore ? 'Loading…' : `Load More (${total - orders.length} remaining)`}
              </button>
            )}
          </div>
        </div>
      </CustomerLayout>
    );
  }

  // ── Guest view ────────────────────────────────────────────────────────────────
  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-6">
        <div className="py-14 border-b border-stone-100">
          <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Track</p>
          <h1 className="font-serif text-4xl font-light text-stone-900">My Orders</h1>
          <p className="text-stone-400 text-sm mt-1">
            Enter your email to track orders, or{' '}
            <button onClick={() => navigate('/login')} className="text-stone-900 underline underline-offset-2 hover:no-underline">
              sign in
            </button>{' '}
            for invoice downloads.
          </p>
        </div>

        <div className="py-8 space-y-6">
          <form onSubmit={handleGuestSearch} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 border border-stone-200 focus:border-stone-400 px-4 py-3 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-medium tracking-widest uppercase px-6 py-3 transition-colors flex items-center gap-2 flex-shrink-0"
            >
              {loading
                ? <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                : <Search size={13} />}
              Look Up
            </button>
          </form>

          <div className="flex items-center gap-3 border border-stone-100 bg-stone-50 px-4 py-3">
            <LogIn size={15} className="text-stone-400 flex-shrink-0" />
            <p className="text-stone-500 text-sm">
              <button onClick={() => navigate('/login')} className="text-stone-900 underline underline-offset-2 hover:no-underline font-medium">
                Sign in
              </button>{' '}
              to download invoices and manage your quotes.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-3 text-red-600 text-sm">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {searched && (
            guestOrders.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Package size={32} className="text-stone-300 mx-auto" />
                <p className="text-stone-400 text-sm">
                  No orders found for <span className="text-stone-700 font-medium">{searchedEmail}</span>.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-stone-400 text-sm">
                  Found <span className="text-stone-900 font-medium">{guestTotal}</span> order{guestTotal !== 1 ? 's' : ''} for {searchedEmail}
                </p>
                {guestOrders.map(o => <OrderCard key={o.order_id} order={o} email={searchedEmail} customerToken={null} />)}
                {guestHasMore && (
                  <button
                    onClick={handleGuestLoadMore}
                    disabled={guestLoadingMore}
                    className="w-full py-3 border border-stone-200 hover:border-stone-400 text-stone-500 hover:text-stone-900 text-xs font-medium tracking-widest uppercase transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {guestLoadingMore
                      ? <div className="w-3.5 h-3.5 border border-stone-400 border-t-transparent rounded-full animate-spin" />
                      : null}
                    {guestLoadingMore ? 'Loading…' : `Load More (${guestTotal - guestOrders.length} remaining)`}
                  </button>
                )}
              </div>
            )
          )}

          {!searched && (
            <div className="text-center py-16 space-y-2">
              <Search size={28} className="text-stone-300 mx-auto" />
              <p className="text-stone-400 text-sm">Enter your email above to track your orders</p>
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
