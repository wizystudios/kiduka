import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CustomerReport {
  customer_id: string;
  customer_name: string;
  total_purchases: number;
  total_paid: number;
  total_outstanding: number;
  full_payments: number;
  partial_payments: number;
  profit: number;
  cost: number;
}

export const CustomerReportsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<CustomerReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<CustomerReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerReports();
  }, [user]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = reports.filter((report) =>
        report.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredReports(filtered);
    } else {
      setFilteredReports(reports);
    }
  }, [searchTerm, reports]);

  const fetchCustomerReports = async () => {
    if (!user) return;

    try {
      // Fetch all customer transactions
      const { data: transactions, error } = await supabase
        .from('customer_transactions')
        .select('*')
        .eq('owner_id', user.id);

      if (error) throw error;

      // Group by customer
      const customerMap = new Map<string, CustomerReport>();

      transactions?.forEach((txn) => {
        const customerId = txn.customer_id || txn.customer_name;
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customer_id: customerId,
            customer_name: txn.customer_name,
            total_purchases: 0,
            total_paid: 0,
            total_outstanding: 0,
            full_payments: 0,
            partial_payments: 0,
            profit: 0,
            cost: 0,
          });
        }

        const report = customerMap.get(customerId)!;
        const totalAmount = Number(txn.total_amount || 0);
        const amountPaid = Number(txn.amount_paid || 0);
        const balance = Number(txn.balance || 0);
        const unitPrice = Number(txn.unit_price || 0);
        const quantity = Number(txn.quantity || 0);

        report.total_purchases += totalAmount;
        report.total_paid += amountPaid;
        report.total_outstanding += balance;

        if (balance === 0 && amountPaid > 0) {
          report.full_payments += 1;
        } else if (amountPaid > 0 && balance > 0) {
          report.partial_payments += 1;
        }

        // Estimate profit (assuming 30% margin)
        const estimatedCost = totalAmount * 0.7;
        report.cost += estimatedCost;
        report.profit += totalAmount - estimatedCost;
      });

      setReports(Array.from(customerMap.values()));
    } catch (error) {
      console.error('Error fetching customer reports:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kupakia ripoti',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Jina la Mteja',
      'Jumla ya Manunuzi',
      'Jumla ya Malipo',
      'Madeni',
      'Malipo Kamili',
      'Malipo ya Nusu',
      'Faida',
      'Gharama',
    ];

    const rows = filteredReports.map((report) => [
      report.customer_name,
      report.total_purchases,
      report.total_paid,
      report.total_outstanding,
      report.full_payments,
      report.partial_payments,
      report.profit,
      report.cost,
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ripoti-wateja-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="page-container p-4 space-y-4">
      <PageHeader
        title="Ripoti za Wateja"
        subtitle="Angalia historia kamili ya kila mteja"
        backTo="/dashboard"
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tafuta mteja..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              disabled={filteredReports.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Inapakia...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Hakuna ripoti za wateja
            </div>
          ) : (
            filteredReports.map((report) => (
              <Card key={report.customer_id} className="border-l-4 border-l-primary">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">{report.customer_name}</h3>
                      {report.total_outstanding > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          Deni: TZS {report.total_outstanding.toLocaleString()}
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-xs bg-green-600">
                          Hajalipa
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-accent/20 p-2 rounded">
                        <p className="text-muted-foreground">Jumla Manunuzi</p>
                        <p className="font-semibold">
                          TZS {report.total_purchases.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-accent/20 p-2 rounded">
                        <p className="text-muted-foreground">Jumla Malipo</p>
                        <p className="font-semibold">
                          TZS {report.total_paid.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <p className="text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Faida
                        </p>
                        <p className="font-semibold text-green-600">
                          TZS {report.profit.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-orange-50 p-2 rounded">
                        <p className="text-muted-foreground flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          Gharama
                        </p>
                        <p className="font-semibold text-orange-600">
                          TZS {report.cost.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-xs">
                        Malipo Kamili: {report.full_payments}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Nusu: {report.partial_payments}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
