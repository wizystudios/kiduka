
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Search,
  FileText,
  Calendar
} from 'lucide-react';

interface WarrantyClaim {
  id: string;
  receipt_id: string;
  product_id: string;
  customer_id?: string;
  claim_type: string;
  claim_status: string;
  claim_data: any;
  created_at: string;
}

interface SmartReceipt {
  id: string;
  qr_code: string;
  warranty_info: any;
  created_at: string;
  sales: {
    total_amount: number;
    created_at: string;
    owner_id: string;
  };
}

export const WarrantyManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [receipts, setReceipts] = useState<SmartReceipt[]>([]);
  const [searchQR, setSearchQR] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<SmartReceipt | null>(null);
  const [newClaim, setNewClaim] = useState({
    claim_type: 'defect',
    description: '',
    customer_phone: ''
  });

  useEffect(() => {
    if (user) {
      fetchWarrantyClaims();
      fetchSmartReceipts();
    }
  }, [user]);

  const fetchWarrantyClaims = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('warranty_claims')
        .select(`
          *,
          smart_receipts!inner(
            sale_id,
            sales!inner(owner_id)
          )
        `)
        .eq('smart_receipts.sales.owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error) {
      console.error('Error fetching warranty claims:', error);
    }
  };

  const fetchSmartReceipts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('smart_receipts')
        .select(`
          *,
          sales!inner(
            owner_id,
            total_amount,
            created_at
          )
        `)
        .eq('sales.owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error fetching smart receipts:', error);
    }
  };

  const searchByQR = async () => {
    if (!searchQR) return;

    try {
      const { data, error } = await supabase
        .from('smart_receipts')
        .select(`
          *,
          sales!inner(
            owner_id,
            total_amount,
            created_at
          )
        `)
        .eq('qr_code', searchQR)
        .eq('sales.owner_id', user?.id)
        .single();

      if (error) {
        toast({
          title: 'Haijapatikana',
          description: 'Risiti haijapatikana au haiko kwenye mfumo wako',
          variant: 'destructive'
        });
        return;
      }

      setSelectedReceipt(data);
      toast({
        title: 'Risiti Imepatikana',
        description: 'Risiti imepatikana kikamilifu',
      });
    } catch (error) {
      console.error('Error searching receipt:', error);
    }
  };

  const createWarrantyClaim = async () => {
    if (!selectedReceipt || !newClaim.description) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali chagua risiti na jaza maelezo',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('warranty_claims')
        .insert({
          receipt_id: selectedReceipt.id,
          product_id: 'product-id', // This should come from the receipt
          claim_type: newClaim.claim_type,
          claim_status: 'pending',
          claim_data: {
            description: newClaim.description,
            customer_phone: newClaim.customer_phone,
            created_by: user?.email
          }
        });

      if (error) throw error;

      toast({
        title: 'Madai Yameongezwa',
        description: 'Madai ya warranty yameongezwa kikamilifu',
      });

      setNewClaim({ claim_type: 'defect', description: '', customer_phone: '' });
      setSelectedReceipt(null);
      fetchWarrantyClaims();
    } catch (error) {
      console.error('Error creating warranty claim:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kuongeza madai',
        variant: 'destructive'
      });
    }
  };

  const updateClaimStatus = async (claimId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('warranty_claims')
        .update({ claim_status: newStatus })
        .eq('id', claimId);

      if (error) throw error;

      toast({
        title: 'Hali Imebadilishwa',
        description: 'Hali ya madai imebadilishwa kikamilifu',
      });

      fetchWarrantyClaims();
    } catch (error) {
      console.error('Error updating claim status:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'approved': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'default';
    }
  };

  const calculateWarrantyExpiry = (createdAt: string, warrantyMonths: number = 12) => {
    const createdDate = new Date(createdAt);
    const expiryDate = new Date(createdDate);
    expiryDate.setMonth(expiryDate.getMonth() + warrantyMonths);
    return expiryDate;
  };

  const isWarrantyActive = (createdAt: string, warrantyMonths: number = 12) => {
    const expiryDate = calculateWarrantyExpiry(createdAt, warrantyMonths);
    return new Date() < expiryDate;
  };

  return (
    <div className="space-y-6">
      {/* Search Receipt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Tafuta Risiti kwa QR Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="Ingiza QR Code ya risiti"
              value={searchQR}
              onChange={(e) => setSearchQR(e.target.value)}
              className="flex-1"
            />
            <Button onClick={searchByQR}>
              <Search className="h-4 w-4 mr-2" />
              Tafuta
            </Button>
          </div>

          {selectedReceipt && (
            <div className="mt-4 p-4 border rounded-lg bg-green-50">
              <h3 className="font-medium mb-2">Risiti Imepatikana</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">QR Code:</span>
                  <span className="ml-2 font-medium">{selectedReceipt.qr_code}</span>
                </div>
                <div>
                  <span className="text-gray-600">Kiasi:</span>
                  <span className="ml-2 font-medium">TZS {selectedReceipt.sales.total_amount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Tarehe:</span>
                  <span className="ml-2 font-medium">
                    {new Date(selectedReceipt.sales.created_at).toLocaleDateString('sw-TZ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Warranty:</span>
                  <Badge variant={isWarrantyActive(selectedReceipt.sales.created_at) ? 'default' : 'destructive'}>
                    {isWarrantyActive(selectedReceipt.sales.created_at) ? 'Inatumika' : 'Imeisha'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Warranty Claim */}
      {selectedReceipt && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Ongeza Madai ya Warranty
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Aina ya Madai</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={newClaim.claim_type}
                onChange={(e) => setNewClaim({ ...newClaim, claim_type: e.target.value })}
              >
                <option value="defect">Hitilafu ya Bidhaa</option>
                <option value="damage">Uharibifu</option>
                <option value="malfunction">Kutofanya kazi</option>
                <option value="replacement">Kubadilisha</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Namba ya Simu ya Mteja</label>
              <Input
                placeholder="+255700000000"
                value={newClaim.customer_phone}
                onChange={(e) => setNewClaim({ ...newClaim, customer_phone: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Maelezo ya Madai</label>
              <Textarea
                placeholder="Eleza tatizo la bidhaa..."
                value={newClaim.description}
                onChange={(e) => setNewClaim({ ...newClaim, description: e.target.value })}
                rows={4}
              />
            </div>

            <Button onClick={createWarrantyClaim} className="w-full">
              <Shield className="h-4 w-4 mr-2" />
              Ongeza Madai
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Warranty Claims List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Madai ya Warranty
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {claims.length > 0 ? (
              claims.map((claim) => (
                <div key={claim.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex items-start space-x-3">
                    {getStatusIcon(claim.claim_status)}
                    <div>
                      <h3 className="font-medium">{claim.claim_type}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {claim.claim_data?.description}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusColor(claim.claim_status) as any}>
                          {claim.claim_status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(claim.created_at).toLocaleDateString('sw-TZ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {claim.claim_status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => updateClaimStatus(claim.id, 'approved')}
                        >
                          Kubali
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateClaimStatus(claim.id, 'rejected')}
                        >
                          Kataa
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">Hakuna madai ya warranty</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Smart Receipts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Risiti za Hivi Karibuni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {receipts.map((receipt) => (
              <div key={receipt.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">QR: {receipt.qr_code}</p>
                  <p className="text-sm text-gray-600">
                    TZS {receipt.sales.total_amount.toLocaleString()} • 
                    {new Date(receipt.sales.created_at).toLocaleDateString('sw-TZ')}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={isWarrantyActive(receipt.sales.created_at) ? 'default' : 'destructive'}>
                    {isWarrantyActive(receipt.sales.created_at) ? 'Warranty Inatumika' : 'Warranty Imeisha'}
                  </Badge>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedReceipt(receipt)}
                  >
                    Chagua
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
