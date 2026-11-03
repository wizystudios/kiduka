import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Clock, DollarSign, QrCode, UserPlus, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { notificationPath, saveNotificationDetail } from '@/lib/notificationDetails';

export interface AdminFeedItem {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const iconFor = (t: string) => {
  if (t === 'new_user') return <UserPlus className="h-4 w-4 text-primary" />;
  if (t === 'large_transaction') return <DollarSign className="h-4 w-4 text-secondary" />;
  if (t === 'subscription_request') return <CreditCard className="h-4 w-4 text-primary" />;
  return <Bell className="h-4 w-4 text-muted-foreground" />;
};

const formatTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Dak ${Math.max(mins, 0)} zilizopita`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `Saa ${hrs} zilizopita`;
  return `Siku ${Math.floor(diff / 86400000)} zilizopita`;
};

const groupOf = (iso: string) => {
  const days = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (days < 1) return 'Leo';
  if (days < 7) return 'Wiki hii';
  if (days < 14) return 'Wiki iliyopita';
  return 'Za zamani';
};

interface Props {
  notifications: AdminFeedItem[];
  unreadCount: number;
  onRead: (id: string) => void;
  onReadAll: () => void;
  onClose?: () => void;
}

export const AdminNotificationFeed = ({ notifications, unreadCount, onRead, onReadAll, onClose }: Props) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.is_read;
    return n.notification_type === filter;
  }), [notifications, filter]);

  const groups = ['Leo', 'Wiki hii', 'Wiki iliyopita', 'Za zamani']
    .map((g) => ({ g, items: filtered.filter((n) => groupOf(n.created_at) === g) }))
    .filter((x) => x.items.length > 0);

  const open = (n: AdminFeedItem) => {
    const id = `admin-${n.id}`;
    saveNotificationDetail({ id, title: n.title, description: n.message, kind: n.notification_type, createdAt: n.created_at, source: '/super-admin' });
    onRead(n.id);
    onClose?.();
    navigate(notificationPath(id));
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center gap-1 pb-2">
        <h2 className="flex-1 text-xl font-semibold">Taarifa</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger aria-label="Chuja" className="h-9 w-auto gap-1 rounded-xl border-primary/30 px-2 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Zote ({notifications.length})</SelectItem>
            <SelectItem value="unread">Mpya ({unreadCount})</SelectItem>
            <SelectItem value="new_user">Watumiaji wapya</SelectItem>
            <SelectItem value="large_transaction">Miamala mikubwa</SelectItem>
            <SelectItem value="subscription_request">Usajili</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" title="Soma zote" onClick={onReadAll} className="h-9 w-9 rounded-xl"><CheckCheck className="h-4 w-4" /></Button>
      </div>
      <ScrollArea className="h-[60vh] pr-2">
        {unreadCount === 0 && (
          <div className="flex flex-col items-center py-6 text-center">
            <p className="font-semibold">Uko sawa kabisa!</p>
            <p className="text-xs text-muted-foreground">Huna taarifa mpya kwa sasa</p>
            <div className="relative mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Bell className="h-10 w-10 text-primary" />
              <span className="absolute right-2 top-5 h-3 w-7 rounded-full bg-secondary ring-2 ring-background" />
            </div>
          </div>
        )}
        {groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Hakuna taarifa</p>
        ) : groups.map(({ g, items }) => (
          <section key={g} className="mt-3">
            <div className="mb-2 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-primary">{g}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {items.map((n) => (
                <Button variant="ghost" key={n.id} onClick={() => open(n)}
                  className={`flex h-auto w-full items-start gap-3 whitespace-normal rounded-2xl border p-3 text-left shadow-sm transition hover:shadow-md active:scale-[0.99] ${!n.is_read ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    {iconFor(n.notification_type)}
                    {!n.is_read && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="flex-1 truncate text-sm font-medium">{n.title}</h4>
                      <span className="shrink-0 text-[10px] text-muted-foreground"><Clock className="mr-0.5 inline h-2.5 w-2.5" />{formatTime(n.created_at)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-foreground/80">{n.message}</p>
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary"><QrCode className="h-3 w-3" /> Ona zaidi</span>
                  </div>
                  <span className="shrink-0 rounded-xl bg-background p-1"><QRCodeSVG value={`${window.location.origin}${notificationPath(`admin-${n.id}`)}`} size={56} title="QR ya arifa" /></span>
                </Button>
              ))}
            </div>
          </section>
        ))}
      </ScrollArea>
    </div>
  );
};
