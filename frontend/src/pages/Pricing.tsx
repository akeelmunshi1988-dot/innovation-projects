import React from 'react';
import { Link } from 'react-router-dom';
import { Scissors, ChevronDown } from 'lucide-react';
import PricingGrid from '../components/PricingGrid';

const FAQ = [
  {
    q: 'Can I pay via UPI?',
    a: 'Yes — UPI, all major credit/debit cards, and net banking are accepted through Razorpay. No international card required.',
  },
  {
    q: 'Will I get a GST invoice?',
    a: 'Yes. A proper GST invoice is issued for every payment, suitable for your business expense claims.',
  },
  {
    q: 'Is the trial really free?',
    a: 'Yes. Sign up, explore the full dashboard, and add your first rugs at no cost. No card required to start.',
  },
  {
    q: 'Can I upgrade or downgrade any time?',
    a: 'Absolutely. Upgrade instantly from inside your dashboard. Downgrade takes effect at the end of your billing period.',
  },
  {
    q: 'Is support available in Hindi?',
    a: 'Yes — our Growth and Pro plan support is available in Hindi and English, including WhatsApp.',
  },
  {
    q: 'What happens to my data if I cancel?',
    a: 'Your data is kept for 90 days after cancellation. You can export your catalog and customer data at any time.',
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-dark-900/90 backdrop-blur border-b border-dark-700">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gold-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Scissors size={16} className="text-white" />
            </div>
            <span className="text-cream-100 font-bold text-base">LoomCraftRugs AI</span>
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <Link to="/admin/login" className="text-dark-400 hover:text-cream-200 text-sm transition-colors">
              Sign In
            </Link>
            <Link
              to="/admin/login"
              className="bg-gold-600 hover:bg-gold-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-16 space-y-20">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-gold-600/10 border border-gold-600/20 rounded-full px-4 py-1.5 text-gold-400 text-xs font-medium mb-2">
            Made for Indian rug manufacturers · Bhadohi · Panipat · Mirzapur
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-cream-100 leading-tight">
            Simple pricing.
            <br />
            <span className="text-gold-400">No USD billing. Ever.</span>
          </h1>
          <p className="text-dark-300 text-lg max-w-2xl mx-auto">
            Everything a small or large rug manufacturer needs — AI assistant, customer portal,
            quote builder — priced in INR and payable by UPI.
          </p>
        </div>

        {/* Pricing grid */}
        <PricingGrid showSignupLinks />

        {/* Trust signals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { stat: '₹999', label: 'Starting price in INR' },
            { stat: 'UPI', label: 'Pay instantly, no card needed' },
            { stat: 'GST', label: 'Invoice on every payment' },
            { stat: 'Hindi', label: 'Support in Hindi + English' },
          ].map((item) => (
            <div key={item.label} className="bg-dark-900 border border-dark-700 rounded-xl p-4 text-center">
              <p className="text-gold-400 font-bold text-2xl">{item.stat}</p>
              <p className="text-dark-400 text-xs mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h2 className="text-cream-100 font-bold text-2xl text-center">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAQ.map((item) => (
              <div key={item.q} className="bg-dark-900 border border-dark-700 rounded-xl p-5 space-y-2">
                <h3 className="text-cream-200 font-semibold text-sm flex items-start gap-2">
                  <ChevronDown size={15} className="text-gold-400 flex-shrink-0 mt-0.5" />
                  {item.q}
                </h3>
                <p className="text-dark-400 text-sm leading-relaxed pl-5">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-8 text-center space-y-4">
          <h2 className="text-cream-100 font-bold text-2xl">
            Ready to modernise your rug business?
          </h2>
          <p className="text-dark-400">Start your free trial. No credit card required.</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/admin/login"
              className="bg-gold-600 hover:bg-gold-500 text-white font-bold px-8 py-3 rounded-xl transition-colors"
            >
              Start Free Trial
            </Link>
            <Link to="/admin/login" className="text-dark-400 hover:text-cream-300 text-sm transition-colors">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-700 py-8 text-center">
        <p className="text-dark-600 text-xs">
          © 2025 LoomCraftRugs AI · Powered by Claude AI ·{' '}
          <Link to="/pricing" className="hover:text-dark-400 transition-colors">Pricing</Link>
        </p>
      </footer>
    </div>
  );
}
