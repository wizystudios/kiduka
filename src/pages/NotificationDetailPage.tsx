import { useParams } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { readNotificationDetail } from '@/lib/notificationDetails';
import { Button } from '@/components/ui/button';

export const NotificationDetailPage = () => {
  const { notificationId } = useParams();
  const detail = notificationId ? readNotificationDetail(notificationId) : null;
  return <main className="mx-auto min-h-screen max-w-xl space-y-4 bg-background px-5 py-10 text-foreground">
    <Bell className="h-8 w-8 text-primary" />
    <h1 className="text-xl font-bold">{detail?.title || 'Arifa haipatikani'}</h1>
    <p className="whitespace-pre-wrap break-words text-sm">{detail?.description || 'Maelezo ya arifa hii yanapatikana kwenye kichupo ilipotokea pekee.'}</p>
    {detail && <><p className="text-xs text-muted-foreground">{new Date(detail.createdAt).toLocaleString('sw-TZ')}</p><Button variant="outline" onClick={() => window.location.assign(detail.source)}>Rudi kwenye ukurasa</Button></>}
  </main>;
};