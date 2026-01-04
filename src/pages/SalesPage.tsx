import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Search, Download, Eye, DollarSign, Receipt, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDataAccess } from '@/hooks/useDataAccess';
import { toast } from 'sonner';
import { exportToExcel, ExportColumn } from '@/utils/exportUtils';

interface Sale {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  customer_id?: string;
  discount_amount?: number;
  sales_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
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
  const { dataOwnerId, loading: dataLoading } = useDataAccess();

  const fetchSales = useCallback(async () => {
    if (!dataOwnerId) {
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
          sales_items (
            id,
            quantity,
            unit_price,
            subtotal,
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
        .eq('owner_id', dataOwnerId)
        .order('created_at', { ascending: false });

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
  }, [dataOwnerId, selectedPeriod]);

  useEffect(() => {
    if (dataOwnerId) {
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
      sale.sales_items.some(item => 
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
    const columns: ExportColumn[] = [
      { header: 'Tarehe', key: 'created_at', formatter: (v) => formatDate(v) },
      { header: 'Mteja', key: 'customer', formatter: (v) => v || 'Hakuna' },
      { header: 'Jumla (TSh)', key: 'total_amount', formatter: (v) => Number(v).toLocaleString() },
      { header: 'Njia ya Malipo', key: 'payment_method' },
      { header: 'Punguzo (TSh)', key: 'discount_amount', formatter: (v) => Number(v || 0).toLocaleString() },
    ];

    const exportData = filteredSales.map(sale => ({
      created_at: sale.created_at,
      customer: sale.customers?.name,
      total_amount: sale.total_amount,
      payment_method: sale.payment_method,
      discount_amount: sale.discount_amount || 0,
    }));

    exportToExcel(exportData, columns, `mauzo_${selectedPeriod}`);
    toast.success('Mauzo yamehamishwa kwa mafanikio');
  };

  if (dataLoading || loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Inapakia historia ya mauzo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Historia ya Mauzo</h2>
          <p className="text-muted-foreground">Fuatilia mauzo na miamala yako</p>
        </div>
        <Button 
          variant="outline" 
          className="flex items-center"
          onClick={handleExportSales}
          disabled={filteredSales.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Hamisha
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jumla ya Mapato</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">TZS {Number(getSalesStats.totalRevenue).toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Miamala</p>
                <p className="text-2xl font-bold text-primary">{getSalesStats.totalTransactions}</p>
              </div>
              <Receipt className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Wastani wa Muamala</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">TZS {Number(getSalesStats.averageTicket).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
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
            >
              {period.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredSales.map((sale) => (
          <Card key={sale.id} className="hover:shadow-md transition-shadow border-border">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-foreground">#{sale.id.slice(0, 8).toUpperCase()}</h3>
                    <Badge variant="outline">
                      {sale.payment_method || 'Taslimu'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{formatDate(sale.created_at)}</p>
                  
                  {sale.customers && (
                    <p className="text-sm text-muted-foreground mb-3">
                      Mteja: {sale.customers.name}
                      {sale.customers.phone && ` (${sale.customers.phone})`}
                    </p>
                  )}
                  
                  <div className="space-y-1">
                    {sale.sales_items.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-foreground">{item.quantity}x {item.products.name}</span>
                        <span className="font-medium text-foreground">TZS {item.subtotal.toLocaleString()}</span>
                      </div>
                    ))}
                    {sale.sales_items.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        ...na mengine {sale.sales_items.length - 3}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col lg:items-end gap-3">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Jumla</p>
                    <p className="text-2xl font-bold text-foreground">TZS {sale.total_amount.toLocaleString()}</p>
                    {sale.discount_amount && sale.discount_amount > 0 && (
                      <p className="text-sm text-destructive">Punguzo: -TZS {sale.discount_amount.toLocaleString()}</p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewDetails(sale)}
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
        <Card className="text-center py-12 border-border">
          <CardContent>
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Hakuna mauzo yaliyopatikana</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Jaribu kubadilisha maneno ya utafutaji" : "Hakuna mauzo ya kipindi hiki"}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-foreground">Maelezo ya Muamala #{selectedSale?.id.slice(0, 8).toUpperCase()}</DialogTitle>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tarehe</p>
                  <p className="font-medium text-foreground">{formatDate(selectedSale.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Njia ya Malipo</p>
                  <p className="font-medium text-foreground">{selectedSale.payment_method || 'Taslimu'}</p>
                </div>
                {selectedSale.customers && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Mteja</p>
                      <p className="font-medium text-foreground">{selectedSale.customers.name}</p>
                    </div>
                    {selectedSale.customers.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Simu</p>
                        <p className="font-medium text-foreground">{selectedSale.customers.phone}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-foreground">Bidhaa Zilizouzwa</h4>
                <div className="space-y-2">
                  {selectedSale.sales_items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.products.name}</p>
                        {item.products.category && (
                          <p className="text-sm text-muted-foreground">{item.products.category}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">{item.quantity} x TZS {item.unit_price.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">= TZS {item.subtotal.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-foreground">Jumla ya Bidhaa:</span>
                    <span className="text-foreground">TZS {selectedSale.sales_items.reduce((sum, item) => sum + item.subtotal, 0).toLocaleString()}</span>
                  </div>
                  {selectedSale.discount_amount && selectedSale.discount_amount > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Punguzo:</span>
                      <span>-TZS {selectedSale.discount_amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                    <span className="text-foreground">Jumla ya Malipo:</span>
                    <span className="text-primary">TZS {selectedSale.total_amount.toLocaleString()}</span>
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