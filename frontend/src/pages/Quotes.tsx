import { useState, useEffect } from 'react';
import {
  FileText, RefreshCw, ChevronDown, CheckCircle, Send, XCircle, Clock,
  AlertTriangle, Download, MessageCircle, Mail, X, LayoutList, Columns, Search, Pencil,
} from 'lucide-react';
import { getQuotes, updateQuote, downloadInvoice, sendQuoteEmail, sendQuoteToCustomer, adjustQuotePrice } from '../services/api';
import type { Quote } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { fmtTenant } from '../utils/currency';

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:    { label: 'Draft',    color: 'text-dark-400 bg-dark-800 border-dark-700',          icon: <Clock size={12} /> },
  sent:     { label: 'Sent',     color: 'text-blue-400 bg-blue-900/20 border-blue-700/40',    icon: <Send size={12} /> },
  accepted: { label: 'Accepted', color: 'text-green-400 bg-green-900/20 border-green-700/40', icon: <CheckCircle size={12} /> },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-900/20 border-red-700/40',       icon: <XCircle size={12} /> },
};

const STATUS_ORDER: Quote['status'][] = ['draft', 'sent', 'accepted', 'rejected'];

interface EmailModalState {
  quoteId: number;
  email: string;
  type: 'proforma' | 'tax' | 'export';
}

function buildWhatsAppUrl(q: Quote, fmt: (n: number, currency?: string | null) => string): string {
  const phone = q.customer?.phone?.replace(/\D/g, '') ?? '';
  const name = q.customer?.name ?? 'there';
  const rug = q.rug_catalog?.name ?? `Rug #${q.rug_catalog_id}`;
  const size = q.custom_size_w && q.custom_size_h ? `${q.custom_size_w}×${q.custom_size_h}m` : '';
  const price = q.final_price != null ? fmt(q.final_price, q.price_currency) : 'TBD';
  const msg = [
    `Hi ${name},`,
    '',
    `Here is your quote from us:`,
    `📋 Rug    : ${rug}`,
    size ? `📐 Size   : ${size}` : '',
    `📦 Qty    : ${q.qty || 1}`,
    `💰 Total  : ${price}`,
    q.rush_order ? '⚡ Early delivery' : '',
    '',
    'This quote is valid for 15 days. Please confirm to proceed.',
    '— LoomCraftRugs Team',
  ].filter(Boolean).join('\n');
  const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(msg)}`;
}

export default function Quotes() {
  const { user } = useAuth();
  const fmt = (n: number, currency?: string | null) => fmtTenant(n, user!.tenant, currency);

  const [quotes, setQuotes]         = useState<Quote[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [filter, setFilter]         = useState<string>('all');
  const [updating, setUpdating]     = useState<number | null>(null);
  const [expanded, setExpanded]     = useState<number | null>(null);
  const [viewMode, setViewMode]     = useState<'list' | 'pipeline'>('list');

  // Filters
  const [search, setSearch]         = useState('');
  const [rushOnly, setRushOnly]     = useState(false);
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');

  // Email modal
  const [emailModal, setEmailModal] = useState<EmailModalState | null>(null);
  const [sending, setSending]       = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Send-to-customer modal
  const [sendModal, setSendModal]   = useState<{ quoteId: number; vendorNotes: string } | null>(null);
  const [sendingQuote, setSendingQuote] = useState(false);

  // Adjust price modal
  const [adjustModal, setAdjustModal] = useState<{ quoteId: number; originalPrice: number; newPrice: string; discountPct: string; vendorNotes: string } | null>(null);
  const [adjusting, setAdjusting]     = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getQuotes();
      setQuotes(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch {
      setError('Failed to load quotes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const changeStatus = async (id: number, status: Quote['status']) => {
    setUpdating(id);
    try {
      const updated = await updateQuote(id, { status });
      setQuotes((qs) => qs.map((q) => (q.id === id ? { ...q, ...updated } : q)));
    } catch {
      // silently fail
    } finally {
      setUpdating(null);
    }
  };

  const openEmailModal = (q: Quote) => {
    setSendResult(null);
    setEmailModal({
      quoteId: q.id,
      email: q.customer?.email ?? '',
      type: 'proforma',
    });
  };

  const handleSendEmail = async () => {
    if (!emailModal) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await sendQuoteEmail(emailModal.quoteId, emailModal.type, emailModal.email || undefined);
      setSendResult({ ok: true, msg: res.message });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to send email.';
      setSendResult({ ok: false, msg });
    } finally {
      setSending(false);
    }
  };

  const handleSendToCustomer = async () => {
    if (!sendModal) return;
    setSendingQuote(true);
    try {
      const updated = await sendQuoteToCustomer(sendModal.quoteId, sendModal.vendorNotes || undefined);
      setQuotes((qs) => qs.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)));
      setSendModal(null);
    } catch {
      // silently fail — user can retry
    } finally {
      setSendingQuote(false);
    }
  };

  const handleAdjustPrice = async () => {
    if (!adjustModal) return;
    const price = parseFloat(adjustModal.newPrice);
    if (isNaN(price) || price <= 0) return;
    const discountPct = adjustModal.discountPct ? parseFloat(adjustModal.discountPct) : undefined;
    setAdjusting(true);
    try {
      const updated = await adjustQuotePrice(
        adjustModal.quoteId,
        price,
        adjustModal.vendorNotes || undefined,
        discountPct && discountPct > 0 ? discountPct : undefined,
      );
      setQuotes((qs) => qs.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)));
      setAdjustModal(null);
    } catch {
      // silently fail
    } finally {
      setAdjusting(false);
    }
  };

  // Apply text/rush/date filters first (used by both views)
  const baseFiltered = quotes
    .filter((q) => {
      if (!search) return true;
      const term = search.toLowerCase();
      return [
        q.customer?.name ?? '',
        q.customer?.company ?? '',
        q.customer?.email ?? '',
        q.rug_catalog?.name ?? '',
        String(q.id),
      ].some((v) => v.toLowerCase().includes(term));
    })
    .filter((q) => !rushOnly || q.rush_order)
    .filter((q) => !dateFrom || new Date(q.created_at) >= new Date(dateFrom))
    .filter((q) => !dateTo   || new Date(q.created_at) <= new Date(dateTo + 'T23:59:59'));

  // Status filter only applies in list view (pipeline columns handle status grouping)
  const visible = filter === 'all' ? baseFiltered : baseFiltered.filter((q) => q.status === filter);

  const counts: Record<string, number> = {
    all: baseFiltered.length,
    ...Object.fromEntries(STATUS_ORDER.map((s) => [s, baseFiltered.filter((q) => q.status === s).length])),
  };

  const activeFilterCount = [search, rushOnly, dateFrom, dateTo].filter(Boolean).length;
  const clearFilters = () => { setSearch(''); setRushOnly(false); setDateFrom(''); setDateTo(''); };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-cream-100">Quotes</h1>
          <p className="text-dark-400 text-sm mt-0.5">
            {baseFiltered.length} of {quotes.length} quotes
            {activeFilterCount > 0 && <span className="text-gold-500"> · {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                viewMode === 'list' ? 'bg-gold-600 text-white' : 'text-dark-400 hover:text-cream-300'
              }`}
            >
              <LayoutList size={13} /> List
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                viewMode === 'pipeline' ? 'bg-gold-600 text-white' : 'text-dark-400 hover:text-cream-300'
              }`}
            >
              <Columns size={13} /> Pipeline
            </button>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl text-dark-300 text-sm transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-3 space-y-3">
        {/* Row 1: search + rush + clear */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, rug, email…"
              className="w-full pl-8 pr-8 py-2 bg-dark-900 border border-dark-600 rounded-lg text-cream-200 text-sm placeholder-dark-600 focus:outline-none focus:border-gold-500 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-500 hover:text-cream-300">
                <X size={12} />
              </button>
            )}
          </div>

          <button
            onClick={() => setRushOnly((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
              rushOnly
                ? 'bg-orange-900/30 border-orange-600/60 text-orange-400'
                : 'bg-dark-900 border-dark-600 text-dark-400 hover:text-cream-300 hover:border-dark-500'
            }`}
          >
            ⚡ Early Delivery Only
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-dark-600 text-dark-400 hover:text-cream-300 hover:border-dark-500 transition-colors whitespace-nowrap"
            >
              <X size={11} /> Clear filters ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Row 2: date range + status tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-dark-500 text-xs whitespace-nowrap">Date:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2.5 py-1.5 bg-dark-900 border border-dark-600 rounded-lg text-xs text-dark-300 focus:outline-none focus:border-gold-500 transition-colors"
          />
          <span className="text-dark-600 text-xs">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2.5 py-1.5 bg-dark-900 border border-dark-600 rounded-lg text-xs text-dark-300 focus:outline-none focus:border-gold-500 transition-colors"
          />

          <div className="h-4 w-px bg-dark-700 mx-1" />

          {/* Status tabs */}
          {(['all', ...STATUS_ORDER] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                filter === s
                  ? 'bg-gold-600 text-white border-gold-600'
                  : 'bg-dark-900 text-dark-400 border-dark-600 hover:border-dark-500 hover:text-cream-300'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_META[s].label}
              <span className={`ml-1.5 ${filter === s ? 'text-gold-200' : 'text-dark-600'}`}>
                {counts[s] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-900/20 border border-red-600/30 rounded-xl p-3 text-red-400 text-sm">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-dark-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : viewMode === 'pipeline' ? (
        <PipelineView
          quotes={baseFiltered}
          fmt={fmt}
          updating={updating}
          onChangeStatus={changeStatus}
          onWhatsApp={(q) => window.open(buildWhatsAppUrl(q, fmt), '_blank')}
          onEmail={openEmailModal}
          onDownload={downloadInvoice}
        />
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-dark-500">
          <FileText size={40} className="mb-3 opacity-40" />
          <p className="font-medium">No quotes found</p>
          <p className="text-xs mt-1">
            {activeFilterCount > 0
              ? 'Try adjusting or clearing your filters'
              : filter !== 'all'
                ? `No "${filter}" quotes yet`
                : 'Customer quote requests will appear here'}
          </p>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="mt-3 text-xs text-gold-500 hover:text-gold-400 underline">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((q) => (
            <QuoteRow
              key={q.id}
              q={q}
              fmt={fmt}
              isOpen={expanded === q.id}
              updating={updating}
              onToggle={() => setExpanded(expanded === q.id ? null : q.id)}
              onChangeStatus={changeStatus}
              onWhatsApp={() => window.open(buildWhatsAppUrl(q, fmt), '_blank')}
              onEmail={() => openEmailModal(q)}
              onDownload={downloadInvoice}
              onSend={() => setSendModal({ quoteId: q.id, vendorNotes: q.vendor_notes ?? '' })}
              onAdjust={() => setAdjustModal({ quoteId: q.id, originalPrice: q.final_price ?? 0, newPrice: String(q.final_price ?? ''), discountPct: String((q as any).manual_discount_pct ?? ''), vendorNotes: q.vendor_notes ?? '' })}
            />
          ))}
        </div>
      )}

      {/* Send-to-Customer Modal */}
      {sendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
              <div className="flex items-center gap-2">
                <Send size={16} className="text-blue-400" />
                <h2 className="text-cream-100 font-semibold">Send Quote to Customer</h2>
              </div>
              <button onClick={() => setSendModal(null)} className="text-dark-400 hover:text-cream-300"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-dark-400 text-sm">The customer will see this quote as <span className="text-blue-300 font-semibold">Awaiting Your Response</span> in their portal.</p>
              <div>
                <label className="block text-dark-300 text-xs uppercase tracking-wider mb-1.5">Message to Customer (optional)</label>
                <textarea
                  rows={3}
                  value={sendModal.vendorNotes}
                  onChange={(e) => setSendModal({ ...sendModal, vendorNotes: e.target.value })}
                  placeholder="e.g. Please review and confirm by Friday…"
                  className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3 py-2.5 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setSendModal(null)} className="flex-1 py-2.5 rounded-xl border border-dark-600 text-dark-300 text-sm hover:bg-dark-700 transition-colors">Cancel</button>
              <button
                onClick={handleSendToCustomer}
                disabled={sendingQuote}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {sendingQuote ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={14} />}
                {sendingQuote ? 'Sending…' : 'Send to Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Price Modal */}
      {adjustModal && (() => {
        const pct = parseFloat(adjustModal.discountPct);
        const discountedPrice = (!isNaN(pct) && pct > 0)
          ? adjustModal.originalPrice * (1 - pct / 100)
          : null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
                <div className="flex items-center gap-2">
                  <Pencil size={16} className="text-gold-400" />
                  <h2 className="text-cream-100 font-semibold">Adjust Quote Price</h2>
                </div>
                <button onClick={() => setAdjustModal(null)} className="text-dark-400 hover:text-cream-300"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                {/* Discount % — computes new price automatically */}
                <div>
                  <label className="block text-dark-300 text-xs uppercase tracking-wider mb-1.5">Discount % (optional)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={adjustModal.discountPct}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const p = parseFloat(raw);
                        const computed = (!isNaN(p) && p > 0 && adjustModal.originalPrice > 0)
                          ? (adjustModal.originalPrice * (1 - p / 100)).toFixed(2)
                          : adjustModal.newPrice;
                        setAdjustModal({ ...adjustModal, discountPct: raw, newPrice: computed });
                      }}
                      placeholder="0"
                      className="w-28 bg-dark-800 border border-dark-600 rounded-xl px-3 py-2.5 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-500"
                    />
                    <span className="text-dark-400 text-sm">%</span>
                    {discountedPrice !== null && (
                      <span className="text-green-400 text-xs font-medium ml-1">
                        → {fmt(discountedPrice, null)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Final price — can also be set directly */}
                <div>
                  <label className="block text-dark-300 text-xs uppercase tracking-wider mb-1.5">Final Price *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={adjustModal.newPrice}
                    onChange={(e) => setAdjustModal({ ...adjustModal, newPrice: e.target.value, discountPct: '' })}
                    placeholder="0.00"
                    className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3 py-2.5 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-500"
                  />
                  <p className="text-dark-600 text-xs mt-1">Original: {fmt(adjustModal.originalPrice, null)} — enter discount % above or override price directly</p>
                </div>

                <div>
                  <label className="block text-dark-300 text-xs uppercase tracking-wider mb-1.5">Reason / Note to Customer (optional)</label>
                  <textarea
                    rows={3}
                    value={adjustModal.vendorNotes}
                    onChange={(e) => setAdjustModal({ ...adjustModal, vendorNotes: e.target.value })}
                    placeholder="e.g. Price revised to include custom dye surcharge…"
                    className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3 py-2.5 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-500 resize-none"
                  />
                </div>
                <p className="text-dark-500 text-xs">Saving will set the quote status to <span className="text-blue-300">Sent</span> and notify the customer.</p>
              </div>
              <div className="flex gap-3 px-5 pb-5">
                <button onClick={() => setAdjustModal(null)} className="flex-1 py-2.5 rounded-xl border border-dark-600 text-dark-300 text-sm hover:bg-dark-700 transition-colors">Cancel</button>
                <button
                  onClick={handleAdjustPrice}
                  disabled={adjusting || !adjustModal.newPrice || parseFloat(adjustModal.newPrice) <= 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold-600 hover:bg-gold-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {adjusting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Pencil size={14} />}
                  {adjusting ? 'Saving…' : 'Save & Send'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Email Modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-gold-400" />
                <h2 className="text-cream-100 font-semibold">Email Invoice</h2>
              </div>
              <button onClick={() => setEmailModal(null)} className="text-dark-400 hover:text-cream-300">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-dark-300 text-xs uppercase tracking-wider mb-1.5">Recipient Email</label>
                <input
                  type="email"
                  value={emailModal.email}
                  onChange={(e) => setEmailModal({ ...emailModal, email: e.target.value })}
                  placeholder="customer@example.com"
                  className="w-full bg-dark-900 border border-dark-600 rounded-xl px-3 py-2.5 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-dark-300 text-xs uppercase tracking-wider mb-1.5">Invoice Type</label>
                <div className="flex gap-2">
                  {(['proforma', 'tax', 'export'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setEmailModal({ ...emailModal, type: t })}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors capitalize ${
                        emailModal.type === t
                          ? 'bg-gold-600 border-gold-600 text-white'
                          : 'bg-dark-800 border-dark-600 text-dark-400 hover:text-cream-200'
                      }`}
                    >
                      {t === 'proforma' ? 'Proforma' : t === 'tax' ? 'Tax Invoice' : 'Export Invoice'}
                    </button>
                  ))}
                </div>
                {emailModal.type === 'proforma' && (
                  <p className="text-dark-500 text-xs mt-1.5">Proforma is a pre-shipment estimate — no GST commitment.</p>
                )}
              </div>

              {sendResult && (
                <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${
                  sendResult.ok
                    ? 'bg-green-900/20 border border-green-700/30 text-green-400'
                    : 'bg-red-900/20 border border-red-700/30 text-red-400'
                }`}>
                  {sendResult.ok ? <CheckCircle size={14} className="mt-0.5 flex-shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />}
                  {sendResult.msg}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => setEmailModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-dark-600 text-dark-300 text-sm hover:bg-dark-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending || !emailModal.email}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold-600 hover:bg-gold-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Mail size={14} />
                )}
                {sending ? 'Sending…' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── QuoteRow ─────────────────────────────────────────────────────────────────

interface QuoteRowProps {
  q: Quote;
  fmt: (n: number, currency?: string | null) => string;
  isOpen: boolean;
  updating: number | null;
  onToggle: () => void;
  onChangeStatus: (id: number, status: Quote['status']) => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onDownload: (id: number, type: 'tax' | 'export' | 'proforma') => void;
  onSend: () => void;
  onAdjust: () => void;
}

function QuoteRow({ q, fmt, isOpen, updating, onToggle, onChangeStatus, onWhatsApp, onEmail, onDownload, onSend, onAdjust }: QuoteRowProps) {
  const meta = STATUS_META[q.status];
  const sqm  = q.custom_size_w && q.custom_size_h ? (q.custom_size_w * q.custom_size_h).toFixed(2) : null;

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-4 px-4 py-3.5 cursor-pointer hover:bg-dark-700/40"
        onClick={onToggle}
      >
        <div className="flex-shrink-0 w-10 h-10 bg-dark-700 rounded-lg flex items-center justify-center">
          <span className="text-dark-400 text-xs font-bold">#{q.id}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-cream-100 font-semibold text-sm truncate">
              {q.customer?.name ?? 'Unknown customer'}
            </p>
            {q.rush_order && (
              <span className="text-xs bg-orange-900/30 text-orange-400 border border-orange-700/30 rounded-full px-2 py-0.5">Early</span>
            )}
          </div>
          <p className="text-dark-400 text-xs truncate mt-0.5">
            {q.rug_catalog?.name ?? `Rug #${q.rug_catalog_id}`}
            {sqm && ` · ${q.custom_size_w}×${q.custom_size_h}m (${sqm}m²)`}
            {q.qty > 1 && ` · qty ${q.qty}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0 hidden sm:block">
          <p className="text-gold-400 font-bold text-sm">{q.final_price != null ? fmt(q.final_price, q.price_currency) : '—'}</p>
          <p className="text-dark-500 text-xs">{new Date(q.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.color}`}>
            {meta.icon} {meta.label}
          </span>
          <ChevronDown size={14} className={`text-dark-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-dark-700 px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-dark-300 text-xs uppercase tracking-wider mb-1">Customer</p>
              <p className="text-cream-200 font-medium">{q.customer?.name ?? '—'}</p>
              <p className="text-dark-400 text-xs">{q.customer?.email ?? '—'}</p>
              {q.customer?.phone && <p className="text-dark-400 text-xs">{q.customer.phone}</p>}
              {q.customer?.company && <p className="text-dark-400 text-xs italic">{q.customer.company}</p>}
            </div>
            <div>
              <p className="text-dark-300 text-xs uppercase tracking-wider mb-1">Rug</p>
              <p className="text-cream-200 font-medium">{q.rug_catalog?.name ?? `#${q.rug_catalog_id}`}</p>
              <p className="text-dark-400 text-xs">{q.material?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-dark-300 text-xs uppercase tracking-wider mb-1">Specs</p>
              {sqm && <p className="text-cream-200 font-medium">{q.custom_size_w} × {q.custom_size_h}m</p>}
              <p className="text-dark-400 text-xs">Qty: {q.qty} · {q.rush_order ? 'Early Delivery' : 'Standard'}</p>
            </div>
            <div>
              <p className="text-dark-300 text-xs uppercase tracking-wider mb-1">Pricing</p>
              <p className="text-cream-200 font-medium">{q.final_price != null ? fmt(q.final_price, q.price_currency) : '—'}</p>
              <p className="text-dark-400 text-xs">Base: {q.base_price != null ? fmt(q.base_price, q.price_currency) : '—'}</p>
            </div>
          </div>

          {q.notes && (
            <div className="bg-dark-900 rounded-lg px-3 py-2.5">
              <p className="text-dark-300 text-xs uppercase tracking-wider mb-1">Customer Notes</p>
              <p className="text-dark-200 text-sm">{q.notes}</p>
            </div>
          )}

          {q.vendor_notes && (
            <div className="bg-blue-900/10 border border-blue-700/30 rounded-lg px-3 py-2.5">
              <p className="text-blue-400 text-xs uppercase tracking-wider mb-1">Message Sent to Customer</p>
              <p className="text-dark-200 text-sm">{q.vendor_notes}</p>
            </div>
          )}

          {q.customer_response_notes && (
            <div className="bg-dark-900 border border-dark-700 rounded-lg px-3 py-2.5">
              <p className="text-dark-300 text-xs uppercase tracking-wider mb-1">Customer Response</p>
              <p className="text-dark-200 text-sm">{q.customer_response_notes}</p>
            </div>
          )}

          {/* Status actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-dark-500 text-xs">Status:</span>
            {STATUS_ORDER.filter((s) => s !== q.status).map((s) => (
              <button
                key={s}
                onClick={() => onChangeStatus(q.id, s)}
                disabled={updating === q.id}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${STATUS_META[s].color} hover:opacity-80`}
              >
                {updating === q.id ? (
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                ) : STATUS_META[s].icon}
                {STATUS_META[s].label}
              </button>
            ))}
          </div>

          {/* Action row */}
          {q.final_price != null && (
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-dark-800">
              {/* Send to Customer */}
              {q.status !== 'accepted' && q.status !== 'rejected' && (
                <button
                  onClick={onSend}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-700/40 bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 transition-colors"
                >
                  <Send size={11} /> Send to Customer
                </button>
              )}

              {/* Adjust Price */}
              {q.status !== 'accepted' && q.status !== 'rejected' && (
                <button
                  onClick={onAdjust}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gold-700/40 bg-gold-900/20 text-gold-400 hover:bg-gold-900/40 transition-colors"
                >
                  <Pencil size={11} /> Adjust Price
                </button>
              )}

              <span className="text-dark-700 text-xs">·</span>

              {/* WhatsApp */}
              <button
                onClick={onWhatsApp}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-700/40 bg-green-900/20 text-green-400 hover:bg-green-900/40 transition-colors"
              >
                <MessageCircle size={11} /> WhatsApp
              </button>

              {/* Email */}
              <button
                onClick={onEmail}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-purple-700/40 bg-purple-900/20 text-purple-400 hover:bg-purple-900/40 transition-colors"
              >
                <Mail size={11} /> Email
              </button>

              <span className="text-dark-700 text-xs">·</span>
              <span className="text-dark-500 text-xs">Download:</span>

              {/* Proforma */}
              <button
                onClick={() => onDownload(q.id, 'proforma')}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-orange-700/40 bg-orange-900/20 text-orange-400 hover:bg-orange-900/40 transition-colors"
              >
                <Download size={11} /> Proforma
              </button>

              {/* Tax Invoice */}
              <button
                onClick={() => onDownload(q.id, 'tax')}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gold-700/40 bg-gold-900/20 text-gold-400 hover:bg-gold-900/40 transition-colors"
              >
                <Download size={11} /> Tax Invoice
              </button>

              {/* Export Invoice */}
              <button
                onClick={() => onDownload(q.id, 'export')}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-700/40 bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 transition-colors"
              >
                <Download size={11} /> Export Invoice
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── PipelineView ──────────────────────────────────────────────────────────────

interface PipelineProps {
  quotes: Quote[];
  fmt: (n: number, currency?: string | null) => string;
  updating: number | null;
  onChangeStatus: (id: number, status: Quote['status']) => void;
  onWhatsApp: (q: Quote) => void;
  onEmail: (q: Quote) => void;
  onDownload: (id: number, type: 'tax' | 'export' | 'proforma') => void;
}

const PIPELINE_COL_COLORS: Record<string, string> = {
  draft:    'border-dark-600',
  sent:     'border-blue-700/50',
  accepted: 'border-green-700/50',
  rejected: 'border-red-700/50',
};

const PIPELINE_HEADER_COLORS: Record<string, string> = {
  draft:    'bg-dark-700 text-dark-300',
  sent:     'bg-blue-900/30 text-blue-400',
  accepted: 'bg-green-900/30 text-green-400',
  rejected: 'bg-red-900/30 text-red-400',
};

const NEXT_STATUS: Record<string, Quote['status'] | null> = {
  draft:    'sent',
  sent:     'accepted',
  accepted: null,
  rejected: null,
};

function PipelineView({ quotes, fmt, updating, onChangeStatus, onWhatsApp, onEmail, onDownload }: PipelineProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-start">
      {STATUS_ORDER.map((status) => {
        const colQuotes = quotes.filter((q) => q.status === status);
        const meta = STATUS_META[status];
        const nextStatus = NEXT_STATUS[status];

        return (
          <div key={status} className={`rounded-xl border ${PIPELINE_COL_COLORS[status]} bg-dark-900 overflow-hidden`}>
            {/* Column header */}
            <div className={`flex items-center justify-between px-3 py-2.5 ${PIPELINE_HEADER_COLORS[status]}`}>
              <div className="flex items-center gap-2">
                {meta.icon}
                <span className="font-semibold text-sm">{meta.label}</span>
              </div>
              <span className="text-xs opacity-70 font-medium">{colQuotes.length}</span>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 min-h-[120px]">
              {colQuotes.length === 0 && (
                <div className="text-center py-6 text-dark-600 text-xs">No quotes</div>
              )}
              {colQuotes.map((q) => {
                const sqm = q.custom_size_w && q.custom_size_h
                  ? (q.custom_size_w * q.custom_size_h).toFixed(1)
                  : null;
                return (
                  <div key={q.id} className="bg-dark-800 border border-dark-700 rounded-lg p-3 space-y-2.5 hover:border-dark-600 transition-colors">
                    {/* Quote ID + customer */}
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="text-cream-100 font-semibold text-xs truncate">
                          {q.customer?.name ?? 'Unknown'}
                        </p>
                        {q.customer?.company && (
                          <p className="text-dark-500 text-[10px] truncate">{q.customer.company}</p>
                        )}
                      </div>
                      <span className="text-dark-500 text-[10px] flex-shrink-0">#{q.id}</span>
                    </div>

                    {/* Rug + size */}
                    <div>
                      <p className="text-dark-300 text-xs truncate">{q.rug_catalog?.name ?? `#${q.rug_catalog_id}`}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {sqm && <span className="text-dark-500 text-[10px]">{q.custom_size_w}×{q.custom_size_h}m</span>}
                        {q.rush_order && <span className="text-[10px] text-orange-400 font-semibold">Early</span>}
                      </div>
                    </div>

                    {/* Price */}
                    {q.final_price != null && (
                      <p className="text-gold-400 font-bold text-sm">{fmt(q.final_price, q.price_currency)}</p>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-dark-700">
                      {/* WhatsApp */}
                      {q.customer?.phone && (
                        <button
                          onClick={() => onWhatsApp(q)}
                          title="Share on WhatsApp"
                          className="p-1.5 rounded-lg bg-green-900/20 text-green-400 hover:bg-green-900/40 transition-colors border border-green-700/30"
                        >
                          <MessageCircle size={11} />
                        </button>
                      )}

                      {/* Email */}
                      <button
                        onClick={() => onEmail(q)}
                        title="Email invoice"
                        className="p-1.5 rounded-lg bg-purple-900/20 text-purple-400 hover:bg-purple-900/40 transition-colors border border-purple-700/30"
                      >
                        <Mail size={11} />
                      </button>

                      {/* Download proforma */}
                      {q.final_price != null && (
                        <button
                          onClick={() => onDownload(q.id, 'proforma')}
                          title="Download Proforma"
                          className="p-1.5 rounded-lg bg-orange-900/20 text-orange-400 hover:bg-orange-900/40 transition-colors border border-orange-700/30"
                        >
                          <Download size={11} />
                        </button>
                      )}

                      {/* Advance status */}
                      {nextStatus && (
                        <button
                          onClick={() => onChangeStatus(q.id, nextStatus)}
                          disabled={updating === q.id}
                          title={`Move to ${STATUS_META[nextStatus].label}`}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors disabled:opacity-50 ml-auto ${STATUS_META[nextStatus].color} hover:opacity-80`}
                        >
                          {updating === q.id ? (
                            <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : STATUS_META[nextStatus].icon}
                          {STATUS_META[nextStatus].label}
                        </button>
                      )}

                      {/* Re-open rejected */}
                      {status === 'rejected' && (
                        <button
                          onClick={() => onChangeStatus(q.id, 'draft')}
                          disabled={updating === q.id}
                          title="Re-open as Draft"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border border-dark-600 text-dark-400 hover:text-cream-300 transition-colors disabled:opacity-50 ml-auto"
                        >
                          <Clock size={10} /> Draft
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
