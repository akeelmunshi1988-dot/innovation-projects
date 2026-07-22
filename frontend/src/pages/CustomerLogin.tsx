import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, UserPlus, Eye, EyeOff, AlertTriangle, MailCheck } from 'lucide-react';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import CustomerLayout from '../components/CustomerLayout';

type Mode = 'login' | 'register';

export default function CustomerLogin() {
  const { customerLogin, customerRegister, isLoadingCustomer } = useCustomerAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

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
        navigate('/my-quotes');
      } else {
        if (!form.name.trim()) { setError('Please enter your name.'); return; }
        const result = await customerRegister(form.name, form.email, form.password, form.phone || undefined, form.company || undefined);
        setRegisteredEmail(result.email);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    }
  };

  if (registeredEmail) {
    return (
      <CustomerLayout>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-md mx-auto text-center">
            <MailCheck size={40} className="text-stone-400 mx-auto mb-6" />
            <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Almost there</p>
            <h1 className="font-serif text-3xl font-light text-stone-900 mb-4">Check your email</h1>
            <p className="text-stone-500 text-sm leading-relaxed">
              We've sent a verification link to <strong className="text-stone-700">{registeredEmail}</strong>.
              Please click the link to activate your account before signing in.
            </p>
            <button
              onClick={() => { setRegisteredEmail(null); setMode('login'); }}
              className="mt-8 text-stone-700 hover:text-stone-900 text-xs font-medium tracking-widest uppercase border-b border-stone-300 pb-0.5 transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-md mx-auto">

          {/* Page heading */}
          <div className="mb-10">
            <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Account</p>
            <h1 className="font-serif text-4xl font-light text-stone-900">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </h1>
            <p className="text-stone-500 text-sm mt-3 leading-relaxed">
              {mode === 'login'
                ? 'View your quotes, track orders and download invoices.'
                : 'Register to manage your quotes and orders in one place.'}
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex border-b border-stone-200 mb-8">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2.5 text-xs font-medium tracking-wider uppercase transition-colors ${
                  mode === m
                    ? 'text-stone-900 border-b-2 border-stone-900 -mb-px'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Full Name *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                  className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                />
              </div>
            )}

            <div>
              <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Email *</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Password *</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 pr-10 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Phone</label>
                  <input
                    name="phone"
                    type="tel"
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
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-3 text-red-600 text-xs">
                <AlertTriangle size={13} className="flex-shrink-0" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoadingCustomer}
              className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-medium tracking-widest uppercase py-4 transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isLoadingCustomer ? (
                <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <><LogIn size={13} /> Sign In</>
              ) : (
                <><UserPlus size={13} /> Create Account</>
              )}
            </button>
          </form>

          <p className="text-stone-400 text-xs mt-6 leading-relaxed">
            Already placed an order without an account?{' '}
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className="text-stone-700 hover:text-stone-900 transition-colors border-b border-stone-300 pb-0.5"
            >
              Register with the same email
            </button>{' '}
            to link it automatically.
          </p>

          <p className="text-stone-400 text-xs mt-4">
            <Link to="/" className="hover:text-stone-700 transition-colors border-b border-stone-200 pb-0.5">
              ← Back to Shop
            </Link>
          </p>

        </div>
      </div>
    </CustomerLayout>
  );
}
