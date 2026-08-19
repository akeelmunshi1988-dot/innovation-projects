import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText, RefreshCw, ChevronDown, CheckCircle, Send, XCircle, Clock,
  AlertTriangle, Download, MessageCircle, Mail, X, LayoutList, Columns, Search, Pencil, Upload, RotateCcw,
} from 'lucide-react';
import { getQuotes, getInventory, updateQuote, downloadInvoice, sendQuoteEmail, sendQuoteToCustomer, adjustQuotePrice, previewQuoteAdjustment, rejectQuote, reviseQuote, uploadQuoteSampleImage, setQuoteSampleImages } from '../services/api';
import type { Quote, Material, QuoteCalculateResponse } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { fmtTenant, fmtAs } from '../utils/currency';
import { currencyForCountry } from '../utils/countries';
import { fmtDims, fmtDim, inputUnit, toMetres } from '../utils/size';

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:    { label: 'Draft',    color: 'text-dark-400 bg-dark-800 border-dark-700',          icon: <Clock size={12} /> },
  sent:     { label: 'Sent',     color: 'text-blue-400 bg-blue-900/20 border-blue-700/40',    icon: <Send size={12} /> },
  accepted: { label: 'Accepted', color: 'text-green-400 bg-green-900/20 border-green-700/40', icon: <CheckCircle size={12} /> },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-900/20 border-red-700/40',       icon: <XCircle size={12} /> },
};

const STATUS_ORDER: Quote['status'][] = ['draft', 'sent', 'accepted', 'rejected'];

const MATERIAL_PREFERENCE_LABELS: Record<string, string> = {
  wool: 'Wool', silk: 'Silk', cotton: 'Cotton', synthetic: 'Synthetic', no_preference: 'No preference',
};

function rugName(q: Quote): string {
  if (q.rug_catalog?.name) return q.rug_catalog.name;
  return q.is_custom_request ? 'Custom Rug Request' : `Rug #${q.rug_catalog_id}`;
}

interface EmailModalState {
  quoteId: number;
  email: string;
  type: 'proforma' | 'tax' | 'export';
}

function buildWhatsAppUrl(q: Quote, fmt: (n: number, currency?: string | null) => string, sizeUnit: string, businessName: string): string {
  const phone = q.customer?.phone?.replace(/\D/g, '') ?? '';
  const name = q.customer?.name ?? 'there';
  const rug = rugName(q);
  const size = q.custom_size_w && q.custom_size_h
    ? fmtDims(q.custom_size_w, q.custom_size_h, sizeUnit, q.rug_shape || 'rect')
    : '';
  const price = q.final_price != null ? fmt(q.final_price, q.price_currency) : 'TBD';
  const msg = [
    `Hi ${name},`,
    '',
    `Here is your quote from us:`,
    `📋 Rug    : ${rug}`,
    size ? `📐 Size   : ${size}` : '',
    `📦 Qty    : ${q.qty || 1}`,
    `💰 Total  : ${price}`,
    q.rush_order ? '⚡ Rush' : '',
    '',
    'This quote is valid for 15 days. Please confirm to proceed.',
    `— ${businessName} Team`,
  ].filter(Boolean).join('\n');
  const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(msg)}`;
}

export default function Quotes() {
  const { user } = useAuth();
  const fmt = (n: number, currency?: string | null) => fmtTenant(n, user!.tenant, currency);
  // Quote/order totals shown per-row use the currency implied by that customer's own
  // country (falling back to the tenant's display currency when unmapped) rather than
  // always showing the tenant's fixed currency.
  const fmtForCustomer = (n: number, currency: string | null | undefined, country: string | null | undefined) =>
    fmtAs(n, currency, currencyForCountry(country, user!.tenant.currency), user!.tenant);
  const sizeUnit = user!.tenant.default_size_unit ?? 'ft';

  const PAGE_SIZE = 20;

  // List view: server-paginated, appended to on scroll.
  const [quotes, setQuotes]         = useState<Quote[]>([]);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({ all: 0, draft: 0, sent: 0, accepted: 0, rejected: 0 });
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]           = useState('');

  // Pipeline view: needs every status loaded at once to group into columns —
  // fetched separately from the paginated list, uncapped by the status tab.
  const [pipelineQuotes, setPipelineQuotes] = useState<Quote[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(false);

  const [filter, setFilter]         = useState<string>('all');
  const [updating, setUpdating]     = useState<number | null>(null);
  const [expanded, setExpanded]     = useState<number | null>(null);
  const [viewMode, setViewMode]     = useState<'list' | 'pipeline'>('list');

  // Filters
  const [search, setSearch]           = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rushOnly, setRushOnly]     = useState(false);
  const [customOnly, setCustomOnly] = useState(false);
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
  const [adjustModal, setAdjustModal] = useState<{
    quoteId: number; originalPrice: number; newPrice: string; discountPct: string; vendorNotes: string;
    isCustomRequest: boolean; materialId: string; marginPct: string; shippingCost: string;
    rugLabel: string; sizeLabel: string; shape: string; sizeW: string; sizeH: string;
    customerCountry: string | null | undefined;
  } | null>(null);
  const [adjusting, setAdjusting]     = useState(false);
  const [materials, setMaterials]     = useState<Material[]>([]);

  // Material-based pricing preview — shown before the vendor commits to sending
  // it to the customer. Any change to a pricing input invalidates it, forcing a
  // fresh Calculate before Send to Customer is available again.
  const [calcResult, setCalcResult]   = useState<QuoteCalculateResponse | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError]     = useState('');

  useEffect(() => {
    getInventory().then((data) => setMaterials(data.filter((m) => m.is_available))).catch(() => {});
  }, []);

  // Reject modal
  const [rejectModal, setRejectModal] = useState<{ quoteId: number; reason: string } | null>(null);
  const [rejecting, setRejecting]     = useState(false);

  // Debounce search — avoid firing a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);
    setError('');
    try {
      const data = await getQuotes({
        page: pageNum,
        page_size: PAGE_SIZE,
        status: filter !== 'all' ? filter : undefined,
        search: debouncedSearch || undefined,
        rush_order: rushOnly || undefined,
        is_custom_request: customOnly || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setQuotes((qs) => (append ? [...qs, ...data.items] : data.items));
      setTotal(data.total);
      setStatusCounts(data.status_counts);
      setPage(pageNum);
    } catch {
      setError('Failed to load quotes.');
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, debouncedSearch, rushOnly, customOnly, dateFrom, dateTo]);

  const fetchPipeline = useCallback(async () => {
    setPipelineLoading(true);
    setError('');
    try {
      const data = await getQuotes({
        page: 1,
        page_size: 200, // pipeline groups every status into columns, so it needs everything at once
        search: debouncedSearch || undefined,
        rush_order: rushOnly || undefined,
        is_custom_request: customOnly || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setPipelineQuotes(data.items);
      setTotal(data.total);
      setStatusCounts(data.status_counts);
    } catch {
      setError('Failed to load quotes.');
    } finally {
      setPipelineLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, rushOnly, customOnly, dateFrom, dateTo]);

  // Reset to page 1 / refetch whenever the active view or a filter changes
  useEffect(() => {
    if (viewMode === 'list') fetchPage(1, false);
  }, [viewMode, fetchPage]);

  useEffect(() => {
    if (viewMode === 'pipeline') fetchPipeline();
  }, [viewMode, fetchPipeline]);

  // Infinite scroll — load the next page once the sentinel at the bottom of the
  // list comes into view.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = quotes.length < total;

  useEffect(() => {
    if (viewMode !== 'list') return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchPage(page + 1, true);
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewMode, hasMore, loading, loadingMore, page, fetchPage]);

  const load = () => (viewMode === 'pipeline' ? fetchPipeline() : fetchPage(1, false));

  // Applies a mutated quote to whichever view(s) currently hold it, then
  // reconciles counts/pagination from the server — status changes can move a
  // quote out of the currently active status tab or pipeline column.
  const applyQuoteUpdate = (updated: Quote) => {
    setQuotes((qs) => qs.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)));
    setPipelineQuotes((qs) => qs.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)));
    if (viewMode === 'pipeline') fetchPipeline(); else fetchPage(1, false);
  };

  const changeStatus = async (id: number, status: Quote['status']) => {
    setUpdating(id);
    try {
      const updated = await updateQuote(id, { status });
      applyQuoteUpdate(updated);
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
      applyQuoteUpdate(updated);
      setSendModal(null);
    } catch {
      // silently fail — user can retry
    } finally {
      setSendingQuote(false);
    }
  };

  const handleSaveSampleImages = async (quoteId: number, imageUrls: string[]) => {
    const updated = await setQuoteSampleImages(quoteId, imageUrls);
    setQuotes((qs) => qs.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)));
    setPipelineQuotes((qs) => qs.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)));
  };

  const [adjustError, setAdjustError] = useState('');

  const closeAdjustModal = () => {
    setAdjustModal(null);
    setCalcResult(null);
    setCalcError('');
    setAdjustError('');
  };

  // Shared by Calculate and Send to Customer — parses/converts the material-form
  // fields once so the two actions can't drift out of sync with each other.
  const parseMaterialFormSize = () => {
    if (!adjustModal) return null;
    const unit = inputUnit(sizeUnit);
    const w = parseFloat(adjustModal.sizeW);
    if (isNaN(w) || w <= 0) return null;
    const sizeWM = toMetres(w, unit);
    let sizeHM: number;
    if (adjustModal.shape !== 'circle') {
      const h = parseFloat(adjustModal.sizeH);
      if (isNaN(h) || h <= 0) return null;
      sizeHM = toMetres(h, unit);
    } else {
      sizeHM = sizeWM;
    }
    return { sizeWM, sizeHM };
  };

  const handleCalculate = async () => {
    if (!adjustModal || !adjustModal.materialId) return;
    const size = parseMaterialFormSize();
    if (!size) return;
    const discountPct = adjustModal.discountPct ? parseFloat(adjustModal.discountPct) : undefined;
    const shippingCost = adjustModal.shippingCost ? parseFloat(adjustModal.shippingCost) : undefined;

    setCalcError('');
    setCalculating(true);
    try {
      const result = await previewQuoteAdjustment(adjustModal.quoteId, {
        materialId: Number(adjustModal.materialId),
        marginPct: adjustModal.marginPct ? parseFloat(adjustModal.marginPct) : undefined,
        manualDiscountPct: discountPct && discountPct > 0 ? discountPct : undefined,
        shippingCost: shippingCost && shippingCost > 0 ? shippingCost : undefined,
        customSizeW: size.sizeWM,
        customSizeH: size.sizeHM,
        rugShape: adjustModal.shape,
      });
      setCalcResult(result);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to calculate.';
      setCalcError(msg);
    } finally {
      setCalculating(false);
    }
  };

  // Auto-recalculate the material-based price shortly after the vendor stops
  // editing — no explicit "Calculate" click needed. Each relevant field's
  // onChange already clears calcResult immediately so stale numbers never
  // linger on screen while this debounce is pending.
  useEffect(() => {
    if (!adjustModal || !adjustModal.isCustomRequest) return;
    const t = setTimeout(() => { handleCalculate(); }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    adjustModal?.isCustomRequest,
    adjustModal?.materialId,
    adjustModal?.sizeW,
    adjustModal?.sizeH,
    adjustModal?.marginPct,
    adjustModal?.discountPct,
    adjustModal?.shippingCost,
    adjustModal?.shape,
  ]);

  const handleAdjustPrice = async () => {
    if (!adjustModal) return;
    const discountPct = adjustModal.discountPct ? parseFloat(adjustModal.discountPct) : undefined;
    const shippingCost = adjustModal.shippingCost ? parseFloat(adjustModal.shippingCost) : undefined;
    const useMaterial = adjustModal.isCustomRequest;

    let sizeWM: number | undefined;
    let sizeHM: number | undefined;
    if (useMaterial) {
      if (!adjustModal.materialId || !calcResult) return;
      const size = parseMaterialFormSize();
      if (!size) return;
      sizeWM = size.sizeWM;
      sizeHM = size.sizeHM;
    } else {
      const price = parseFloat(adjustModal.newPrice);
      if (isNaN(price) || price <= 0) return;
    }

    setAdjustError('');
    setAdjusting(true);
    try {
      const updated = await adjustQuotePrice(adjustModal.quoteId, {
        finalPrice: useMaterial ? undefined : parseFloat(adjustModal.newPrice),
        materialId: useMaterial ? Number(adjustModal.materialId) : undefined,
        marginPct: useMaterial && adjustModal.marginPct ? parseFloat(adjustModal.marginPct) : undefined,
        vendorNotes: adjustModal.vendorNotes || undefined,
        manualDiscountPct: discountPct && discountPct > 0 ? discountPct : undefined,
        shippingCost: shippingCost && shippingCost > 0 ? shippingCost : undefined,
        customSizeW: sizeWM,
        customSizeH: sizeHM,
        rugShape: useMaterial ? adjustModal.shape : undefined,
      });
      applyQuoteUpdate(updated);
      closeAdjustModal();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to save.';
      setAdjustError(msg);
    } finally {
      setAdjusting(false);
    }
  };

  const handleRejectQuote = async () => {
    if (!rejectModal) return;
    setRejecting(true);
    try {
      const updated = await rejectQuote(rejectModal.quoteId, rejectModal.reason.trim() || undefined);
      applyQuoteUpdate(updated);
      setRejectModal(null);
    } catch {
      // silently fail — user can retry
    } finally {
      setRejecting(false);
    }
  };

  const [revising, setRevising] = useState<number | null>(null);

  const handleReviseQuote = async (quoteId: number) => {
    setRevising(quoteId);
    setError('');
    try {
      const newQuote = await reviseQuote(quoteId);
      if (viewMode === 'pipeline') await fetchPipeline(); else await fetchPage(1, false);
      setExpanded(newQuote.id);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to revise quote.';
      setError(msg);
    } finally {
      setRevising(null);
    }
  };

  const visible = quotes;
  const counts = statusCounts;
  const revisedIntoMap: Record<number, number> = {};
  quotes.forEach((q) => { if (q.revised_from_quote_id != null) revisedIntoMap[q.revised_from_quote_id] = q.id; });
  pipelineQuotes.forEach((q) => { if (q.revised_from_quote_id != null) revisedIntoMap[q.revised_from_quote_id] = q.id; });
  const displayedCount = viewMode === 'pipeline' ? pipelineQuotes.length : quotes.length;

  const activeFilterCount = [search, rushOnly, customOnly, dateFrom, dateTo].filter(Boolean).length;
  const clearFilters = () => { setSearch(''); setRushOnly(false); setCustomOnly(false); setDateFrom(''); setDateTo(''); };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-cream-100">Quotes</h1>
          <p className="text-dark-400 text-sm mt-0.5">
            Showing {displayedCount} of {total} quote{total !== 1 ? 's' : ''}
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
            disabled={viewMode === 'pipeline' ? pipelineLoading : loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl text-dark-300 text-sm transition-colors"
          >
            <RefreshCw size={14} className={(viewMode === 'pipeline' ? pipelineLoading : loading) ? 'animate-spin' : ''} /> Refresh
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
            ⚡ Rush Only
          </button>

          <button
            onClick={() => setCustomOnly((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
              customOnly
                ? 'bg-gold-900/30 border-gold-600/60 text-gold-400'
                : 'bg-dark-900 border-dark-600 text-dark-400 hover:text-cream-300 hover:border-dark-500'
            }`}
          >
            Custom Requests Only
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

      {(viewMode === 'pipeline' ? pipelineLoading : loading) ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-dark-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : viewMode === 'pipeline' ? (
        <PipelineView
          quotes={pipelineQuotes}
          fmtForCustomer={fmtForCustomer}
          sizeUnit={sizeUnit}
          updating={updating}
          onChangeStatus={changeStatus}
          onWhatsApp={(q) => window.open(buildWhatsAppUrl(q, fmt, sizeUnit, user!.tenant.name), '_blank')}
          onEmail={openEmailModal}
          onDownload={downloadInvoice}
          onRevise={handleReviseQuote}
          revising={revising}
          revisedIntoMap={revisedIntoMap}
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
              groupCount={q.request_group_id ? visible.filter((o) => o.request_group_id === q.request_group_id).length : 0}
              fmtForCustomer={fmtForCustomer}
              sizeUnit={sizeUnit}
              isOpen={expanded === q.id}
              updating={updating}
              onToggle={() => setExpanded(expanded === q.id ? null : q.id)}
              onChangeStatus={changeStatus}
              onWhatsApp={() => window.open(buildWhatsAppUrl(q, fmt, sizeUnit, user!.tenant.name), '_blank')}
              onEmail={() => openEmailModal(q)}
              onDownload={downloadInvoice}
              onSend={() => setSendModal({ quoteId: q.id, vendorNotes: q.vendor_notes ?? '' })}
              onAdjust={() => { setCalcResult(null); setCalcError(''); setAdjustModal({
                quoteId: q.id, originalPrice: q.final_price ?? 0, newPrice: String(q.final_price ?? ''),
                discountPct: String((q as any).manual_discount_pct ?? ''), vendorNotes: q.vendor_notes ?? '',
                isCustomRequest: !!q.is_custom_request,
                materialId: q.material_id != null
                  ? String(q.material_id)
                  : (materials.find((m) => m.type === q.material_preference)?.id.toString() ?? ''),
                marginPct: '',
                shippingCost: String((q as any).shipping_cost ?? ''),
                customerCountry: q.customer?.country,
                rugLabel: rugName(q),
                sizeLabel: [
                  q.custom_size_w && q.custom_size_h ? fmtDims(q.custom_size_w, q.custom_size_h, sizeUnit, q.rug_shape || 'rect') : null,
                  q.qty > 1 ? `qty ${q.qty}` : null,
                ].filter(Boolean).join(' · '),
                shape: q.rug_shape || 'rect',
                sizeW: q.custom_size_w != null ? fmtDim(q.custom_size_w, inputUnit(sizeUnit)) : '',
                sizeH: q.custom_size_h != null ? fmtDim(q.custom_size_h, inputUnit(sizeUnit)) : '',
              }); }}
              onReject={() => setRejectModal({ quoteId: q.id, reason: '' })}
              onSaveSampleImages={handleSaveSampleImages}
              onRevise={() => handleReviseQuote(q.id)}
              revising={revising === q.id}
              revisedIntoId={revisedIntoMap[q.id]}
            />
          ))}

          {/* Infinite scroll sentinel — loading the next page fires when this scrolls into view */}
          {hasMore && (
            <div ref={sentinelRef} className="flex items-center justify-center py-4">
              {loadingMore && (
                <div className="flex items-center gap-2 text-dark-500 text-xs">
                  <RefreshCw size={13} className="animate-spin" /> Loading more quotes…
                </div>
              )}
            </div>
          )}
          {!hasMore && quotes.length > 0 && (
            <p className="text-center text-dark-600 text-xs py-3">All {total} quotes loaded</p>
          )}
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
            <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
                <div className="flex items-center gap-2">
                  <Pencil size={16} className="text-gold-400" />
                  <h2 className="text-cream-100 font-semibold">Adjust Quote Price</h2>
                </div>
                <button onClick={closeAdjustModal} className="text-dark-400 hover:text-cream-300"><X size={18} /></button>
              </div>
              <div className="px-5 pt-4 -mb-1">
                <p className="text-cream-200 text-sm font-medium">{adjustModal.rugLabel}</p>
                {adjustModal.sizeLabel && <p className="text-dark-500 text-xs mt-0.5">{adjustModal.sizeLabel}</p>}
              </div>
              <div className="p-5 space-y-4">
                {adjustModal.isCustomRequest ? (
                  <>
                    <div>
                      <label className="block text-dark-300 text-xs uppercase tracking-wider mb-1.5">
                        Size ({inputUnit(sizeUnit)}) * {!adjustModal.sizeW && <span className="text-red-400 normal-case tracking-normal">— not on file yet, needed to price from material cost</span>}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={adjustModal.sizeW}
                          onChange={(e) => { setAdjustModal({ ...adjustModal, sizeW: e.target.value }); setCalcResult(null); }}
                          placeholder={adjustModal.shape === 'circle' ? 'Diameter' : 'Width'}
                          className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3 py-2.5 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-500"
                        />
                        {adjustModal.shape !== 'circle' && (
                          <>
                            <span className="text-dark-500 text-xs flex-shrink-0">×</span>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={adjustModal.sizeH}
                              onChange={(e) => { setAdjustModal({ ...adjustModal, sizeH: e.target.value }); setCalcResult(null); }}
                              placeholder="Height"
                              className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3 py-2.5 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-500"
                            />
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-dark-300 text-xs uppercase tracking-wider mb-1.5">Material *</label>
                      <select
                        value={adjustModal.materialId}
                        onChange={(e) => { setAdjustModal({ ...adjustModal, materialId: e.target.value }); setCalcResult(null); }}
                        className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3 py-2.5 text-cream-100 text-sm focus:outline-none focus:border-gold-500"
                      >
                        <option value="">Select material…</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} — {fmt(m.cost_per_sqm, m.cost_currency)}/sqm
                          </option>
                        ))}
                      </select>
                      <p className="text-dark-600 text-xs mt-1">
                        Price is calculated as margin over this material's cost, sized to the request's dimensions — same math as a catalog quote.
                      </p>
                    </div>
                    <div>
                      <label className="block text-dark-300 text-xs uppercase tracking-wider mb-1.5">
                        Margin % (optional — defaults to your standard {user!.tenant.default_profit_margin_pct}%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={adjustModal.marginPct}
                        onChange={(e) => { setAdjustModal({ ...adjustModal, marginPct: e.target.value }); setCalcResult(null); }}
                        placeholder={String(user!.tenant.default_profit_margin_pct)}
                        className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3 py-2.5 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-500"
                      />
                    </div>
                    <div>
                      <label className="block text-dark-300 text-xs uppercase tracking-wider mb-1.5">Discount % (optional)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={adjustModal.discountPct}
                          onChange={(e) => { setAdjustModal({ ...adjustModal, discountPct: e.target.value }); setCalcResult(null); }}
                          placeholder="0"
                          className="w-28 bg-dark-800 border border-dark-600 rounded-xl px-3 py-2.5 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-500"
                        />
                        <span className="text-dark-400 text-sm">%</span>
                      </div>
                      <p className="text-dark-600 text-xs mt-1">Applied on top of the material-calculated price.</p>
                    </div>
                    <div>
                      <label className="block text-dark-300 text-xs uppercase tracking-wider mb-1.5">Shipping Cost (optional)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={adjustModal.shippingCost}
                        onChange={(e) => { setAdjustModal({ ...adjustModal, shippingCost: e.target.value }); setCalcResult(null); }}
                        placeholder="0"
                        className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3 py-2.5 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-500"
                      />
                      <p className="text-dark-600 text-xs mt-1">Flat shipping charge added on top of the calculated price.</p>
                    </div>

                    <div>
                      {calculating && (
                        <div className="flex items-center gap-2 text-dark-400 text-xs py-1">
                          <div className="w-3.5 h-3.5 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" /> Calculating…
                        </div>
                      )}
                      {calcError && (
                        <div className="flex items-center gap-2 bg-red-900/20 border border-red-600/30 rounded-lg p-2.5 text-red-400 text-xs mt-2">
                          <AlertTriangle size={13} /> {calcError}
                        </div>
                      )}
                      {calcResult && (
                        <div className="bg-dark-800 border border-dark-600 rounded-xl p-3.5 mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-dark-400">
                            <span>Subtotal ({calcResult.total_sqm.toFixed(2)} sqm × {fmtForCustomer(calcResult.base_price_per_sqm, calcResult.price_currency, adjustModal.customerCountry)}/sqm)</span>
                            <span>{fmtForCustomer(calcResult.subtotal, calcResult.price_currency, adjustModal.customerCountry)}</span>
                          </div>
                          {calcResult.manual_discount > 0 && (
                            <div className="flex items-center justify-between text-xs text-red-400">
                              <span>Discount</span>
                              <span>−{fmtForCustomer(calcResult.manual_discount, calcResult.price_currency, adjustModal.customerCountry)}</span>
                            </div>
                          )}
                          {calcResult.rush_surcharge > 0 && (
                            <div className="flex items-center justify-between text-xs text-dark-400">
                              <span>Rush surcharge</span>
                              <span>+{fmtForCustomer(calcResult.rush_surcharge, calcResult.price_currency, adjustModal.customerCountry)}</span>
                            </div>
                          )}
                          {calcResult.gst_inclusive && (
                            <div className="flex items-center justify-between text-xs text-dark-400">
                              <span>GST ({calcResult.gst_pct.toFixed(0)}%, included)</span>
                              <span>{fmtForCustomer(calcResult.gst_amount, calcResult.price_currency, adjustModal.customerCountry)}</span>
                            </div>
                          )}
                          {calcResult.shipping_cost > 0 && (
                            <div className="flex items-center justify-between text-xs text-dark-400">
                              <span>Shipping</span>
                              <span>+{fmtForCustomer(calcResult.shipping_cost, calcResult.price_currency, adjustModal.customerCountry)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm font-semibold text-cream-100 pt-1.5 border-t border-dark-700">
                            <span>Final Price</span>
                            <span>{fmtForCustomer(calcResult.final_price, calcResult.price_currency, adjustModal.customerCountry)}</span>
                          </div>
                          {!calcResult.material_available && (
                            <p className="text-amber-400 text-xs pt-1">{calcResult.material_message}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
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
                            → {fmtForCustomer(discountedPrice, null, adjustModal.customerCountry)}
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
                      <p className="text-dark-600 text-xs mt-1">
                        {adjustModal.originalPrice > 0
                          ? <>Original: {fmtForCustomer(adjustModal.originalPrice, null, adjustModal.customerCountry)} — enter discount % above or override price directly</>
                          : 'No price set yet — enter the price you\'re quoting for this request'}
                      </p>
                    </div>

                    {/* Shipping Cost — informational breakdown line only; the Final Price above
                        is treated as the true total, so this doesn't get added on top of it. */}
                    <div>
                      <label className="block text-dark-300 text-xs uppercase tracking-wider mb-1.5">Shipping Cost (optional)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={adjustModal.shippingCost}
                        onChange={(e) => setAdjustModal({ ...adjustModal, shippingCost: e.target.value })}
                        placeholder="0"
                        className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3 py-2.5 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-500"
                      />
                      <p className="text-dark-600 text-xs mt-1">Shown to the customer as a breakdown line — already included in the Final Price above, not added on top of it.</p>
                    </div>
                  </>
                )}

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
                {adjustError && (
                  <div className="flex items-center gap-2 bg-red-900/20 border border-red-600/30 rounded-lg p-2.5 text-red-400 text-xs">
                    <AlertTriangle size={13} /> {adjustError}
                  </div>
                )}
                <p className="text-dark-500 text-xs">Saving will set the quote status to <span className="text-blue-300">Sent</span> and notify the customer.</p>
              </div>
              <div className="flex gap-3 px-5 pb-5">
                <button onClick={closeAdjustModal} className="flex-1 py-2.5 rounded-xl border border-dark-600 text-dark-300 text-sm hover:bg-dark-700 transition-colors">Cancel</button>
                <button
                  onClick={handleAdjustPrice}
                  disabled={
                    adjusting ||
                    (adjustModal.isCustomRequest
                      ? !calcResult
                      : !adjustModal.newPrice || parseFloat(adjustModal.newPrice) <= 0)
                  }
                  title={adjustModal.isCustomRequest && !calcResult ? 'Waiting on the price calculation to finish' : undefined}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold-600 hover:bg-gold-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {adjusting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Pencil size={14} />}
                  {adjusting ? 'Sending…' : (adjustModal.isCustomRequest ? 'Send to Customer' : 'Save & Send')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reject Quote Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
              <div className="flex items-center gap-2">
                <XCircle size={16} className="text-red-400" />
                <h2 className="text-cream-100 font-semibold">Reject Quote</h2>
              </div>
              <button onClick={() => setRejectModal(null)} className="text-dark-400 hover:text-cream-300"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-dark-300 text-xs uppercase tracking-wider mb-1.5">Reason (optional, shared with customer)</label>
                <textarea
                  rows={3}
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  placeholder="e.g. This design isn't something we can produce at the requested size…"
                  className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3 py-2.5 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-red-500 resize-none"
                />
              </div>
              <p className="text-dark-500 text-xs">The customer will be emailed that this quote was declined, including the reason above if provided.</p>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2.5 rounded-xl border border-dark-600 text-dark-300 text-sm hover:bg-dark-700 transition-colors">Cancel</button>
              <button
                onClick={handleRejectQuote}
                disabled={rejecting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {rejecting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <XCircle size={14} />}
                {rejecting ? 'Rejecting…' : 'Reject & Notify Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

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
  groupCount: number;
  fmtForCustomer: (n: number, currency: string | null | undefined, country: string | null | undefined) => string;
  sizeUnit: string;
  isOpen: boolean;
  updating: number | null;
  onToggle: () => void;
  onChangeStatus: (id: number, status: Quote['status']) => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onDownload: (id: number, type: 'tax' | 'export' | 'proforma') => void;
  onSend: () => void;
  onAdjust: () => void;
  onReject: () => void;
  onSaveSampleImages: (quoteId: number, imageUrls: string[]) => Promise<void>;
  onRevise: () => void;
  revising: boolean;
  revisedIntoId?: number;
}

const MAX_SAMPLE_IMAGES = 3;

function QuoteRow({ q, groupCount, fmtForCustomer, sizeUnit, isOpen, updating, onToggle, onChangeStatus, onWhatsApp, onEmail, onDownload, onSend, onAdjust, onReject, onSaveSampleImages, onRevise, revising, revisedIntoId }: QuoteRowProps) {
  const meta = STATUS_META[q.status];
  const sqm  = q.custom_size_w && q.custom_size_h ? (q.custom_size_w * q.custom_size_h).toFixed(2) : null;
  const dims = q.custom_size_w && q.custom_size_h
    ? fmtDims(q.custom_size_w, q.custom_size_h, sizeUnit, q.rug_shape || 'rect')
    : null;
  const [uploadingSample, setUploadingSample] = useState(false);
  const [sampleError, setSampleError] = useState('');
  const sampleImages = q.vendor_sample_image_urls ?? [];

  const handleSampleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSampleError('');
    setUploadingSample(true);
    try {
      const { url } = await uploadQuoteSampleImage(q.id, file);
      await onSaveSampleImages(q.id, [...sampleImages, url]);
    } catch (err: any) {
      setSampleError(err.response?.data?.detail ?? 'Upload failed.');
    } finally {
      setUploadingSample(false);
    }
  };

  const handleRemoveSampleImage = async (url: string) => {
    setSampleError('');
    try {
      await onSaveSampleImages(q.id, sampleImages.filter((u) => u !== url));
    } catch (err: any) {
      setSampleError(err.response?.data?.detail ?? 'Failed to remove image.');
    }
  };

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
            {q.is_custom_request && (
              <span className="text-xs bg-gold-900/30 text-gold-400 border border-gold-700/30 rounded-full px-2 py-0.5">Custom Request</span>
            )}
          </div>
          <p className="text-dark-400 text-xs truncate mt-0.5">
            {rugName(q)}
            {sqm && ` · ${dims} (${sqm}m²)`}
            {q.qty > 1 && ` · qty ${q.qty}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0 hidden sm:block">
          <p className="text-gold-400 font-bold text-sm">{q.final_price != null ? fmtForCustomer(q.final_price, q.price_currency, q.customer?.country) : '—'}</p>
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
              <p className="text-cream-200 font-medium">{rugName(q)}</p>
              <p className="text-dark-400 text-xs">{q.material?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-dark-300 text-xs uppercase tracking-wider mb-1">Specs</p>
              {sqm && <p className="text-cream-200 font-medium">{dims}</p>}
              <p className="text-dark-400 text-xs">Qty: {q.qty} · {q.rush_order ? 'Rush' : 'Standard'}</p>
            </div>
            <div>
              <p className="text-dark-300 text-xs uppercase tracking-wider mb-1">Pricing</p>
              <p className="text-cream-200 font-medium">{q.final_price != null ? fmtForCustomer(q.final_price, q.price_currency, q.customer?.country) : '—'}</p>
              <p className="text-dark-400 text-xs">Base: {q.base_price != null ? fmtForCustomer(q.base_price, q.price_currency, q.customer?.country) : '—'}</p>
            </div>
          </div>

          {q.is_custom_request && (
            <div className="bg-gold-900/10 border border-gold-700/30 rounded-lg px-3 py-3 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-gold-400 text-xs uppercase tracking-wider font-semibold">Custom Rug Request Brief</p>
                {groupCount > 1 && (
                  <span
                    title="These quotes were submitted together — combine their orders once accepted via Orders → Combine into One Order"
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-900/30 text-blue-300 border border-blue-700/40 uppercase tracking-wide"
                  >
                    Part of a {groupCount}-rug request
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-dark-400 text-xs">Room</p>
                  <p className="text-cream-200">{q.room_type || '—'}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-xs">Material preference</p>
                  <p className="text-cream-200">{MATERIAL_PREFERENCE_LABELS[q.material_preference ?? ''] ?? q.material_preference ?? '—'}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-xs">Budget range</p>
                  <p className="text-cream-200">{q.budget_range || '—'}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-xs">Expected delivery</p>
                  <p className="text-cream-200">{q.expected_delivery || '—'}</p>
                </div>
              </div>
              {q.reference_image_urls && q.reference_image_urls.length > 0 && (
                <div>
                  <p className="text-dark-400 text-xs mb-1.5">Reference images</p>
                  <div className="flex gap-2 flex-wrap">
                    {q.reference_image_urls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden border border-dark-700 hover:border-gold-600 transition-colors">
                        <img src={url} alt="Reference" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-dark-400 text-xs mb-1.5">Sample images for customer</p>
                <div className="flex gap-2 flex-wrap items-center">
                  {sampleImages.map((url) => (
                    <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-dark-700 group">
                      <a href={url} target="_blank" rel="noreferrer" className="block w-full h-full">
                        <img src={url} alt="Sample" className="w-full h-full object-cover" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveSampleImage(url)}
                        className="absolute top-0.5 right-0.5 bg-dark-950/80 hover:bg-red-900/80 text-dark-300 hover:text-red-300 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                  {sampleImages.length < MAX_SAMPLE_IMAGES && (
                    <label className={`w-16 h-16 rounded-lg border border-dashed border-dark-600 flex items-center justify-center text-dark-500 hover:border-gold-600 hover:text-gold-500 transition-colors cursor-pointer ${uploadingSample ? 'opacity-50 pointer-events-none' : ''}`}>
                      {uploadingSample ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={uploadingSample}
                        onChange={handleSampleFileChange}
                      />
                    </label>
                  )}
                </div>
                {sampleError && <p className="text-red-400 text-xs mt-1">{sampleError}</p>}
                <p className="text-dark-500 text-xs mt-1">Upload design samples to show the customer alongside this quote — up to {MAX_SAMPLE_IMAGES}.</p>
              </div>
            </div>
          )}

          {q.notes && (
            <div className="bg-dark-900 rounded-lg px-3 py-2.5">
              <p className="text-dark-300 text-xs uppercase tracking-wider mb-1">
                {q.is_custom_request ? 'Style / Vision Notes' : 'Customer Notes'}
              </p>
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

          {/* Status actions — Sent/Accepted require a price to already be set (enforced
              server-side too); Rejected opens a reason modal instead of firing directly.
              Accepted quotes already have an order and can't be edited — no pills needed.
              Rejected quotes can't be edited either — offer Revise & Resend instead. */}
          {q.status !== 'accepted' && q.status !== 'rejected' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-dark-500 text-xs">Status:</span>
              {STATUS_ORDER.filter((s) => s !== q.status && !((s === 'sent' || s === 'accepted') && q.final_price == null)).map((s) => (
                <button
                  key={s}
                  onClick={() => (s === 'rejected' ? onReject() : onChangeStatus(q.id, s))}
                  disabled={updating === q.id}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${STATUS_META[s].color} hover:opacity-80`}
                >
                  {updating === q.id ? (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : STATUS_META[s].icon}
                  {s === 'accepted' ? 'Accept - Create Order' : s === 'rejected' ? 'Reject' : STATUS_META[s].label}
                </button>
              ))}
            </div>
          )}

          {q.status === 'rejected' && (
            <div className="flex items-center gap-2 flex-wrap">
              {revisedIntoId != null ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-dark-600 text-dark-400">
                  <RotateCcw size={11} /> Revised into Quote #{revisedIntoId}
                </span>
              ) : (
                <button
                  onClick={onRevise}
                  disabled={revising}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gold-700/40 bg-gold-900/20 text-gold-400 hover:bg-gold-900/40 transition-colors disabled:opacity-50"
                >
                  {revising ? (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : <RotateCcw size={11} />}
                  Revise & Resend
                </button>
              )}
            </div>
          )}

          {/* Pricing actions — Adjust/Set Price is always available (not gated on final_price)
              so a fresh custom request with no price yet can actually be priced. */}
          {q.status !== 'accepted' && q.status !== 'rejected' && (
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-dark-800">
              <button
                onClick={onAdjust}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gold-700/40 bg-gold-900/20 text-gold-400 hover:bg-gold-900/40 transition-colors"
              >
                <Pencil size={11} /> {q.is_custom_request
                  ? (q.final_price != null ? 'Adjust Price and Material' : 'Set Price and Material')
                  : (q.final_price != null ? 'Adjust Price' : 'Set Price')}
              </button>

              {q.final_price != null && (
                <button
                  onClick={onSend}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-700/40 bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 transition-colors"
                >
                  <Send size={11} /> Send to Customer
                </button>
              )}
            </div>
          )}

          {/* Contact + downloads — need a price to be meaningful, shown regardless of status
              (accepted quotes still need their invoice downloaded). */}
          {q.final_price != null && (
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-dark-800">
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
  fmtForCustomer: (n: number, currency: string | null | undefined, country: string | null | undefined) => string;
  sizeUnit: string;
  updating: number | null;
  onChangeStatus: (id: number, status: Quote['status']) => void;
  onWhatsApp: (q: Quote) => void;
  onEmail: (q: Quote) => void;
  onDownload: (id: number, type: 'tax' | 'export' | 'proforma') => void;
  onRevise: (id: number) => void;
  revising: number | null;
  revisedIntoMap: Record<number, number>;
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

function PipelineView({ quotes, fmtForCustomer, sizeUnit, updating, onChangeStatus, onWhatsApp, onEmail, onDownload, onRevise, revising, revisedIntoMap }: PipelineProps) {
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
                      <p className="text-dark-300 text-xs truncate">{rugName(q)}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {sqm && (
                          <span className="text-dark-500 text-[10px]">
                            {fmtDims(q.custom_size_w, q.custom_size_h, sizeUnit, q.rug_shape || 'rect')}
                          </span>
                        )}
                        {q.rush_order && <span className="text-[10px] text-orange-400 font-semibold">Early</span>}
                      </div>
                    </div>

                    {/* Price */}
                    {q.final_price != null && (
                      <p className="text-gold-400 font-bold text-sm">{fmtForCustomer(q.final_price, q.price_currency, q.customer?.country)}</p>
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

                      {/* Advance status — Sent/Accepted require a price (enforced server-side too) */}
                      {nextStatus && !((nextStatus === 'sent' || nextStatus === 'accepted') && q.final_price == null) && (
                        <button
                          onClick={() => onChangeStatus(q.id, nextStatus)}
                          disabled={updating === q.id}
                          title={nextStatus === 'accepted' ? 'Accept - Create Order' : `Move to ${STATUS_META[nextStatus].label}`}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors disabled:opacity-50 ml-auto ${STATUS_META[nextStatus].color} hover:opacity-80`}
                        >
                          {updating === q.id ? (
                            <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : STATUS_META[nextStatus].icon}
                          {nextStatus === 'accepted' ? 'Accept' : STATUS_META[nextStatus].label}
                        </button>
                      )}

                      {/* Rejected quotes can't be edited — offer Revise & Resend instead */}
                      {status === 'rejected' && (
                        revisedIntoMap[q.id] != null ? (
                          <span
                            title={`Revised into Quote #${revisedIntoMap[q.id]}`}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border border-dark-600 text-dark-400 ml-auto"
                          >
                            <RotateCcw size={10} /> Revised
                          </span>
                        ) : (
                          <button
                            onClick={() => onRevise(q.id)}
                            disabled={revising === q.id}
                            title="Revise & Resend"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border border-gold-700/40 bg-gold-900/20 text-gold-400 hover:bg-gold-900/40 transition-colors disabled:opacity-50 ml-auto"
                          >
                            {revising === q.id ? (
                              <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                            ) : <RotateCcw size={10} />}
                            Revise & Resend
                          </button>
                        )
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
