import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Scissors, Mail, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus('submitting');
    try {
      await axios.post('/api/auth/forgot-password', { email });
      setStatus('done');
    } catch (err: any) {
      setStatus('error');
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gold-600 rounded-2xl flex items-center justify-center mx-auto">
            <Scissors size={26} className="text-white" />
          </div>
          <h1 className="text-cream-100 font-bold text-2xl">Forgot Password</h1>
          <p className="text-dark-400 text-sm">We'll email you a link to reset it</p>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-8 space-y-5">
          {status === 'done' ? (
            <div className="text-center space-y-3 py-2">
              <CheckCircle size={32} className="text-green-500 mx-auto" />
              <p className="text-cream-100 text-sm font-medium">Check your email</p>
              <p className="text-dark-400 text-xs leading-relaxed">
                If an account exists for <strong className="text-dark-300">{email}</strong>, we've sent a link to reset your password.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-dark-300 text-sm font-medium">
                  <Mail size={13} /> Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@loomcraft.demo"
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-3 text-cream-100 placeholder-dark-500 focus:outline-none focus:border-gold-600 transition-colors text-sm"
                />
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
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
                ) : 'Send Reset Link'}
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
