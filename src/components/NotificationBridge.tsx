import { useEffect } from 'react';
import { isValidElement, ReactNode } from 'react';
import { toast, useSonner } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { notificationPath, saveNotificationDetail } from '@/lib/notificationDetails';

const text = (node: ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join(' ');
  if (isValidElement<{ children?: ReactNode }>(node)) return text(node.props.children);
  return '';
};

export const NotificationLinks = ({ children, path }: { children?: ReactNode; path: string }) => {
  const url = new URL(path, window.location.origin).href;
  return <div className="mt-2 flex items-center gap-3" data-notification-links>
    <a href={url} aria-label="QR ya arifa" className="shrink-0 rounded-xl bg-background p-1.5"><QRCodeSVG value={url} size={64} title="QR ya arifa" /></a>
    <div className="min-w-0 flex-1 space-y-2"><div className="break-words text-xs">{children}</div>
      <Button size="sm" variant="outline" onClick={() => window.location.assign(url)}>Ona zaidi</Button>
    </div>
  </div>;
};

/** Enrich the sole Sonner stream in place, including legacy, custom and promise updates. Never emits a second ID. */
export const NotificationBridge = () => {
  const { toasts } = useSonner();
  useEffect(() => {
    for (const item of toasts) {
      if (item.delete) continue;
      const content = item.jsx || item.description;
      if (isValidElement(content) && content.type === NotificationLinks) continue;
      const detail = { id: String(item.id), title: text(item.title) || 'Arifa', description: text(content), kind: item.type || 'normal', createdAt: new Date().toISOString(), source: window.location.pathname + window.location.search };
      saveNotificationDetail(detail);
      const linked = <NotificationLinks path={notificationPath(item.id)}>{content}</NotificationLinks>;
      if (item.jsx) {
        const { jsx: _jsx, ...options } = item;
        toast.custom(() => linked, { ...options, id: item.id });
      } else {
        // message preserves the original type, action, duration and ID.
        toast.message(item.title, { ...item, description: linked });
      }
    }
  }, [toasts]);
  return null;
};