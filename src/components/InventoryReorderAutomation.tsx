
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { 
  Package, AlertTriangle, ShoppingCart, TrendingUp, Plus, Truck, 
  Bell, Settings, RefreshCw, Check, Clock, Building
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  cost_price: number;
  price: number;
}

interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  products: string[];
}

interface ReorderRule {
  id: string;
  product_id: string;
  product_name: string;
  trigger_threshold: number;
  reorder_quantity: number;
  supplier_id: string;
  supplier_name: string;
  is_active: boolean;
}

interface PurchaseOrder {
  id: string;
  product_name: string;
  quantity: number;
  supplier_name: string;
  status: 'pending' | 'ordered' | 'shipped' | 'received';
  created_at: string;
  total_cost: number;
}

export const InventoryReorderAutomation = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [reorderRules, setReorderRules] = useState<ReorderRule[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const { user } = useAuth();

  const [newRule, setNewRule] = useState({
    product_id: '',
    trigger_threshold: 10,
    reorder_quantity: 50,
    supplier_id: ''
  });

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Fetch products
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, stock_quantity, low_stock_threshold, cost_price, price')
        .eq('owner_id', user.id)
        .order('name');

      setProducts(productsData || []);

      // Load suppliers and rules from localStorage (simulate DB)
      const savedSuppliers = localStorage.getItem(`suppliers_${user.id}`);
      const savedRules = localStorage.getItem(`reorder_rules_${user.id}`);
      const savedOrders = localStorage.getItem(`purchase_orders_${user.id}`);

      if (savedSuppliers) setSuppliers(JSON.parse(savedSuppliers));
      if (savedRules) setReorderRules(JSON.parse(savedRules));
      if (savedOrders) setPurchaseOrders(JSON.parse(savedOrders));

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSuppliers = (data: Supplier[]) => {
    setSuppliers(data);
    localStorage.setItem(`suppliers_${user?.id}`, JSON.stringify(data));
  };

  const saveRules = (data: ReorderRule[]) => {
    setReorderRules(data);
    localStorage.setItem(`reorder_rules_${user?.id}`, JSON.stringify(data));
  };

  const saveOrders = (data: PurchaseOrder[]) => {
    setPurchaseOrders(data);
    localStorage.setItem(`purchase_orders_${user?.id}`, JSON.stringify(data));
  };

  const handleAddSupplier = () => {
    if (!newSupplier.name || !newSupplier.phone) {
      toast.error('Jaza jina na simu ya msambazaji');
      return;
    }

    const supplier: Supplier = {
      id: Date.now().toString(),
      name: newSupplier.name,
      phone: newSupplier.phone,
      email: newSupplier.email,
      products: []
    };

    saveSuppliers([...suppliers, supplier]);
    setNewSupplier({ name: '', phone: '', email: '' });
    setSupplierDialogOpen(false);
    toast.success('Msambazaji ameongezwa');
  };

  const handleAddRule = () => {
    if (!newRule.product_id || !newRule.supplier_id) {
      toast.error('Chagua bidhaa na msambazaji');
      return;
    }

    const product = products.find(p => p.id === newRule.product_id);
    const supplier = suppliers.find(s => s.id === newRule.supplier_id);

    if (!product || !supplier) return;

    const rule: ReorderRule = {
      id: Date.now().toString(),
      product_id: newRule.product_id,
      product_name: product.name,
      trigger_threshold: newRule.trigger_threshold,
      reorder_quantity: newRule.reorder_quantity,
      supplier_id: newRule.supplier_id,
      supplier_name: supplier.name,
      is_active: true
    };

    saveRules([...reorderRules, rule]);
    setNewRule({ product_id: '', trigger_threshold: 10, reorder_quantity: 50, supplier_id: '' });
    setDialogOpen(false);
    toast.success('Kanuni ya kuagiza imeongezwa');
  };

  const toggleRule = (ruleId: string) => {
    const updated = reorderRules.map(r => 
      r.id === ruleId ? { ...r, is_active: !r.is_active } : r
    );
    saveRules(updated);
  };

  const deleteRule = (ruleId: string) => {
    const updated = reorderRules.filter(r => r.id !== ruleId);
    saveRules(updated);
    toast.success('Kanuni imefutwa');
  };

  const createPurchaseOrder = (rule: ReorderRule) => {
    const product = products.find(p => p.id === rule.product_id);
    if (!product) return;

    const order: PurchaseOrder = {
      id: Date.now().toString(),
      product_name: rule.product_name,
      quantity: rule.reorder_quantity,
      supplier_name: rule.supplier_name,
      status: 'pending',
      created_at: new Date().toISOString(),
      total_cost: (product.cost_price || 0) * rule.reorder_quantity
    };

    saveOrders([order, ...purchaseOrders]);
    toast.success(`Oda ya ${rule.product_name} imeundwa`);
  };

  const updateOrderStatus = (orderId: string, status: PurchaseOrder['status']) => {
    const updated = purchaseOrders.map(o => 
      o.id === orderId ? { ...o, status } : o
    );
    saveOrders(updated);
    toast.success('Hali ya oda imebadilishwa');
  };

  const checkAutoReorder = () => {
    let ordersCreated = 0;
    
    reorderRules.forEach(rule => {
      if (!rule.is_active) return;
      
      const product = products.find(p => p.id === rule.product_id);
      if (!product) return;

      if (product.stock_quantity <= rule.trigger_threshold) {
        // Check if there's already a pending order for this product
        const existingOrder = purchaseOrders.find(
          o => o.product_name === rule.product_name && 
          (o.status === 'pending' || o.status === 'ordered' || o.status === 'shipped')
        );

        if (!existingOrder) {
          createPurchaseOrder(rule);
          ordersCreated++;
        }
      }
    });

    if (ordersCreated > 0) {
      toast.success(`Oda ${ordersCreated} zimeundwa otomatiki`);
    } else {
      toast.info('Hakuna bidhaa zinazohitaji kuagizwa');
    }
  };

  const lowStockProducts = products.filter(p => p.stock_quantity <= p.low_stock_threshold);
  const activeRules = reorderRules.filter(r => r.is_active).length;
  const pendingOrders = purchaseOrders.filter(o => o.status !== 'received').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'ordered': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'received': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Inasubiri';
      case 'ordered': return 'Imeagizwa';
      case 'shipped': return 'Imesafirishwa';
      case 'received': return 'Imepokelewa';
      default: return status;
    }
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
        <Card className="bg-red-500/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-xs text-muted-foreground">Stock Ndogo</span>
            </div>
            <p className="text-xl font-bold text-red-600">{lowStockProducts.length}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-500/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Kanuni</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{activeRules}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-orange-500/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-muted-foreground">Oda Zinazosubiri</span>
            </div>
            <p className="text-xl font-bold text-orange-600">{pendingOrders}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-green-500/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Wasambazaji</span>
            </div>
            <p className="text-xl font-bold text-green-600">{suppliers.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Auto Reorder Button */}
      <Button onClick={checkAutoReorder} className="w-full">
        <RefreshCw className="h-4 w-4 mr-2" />
        Angalia na Agiza Otomatiki
      </Button>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="text-xs">Stock</TabsTrigger>
          <TabsTrigger value="rules" className="text-xs">Kanuni</TabsTrigger>
          <TabsTrigger value="orders" className="text-xs">Oda</TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs">Wasambazaji</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-2">
          {lowStockProducts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Package className="h-10 w-10 mx-auto mb-2 text-green-600" />
                <p className="text-sm text-muted-foreground">Stock zote ziko vizuri!</p>
              </CardContent>
            </Card>
          ) : (
            lowStockProducts.map(product => (
              <Card key={product.id} className="border-l-4 border-l-red-500">
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-sm">{product.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        Stock: {product.stock_quantity} / Kiwango: {product.low_stock_threshold}
                      </p>
                    </div>
                    <Badge className="bg-red-100 text-red-800 text-xs">Chini</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="rules" className="mt-4 space-y-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Ongeza Kanuni
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Kanuni Mpya ya Kuagiza</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Bidhaa</Label>
                  <Select value={newRule.product_id} onValueChange={v => setNewRule({...newRule, product_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chagua bidhaa" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kiwango cha Kuagiza (stock ikifika)</Label>
                  <Input
                    type="number"
                    value={newRule.trigger_threshold}
                    onChange={e => setNewRule({...newRule, trigger_threshold: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Kiasi cha Kuagiza</Label>
                  <Input
                    type="number"
                    value={newRule.reorder_quantity}
                    onChange={e => setNewRule({...newRule, reorder_quantity: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Msambazaji</Label>
                  <Select value={newRule.supplier_id} onValueChange={v => setNewRule({...newRule, supplier_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chagua msambazaji" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddRule} className="w-full">Ongeza</Button>
              </div>
            </DialogContent>
          </Dialog>

          {reorderRules.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Settings className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Hakuna kanuni za kuagiza</p>
              </CardContent>
            </Card>
          ) : (
            reorderRules.map(rule => (
              <Card key={rule.id}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{rule.product_name}</h4>
                      <p className="text-xs text-muted-foreground">
                        Agiza {rule.reorder_quantity} wakati stock ≤ {rule.trigger_threshold}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <Truck className="h-3 w-3 inline mr-1" />
                        {rule.supplier_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => toggleRule(rule.id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRule(rule.id)}
                        className="h-7 w-7 p-0 text-red-500"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-4 space-y-2">
          {purchaseOrders.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Hakuna oda</p>
              </CardContent>
            </Card>
          ) : (
            purchaseOrders.map(order => (
              <Card key={order.id}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-sm">{order.product_name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {order.quantity} vipande • TZS {order.total_cost.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <Truck className="h-3 w-3 inline mr-1" />
                        {order.supplier_name}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                      {order.status !== 'received' && (
                        <Select
                          value={order.status}
                          onValueChange={(v) => updateOrderStatus(order.id, v as PurchaseOrder['status'])}
                        >
                          <SelectTrigger className="h-6 text-xs w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Inasubiri</SelectItem>
                            <SelectItem value="ordered">Imeagizwa</SelectItem>
                            <SelectItem value="shipped">Imesafirishwa</SelectItem>
                            <SelectItem value="received">Imepokelewa</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4 space-y-2">
          <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Ongeza Msambazaji
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Msambazaji Mpya</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Jina</Label>
                  <Input
                    value={newSupplier.name}
                    onChange={e => setNewSupplier({...newSupplier, name: e.target.value})}
                    placeholder="Jina la msambazaji"
                  />
                </div>
                <div>
                  <Label>Simu</Label>
                  <Input
                    value={newSupplier.phone}
                    onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})}
                    placeholder="0712345678"
                  />
                </div>
                <div>
                  <Label>Barua Pepe</Label>
                  <Input
                    type="email"
                    value={newSupplier.email}
                    onChange={e => setNewSupplier({...newSupplier, email: e.target.value})}
                    placeholder="email@example.com"
                  />
                </div>
                <Button onClick={handleAddSupplier} className="w-full">Ongeza</Button>
              </div>
            </DialogContent>
          </Dialog>

          {suppliers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Building className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Hakuna wasambazaji</p>
              </CardContent>
            </Card>
          ) : (
            suppliers.map(supplier => (
              <Card key={supplier.id}>
                <CardContent className="p-3">
                  <h4 className="font-medium text-sm">{supplier.name}</h4>
                  <p className="text-xs text-muted-foreground">{supplier.phone}</p>
                  {supplier.email && (
                    <p className="text-xs text-muted-foreground">{supplier.email}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryReorderAutomation;
