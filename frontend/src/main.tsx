import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import { refreshAccessToken } from './services/authRefresh'

// The refresh_token cookie (httpOnly, set by the backend on login) has to ride
// along on every request for silent session refresh to work.
axios.defaults.withCredentials = true

// A handful of admin pages (Catalog, ShowcaseVideos, WorkshopPhotos,
// BusinessSettings, BillingSettings) call the plain axios instance directly
// rather than the wrapped client in services/api.ts, so they don't pick up
// that client's own 401-refresh-retry interceptor. Access tokens are now
// short-lived (30 min, down from 7 days), so without this, any of those
// pages would start failing partway through a normal admin session. This
// covers them (and customer pages, which attach their token per-request
// rather than via a default header — overwriting error.config.headers
// handles both cases the same way).
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original?._retried) {
      return Promise.reject(error);
    }
    original._retried = true;
    const newToken = await refreshAccessToken();
    if (!newToken) {
      return Promise.reject(error);
    }
    original.headers = original.headers ?? {};
    original.headers['Authorization'] = `Bearer ${newToken}`;
    if (localStorage.getItem('loomcraftrugs_token')) {
      localStorage.setItem('loomcraftrugs_token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } else if (localStorage.getItem('loomcraftrugs_customer_token')) {
      localStorage.setItem('loomcraftrugs_customer_token', newToken);
    }
    return axios(original);
  }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
)
