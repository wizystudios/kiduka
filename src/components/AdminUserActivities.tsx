import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Search, RefreshCw, User, Calendar } from 'lucide-react';
import { format, subDays, subWeeks, subMonths, startOfYear } from 'date-fns';

const activityLabels: Record<string, { label: string; color: string }> = {
  login: { label: 'Kuingia', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  logout: { label: 'Kutoka', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
  register: { label: 'Kusajili', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  password_reset: { label: 'Reset Nywila', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  password_change: { label: 'Badilisha Nywila', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  product_add: { label: 'Ongeza Bidhaa', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  product_edit: { label: 'Hariri Bidhaa', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  product_delete: { label: 'Futa Bidhaa', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  sale_create: { label: 'Uza', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  sale_complete: { label: 'Mauzo Kamili', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  assistant_add: { label: 'Ongeza Msaidizi', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  assistant_remove: { label: 'Ondoa Msaidizi', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  customer_add: { label: 'Ongeza Mteja', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' },
  expense_add: { label: 'Gharama', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200' },
  loan_create: { label: 'Mkopo Mpya', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  sokoni_order_create: { label: 'Agizo la Sokoni', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' },
  inventory_adjustment: { label: 'Rekebisha Stoki', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200' },
};

type Period = 'today' | 'week' | 'month' | 'year' | 'all';

export const AdminUserActivities = () => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const getDateFilter = (p: Period): string | null => {
    const now = new Date();
    switch (p) {
      case 'today': return subDays(now, 1).toISOString();
      case 'week': return subWeeks(now, 1).toISOString();
      case 'month': return subMonths(now, 1).toISOString();
      case 'year': return startOfYear(now).toISOString();
      default: return null;
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      const dateFilter = getDateFilter(period);
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      if (selectedType !== 'all') {
        query = query.eq('activity_type', selectedType);
      }

      const { data, error } = await query as any;
      if (error) throw error;

      // Fetch user profiles for activities
      const userIds = [...new Set((data || []).map((a: any) => a.user_id))];
      let profiles: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email, business_name')
          .in('id', userIds);
        
        (profileData || []).forEach((p: any) => {
          profiles[p.id] = p;
        });
      }

      const enriched = (data || []).map((a: any) => ({
        ...a,
        profile: profiles[a.user_id] || null,
      }));

      setActivities(enriched);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [period, selectedType]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-activities')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_activities' }, () => {
        fetchActivities();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [period, selectedType]);

  const filtered = activities.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.description?.toLowerCase().includes(q) ||
      a.profile?.full_name?.toLowerCase().includes(q) ||
      a.profile?.email?.toLowerCase().includes(q) ||
      a.activity_type?.toLowerCase().includes(q)
    );
  });

  const activityCounts = activities.reduce((acc: Record<string, number>, a) => {
    acc[a.activity_type] = (acc[a.activity_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{activities.length}</p>
            <p className="text-xs text-muted-foreground">Jumla Shughuli</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{activityCounts['login'] || 0}</p>
            <p className="text-xs text-muted-foreground">Kuingia</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{activityCounts['register'] || 0}</p>
            <p className="text-xs text-muted-foreground">Kusajili</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{activityCounts['sale_create'] || 0}</p>
            <p className="text-xs text-muted-foreground">Mauzo</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[140px]">
            <Calendar className="h-4 w-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Leo</SelectItem>
            <SelectItem value="week">Wiki Hii</SelectItem>
            <SelectItem value="month">Mwezi Huu</SelectItem>
            <SelectItem value="year">Mwaka Huu</SelectItem>
            <SelectItem value="all">Zote</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[160px]">
            <Activity className="h-4 w-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Aina Zote</SelectItem>
            {Object.entries(activityLabels).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tafuta shughuli..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button variant="outline" size="icon" onClick={fetchActivities} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Activity List */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-2">
          {filtered.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Hakuna shughuli zilizopatikana</p>
            </div>
          )}
          {filtered.map((activity) => {
            const label = activityLabels[activity.activity_type] || { label: activity.activity_type, color: 'bg-muted text-muted-foreground' };
            return (
              <Card key={activity.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-3 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">
                        {activity.profile?.full_name || 'Mtumiaji'}
                      </span>
                      <Badge variant="secondary" className={`text-[10px] ${label.color}`}>
                        {label.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span>{activity.profile?.email}</span>
                      <span>•</span>
                      <span>{format(new Date(activity.created_at), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
