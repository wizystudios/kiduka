
import { NotificationSettings } from '@/components/NotificationSettings';

export const NotificationSettingsPage = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mipangilio ya Arifa</h1>
        <p className="text-gray-600 mt-2">
          Simamia arifa za programu na mipangilio ya push notifications
        </p>
      </div>
      <NotificationSettings />
    </div>
  );
};
