
import { CustomerLoyaltyProgram } from '@/components/CustomerLoyaltyProgram';

export const CustomerLoyaltyPage = () => {
  return (
    <div className="p-4 pb-24">
      <div className="mb-4">
        <h1 className="text-xl font-bold">Uaminifu wa Wateja</h1>
        <p className="text-xs text-muted-foreground">
          Simamia programu za tuzo na pointi
        </p>
      </div>
      <CustomerLoyaltyProgram />
    </div>
  );
};
