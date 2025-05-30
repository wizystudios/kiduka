import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MobileLayout } from '@/components/MobileLayout';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Import pages
import Index from '@/pages/Index';
import { AuthPage } from '@/pages/AuthPage';
import { Dashboard } from '@/pages/Dashboard';
import { ProductsPage } from '@/pages/ProductsPage';
import { AddProductPage } from '@/pages/AddProductPage';
import { EditProductPage } from '@/pages/EditProductPage';
import { ScannerPage } from '@/pages/ScannerPage';
import { EnhancedScannerPage } from '@/pages/EnhancedScannerPage';
import { SalesPage } from '@/pages/SalesPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { EnhancedReportsPage } from '@/pages/EnhancedReportsPage';
import { AdvancedReportsPage } from '@/pages/AdvancedReportsPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { DiscountsPage } from '@/pages/DiscountsPage';
import { UsersPage } from '@/pages/UsersPage';
import { UsersManagementPage } from '@/pages/UsersManagementPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { EnhancedSettingsPage } from '@/pages/EnhancedSettingsPage';
import { ReceiptViewPage } from '@/pages/ReceiptViewPage';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/receipt/:transactionId" element={<ReceiptViewPage />} />
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
              <Route path="/add-product" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <AddProductPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              <Route path="/edit-product/:id" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <EditProductPage />
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
              <Route path="/enhanced-scanner" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <EnhancedScannerPage />
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
              <Route path="/reports" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <ReportsPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              <Route path="/enhanced-reports" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <EnhancedReportsPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              <Route path="/advanced-reports" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <AdvancedReportsPage />
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
              <Route path="/users" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <UsersPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              <Route path="/users-management" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <UsersManagementPage />
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
              <Route path="/enhanced-settings" element={
                <ProtectedRoute>
                  <MobileLayout>
                    <EnhancedSettingsPage />
                  </MobileLayout>
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </Router>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
