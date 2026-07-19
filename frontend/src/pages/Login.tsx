import { useState, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Scissors, Mail, Lock, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';

  const customerSession = localStorage.getItem('loomcraftrugs_customer_token');
  const customerUser = localStorage.getItem('loomcraftrugs_customer_user');
  const customerName = customerUser ? JSON.parse(customerUser)?.name : null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Incorrect email or password');
    }
  };

  // Block admin login if customer session is active
  if (customerSession) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-dark-900 border border-dark-700 rounded-2xl p-8 space-y-5 text-center">
          <div className="w-14 h-14 bg-amber-600/20 border border-amber-600/30 rounded-2xl flex items-center justify-center mx-auto">
            <LogOut size={24} className="text-amber-400" />
          </div>
          <h2 className="text-cream-100 font-bold text-xl">Active Customer Session</h2>
          <p className="text-dark-400 text-sm">
            You're logged in as a customer{customerName ? ` (${customerName})` : ''}. Sign out of the shop first before accessing the admin panel.
          </p>
          <Link
            to="/"
            className="block w-full bg-gold-600 hover:bg-gold-500 text-white font-medium py-3 rounded-xl transition-colors text-sm"
          >
            Go to Shop
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem('loomcraftrugs_customer_token');
              localStorage.removeItem('loomcraftrugs_customer_user');
              window.location.reload();
            }}
            className="block w-full text-dark-400 hover:text-cream-300 text-sm transition-colors"
          >
            Sign out of shop and continue to admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gold-600 rounded-2xl flex items-center justify-center mx-auto">
            <Scissors size={26} className="text-white" />
          </div>
          <h1 className="text-cream-100 font-bold text-2xl">LoomCraftRugs AI</h1>
          <p className="text-dark-400 text-sm">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-dark-900 border border-dark-700 rounded-2xl p-8 space-y-5">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-dark-300 text-sm font-medium">
              <Mail size={13} /> Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@loomcraftrugs.demo"
              className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-3 text-cream-100 placeholder-dark-500 focus:outline-none focus:border-gold-600 transition-colors text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-dark-300 text-sm font-medium">
              <Lock size={13} /> Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
            disabled={isLoading}
            className="w-full bg-gold-600 hover:bg-gold-500 disabled:bg-dark-700 disabled:text-dark-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
          >
            {isLoading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</>
            ) : 'Sign In'}
          </button>

          <p className="text-center text-dark-500 text-xs pt-1">
            Demo: admin@loomcraftrugs.demo / demo1234
          </p>
        </form>

        <p className="text-center text-dark-500 text-xs">
          Looking for the customer shop?{' '}
          <a href="/" className="text-gold-400 hover:underline">Open customer portal</a>
        </p>
      </div>
    </div>
  );
}
