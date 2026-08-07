import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingBag, Trash2, Minus, Plus, ChevronRight, Layers, AlertTriangle, Tag, X, CheckCircle } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import { useCart } from '../contexts/CartContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import { fmtDims } from '../utils/size';
import { getPublicSettings, validatePromoCode } from '../services/api';
import type { PromoValidateResponse } from '../services/api';

interface ItemEstimate {
  final_price: number;
  pre_gst_price: number;
  gst_pct: number;
  gst_amount: number;
  price_currency: string;
  estimated_days: number;
  material_available: boolean;
}

export default function CustomerCart() {
  const { items, removeItem, updateItem } = useCart();
  const { displayPrice } = useCurrency();
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();
  const [estimates, setEstimates] = useState<Record<string, ItemEstimate | null>>({});
  const [loading, setLoading] = useState(true);
  const [sizeUnit, setSizeUnit] = useState('ft');
  const [shippingRate, setShippingRate] = useState(0);

  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState<PromoValidateResponse | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  useEffect(() => {
    getPublicSettings().then((data) => {
      setSizeUnit(data.default_size_unit || 'ft');
      setShippingRate(data.default_shipping_rate || 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (items.length === 0) { setLoading(false); return; }
    setLoading(true);
    Promise.all(
      items.map((item) =>
        axios.post(`/api/customer/catalog/${item.rug_id}/estimate`, {
          size_w: item.size_w, size_h: item.size_h, qty: item.qty,
          rush_order: item.rush_order, shape: item.shape,
        })
          .then(({ data }) => [item.id, data as ItemEstimate] as const)
          .catch(() => [item.id, null] as const)
      )
    ).then((pairs) => setEstimates(Object.fromEntries(pairs)))
      .finally(() => setLoading(false));
  }, [items]);

  const validItems = items.filter((i) => estimates[i.id]?.final_price != null);
  const grandTotalBase = validItems.reduce((sum, i) => sum + (estimates[i.id]?.final_price || 0), 0);
  const preGstTotal = validItems.every((i) => estimates[i.id]?.pre_gst_price != null)
    ? validItems.reduce((sum, i) => sum + (estimates[i.id]?.pre_gst_price || 0), 0) : null;
  const gstTotal = validItems.every((i) => estimates[i.id]?.gst_amount != null)
    ? validItems.reduce((sum, i) => sum + (estimates[i.id]?.gst_amount || 0), 0) : null;
  const primaryCurrency = validItems[0] ? estimates[validItems[0].id]?.price_currency : undefined;

  const discountAmount = promoApplied?.discount_amount ?? 0;
  const finalTotal = Math.max(0, grandTotalBase + shippingRate - discountAmount);

  // Re-validate whenever the cart total changes, so a code applied against a smaller cart
  // doesn't silently keep applying (e.g. min-order-value no longer met) after items are added/removed.
  useEffect(() => {
    if (!promoApplied) return;
    if (grandTotalBase <= 0) { setPromoApplied(null); return; }
    validatePromoCode(promoApplied.code, grandTotalBase, customer?.email)
      .then(setPromoApplied)
      .catch(() => { setPromoApplied(null); setPromoError('Your promo code no longer applies to this cart.'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grandTotalBase]);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const result = await validatePromoCode(promoInput.trim(), grandTotalBase, customer?.email);
      setPromoApplied(result);
      setPromoInput('');
    } catch (err: any) {
      setPromoApplied(null);
      setPromoError(err.response?.data?.detail ?? 'Could not apply this promo code.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoApplied(null);
    setPromoError(null);
  };

  const handleCheckout = () => {
    const checkoutItems = validItems.map((item) => {
      const est = estimates[item.id]!;
      return {
        rug_id: item.rug_id, rug_name: item.rug_name, image_url: item.image_url,
        size_w: item.size_w, size_h: item.size_h, qty: item.qty, rush_order: item.rush_order,
        shape: item.shape, notes: item.notes,
        estimated_price: est.final_price, pre_gst_price: est.pre_gst_price,
        gst_pct: est.gst_pct, gst_amount: est.gst_amount,
        price_currency: est.price_currency, estimated_days: est.estimated_days,
      };
    });
    navigate('/checkout', {
      state: {
        items: checkoutItems, fromCart: true,
        promo_code: promoApplied?.code ?? null,
        promo_discount_amount: discountAmount,
        promo_message: promoApplied?.message ?? null,
      },
    });
  };

  return (
    <CustomerLayout>
      <SEO title="Your Cart" description="Review the rugs in your cart before checkout." noindex />
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        <div className="flex items-center gap-2 text-xs text-stone-400">
          <Link to="/" className="hover:text-stone-900 transition-colors">Home</Link>
          <ChevronRight size={11} />
          <span className="text-stone-600">Cart</span>
        </div>

        <div className="pb-6 border-b border-stone-100">
          <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Your Selection</p>
          <h1 className="font-serif text-4xl font-light text-stone-900">Cart</h1>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <ShoppingBag size={36} className="mx-auto text-stone-300" />
            <p className="text-stone-500 text-sm">Your cart is empty.</p>
            <Link to="/catalog" className="inline-block text-sm text-stone-700 hover:text-stone-900 border-b border-stone-300 pb-0.5 transition-colors">
              Browse the Collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                const est = estimates[item.id];
                const sizeLabel = fmtDims(item.size_w, item.size_h, sizeUnit, item.shape);
                return (
                  <div key={item.id} className="flex gap-4 border border-stone-200 p-4">
                    <div className="w-20 h-20 flex-shrink-0 bg-stone-100 overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.rug_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Layers size={20} className="text-stone-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/catalog/${item.rug_id}`} className="font-serif text-base text-stone-900 hover:text-stone-600 transition-colors truncate">
                          {item.rug_name}
                        </Link>
                        <button onClick={() => removeItem(item.id)} className="text-stone-300 hover:text-red-500 transition-colors flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="text-stone-400 text-xs">
                        {sizeLabel}{item.rush_order ? ' · Rush' : ''}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center border border-stone-200">
                          <button
                            onClick={() => updateItem(item.id, { qty: Math.max(1, item.qty - 1) })}
                            className="px-2 py-1 text-stone-500 hover:text-stone-900 transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-3 text-sm text-stone-700">{item.qty}</span>
                          <button
                            onClick={() => updateItem(item.id, { qty: item.qty + 1 })}
                            className="px-2 py-1 text-stone-500 hover:text-stone-900 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {loading ? (
                          <div className="w-3.5 h-3.5 border border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                        ) : est?.final_price != null ? (
                          <p className="text-stone-900 text-sm font-medium">{displayPrice(est.final_price, est.price_currency)}</p>
                        ) : (
                          <p className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle size={11} /> Unavailable</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-1">
              <div className="border border-stone-200 p-5 space-y-4 sticky top-[102px]">
                <p className="text-xs tracking-[0.2em] uppercase text-stone-400">Order Total</p>

                {/* Promo code */}
                <div className="space-y-2">
                  {promoApplied ? (
                    <div className="flex items-center justify-between gap-2 bg-green-50 border border-green-200 px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle size={13} className="text-green-600 flex-shrink-0" />
                        <span className="text-green-800 text-xs font-medium truncate">{promoApplied.code} applied</span>
                      </div>
                      <button type="button" onClick={handleRemovePromo} className="text-green-700 hover:text-green-900 flex-shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <div className="relative flex-1 min-w-0">
                        <Tag size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-300" />
                        <input
                          value={promoInput}
                          onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyPromo(); } }}
                          placeholder="Promo code"
                          className="w-full border border-stone-200 focus:border-stone-400 pl-8 pr-3 py-2 text-stone-900 placeholder-stone-300 text-xs uppercase focus:outline-none transition-colors"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={promoLoading || !promoInput.trim()}
                        className="px-3 border border-stone-300 hover:border-stone-900 disabled:opacity-40 text-stone-700 text-xs font-medium uppercase tracking-wider transition-colors flex-shrink-0"
                      >
                        {promoLoading ? <div className="w-3 h-3 border border-stone-400 border-t-transparent rounded-full animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                  )}
                  {promoError && (
                    <p className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle size={11} /> {promoError}</p>
                  )}
                </div>

                <div className="space-y-1.5 text-sm border-t border-stone-100 pt-4">
                  <div className="flex justify-between">
                    <span className="text-stone-400">
                      {validItems.length} item{validItems.length !== 1 ? 's' : ''}
                      {preGstTotal != null ? ' — pre-tax' : ''}
                    </span>
                    <span className="text-stone-600">{displayPrice(preGstTotal ?? grandTotalBase, primaryCurrency)}</span>
                  </div>
                  {gstTotal != null && (
                    <div className="flex justify-between">
                      <span className="text-stone-400">Tax</span>
                      <span className="text-stone-600">+{displayPrice(gstTotal, primaryCurrency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-stone-400">Shipping</span>
                    <span className="text-stone-600">{shippingRate > 0 ? `+${displayPrice(shippingRate, primaryCurrency)}` : 'Free'}</span>
                  </div>
                  {promoApplied && discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-green-600">Promo ({promoApplied.code})</span>
                      <span className="text-green-600">−{displayPrice(discountAmount, primaryCurrency)}</span>
                    </div>
                  )}
                  {promoApplied && promoApplied.discount_type === 'free_shipping' && (
                    <p className="text-green-600 text-xs">{promoApplied.message}</p>
                  )}
                </div>

                <div className="flex justify-between items-center border-t border-stone-200 pt-4">
                  <span className="text-stone-900 font-medium text-sm">Total (incl. Tax & Shipping)</span>
                  <span className="text-stone-900 font-medium text-xl">
                    {displayPrice(finalTotal, primaryCurrency)}
                  </span>
                </div>
                <p className="text-stone-400 text-xs leading-relaxed">
                  Final price confirmed after production review.
                </p>
                <button
                  onClick={handleCheckout}
                  disabled={validItems.length === 0 || loading}
                  className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-medium tracking-widest uppercase py-4 transition-colors"
                >
                  Proceed to Checkout
                </button>
                <Link to="/catalog" className="block text-center text-stone-400 hover:text-stone-900 text-xs transition-colors">
                  Continue browsing
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
