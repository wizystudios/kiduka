import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Percent } from 'lucide-react';

export const DiscountsPage = () => {
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Percent className="h-5 w-5 mr-2" />
            Discount Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};
