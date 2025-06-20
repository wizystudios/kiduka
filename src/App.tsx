
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MobileLayout } from '@/components/MobileLayout';
import { Toaster } from '@/components/ui/toaster';

// Auth Pages
import { AuthPage } from '@/pages/AuthPage';

// Main Pages
import { Dashboard } from '@/pages/Dashboard';
import { ProductsPage } from '@/pages/ProductsPage';
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
              <Route path="/auth" element={<AuthPage />} />
              
              {/* Protected Routes */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/products/*" element={<ProductsPage />} />
                      <Route path="/scanner" element={<ScannerPage />} />
                      <Route path="/sales" element={<SalesPage />} />
                      <Route path="/customers" element={<CustomersPage />} />
                      <Route path="/discounts" element={<DiscountsPage />} />
                      <Route path="/reports" element={<ReportsPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/users" element={
                        <ProtectedRoute allowedRoles={['owner']}>
                          <UsersPage />
                        </ProtectedRoute>
                      } />
                      
                      {/* AI and Business Intelligence */}
                      <Route path="/business-intelligence" element={<BusinessIntelligencePage />} />
                      <Route path="/ai-advisor" element={<AIAdvisorPage />} />
                      
                      {/* Credit Management and Marketplace */}
                      <Route path="/credit-management" element={<CreditManagementPage />} />
                      <Route path="/marketplace" element={<MarketplacePage />} />
                      <Route path="/micro-loans" element={<MicroLoanPage />} />
                      
                      {/* Voice POS */}
                      <Route path="/voice-pos" element={<VoicePOSPage />} />
                      
                      {/* Super Admin */}
                      <Route path="/super-admin" element={
                        <ProtectedRoute allowedRoles={['super_admin']}>
                          <SuperAdminPage />
                        </ProtectedRoute>
                      } />
                      
                      {/* Catch all route */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </MobileLayout>
                </ProtectedRoute>
              } />
            </Routes>
            <Toaster />
          </div>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
