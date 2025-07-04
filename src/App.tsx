
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MobileLayout } from '@/components/MobileLayout';
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

const queryClient = new QueryClient();

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
                  <MobileLayout>
                    <Dashboard />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/products" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <ProductsPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/products/add" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <AddProductPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/scanner" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <ScannerPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/sales" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <SalesPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/customers" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <CustomersPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/discounts" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <DiscountsPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/reports" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <ReportsPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <SettingsPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/users" element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <MobileLayout>
                    <UsersPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              
              {/* AI and Business Intelligence */}
              <Route path="/business-intelligence" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <BusinessIntelligencePage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              <Route path="/ai-advisor" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <AIAdvisorPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              
              {/* Credit Management and Marketplace */}
              <Route path="/credit-management" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <CreditManagementPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              <Route path="/marketplace" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <MarketplacePage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              <Route path="/micro-loans" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <MicroLoanPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              
              {/* Voice POS */}
              <Route path="/voice-pos" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <VoicePOSPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              
              {/* Super Admin */}
              <Route path="/super-admin" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <MobileLayout>
                    <SuperAdminPage />
                  </MobileLayout>
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
