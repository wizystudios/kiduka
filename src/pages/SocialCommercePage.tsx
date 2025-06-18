
import { SocialCommerce } from '@/components/SocialCommerce';

export const SocialCommercePage = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Biashara ya Kijamii</h1>
        <p className="text-gray-600 mt-2">
          Gawanya bidhaa zako kwenye mitandao ya kijamii na upate wateja zaidi
        </p>
      </div>
      <SocialCommerce />
    </div>
  );
};
