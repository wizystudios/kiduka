
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
import { ProtectedRoute } from "./components/ProtectedRoute";
import { MobileLayout } from "./components/MobileLayout";

const queryClient = new QueryClient();

const App = () => (
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
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
