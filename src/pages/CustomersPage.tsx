
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, Users, Mail, Phone, MapPin, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyalty_points: number;
  created_at: string;
}

export const CustomersPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    loyalty_points: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers...');
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }
      
      console.log('Customers loaded:', data?.length || 0);
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kupakia wateja',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!customerData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Customer name is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update({
            name: customerData.name,
            email: customerData.email || null,
            phone: customerData.phone || null,
            address: customerData.address || null,
            loyalty_points: customerData.loyalty_points,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Customer updated successfully' });
      } else {
        const { error } = await supabase
          .from('customers')
          .insert({
            name: customerData.name,
            email: customerData.email || null,
            phone: customerData.phone || null,
            address: customerData.address || null,
            loyalty_points: customerData.loyalty_points
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Customer added successfully' });
      }

      setCustomerData({ name: '', email: '', phone: '', address: '', loyalty_points: 0 });
      setEditingCustomer(null);
      setDialogOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({
        title: 'Error',
        description: 'Failed to save customer',
        variant: 'destructive'
      });
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setCustomerData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      loyalty_points: customer.loyalty_points
    });
    setEditingCustomer(customer);
    setDialogOpen(true);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setCustomers(customers.filter(c => c.id !== id));
      toast({ title: 'Success', description: 'Customer deleted successfully' });
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete customer',
        variant: 'destructive'
      });
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usimamizi wa Wateja</h2>
          <p className="text-gray-600">Simamia wateja na pointi za utii</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Ongeza Mteja
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Hariri Mteja' : 'Ongeza Mteja Mpya'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Jina *</Label>
                <Input
                  id="name"
                  value={customerData.name}
                  onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                  placeholder="Jina la mteja"
                />
              </div>
              <div>
                <Label htmlFor="email">Barua Pepe</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                  placeholder="mteja@email.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Simu</Label>
                <Input
                  id="phone"
                  value={customerData.phone}
                  onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                  placeholder="+255 123 456 789"
                />
              </div>
              <div>
                <Label htmlFor="address">Anwani</Label>
                <Input
                  id="address"
                  value={customerData.address}
                  onChange={(e) => setCustomerData({...customerData, address: e.target.value})}
                  placeholder="Anwani ya mteja"
                />
              </div>
              <div>
                <Label htmlFor="loyalty_points">Pointi za Utii</Label>
                <Input
                  id="loyalty_points"
                  type="number"
                  value={customerData.loyalty_points}
                  onChange={(e) => setCustomerData({...customerData, loyalty_points: parseInt(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              <Button onClick={handleSaveCustomer} className="w-full bg-blue-600 hover:bg-blue-700">
                {editingCustomer ? 'Sasisha Mteja' : 'Ongeza Mteja'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search customers by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-4">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{customer.name}</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      {customer.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.address && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span>{customer.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-center">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold">{customer.loyalty_points}</span>
                    </div>
                    <p className="text-xs text-gray-500">Points</p>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleEditCustomer(customer)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteCustomer(customer.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Start by adding your first customer"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
