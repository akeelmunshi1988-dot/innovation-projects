import { useState, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import { PASSWORD_POLICY_HINT, passwordPolicyError } from '../utils/passwordPolicy';

export default function CustomerResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setStatus('error');
      setError('Missing reset token — please use the link from your email.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    const policyError = passwordPolicyError(password);
    if (policyError) {
      setError(policyError);
      return;
    }
    setStatus('submitting');
    try {
      await axios.post('/api/auth/customer/reset-password', { token, new_password: password });
      setStatus('done');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setStatus('error');
      setError(err.response?.data?.detail || 'This reset link is invalid or has expired.');
    }
  };

  return (
    <CustomerLayout>
      <SEO title="Reset Password" description="Choose a new account password." noindex />
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-md mx-auto">
          {status === 'done' ? (
            <div className="text-center">
              <CheckCircle size={40} className="text-green-600 mx-auto mb-6" />
              <h1 className="font-serif text-3xl font-light text-stone-900 mb-3">Password updated</h1>
              <p className="text-stone-500 text-sm">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <div className="mb-10">
                <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Account</p>
                <h1 className="font-serif text-4xl font-light text-stone-900">Reset Password</h1>
                <p className="text-stone-500 text-sm mt-3 leading-relaxed">
                  Choose a new password for your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">New Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 pr-10 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="text-stone-400 text-xs mt-1.5">{PASSWORD_POLICY_HINT}</p>
                </div>

                <div>
                  <label className="text-stone-600 text-xs font-medium block mb-1.5 uppercase tracking-wider">Confirm Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2.5 pr-10 text-stone-900 placeholder-stone-300 text-sm focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-3 text-red-600 text-xs">
                    <AlertTriangle size={13} className="flex-shrink-0" /> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-medium tracking-widest uppercase py-4 transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  {status === 'submitting' ? (
                    <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Update Password'}
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
