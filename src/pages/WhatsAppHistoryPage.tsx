import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDataAccess } from '@/hooks/useDataAccess';
import { BackButton } from '@/components/BackButton';
import { MessageSquare, Search, FileSpreadsheet, FileText, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { exportToExcel, exportToPDF, createPrintableTable, ExportColumn } from '@/utils/exportUtils';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

interface WhatsAppMessageRecord {
  id: string;
  owner_id: string;
  customer_id: string | null;
  customer_name: string;
  phone_number: string;
  message: string;
  message_type: string;
  status: string;
  created_at: string;
}

export const WhatsAppHistoryPage = () => {
  const { user, userProfile } = useAuth();
  const { dataOwnerId } = useDataAccess();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('customer_id');
  const customerName = searchParams.get('customer_name');

  const [messages, setMessages] = useState<WhatsAppMessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [ownerProfiles, setOwnerProfiles] = useState<Record<string, string>>({});
  const [selectedMsg, setSelectedMsg] = useState<WhatsAppMessageRecord | null>(null);
  const isSuperAdmin = userProfile?.role === 'super_admin';

  useEffect(() => {
    fetchMessages();
  }, [user, dataOwnerId, customerId]);

  const fetchMessages = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isSuperAdmin && dataOwnerId) {
        query = query.eq('owner_id', dataOwnerId);
      }

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMessages(data || []);

      if (isSuperAdmin && data?.length) {
        const ownerIds = [...new Set(data.map(m => m.owner_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, business_name, email')
          .in('id', ownerIds);
        
        const map: Record<string, string> = {};
        profiles?.forEach(p => {
          map[p.id] = p.business_name || p.full_name || p.email || 'N/A';
        });
        setOwnerProfiles(map);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = messages.filter(m => {
    const matchesSearch = search === '' || 
      m.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      m.phone_number.includes(search) ||
      m.message.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesType = typeFilter === 'all' || m.message_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent': return 'Imetumwa';
      case 'sent_wa_link': return 'Via Link';
      case 'failed': return 'Imeshindwa';
      default: return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'debt_reminder': return 'Deni';
      case 'receipt': return 'Risiti';
      case 'order': return 'Agizo';
      case 'inventory_alert': return 'Hifadhi';
      default: return 'Kawaida';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent': return <Badge className="bg-green-100 text-green-800">Imetumwa</Badge>;
      case 'sent_wa_link': return <Badge className="bg-blue-100 text-blue-800">Link</Badge>;
      case 'failed': return <Badge variant="destructive">Imeshindwa</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'debt_reminder': return <Badge variant="outline" className="border-orange-400 text-orange-600">Deni</Badge>;
      case 'receipt': return <Badge variant="outline" className="border-blue-400 text-blue-600">Risiti</Badge>;
      case 'order': return <Badge variant="outline" className="border-green-400 text-green-600">Agizo</Badge>;
      case 'inventory_alert': return <Badge variant="outline" className="border-red-400 text-red-600">Hifadhi</Badge>;
      default: return <Badge variant="outline">Kawaida</Badge>;
    }
  };

  const exportColumns: ExportColumn[] = [
    { header: 'Mteja', key: 'customer_name' },
    { header: 'Simu', key: 'phone_number' },
    { header: 'Ujumbe', key: 'message' },
    { header: 'Aina', key: 'message_type', formatter: (v) => getTypeText(v) },
    { header: 'Hali', key: 'status', formatter: (v) => getStatusText(v) },
    { header: 'Tarehe', key: 'created_at', formatter: (v) => format(new Date(v), 'dd/MM/yyyy HH:mm') },
  ];

  const handleExportExcel = () => {
    const success = exportToExcel(filtered, exportColumns, 'WhatsApp_Historia');
    if (success) toast.success('Excel imesafirishwa!');
  };

  const handleExportPDF = () => {
    const tableHtml = createPrintableTable(filtered, exportColumns, 'Historia ya WhatsApp');
    const statsHtml = `
      <div class="stats">
        <div class="stat-card"><strong>${messages.length}</strong><br/>Jumla</div>
        <div class="stat-card"><strong>${messages.filter(m => m.status === 'sent').length}</strong><br/>Zilizotumwa</div>
        <div class="stat-card"><strong>${messages.filter(m => m.status === 'failed').length}</strong><br/>Zilizoshindwa</div>
      </div>
    `;
    exportToPDF('Historia ya WhatsApp', statsHtml + tableHtml);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-7 w-7 text-green-600" />
              Historia ya WhatsApp
            </h1>
            <p className="text-muted-foreground mt-1">
              {customerName 
                ? `Ujumbe kwa ${customerName}` 
                : isSuperAdmin 
                  ? 'Ujumbe wote wa WhatsApp wa watumiaji wote' 
                  : 'Ujumbe wako wote wa WhatsApp'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={filtered.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={filtered.length === 0}>
            <FileText className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{messages.length}</p>
            <p className="text-xs text-muted-foreground">Jumla</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{messages.filter(m => m.status === 'sent').length}</p>
            <p className="text-xs text-muted-foreground">Zilizotumwa</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{messages.filter(m => m.status === 'sent_wa_link').length}</p>
            <p className="text-xs text-muted-foreground">Via Link</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{messages.filter(m => m.status === 'failed').length}</p>
            <p className="text-xs text-muted-foreground">Zilizoshindwa</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tafuta jina, namba, ujumbe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Hali" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Zote</SelectItem>
                <SelectItem value="sent">Imetumwa</SelectItem>
                <SelectItem value="sent_wa_link">Via Link</SelectItem>
                <SelectItem value="failed">Imeshindwa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Aina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Zote</SelectItem>
                <SelectItem value="debt_reminder">Deni</SelectItem>
                <SelectItem value="receipt">Risiti</SelectItem>
                <SelectItem value="order">Agizo</SelectItem>
                <SelectItem value="general">Kawaida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ujumbe ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Inapakia...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Hakuna ujumbe wa WhatsApp bado</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isSuperAdmin && <TableHead>Biashara</TableHead>}
                    <TableHead>Mteja</TableHead>
                    <TableHead>Simu</TableHead>
                    <TableHead>Ujumbe</TableHead>
                    <TableHead>Aina</TableHead>
                    <TableHead>Hali</TableHead>
                    <TableHead>Tarehe</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((msg) => (
                    <TableRow key={msg.id}>
                      {isSuperAdmin && (
                        <TableCell className="font-medium text-xs">
                          {ownerProfiles[msg.owner_id] || msg.owner_id.slice(0, 8)}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{msg.customer_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{msg.phone_number}</TableCell>
                      <TableCell className="max-w-[200px] md:max-w-[300px] truncate text-sm">
                        {msg.message}
                      </TableCell>
                      <TableCell>{getTypeBadge(msg.message_type)}</TableCell>
                      <TableCell>{getStatusBadge(msg.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(msg.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMsg(msg)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Detail Dialog */}
      <Dialog open={!!selectedMsg} onOpenChange={(open) => !open && setSelectedMsg(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              Ujumbe wa WhatsApp
            </DialogTitle>
          </DialogHeader>
          {selectedMsg && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Mteja</p>
                  <p className="font-medium">{selectedMsg.customer_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Simu</p>
                  <p className="font-medium">{selectedMsg.phone_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Aina</p>
                  {getTypeBadge(selectedMsg.message_type)}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Hali</p>
                  {getStatusBadge(selectedMsg.status)}
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Tarehe</p>
                  <p className="font-medium">{format(new Date(selectedMsg.created_at), 'dd/MM/yyyy HH:mm:ss')}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Ujumbe</p>
                <ScrollArea className="h-[200px]">
                  <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                    {selectedMsg.message}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
