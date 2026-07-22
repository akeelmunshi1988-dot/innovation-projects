import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calculator, AlertTriangle, CheckCircle, Clock, DollarSign, Package, Send, UserPlus } from 'lucide-react';
import { getCatalog, getInventory, calculateQuote, getCustomers, createCustomer, createQuote, sendQuoteToCustomer } from '../services/api';
import type { RugCatalog, Material, QuoteCalculateResponse, Customer } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { fmtTenant } from '../utils/currency';

const QuoteBuilder: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenant = user!.tenant;
  const fmt = (n: number, currency?: string | null) => fmtTenant(n, tenant, currency);

  const [rugs, setRugs] = useState<RugCatalog[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [rugId, setRugId] = useState<number | ''>('');
  const [sizeW, setSizeW] = useState<string>('');
  const [sizeH, setSizeH] = useState<string>('');
  const [materialId, setMaterialId] = useState<number | ''>('');
  const [qty, setQty] = useState<string>('1');
  const [rushOrder, setRushOrder] = useState(false);

  const [result, setResult] = useState<QuoteCalculateResponse | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Customer + send state — only relevant once a quote has been calculated
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [expectedDeliveryDays, setExpectedDeliveryDays] = useState<string>('');
  const [vendorNotes, setVendorNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [catalogData, inventoryData, customerData] = await Promise.all([getCatalog(), getInventory(), getCustomers()]);
        setRugs(catalogData);
        setMaterials(inventoryData.filter((m) => m.is_available));
        setCustomers(customerData);
        const paramRugId = searchParams.get('rug_id');
        if (paramRugId) {
          const id = Number(paramRugId);
          if (catalogData.some((r) => r.id === id)) setRugId(id);
        }
        const paramW = searchParams.get('size_w');
        const paramH = searchParams.get('size_h');
        const paramQty = searchParams.get('qty');
        const paramRush = searchParams.get('rush_order');
        const paramMat = searchParams.get('material_id');
        if (paramW) setSizeW(paramW);
        if (paramH) setSizeH(paramH);
        if (paramQty) setQty(paramQty);
        if (paramRush) setRushOrder(paramRush === 'true');
        if (paramMat) {
          const matId = Number(paramMat);
          const available = inventoryData.filter((m) => m.is_available);
          if (available.some((m) => m.id === matId)) setMaterialId(matId);
        }
      } catch {
        // silently fail, show empty
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  // Prefill material when rug is selected
  useEffect(() => {
    if (rugId !== '') {
      const rug = rugs.find((r) => r.id === Number(rugId));
      if (rug) setMaterialId(rug.material_id);
    }
  }, [rugId, rugs]);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rugId === '' || !sizeW || !sizeH || materialId === '') return;

    setCalculating(true);
    setCalcError(null);
    setResult(null);
    setSendError(null);
    setSendSuccess(null);

    try {
      const data = await calculateQuote({
        rug_id: Number(rugId),
        size_w: parseFloat(sizeW),
        size_h: parseFloat(sizeH),
        material_id: Number(materialId),
        qty: parseInt(qty) || 1,
        rush_order: rushOrder,
      });
      setResult(data);
      setExpectedDeliveryDays(String(data.estimated_days));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setCalcError(e?.response?.data?.detail ?? 'Failed to calculate quote. Please check your inputs.');
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveAndSend = async () => {
    if (!result) return;
    setSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      let finalCustomerId = customerId;

      if (showNewCustomer) {
        if (!newCustomerName.trim() || !newCustomerEmail.trim()) {
          setSendError('Please enter a name and email for the new customer.');
          setSending(false);
          return;
        }
        const created = await createCustomer({
          name: newCustomerName.trim(),
          email: newCustomerEmail.trim(),
          phone: newCustomerPhone.trim() || undefined,
        });
        setCustomers((prev) => [...prev, created]);
        finalCustomerId = created.id;
        setCustomerId(created.id);
        setShowNewCustomer(false);
      }

      if (finalCustomerId === '') {
        setSendError('Please select or add a customer.');
        setSending(false);
        return;
      }

      const quote = await createQuote({
        customer_id: Number(finalCustomerId),
        rug_catalog_id: Number(rugId),
        material_id: Number(materialId),
        custom_size_w: parseFloat(sizeW),
        custom_size_h: parseFloat(sizeH),
        qty: parseInt(qty) || 1,
        base_price: result.subtotal,
        final_price: result.final_price,
        margin_pct: result.profit_margin_pct,
        gst_pct: result.gst_pct,
        rush_order: rushOrder,
        expected_delivery_days: parseInt(expectedDeliveryDays) || result.estimated_days,
        status: 'draft',
      });

      const customerName = customers.find((c) => c.id === finalCustomerId)?.name ?? 'the customer';
      await sendQuoteToCustomer(quote.id, vendorNotes || undefined);
      setSendSuccess(`Quote #${quote.id} sent to ${customerName}.`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setSendError(e?.response?.data?.detail ?? 'Failed to send quote. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const selectedRug = rugs.find((r) => r.id === Number(rugId));

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Calculator size={22} className="text-gold-400" />
        <div>
          <h1 className="text-2xl font-bold text-cream-100">Quote Builder</h1>
          <p className="text-dark-400 text-sm">Real-time pricing from your business rules engine</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Form */}
        <div className="xl:col-span-2 card space-y-5">
          <h2 className="text-cream-100 font-semibold text-base">Configure Order</h2>

          {loadingData ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleCalculate} className="space-y-4">
              {/* Rug selection */}
              <div>
                <label className="block text-cream-300 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Select Rug *
                </label>
                <select
                  value={rugId}
                  onChange={(e) => setRugId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="input-field w-full text-sm"
                  required
                >
                  <option value="">Choose a rug...</option>
                  {rugs.map((rug) => (
                    <option key={rug.id} value={rug.id}>
                      {rug.name} — {fmtTenant(rug.base_price, tenant, rug.base_price_currency)}/sqm
                    </option>
                  ))}
                </select>
                {selectedRug && (
                  <p className="text-dark-500 text-xs mt-1">
                    {selectedRug.weave_type} · Expected delivery: {selectedRug.lead_time_days} days
                  </p>
                )}
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-cream-300 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Dimensions (meters) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={sizeW}
                    onChange={(e) => setSizeW(e.target.value)}
                    placeholder="Width"
                    min="0.5"
                    step="0.1"
                    className="input-field w-full text-sm"
                    required
                  />
                  <span className="text-dark-500 flex-shrink-0">×</span>
                  <input
                    type="number"
                    value={sizeH}
                    onChange={(e) => setSizeH(e.target.value)}
                    placeholder="Length"
                    min="0.5"
                    step="0.1"
                    className="input-field w-full text-sm"
                    required
                  />
                </div>
                {sizeW && sizeH && (
                  <p className="text-dark-500 text-xs mt-1">
                    Area: {(parseFloat(sizeW) * parseFloat(sizeH)).toFixed(2)} sqm per piece
                  </p>
                )}
              </div>

              {/* Material */}
              <div>
                <label className="block text-cream-300 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Material *
                </label>
                <select
                  value={materialId}
                  onChange={(e) => setMaterialId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="input-field w-full text-sm"
                  required
                >
                  <option value="">Choose material...</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {fmtTenant(m.cost_per_sqm, tenant, m.cost_currency)}/sqm ({m.stock_meters.toFixed(0)} sqm in stock)
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-cream-300 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Quantity
                </label>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  min="1"
                  className="input-field w-full text-sm"
                />
              </div>

              {/* Rush order toggle */}
              <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                <div>
                  <p className="text-cream-200 text-sm font-medium">Early Delivery</p>
                  <p className="text-dark-400 text-xs">+25% surcharge, faster than estimated</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRushOrder(!rushOrder)}
                  className={`
                    w-11 h-6 rounded-full transition-all duration-200 relative
                    ${rushOrder ? 'bg-gold-600' : 'bg-dark-600'}
                  `}
                >
                  <span
                    className={`
                      absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200
                      ${rushOrder ? 'left-6' : 'left-1'}
                    `}
                  />
                </button>
              </div>

              <button
                type="submit"
                disabled={calculating || rugId === '' || !sizeW || !sizeH || materialId === ''}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
              >
                {calculating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator size={16} />
                    Calculate Quote
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Results */}
        <div className="xl:col-span-3 space-y-4">
          {calcError && (
            <div className="card bg-red-900/10 border-red-700/30">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{calcError}</p>
              </div>
            </div>
          )}

          {result && (
            <>
              {/* Summary card */}
              <div className="card bg-gold-900/10 border-gold-700/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-cream-100 font-bold text-lg">Quote Summary</h2>
                  {rushOrder && (
                    <span className="text-xs bg-orange-900/50 text-orange-300 border border-orange-700/50 px-2 py-0.5 rounded-full">
                      EARLY DELIVERY
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-dark-800 rounded-lg p-4 text-center">
                    <DollarSign size={20} className="text-gold-400 mx-auto mb-1" />
                    <p className="text-3xl font-bold text-gold-400">{fmt(result.final_price, result.price_currency)}</p>
                    <p className="text-dark-400 text-xs mt-1">Total Price</p>
                  </div>
                  <div className="bg-dark-800 rounded-lg p-4 text-center">
                    <Package size={20} className="text-cream-400 mx-auto mb-1" />
                    <p className="text-3xl font-bold text-cream-100">{fmt(result.price_per_piece, result.price_currency)}</p>
                    <p className="text-dark-400 text-xs mt-1">Per Piece</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-dark-800 rounded-lg p-3">
                    <p className="text-cream-100 font-semibold">{result.size_sqm.toFixed(2)} sqm</p>
                    <p className="text-dark-500 text-xs">Per piece</p>
                  </div>
                  <div className="bg-dark-800 rounded-lg p-3">
                    <p className="text-cream-100 font-semibold">{result.total_sqm.toFixed(2)} sqm</p>
                    <p className="text-dark-500 text-xs">Total area</p>
                  </div>
                  <div className="bg-dark-800 rounded-lg p-3 flex flex-col items-center">
                    <Clock size={14} className="text-blue-400 mb-1" />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        value={expectedDeliveryDays}
                        onChange={(e) => setExpectedDeliveryDays(e.target.value)}
                        className="w-14 bg-dark-900 border border-dark-600 rounded text-center text-cream-100 font-semibold text-sm py-0.5 focus:outline-none focus:border-gold-500"
                      />
                      <span className="text-cream-100 font-semibold text-sm">days</span>
                    </div>
                    <p className="text-dark-500 text-xs mt-1">Expected delivery (editable)</p>
                  </div>
                </div>
              </div>

              {/* Customer + Send */}
              <div className="card space-y-4">
                <h3 className="text-cream-100 font-semibold">Customer &amp; Send</h3>

                {!showNewCustomer ? (
                  <div className="space-y-2">
                    <label className="block text-cream-300 text-xs font-medium uppercase tracking-wider">
                      Select Customer
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value === '' ? '' : Number(e.target.value))}
                        className="input-field w-full text-sm"
                      >
                        <option value="">Choose a customer...</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.company ? `— ${c.company}` : `— ${c.email}`}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewCustomer(true)}
                        className="flex-shrink-0 flex items-center gap-1.5 text-xs text-gold-400 hover:text-gold-300 border border-dark-600 rounded-lg px-3 py-2 transition-colors"
                      >
                        <UserPlus size={14} /> New
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-dark-800 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-cream-200 text-sm font-medium">New Customer</p>
                      <button
                        type="button"
                        onClick={() => setShowNewCustomer(false)}
                        className="text-dark-400 hover:text-cream-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                    <input
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="Name *"
                      className="input-field w-full text-sm"
                    />
                    <input
                      value={newCustomerEmail}
                      onChange={(e) => setNewCustomerEmail(e.target.value)}
                      placeholder="Email *"
                      type="email"
                      className="input-field w-full text-sm"
                    />
                    <input
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      placeholder="Phone (optional)"
                      className="input-field w-full text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-cream-300 text-xs font-medium mb-1.5 uppercase tracking-wider">
                    Note to Customer (optional)
                  </label>
                  <textarea
                    value={vendorNotes}
                    onChange={(e) => setVendorNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. Thanks for your interest — happy to adjust size or material."
                    className="input-field w-full text-sm resize-none"
                  />
                </div>

                {sendError && (
                  <div className="flex items-start gap-2 bg-red-900/10 border border-red-700/30 rounded-lg p-3">
                    <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-300 text-xs">{sendError}</p>
                  </div>
                )}

                {sendSuccess ? (
                  <div className="flex items-center justify-between gap-3 bg-green-900/10 border border-green-700/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={15} className="text-green-400 flex-shrink-0" />
                      <p className="text-green-300 text-xs">{sendSuccess}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/admin/quotes')}
                      className="text-xs text-gold-400 hover:text-gold-300 whitespace-nowrap"
                    >
                      View in Quotes →
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveAndSend}
                    disabled={sending || (customerId === '' && !showNewCustomer)}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
                  >
                    {sending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Save &amp; Send Quote
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Price breakdown */}
              <div className="card space-y-3">
                <h3 className="text-cream-100 font-semibold">Price Breakdown</h3>
                <div className="space-y-2">
                  {result.breakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 py-2 border-b border-dark-800 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-cream-200 text-sm">{item.label ?? item.rule}</p>
                        {item.description && (
                          <p className="text-dark-500 text-xs mt-0.5 truncate">{item.description}</p>
                        )}
                      </div>
                      <span
                        className={`text-sm font-semibold flex-shrink-0 ${
                          item.amount < 0 ? 'text-green-400' : item.amount > 0 ? 'text-cream-100' : 'text-dark-400'
                        }`}
                      >
                        {item.amount < 0 ? `-${fmt(Math.abs(item.amount), result.price_currency)}` : fmt(item.amount, result.price_currency)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2">
                    <span className="text-cream-100 font-bold">Total</span>
                    <span className="text-gold-400 font-bold text-lg">{fmt(result.final_price, result.price_currency)}</span>
                  </div>
                </div>
              </div>

              {/* Validation checks */}
              <div className="card space-y-3">
                <h3 className="text-cream-100 font-semibold">Validation</h3>
                <div className="space-y-2">
                  {/* MOQ */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-800">
                    {result.moq_met ? (
                      <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-cream-200 text-sm font-medium">
                        MOQ {result.moq_met ? 'Met' : 'Not Met'}
                      </p>
                      <p className="text-dark-400 text-xs mt-0.5">{result.moq_message}</p>
                    </div>
                  </div>

                  {/* Material stock */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-800">
                    {result.material_available ? (
                      <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-cream-200 text-sm font-medium">
                        Material {result.material_available ? 'Available' : 'Insufficient Stock'}
                      </p>
                      <p className="text-dark-400 text-xs mt-0.5">{result.material_message}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {!result && !calcError && !calculating && (
            <div className="card flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Calculator size={36} className="text-dark-600" />
              <p className="text-dark-400 text-sm">
                Configure your order and click <strong className="text-dark-300">Calculate Quote</strong> to see real-time pricing from our business rules engine.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteBuilder;
