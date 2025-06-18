import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  TrendingUp, 
  Building, 
  Package, 
  Wrench, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Calculator,
  Users,
  Star,
  DollarSign
} from 'lucide-react';

interface LoanApplication {
  id: string;
  loan_type: string;
  requested_amount: number;
  approved_amount?: number;
  interest_rate?: number;
  loan_term_months?: number;
  status: string;
  application_data: any;
  credit_score?: number;
  monthly_revenue?: number;
  business_age_months?: number;
  created_at: string;
  updated_at: string;
}

interface CreditProfile {
  creditScore: number;
  monthlyRevenue: number;
  businessAge: number;
  paymentHistory: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export const MicroLoanIntegration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [currentApplication, setCurrentApplication] = useState<Partial<LoanApplication>>({
    loan_type: 'business_expansion',
    requested_amount: 100000,
    application_data: {}
  });
  const [creditProfile, setCreditProfile] = useState<CreditProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [showApplication, setShowApplication] = useState(false);

  useEffect(() => {
    fetchLoanApplications();
    calculateCreditProfile();
  }, [user]);

  const fetchLoanApplications = async () => {
    if (!user) return;

    try {
      const storedApplications = localStorage.getItem(`loan_applications_${user.id}`);
      if (storedApplications) {
        setApplications(JSON.parse(storedApplications));
      }
    } catch (error) {
      console.error('Error fetching loan applications:', error);
    }
  };

  const calculateCreditProfile = async () => {
    if (!user) return;

    try {
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount, created_at')
        .eq('owner_id', user.id)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      const { data: creditData } = await supabase
        .from('customer_credit')
        .select('payment_history, credit_score')
        .eq('owner_id', user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', user.id)
        .single();

      const monthlyRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) / 3 || 0;
      const businessAge = profile ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000)) : 0;
      
      const avgCreditScore = creditData?.length ? 
        creditData.reduce((sum, record) => sum + (record.credit_score || 50), 0) / creditData.length : 50;

      const paymentHistory = creditData?.reduce((sum, record) => {
        const history = Array.isArray(record.payment_history) ? record.payment_history : [];
        return sum + history.filter((p: any) => p.type === 'payment').length;
      }, 0) || 0;

      let riskLevel: 'low' | 'medium' | 'high' = 'high';
      if (avgCreditScore >= 70 && monthlyRevenue >= 50000 && businessAge >= 6) {
        riskLevel = 'low';
      } else if (avgCreditScore >= 50 && monthlyRevenue >= 20000 && businessAge >= 3) {
        riskLevel = 'medium';
      }

      setCreditProfile({
        creditScore: Math.round(avgCreditScore),
        monthlyRevenue,
        businessAge,
        paymentHistory,
        riskLevel
      });
    } catch (error) {
      console.error('Error calculating credit profile:', error);
    }
  };

  const submitLoanApplication = async () => {
    if (!user || !currentApplication.loan_type || !currentApplication.requested_amount) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali jaza taarifa zote zinazohitajika',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      const applicationData = {
        business_description: currentApplication.application_data?.business_description || '',
        loan_purpose: currentApplication.application_data?.loan_purpose || '',
        collateral_description: currentApplication.application_data?.collateral_description || '',
        monthly_expenses: currentApplication.application_data?.monthly_expenses || 0,
        other_loans: currentApplication.application_data?.other_loans || false,
        employment_history: currentApplication.application_data?.employment_history || '',
        references: currentApplication.application_data?.references || []
      };

      const newApplication: LoanApplication = {
        id: `loan_${Date.now()}`,
        loan_type: currentApplication.loan_type,
        requested_amount: currentApplication.requested_amount,
        application_data: applicationData,
        credit_score: creditProfile?.creditScore,
        monthly_revenue: creditProfile?.monthlyRevenue,
        business_age_months: creditProfile?.businessAge,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const autoDecision = await processLoanDecision(newApplication);
      
      const existingApplications = JSON.parse(localStorage.getItem(`loan_applications_${user.id}`) || '[]');
      existingApplications.unshift(newApplication);
      localStorage.setItem(`loan_applications_${user.id}`, JSON.stringify(existingApplications));
      
      toast({
        title: 'Ombi Limewasilishwa',
        description: autoDecision.approved ? 
          `Mkopo wa TZS ${autoDecision.approvedAmount?.toLocaleString()} umeidhinishwa` :
          'Ombi litakaguliwa',
      });

      setCurrentApplication({
        loan_type: 'business_expansion',
        requested_amount: 100000,
        application_data: {}
      });
      setShowApplication(false);
      fetchLoanApplications();
    } catch (error) {
      console.error('Error submitting loan application:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kuwasilisha ombi la mkopo',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const processLoanDecision = async (application: LoanApplication) => {
    if (!creditProfile) return { approved: false };

    const { creditScore, monthlyRevenue, businessAge, riskLevel } = creditProfile;
    
    let maxLoanAmount = 0;
    let interestRate = 15;
    
    if (riskLevel === 'low') {
      maxLoanAmount = monthlyRevenue * 6;
      interestRate = 8;
    } else if (riskLevel === 'medium') {
      maxLoanAmount = monthlyRevenue * 3;
      interestRate = 12;
    } else {
      maxLoanAmount = monthlyRevenue * 1;
      interestRate = 18;
    }

    const requestedAmount = application.requested_amount;
    const approved = requestedAmount <= maxLoanAmount && creditScore >= 40;
    const approvedAmount = approved ? Math.min(requestedAmount, maxLoanAmount) : 0;

    if (approved) {
      application.status = 'approved';
      application.approved_amount = approvedAmount;
      application.interest_rate = interestRate;
      application.loan_term_months = 12;
      application.updated_at = new Date().toISOString();
    }

    return { approved, approvedAmount, interestRate };
  };

  const getLoanTypeIcon = (type: string) => {
    switch (type) {
      case 'business_expansion': return <TrendingUp className="h-5 w-5" />;
      case 'inventory': return <Package className="h-5 w-5" />;
      case 'equipment': return <Wrench className="h-5 w-5" />;
      case 'emergency': return <AlertTriangle className="h-5 w-5" />;
      default: return <CreditCard className="h-5 w-5" />;
    }
  };

  const getLoanTypeName = (type: string) => {
    switch (type) {
      case 'business_expansion': return 'Upanuzi';
      case 'inventory': return 'Stock';
      case 'equipment': return 'Vifaa';
      case 'emergency': return 'Dharura';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Inasubiri</Badge>;
      case 'approved':
        return <Badge variant="default" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Imeidhinishwa</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-xs">Imekataliwa</Badge>;
      case 'disbursed':
        return <Badge className="bg-green-500 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Imepewa</Badge>;
      case 'paid':
        return <Badge className="bg-blue-500 text-xs">Imelipwa</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const calculateEMI = (principal: number, rate: number, months: number) => {
    const monthlyRate = rate / 100 / 12;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                (Math.pow(1 + monthlyRate, months) - 1);
    return emi;
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-3 space-y-4">
      {/* Credit Profile - Compact */}
      {creditProfile && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>Wasifu Wako</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-blue-600">{creditProfile.creditScore}</p>
                <p className="text-xs text-gray-600">Alama</p>
              </div>
              <div>
                <p className="text-sm font-bold text-green-600">
                  {(creditProfile.monthlyRevenue / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-gray-600">Mapato</p>
              </div>
              <div>
                <p className="text-sm font-bold text-purple-600">{creditProfile.businessAge}M</p>
                <p className="text-xs text-gray-600">Umri</p>
              </div>
            </div>
            
            <div className="flex justify-center">
              <Badge className={`text-xs ${getRiskBadgeColor(creditProfile.riskLevel)}`}>
                Hatari: {creditProfile.riskLevel === 'low' ? 'Chini' : 
                         creditProfile.riskLevel === 'medium' ? 'Wastani' : 'Juu'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loan Products - Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Aina za Mikopo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-3 cursor-pointer hover:shadow-md" 
                  onClick={() => {
                    setCurrentApplication({...currentApplication, loan_type: 'business_expansion'});
                    setShowApplication(true);
                  }}>
              <div className="text-center">
                <TrendingUp className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                <h4 className="text-sm font-semibold">Upanuzi</h4>
                <p className="text-xs text-gray-600">Hadi 5M</p>
                <p className="text-xs text-gray-600">8-15%</p>
              </div>
            </Card>

            <Card className="p-3 cursor-pointer hover:shadow-md"
                  onClick={() => {
                    setCurrentApplication({...currentApplication, loan_type: 'inventory'});
                    setShowApplication(true);
                  }}>
              <div className="text-center">
                <Package className="h-6 w-6 text-green-500 mx-auto mb-1" />
                <h4 className="text-sm font-semibold">Stock</h4>
                <p className="text-xs text-gray-600">Hadi 3M</p>
                <p className="text-xs text-gray-600">10-18%</p>
              </div>
            </Card>

            <Card className="p-3 cursor-pointer hover:shadow-md"
                  onClick={() => {
                    setCurrentApplication({...currentApplication, loan_type: 'equipment'});
                    setShowApplication(true);
                  }}>
              <div className="text-center">
                <Wrench className="h-6 w-6 text-purple-500 mx-auto mb-1" />
                <h4 className="text-sm font-semibold">Vifaa</h4>
                <p className="text-xs text-gray-600">Hadi 2M</p>
                <p className="text-xs text-gray-600">12-20%</p>
              </div>
            </Card>

            <Card className="p-3 cursor-pointer hover:shadow-md"
                  onClick={() => {
                    setCurrentApplication({...currentApplication, loan_type: 'emergency'});
                    setShowApplication(true);
                  }}>
              <div className="text-center">
                <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-1" />
                <h4 className="text-sm font-semibold">Dharura</h4>
                <p className="text-xs text-gray-600">Hadi 500K</p>
                <p className="text-xs text-gray-600">15-25%</p>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Application Form - Simplified */}
      {showApplication && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center space-x-2">
              {getLoanTypeIcon(currentApplication.loan_type || '')}
              <span>Ombi la {getLoanTypeName(currentApplication.loan_type || '')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Input
                type="number"
                value={currentApplication.requested_amount}
                onChange={(e) => setCurrentApplication({
                  ...currentApplication,
                  requested_amount: Number(e.target.value)
                })}
                placeholder="Kiasi (TZS)"
              />
            </div>

            <div>
              <Textarea
                placeholder="Maelezo ya biashara..."
                value={currentApplication.application_data?.business_description || ''}
                onChange={(e) => setCurrentApplication({
                  ...currentApplication,
                  application_data: {
                    ...currentApplication.application_data,
                    business_description: e.target.value
                  }
                })}
                rows={2}
              />
            </div>

            <div>
              <Textarea
                placeholder="Utakitumia vipi mkopo..."
                value={currentApplication.application_data?.loan_purpose || ''}
                onChange={(e) => setCurrentApplication({
                  ...currentApplication,
                  application_data: {
                    ...currentApplication.application_data,
                    loan_purpose: e.target.value
                  }
                })}
                rows={2}
              />
            </div>

            {/* EMI Calculator - Compact */}
            {currentApplication.requested_amount && creditProfile && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="text-xs text-gray-600">Malipo ya mwezi:</p>
                    <p className="font-bold text-blue-600">
                      {(calculateEMI(currentApplication.requested_amount, 12, 12) / 1000).toFixed(0)}K
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Jumla:</p>
                    <p className="font-bold">
                      {((calculateEMI(currentApplication.requested_amount, 12, 12) * 12) / 1000).toFixed(0)}K
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                onClick={submitLoanApplication}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Inawasilisha...' : 'Wasilisha'}
              </Button>
              <Button
                onClick={() => setShowApplication(false)}
                variant="outline"
              >
                Ghairi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applications History - Compact */}
      {applications.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Historia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {applications.slice(0, 3).map((app) => (
                <div key={app.id} className="border p-2 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {getLoanTypeIcon(app.loan_type)}
                      <div>
                        <p className="text-sm font-semibold">{getLoanTypeName(app.loan_type)}</p>
                        <p className="text-xs text-gray-600">
                          {app.requested_amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
