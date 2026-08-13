import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import { refreshAccessToken } from '../services/authRefresh';

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Sign-in was cancelled.",
  missing_code: "Sign-in didn't complete. Please try again.",
  invalid_state: "This sign-in link expired. Please try again.",
  provider_error: "We couldn't reach the sign-in provider. Please try again.",
  no_email: "That account has no email address we can use — try a different sign-in method.",
  email_not_verified: "That provider hasn't verified your email address yet. Please verify it with them, or sign in with email and password instead.",
};

export default function CustomerOAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useCustomerAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errParam = params.get('error');
    const returnTo = params.get('return_to') || '/';

    if (errParam) {
      setError(ERROR_MESSAGES[errParam] ?? 'Something went wrong signing you in.');
      return;
    }
    // The backend never puts the access token in this URL (that would land in browser
    // history and server logs) — it only sets the httpOnly refresh cookie on the redirect
    // that brought us here. Exchange that cookie for an access token the same way silent
    // session resume does, then fetch the profile to finish logging in.
    refreshAccessToken()
      .then((token) => {
        if (!token) throw new Error('no token');
        return loginWithToken(token);
      })
      .then(() => navigate(returnTo, { replace: true }))
      .catch(() => setError('Something went wrong signing you in.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CustomerLayout>
      <div className="max-w-md mx-auto px-6 py-32 text-center space-y-4">
        {error ? (
          <>
            <AlertTriangle size={32} className="mx-auto text-red-400" />
            <p className="text-stone-600 text-sm">{error}</p>
            <Link to="/login" className="inline-block text-sm text-stone-500 hover:text-stone-900 transition-colors border-b border-stone-300 pb-0.5">
              ← Back to Sign In
            </Link>
          </>
        ) : (
          <>
            <div className="w-6 h-6 border border-stone-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-stone-400 text-sm">Signing you in…</p>
          </>
        )}
      </div>
    </CustomerLayout>
  );
}
