
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { Toaster } from '@/components/ui/toaster';

// Pages
import Index from '@/pages/Index';
import { AuthPage } from '@/pages/AuthPage';
import { EmailVerificationStatus } from '@/components/EmailVerificationStatus';
import { Dashboard } from '@/pages/Dashboard';
import { ProductsPage } from '@/pages/ProductsPage';
import { AddProductPage } from '@/pages/AddProductPage';
import { ScannerPage } from '@/pages/ScannerPage';
import { SalesPage } from '@/pages/SalesPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { DiscountsPage } from '@/pages/DiscountsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { UsersPage } from '@/pages/UsersPage';
import { SubscriptionPage } from '@/pages/SubscriptionPage';
import { SubscriptionGuard } from '@/components/SubscriptionGuard';

// AI and Business Intelligence Pages
import { BusinessIntelligencePage } from '@/pages/BusinessIntelligencePage';
import { AIAdvisorPage } from '@/pages/AIAdvisorPage';

// Credit and Marketplace Pages
import { CreditManagementPage } from '@/pages/CreditManagementPage';
import { MarketplacePage } from '@/pages/MarketplacePage';
import { MicroLoanPage } from '@/pages/MicroLoanPage';

// Super Admin Pages
import { SuperAdminPage } from '@/pages/SuperAdminPage';

// Voice POS Pages
import { VoicePOSPage } from '@/pages/VoicePOSPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
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
              
              <Route path="/reports" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ReportsPage />
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
                <ProtectedRoute allowedRoles={['owner']}>
                  <AppLayout>
                    <UsersPage />
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
                    <MicroLoanPage />
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

export default App;
