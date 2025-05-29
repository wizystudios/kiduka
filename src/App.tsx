import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MobileLayout } from "@/components/MobileLayout";
import { LoadingScreen } from "@/components/LoadingScreen";
import { OnboardingPages } from "@/components/OnboardingPages";
import { AuthPage } from "@/pages/AuthPage";
import { Dashboard } from "@/pages/Dashboard";
import { ProductsPage } from "@/pages/ProductsPage";
import { AddProductPage } from "@/pages/AddProductPage";
import { EditProductPage } from "@/pages/EditProductPage";
import { ScannerPage } from "@/pages/ScannerPage";
import { SalesPage } from "@/pages/SalesPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { EnhancedReportsPage } from "@/pages/EnhancedReportsPage";
import { UsersPage } from "@/pages/UsersPage";
import { CustomersPage } from "@/pages/CustomersPage";
import { DiscountsPage } from "@/pages/DiscountsPage";
import { EnhancedSettingsPage } from "@/pages/EnhancedSettingsPage";
import { syncService } from "@/utils/syncService";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showLoading, setShowLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding before
    const hasSeenOnboarding = localStorage.getItem('kiduka-onboarding-complete');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }

    // Setup sync service
    syncService.setupAutoSync();
  }, []);

  const handleLoadingComplete = () => {
    setShowLoading(false);
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('kiduka-onboarding-complete', 'true');
    setShowOnboarding(false);
  };

  // Show loading screen first
  if (showLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  // Show onboarding if user hasn't seen it
  if (showOnboarding) {
    return <OnboardingPages onComplete={handleOnboardingComplete} />;
  }

  // Main app
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AuthProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/" element={
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
                  <Route path="/reports/advanced" element={
                    <ProtectedRoute>
                      <MobileLayout>
                        <EnhancedReportsPage />
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
                    <ProtectedRoute requiredRole="owner">
                      <MobileLayout>
                        <UsersPage />
                      </MobileLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <MobileLayout>
                        <EnhancedSettingsPage />
                      </MobileLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </AuthProvider>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
