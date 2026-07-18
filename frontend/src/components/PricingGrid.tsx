import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Zap, TrendingUp, Building2, IndianRupee, CreditCard, Smartphone } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  name_en: string;
  tagline: string;
  price_inr: number;
  ai_credits: number;
  staff_users: number;
  features: string[];
  not_included: string[];
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Karigar',
    name_en: 'Starter',
    tagline: 'Solo craftsman · Bhadohi ready',
    price_inr: 999,
    ai_credits: 200,
    staff_users: 1,
    features: [
      '1 staff login',
      '50 catalog designs',
      '200 AI queries / month',
      'Customer shop widget',
      'Quote builder',
      'Basic analytics',
      'UPI · Cards · Net Banking',
      'Email support',
    ],
    not_included: ['Room visualizer', 'Team logins', 'White-label portal', 'API access'],
  },
  {
    id: 'growth',
    name: 'Vyapar',
    name_en: 'Growth',
    tagline: 'Growing workshop · Export orders',
    price_inr: 2999,
    ai_credits: 1000,
    staff_users: 5,
    features: [
      '5 staff logins',
      'Unlimited catalog designs',
      '1,000 AI queries / month',
      'Customer shop + Room visualizer',
      'Advanced analytics dashboard',
      'Export orders tracking',
      'Priority support (Hindi + English)',
      'GST invoice on every payment',
    ],
    not_included: ['White-label portal', 'API access', 'Dedicated manager'],
  },
  {
    id: 'pro',
    name: 'Udyog',
    name_en: 'Enterprise',
    tagline: 'Large manufacturer · Multi-facility',
    price_inr: 7999,
    ai_credits: -1,
    staff_users: -1,
    features: [
      'Unlimited staff logins',
      'Unlimited catalog designs',
      'Unlimited AI queries',
      'White-label customer portal',
      'Full API access',
      'Dedicated account manager',
      'Multi-facility support',
      'SLA guarantee',
      'Custom integrations',
    ],
    not_included: [],
  },
];

const PLAN_ICONS: Record<string, React.ReactNode> = {
  starter: <Zap size={20} />,
  growth: <TrendingUp size={20} />,
  pro: <Building2 size={20} />,
};

interface PricingGridProps {
  currentPlan?: string;
  onSelectPlan?: (planId: string) => void;
  loadingPlan?: string | null;
  showSignupLinks?: boolean;
}

export default function PricingGrid({
  currentPlan,
  onSelectPlan,
  loadingPlan,
  showSignupLinks = false,
}: PricingGridProps) {
  const [annual, setAnnual] = useState(false);

  const displayPrice = (baseMonthly: number) =>
    annual ? Math.round(baseMonthly * 10) : baseMonthly;

  return (
    <div className="space-y-6">
      {/* Annual toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${!annual ? 'text-cream-100' : 'text-dark-400'}`}>
          Monthly
        </span>
        <button
          onClick={() => setAnnual((a) => !a)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            annual ? 'bg-gold-600' : 'bg-dark-700'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              annual ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${annual ? 'text-cream-100' : 'text-dark-400'}`}>
          Annual
          <span className="ml-1.5 bg-green-800/40 text-green-400 border border-green-700/40 text-xs px-1.5 py-0.5 rounded-full">
            2 months free
          </span>
        </span>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan) => {
          const isPopular = plan.id === 'growth';
          const isCurrent = currentPlan === plan.id;
          const isLoading = loadingPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border flex flex-col transition-all ${
                isPopular
                  ? 'border-gold-500 bg-dark-800 shadow-xl shadow-gold-900/20'
                  : 'border-dark-700 bg-dark-900 hover:border-dark-600'
              }`}
            >
              {/* Popular badge */}
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-gold-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-6 flex-1 space-y-5">
                {/* Plan header */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`${isPopular ? 'text-gold-400' : 'text-dark-400'}`}>
                      {PLAN_ICONS[plan.id]}
                    </span>
                    <h3 className="text-cream-100 font-bold text-xl">{plan.name}</h3>
                    <span className="text-dark-500 text-sm font-normal">({plan.name_en})</span>
                  </div>
                  <p className="text-dark-400 text-xs">{plan.tagline}</p>
                </div>

                {/* Price */}
                <div>
                  <div className="flex items-end gap-1">
                    <span className="text-dark-400 text-lg">₹</span>
                    <span className="text-cream-100 font-bold text-4xl leading-none">
                      {displayPrice(plan.price_inr).toLocaleString('en-IN')}
                    </span>
                    <span className="text-dark-400 text-sm mb-1">
                      /{annual ? 'yr' : 'mo'}
                    </span>
                  </div>
                  {annual && (
                    <p className="text-dark-500 text-xs mt-0.5 line-through">
                      ₹{(plan.price_inr * 12).toLocaleString('en-IN')}/yr
                    </p>
                  )}
                  <p className="text-dark-500 text-xs mt-1">GST included · No hidden fees</p>
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-dark-200">
                      <Check size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                  {plan.not_included.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-dark-600">
                      <X size={14} className="text-dark-600 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="p-6 pt-0">
                {isCurrent ? (
                  <div className="w-full text-center py-2.5 rounded-xl bg-dark-700 border border-dark-600 text-dark-400 text-sm font-medium">
                    Current Plan
                  </div>
                ) : showSignupLinks ? (
                  <Link
                    to="/admin/login"
                    className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      isPopular
                        ? 'bg-gold-600 hover:bg-gold-500 text-white'
                        : 'bg-dark-700 hover:bg-dark-600 border border-dark-600 text-cream-200'
                    }`}
                  >
                    Get Started Free
                  </Link>
                ) : onSelectPlan ? (
                  <button
                    onClick={() => onSelectPlan(plan.id)}
                    disabled={!!isLoading}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                      isPopular
                        ? 'bg-gold-600 hover:bg-gold-500 disabled:bg-gold-800 text-white'
                        : 'bg-dark-700 hover:bg-dark-600 disabled:bg-dark-800 border border-dark-600 text-cream-200'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing…
                      </>
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment methods trust bar */}
      <div className="flex items-center justify-center gap-6 pt-2">
        <div className="flex items-center gap-1.5 text-dark-500 text-xs">
          <Smartphone size={13} />
          UPI
        </div>
        <div className="flex items-center gap-1.5 text-dark-500 text-xs">
          <CreditCard size={13} />
          Cards
        </div>
        <div className="flex items-center gap-1.5 text-dark-500 text-xs">
          <IndianRupee size={13} />
          Net Banking
        </div>
        <div className="w-px h-3 bg-dark-700" />
        <span className="text-dark-600 text-xs">Secured by Razorpay</span>
        <span className="text-dark-600 text-xs">·</span>
        <span className="text-dark-600 text-xs">GST Invoice provided</span>
      </div>
    </div>
  );
}
