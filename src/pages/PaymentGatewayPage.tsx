
import { PaymentGateway } from '@/components/PaymentGateway';

export const PaymentGatewayPage = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Lango la Malipo</h1>
        <p className="text-gray-600 mt-2">
          Pokea malipo kwa njia mbalimbali za kielektroniki na za kitamaduni
        </p>
      </div>
      <PaymentGateway />
    </div>
  );
};
