
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Gift, Star, Award, TrendingUp, Users, Crown, 
  Sparkles, Medal, Target, ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
  phone: string;
  total_purchases: number;
  outstanding_balance: number;
}

interface LoyaltyMember {
  customer_id: string;
  customer_name: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  total_spent: number;
  visits: number;
  last_visit: string;
  rewards_claimed: number;
}

interface Reward {
  id: string;
  name: string;
  points_required: number;
  description: string;
  tier_required: 'bronze' | 'silver' | 'gold' | 'platinum';
}

const TIERS = {
  bronze: { name: 'Bronze', minPoints: 0, color: 'bg-orange-600', icon: Medal, multiplier: 1 },
  silver: { name: 'Silver', minPoints: 500, color: 'bg-gray-400', icon: Star, multiplier: 1.5 },
  gold: { name: 'Gold', minPoints: 2000, color: 'bg-yellow-500', icon: Award, multiplier: 2 },
  platinum: { name: 'Platinum', minPoints: 5000, color: 'bg-purple-600', icon: Crown, multiplier: 3 }
};

const DEFAULT_REWARDS: Reward[] = [
  { id: '1', name: 'Punguzo 5%', points_required: 100, description: 'Punguzo la 5% kwenye ununuzi wowote', tier_required: 'bronze' },
  { id: '2', name: 'Punguzo 10%', points_required: 250, description: 'Punguzo la 10% kwenye ununuzi wowote', tier_required: 'silver' },
  { id: '3', name: 'Bidhaa Bure', points_required: 500, description: 'Bidhaa moja bure hadi TZS 10,000', tier_required: 'silver' },
  { id: '4', name: 'Punguzo 20%', points_required: 1000, description: 'Punguzo la 20% kwenye ununuzi wowote', tier_required: 'gold' },
  { id: '5', name: 'VIP Experience', points_required: 2500, description: 'Huduma maalum ya VIP', tier_required: 'platinum' }
];

export const LoyaltyRewardsProgram = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [rewards] = useState<Reward[]>(DEFAULT_REWARDS);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Fetch customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name, phone, total_purchases, outstanding_balance')
        .eq('owner_id', user.id)
        .order('total_purchases', { ascending: false });

      setCustomers(customersData || []);

      // Load loyalty members from localStorage (simulate DB)
      const savedMembers = localStorage.getItem(`loyalty_members_${user.id}`);
      if (savedMembers) {
        setMembers(JSON.parse(savedMembers));
      } else {
        // Initialize loyalty program from existing customers
        const initialMembers: LoyaltyMember[] = (customersData || []).map(c => ({
          customer_id: c.id,
          customer_name: c.name,
          points: Math.floor((c.total_purchases || 0) / 1000), // 1 point per 1000 TZS
          tier: getTierFromPoints(Math.floor((c.total_purchases || 0) / 1000)),
          total_spent: c.total_purchases || 0,
          visits: Math.floor(Math.random() * 20) + 1,
          last_visit: new Date().toISOString(),
          rewards_claimed: 0
        }));
        setMembers(initialMembers);
        localStorage.setItem(`loyalty_members_${user.id}`, JSON.stringify(initialMembers));
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierFromPoints = (points: number): LoyaltyMember['tier'] => {
    if (points >= TIERS.platinum.minPoints) return 'platinum';
    if (points >= TIERS.gold.minPoints) return 'gold';
    if (points >= TIERS.silver.minPoints) return 'silver';
    return 'bronze';
  };

  const saveMembers = (data: LoyaltyMember[]) => {
    setMembers(data);
    localStorage.setItem(`loyalty_members_${user?.id}`, JSON.stringify(data));
  };

  const addPoints = (memberId: string, amount: number) => {
    const pointsToAdd = Math.floor(amount / 1000);
    const updated = members.map(m => {
      if (m.customer_id === memberId) {
        const newPoints = m.points + pointsToAdd;
        return {
          ...m,
          points: newPoints,
          tier: getTierFromPoints(newPoints),
          total_spent: m.total_spent + amount,
          visits: m.visits + 1,
          last_visit: new Date().toISOString()
        };
      }
      return m;
    });
    saveMembers(updated);
    toast.success(`Pointi ${pointsToAdd} zimeongezwa!`);
  };

  const claimReward = (memberId: string, reward: Reward) => {
    const member = members.find(m => m.customer_id === memberId);
    if (!member) return;

    if (member.points < reward.points_required) {
      toast.error('Pointi hazitoshi!');
      return;
    }

    const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
    if (tierOrder.indexOf(member.tier) < tierOrder.indexOf(reward.tier_required)) {
      toast.error(`Unahitaji kuwa ${TIERS[reward.tier_required].name} au zaidi!`);
      return;
    }

    const updated = members.map(m => {
      if (m.customer_id === memberId) {
        return {
          ...m,
          points: m.points - reward.points_required,
          rewards_claimed: m.rewards_claimed + 1
        };
      }
      return m;
    });
    saveMembers(updated);
    toast.success(`Umepata: ${reward.name}!`);
  };

  const getNextTier = (currentTier: string) => {
    const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tierOrder.indexOf(currentTier);
    if (currentIndex < tierOrder.length - 1) {
      return tierOrder[currentIndex + 1] as keyof typeof TIERS;
    }
    return null;
  };

  const getProgressToNextTier = (member: LoyaltyMember) => {
    const nextTier = getNextTier(member.tier);
    if (!nextTier) return 100;
    
    const currentTierMin = TIERS[member.tier].minPoints;
    const nextTierMin = TIERS[nextTier].minPoints;
    const progress = ((member.points - currentTierMin) / (nextTierMin - currentTierMin)) * 100;
    return Math.min(progress, 100);
  };

  // Stats
  const totalMembers = members.length;
  const totalPoints = members.reduce((sum, m) => sum + m.points, 0);
  const platinumMembers = members.filter(m => m.tier === 'platinum').length;
  const goldMembers = members.filter(m => m.tier === 'gold').length;

  const TierIcon = ({ tier }: { tier: keyof typeof TIERS }) => {
    const Icon = TIERS[tier].icon;
    return <Icon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Wanachama</span>
            </div>
            <p className="text-xl font-bold text-purple-600">{totalMembers}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-600" />
              <span className="text-xs text-muted-foreground">Pointi Zote</span>
            </div>
            <p className="text-xl font-bold text-yellow-600">{totalPoints.toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-600/20 to-indigo-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Platinum</span>
            </div>
            <p className="text-xl font-bold text-purple-600">{platinumMembers}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-400/20 to-amber-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-600" />
              <span className="text-xs text-muted-foreground">Gold</span>
            </div>
            <p className="text-xl font-bold text-yellow-600">{goldMembers}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members" className="text-xs">Wanachama</TabsTrigger>
          <TabsTrigger value="rewards" className="text-xs">Zawadi</TabsTrigger>
          <TabsTrigger value="tiers" className="text-xs">Viwango</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4 space-y-2">
          {members.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Hakuna wanachama</p>
              </CardContent>
            </Card>
          ) : (
            members.slice(0, 20).map(member => {
              const tierInfo = TIERS[member.tier];
              const nextTier = getNextTier(member.tier);
              
              return (
                <Card key={member.customer_id}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{member.customer_name}</h4>
                          <Badge className={`${tierInfo.color} text-white text-xs`}>
                            <TierIcon tier={member.tier} />
                            <span className="ml-1">{tierInfo.name}</span>
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {member.points.toLocaleString()} pointi • {member.visits} ziara
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">
                          TZS {member.total_spent.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {nextTier && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>{tierInfo.name}</span>
                          <span>{TIERS[nextTier].name}</span>
                        </div>
                        <Progress value={getProgressToNextTier(member)} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {TIERS[nextTier].minPoints - member.points} pointi zaidi kwa {TIERS[nextTier].name}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="rewards" className="mt-4 space-y-2">
          {rewards.map(reward => {
            const tierInfo = TIERS[reward.tier_required];
            return (
              <Card key={reward.id}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-pink-600" />
                        <h4 className="font-medium text-sm">{reward.name}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">{reward.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {reward.points_required} pointi
                        </Badge>
                        <Badge className={`${tierInfo.color} text-white text-xs`}>
                          {tierInfo.name}+
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="tiers" className="mt-4 space-y-2">
          {Object.entries(TIERS).map(([key, tier]) => {
            const Icon = tier.icon;
            const memberCount = members.filter(m => m.tier === key).length;
            
            return (
              <Card key={key}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tier.color} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{tier.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {tier.minPoints}+ pointi • ×{tier.multiplier} pointi
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{memberCount} wanachama</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoyaltyRewardsProgram;
