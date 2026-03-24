import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { Toaster } from './components/ui/sonner';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { RegisterPage } from './pages/RegisterPage';
import { ShopPage } from './pages/ShopPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { DashboardPage } from './pages/DashboardPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { LocationsPage } from './pages/LocationsPage';
import { AccountPage } from './pages/AccountPage';
import { SettingsPage } from './pages/SettingsPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { ServicesPage } from './pages/ServicesPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { FaqPage } from './pages/FaqPage';
import { ScanHistoryPage } from './pages/ScanHistoryPage';
import { LeadsPage } from './pages/LeadsPage';
import { QRDetailPage } from './pages/QRDetailPage';
import { QRCustomizePage } from './pages/QRCustomizePage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminQRProfilesPage } from './pages/AdminQRProfilesPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminLeadsPage } from './pages/AdminLeadsPage';
import { AdminProfileEditorPage } from './pages/AdminProfileEditorPage';
import { AdminAnalyticsPage } from './pages/AdminAnalyticsPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { AdminStorePage } from './pages/AdminStorePage';
import { AdminTrashPage } from './pages/AdminTrashPage';
import { Layout } from './components/Layout';
import { useCart } from './contexts/CartContext';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/statistics" element={<StatisticsPage />} />
              <Route path="/locations" element={<LocationsPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/scan-history" element={<ScanHistoryPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/qr/:profileId" element={<QRDetailPage />} />
              <Route path="/qr/:profileId/customize" element={<QRCustomizePage />} />
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/qr-profiles" element={<AdminQRProfilesPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/leads" element={<AdminLeadsPage />} />
              <Route path="/admin/profile-editor" element={<AdminProfileEditorPage />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
              <Route path="/admin/store" element={<AdminStorePage />} />
              <Route path="/admin/trash" element={<AdminTrashPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              {/* Public */}
              <Route path="/profile/:hash" element={<PublicProfilePage />} />
              <Route path="/payment-success" element={<PaymentSuccessPage />} />
              <Route path="/payment-failure" element={<PaymentFailurePage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/faq" element={<FaqPage />} />
            </Routes>
            <Toaster position="top-right" />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
    const timeoutId = window.setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 2200);
    return () => window.clearTimeout(timeoutId);
  }, [clearCart, navigate]);

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2">Pago Exitoso!</h1>
          <p className="text-muted-foreground mb-2">Tu orden ha sido procesada correctamente</p>
          <p className="text-sm text-muted-foreground mb-6">Te estamos redirigiendo al dashboard…</p>
          <a href="/dashboard" className="text-primary hover:underline">Ir al Dashboard ahora</a>
        </div>
      </div>
    </Layout>
  );
};

const PaymentFailurePage = () => (
  <Layout>
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-2">Pago Fallido</h1>
        <p className="text-muted-foreground mb-6">Hubo un problema con tu pago</p>
        <a href="/shop" className="text-primary hover:underline">Volver a la Tienda</a>
      </div>
    </div>
  </Layout>
);

export default App;
