import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { CustomerAuthProvider } from './contexts/CustomerAuthContext';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AIAssistant from './pages/AIAssistant';
import Catalog from './pages/Catalog';
import QuoteBuilder from './pages/QuoteBuilder';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import CustomerPortal from './pages/CustomerPortal';
import CustomerHome from './pages/CustomerHome';
import CustomerCatalog from './pages/CustomerCatalog';
import CustomerRugDetail from './pages/CustomerRugDetail';
import CustomerCheckout from './pages/CustomerCheckout';
import CustomerOrderConfirm from './pages/CustomerOrderConfirm';
import CustomerMyOrders from './pages/CustomerMyOrders';
import CustomerLogin from './pages/CustomerLogin';
import CustomerMyQuotes from './pages/CustomerMyQuotes';
import RugDetail from './pages/RugDetail';
import BillingSettings from './pages/BillingSettings';
import BusinessSettings from './pages/BusinessSettings';
import Pricing from './pages/Pricing';
import Quotes from './pages/Quotes';

function App() {
  return (
    <AuthProvider>
      <CustomerAuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Customer shop — root paths */}
          <Route path="/" element={<CustomerHome />} />
          <Route path="/catalog" element={<CustomerCatalog />} />
          <Route path="/catalog/:id" element={<CustomerRugDetail />} />
          <Route path="/checkout" element={<CustomerCheckout />} />
          <Route path="/order/:id" element={<CustomerOrderConfirm />} />
          <Route path="/my-orders" element={<CustomerMyOrders />} />
          <Route path="/my-quotes" element={<CustomerMyQuotes />} />
          <Route path="/login" element={<CustomerLogin />} />
          <Route path="/visualizer" element={<CustomerPortal />} />

          {/* Admin login + pricing (public) */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/pricing" element={<Pricing />} />

          {/* Protected admin routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route index element={<Dashboard />} />
                    <Route path="assistant" element={<AIAssistant />} />
                    <Route path="catalog" element={<Catalog />} />
                    <Route path="catalog/:id" element={<RugDetail />} />
                    <Route path="quote-builder" element={<QuoteBuilder />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="quotes" element={<Quotes />} />
                    <Route path="billing" element={<BillingSettings />} />
                    <Route path="settings" element={<BusinessSettings />} />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </CustomerAuthProvider>
    </AuthProvider>
  );
}

export default App;
