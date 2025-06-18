
import { CustomerLoyaltyProgram } from '@/components/CustomerLoyaltyProgram';

export const CustomerLoyaltyPage = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Programu ya Uongozi wa Wateja</h1>
        <p className="text-gray-600 mt-2">
          Simamia na kukuza uongozi wa wateja wako kwa programu za tuzo na pointi
        </p>
      </div>
      <CustomerLoyaltyProgram />
    </div>
  );
};
