
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
  Users
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
      // Simulate loan applications using existing tables
      // In real implementation, this would use the loan_applications table
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
      // Get sales data for revenue calculation
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount, created_at')
        .eq('owner_id', user.id)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      // Get credit payment history
      const { data: creditData } = await supabase
        .from('customer_credit')
        .select('payment_history, credit_score')
        .eq('owner_id', user.id);

      // Get business profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', user.id)
        .single();

      // Calculate metrics
      const monthlyRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) / 3 || 0;
      const businessAge = profile ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000)) : 0;
      
      // Calculate average credit score
      const avgCreditScore = creditData?.length ? 
        creditData.reduce((sum, record) => sum + (record.credit_score || 50), 0) / creditData.length : 50;

      // Calculate payment history score
      const paymentHistory = creditData?.reduce((sum, record) => {
        const history = Array.isArray(record.payment_history) ? record.payment_history : [];
        return sum + history.filter((p: any) => p.type === 'payment').length;
      }, 0) || 0;

      // Determine risk level
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

      // Simulate instant approval/rejection based on credit profile
      const autoDecision = await processLoanDecision(newApplication);
      
      // Store in localStorage (in real implementation, this would go to the database)
      const existingApplications = JSON.parse(localStorage.getItem(`loan_applications_${user.id}`) || '[]');
      existingApplications.unshift(newApplication);
      localStorage.setItem(`loan_applications_${user.id}`, JSON.stringify(existingApplications));
      
      toast({
        title: 'Ombi Limewasilishwa',
        description: autoDecision.approved ? 
          `Hongera! Mkopo wako wa TZS ${autoDecision.approvedAmount?.toLocaleString()} umeidhinishwa` :
          'Ombi lako limepokewa na litakaguliwa',
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

    // Simple auto-approval algorithm
    const { creditScore, monthlyRevenue, businessAge, riskLevel } = creditProfile;
    
    let maxLoanAmount = 0;
    let interestRate = 15; // Default 15% per annum
    
    if (riskLevel === 'low') {
      maxLoanAmount = monthlyRevenue * 6; // 6 months revenue
      interestRate = 8;
    } else if (riskLevel === 'medium') {
      maxLoanAmount = monthlyRevenue * 3; // 3 months revenue
      interestRate = 12;
    } else {
      maxLoanAmount = monthlyRevenue * 1; // 1 month revenue
      interestRate = 18;
    }

    const requestedAmount = application.requested_amount;
    const approved = requestedAmount <= maxLoanAmount && creditScore >= 40;
    const approvedAmount = approved ? Math.min(requestedAmount, maxLoanAmount) : 0;

    if (approved) {
      // Update application with approval in localStorage
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
      case 'business_expansion': return 'Upanuzi wa Biashara';
      case 'inventory': return 'Stock za Bidhaa';
      case 'equipment': return 'Vifaa vya Biashara';
      case 'emergency': return 'Mkopo wa Dharura';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Inasubiri</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Imeidhinishwa</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Imekataliwa</Badge>;
      case 'disbursed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Imepewa</Badge>;
      case 'paid':
        return <Badge className="bg-blue-500">Imelipwa</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calculateEMI = (principal: number, rate: number, months: number) => {
    const monthlyRate = rate / 100 / 12;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                (Math.pow(1 + monthlyRate, months) - 1);
    return emi;
  };

  return (
    <div className="p-4 space-y-6">
      {/* Credit Profile */}
      {creditProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="h-5 w-5" />
              <span>Wasifu wa Mkopo</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{creditProfile.creditScore}</p>
                <p className="text-sm text-gray-600">Alama za Mkopo</p>
                <Progress value={creditProfile.creditScore} className="mt-2" />
              </div>
              
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">
                  TZS {creditProfile.monthlyRevenue.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Mapato ya Kila Mwezi</p>
              </div>
              
              <div className="text-center">
                <p className="text-lg font-bold text-purple-600">{creditProfile.businessAge} miezi</p>
                <p className="text-sm text-gray-600">Umri wa Biashara</p>
              </div>
            </div>
            
            <div className="flex justify-center">
              <Badge 
                variant={creditProfile.riskLevel === 'low' ? 'default' : 
                        creditProfile.riskLevel === 'medium' ? 'secondary' : 'destructive'}
                className="text-sm"
              >
                Hatari: {creditProfile.riskLevel === 'low' ? 'Chini' : 
                         creditProfile.riskLevel === 'medium' ? 'Wastani' : 'Juu'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loan Products */}
      <Card>
        <CardHeader>
          <CardTitle>Bidhaa za Mikopo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 cursor-pointer hover:shadow-md" 
                  onClick={() => {
                    setCurrentApplication({...currentApplication, loan_type: 'business_expansion'});
                    setShowApplication(true);
                  }}>
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-8 w-8 text-blue-500" />
                <div>
                  <h3 className="font-semibold">Upanuzi wa Biashara</h3>
                  <p className="text-sm text-gray-600">Hadi TZS 5,000,000</p>
                  <p className="text-sm text-gray-600">Riba 8-15% kwa mwaka</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 cursor-pointer hover:shadow-md"
                  onClick={() => {
                    setCurrentApplication({...currentApplication, loan_type: 'inventory'});
                    setShowApplication(true);
                  }}>
              <div className="flex items-center space-x-3">
                <Package className="h-8 w-8 text-green-500" />
                <div>
                  <h3 className="font-semibold">Stock za Bidhaa</h3>
                  <p className="text-sm text-gray-600">Hadi TZS 3,000,000</p>
                  <p className="text-sm text-gray-600">Riba 10-18% kwa mwaka</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 cursor-pointer hover:shadow-md"
                  onClick={() => {
                    setCurrentApplication({...currentApplication, loan_type: 'equipment'});
                    setShowApplication(true);
                  }}>
              <div className="flex items-center space-x-3">
                <Wrench className="h-8 w-8 text-purple-500" />
                <div>
                  <h3 className="font-semibold">Vifaa vya Biashara</h3>
                  <p className="text-sm text-gray-600">Hadi TZS 2,000,000</p>
                  <p className="text-sm text-gray-600">Riba 12-20% kwa mwaka</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 cursor-pointer hover:shadow-md"
                  onClick={() => {
                    setCurrentApplication({...currentApplication, loan_type: 'emergency'});
                    setShowApplication(true);
                  }}>
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                  <h3 className="font-semibold">Mkopo wa Dharura</h3>
                  <p className="text-sm text-gray-600">Hadi TZS 500,000</p>
                  <p className="text-sm text-gray-600">Riba 15-25% kwa mwaka</p>
                </div>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Loan Application Form */}
      {showApplication && (
        <Card>
          <CardHeader>
            <CardTitle>Ombi la Mkopo - {getLoanTypeName(currentApplication.loan_type || '')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Kiasi unachokitaka (TZS)</label>
              <Input
                type="number"
                value={currentApplication.requested_amount}
                onChange={(e) => setCurrentApplication({
                  ...currentApplication,
                  requested_amount: Number(e.target.value)
                })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Maelezo ya Biashara</label>
              <Textarea
                placeholder="Eleza biashara yako..."
                value={currentApplication.application_data?.business_description || ''}
                onChange={(e) => setCurrentApplication({
                  ...currentApplication,
                  application_data: {
                    ...currentApplication.application_data,
                    business_description: e.target.value
                  }
                })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Madhumuni ya Mkopo</label>
              <Textarea
                placeholder="Utakitumia vipi mkopo huu..."
                value={currentApplication.application_data?.loan_purpose || ''}
                onChange={(e) => setCurrentApplication({
                  ...currentApplication,
                  application_data: {
                    ...currentApplication.application_data,
                    loan_purpose: e.target.value
                  }
                })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Gharama za Kila Mwezi (TZS)</label>
              <Input
                type="number"
                placeholder="Gharama za kawaida za kila mwezi"
                value={currentApplication.application_data?.monthly_expenses || ''}
                onChange={(e) => setCurrentApplication({
                  ...currentApplication,
                  application_data: {
                    ...currentApplication.application_data,
                    monthly_expenses: Number(e.target.value)
                  }
                })}
              />
            </div>

            {/* EMI Calculator */}
            {currentApplication.requested_amount && creditProfile && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Hesabu ya Malipo</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p>Malipo ya kila mwezi (EMI):</p>
                    <p className="font-bold text-blue-600">
                      TZS {calculateEMI(currentApplication.requested_amount, 12, 12).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p>Jumla ya malipo:</p>
                    <p className="font-bold">
                      TZS {(calculateEMI(currentApplication.requested_amount, 12, 12) * 12).toLocaleString()}
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
                {loading ? 'Inawasilisha...' : 'Wasilisha Ombi'}
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

      {/* Loan Applications History */}
      <Card>
        <CardHeader>
          <CardTitle>Historia ya Maombi</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-center text-gray-600 py-8">Hakuna maombi ya mikopo</p>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="border p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      {getLoanTypeIcon(app.loan_type)}
                      <div>
                        <p className="font-semibold">{getLoanTypeName(app.loan_type)}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p>Kiasi kilichoombwa:</p>
                      <p className="font-semibold">TZS {app.requested_amount.toLocaleString()}</p>
                    </div>
                    {app.approved_amount && (
                      <div>
                        <p>Kiasi kilichoidhinishwa:</p>
                        <p className="font-semibold text-green-600">
                          TZS {app.approved_amount.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {app.interest_rate && (
                    <div className="mt-2 text-sm">
                      <p>Riba: {app.interest_rate}% kwa mwaka</p>
                      {app.loan_term_months && (
                        <p>Muda: miezi {app.loan_term_months}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Partner SACCOs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Washirika wa Mikopo</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border p-3 rounded-lg">
              <h4 className="font-semibold">SACCO ya Wafanyabiashara</h4>
              <p className="text-sm text-gray-600">Riba 8-12% kwa mwaka</p>
              <p className="text-sm text-gray-600">Mikopo hadi TZS 10,000,000</p>
            </div>
            
            <div className="border p-3 rounded-lg">
              <h4 className="font-semibold">Benki ya Maendeleo</h4>
              <p className="text-sm text-gray-600">Riba 10-15% kwa mwaka</p>
              <p className="text-sm text-gray-600">Mikopo hadi TZS 5,000,000</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
