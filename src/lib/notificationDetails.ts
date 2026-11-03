export interface NotificationDetail {
  id: string;
  title: string;
  description: string;
  kind: string;
  createdAt: string;
  source: string;
}

const PREFIX = 'kiduka_notification_';
export const notificationPath = (id: string | number) => `/arifa/${encodeURIComponent(String(id))}`;
export const saveNotificationDetail = (detail: NotificationDetail) => {
  try { sessionStorage.setItem(PREFIX + detail.id, JSON.stringify(detail)); } catch { /* Private tab storage may be unavailable. */ }
};
export const readNotificationDetail = (id: string): NotificationDetail | null => {
  try { return JSON.parse(sessionStorage.getItem(PREFIX + id) || 'null'); } catch { return null; }
};