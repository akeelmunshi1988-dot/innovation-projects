import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag, MapPin, User, AlertTriangle, ChevronRight, Truck,
  CheckCircle, X, LogIn, UserPlus, Eye, EyeOff, Tag,
} from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import SocialLoginButtons from '../components/SocialLoginButtons';
import { createPaymentOrder, verifyPayment, getPublicSettings, validatePromoCode } from '../services/api';
import type { CheckoutResponse, PromoValidateResponse } from '../services/api';

import { fmtExact } from '../utils/currency';
import { fmtDims } from '../utils/size';
import { COUNTRIES, detectCountry } from '../utils/countries';
import { PASSWORD_POLICY_HINT, passwordPolicyError } from '../utils/passwordPolicy';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCart } from '../contexts/CartContext';

interface CheckoutItem {
  rug_id: number;
  rug_name: string;
  image_url?: string | null;
  size_w: number;
  size_h: number;
  qty: number;
  rush_order: boolean;
  shape?: string;
  notes?: string;
  estimated_price: number;
  rush_surcharge?: number;
  pre_gst_price?: number;
  gst_pct?: number;
  gst_amount?: number;
  gst_inclusive?: boolean;
  price_currency: string;
  estimated_days: number;
}

interface CheckoutState {
  items: CheckoutItem[];
  fromCart?: boolean;
  name?: string;
  email?: string;
  phone?: string;
  promo_code?: string | null;
  promo_discount_amount?: number;
  promo_message?: string | null;
}

export default function CustomerCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as CheckoutState | null;
  const { customer, customerToken, isCustomerAuthenticated, customerLogin, customerRegister } = useCustomerAuth();
  const { displayPrice, displayCurrency, baseCurrency } = useCurrency();
  const { clearCart } = useCart();

  const [form, setForm] = useState({
    name: state?.name ?? '',
    email: state?.email ?? '',
    phone: state?.phone ?? '',
    company: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state_name: '',
    pincode: '',
    country: detectCountry(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [paymentCaptured, setPaymentCaptured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth modal state — pre-fill name/email/phone if passed from visualizer
  const [authModal, setAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({
    name:     state?.name  ?? '',
    email:    state?.email ?? '',
    password: '',
    phone:    state?.phone ?? '',
    company:  '',
  });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthPwd, setShowAuthPwd] = useState(false);
  const [sizeUnit, setSizeUnit] = useState('ft');
  const [shippingRate, setShippingRate] = useState(0);
  const [businessName, setBusinessName] = useState('Store');

  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState<PromoValidateResponse | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoInitialized, setPromoInitialized] = useState(false);

  // Load Razorpay checkout script once
  useEffect(() => {
    if (document.getElementById('razorpay-checkout-js')) return;
    const s = document.createElement('script');
    s.id = 'razorpay-checkout-js';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    getPublicSettings().then((data) => {
      setSizeUnit(data.default_size_unit || 'ft');
      setShippingRate(data.default_shipping_rate || 0);
      setBusinessName(data.business_name || 'Store');
    }).catch(() => {});
  }, []);

  // Re-validate a promo code carried over from the Cart page (server is always the source of truth)
  useEffect(() => {
    if (promoInitialized) return;
    setPromoInitialized(true);
    if (!state?.promo_code || !state.items) return;
    const exportOrder = form.country !== 'India';
    const total = state.items.reduce((sum, i) => sum + (exportOrder ? (i.pre_gst_price ?? i.estimated_price) : i.estimated_price), 0);
    validatePromoCode(state.promo_code, total, state.email)
      .then(setPromoApplied)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state || !state.items || state.items.length === 0) {
    return (
      <CustomerLayout>
        <div className="max-w-xl mx-auto px-4 py-32 text-center space-y-4">
          <ShoppingBag size={36} className="mx-auto text-stone-300" />
          <h2 className="storefront-heading text-2xl">No order data found</h2>
          <p className="text-stone-500 text-sm">Please start from the catalog.</p>
          <Link to="/catalog" className="text-sm text-stone-500 hover:text-stone-900 transition-colors border-b border-stone-300 pb-0.5">
            ← Back to Collection
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  const items = state.items;
  const currency = items[0].price_currency || 'INR';
  const fmt = (n: number) => displayPrice(n, currency);
  const showsConvertedEstimate = displayCurrency !== (currency || baseCurrency);
  // GST is zero-rated for export shipments — the country dropdown decides this live,
  // so the displayed total must track it even though `items` was priced at "Buy Now" /
  // "Add to Cart" time (before the destination was known). The actual amount charged is
  // always recalculated authoritatively server-side from `form.country` at submission —
  // this just keeps what's shown on screen honest before that point.
  const isExport = form.country !== 'India';
  const gstApplies = !isExport && items.every((i) => i.gst_inclusive === true);
  const itemDisplayPrice = (i: CheckoutItem) => (isExport ? (i.pre_gst_price ?? i.estimated_price) : i.estimated_price);
  const grandTotal = items.reduce((sum, i) => sum + itemDisplayPrice(i), 0);
  const preGstTotal = (isExport || gstApplies) && items.every((i) => i.pre_gst_price != null)
    ? items.reduce((sum, i) => sum + (i.pre_gst_price || 0), 0) : null;
  const gstTotal = isExport ? 0 : (gstApplies && items.every((i) => i.gst_amount != null)
    ? items.reduce((sum, i) => sum + (i.gst_amount || 0), 0) : null);
  // The estimate's final price already includes rush production. This value is
  // display-only and must never be added to payableTotal a second time.
  const rushTotal = items.reduce((sum, i) => sum + (i.rush_surcharge || 0), 0);
  const productionSubtotal = (preGstTotal ?? grandTotal) - rushTotal;
  const maxEstimatedDays = Math.max(...items.map((i) => i.estimated_days));
  const itemSizeLabel = (i: CheckoutItem) => fmtDims(i.size_w, i.size_h, sizeUnit, i.shape ?? 'rect');

  const discountAmount = promoApplied?.discount_amount ?? 0;
  const payableTotal = Math.max(0, grandTotal + shippingRate - discountAmount);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const result = await validatePromoCode(promoInput.trim(), grandTotal, customer?.email || form.email || undefined);
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

  const initiatePayment = async (name: string, email: string) => {
    const shipping_address = [
      form.address_line1, form.address_line2,
      form.city, form.state_name, form.pincode, form.country,
    ].filter(Boolean).join(', ');

    setSubmitting(true);
    setError(null);
    try {
      const orderPayload = {
        items: items.map((i) => ({
          rug_id: i.rug_id, size_w: i.size_w, size_h: i.size_h,
          qty: i.qty, rush_order: i.rush_order, shape: i.shape ?? 'rect', notes: i.notes,
        })),
        name, email,
        phone: form.phone || undefined,
        company: form.company || undefined,
        shipping_address,
        country: form.country,
        promo_code: promoApplied?.code ?? null,
      };

      const paymentOrder = await createPaymentOrder(orderPayload, customerToken);

      if (!window.Razorpay) {
        throw new Error('Payment SDK not loaded yet. Please try again in a moment.');
      }

      const rzp = new window.Razorpay({
        key: paymentOrder.key_id,
        amount: paymentOrder.amount_paise,
        currency: paymentOrder.currency,
        name: businessName,
        description: items.length === 1 ? items[0].rug_name : `${items.length} rugs`,
        order_id: paymentOrder.razorpay_order_id,
        prefill: { name, email, contact: form.phone || undefined },
        theme: { color: '#1c1917' },
        handler: async (response) => {
          setPaymentCaptured(true);
          try {
            const result: CheckoutResponse = await verifyPayment(
              { ...orderPayload, ...response },
              customerToken,
            );
            if (state.fromCart) clearCart();
            navigate(`/order/${result.order_id}`, { state: result });
          } catch (err: unknown) {
            const e = err as { response?: { data?: { detail?: string } } };
            setError(e?.response?.data?.detail ?? 'Payment was received and order recovery is running automatically. Do not pay again. Please check My Orders shortly or contact support with your payment reference.');
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
      });
      rzp.on('payment.failed', (failure: unknown) => {
        const details = failure as { error?: { description?: string } };
        setError(details.error?.description ?? 'Payment failed. No order has been placed. Please retry or use another payment method.');
        setPaymentCaptured(false);
        setSubmitting(false);
      });
      rzp.open();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(e?.response?.data?.detail ?? e?.message ?? 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.address_line1 || !form.city || !form.state_name || !form.pincode) return;
    if (isCustomerAuthenticated && customer) {
      await initiatePayment(customer.name, customer.email);
    } else if (form.name.trim() && form.email.trim()) {
      await initiatePayment(form.name.trim(), form.email.trim());
    } else {
      setAuthModal(true);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      let name = authForm.name;
      let email = authForm.email;
      if (authMode === 'login') {
        const user = await customerLogin(authForm.email, authForm.password);
        name = user.name;
        email = user.email;
      } else {
        const policyError = passwordPolicyError(authForm.password);
        if (policyError) { setAuthError(policyError); setAuthLoading(false); return; }
        await customerRegister(
          authForm.name, authForm.email, authForm.password, form.country,
          authForm.phone || undefined, authForm.company || undefined,
        );
      }
      setAuthModal(false);
      await initiatePayment(name, email);
    } catch (err: any) {
      setAuthError(err.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <CustomerLayout>
      <SEO title="Checkout" description="Complete your custom rug order." noindex />
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <Link to="/" className="hover:text-stone-900 transition-colors">Home</Link>
          <ChevronRight size={11} />
          <Link to="/catalog" className="hover:text-stone-900 transition-colors">Collection</Link>
          <ChevronRight size={11} />
          <span className="text-stone-600">Checkout</span>
        </div>

        {/* Page title */}
        <div className="pb-6 border-b border-stone-100">
          <p className="storefront-eyebrow mb-2">Order</p>
          <h1 className="storefront-heading text-4xl">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Order summary — left column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="border border-stone-200">
              <div className="px-5 py-4 border-b border-stone-100">
                <p className="storefront-eyebrow">
                  Order Summary {items.length > 1 && `· ${items.length} items`}
                </p>
              </div>
              <div className="p-5 space-y-4">
                {items.map((item, idx) => (
                  <div key={idx} className={idx > 0 ? 'pt-4 border-t border-stone-100' : ''}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-serif text-lg font-light text-stone-900">{item.rug_name}</p>
                        <p className="text-stone-400 text-sm mt-0.5">
                          {itemSizeLabel(item)} · {item.qty} piece{item.qty !== 1 ? 's' : ''}{item.rush_order ? ' · Rush' : ''}
                        </p>
                        {item.notes && <p className="text-stone-400 text-xs mt-0.5">{item.notes}</p>}
                      </div>
                      <p className="text-stone-900 text-sm font-medium flex-shrink-0">{fmt(itemDisplayPrice(item))}</p>
                    </div>
                  </div>
                ))}

                <div className="space-y-2 text-sm border-t border-stone-200 pt-4">
                  {(preGstTotal != null || rushTotal > 0) && (
                    <div className="flex justify-between">
                      <span className="text-stone-400">{rushTotal > 0 ? 'Production subtotal' : 'Pre-tax'}</span>
                      <span className="text-stone-600">{fmt(rushTotal > 0 ? productionSubtotal : preGstTotal!)}</span>
                    </div>
                  )}
                  {rushTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-amber-600">Rush production cost</span>
                      <span className="text-amber-600">+{fmt(rushTotal)}</span>
                    </div>
                  )}
                  {gstTotal != null && (
                    <div className="flex justify-between">
                      <span className="text-stone-400">
                        {isExport ? 'Tax (zero-rated — export)' : `Tax${items[0].gst_pct ? ` (${items[0].gst_pct.toFixed(0)}%)` : ''}`}
                      </span>
                      <span className="text-stone-600">{gstTotal > 0 ? `+${fmt(gstTotal)}` : fmt(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-stone-400">Shipping</span>
                    <span className="text-stone-600">{shippingRate > 0 ? `+${fmt(shippingRate)}` : 'Free'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Expected delivery</span>
                    <span className="text-stone-700 flex items-center gap-1">
                      <Truck size={12} className="text-stone-400" />
                      ~{maxEstimatedDays} days
                    </span>
                  </div>
                  {promoApplied && discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-green-600">Promo ({promoApplied.code})</span>
                      <span className="text-green-600">−{fmt(discountAmount)}</span>
                    </div>
                  )}
                </div>

                {/* Promo code */}
                <div className="space-y-2 pt-1">
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

                <div className="border-t border-stone-200 pt-4 flex justify-between items-center">
                  <span className="text-stone-900 font-medium text-sm">{gstApplies || isExport ? 'Total (incl. Tax & Shipping)' : 'Total (incl. Shipping)'}</span>
                  <span className="text-stone-900 font-medium text-xl">{fmt(payableTotal)}</span>
                </div>

                {showsConvertedEstimate && (
                  <p className="text-stone-400 text-xs">
                    Converted estimate — you'll be charged {fmtExact(payableTotal, currency)} ({currency}) via UPI/Bank Transfer.
                  </p>
                )}

                <p className="text-stone-400 text-xs leading-relaxed">
                  Final price confirmed after production review. Payment via UPI/Bank Transfer.
                </p>
              </div>
            </div>
          </div>

          {/* Checkout form — right column */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="border border-stone-200">

              {/* Contact details */}
              <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-2">
                <User size={14} className="text-stone-400" />
                <p className="storefront-eyebrow">Contact Details</p>
              </div>
              <div className="p-5 space-y-3">
                {isCustomerAuthenticated && customer ? (
                  <>
                    <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-2.5">
                      <CheckCircle size={13} className="text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-stone-900 text-xs font-medium truncate">{customer.name}</p>
                        <p className="text-stone-400 text-xs truncate">{customer.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Phone / WhatsApp</label>
                        <input
                          type="tel"
                          name="phone"
                          value={form.phone}
                          onChange={handleChange}
                          placeholder="+91 98765 43210"
                          className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Company</label>
                        <input
                          name="company"
                          value={form.company}
                          onChange={handleChange}
                          placeholder="Optional"
                          className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-stone-500 text-sm">Continue as guest</p>
                      <button
                        type="button"
                        onClick={() => setAuthModal(true)}
                        className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-900 transition-colors underline underline-offset-2"
                      >
                        <LogIn size={13} /> Sign in instead
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Full Name *</label>
                        <input
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          placeholder="Your name"
                          required
                          className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Email *</label>
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="you@example.com"
                          required
                          className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Phone / WhatsApp</label>
                        <input
                          type="tel"
                          name="phone"
                          value={form.phone}
                          onChange={handleChange}
                          placeholder="+91 98765 43210"
                          className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Company</label>
                        <input
                          name="company"
                          value={form.company}
                          onChange={handleChange}
                          placeholder="Optional"
                          className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Shipping address */}
              <div className="px-5 py-4 border-y border-stone-100 flex items-center gap-2">
                <MapPin size={14} className="text-stone-400" />
                <p className="storefront-eyebrow">Delivery Address</p>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Country *</label>
                  <select
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    required
                    className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 text-sm focus:outline-none transition-colors bg-white"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {form.country !== 'India' && (
                    <p className="text-stone-400 text-xs mt-1.5">
                      International order — GST is not charged; import duties/taxes in your country, if any, are your responsibility.
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Flat / House No. / Building *</label>
                  <input
                    name="address_line1"
                    value={form.address_line1}
                    onChange={handleChange}
                    placeholder="e.g. 4B, Sunrise Apartments"
                    required
                    className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Street / Area / Locality</label>
                  <input
                    name="address_line2"
                    value={form.address_line2}
                    onChange={handleChange}
                    placeholder="e.g. MG Road, Andheri West"
                    className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">City *</label>
                    <input
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="e.g. Mumbai"
                      required
                      className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">
                      {form.country === 'India' ? 'State *' : 'State / Province *'}
                    </label>
                    <input
                      name="state_name"
                      value={form.state_name}
                      onChange={handleChange}
                      placeholder={form.country === 'India' ? 'e.g. Maharashtra' : 'e.g. California'}
                      required
                      className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">
                    {form.country === 'India' ? 'PIN Code *' : 'PIN / ZIP Code *'}
                  </label>
                  <input
                    name="pincode"
                    value={form.pincode}
                    onChange={handleChange}
                    placeholder={form.country === 'India' ? 'e.g. 400001' : 'e.g. 90001'}
                    required
                    className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 p-3 text-red-600 text-xs">
                    <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || paymentCaptured}
                  className="w-full storefront-cta-solid py-4 transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (isCustomerAuthenticated || (form.name.trim() && form.email.trim())) ? (
                    <ShoppingBag size={13} />
                  ) : (
                    <LogIn size={13} />
                  )}
                  {paymentCaptured
                    ? 'Payment received — finalizing order…'
                    : submitting
                    ? 'Opening Payment…'
                    : (isCustomerAuthenticated || (form.name.trim() && form.email.trim()))
                      ? `Pay ${fmt(payableTotal)}`
                      : 'Fill in your details above'}
                </button>

                <p className="text-stone-400 text-xs text-center leading-relaxed">
                  By placing this order you agree to our production and delivery terms. Payment details will be shared after confirmation.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Auth modal */}
      {authModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h3 className="font-serif text-lg font-light text-stone-900">
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </h3>
              <button
                onClick={() => setAuthModal(false)}
                className="text-stone-400 hover:text-stone-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-stone-100">
              <button
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`flex-1 py-2.5 text-xs font-medium tracking-wider uppercase transition-colors ${
                  authMode === 'login'
                    ? 'text-stone-900 border-b-2 border-stone-900'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
                className={`flex-1 py-2.5 text-xs font-medium tracking-wider uppercase transition-colors ${
                  authMode === 'register'
                    ? 'text-stone-900 border-b-2 border-stone-900'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="p-5 space-y-3">
              {authMode === 'register' && (
                <input
                  type="text"
                  placeholder="Full name *"
                  required
                  value={authForm.name}
                  onChange={(e) => setAuthForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                />
              )}
              <input
                type="email"
                placeholder="Email address *"
                required
                value={authForm.email}
                onChange={(e) => setAuthForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
              />
              <div className="relative">
                <input
                  type={showAuthPwd ? 'text' : 'password'}
                  placeholder="Password *"
                  required
                  minLength={authMode === 'register' ? 8 : 1}
                  value={authForm.password}
                  onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 pr-10 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowAuthPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  {showAuthPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {authMode === 'register' && (
                <p className="text-stone-400 text-xs">{PASSWORD_POLICY_HINT}</p>
              )}
              {authMode === 'register' && (
                <>
                  <input
                    type="tel"
                    placeholder="Phone / WhatsApp"
                    value={authForm.phone}
                    onChange={(e) => setAuthForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Company / Business (optional)"
                    value={authForm.company}
                    onChange={(e) => setAuthForm((f) => ({ ...f, company: e.target.value }))}
                    className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                  />
                </>
              )}

              {authError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-2.5 text-red-600 text-xs">
                  <AlertTriangle size={12} className="flex-shrink-0" /> {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full storefront-cta-solid py-3.5 transition-colors flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                ) : authMode === 'login' ? (
                  <><LogIn size={13} /> Sign In & Pay</>
                ) : (
                  <><UserPlus size={13} /> Register & Pay</>
                )}
              </button>
            </form>
            <div className="px-5 pb-5">
              <SocialLoginButtons returnTo="/cart" />
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}
