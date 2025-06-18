import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import { AuthPage } from "./pages/AuthPage";
import { Dashboard } from "./pages/Dashboard";
import { ProductsPage } from "./pages/ProductsPage";
import { AddProductPage } from "./pages/AddProductPage";
import { EditProductPage } from "./pages/EditProductPage";
import { ScannerPage } from "./pages/ScannerPage";
import { EnhancedScannerPage } from "./pages/EnhancedScannerPage";
import { SalesPage } from "./pages/SalesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UsersPage } from "./pages/UsersPage";
import { CustomersPage } from "./pages/CustomersPage";
import { DiscountsPage } from "./pages/DiscountsPage";
import { ReceiptViewPage } from "./pages/ReceiptViewPage";
import { BusinessIntelligencePage } from "./pages/BusinessIntelligencePage";
import { CreditManagementPage } from "./pages/CreditManagementPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { WhatsAppPage } from "./pages/WhatsAppPage";
import { ARScannerPage } from "./pages/ARScannerPage";
import { SocialCommercePage } from "./pages/SocialCommercePage";
import { VoicePOSPage } from "./pages/VoicePOSPage";
import { CustomerLoyaltyPage } from "./pages/CustomerLoyaltyPage";
import { PaymentGatewayPage } from "./pages/PaymentGatewayPage";
import { InventoryAutomationPage } from "./pages/InventoryAutomationPage";
import { PWAInstallerPage } from "./pages/PWAInstallerPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { MobileLayout } from "./components/MobileLayout";
import { NotificationSettingsPage } from '@/pages/NotificationSettingsPage';
import { ThemeProvider } from 'next-themes';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { MicroLoanPage } from "./pages/MicroLoanPage";

const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
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
                  <Route path="/products/add" element={
                    <ProtectedRoute>
                      <MobileLayout>
                        <AddProductPage />
                      </MobileLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/products/edit/:id" element={
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
                  <Route path="/ar-scanner" element={
                    <ProtectedRoute>
                      <MobileLayout>
                        <ARScannerPage />
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
                  <Route path="/business-intelligence" element={
                    <ProtectedRoute>
                      <MobileLayout>
                        <BusinessIntelligencePage />
                      </MobileLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/credit-management" element={
                    <ProtectedRoute>
                      <MobileLayout>
                        <CreditManagementPage />
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
                  <Route path="/marketplace" element={
                    <ProtectedRoute>
                      <MobileLayout>
                        <MarketplacePage />
                      </MobileLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/whatsapp" element={
                    <ProtectedRoute>
                      <MobileLayout>
                        <WhatsAppPage />
                      </MobileLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/social-commerce" element={
                    <ProtectedRoute>
                      <MobileLayout>
                        <SocialCommercePage />
                      </MobileLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/voice-pos" element={
                    <ProtectedRoute>
                      <MobileLayout>
                        <VoicePOSPage />
                      </MobileLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/customer-loyalty" element={
                    <ProtectedRoute>
                      <MobileLayout>
                        <CustomerLoyaltyPage />
                      </MobileLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/payment-gateway" element={
                    <ProtectedRoute>
                      <MobileLayout>
                        <PaymentGatewayPage />
                      </MobileLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/inventory-automation" element={
                    <ProtectedRoute>
                      <MobileLayout>
                        <InventoryAutomationPage />
                      </MobileLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/mobile-app" element={
                    <ProtectedRoute>
                      <MobileLayout>
                        <PWAInstallerPage />
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
                    <ProtectedRoute>
                      <MobileLayout>
                        <UsersPage />
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
                  <Route path="/notifications" element={<ProtectedRoute><NotificationSettingsPage /></ProtectedRoute>} />
                </Routes>
                <Toaster />
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
