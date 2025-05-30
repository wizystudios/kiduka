
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { KidukaLogo } from "@/components/KidukaLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <KidukaLogo size="xl" showText={true} animate={true} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Kiduka
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your complete business management solution for inventory, sales, and customer management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-emerald-600">Inventory Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Track your products, stock levels, and get low stock alerts</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-blue-600">Point of Sale</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Fast barcode scanning and payment processing</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-purple-600">Reports & Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Detailed sales reports and business insights</p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button 
            onClick={() => navigate('/auth')}
            size="lg"
            className="bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 text-white px-8 py-3 text-lg"
          >
            Get Started with Kiduka
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
