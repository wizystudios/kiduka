import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Store, 
  Plus,
  Search,
  MapPin,
  Clock,
  AlertCircle,
  ShoppingCart,
  Package
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MarketplaceListing {
  id: string;
  seller_id: string;
  seller_name: string;
  product_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  category: string | null;
  location: string | null;
  listing_type: 'sell' | 'buy' | 'trade' | 'emergency_share';
  expires_at: string | null;
  created_at: string;
  is_active: boolean | null;
}

export const CommunityMarketplace = () => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListing, setNewListing] = useState({
    product_name: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    category: '',
    location: '',
    listing_type: 'sell' as const,
    expires_in_days: 7
  });

  useEffect(() => {
    fetchListings();
    if (user) fetchMyListings();
  }, [user]);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add seller name from a separate query since we don't have a direct relation
      const enrichedData = await Promise.all(
        (data || []).map(async (item) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', item.seller_id)
            .single();

          return {
            ...item,
            seller_name: profile?.full_name || 'Anonymous',
            listing_type: item.listing_type as 'sell' | 'buy' | 'trade' | 'emergency_share'
          };
        })
      );

      setListings(enrichedData);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyListings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const typedData = (data || []).map(item => ({
        ...item,
        seller_name: userProfile?.full_name || 'You',
        listing_type: item.listing_type as 'sell' | 'buy' | 'trade' | 'emergency_share'
      }));
      
      setMyListings(typedData);
    } catch (error) {
      console.error('Error fetching my listings:', error);
    }
  };

  const createListing = async () => {
    if (!user || !newListing.product_name.trim()) return;

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + newListing.expires_in_days);

      const { error } = await supabase
        .from('marketplace_listings')
        .insert({
          seller_id: user.id,
          product_name: newListing.product_name,
          description: newListing.description,
          quantity: newListing.quantity,
          unit_price: newListing.unit_price,
          category: newListing.category,
          location: newListing.location || userProfile?.business_name || 'Location not specified',
          listing_type: newListing.listing_type,
          expires_at: expiresAt.toISOString(),
          is_active: true
        });

      if (error) throw error;

      toast({
        title: 'Tangazo Limeongezwa',
        description: 'Tangazo lako limeongezwa kwenye soko la jamii',
      });

      setShowCreateModal(false);
      setNewListing({
        product_name: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        category: '',
        location: '',
        listing_type: 'sell',
        expires_in_days: 7
      });

      fetchListings();
      fetchMyListings();
    } catch (error) {
      console.error('Error creating listing:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kuongeza tangazo',
        variant: 'destructive'
      });
    }
  };

  const toggleListingStatus = async (listingId: string, isActive: boolean | null) => {
    try {
      const { error } = await supabase
        .from('marketplace_listings')
        .update({ is_active: !isActive })
        .eq('id', listingId);

      if (error) throw error;

      toast({
        title: 'Mabadiliko Yamehifadhiwa',
        description: `Tangazo ${!isActive ? 'limeamilishwa' : 'limezimwa'}`,
      });

      fetchMyListings();
      fetchListings();
    } catch (error) {
      console.error('Error toggling listing status:', error);
    }
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || listing.category === selectedCategory;
    const matchesType = selectedType === 'all' || listing.listing_type === selectedType;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const getListingTypeColor = (type: string) => {
    switch (type) {
      case 'sell': return 'bg-green-100 text-green-800';
      case 'buy': return 'bg-blue-100 text-blue-800';
      case 'trade': return 'bg-purple-100 text-purple-800';
      case 'emergency_share': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getListingTypeLabel = (type: string) => {
    switch (type) {
      case 'sell': return 'Unauzwa';
      case 'buy': return 'Anahitaji';
      case 'trade': return 'Kubadilishana';
      case 'emergency_share': return 'Msaada wa Dharura';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Soko la Jamii</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ongeza Tangazo
        </Button>
      </div>

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse">Vuruga Soko</TabsTrigger>
          <TabsTrigger value="my-listings">Matangazo Yangu</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tafuta bidhaa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kategoria Zote</SelectItem>
                <SelectItem value="food">Chakula</SelectItem>
                <SelectItem value="electronics">Vifaa vya Umeme</SelectItem>
                <SelectItem value="clothing">Nguo</SelectItem>
                <SelectItem value="household">Vifaa vya Nyumbani</SelectItem>
                <SelectItem value="other">Mengineyo</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Aina ya Tangazo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Aina Zote</SelectItem>
                <SelectItem value="sell">Unauzwa</SelectItem>
                <SelectItem value="buy">Anahitaji</SelectItem>
                <SelectItem value="trade">Kubadilishana</SelectItem>
                <SelectItem value="emergency_share">Msaada wa Dharura</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Listings Grid */}
          <div className="grid gap-4">
            {filteredListings.map((listing) => (
              <Card key={listing.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{listing.product_name}</CardTitle>
                      <p className="text-sm text-gray-600">na {listing.seller_name}</p>
                    </div>
                    <Badge className={getListingTypeColor(listing.listing_type)}>
                      {getListingTypeLabel(listing.listing_type)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {listing.description && (
                    <p className="text-sm text-gray-700">{listing.description}</p>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">Vipimo: {listing.quantity}</span>
                      </div>
                      {listing.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{listing.location}</span>
                        </div>
                      )}
                    </div>
                    
                    {listing.listing_type === 'sell' && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          TZS {listing.unit_price.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                    </div>
                    {listing.expires_at && (
                      <span>
                        Inaisha: {new Date(listing.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <Button variant="outline" className="w-full">
                    <Store className="h-4 w-4 mr-2" />
                    Wasiliana na Muuzaji
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="my-listings" className="space-y-4">
          <div className="grid gap-4">
            {myListings.map((listing) => (
              <Card key={listing.id} className={!listing.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{listing.product_name}</CardTitle>
                      <Badge className={getListingTypeColor(listing.listing_type)}>
                        {getListingTypeLabel(listing.listing_type)}
                      </Badge>
                    </div>
                    <Badge variant={listing.is_active ? 'default' : 'secondary'}>
                      {listing.is_active ? 'Amilifu' : 'Zimwa'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {listing.description && (
                    <p className="text-sm text-gray-700">{listing.description}</p>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Vipimo: {listing.quantity}</span>
                    {listing.listing_type === 'sell' && (
                      <span className="text-lg font-bold text-green-600">
                        TZS {listing.unit_price.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={() => toggleListingStatus(listing.id, listing.is_active)}
                    variant="outline"
                    className="w-full"
                  >
                    {listing.is_active ? 'Zima Tangazo' : 'Amilisha Tangazo'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Listing Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Ongeza Tangazo Jipya</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Jina la Bidhaa</label>
                <Input
                  value={newListing.product_name}
                  onChange={(e) => setNewListing({...newListing, product_name: e.target.value})}
                  placeholder="Weka jina la bidhaa"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Maelezo</label>
                <Input
                  value={newListing.description}
                  onChange={(e) => setNewListing({...newListing, description: e.target.value})}
                  placeholder="Maelezo ya bidhaa"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Aina ya Tangazo</label>
                <Select 
                  value={newListing.listing_type} 
                  onValueChange={(value: any) => setNewListing({...newListing, listing_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sell">Unauzwa</SelectItem>
                    <SelectItem value="buy">Anahitaji</SelectItem>
                    <SelectItem value="trade">Kubadilishana</SelectItem>
                    <SelectItem value="emergency_share">Msaada wa Dharura</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Vipimo</label>
                  <Input
                    type="number"
                    value={newListing.quantity}
                    onChange={(e) => setNewListing({...newListing, quantity: Number(e.target.value)})}
                  />
                </div>
                
                {newListing.listing_type === 'sell' && (
                  <div>
                    <label className="text-sm font-medium">Bei (TZS)</label>
                    <Input
                      type="number"
                      value={newListing.unit_price}
                      onChange={(e) => setNewListing({...newListing, unit_price: Number(e.target.value)})}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Kategoria</label>
                <Select 
                  value={newListing.category} 
                  onValueChange={(value) => setNewListing({...newListing, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chagua kategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food">Chakula</SelectItem>
                    <SelectItem value="electronics">Vifaa vya Umeme</SelectItem>
                    <SelectItem value="clothing">Nguo</SelectItem>
                    <SelectItem value="household">Vifaa vya Nyumbani</SelectItem>
                    <SelectItem value="other">Mengineyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={createListing}
                  disabled={!newListing.product_name.trim()}
                  className="flex-1"
                >
                  Ongeza Tangazo
                </Button>
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Ghairi
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
