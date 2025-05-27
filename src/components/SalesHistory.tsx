
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, Download, Eye, DollarSign } from "lucide-react";

export const SalesHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("today");

  const mockSales = [
    {
      id: "TXN001",
      date: "2024-01-15 14:32",
      items: [
        { name: "Wireless Earbuds", quantity: 1, price: 79.99 },
        { name: "USB Cable", quantity: 2, price: 12.99 }
      ],
      total: 105.97,
      status: "completed"
    },
    {
      id: "TXN002", 
      date: "2024-01-15 13:45",
      items: [
        { name: "Smartphone Case", quantity: 1, price: 24.99 }
      ],
      total: 24.99,
      status: "completed"
    },
    {
      id: "TXN003",
      date: "2024-01-15 12:18",
      items: [
        { name: "Bluetooth Speaker", quantity: 1, price: 129.99 },
        { name: "Wireless Earbuds", quantity: 1, price: 79.99 }
      ],
      total: 209.98,
      status: "completed"
    },
    {
      id: "TXN004",
      date: "2024-01-15 11:30",
      items: [
        { name: "USB Cable", quantity: 3, price: 12.99 }
      ],
      total: 38.97,
      status: "refunded"
    },
    {
      id: "TXN005",
      date: "2024-01-15 10:22",
      items: [
        { name: "Smartphone Case", quantity: 2, price: 24.99 },
        { name: "Wireless Earbuds", quantity: 1, price: 79.99 }
      ],
      total: 129.97,
      status: "completed"
    }
  ];

  const periodOptions = [
    { id: "today", label: "Today" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "all", label: "All Time" }
  ];

  const getSalesStats = () => {
    const completedSales = mockSales.filter(sale => sale.status === "completed");
    const totalRevenue = completedSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalTransactions = completedSales.length;
    const averageTicket = totalRevenue / totalTransactions || 0;

    return {
      totalRevenue: totalRevenue.toFixed(2),
      totalTransactions,
      averageTicket: averageTicket.toFixed(2),
      refunds: mockSales.filter(sale => sale.status === "refunded").length
    };
  };

  const filteredSales = mockSales.filter(sale =>
    sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.items.some(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const stats = getSalesStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "refunded":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sales History</h2>
          <p className="text-gray-600">Track your sales and transactions</p>
        </div>
        <Button variant="outline" className="flex items-center">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">${stats.totalRevenue}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalTransactions}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Average Ticket</p>
              <p className="text-2xl font-bold text-purple-600">${stats.averageTicket}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Refunds</p>
              <p className="text-2xl font-bold text-red-600">{stats.refunds}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by transaction ID or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex space-x-2">
          {periodOptions.map((period) => (
            <Button
              key={period.id}
              variant={selectedPeriod === period.id ? "default" : "outline"}
              onClick={() => setSelectedPeriod(period.id)}
              size="sm"
            >
              {period.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Sales List */}
      <div className="space-y-4">
        {filteredSales.map((sale) => (
          <Card key={sale.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">#{sale.id}</h3>
                    <Badge className={getStatusColor(sale.status)}>
                      {sale.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{sale.date}</p>
                  
                  <div className="space-y-1">
                    {sale.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-medium">${(item.quantity * item.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col lg:items-end gap-3">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">${sale.total.toFixed(2)}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSales.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No sales found</h3>
            <p className="text-gray-600">
              {searchTerm ? "Try adjusting your search terms" : "No sales recorded yet"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
