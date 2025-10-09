import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Construction } from 'lucide-react';

export const CustomerLoyaltyProgram = () => {
  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Award className="h-6 w-6" />
            Programu ya Uaminifu
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Construction className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Kipengele Kinakuja Hivi Karibuni</h3>
          <p className="text-muted-foreground">
            Programu ya uaminifu wa wateja itakuwa tayari hivi karibuni.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
