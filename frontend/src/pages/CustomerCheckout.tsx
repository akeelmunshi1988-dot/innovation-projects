import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag, MapPin, User, AlertTriangle, ChevronRight, Truck,
  CheckCircle, X, LogIn, UserPlus, Eye, EyeOff,
} from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import { customerCheckout } from '../services/api';
import type { CheckoutResponse } from '../services/api';
import { fmtExact, currencySymbol } from '../utils/currency';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';

interface CheckoutState {
  rug_id: number;
  rug_name: string;
  size_w: number;
  size_h: number;
  qty: number;
  rush_order: boolean;
  notes?: string;
  estimated_price: number;
  pre_gst_price?: number;
  gst_pct?: number;
  gst_amount?: number;
  price_currency: string;
  estimated_days: number;
  name?: string;
  email?: string;
  phone?: string;
}

export default function CustomerCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as CheckoutState | null;
  const { customer, isCustomerAuthenticated, customerLogin, customerRegister } = useCustomerAuth();

  const [form, setForm] = useState({
    phone: state?.phone ?? '',
    company: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state_name: '',
    pincode: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth modal state
  const [authModal, setAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', phone: '', company: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthPwd, setShowAuthPwd] = useState(false);

  if (!state) {
    return (
      <CustomerLayout>
        <div className="max-w-xl mx-auto px-6 py-32 text-center space-y-4">
          <ShoppingBag size={36} className="mx-auto text-stone-300" />
          <h2 className="font-serif text-2xl font-light text-stone-900">No order data found</h2>
          <p className="text-stone-500 text-sm">Please start from the catalog.</p>
          <Link to="/shop/catalog" className="text-sm text-stone-500 hover:text-stone-900 transition-colors border-b border-stone-300 pb-0.5">
            ← Back to Collection
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  const currency = state.price_currency || 'INR';
  const sym = currencySymbol(currency);
  const fmt = (n: number) => fmtExact(n, currency);
  const area = (state.size_w * state.size_h).toFixed(2);
  const totalSqm = (state.size_w * state.size_h * state.qty).toFixed(2);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const doPlaceOrder = async (name: string, email: string) => {
    const shipping_address = [
      form.address_line1,
      form.address_line2,
      form.city,
      form.state_name,
      form.pincode,
    ].filter(Boolean).join(', ');
    setSubmitting(true);
    setError(null);
    try {
      const result: CheckoutResponse = await customerCheckout({
        rug_id: state.rug_id,
        size_w: state.size_w,
        size_h: state.size_h,
        qty: state.qty,
        rush_order: state.rush_order,
        notes: state.notes,
        name,
        email,
        phone: form.phone || undefined,
        company: form.company || undefined,
        shipping_address,
      });
      navigate(`/shop/order/${result.order_id}`, { state: result });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.address_line1 || !form.city || !form.state_name || !form.pincode) return;
    if (!isCustomerAuthenticated || !customer) {
      setAuthModal(true);
      return;
    }
    await doPlaceOrder(customer.name, customer.email);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      let user;
      if (authMode === 'login') {
        user = await customerLogin(authForm.email, authForm.password);
      } else {
        user = await customerRegister(
          authForm.name, authForm.email, authForm.password,
          authForm.phone || undefined, authForm.company || undefined,
        );
      }
      setAuthModal(false);
      await doPlaceOrder(user.name, user.email);
    } catch (err: any) {
      setAuthError(err.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <Link to="/shop" className="hover:text-stone-900 transition-colors">Home</Link>
          <ChevronRight size={11} />
          <Link to="/shop/catalog" className="hover:text-stone-900 transition-colors">Collection</Link>
          <ChevronRight size={11} />
          <Link to={`/shop/catalog/${state.rug_id}`} className="hover:text-stone-900 transition-colors">{state.rug_name}</Link>
          <ChevronRight size={11} />
          <span className="text-stone-600">Checkout</span>
        </div>

        {/* Page title */}
        <div className="pb-6 border-b border-stone-100">
          <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Order</p>
          <h1 className="font-serif text-4xl font-light text-stone-900">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Order summary — left column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="border border-stone-200">
              <div className="px-5 py-4 border-b border-stone-100">
                <p className="text-xs tracking-[0.2em] uppercase text-stone-400">Order Summary</p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="font-serif text-lg font-light text-stone-900">{state.rug_name}</p>
                  <p className="text-stone-400 text-sm mt-0.5">
                    {state.size_w}m × {state.size_h}m · {area} m² per piece
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-400">Quantity</span>
                    <span className="text-stone-700">{state.qty} piece{state.qty !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Total area</span>
                    <span className="text-stone-700">{totalSqm} m²</span>
                  </div>
                  {state.rush_order && (
                    <div className="flex justify-between">
                      <span className="text-amber-600 text-xs">Rush order</span>
                      <span className="text-amber-600 text-xs">+25%</span>
                    </div>
                  )}
                  {state.pre_gst_price != null && (
                    <div className="flex justify-between">
                      <span className="text-stone-400">Pre-tax</span>
                      <span className="text-stone-600">{fmt(state.pre_gst_price)}</span>
                    </div>
                  )}
                  {state.gst_amount != null && (
                    <div className="flex justify-between">
                      <span className="text-stone-400">GST ({state.gst_pct?.toFixed(0)}%)</span>
                      <span className="text-stone-600">+{fmt(state.gst_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-stone-400">Lead time</span>
                    <span className="text-stone-700 flex items-center gap-1">
                      <Truck size={12} className="text-stone-400" />
                      ~{state.estimated_days} days
                    </span>
                  </div>
                </div>

                <div className="border-t border-stone-200 pt-4 flex justify-between items-center">
                  <span className="text-stone-900 font-medium text-sm">Total (incl. GST)</span>
                  <span className="text-stone-900 font-medium text-xl">{fmt(state.estimated_price)}</span>
                </div>

                <p className="text-stone-400 text-xs leading-relaxed">
                  Final price confirmed after production review. Payment via UPI/Bank Transfer.
                </p>
              </div>
            </div>

            {state.notes && (
              <div className="border border-stone-200 p-5">
                <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Special Requirements</p>
                <p className="text-stone-600 text-sm leading-relaxed">{state.notes}</p>
              </div>
            )}
          </div>

          {/* Checkout form — right column */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="border border-stone-200">

              {/* Contact details */}
              <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-2">
                <User size={14} className="text-stone-400" />
                <p className="text-xs tracking-[0.2em] uppercase text-stone-400">Contact Details</p>
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
                  <button
                    type="button"
                    onClick={() => setAuthModal(true)}
                    className="w-full flex items-center gap-3 border border-stone-200 hover:border-stone-400 px-3 py-3 transition-colors text-left"
                  >
                    <LogIn size={14} className="text-stone-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-stone-700 text-xs font-medium">Sign in to place your order</p>
                      <p className="text-stone-400 text-xs">Login or create a free account</p>
                    </div>
                  </button>
                )}
              </div>

              {/* Shipping address */}
              <div className="px-5 py-4 border-y border-stone-100 flex items-center gap-2">
                <MapPin size={14} className="text-stone-400" />
                <p className="text-xs tracking-[0.2em] uppercase text-stone-400">Delivery Address</p>
              </div>
              <div className="p-5 space-y-3">
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
                    <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">State *</label>
                    <input
                      name="state_name"
                      value={form.state_name}
                      onChange={handleChange}
                      placeholder="e.g. Maharashtra"
                      required
                      className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">PIN Code *</label>
                  <input
                    name="pincode"
                    value={form.pincode}
                    onChange={handleChange}
                    placeholder="e.g. 400001"
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
                  disabled={submitting}
                  className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-medium tracking-widest uppercase py-4 transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isCustomerAuthenticated ? (
                    <ShoppingBag size={13} />
                  ) : (
                    <LogIn size={13} />
                  )}
                  {submitting
                    ? 'Placing Order…'
                    : isCustomerAuthenticated
                      ? `Confirm Order · ${sym}${fmt(state.estimated_price)}`
                      : 'Sign in & Place Order'}
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
                className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-medium tracking-widest uppercase py-3.5 transition-colors flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                ) : authMode === 'login' ? (
                  <><LogIn size={13} /> Sign In & Place Order</>
                ) : (
                  <><UserPlus size={13} /> Register & Place Order</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}
