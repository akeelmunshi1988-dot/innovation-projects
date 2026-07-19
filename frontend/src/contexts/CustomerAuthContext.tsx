import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

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
  customerRegister: (name: string, email: string, password: string, phone?: string, company?: string) => Promise<CustomerUser>;
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

  const customerRegister = useCallback(async (name: string, email: string, password: string, phone?: string, company?: string): Promise<CustomerUser> => {
    setIsLoadingCustomer(true);
    try {
      const { data } = await axios.post('/api/auth/customer/register', { name, email, password, phone, company });
      const user: CustomerUser = { customer_id: data.customer_id, name: data.name, email: data.email };
      _persist(data.access_token, user);
      return user;
    } finally {
      setIsLoadingCustomer(false);
    }
  }, []);

  const customerLogout = useCallback(() => {
    localStorage.removeItem(CTOKEN_KEY);
    localStorage.removeItem(CUSER_KEY);
    setCustomerToken(null);
    setCustomer(null);
  }, []);

  // Keep a customer-specific axios instance header whenever token changes
  useEffect(() => {
    // We pass the token as a header manually in customer API calls (see api.ts)
    // This effect just keeps the stored token in sync
  }, [customerToken]);

  return (
    <CustomerAuthContext.Provider value={{
      customer,
      customerToken,
      isLoadingCustomer,
      customerLogin,
      customerRegister,
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
