import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText, XCircle, Package,
  AlertTriangle, ChevronDown, ChevronUp, LogIn, RefreshCw, Bell, MessageSquare,
} from 'lucide-react';
import axios from 'axios';
import CustomerLayout from '../components/CustomerLayout';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import { fmtExact } from '../utils/currency';
import { fmtDims } from '../utils/size';
import { getPublicSettings } from '../services/api';

interface CustomerQuote {
  quote_id: number;
  status: string;
  rug_name: string;
  rug_image_url: string | null;
  size: string;
  qty: number;
  base_price: number | null;
  final_price: number | null;
  pre_gst_price: number | null;
  gst_amount: number | null;
  price_currency: string;
  rush_order: boolean;
  notes: string | null;
  vendor_notes: string | null;
  customer_response_notes: string | null;
  manual_discount_pct: number | null;
  created_at: string | null;
  has_order: boolean;
  order_id: number | null;
  review_request_count?: number;
  rug_id: number | null;
  size_w: number | null;
  size_h: number | null;
  gst_pct: number | null;
  lead_time_days: number | null;
}

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  draft:    { label: 'Under Review',          color: 'text-stone-400 border-stone-200 bg-stone-50',      dot: 'bg-stone-300' },
  sent:     { label: 'Awaiting Your Response', color: 'text-blue-600 border-blue-200 bg-blue-50',         dot: 'bg-blue-500' },
  accepted: { label: 'Accepted',              color: 'text-green-700 border-green-200 bg-green-50',       dot: 'bg-green-500' },
  rejected: { label: 'Rejected',              color: 'text-red-600 border-red-200 bg-red-50',             dot: 'bg-red-400' },
};

function QuoteCard({ quote, sizeUnit, onRefresh }: { quote: CustomerQuote; sizeUnit: string; onRefresh: () => void }) {
  const { customerToken } = useCustomerAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(quote.status === 'sent');
  const [responding, setResponding] = useState<'accept' | 'reject' | 'negotiate' | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [proposedQty, setProposedQty] = useState(String(quote.qty));
  const [removeRush, setRemoveRush] = useState(false);
  const [requestedLeadDays, setRequestedLeadDays] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewCount, setReviewCount] = useState(quote.review_request_count ?? 0);
  const [reviewMsg, setReviewMsg] = useState('');

  const MAX_REVIEWS = 5;

  const handleRequestReview = async () => {
    setReviewLoading(true);
    setReviewMsg('');
    try {
      const { data } = await axios.patch(
        `/api/customer/quotes/${quote.quote_id}/request-review`,
        {},
        { headers: { Authorization: `Bearer ${customerToken}` } },
      );
      setReviewCount(data.review_request_count);
      setReviewMsg(data.message);
    } catch (err: any) {
      setReviewMsg(err.response?.data?.detail || 'Failed to send request.');
    } finally {
      setReviewLoading(false);
    }
  };

  const currency = quote.price_currency || 'INR';
  const fmt = (n: number) => fmtExact(n, currency);
  const meta = STATUS_META[quote.status] ?? STATUS_META.draft;

  const handleRespond = async (action: 'accept' | 'reject') => {
    setActionLoading(true);
    setActionError('');
    try {
      await axios.patch(
        `/api/customer/quotes/${quote.quote_id}/${action}`,
        { customer_response_notes: responseNotes || null },
        { headers: { Authorization: `Bearer ${customerToken}` } },
      );
      setResponding(null);
      onRefresh();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Something went wrong.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNegotiate = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      await axios.patch(
        `/api/customer/quotes/${quote.quote_id}/negotiate`,
        {
          proposed_price: proposedPrice ? parseFloat(proposedPrice) : null,
          proposed_qty: proposedQty && parseInt(proposedQty) !== quote.qty ? parseInt(proposedQty) : null,
          remove_rush: removeRush || null,
          requested_lead_days: requestedLeadDays ? parseInt(requestedLeadDays) : null,
          message: responseNotes || '',
        },
        { headers: { Authorization: `Bearer ${customerToken}` } },
      );
      setResponding(null);
      setProposedPrice('');
      setProposedQty(String(quote.qty));
      setRemoveRush(false);
      setRequestedLeadDays('');
      setResponseNotes('');
      onRefresh();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Something went wrong.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={`border transition-colors ${quote.status === 'sent' ? 'border-blue-200' : 'border-stone-200'}`}>
      {/* Row header */}
      <button
        onClick={() => setExpanded(x => !x)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-stone-50 transition-colors"
      >
        {quote.rug_image_url ? (
          <img src={quote.rug_image_url} alt={quote.rug_name} className="w-12 h-12 object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 bg-stone-100 flex items-center justify-center flex-shrink-0">
            <FileText size={16} className="text-stone-300" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-serif text-base font-light text-stone-900 truncate">{quote.rug_name}</p>
          <p className="text-stone-400 text-xs mt-0.5">
            Quote #{quote.quote_id} · {quote.created_at ?? '—'} · {fmtDims(quote.size_w, quote.size_h, sizeUnit)}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {quote.final_price != null && (
            <span className="text-stone-900 font-medium text-sm">{fmt(quote.final_price)}</span>
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
          {/* Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Size</p>
              <p className="text-stone-900 text-sm">{fmtDims(quote.size_w, quote.size_h, sizeUnit)}</p>
            </div>
            <div>
              <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Qty</p>
              <p className="text-stone-900 text-sm">{quote.qty} pc{quote.qty !== 1 ? 's' : ''}</p>
              {quote.size_w && quote.size_h && (
                <p className="text-stone-400 text-xs mt-0.5">{(quote.size_w * quote.size_h * quote.qty).toFixed(2)} m² total</p>
              )}
            </div>
            <div>
              <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Type</p>
              <p className={`text-sm ${quote.rush_order ? 'text-amber-600' : 'text-stone-500'}`}>
                {quote.rush_order ? 'Early Delivery' : 'Standard'}
              </p>
            </div>
            <div>
              <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Total</p>
              <p className="text-stone-900 text-sm font-medium">{quote.final_price != null ? fmt(quote.final_price) : 'TBD'}</p>
              {quote.manual_discount_pct && quote.manual_discount_pct > 0 && (
                <p className="text-green-600 text-xs mt-0.5">{quote.manual_discount_pct}% off applied</p>
              )}
            </div>
          </div>

          {/* Price breakdown */}
          {quote.final_price != null && (
            <div className="border border-stone-100 bg-stone-50 px-4 py-3 space-y-1.5">
              <p className="text-stone-400 text-xs uppercase tracking-widest mb-2">Price Breakdown</p>

              {quote.base_price != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">Subtotal</span>
                  <span className="text-stone-700">{fmt(quote.base_price)}</span>
                </div>
              )}

              {quote.manual_discount_pct != null && quote.manual_discount_pct > 0 && quote.base_price != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-green-600">Discount ({quote.manual_discount_pct}%)</span>
                  <span className="text-green-600">−{fmt(Math.round(quote.base_price * quote.manual_discount_pct) / 100)}</span>
                </div>
              )}

              {quote.rush_order && (
                <div className="flex justify-between text-xs">
                  <span className="text-amber-600">Early delivery surcharge</span>
                  <span className="text-amber-600">included</span>
                </div>
              )}

              {quote.pre_gst_price != null && (
                <div className="flex justify-between text-xs pt-1 border-t border-stone-200">
                  <span className="text-stone-400">Pre-tax</span>
                  <span className="text-stone-700">{fmt(quote.pre_gst_price)}</span>
                </div>
              )}

              {quote.gst_pct != null && quote.gst_amount != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">GST ({quote.gst_pct.toFixed(0)}%)</span>
                  <span className="text-stone-700">+{fmt(quote.gst_amount)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-medium pt-1.5 border-t border-stone-200">
                <span className="text-stone-900">Total (incl. GST)</span>
                <span className="text-stone-900">{fmt(quote.final_price)}</span>
              </div>
            </div>
          )}

          {/* Your notes */}
          {quote.notes && (
            <div className="bg-stone-50 border border-stone-100 px-4 py-3">
              <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Your Notes</p>
              <p className="text-stone-600 text-sm">{quote.notes}</p>
            </div>
          )}

          {/* Vendor message */}
          {quote.vendor_notes && (
            <div className="bg-blue-50 border border-blue-100 px-4 py-3">
              <p className="text-blue-500 text-xs uppercase tracking-widest mb-1">Message from Vendor</p>
              <p className="text-stone-700 text-sm">{quote.vendor_notes}</p>
            </div>
          )}

          {/* Customer response */}
          {quote.customer_response_notes && (
            <div className="bg-stone-50 border border-stone-100 px-4 py-3">
              <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Your Response</p>
              <p className="text-stone-600 text-sm">{quote.customer_response_notes}</p>
            </div>
          )}

          {/* Order link */}
          {quote.has_order && quote.order_id && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-100 px-4 py-3">
              <Package size={13} className="text-green-600 flex-shrink-0" />
              <p className="text-stone-700 text-sm">
                Order #{quote.order_id} placed —{' '}
                <Link to="/my-orders" className="text-stone-900 underline underline-offset-2 hover:no-underline">
                  Track your order
                </Link>
              </p>
            </div>
          )}

          {/* Request Review — only for quotes still under vendor review (draft) */}
          {quote.status === 'draft' && (
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-stone-100">
              <div className="text-xs text-stone-400">
                {reviewCount < MAX_REVIEWS
                  ? `Review requests: ${reviewCount} / ${MAX_REVIEWS}`
                  : 'Maximum review requests reached'}
              </div>
              <div className="flex items-center gap-2">
                {reviewMsg && (
                  <span className="text-xs text-stone-500">{reviewMsg}</span>
                )}
                <button
                  onClick={handleRequestReview}
                  disabled={reviewLoading || reviewCount >= MAX_REVIEWS}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-stone-200 hover:border-stone-400 text-stone-500 hover:text-stone-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider"
                >
                  {reviewLoading
                    ? <div className="w-3 h-3 border border-stone-400 border-t-transparent rounded-full animate-spin" />
                    : <Bell size={11} />}
                  Request Review
                </button>
              </div>
            </div>
          )}

          {/* Place Order / Negotiate / Decline */}
          {quote.status === 'sent' && !responding && (
            <div className="space-y-2 pt-1">
              {quote.rug_id && quote.size_w && quote.size_h && quote.final_price != null && (
                <button
                  onClick={() => navigate('/checkout', {
                    state: {
                      rug_id: quote.rug_id, rug_name: quote.rug_name,
                      size_w: quote.size_w, size_h: quote.size_h, qty: quote.qty,
                      rush_order: quote.rush_order, notes: quote.notes ?? undefined,
                      estimated_price: quote.final_price, price_currency: quote.price_currency,
                      gst_pct: quote.gst_pct ?? 0, estimated_days: quote.lead_time_days ?? 21,
                    },
                  })}
                  className="w-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium tracking-widest uppercase py-3 transition-colors flex items-center justify-center gap-2"
                >
                  <Package size={13} /> Place Order
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setResponding('negotiate')}
                  className="border border-amber-300 hover:border-amber-500 text-amber-700 text-xs font-medium tracking-widest uppercase py-2.5 transition-colors flex items-center justify-center gap-1.5"
                ><MessageSquare size={13} /> Negotiate</button>
                <button onClick={() => setResponding('reject')}
                  className="border border-stone-300 hover:border-red-300 text-stone-500 hover:text-red-600 text-xs font-medium tracking-widest uppercase py-2.5 transition-colors flex items-center justify-center gap-1.5"
                ><XCircle size={13} /> Decline</button>
              </div>
            </div>
          )}

          {responding && (
            <div className="border border-stone-200 p-4 space-y-3">
              {responding === 'negotiate' ? (
                <>
                  <p className="text-stone-700 text-sm font-medium">Propose a counter-offer</p>
                  <p className="text-stone-400 text-xs">Adjust the fields you'd like to negotiate — our team will review and get back to you.</p>

                  {/* Proposed price */}
                  <div>
                    <label className="text-stone-600 text-xs font-medium uppercase tracking-wider block mb-1.5">Proposed total price ({quote.price_currency})</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={proposedPrice}
                      onChange={e => setProposedPrice(e.target.value)}
                      placeholder={quote.final_price != null ? `Current: ${fmt(quote.final_price)}` : 'e.g. 12000'}
                      className="w-full border border-stone-200 focus:border-amber-400 px-3 py-2 text-stone-900 text-sm placeholder-stone-300 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Quantity + lead time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-stone-600 text-xs font-medium uppercase tracking-wider block mb-1.5">Quantity (current: {quote.qty})</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={proposedQty}
                        onChange={e => setProposedQty(e.target.value)}
                        className="w-full border border-stone-200 focus:border-amber-400 px-3 py-2 text-stone-900 text-sm focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-stone-600 text-xs font-medium uppercase tracking-wider block mb-1.5">Requested delivery (days)</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={requestedLeadDays}
                        onChange={e => setRequestedLeadDays(e.target.value)}
                        placeholder={quote.lead_time_days ? `Standard: ${quote.lead_time_days}` : 'e.g. 30'}
                        className="w-full border border-stone-200 focus:border-amber-400 px-3 py-2 text-stone-900 text-sm placeholder-stone-300 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Remove rush fee — only shown if order was placed with rush */}
                  {quote.rush_order && (
                    <label className="flex items-start gap-3 cursor-pointer border border-amber-100 bg-amber-50 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={removeRush}
                        onChange={e => setRemoveRush(e.target.checked)}
                        className="mt-0.5 flex-shrink-0 accent-amber-600"
                      />
                      <div>
                        <p className="text-amber-800 text-xs font-medium">Remove early delivery fee (−25%)</p>
                        <p className="text-amber-600 text-xs mt-0.5">Switch to standard delivery to reduce the total price</p>
                      </div>
                    </label>
                  )}

                  {/* Reason / message */}
                  <textarea
                    value={responseNotes}
                    onChange={e => setResponseNotes(e.target.value)}
                    placeholder="Explain your reasoning — e.g. budget constraints, competitor pricing, bulk discount request…"
                    rows={3}
                    className="w-full border border-stone-200 focus:border-amber-400 px-3 py-2 text-stone-900 text-sm placeholder-stone-300 focus:outline-none transition-colors resize-none"
                  />
                </>
              ) : (
                <>
                  <p className="text-stone-700 text-sm font-medium">Reason for declining (optional)</p>
                  <textarea
                    value={responseNotes}
                    onChange={e => setResponseNotes(e.target.value)}
                    placeholder="Let us know why you are declining…"
                    rows={3}
                    className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2 text-stone-900 text-sm placeholder-stone-300 focus:outline-none transition-colors resize-none"
                  />
                </>
              )}
              {actionError && (
                <div className="flex items-center gap-2 text-red-600 text-xs">
                  <AlertTriangle size={12} /> {actionError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => responding === 'negotiate' ? handleNegotiate() : handleRespond(responding)}
                  disabled={actionLoading || (responding === 'negotiate' && !proposedPrice && !responseNotes.trim() && !removeRush && !requestedLeadDays && proposedQty === String(quote.qty))}
                  className={`flex-1 text-xs font-medium tracking-widest uppercase py-2.5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                    responding === 'negotiate' ? 'bg-amber-600 hover:bg-amber-500 text-white' :
                    'border border-red-300 text-red-600 hover:bg-red-50'
                  }`}
                >
                  {actionLoading
                    ? <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                    : responding === 'negotiate' ? <><MessageSquare size={13} /> Send Counter-Offer</>
                    : <><XCircle size={13} /> Confirm Decline</>}
                </button>
                <button
                  onClick={() => { setResponding(null); setResponseNotes(''); setProposedPrice(''); setProposedQty(String(quote.qty)); setRemoveRush(false); setRequestedLeadDays(''); setActionError(''); }}
                  className="px-5 py-2.5 border border-stone-200 hover:border-stone-400 text-stone-500 text-xs transition-colors"
                >Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

export default function CustomerMyQuotes() {
  const { customer, customerToken, isCustomerAuthenticated, customerLogout } = useCustomerAuth();
  const navigate = useNavigate();

  const [quotes, setQuotes] = useState<CustomerQuote[]>([]);
  const [total, setTotal] = useState(0);
  const [actionNeeded, setActionNeeded] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [sizeMin, setSizeMin] = useState('');
  const [sizeMax, setSizeMax] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sizeUnit, setSizeUnit] = useState('ft');

  useEffect(() => {
    getPublicSettings().then((data) => setSizeUnit(data.default_size_unit || 'ft')).catch(() => {});
  }, []);

  interface FetchOpts { status: string; sortBy: string; sizeMin: string; sizeMax: string; dateFrom: string; dateTo: string; }

  const fetchPage = async (pageNum: number, opts: FetchOpts, append: boolean) => {
    if (!customerToken) return;
    append ? setLoadingMore(true) : setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page: pageNum, page_size: PAGE_SIZE, sort_by: opts.sortBy };
      if (opts.status !== 'all') params.status = opts.status;
      if (opts.sizeMin) params.size_min = parseFloat(opts.sizeMin);
      if (opts.sizeMax) params.size_max = parseFloat(opts.sizeMax);
      if (opts.dateFrom) params.date_from = opts.dateFrom;
      if (opts.dateTo) params.date_to = opts.dateTo;
      const { data } = await axios.get('/api/customer/quotes', {
        headers: { Authorization: `Bearer ${customerToken}` },
        params,
      });
      setTotal(data.total);
      setActionNeeded(data.action_needed ?? 0);
      setQuotes(prev => append ? [...prev, ...data.items] : data.items);
      setPage(pageNum);
    } catch (err: any) {
      if (err.response?.status === 401) customerLogout();
      else setError('Failed to load quotes.');
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  };

  const currentOpts = (): FetchOpts => ({ status: filter, sortBy, sizeMin, sizeMax, dateFrom, dateTo });

  useEffect(() => {
    if (isCustomerAuthenticated) fetchPage(1, currentOpts(), false);
  }, [isCustomerAuthenticated]);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setQuotes([]);
    fetchPage(1, { ...currentOpts(), status: newFilter }, false);
  };

  const handleSortChange = (val: string) => {
    setSortBy(val);
    setQuotes([]);
    fetchPage(1, { ...currentOpts(), sortBy: val }, false);
  };

  const handleApplyFilters = () => {
    setQuotes([]);
    fetchPage(1, currentOpts(), false);
  };

  const handleClearFilters = () => {
    setSizeMin(''); setSizeMax(''); setDateFrom(''); setDateTo('');
    setQuotes([]);
    fetchPage(1, { ...currentOpts(), sizeMin: '', sizeMax: '', dateFrom: '', dateTo: '' }, false);
  };

  const hasActiveFilters = !!(sizeMin || sizeMax || dateFrom || dateTo);

  const handleLoadMore = () => fetchPage(page + 1, currentOpts(), true);

  const hasMore = quotes.length < total;

  if (!isCustomerAuthenticated) {
    return (
      <CustomerLayout>
        <div className="min-h-[70vh] flex items-center justify-center px-6">
          <div className="text-center space-y-5 max-w-sm">
            <FileText size={32} className="text-stone-300 mx-auto" />
            <h2 className="font-serif text-2xl font-light text-stone-900">Sign in to view your quotes</h2>
            <p className="text-stone-400 text-sm">Log in or create an account to see quotes sent to you by our team.</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium tracking-widest uppercase py-3.5 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn size={13} /> Sign In
            </button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <div className="py-14 border-b border-stone-100 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Account</p>
            <h1 className="font-serif text-4xl font-light text-stone-900">My Quotes</h1>
            <p className="text-stone-400 text-sm mt-1">
              {customer?.name} · {total} quote{total !== 1 ? 's' : ''}
              {actionNeeded > 0 && (
                <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 font-medium">
                  {actionNeeded} need response
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => fetchPage(1, currentOpts(), false)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-wider"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div className="py-4 flex gap-2 flex-wrap border-b border-stone-100">
          {[
            { key: 'all',      label: 'All' },
            { key: 'sent',     label: 'Needs Response' },
            { key: 'accepted', label: 'Accepted' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'draft',    label: 'Pending Review' },
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
              {key === 'sent' && actionNeeded > 0 && (
                <span className="ml-1.5 bg-blue-600 text-white text-xs px-1.5 rounded-full">
                  {actionNeeded}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sort & filter bar */}
        <div className="py-3 border-b border-stone-100 space-y-2">
          <div className="flex flex-wrap gap-2 items-end">
            {/* Sort */}
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

            {/* Size filter */}
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

            {/* Date filter */}
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

            {/* Apply / Clear */}
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
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-3 text-red-600 text-sm">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border border-stone-400 border-t-stone-900 rounded-full animate-spin" />
            </div>
          )}

          {!loading && quotes.length === 0 && (
            <div className="text-center py-20 space-y-4">
              <FileText size={32} className="text-stone-300 mx-auto" />
              <p className="text-stone-400 text-sm">
                {filter === 'all' ? 'No quotes yet. Browse the collection and request a quote.' : `No ${filter} quotes.`}
              </p>
              {filter === 'all' && (
                <Link to="/catalog" className="inline-block text-sm text-stone-500 hover:text-stone-900 transition-colors border-b border-stone-300 pb-0.5">
                  Browse Collection
                </Link>
              )}
            </div>
          )}

          {!loading && quotes.map((q: CustomerQuote) => (
            <QuoteCard key={q.quote_id} quote={q} sizeUnit={sizeUnit} onRefresh={() => fetchPage(1, currentOpts(), false)} />
          ))}

          {!loading && hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full py-3 border border-stone-200 hover:border-stone-400 text-stone-500 hover:text-stone-900 text-xs font-medium tracking-widest uppercase transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingMore
                ? <div className="w-3.5 h-3.5 border border-stone-400 border-t-transparent rounded-full animate-spin" />
                : null}
              {loadingMore ? 'Loading…' : `Load More (${total - quotes.length} remaining)`}
            </button>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
