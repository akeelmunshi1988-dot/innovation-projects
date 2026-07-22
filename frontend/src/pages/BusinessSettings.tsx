import { useState, useEffect, useRef } from 'react';
import { Settings, Check, AlertTriangle, Building2, TrendingUp, FileText, User, Zap, Mail } from 'lucide-react';
import axios from 'axios';

import { useAuth } from '../contexts/AuthContext';
import { CURRENCIES } from '../utils/currency';
import { getEmailTemplates, updateEmailTemplate } from '../services/api';
import type { EmailTemplate } from '../types';

type Tab = 'general' | 'pricing' | 'gst' | 'templates' | 'account';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'general',   label: 'General',         icon: <Building2 size={15} /> },
  { id: 'pricing',   label: 'Pricing',         icon: <TrendingUp size={15} /> },
  { id: 'gst',       label: 'GST & Tax',       icon: <FileText size={15} /> },
  { id: 'templates', label: 'Email Templates', icon: <Mail size={15} /> },
  { id: 'account',   label: 'Account',         icon: <User size={15} /> },
];

const TEMPLATE_VARIABLES: Record<string, string[]> = {
  quote_sent: ['customer_name', 'tenant_name', 'rug_name', 'size', 'qty', 'price', 'expected_delivery', 'note_html', 'note_text'],
  invoice_email: ['customer_name', 'tenant_name', 'invoice_type_label', 'rug_name', 'size', 'qty', 'price', 'disclaimer'],
  vendor_review_request: ['tenant_name', 'customer_name', 'customer_email', 'quote_id', 'rug_name', 'size', 'status', 'request_num', 'max_requests'],
  customer_verification: ['customer_name', 'tenant_name', 'verification_link'],
};

const STATES = [
  ['09','Uttar Pradesh'], ['08','Rajasthan'], ['27','Maharashtra'],
  ['07','Delhi'], ['06','Haryana'], ['29','Karnataka'],
  ['33','Tamil Nadu'], ['24','Gujarat'], ['03','Punjab'],
  ['19','West Bengal'], ['23','Madhya Pradesh'], ['36','Telangana'],
  ['32','Kerala'], ['21','Odisha'], ['05','Uttarakhand'],
  ['10','Bihar'], ['22','Chhattisgarh'], ['28','Andhra Pradesh'],
  ['18','Assam'], ['02','Himachal Pradesh'], ['01','Jammu & Kashmir'],
  ['30','Goa'],
];

const inputCls = 'w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-2.5 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-600/50 transition-colors';
const labelCls = 'block text-cream-300 text-xs font-semibold uppercase tracking-wider mb-1.5';
const subLabelCls = 'block text-cream-400 text-xs font-medium mb-1.5';
const hintCls = 'text-dark-500 text-xs mt-1';

export default function BusinessSettings() {
  const { user, updateTenant } = useAuth();
  const tenant = user!.tenant;

  const [tab, setTab] = useState<Tab>('general');

  // General
  const [name, setName] = useState(tenant.name);
  const [currency, setCurrency] = useState(tenant.currency);
  // exchangeRates: local edit state as Record<code, string> for input values
  const [exchangeRates, setExchangeRates] = useState<Record<string, string>>(
    () => Object.fromEntries(
      Object.entries(tenant.exchange_rates ?? {}).map(([k, v]) => [k, String(v)])
    )
  );

  // Pricing
  const [marginPct, setMarginPct] = useState(String(tenant.default_profit_margin_pct ?? 40));
  const [rushPct, setRushPct] = useState(String(tenant.rush_surcharge_pct ?? 25));
  const [lfThreshold, setLfThreshold] = useState(String(tenant.large_format_threshold_sqm ?? 20));
  const [lfSurchargePct, setLfSurchargePct] = useState(String(tenant.large_format_surcharge_pct ?? 5));

  // GST & Tax
  const [gstin, setGstin] = useState(tenant.gstin ?? '');
  const [stateCode, setStateCode] = useState(tenant.state_code ?? '');
  const [address, setAddress] = useState(tenant.address ?? '');
  const [lutNumber, setLutNumber] = useState(tenant.lut_number ?? '');

  // Features
  const [aiAssistantCustomerEnabled, setAiAssistantCustomerEnabled] = useState(tenant.ai_assistant_customer_enabled ?? true);
  const [aiAssistantVendorEnabled, setAiAssistantVendorEnabled] = useState(tenant.ai_assistant_vendor_enabled ?? true);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [faviconError, setFaviconError] = useState('');
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const handleFaviconUpload = async (file: File) => {
    setUploadingFavicon(true);
    setFaviconError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await axios.post('/api/tenant/favicon', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateTenant(data);
    } catch (err: any) {
      setFaviconError(err.response?.data?.detail || 'Favicon upload failed.');
    } finally {
      setUploadingFavicon(false);
    }
  };

  const foreignCurrencies = CURRENCIES.filter((c) => c.code !== tenant.base_currency);
  const ratesChanged  = foreignCurrencies.some((c) => {
    const newVal = parseFloat(exchangeRates[c.code] ?? '0') || 0;
    const oldVal = (tenant.exchange_rates ?? {})[c.code] ?? 0;
    return Math.abs(newVal - oldVal) > 0.000001;
  });
  const dirtyGeneral  = name !== tenant.name || currency !== tenant.currency || ratesChanged
    || aiAssistantCustomerEnabled !== (tenant.ai_assistant_customer_enabled ?? true)
    || aiAssistantVendorEnabled !== (tenant.ai_assistant_vendor_enabled ?? true);
  const dirtyPricing  = parseFloat(marginPct) !== tenant.default_profit_margin_pct || parseFloat(rushPct) !== tenant.rush_surcharge_pct || parseFloat(lfThreshold) !== tenant.large_format_threshold_sqm || parseFloat(lfSurchargePct) !== tenant.large_format_surcharge_pct;
  const dirtyGst      = gstin !== (tenant.gstin ?? '') || stateCode !== (tenant.state_code ?? '') || address !== (tenant.address ?? '') || lutNumber !== (tenant.lut_number ?? '');
  const isDirty       = dirtyGeneral || dirtyPricing || dirtyGst;

  const tabDirty: Record<Tab, boolean> = {
    general: dirtyGeneral,
    pricing: dirtyPricing,
    gst: dirtyGst,
    templates: false,
    account: false,
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      // Build exchange_rates: positive numeric values only, keyed by currency code
      const rates: Record<string, number> = {};
      foreignCurrencies.forEach((c) => {
        const val = parseFloat(exchangeRates[c.code] ?? '0');
        if (val > 0) rates[c.code] = val;
      });
      const { data } = await axios.patch('/api/tenant/settings', {
        name: name.trim() || undefined,
        currency,
        exchange_rates: rates,
        gstin: gstin.trim() || undefined,
        state_code: stateCode.trim() || undefined,
        address: address.trim() || undefined,
        lut_number: lutNumber.trim() || undefined,
        default_profit_margin_pct: parseFloat(marginPct),
        rush_surcharge_pct: parseFloat(rushPct),
        large_format_threshold_sqm: parseFloat(lfThreshold),
        large_format_surcharge_pct: parseFloat(lfSurchargePct),
        ai_assistant_customer_enabled: aiAssistantCustomerEnabled,
        ai_assistant_vendor_enabled: aiAssistantVendorEnabled,
      });
      updateTenant(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const SaveBar = () => (
    <div className="flex items-center gap-3 pt-4 border-t border-dark-800 mt-2">
      <button
        type="submit"
        disabled={saving || !isDirty}
        className="bg-gold-600 hover:bg-gold-500 disabled:bg-dark-700 disabled:text-dark-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2"
      >
        {saving ? (
          <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
        ) : 'Save Changes'}
      </button>
      {saved && (
        <span className="flex items-center gap-1.5 text-green-400 text-sm">
          <Check size={14} /> Saved
        </span>
      )}
      {error && (
        <span className="flex items-center gap-1.5 text-red-400 text-xs">
          <AlertTriangle size={13} /> {error}
        </span>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gold-600/20 flex items-center justify-center">
          <Settings size={20} className="text-gold-400" />
        </div>
        <div>
          <h1 className="text-cream-100 font-bold text-2xl">Business Settings</h1>
          <p className="text-dark-400 text-sm mt-0.5">Manage your account details and preferences</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-dark-900 border border-dark-700 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${
              tab === t.id
                ? 'bg-dark-700 text-cream-100 shadow-sm'
                : 'text-dark-400 hover:text-cream-300'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            {tabDirty[t.id] && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gold-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <form onSubmit={handleSave} className="bg-dark-900 border border-dark-700 rounded-2xl p-6">

        {/* ── General ─────────────────────────────────────────────────────────── */}
        {tab === 'general' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-cream-100 font-semibold text-base">General</h2>
              <p className="text-dark-500 text-xs mt-0.5">Your business identity shown across the app.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className={labelCls}>Business Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={inputCls}
                />
                <p className={hintCls}>Used as your browser tab title across the app and storefront.</p>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Favicon</label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-dark-800 border border-dark-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {tenant.logo_url ? (
                      <img src={tenant.logo_url} alt="Favicon" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-dark-600 text-xs">—</span>
                    )}
                  </div>
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/x-icon,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFaviconUpload(file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={uploadingFavicon}
                    className="text-xs bg-dark-800 hover:bg-dark-700 border border-dark-600 text-cream-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {uploadingFavicon ? 'Uploading…' : 'Upload image'}
                  </button>
                </div>
                {faviconError && <p className="text-red-400 text-xs">{faviconError}</p>}
                <p className={hintCls}>Shown as the browser tab icon. PNG, ICO, or SVG.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelCls}>Display Currency</label>
                <p className="text-dark-500 text-xs -mt-1">
                  Shown on invoices and quotes. Costs are stored in{' '}
                  <span className="text-gold-500 font-semibold">{tenant.base_currency}</span>{' '}
                  (your base currency).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCurrency(c.code)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      currency === c.code
                        ? 'border-gold-500 bg-gold-600/10 text-cream-100'
                        : 'border-dark-700 bg-dark-800 text-dark-300 hover:border-dark-500 hover:text-cream-300'
                    }`}
                  >
                    <span className={`text-xl font-bold ${currency === c.code ? 'text-gold-400' : 'text-dark-500'}`}>
                      {c.symbol}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-none">{c.code}</p>
                      <p className="text-xs text-dark-400 mt-0.5 truncate">{c.label.split(' (')[0]}</p>
                    </div>
                    {c.code === tenant.base_currency && (
                      <span className="text-[10px] text-dark-500 font-semibold border border-dark-600 rounded px-1">BASE</span>
                    )}
                    {currency === c.code && c.code !== tenant.base_currency && (
                      <Check size={14} className="text-gold-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Exchange rates table — one row per non-base currency */}
              <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 space-y-3">
                <div>
                  <p className={subLabelCls}>Exchange Rates</p>
                  <p className={hintCls + ' -mt-1'}>
                    Stored per entry — costs entered in {tenant.base_currency} convert automatically.
                    Get rates from xe.com or Google.
                  </p>
                </div>

                {foreignCurrencies.map((c) => {
                  const baseSym = CURRENCIES.find((x) => x.code === tenant.base_currency)?.symbol ?? tenant.base_currency;
                  const dispSym = c.symbol;
                  const rateStr = exchangeRates[c.code] ?? '';
                  const rateVal = parseFloat(rateStr) || 0;
                  const isActive = currency === c.code;
                  return (
                    <div key={c.code} className={`rounded-lg p-3 space-y-2 ${isActive ? 'bg-dark-700 border border-gold-700/30' : 'bg-dark-900'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-cream-300 text-xs font-semibold">
                          {c.code} {c.symbol}
                          {isActive && <span className="ml-2 text-gold-400 text-[10px]">← DISPLAY</span>}
                        </span>
                        {rateVal > 0 && (
                          <span className="text-dark-400 text-xs">
                            1 {tenant.base_currency} = {dispSym}{rateVal}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-dark-500 text-xs whitespace-nowrap">1 {baseSym} =</span>
                        <input
                          type="number"
                          step="0.00001"
                          min="0.00001"
                          value={rateStr}
                          onChange={(e) => setExchangeRates((prev) => ({ ...prev, [c.code]: e.target.value }))}
                          placeholder="e.g. 0.01200"
                          className="flex-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-1.5 text-cream-100 text-sm placeholder-dark-600 focus:outline-none focus:border-gold-500 transition-colors"
                        />
                        <span className="text-dark-400 text-sm">{dispSym}</span>
                      </div>
                      {rateVal > 0 && isActive && (
                        <div className="flex gap-4 text-xs text-dark-400 pt-0.5">
                          <span>{baseSym}1,000 → <span className="text-gold-400">{dispSym}{(1000 * rateVal).toFixed(2)}</span></span>
                          <span>{baseSym}1,00,000 → <span className="text-gold-400">{dispSym}{(100000 * rateVal).toFixed(2)}</span></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <div>
                <p className={subLabelCls}>Features</p>
                <p className={hintCls + ' -mt-1'}>Control where the AI assistant appears.</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                <div>
                  <p className="text-cream-200 text-sm font-medium">AI Assistant for Customers</p>
                  <p className="text-dark-400 text-xs">Shows the AI chat widget on your storefront.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAiAssistantCustomerEnabled((v) => !v)}
                  className={`w-11 h-6 rounded-full transition-all duration-200 relative flex-shrink-0 ${
                    aiAssistantCustomerEnabled ? 'bg-gold-600' : 'bg-dark-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${
                      aiAssistantCustomerEnabled ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                <div>
                  <p className="text-cream-200 text-sm font-medium">AI Assistant for Vendor/Staff</p>
                  <p className="text-dark-400 text-xs">Shows the AI Assistant page in your admin panel.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAiAssistantVendorEnabled((v) => !v)}
                  className={`w-11 h-6 rounded-full transition-all duration-200 relative flex-shrink-0 ${
                    aiAssistantVendorEnabled ? 'bg-gold-600' : 'bg-dark-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${
                      aiAssistantVendorEnabled ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <SaveBar />
          </div>
        )}

        {/* ── Pricing ─────────────────────────────────────────────────────────── */}
        {tab === 'pricing' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-cream-100 font-semibold text-base">Pricing Defaults</h2>
              <p className="text-dark-500 text-xs mt-0.5">Applied to all quotes unless overridden per catalog item.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={subLabelCls}>Default Profit Margin</label>
                <div className="relative">
                  <input
                    type="number" min="0" max="500" step="0.5"
                    value={marginPct}
                    onChange={(e) => setMarginPct(e.target.value)}
                    className={inputCls + ' pr-8'}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm">%</span>
                </div>
                <p className={hintCls}>
                  Selling = material cost × {marginPct ? (1 + parseFloat(marginPct) / 100).toFixed(2) : '—'}×
                </p>
              </div>

              <div className="space-y-1.5">
                <label className={subLabelCls}>Early Delivery Surcharge</label>
                <div className="relative">
                  <input
                    type="number" min="0" max="200" step="0.5"
                    value={rushPct}
                    onChange={(e) => setRushPct(e.target.value)}
                    className={inputCls + ' pr-8'}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm">%</span>
                </div>
                <p className={hintCls}>Added on top of subtotal for early delivery orders.</p>
              </div>
            </div>

            {/* Large Format Surcharge */}
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 space-y-3">
              <div>
                <p className={subLabelCls}>Large Format Surcharge</p>
                <p className={hintCls + ' -mt-1'}>Applied when a single rug exceeds the area threshold.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-dark-400 text-xs">Threshold (sqm per piece)</label>
                  <div className="relative">
                    <input
                      type="number" min="1" max="500" step="1"
                      value={lfThreshold}
                      onChange={(e) => setLfThreshold(e.target.value)}
                      className={inputCls + ' pr-14'}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 text-xs">sqm</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-dark-400 text-xs">Surcharge rate</label>
                  <div className="relative">
                    <input
                      type="number" min="0" max="100" step="0.5"
                      value={lfSurchargePct}
                      onChange={(e) => setLfSurchargePct(e.target.value)}
                      className={inputCls + ' pr-8'}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm">%</span>
                  </div>
                </div>
              </div>
              {parseFloat(lfSurchargePct) > 0 && (
                <p className={hintCls}>
                  Rugs &gt; <span className="text-cream-400">{lfThreshold} sqm</span> will add{' '}
                  <span className="text-cream-400">{lfSurchargePct}%</span> on the subtotal.
                  {parseFloat(lfSurchargePct) === 0 && ' Set to 0% to disable.'}
                </p>
              )}
              {parseFloat(lfSurchargePct) === 0 && (
                <p className={hintCls}>Set to 0% — large format surcharge is disabled.</p>
              )}
            </div>

            {/* Live preview card */}
            <div className="bg-dark-800 rounded-xl p-4 space-y-2 text-sm border border-dark-700">
              <p className="text-dark-400 text-xs uppercase tracking-wider font-medium">Live Preview — ₹500/sqm material, 25 sqm (rush)</p>
              {(() => {
                const mat = 500, sqm = 25;
                const margin = parseFloat(marginPct) || 0;
                const rush = parseFloat(rushPct) || 0;
                const lfThresholdNum = parseFloat(lfThreshold) || 20;
                const lfPct = parseFloat(lfSurchargePct) || 0;
                const rate = mat * (1 + margin / 100);
                const subtotal = rate * sqm;
                const rushAmt = subtotal * (rush / 100);
                const lfAmt = lfPct > 0 && sqm > lfThresholdNum ? subtotal * (lfPct / 100) : 0;
                return (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-cream-300">
                      <span>Selling rate ({margin}% margin)</span>
                      <span>₹{rate.toFixed(2)}/sqm</span>
                    </div>
                    <div className="flex justify-between text-cream-300">
                      <span>Subtotal (× {sqm} sqm)</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-orange-400">
                      <span className="flex items-center gap-1"><Zap size={12} /> Rush ({rush}%)</span>
                      <span>+₹{rushAmt.toFixed(2)}</span>
                    </div>
                    {lfAmt > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>Large format ({lfPct}%, &gt;{lfThresholdNum} sqm)</span>
                        <span>+₹{lfAmt.toFixed(2)}</span>
                      </div>
                    )}
                    {lfAmt === 0 && lfPct > 0 && (
                      <div className="flex justify-between text-dark-500">
                        <span>Large format (not triggered, ≤{lfThresholdNum} sqm)</span>
                        <span>—</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gold-400 border-t border-dark-700 pt-1.5">
                      <span>Total (pre-GST)</span>
                      <span>₹{(subtotal + rushAmt + lfAmt).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <SaveBar />
          </div>
        )}

        {/* ── GST & Tax ───────────────────────────────────────────────────────── */}
        {tab === 'gst' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-cream-100 font-semibold text-base">GST &amp; Tax</h2>
              <p className="text-dark-500 text-xs mt-0.5">Printed on every Tax Invoice and Export Invoice PDF.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={subLabelCls}>GSTIN</label>
                <input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="e.g. 09AABCU9603R1ZX"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className={subLabelCls}>State <span className="text-dark-500 font-normal">(GST code)</span></label>
                <select
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Select state —</option>
                  {STATES.map(([code, label]) => (
                    <option key={code} value={code}>{code} — {label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={subLabelCls}>Registered Business Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder="Full address as it should appear on invoices"
                className={inputCls + ' resize-none'}
              />
            </div>

            <div className="space-y-1.5">
              <label className={subLabelCls}>LUT Number</label>
              <input
                value={lutNumber}
                onChange={(e) => setLutNumber(e.target.value)}
                placeholder="e.g. AD090124001234LUT"
                className={inputCls}
              />
              <p className={hintCls}>
                Letter of Undertaking — required for zero-rated Export Invoices without paying IGST.
                {lutNumber && stateCode && (
                  <span className="text-green-500 ml-1">✓ Export invoices enabled</span>
                )}
              </p>
            </div>

            {/* Tax type preview */}
            {stateCode && (
              <div className="bg-dark-800 rounded-xl p-4 border border-dark-700 space-y-2">
                <p className="text-dark-400 text-xs uppercase tracking-wider font-medium">Invoice Tax Type</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-dark-700 rounded-lg p-2.5">
                    <p className="text-cream-300 font-medium">Domestic (same state)</p>
                    <p className="text-dark-400 mt-0.5">CGST 6% + SGST 6% = 12%</p>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-2.5">
                    <p className="text-cream-300 font-medium">Domestic (other state)</p>
                    <p className="text-dark-400 mt-0.5">IGST 12%</p>
                  </div>
                  <div className={`rounded-lg p-2.5 col-span-2 ${lutNumber ? 'bg-green-900/20 border border-green-800/30' : 'bg-dark-700'}`}>
                    <p className={`font-medium ${lutNumber ? 'text-green-400' : 'text-dark-400'}`}>Export Invoice (under LUT)</p>
                    <p className="text-dark-500 mt-0.5">{lutNumber ? '0% GST — zero-rated ✓' : 'Add LUT number above to enable'}</p>
                  </div>
                </div>
              </div>
            )}

            <SaveBar />
          </div>
        )}

        {/* ── Email Templates ─────────────────────────────────────────────────── */}
        {tab === 'templates' && <EmailTemplatesPanel />}

        {/* ── Account ─────────────────────────────────────────────────────────── */}
        {tab === 'account' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-cream-100 font-semibold text-base">Account</h2>
              <p className="text-dark-500 text-xs mt-0.5">Your plan and account details.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Plan', value: tenant.plan, cls: 'capitalize text-gold-400 font-semibold' },
                { label: 'Status', value: tenant.plan_status, cls: `capitalize font-medium ${tenant.plan_status === 'active' ? 'text-green-400' : tenant.plan_status === 'trial' ? 'text-blue-400' : 'text-orange-400'}` },
                { label: 'Account ID', value: tenant.slug, cls: 'font-mono text-dark-300' },
                { label: 'Account Since', value: '—', cls: 'text-dark-300' },
              ].map(({ label, value, cls }) => (
                <div key={label} className="bg-dark-800 rounded-xl p-4 border border-dark-700">
                  <p className="text-dark-500 text-xs uppercase tracking-wider mb-1">{label}</p>
                  <p className={`text-sm ${cls}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="bg-dark-800 rounded-xl p-4 border border-dark-700 space-y-3">
              <p className="text-dark-400 text-xs uppercase tracking-wider font-medium">AI Credits</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-dark-700 rounded-full h-2 overflow-hidden">
                  {(() => {
                    const planLimits: Record<string, number> = { starter: 200, growth: 500, pro: 2000 };
                    const limit = planLimits[tenant.plan] ?? 200;
                    const pct = Math.min(100, ((tenant.ai_credits_used ?? 0) / limit) * 100);
                    const color = pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-orange-400' : 'bg-gold-500';
                    return <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />;
                  })()}
                </div>
                <span className="text-cream-200 text-sm font-medium whitespace-nowrap">
                  {tenant.ai_credits_used ?? 0} used
                </span>
              </div>
              <p className="text-dark-500 text-xs">Resets each billing cycle. Upgrade for more credits.</p>
            </div>

            <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
              <p className="text-dark-400 text-xs uppercase tracking-wider font-medium mb-2">Logged in as</p>
              <p className="text-cream-200 text-sm font-medium">{user!.full_name || '—'}</p>
              <p className="text-dark-400 text-xs mt-0.5">{user!.email} · {user!.role}</p>
            </div>
          </div>
        )}

      </form>
    </div>
  );
}

function EmailTemplatesPanel() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getEmailTemplates()
      .then((data) => {
        setTemplates(data);
        if (data.length > 0) selectTemplate(data[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectTemplate = (t: EmailTemplate) => {
    setSelectedKey(t.key);
    setSubject(t.subject);
    setBodyText(t.body_text);
    setBodyHtml(t.body_html);
    setSaved(false);
    setError('');
  };

  const selected = templates.find((t) => t.key === selectedKey) ?? null;

  const handleSaveTemplate = async () => {
    if (!selected) return;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const updated = await updateEmailTemplate(selected.key, {
        subject,
        body_text: bodyText,
        body_html: bodyHtml,
      });
      setTemplates((prev) => prev.map((t) => (t.key === updated.key ? updated : t)));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-cream-100 font-semibold text-base">Email Templates</h2>
        <p className="text-dark-500 text-xs mt-0.5">
          Edit the subject and body of every automated email sent to customers and your team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Template list */}
        <div className="space-y-1.5">
          {templates.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => selectTemplate(t)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                selectedKey === t.key
                  ? 'bg-gold-600/15 border border-gold-700/40 text-cream-100'
                  : 'border border-dark-700 text-dark-300 hover:text-cream-200 hover:border-dark-500'
              }`}
            >
              <p className="font-medium">{t.name}</p>
              <p className="text-dark-500 text-xs mt-0.5">
                Updated {new Date(t.updated_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>

        {/* Editor */}
        {selected && (
          <div className="md:col-span-2 space-y-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Body (plain text)</label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={8}
                className={inputCls + ' font-mono text-xs leading-relaxed'}
              />
            </div>

            {bodyHtml && (
              <div className="space-y-1.5">
                <label className={labelCls}>Body (HTML — optional, used for rich formatting)</label>
                <textarea
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  rows={8}
                  className={inputCls + ' font-mono text-xs leading-relaxed'}
                />
              </div>
            )}

            <div className="bg-dark-800 border border-dark-700 rounded-xl p-3">
              <p className={subLabelCls}>Available variables</p>
              <p className="text-dark-400 text-xs font-mono mt-1 leading-relaxed">
                {(TEMPLATE_VARIABLES[selected.key] ?? []).map((v) => `{{${v}}}`).join('  ')}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-dark-800">
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={saving}
                className="bg-gold-600 hover:bg-gold-500 disabled:bg-dark-700 disabled:text-dark-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                ) : 'Save Template'}
              </button>
              {saved && (
                <span className="flex items-center gap-1.5 text-green-400 text-sm">
                  <Check size={14} /> Saved
                </span>
              )}
              {error && (
                <span className="flex items-center gap-1.5 text-red-400 text-xs">
                  <AlertTriangle size={13} /> {error}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
