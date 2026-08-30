import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, MailCheck } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';

export default function CustomerForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('submitting');
    try {
      await axios.post('/api/auth/customer/forgot-password', { email });
      setStatus('done');
    } catch (err: any) {
      setStatus('error');
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    }
  };

  return (
    <CustomerLayout>
      <SEO title="Forgot Password" description="Reset your account password." noindex />
      <div className="w-[94vw] max-w-none mx-auto px-4 py-20">
        <div className="max-w-md mx-auto">
          {status === 'done' ? (
            <div className="text-center">
              <MailCheck size={40} className="text-stone-400 mx-auto mb-6" />
              <p className="storefront-eyebrow mb-2">Check your email</p>
              <h1 className="storefront-heading text-3xl mb-4">Reset link sent</h1>
              <p className="text-stone-500 text-sm leading-relaxed">
                If an account exists for <strong className="text-stone-700">{email}</strong>, we've sent a link to reset your password.
              </p>
              <Link
                to="/login"
                className="inline-block mt-8 text-stone-700 hover:text-stone-900 text-xs font-medium tracking-widest uppercase border-b border-stone-300 pb-0.5 transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-10">
                <p className="storefront-eyebrow mb-2">Account</p>
                <h1 className="storefront-heading text-4xl">Forgot Password</h1>
                <p className="text-stone-500 text-sm mt-3 leading-relaxed">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-3 text-red-600 text-xs">
                    <AlertTriangle size={13} className="flex-shrink-0" /> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full storefront-cta-solid py-4 transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  {status === 'submitting' ? (
                    <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Send Reset Link'}
                </button>
              </form>

              <p className="text-stone-400 text-xs mt-6">
                <Link to="/login" className="hover:text-stone-700 transition-colors border-b border-stone-200 pb-0.5">
                  ← Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
