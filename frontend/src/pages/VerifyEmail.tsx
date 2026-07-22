import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import CustomerLayout from '../components/CustomerLayout';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { verifyCustomerEmail } = useCustomerAuth();
  const navigate = useNavigate();
  const ranRef = useRef(false);

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setError('Missing verification token.');
      return;
    }

    verifyCustomerEmail(token)
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate('/my-quotes'), 1500);
      })
      .catch((err: any) => {
        setStatus('error');
        setError(err.response?.data?.detail || 'This verification link is invalid or has expired.');
      });
  }, [searchParams, verifyCustomerEmail, navigate]);

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-md mx-auto text-center">
          {status === 'verifying' && (
            <>
              <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto mb-6" />
              <p className="text-stone-500 text-sm">Verifying your email…</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle size={40} className="text-green-600 mx-auto mb-6" />
              <h1 className="font-serif text-3xl font-light text-stone-900 mb-3">Email verified</h1>
              <p className="text-stone-500 text-sm">Redirecting you to your account…</p>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertTriangle size={40} className="text-red-500 mx-auto mb-6" />
              <h1 className="font-serif text-3xl font-light text-stone-900 mb-3">Verification failed</h1>
              <p className="text-stone-500 text-sm leading-relaxed mb-6">{error}</p>
              <Link
                to="/login"
                className="text-stone-700 hover:text-stone-900 text-xs font-medium tracking-widest uppercase border-b border-stone-300 pb-0.5 transition-colors"
              >
                Back to Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
