import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  CreditCard,
  Zap,
  TrendingUp,
  Building2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  IndianRupee,
} from 'lucide-react';
import PricingGrid from '../components/PricingGrid';
import { useAuth } from '../contexts/AuthContext';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface BillingStatus {
  plan: string;
  plan_name: string;
  plan_name_en: string;
  plan_status: string;
  price_inr: number;
  ai_credits_used: number;
  ai_credits_limit: number;
  ai_credits_pct: number;
  staff_users_limit: number;
  catalog_items_limit: number;
  razorpay_subscription_id: string | null;
  billing_cycle_start: string | null;
  features: string[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  trial:      { label: 'Free Trial',   color: 'text-blue-400 bg-blue-900/20 border-blue-700/40',   icon: <Clock size={13} /> },
  active:     { label: 'Active',       color: 'text-green-400 bg-green-900/20 border-green-700/40', icon: <CheckCircle size={13} /> },
  past_due:   { label: 'Payment Due',  color: 'text-orange-400 bg-orange-900/20 border-orange-700/40', icon: <AlertTriangle size={13} /> },
  cancelled:  { label: 'Cancelled',    color: 'text-red-400 bg-red-900/20 border-red-700/40',      icon: <XCircle size={13} /> },
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  starter: <Zap size={18} className="text-gold-400" />,
  growth:  <TrendingUp size={18} className="text-gold-400" />,
  pro:     <Building2 size={18} className="text-gold-400" />,
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BillingSettings() {
  const { user } = useAuth();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/billing/status');
      setStatus(data);
    } catch {
      setError('Failed to load billing info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleUpgrade = async (planId: string) => {
    setUpgradingPlan(planId);
    setError(null);
    setSuccessMsg(null);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Razorpay checkout could not be loaded. Check your internet connection.');

      const { data } = await axios.post('/api/billing/create-subscription', { plan: planId });

      const options = {
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: 'LoomCraft AI',
        description: data.description,
        image: '/favicon.ico',
        prefill: data.prefill,
        theme: { color: '#d97706' },
        modal: { backdropclose: false },
        handler: async (response: any) => {
          try {
            const verify = await axios.post('/api/billing/verify-payment', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
            });
            setSuccessMsg(verify.data.message);
            await fetchStatus();
          } catch {
            setError('Payment was received but verification failed. Please contact support.');
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setError(`Payment failed: ${resp.error.description}`);
      });
      rzp.open();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Something went wrong');
    } finally {
      setUpgradingPlan(null);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { data } = await axios.post('/api/billing/cancel');
      setSuccessMsg(data.message);
      setCancelConfirm(false);
      await fetchStatus();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[status?.plan_status ?? 'trial'] ?? STATUS_CONFIG.trial;
  const creditsUnlimited = (status?.ai_credits_limit ?? 0) < 0;
  const creditsExhausted = !creditsUnlimited && (status?.ai_credits_used ?? 0) >= (status?.ai_credits_limit ?? 1);

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CreditCard size={22} className="text-gold-400" />
          <div>
            <h1 className="text-2xl font-bold text-cream-100">Billing & Plan</h1>
            <p className="text-dark-400 text-sm">Manage your subscription</p>
          </div>
        </div>
        <button onClick={fetchStatus} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/40 rounded-xl p-4 text-red-300 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2 bg-green-900/20 border border-green-700/40 rounded-xl p-4 text-green-300 text-sm">
          <CheckCircle size={16} className="flex-shrink-0 mt-0.5" /> {successMsg}
        </div>
      )}

      {/* Current plan card */}
      {status && (
        <div className="card space-y-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {PLAN_ICONS[status.plan]}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-cream-100 font-bold text-lg">{status.plan_name}</h2>
                  <span className="text-dark-500 text-sm">({status.plan_name_en})</span>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.color}`}>
                    {statusCfg.icon} {statusCfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <IndianRupee size={12} className="text-dark-400" />
                  <span className="text-dark-400 text-sm">{status.price_inr.toLocaleString('en-IN')}/month</span>
                  {status.billing_cycle_start && (
                    <span className="text-dark-600 text-xs ml-2">
                      · Cycle started {new Date(status.billing_cycle_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {status.plan_status === 'trial' && (
              <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg px-3 py-2 text-xs text-blue-300">
                You're on a free trial. Subscribe to unlock full access.
              </div>
            )}
          </div>

          {/* AI Credits meter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-300 font-medium flex items-center gap-1.5">
                <Zap size={13} className="text-gold-400" /> AI Queries this month
              </span>
              <span className={`font-semibold ${creditsExhausted ? 'text-red-400' : 'text-cream-200'}`}>
                {creditsUnlimited
                  ? `${status.ai_credits_used} used · Unlimited`
                  : `${status.ai_credits_used} / ${status.ai_credits_limit}`}
              </span>
            </div>
            {!creditsUnlimited && (
              <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    creditsExhausted ? 'bg-red-500' :
                    status.ai_credits_pct > 80 ? 'bg-orange-500' : 'bg-gold-500'
                  }`}
                  style={{ width: `${status.ai_credits_pct}%` }}
                />
              </div>
            )}
            {creditsExhausted && (
              <p className="text-red-400 text-xs flex items-center gap-1">
                <AlertTriangle size={11} /> AI queries exhausted — upgrade to continue using AI features
              </p>
            )}
          </div>

          {/* Limits summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              {
                label: 'Staff Logins',
                value: status.staff_users_limit < 0 ? 'Unlimited' : String(status.staff_users_limit),
              },
              {
                label: 'Catalog Items',
                value: status.catalog_items_limit < 0 ? 'Unlimited' : String(status.catalog_items_limit),
              },
              {
                label: 'AI Queries',
                value: creditsUnlimited ? 'Unlimited' : String(status.ai_credits_limit) + '/mo',
              },
            ].map((item) => (
              <div key={item.label} className="bg-dark-800 rounded-lg px-3 py-2">
                <p className="text-dark-500 text-xs">{item.label}</p>
                <p className="text-cream-200 font-semibold text-sm mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade section */}
      {status && status.plan !== 'pro' && (
        <div className="space-y-4">
          <h2 className="text-cream-100 font-bold text-lg">Upgrade Your Plan</h2>
          <PricingGrid
            currentPlan={status.plan}
            onSelectPlan={handleUpgrade}
            loadingPlan={upgradingPlan}
          />
        </div>
      )}

      {/* Cancel zone */}
      {status?.plan_status === 'active' && status.razorpay_subscription_id && (
        <div className="card border-red-900/30 space-y-3">
          <h3 className="text-cream-200 font-semibold text-sm">Cancel Subscription</h3>
          <p className="text-dark-400 text-sm">
            Your subscription will remain active until the end of the current billing period. After that, your account reverts to the free trial limits.
          </p>
          {!cancelConfirm ? (
            <button
              onClick={() => setCancelConfirm(true)}
              className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
            >
              Cancel subscription
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 bg-red-800/30 hover:bg-red-800/50 border border-red-700/50 rounded-lg text-red-300 text-sm font-medium transition-colors flex items-center gap-2"
              >
                {cancelling && <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />}
                Yes, cancel
              </button>
              <button
                onClick={() => setCancelConfirm(false)}
                className="text-dark-400 hover:text-cream-300 text-sm transition-colors"
              >
                Keep subscription
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
