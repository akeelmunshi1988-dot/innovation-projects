import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { CustomerAuthProvider } from './contexts/CustomerAuthContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { CartProvider } from './contexts/CartContext';

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
import AboutUs from './pages/AboutUs';
import CustomerCatalog from './pages/CustomerCatalog';
import CustomerRugDetail from './pages/CustomerRugDetail';
import CustomerCheckout from './pages/CustomerCheckout';
import CustomerCart from './pages/CustomerCart';
import CustomerCustomRugRequest from './pages/CustomerCustomRugRequest';
import CustomerOrderConfirm from './pages/CustomerOrderConfirm';
import CustomerMyOrders from './pages/CustomerMyOrders';
import CustomerLogin from './pages/CustomerLogin';
import CustomerOAuthCallback from './pages/CustomerOAuthCallback';
import VerifyEmail from './pages/VerifyEmail';
import CustomerMyQuotes from './pages/CustomerMyQuotes';
import RugDetail from './pages/RugDetail';
import BillingSettings from './pages/BillingSettings';
import BusinessSettings from './pages/BusinessSettings';
import Pricing from './pages/Pricing';
import Quotes from './pages/Quotes';
import ShowcaseVideos from './pages/ShowcaseVideos';
import WorkshopPhotos from './pages/WorkshopPhotos';
import Testimonials from './pages/Testimonials';
import ProjectGallery from './pages/ProjectGallery';
import NewsletterSubscribers from './pages/NewsletterSubscribers';
import PromoCodes from './pages/PromoCodes';
import { FEATURE_FLAGS } from './config/featureFlags';

function App() {
  return (
    <AuthProvider>
      <CustomerAuthProvider>
      <CurrencyProvider>
      <CartProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Customer shop — root paths */}
          <Route path="/" element={<CustomerHome />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/catalog" element={<CustomerCatalog />} />
          <Route path="/catalog/:id" element={<CustomerRugDetail />} />
          <Route path="/cart" element={<CustomerCart />} />
          <Route path="/custom-rug-request" element={<CustomerCustomRugRequest />} />
          <Route path="/checkout" element={<CustomerCheckout />} />
          <Route path="/order/:id" element={<CustomerOrderConfirm />} />
          <Route path="/my-orders" element={<CustomerMyOrders />} />
          <Route path="/my-quotes" element={<CustomerMyQuotes />} />
          <Route path="/login" element={<CustomerLogin />} />
          <Route path="/oauth-callback" element={<CustomerOAuthCallback />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
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
                    <Route path="showcase-videos" element={<ShowcaseVideos />} />
                    <Route path="workshop-photos" element={<WorkshopPhotos />} />
                    <Route path="testimonials" element={<Testimonials />} />
                    <Route path="project-gallery" element={<ProjectGallery />} />
                    <Route path="newsletter-subscribers" element={<NewsletterSubscribers />} />
                    <Route path="quote-builder" element={<QuoteBuilder />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="quotes" element={<Quotes />} />
                    <Route path="promo-codes" element={<PromoCodes />} />
                    {FEATURE_FLAGS.SHOW_BILLING && <Route path="billing" element={<BillingSettings />} />}
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
      </CartProvider>
      </CurrencyProvider>
      </CustomerAuthProvider>
    </AuthProvider>
  );
}

export default App;
