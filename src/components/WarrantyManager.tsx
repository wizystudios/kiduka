import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Construction } from 'lucide-react';

export const WarrantyManager = () => {
  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Shield className="h-6 w-6" />
            Usimamizi wa Warranty
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Construction className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Kipengele Kinakuja Hivi Karibuni</h3>
          <p className="text-muted-foreground">
            Usimamizi wa warranty na madai utapatikana hivi karibuni.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
