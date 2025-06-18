
import { PWAInstaller } from '@/components/PWAInstaller';

export const PWAInstallerPage = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mobile App</h1>
        <p className="text-gray-600 mt-2">
          Sakinisha KidukaPOS kama app kwenye kifaa chako kwa ufikiaji wa haraka
        </p>
      </div>
      <PWAInstaller />
    </div>
  );
};
