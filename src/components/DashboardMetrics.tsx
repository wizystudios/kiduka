
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Package, ShoppingCart, DollarSign, AlertTriangle } from "lucide-react";

export const DashboardMetrics = () => {
  const metrics = [
    {
      title: "Today's Sales",
      value: "$1,247",
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Total Products",
      value: "342",
      change: "+5 new",
      trend: "up",
      icon: Package,
      color: "text-blue-600"
    },
    {
      title: "Transactions",
      value: "89",
      change: "+23%",
      trend: "up",
      icon: ShoppingCart,
      color: "text-purple-600"
    },
    {
      title: "Low Stock Alert",
      value: "7",
      change: "Items",
      trend: "warning",
      icon: AlertTriangle,
      color: "text-orange-600"
    }
  ];

  const recentActivity = [
    { action: "Product Added", item: "Wireless Earbuds", time: "2 min ago", type: "success" },
    { action: "Sale Completed", item: "$45.99", time: "5 min ago", type: "info" },
    { action: "Stock Updated", item: "Smartphone Cases", time: "12 min ago", type: "warning" },
    { action: "New Barcode Scanned", item: "Gaming Mouse", time: "18 min ago", type: "info" }
  ];

  const lowStockItems = [
    { name: "iPhone Cases", current: 3, min: 10, percentage: 30 },
    { name: "Wireless Chargers", current: 5, min: 15, percentage: 33 },
    { name: "Screen Protectors", current: 8, min: 20, percentage: 40 },
    { name: "Bluetooth Speakers", current: 2, min: 8, percentage: 25 }
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="hover:shadow-lg transition-all duration-300 border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className={`h-3 w-3 mr-1 ${metric.color}`} />
                    <span className={`text-xs font-medium ${metric.color}`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-full bg-gray-50`}>
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <Card className="border border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-orange-700">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockItems.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      {item.current}/{item.min}
                    </Badge>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-gray-900">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'success' ? 'bg-green-500' :
                    activity.type === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-500">{activity.item}</p>
                  </div>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
