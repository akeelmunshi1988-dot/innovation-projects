import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export interface TenantInfo {
  id: number;
  name: string;
  slug: string;
  gstin: string | null;
  state_code: string | null;
  address: string | null;
  lut_number: string | null;
  currency: string;
  base_currency: string;
  exchange_rates: Record<string, number>;
  logo_url: string | null;
  plan: string;
  plan_status: string;
  ai_credits_used: number;
  default_profit_margin_pct: number;
  rush_surcharge_pct: number;
  large_format_threshold_sqm: number;
  large_format_surcharge_pct: number;
  ai_assistant_customer_enabled: boolean;
  ai_assistant_vendor_enabled: boolean;
  vendor_notification_email: string | null;
  default_size_unit: string;
}

export interface AuthUser {
  user_id: number;
  full_name: string | null;
  email: string;
  role: string;
  tenant: TenantInfo;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateTenant: (updated: Partial<TenantInfo>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'loomcraftrugs_token';
const USER_KEY = 'loomcraftrugs_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login', { email, password });
      const { access_token, ...userInfo } = data;
      // Clear any active customer session — one session at a time
      localStorage.removeItem('loomcraftrugs_customer_token');
      localStorage.removeItem('loomcraftrugs_customer_user');
      localStorage.setItem(TOKEN_KEY, access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
      setToken(access_token);
      setUser(userInfo);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateTenant = useCallback((updated: Partial<TenantInfo>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, tenant: { ...prev.tenant, ...updated } };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Attach/detach the auth header globally whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateTenant, isAuthenticated: !!token && !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
