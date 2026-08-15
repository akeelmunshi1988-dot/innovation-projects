import { useState, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Scissors, Lock, AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { PASSWORD_POLICY_HINT, passwordPolicyError } from '../utils/passwordPolicy';

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
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
      await axios.post('/api/auth/reset-password', { token, new_password: password });
      setStatus('done');
      setTimeout(() => navigate('/admin/login'), 2000);
    } catch (err: any) {
      setStatus('error');
      setError(err.response?.data?.detail || 'This reset link is invalid or has expired.');
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gold-600 rounded-2xl flex items-center justify-center mx-auto">
            <Scissors size={26} className="text-white" />
          </div>
          <h1 className="text-cream-100 font-bold text-2xl">Reset Password</h1>
          <p className="text-dark-400 text-sm">Choose a new password below</p>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-8 space-y-5">
          {status === 'done' ? (
            <div className="text-center space-y-3 py-2">
              <CheckCircle size={32} className="text-green-500 mx-auto" />
              <p className="text-cream-100 text-sm font-medium">Password updated</p>
              <p className="text-dark-400 text-xs">Redirecting you to sign in…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-dark-300 text-sm font-medium">
                  <Lock size={13} /> New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-3 pr-10 text-cream-100 placeholder-dark-500 focus:outline-none focus:border-gold-600 transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-dark-500 text-xs">{PASSWORD_POLICY_HINT}</p>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-dark-300 text-sm font-medium">
                  <Lock size={13} /> Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-3 pr-10 text-cream-100 placeholder-dark-500 focus:outline-none focus:border-gold-600 transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-gold-600 hover:bg-gold-500 disabled:bg-dark-700 disabled:text-dark-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {status === 'submitting' ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating…</>
                ) : 'Update Password'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-dark-500 text-xs">
          <Link to="/admin/login" className="text-gold-400 hover:underline">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
