import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
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

// Storefront home is kept as an eager, non-lazy import — it's the highest-traffic
// and most SEO-critical route, so it should never show a Suspense loading flash.
import CustomerHome from './pages/CustomerHome';

// Everything else is route-split so a customer's first load doesn't pull in the
// entire admin dashboard bundle (and vice versa) — shrinks initial JS materially,
// which is a direct Core Web Vitals (LCP/INP) win.
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const Catalog = lazy(() => import('./pages/Catalog'));
const QuoteBuilder = lazy(() => import('./pages/QuoteBuilder'));
const Orders = lazy(() => import('./pages/Orders'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerPortal = lazy(() => import('./pages/CustomerPortal'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const CustomerCatalog = lazy(() => import('./pages/CustomerCatalog'));
const CustomerRugDetail = lazy(() => import('./pages/CustomerRugDetail'));
const CustomerProjectGallery = lazy(() => import('./pages/CustomerProjectGallery'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const CustomerCheckout = lazy(() => import('./pages/CustomerCheckout'));
const CustomerCart = lazy(() => import('./pages/CustomerCart'));
const CustomerCustomRugRequest = lazy(() => import('./pages/CustomerCustomRugRequest'));
const CustomerOrderConfirm = lazy(() => import('./pages/CustomerOrderConfirm'));
const CustomerMyOrders = lazy(() => import('./pages/CustomerMyOrders'));
const CustomerLogin = lazy(() => import('./pages/CustomerLogin'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const CustomerForgotPassword = lazy(() => import('./pages/CustomerForgotPassword'));
const CustomerResetPassword = lazy(() => import('./pages/CustomerResetPassword'));
const CustomerOAuthCallback = lazy(() => import('./pages/CustomerOAuthCallback'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const CustomerMyQuotes = lazy(() => import('./pages/CustomerMyQuotes'));
const RugDetail = lazy(() => import('./pages/RugDetail'));
const BillingSettings = lazy(() => import('./pages/BillingSettings'));
const BusinessSettings = lazy(() => import('./pages/BusinessSettings'));
const FAQs = lazy(() => import('./pages/FAQs'));
const RefundCancellationPolicy = lazy(() => import('./pages/RefundCancellationPolicy'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Quotes = lazy(() => import('./pages/Quotes'));
const ShowcaseVideos = lazy(() => import('./pages/ShowcaseVideos'));
const WorkshopPhotos = lazy(() => import('./pages/WorkshopPhotos'));
const Testimonials = lazy(() => import('./pages/Testimonials'));
const AnnouncementBar = lazy(() => import('./pages/AnnouncementBar'));
const ProjectGallery = lazy(() => import('./pages/ProjectGallery'));
const NewsletterSubscribers = lazy(() => import('./pages/NewsletterSubscribers'));
const PromoCodes = lazy(() => import('./pages/PromoCodes'));
const ApiAccess = lazy(() => import('./pages/ApiAccess'));
const NotFound = lazy(() => import('./pages/NotFound'));
import { FEATURE_FLAGS } from './config/featureFlags';

function RouteFallback() {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="w-6 h-6 border border-stone-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CustomerAuthProvider>
      <CurrencyProvider>
      <CartProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Customer shop — root paths */}
          <Route path="/" element={<CustomerHome />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/refund-cancellation-policy" element={<RefundCancellationPolicy />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/catalog" element={<CustomerCatalog />} />
          <Route path="/catalog/space/:value" element={<CustomerCatalog />} />
          <Route path="/catalog/mood/:value" element={<CustomerCatalog />} />
          <Route path="/catalog/material/:value" element={<CustomerCatalog />} />
          <Route path="/catalog/:slug" element={<CustomerRugDetail />} />
          <Route path="/project-gallery" element={<CustomerProjectGallery />} />
          <Route path="/project-gallery/:id" element={<ProjectDetail />} />
          <Route path="/cart" element={<CustomerCart />} />
          <Route path="/custom-rug-request" element={<CustomerCustomRugRequest />} />
          <Route path="/checkout" element={<CustomerCheckout />} />
          <Route path="/order/:id" element={<CustomerOrderConfirm />} />
          <Route path="/my-orders" element={<CustomerMyOrders />} />
          <Route path="/my-quotes" element={<CustomerMyQuotes />} />
          <Route path="/login" element={<CustomerLogin />} />
          <Route path="/forgot-password" element={<CustomerForgotPassword />} />
          <Route path="/reset-password/:token" element={<CustomerResetPassword />} />
          <Route path="/oauth-callback" element={<CustomerOAuthCallback />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          {/* Room Visualizer hidden for now — route intentionally disabled, page/component left intact for re-enabling later */}

          {/* Admin login + pricing (public) */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/reset-password/:token" element={<ResetPassword />} />
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
                    <Route path="announcement-bar" element={<AnnouncementBar />} />
                    <Route path="project-gallery" element={<ProjectGallery />} />
                    <Route path="newsletter-subscribers" element={<NewsletterSubscribers />} />
                    <Route path="quote-builder" element={<QuoteBuilder />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="quotes" element={<Quotes />} />
                    <Route path="promo-codes" element={<PromoCodes />} />
                    <Route path="api-access" element={<ApiAccess />} />
                    {FEATURE_FLAGS.SHOW_BILLING && <Route path="billing" element={<BillingSettings />} />}
                    <Route path="settings" element={<BusinessSettings />} />
                    <Route path="faqs" element={<FAQs />} />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
      </CartProvider>
      </CurrencyProvider>
      </CustomerAuthProvider>
    </AuthProvider>
  );
}

export default App;
