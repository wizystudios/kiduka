
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { NotificationSettingsPage } from '@/pages/NotificationSettingsPage';
import { CustomerReportsPage } from '@/pages/CustomerReportsPage';
import { ProductReportsPage } from '@/pages/ProductReportsPage';
import { Toaster } from '@/components/ui/toaster';

// Pages
import Index from '@/pages/Index';
import { AuthPage } from '@/pages/AuthPage';
import { EmailVerificationStatus } from '@/components/EmailVerificationStatus';
import { Dashboard } from '@/pages/Dashboard';
import { ProductsPage } from '@/pages/ProductsPage';
import { AddProductPage } from '@/pages/AddProductPage';
import { EditProductPage } from '@/pages/EditProductPage';
import { ScannerPage } from '@/pages/ScannerPage';
import { SalesPage } from '@/pages/SalesPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { DiscountsPage } from '@/pages/DiscountsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { UsersPage } from '@/pages/UsersPage';
import { SubscriptionPage } from '@/pages/SubscriptionPage';
import { SubscriptionGuard } from '@/components/SubscriptionGuard';
import { InventorySnapshotPage } from '@/pages/InventorySnapshotPage';
import { PWAInstallerPage } from '@/pages/PWAInstallerPage';

// AI and Business Intelligence Pages
import { BusinessIntelligencePage } from '@/pages/BusinessIntelligencePage';
import { AIAdvisorPage } from '@/pages/AIAdvisorPage';

// Credit and Marketplace Pages
import { CreditManagementPage } from '@/pages/CreditManagementPage';
import { MarketplacePage } from '@/pages/MarketplacePage';
import { MicroLoanPage } from '@/pages/MicroLoanPage';
import { QuickSalePage } from '@/pages/QuickSalePage';
import { MicroLoansManagementPage } from '@/pages/MicroLoansManagementPage';
import { ImportProductsPage } from '@/pages/ImportProductsPage';
import ProfitLossPage from '@/pages/ProfitLossPage';
import ExpensesPage from '@/pages/ExpensesPage';
import CalculatorPage from './pages/CalculatorPage';
import { InventoryAdjustmentPage } from './pages/InventoryAdjustmentPage';
import SalesAnalyticsPage from './pages/SalesAnalyticsPage';

// Voice POS Pages
import { VoicePOSPage } from '@/pages/VoicePOSPage';

// Super Admin Pages
import { SuperAdminPage } from '@/pages/SuperAdminPage';
import { WhatsAppPage } from '@/pages/WhatsAppPage';

// New Feature Pages
import SalesForecastingPage from '@/pages/SalesForecastingPage';
import { CustomerLoyaltyPage } from '@/pages/CustomerLoyaltyPage';
import { InventoryAutomationPage } from '@/pages/InventoryAutomationPage';
import { SokoniHomepage } from '@/components/SokoniHomepage';
import SokoniOrdersPage from '@/pages/SokoniOrdersPage';
import NotificationsPage from '@/pages/NotificationsPage';
import OrderTrackingPage from '@/pages/OrderTrackingPage';
import WishlistPage from '@/pages/WishlistPage';
import CustomerPaymentPage from '@/pages/CustomerPaymentPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000, // 15 minutes to reduce loading
      gcTime: 30 * 60 * 1000, // 30 minutes cache
      refetchOnWindowFocus: false,
      retry: false, // Disable automatic retries
      refetchOnMount: false, // Don't refetch on mount
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/verify-email" element={<EmailVerificationStatus />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <SubscriptionGuard>
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </SubscriptionGuard>
                </ProtectedRoute>
              } />
              
              <Route path="/products" element={
                <ProtectedRoute>
                  <SubscriptionGuard>
                    <AppLayout>
                      <ProductsPage />
                    </AppLayout>
                  </SubscriptionGuard>
                </ProtectedRoute>
              } />
              
              <Route path="/products/add" element={
                <ProtectedRoute>
                  <AppLayout>
                    <AddProductPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/products/edit/:id" element={
                <ProtectedRoute>
                  <AppLayout>
                    <EditProductPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/products/import" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ImportProductsPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/scanner" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ScannerPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/sales" element={
                <ProtectedRoute>
                  <AppLayout>
                    <SalesPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/customers" element={
                <ProtectedRoute>
                  <AppLayout>
                    <CustomersPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/discounts" element={
                <ProtectedRoute>
                  <AppLayout>
                    <DiscountsPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/inventory-snapshots" element={
                <ProtectedRoute>
                  <AppLayout>
                    <InventorySnapshotPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/pwa-install" element={
                <ProtectedRoute>
                  <AppLayout>
                    <PWAInstallerPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/reports" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ReportsPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/profit-loss" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProfitLossPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/expenses" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ExpensesPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/calculator" element={
                <ProtectedRoute>
                  <AppLayout>
                    <CalculatorPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute>
                  <AppLayout>
                    <SettingsPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/users" element={
                <ProtectedRoute>
                  <AppLayout>
                    <UsersPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <AppLayout>
                    <NotificationsPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/notification-settings" element={
                <ProtectedRoute>
                  <AppLayout>
                    <NotificationSettingsPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/customer-reports" element={
                <ProtectedRoute>
                  <AppLayout>
                    <CustomerReportsPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/product-reports" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProductReportsPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/calculator" element={
                <ProtectedRoute>
                  <AppLayout>
                    <CalculatorPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/expenses" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ExpensesPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/inventory-adjustment" element={
                <ProtectedRoute>
                  <AppLayout>
                    <InventoryAdjustmentPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/sales-analytics" element={
                <ProtectedRoute>
                  <AppLayout>
                    <SalesAnalyticsPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* AI and Business Intelligence */}
              <Route path="/business-intelligence" element={
                <ProtectedRoute>
                  <AppLayout>
                    <BusinessIntelligencePage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/ai-advisor" element={
                <ProtectedRoute>
                  <AppLayout>
                    <AIAdvisorPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Credit Management and Marketplace */}
              <Route path="/credit-management" element={
                <ProtectedRoute>
                  <AppLayout>
                    <CreditManagementPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/marketplace" element={
                <ProtectedRoute>
                  <AppLayout>
                    <MarketplacePage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/micro-loans" element={
                <ProtectedRoute>
                  <AppLayout>
                    <MicroLoansManagementPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/quick-sale" element={
                <ProtectedRoute>
                  <AppLayout>
                    <QuickSalePage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Voice POS */}
              <Route path="/voice-pos" element={
                <ProtectedRoute>
                  <AppLayout>
                    <VoicePOSPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Forecasting */}
              <Route path="/forecasting" element={
                <ProtectedRoute>
                  <AppLayout>
                    <SalesForecastingPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Customer Loyalty */}
              <Route path="/loyalty" element={
                <ProtectedRoute>
                  <AppLayout>
                    <CustomerLoyaltyPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Inventory Automation */}
              <Route path="/inventory-automation" element={
                <ProtectedRoute>
                  <AppLayout>
                    <InventoryAutomationPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Sokoni Marketplace - Public access for customers */}
              <Route path="/sokoni-home" element={<SokoniHomepage />} />
              
              {/* Wishlist Page - Public access */}
              <Route path="/sokoni/favorites" element={<WishlistPage />} />
              
              {/* Order Tracking - Public access */}
              <Route path="/track-order" element={<OrderTrackingPage />} />
              
              {/* Customer Payment - Public access */}
              <Route path="/customer-payment" element={<CustomerPaymentPage />} />
              {/* Sokoni Orders (seller dashboard) */}
              <Route path="/sokoni-orders" element={
                <ProtectedRoute>
                  <AppLayout>
                    <SokoniOrdersPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Super Admin */}
              <Route path="/super-admin" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AppLayout>
                    <SuperAdminPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Subscription */}
              <Route path="/subscription" element={
                <ProtectedRoute>
                  <SubscriptionPage />
                </ProtectedRoute>
              } />
              
              <Route path="/subscription-success" element={
                <ProtectedRoute>
                  <div className="min-h-screen flex items-center justify-center bg-green-50">
                    <div className="text-center p-8">
                      <div className="text-6xl mb-4">🎉</div>
                      <h1 className="text-3xl font-bold text-green-800 mb-4">Malipo Yamekamilika!</h1>
                      <p className="text-green-600 mb-6">Akaunti yako sasa ni hai. Karibu Kiduka POS!</p>
                      <button 
                        onClick={() => window.location.href = '/dashboard'}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700"
                      >
                        Enda Dashboard
                      </button>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster />
          </div>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}
