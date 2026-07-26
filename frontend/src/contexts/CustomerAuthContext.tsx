import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { refreshAccessToken } from '../services/authRefresh';

export interface CustomerUser {
  customer_id: number;
  name: string;
  email: string;
}

interface CustomerAuthContextValue {
  customer: CustomerUser | null;
  customerToken: string | null;
  isLoadingCustomer: boolean;
  customerLogin: (email: string, password: string) => Promise<CustomerUser>;
  customerRegister: (name: string, email: string, password: string, phone?: string, company?: string) => Promise<{ message: string; email: string }>;
  verifyCustomerEmail: (token: string) => Promise<CustomerUser>;
  customerLogout: () => void;
  isCustomerAuthenticated: boolean;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

const CTOKEN_KEY = 'loomcraftrugs_customer_token';
const CUSER_KEY = 'loomcraftrugs_customer_user';

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [customerToken, setCustomerToken] = useState<string | null>(() => localStorage.getItem(CTOKEN_KEY));
  const [customer, setCustomer] = useState<CustomerUser | null>(() => {
    const stored = localStorage.getItem(CUSER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);

  const _persist = (token: string, user: CustomerUser) => {
    // Clear any active admin session — one session at a time
    localStorage.removeItem('loomcraftrugs_token');
    localStorage.removeItem('loomcraftrugs_user');
    localStorage.setItem(CTOKEN_KEY, token);
    localStorage.setItem(CUSER_KEY, JSON.stringify(user));
    setCustomerToken(token);
    setCustomer(user);
  };

  const customerLogin = useCallback(async (email: string, password: string): Promise<CustomerUser> => {
    setIsLoadingCustomer(true);
    try {
      const { data } = await axios.post('/api/auth/customer/login', { email, password });
      const user: CustomerUser = { customer_id: data.customer_id, name: data.name, email: data.email };
      _persist(data.access_token, user);
      return user;
    } finally {
      setIsLoadingCustomer(false);
    }
  }, []);

  const customerRegister = useCallback(async (name: string, email: string, password: string, phone?: string, company?: string): Promise<{ message: string; email: string }> => {
    setIsLoadingCustomer(true);
    try {
      const { data } = await axios.post('/api/auth/customer/register', { name, email, password, phone, company });
      return { message: data.message, email: data.email };
    } finally {
      setIsLoadingCustomer(false);
    }
  }, []);

  const verifyCustomerEmail = useCallback(async (token: string): Promise<CustomerUser> => {
    setIsLoadingCustomer(true);
    try {
      const { data } = await axios.post('/api/auth/customer/verify-email', { token });
      const user: CustomerUser = { customer_id: data.customer_id, name: data.name, email: data.email };
      _persist(data.access_token, user);
      return user;
    } finally {
      setIsLoadingCustomer(false);
    }
  }, []);

  const customerLogout = useCallback(() => {
    axios.post('/api/auth/logout').catch(() => {});
    localStorage.removeItem(CTOKEN_KEY);
    localStorage.removeItem(CUSER_KEY);
    setCustomerToken(null);
    setCustomer(null);
  }, []);

  // On first load with no customer token, try a silent refresh — a valid
  // refresh_token cookie means the session can resume without forcing login.
  // Skipped if a staff session is active (refresh_token cookie is shared
  // per-browser; the /auth/refresh response tells us which kind it is via
  // whichever token type was rotated, so only apply it if no admin token exists).
  useEffect(() => {
    if (customerToken || customer || localStorage.getItem('loomcraftrugs_token')) return;
    let cancelled = false;
    (async () => {
      const newToken = await refreshAccessToken();
      if (!newToken || cancelled) return;
      try {
        const { data } = await axios.get('/api/auth/customer/me', { headers: { Authorization: `Bearer ${newToken}` } });
        if (cancelled) return;
        _persist(newToken, { customer_id: data.customer_id, name: data.name, email: data.email });
      } catch {
        // Refreshed token wasn't a customer session (or /customer/me failed) — leave logged out
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CustomerAuthContext.Provider value={{
      customer,
      customerToken,
      isLoadingCustomer,
      customerLogin,
      customerRegister,
      verifyCustomerEmail,
      customerLogout,
      isCustomerAuthenticated: !!customerToken && !!customer,
    }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used inside CustomerAuthProvider');
  return ctx;
}
