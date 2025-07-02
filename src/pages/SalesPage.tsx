
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Search, Download, Eye, DollarSign, Receipt, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Sale {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  customer_id?: string;
  discount_amount?: number;
  tax_amount?: number;
  sale_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product_id: string;
    products: {
      name: string;
      category?: string;
    };
  }>;
  customers?: {
    name: string;
    phone?: string;
    email?: string;
  };
}

export const SalesPage = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();

  const fetchSales = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('sales')
        .select(`
          id,
          total_amount,
          payment_method,
          created_at,
          customer_id,
          discount_amount,
          tax_amount,
          sale_items (
            id,
            quantity,
            unit_price,
            total_price,
            product_id,
            products (
              name,
              category
            )
          ),
          customers (
            name,
            phone,
            email
          )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      // Filter by period
      const now = new Date();
      if (selectedPeriod === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query = query.gte('created_at', startOfDay.toISOString());
      } else if (selectedPeriod === 'week') {
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', startOfWeek.toISOString());
      } else if (selectedPeriod === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        query = query.gte('created_at', startOfMonth.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching sales:', error);
        toast.error('Imeshindwa kupakia historia ya mauzo');
        setSales([]);
      } else {
        console.log('Sales loaded successfully:', data?.length || 0);
        setSales(data || []);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast.error('Kosa la kutarajwa');
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedPeriod]);

  useEffect(() => {
    if (user?.id) {
      fetchSales();
    }
  }, [fetchSales]);

  const periodOptions = [
    { id: 'today', label: 'Leo' },
    { id: 'week', label: 'Wiki Hii' },
    { id: 'month', label: 'Mwezi Huu' },
    { id: 'all', label: 'Yote' }
  ];

  const getSalesStats = useMemo(() => {
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
    const totalTransactions = sales.length;
    const averageTicket = totalRevenue / totalTransactions || 0;

    return {
      totalRevenue: totalRevenue.toFixed(2),
      totalTransactions,
      averageTicket: averageTicket.toFixed(2)
    };
  }, [sales]);

  const filteredSales = useMemo(() => {
    if (!searchTerm.trim()) return sales;
    
    const searchLower = searchTerm.toLowerCase();
    return sales.filter(sale =>
      sale.id.toLowerCase().includes(searchLower) ||
      sale.customers?.name?.toLowerCase().includes(searchLower) ||
      sale.sale_items.some(item => 
        item.products.name.toLowerCase().includes(searchLower)
      )
    );
  }, [sales, searchTerm]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString('sw-TZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setDialogOpen(true);
  };

  const handleExportSales = () => {
    try {
      const exportData = filteredSales.map(sale => ({
        id: sale.id,
        total_amount: sale.total_amount,
        payment_method: sale.payment_method,
        created_at: sale.created_at,
        customer: sale.customers?.name || 'Hakuna',
        items: sale.sale_items.map(item => ({
          product: item.products.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }))
      }));

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `mauzo_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Data ya mauzo imehamishwa kwa mafanikio');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Imeshindwa kuhamisha data');
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Inapakia historia ya mauzo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Historia ya Mauzo</h2>
          <p className="text-gray-600">Fuatilia mauzo na miamala yako</p>
        </div>
        <Button 
          variant="outline" 
          className="flex items-center text-blue-600 border-blue-600 hover:bg-blue-50"
          onClick={handleExportSales}
          disabled={filteredSales.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Hamisha
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Jumla ya Mapato</p>
                <p className="text-2xl font-bold text-green-600">TZS {Number(getSalesStats.totalRevenue).toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Miamala</p>
                <p className="text-2xl font-bold text-blue-600">{getSalesStats.totalTransactions}</p>
              </div>
              <Receipt className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Wastani wa Muamala</p>
              <p className="text-2xl font-bold text-purple-600">TZS {Number(getSalesStats.averageTicket).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tafuta kwa nambari ya muamala au bidhaa..."
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
              className={selectedPeriod === period.id ? "bg-blue-600 hover:bg-blue-700" : ""}
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
                    <h3 className="font-semibold text-lg">#{sale.id.slice(0, 8).toUpperCase()}</h3>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      {sale.payment_method || 'Taslimu'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{formatDate(sale.created_at)}</p>
                  
                  {sale.customers && (
                    <p className="text-sm text-gray-600 mb-3">
                      Mteja: {sale.customers.name}
                      {sale.customers.phone && ` (${sale.customers.phone})`}
                    </p>
                  )}
                  
                  <div className="space-y-1">
                    {sale.sale_items.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.products.name}</span>
                        <span className="font-medium">TZS {item.total_price.toLocaleString()}</span>
                      </div>
                    ))}
                    {sale.sale_items.length > 3 && (
                      <p className="text-sm text-gray-500">
                        ...na mengine {sale.sale_items.length - 3}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col lg:items-end gap-3">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Jumla</p>
                    <p className="text-2xl font-bold text-gray-900">TZS {sale.total_amount.toLocaleString()}</p>
                    {sale.discount_amount && sale.discount_amount > 0 && (
                      <p className="text-sm text-red-600">Punguzo: -TZS {sale.discount_amount.toLocaleString()}</p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewDetails(sale)}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ona Maelezo
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Hakuna mauzo yaliyopatikana</h3>
            <p className="text-gray-600">
              {searchTerm ? "Jaribu kubadilisha maneno ya utafutaji" : "Hakuna mauzo ya kipindi hiki"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sale Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Maelezo ya Muamala #{selectedSale?.id.slice(0, 8).toUpperCase()}</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-6">
              {/* Sale Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Tarehe</p>
                  <p className="font-medium">{formatDate(selectedSale.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Njia ya Malipo</p>
                  <p className="font-medium">{selectedSale.payment_method || 'Taslimu'}</p>
                </div>
                {selectedSale.customers && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Mteja</p>
                      <p className="font-medium">{selectedSale.customers.name}</p>
                    </div>
                    {selectedSale.customers.phone && (
                      <div>
                        <p className="text-sm text-gray-600">Simu</p>
                        <p className="font-medium">{selectedSale.customers.phone}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Items */}
              <div>
                <h4 className="font-semibold mb-3">Bidhaa Zilizouzwa</h4>
                <div className="space-y-2">
                  {selectedSale.sale_items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.products.name}</p>
                        {item.products.category && (
                          <p className="text-sm text-gray-600">{item.products.category}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{item.quantity} x TZS {item.unit_price.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">= TZS {item.total_price.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Jumla ya Bidhaa:</span>
                    <span>TZS {selectedSale.sale_items.reduce((sum, item) => sum + item.total_price, 0).toLocaleString()}</span>
                  </div>
                  {selectedSale.discount_amount && selectedSale.discount_amount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Punguzo:</span>
                      <span>-TZS {selectedSale.discount_amount.toLocaleString()}</span>
                    </div>
                  )}
                  {selectedSale.tax_amount && selectedSale.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span>Kodi:</span>
                      <span>TZS {selectedSale.tax_amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Jumla ya Malipo:</span>
                    <span>TZS {selectedSale.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
