import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, LogIn, UserPlus, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import CustomerLayout from '../components/CustomerLayout';

type Mode = 'login' | 'register';

export default function CustomerLogin() {
  const { customerLogin, customerRegister, isLoadingCustomer } = useCustomerAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', company: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        await customerLogin(form.email, form.password);
      } else {
        if (!form.name.trim()) { setError('Please enter your name.'); return; }
        await customerRegister(form.name, form.email, form.password, form.phone || undefined, form.company || undefined);
      }
      navigate('/shop/my-quotes');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    }
  };

  return (
    <CustomerLayout>
      <div className="min-h-[80vh] flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-md space-y-6">

          {/* Logo + heading */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-gold-600/15 border border-gold-600/30 rounded-2xl flex items-center justify-center mx-auto">
              <Sparkles size={22} className="text-gold-400" />
            </div>
            <h1 className="text-2xl font-bold text-dark-900">
              {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
            </h1>
            <p className="text-dark-400 text-sm">
              {mode === 'login'
                ? 'View your quotes, track orders and download invoices'
                : 'Register to manage your quotes and orders in one place'}
            </p>
          </div>

          {/* Card */}
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-7 space-y-5">
            {/* Mode toggle */}
            <div className="flex bg-dark-800 rounded-xl p-1">
              {(['login', 'register'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    mode === m ? 'bg-gold-600 text-white' : 'text-dark-400 hover:text-cream-200'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-cream-100 text-sm font-semibold uppercase tracking-wider">Full Name *</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    required
                    className="w-full bg-dark-300 border border-gold-600/50 focus:border-gold-500 rounded-xl px-4 py-3 text-dark-900 placeholder-dark-600 text-base focus:outline-none transition-colors"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-cream-100 text-sm font-semibold uppercase tracking-wider">Email *</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-dark-300 border border-gold-600/50 focus:border-gold-500 rounded-xl px-4 py-3 text-dark-900 placeholder-dark-600 text-base focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-cream-100 text-sm font-semibold uppercase tracking-wider">Password *</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-dark-300 border border-gold-600/50 focus:border-gold-500 rounded-xl px-4 py-3 pr-11 text-dark-900 placeholder-dark-600 text-base focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-600 hover:text-dark-900 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-cream-100 text-sm font-semibold uppercase tracking-wider">Phone</label>
                    <input
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+91 98..."
                      className="w-full bg-dark-300 border border-gold-600/50 focus:border-gold-500 rounded-xl px-4 py-3 text-dark-900 placeholder-dark-600 text-base focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-cream-100 text-sm font-semibold uppercase tracking-wider">Company</label>
                    <input
                      name="company"
                      value={form.company}
                      onChange={handleChange}
                      placeholder="Optional"
                      className="w-full bg-dark-300 border border-gold-600/50 focus:border-gold-500 rounded-xl px-4 py-3 text-dark-900 placeholder-dark-600 text-base focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/40 rounded-lg p-3 text-red-300 text-sm">
                  <AlertTriangle size={14} className="flex-shrink-0" /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoadingCustomer}
                className="w-full bg-gold-600 hover:bg-gold-500 disabled:bg-dark-700 disabled:text-dark-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isLoadingCustomer ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : mode === 'login' ? (
                  <><LogIn size={16} /> Sign In</>
                ) : (
                  <><UserPlus size={16} /> Create Account</>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-dark-500 text-sm">
            Already placed an order without an account?{' '}
            <button onClick={() => setMode('register')} className="text-gold-400 hover:text-gold-300 transition-colors">
              Register with the same email
            </button>{' '}
            to link it automatically.
          </p>

          <p className="text-center text-dark-600 text-xs">
            <Link to="/shop" className="hover:text-dark-400 transition-colors">← Back to Shop</Link>
          </p>
        </div>
      </div>
    </CustomerLayout>
  );
}
