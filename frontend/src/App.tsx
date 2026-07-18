import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CustomerAuthProvider } from './contexts/CustomerAuthContext';
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
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/shop" element={<CustomerHome />} />
          <Route path="/shop/catalog" element={<CustomerCatalog />} />
          <Route path="/shop/catalog/:id" element={<CustomerRugDetail />} />
          <Route path="/shop/checkout" element={<CustomerCheckout />} />
          <Route path="/shop/order/:id" element={<CustomerOrderConfirm />} />
          <Route path="/shop/my-orders" element={<CustomerMyOrders />} />
          <Route path="/shop/my-quotes" element={<CustomerMyQuotes />} />
          <Route path="/shop/login" element={<CustomerLogin />} />
          <Route path="/shop/visualizer" element={<CustomerPortal />} />

          {/* Protected admin routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/assistant" element={<AIAssistant />} />
                    <Route path="/catalog" element={<Catalog />} />
                    <Route path="/catalog/:id" element={<RugDetail />} />
                    <Route path="/quote-builder" element={<QuoteBuilder />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/quotes" element={<Quotes />} />
                    <Route path="/billing" element={<BillingSettings />} />
                    <Route path="/settings" element={<BusinessSettings />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      </CustomerAuthProvider>
    </AuthProvider>
  );
}

export default App;
