import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Star, 
  Gift, 
  Trophy, 
  Users, 
  TrendingUp,
  Crown,
  Medal,
  Zap,
  Heart,
  Target
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  loyalty_points: number;
}

interface LoyaltyProgram {
  id: string;
  name: string;
  points_per_tzs: number;
  reward_threshold: number;
  reward_value: number;
  is_active: boolean;
}

interface LoyaltyTier {
  name: string;
  min_points: number;
  benefits: string[];
  color: string;
  icon: any;
}

export const CustomerLoyaltyProgram = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loyaltyPrograms, setLoyaltyPrograms] = useState<LoyaltyProgram[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [pointsToAdd, setPointsToAdd] = useState('');
  const [newProgram, setNewProgram] = useState({
    name: '',
    points_per_tzs: 1,
    reward_threshold: 100,
    reward_value: 5000
  });
  const [activeTab, setActiveTab] = useState<'customers' | 'programs' | 'analytics'>('customers');

  const loyaltyTiers: LoyaltyTier[] = [
    {
      name: 'Mteja Mpya',
      min_points: 0,
      benefits: ['Pointi za msingi', 'Taarifa za bei'],
      color: 'text-gray-500',
      icon: Users
    },
    {
      name: 'Mteja wa Dhahabu',
      min_points: 100,
      benefits: ['Punguzo 5%', 'Taarifa za kwanza', 'Huduma ya haraka'],
      color: 'text-yellow-500',
      icon: Star
    },
    {
      name: 'Mteja wa Almasi',
      min_points: 500,
      benefits: ['Punguzo 10%', 'Bidhaa za kipekee', 'Msaada wa kibinafsi'],
      color: 'text-blue-500',
      icon: Medal
    },
    {
      name: 'Mteja wa Vip',
      min_points: 1000,
      benefits: ['Punguzo 15%', 'Uongozaji wa kibinafsi', 'Zawadi za maalum'],
      color: 'text-purple-500',
      icon: Crown
    }
  ];

  useEffect(() => {
    fetchCustomers();
    fetchLoyaltyPrograms();
  }, [user]);

  const fetchCustomers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('loyalty_points', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchLoyaltyPrograms = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('loyalty_programs')
        .select('*')
        .eq('owner_id', user.id);

      if (error) throw error;
      setLoyaltyPrograms(data || []);
    } catch (error) {
      console.error('Error fetching loyalty programs:', error);
    }
  };

  const addPoints = async () => {
    if (!selectedCustomer || !pointsToAdd) return;

    try {
      const points = parseInt(pointsToAdd);
      const newTotal = selectedCustomer.loyalty_points + points;

      const { error } = await supabase
        .from('customers')
        .update({ loyalty_points: newTotal })
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      toast({
        title: 'Pointi Zimeongezwa',
        description: `${selectedCustomer.name} amepata pointi ${points}`,
      });

      setPointsToAdd('');
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (error) {
      console.error('Error adding points:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kuongeza pointi',
        variant: 'destructive'
      });
    }
  };

  const redeemReward = async (customerId: string, points: number) => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer || customer.loyalty_points < points) return;

      const newTotal = customer.loyalty_points - points;

      const { error } = await supabase
        .from('customers')
        .update({ loyalty_points: newTotal })
        .eq('id', customerId);

      if (error) throw error;

      toast({
        title: 'Zawadi Imetolewa',
        description: `${customer.name} ametumia pointi ${points}`,
      });

      fetchCustomers();
    } catch (error) {
      console.error('Error redeeming reward:', error);
    }
  };

  const createLoyaltyProgram = async () => {
    if (!user || !newProgram.name) return;

    try {
      const { error } = await supabase
        .from('loyalty_programs')
        .insert({
          owner_id: user.id,
          name: newProgram.name,
          points_per_tzs: newProgram.points_per_tzs,
          reward_threshold: newProgram.reward_threshold,
          reward_value: newProgram.reward_value,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: 'Programu Imetengenezwa',
        description: `Programu ya uongozi wa ${newProgram.name} imetengenezwa`,
      });

      setNewProgram({
        name: '',
        points_per_tzs: 1,
        reward_threshold: 100,
        reward_value: 5000
      });

      fetchLoyaltyPrograms();
    } catch (error) {
      console.error('Error creating loyalty program:', error);
    }
  };

  const getCustomerTier = (points: number) => {
    for (let i = loyaltyTiers.length - 1; i >= 0; i--) {
      if (points >= loyaltyTiers[i].min_points) {
        return loyaltyTiers[i];
      }
    }
    return loyaltyTiers[0];
  };

  const getNextTier = (points: number) => {
    const currentTierIndex = loyaltyTiers.findIndex(tier => points >= tier.min_points);
    if (currentTierIndex > 0) {
      return loyaltyTiers[currentTierIndex - 1];
    }
    return null;
  };

  const calculateProgress = (points: number) => {
    const nextTier = getNextTier(points);
    if (!nextTier) return 100;

    const currentTier = getCustomerTier(points);
    const progress = ((points - currentTier.min_points) / (nextTier.min_points - currentTier.min_points)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Programu ya Uongozi wa Wateja</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Wateja wa Uongozi</p>
                  <p className="text-xl font-bold">{customers.filter(c => c.loyalty_points > 0).length}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-600">Jumla ya Pointi</p>
                  <p className="text-xl font-bold">
                    {customers.reduce((sum, customer) => sum + customer.loyalty_points, 0)}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Crown className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Wateja wa VIP</p>
                  <p className="text-xl font-bold">
                    {customers.filter(c => c.loyalty_points >= 1000).length}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Programu za Uongozi</p>
                  <p className="text-xl font-bold">{loyaltyPrograms.length}</p>
                </div>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex space-x-2">
        <Button
          variant={activeTab === 'customers' ? 'default' : 'outline'}
          onClick={() => setActiveTab('customers')}
        >
          <Users className="h-4 w-4 mr-2" />
          Wateja
        </Button>
        <Button
          variant={activeTab === 'programs' ? 'default' : 'outline'}
          onClick={() => setActiveTab('programs')}
        >
          <Gift className="h-4 w-4 mr-2" />
          Programu
        </Button>
        <Button
          variant={activeTab === 'analytics' ? 'default' : 'outline'}
          onClick={() => setActiveTab('analytics')}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Uchambuzi
        </Button>
      </div>

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          {/* Add Points Section */}
          <Card>
            <CardHeader>
              <CardTitle>Ongeza Pointi kwa Mteja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  className="border rounded p-2"
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const customer = customers.find(c => c.id === e.target.value);
                    setSelectedCustomer(customer || null);
                  }}
                >
                  <option value="">Chagua Mteja</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.loyalty_points} pointi)
                    </option>
                  ))}
                </select>
                
                <Input
                  type="number"
                  placeholder="Idadi ya pointi"
                  value={pointsToAdd}
                  onChange={(e) => setPointsToAdd(e.target.value)}
                />
                
                <Button onClick={addPoints} disabled={!selectedCustomer || !pointsToAdd}>
                  <Zap className="h-4 w-4 mr-2" />
                  Ongeza Pointi
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Customer List */}
          <Card>
            <CardHeader>
              <CardTitle>Orodha ya Wateja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customers.map((customer) => {
                  const tier = getCustomerTier(customer.loyalty_points);
                  const nextTier = getNextTier(customer.loyalty_points);
                  const progress = calculateProgress(customer.loyalty_points);
                  const TierIcon = tier.icon;

                  return (
                    <Card key={customer.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div className={tier.color}>
                            <TierIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{customer.name}</h4>
                            <p className="text-sm text-gray-600">{customer.email || customer.phone}</p>
                            <Badge variant="outline" className={tier.color}>
                              {tier.name}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-lg font-bold">{customer.loyalty_points} pointi</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => redeemReward(customer.id, 100)}
                            disabled={customer.loyalty_points < 100}
                          >
                            Tumia Pointi
                          </Button>
                        </div>
                      </div>

                      {nextTier && (
                        <div className="mt-4">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Mbele ya {nextTier.name}</span>
                            <span>{nextTier.min_points - customer.loyalty_points} pointi</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}

                      <div className="mt-3">
                        <p className="text-sm text-gray-600">Faida:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tier.benefits.map((benefit, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {benefit}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Programs Tab */}
      {activeTab === 'programs' && (
        <div className="space-y-6">
          {/* Create Program */}
          <Card>
            <CardHeader>
              <CardTitle>Tengeneza Programu Mpya</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Jina la Programu"
                  value={newProgram.name}
                  onChange={(e) => setNewProgram({...newProgram, name: e.target.value})}
                />
                
                <Input
                  type="number"
                  placeholder="Pointi kwa TZS"
                  value={newProgram.points_per_tzs}
                  onChange={(e) => setNewProgram({...newProgram, points_per_tzs: Number(e.target.value)})}
                />
                
                <Input
                  type="number"
                  placeholder="Kikomo cha Zawadi"
                  value={newProgram.reward_threshold}
                  onChange={(e) => setNewProgram({...newProgram, reward_threshold: Number(e.target.value)})}
                />
                
                <Input
                  type="number"
                  placeholder="Thamani ya Zawadi (TZS)"
                  value={newProgram.reward_value}
                  onChange={(e) => setNewProgram({...newProgram, reward_value: Number(e.target.value)})}
                />
              </div>
              
              <Button onClick={createLoyaltyProgram} className="w-full">
                <Gift className="h-4 w-4 mr-2" />
                Tengeneza Programu
              </Button>
            </CardContent>
          </Card>

          {/* Existing Programs */}
          <Card>
            <CardHeader>
              <CardTitle>Programu za Uongozi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loyaltyPrograms.map((program) => (
                  <Card key={program.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{program.name}</h4>
                        <p className="text-sm text-gray-600">
                          {program.points_per_tzs} pointi kwa TZS {1}
                        </p>
                        <p className="text-sm text-gray-600">
                          Zawadi ya TZS {program.reward_value.toLocaleString()} kwa pointi {program.reward_threshold}
                        </p>
                      </div>
                      
                      <Badge variant={program.is_active ? 'default' : 'secondary'}>
                        {program.is_active ? 'Inatumika' : 'Imesimamishwa'}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Loyalty Tiers */}
          <Card>
            <CardHeader>
              <CardTitle>Viwango vya Uongozi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {loyaltyTiers.map((tier, index) => {
                  const TierIcon = tier.icon;
                  return (
                    <Card key={index} className="p-4 text-center">
                      <div className={`${tier.color} mb-2`}>
                        <TierIcon className="h-8 w-8 mx-auto" />
                      </div>
                      <h4 className="font-semibold">{tier.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        {tier.min_points}+ pointi
                      </p>
                      <div className="space-y-1">
                        {tier.benefits.map((benefit, i) => (
                          <Badge key={i} variant="outline" className="text-xs block">
                            {benefit}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Uchambuzi wa Uongozi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-4">Mgawanyo wa Viwango</h4>
                  <div className="space-y-3">
                    {loyaltyTiers.map((tier, index) => {
                      const count = customers.filter(c => {
                        const customerTier = getCustomerTier(c.loyalty_points);
                        return customerTier.name === tier.name;
                      }).length;
                      const percentage = customers.length > 0 ? (count / customers.length) * 100 : 0;
                      
                      return (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={tier.color}>
                              <tier.icon className="h-4 w-4" />
                            </div>
                            <span className="text-sm">{tier.name}</span>
                          </div>
                          <div className="text-sm">
                            {count} ({percentage.toFixed(1)}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Takwimu za Jumla</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Wastani wa Pointi:</span>
                      <span className="font-semibold">
                        {customers.length > 0 
                          ? Math.round(customers.reduce((sum, c) => sum + c.loyalty_points, 0) / customers.length)
                          : 0
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Mteja Mwenye Pointi Nyingi:</span>
                      <span className="font-semibold">
                        {customers.length > 0 ? Math.max(...customers.map(c => c.loyalty_points)) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Wateja Wenye Pointi:</span>
                      <span className="font-semibold">
                        {customers.filter(c => c.loyalty_points > 0).length}/{customers.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
