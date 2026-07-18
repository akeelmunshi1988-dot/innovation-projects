import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText, CheckCircle, XCircle, Package,
  AlertTriangle, ChevronDown, ChevronUp, LogIn, RefreshCw, Bell,
} from 'lucide-react';
import axios from 'axios';
import CustomerLayout from '../components/CustomerLayout';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import { fmtExact } from '../utils/currency';

interface CustomerQuote {
  quote_id: number;
  status: string;
  rug_name: string;
  rug_image_url: string | null;
  size: string;
  qty: number;
  final_price: number | null;
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

function QuoteCard({ quote, onRefresh }: { quote: CustomerQuote; onRefresh: () => void }) {
  const { customerToken } = useCustomerAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(quote.status === 'sent');
  const [responding, setResponding] = useState<'accept' | 'reject' | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
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
            Quote #{quote.quote_id} · {quote.created_at ?? '—'} · {quote.size}
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
            {[
              { label: 'Size', value: quote.size },
              { label: 'Qty', value: `${quote.qty} pc${quote.qty !== 1 ? 's' : ''}` },
              { label: 'Total', value: quote.final_price != null ? fmt(quote.final_price) : 'TBD',
                sub: quote.manual_discount_pct && quote.manual_discount_pct > 0 ? `${quote.manual_discount_pct}% off` : null },
              { label: 'Type', value: quote.rush_order ? 'Rush Order' : 'Standard' },
            ].map(({ label, value, sub }) => (
              <div key={label}>
                <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">{label}</p>
                <p className="text-stone-900 text-sm">{value}</p>
                {sub && <p className="text-green-600 text-xs mt-0.5">{sub}</p>}
              </div>
            ))}
          </div>

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
                <Link to="/shop/my-orders" className="text-stone-900 underline underline-offset-2 hover:no-underline">
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

          {/* Accept / Place Order / Decline */}
          {quote.status === 'sent' && !responding && (
            <div className="space-y-2 pt-1">
              {/* Place Order — goes to checkout with vendor-approved price */}
              {quote.rug_id && quote.size_w && quote.size_h && quote.final_price != null && (
                <button
                  onClick={() => navigate('/shop/checkout', {
                    state: {
                      rug_id: quote.rug_id,
                      rug_name: quote.rug_name,
                      size_w: quote.size_w,
                      size_h: quote.size_h,
                      qty: quote.qty,
                      rush_order: quote.rush_order,
                      notes: quote.notes ?? undefined,
                      estimated_price: quote.final_price,
                      price_currency: quote.price_currency,
                      gst_pct: quote.gst_pct ?? 0,
                      estimated_days: quote.lead_time_days ?? 21,
                    },
                  })}
                  className="w-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium tracking-widest uppercase py-3 transition-colors flex items-center justify-center gap-2"
                >
                  <Package size={13} /> Place Order
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setResponding('accept')}
                  className="flex-1 border border-green-300 hover:border-green-500 text-green-700 hover:text-green-800 text-xs font-medium tracking-widest uppercase py-2.5 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={13} /> Accept
                </button>
                <button
                  onClick={() => setResponding('reject')}
                  className="flex-1 border border-stone-300 hover:border-red-300 text-stone-500 hover:text-red-600 text-xs font-medium tracking-widest uppercase py-2.5 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle size={13} /> Decline
                </button>
              </div>
            </div>
          )}

          {responding && (
            <div className="border border-stone-200 p-4 space-y-3">
              <p className="text-stone-700 text-sm font-medium">
                {responding === 'accept' ? 'Add instructions (optional)' : 'Reason for declining (optional)'}
              </p>
              <textarea
                value={responseNotes}
                onChange={e => setResponseNotes(e.target.value)}
                placeholder={responding === 'accept'
                  ? 'Any additional instructions for your order…'
                  : 'Let us know why you are declining…'}
                rows={3}
                className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2 text-stone-900 text-sm placeholder-stone-300 focus:outline-none transition-colors resize-none"
              />
              {actionError && (
                <div className="flex items-center gap-2 text-red-600 text-xs">
                  <AlertTriangle size={12} /> {actionError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleRespond(responding)}
                  disabled={actionLoading}
                  className={`flex-1 text-xs font-medium tracking-widest uppercase py-2.5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                    responding === 'accept'
                      ? 'bg-stone-900 hover:bg-stone-800 text-white'
                      : 'border border-red-300 text-red-600 hover:bg-red-50'
                  }`}
                >
                  {actionLoading
                    ? <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                    : responding === 'accept'
                      ? <><CheckCircle size={13} /> Confirm Accept</>
                      : <><XCircle size={13} /> Confirm Decline</>}
                </button>
                <button
                  onClick={() => { setResponding(null); setResponseNotes(''); setActionError(''); }}
                  className="px-5 py-2.5 border border-stone-200 hover:border-stone-400 text-stone-500 text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CustomerMyQuotes() {
  const { customer, customerToken, isCustomerAuthenticated, customerLogout } = useCustomerAuth();
  const navigate = useNavigate();

  const [quotes, setQuotes] = useState<CustomerQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(10);

  const PAGE_SIZE = 10;

  const fetchQuotes = async () => {
    if (!customerToken) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/customer/quotes', {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      setQuotes(data);
    } catch (err: any) {
      if (err.response?.status === 401) customerLogout();
      else setError('Failed to load quotes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isCustomerAuthenticated) fetchQuotes();
  }, [isCustomerAuthenticated]);

  if (!isCustomerAuthenticated) {
    return (
      <CustomerLayout>
        <div className="min-h-[70vh] flex items-center justify-center px-6">
          <div className="text-center space-y-5 max-w-sm">
            <FileText size={32} className="text-stone-300 mx-auto" />
            <h2 className="font-serif text-2xl font-light text-stone-900">Sign in to view your quotes</h2>
            <p className="text-stone-400 text-sm">Log in or create an account to see quotes sent to you by our team.</p>
            <button
              onClick={() => navigate('/shop/login')}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium tracking-widest uppercase py-3.5 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn size={13} /> Sign In
            </button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  const filtered = filter === 'all' ? quotes : quotes.filter(q => q.status === filter);
  const actionNeeded = quotes.filter(q => q.status === 'sent').length;
  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <div className="py-14 border-b border-stone-100 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Account</p>
            <h1 className="font-serif text-4xl font-light text-stone-900">My Quotes</h1>
            <p className="text-stone-400 text-sm mt-1">
              {customer?.name} · {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
              {actionNeeded > 0 && (
                <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 font-medium">
                  {actionNeeded} need response
                </span>
              )}
            </p>
          </div>
          <button
            onClick={fetchQuotes}
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
              onClick={() => { setFilter(key); setVisibleCount(PAGE_SIZE); }}
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

        <div className="py-8 space-y-3">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-3 text-red-600 text-sm">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border border-stone-400 border-t-stone-900 rounded-full animate-spin" />
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-20 space-y-4">
              <FileText size={32} className="text-stone-300 mx-auto" />
              <p className="text-stone-400 text-sm">
                {filter === 'all' ? 'No quotes yet. Browse the collection and request a quote.' : `No ${filter} quotes.`}
              </p>
              {filter === 'all' && (
                <Link
                  to="/shop/catalog"
                  className="inline-block text-sm text-stone-500 hover:text-stone-900 transition-colors border-b border-stone-300 pb-0.5"
                >
                  Browse Collection
                </Link>
              )}
            </div>
          )}

          {!loading && filtered.map(q => (
            <QuoteCard key={q.quote_id} quote={q} onRefresh={fetchQuotes} />
          ))}
        </div>
      </div>
    </CustomerLayout>
  );
}
