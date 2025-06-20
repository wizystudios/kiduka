
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, Plus, Search } from 'lucide-react';

export const MarketplacePage = () => {
  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Soko la Jamii</h2>
        <p className="text-gray-600">Uza na ununue bidhaa kutoka kwa wafanyabiashara wengine</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              Uza Bidhaa Zako
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Weka bidhaa zako sokoni kuwapatia wafanyabiashara wengine nafasi ya kununua</p>
            <Button className="w-full">
              Ongeza Bidhaa
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Tafuta Bidhaa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Tafuta na ununue bidhaa kutoka kwa wafanyabiashara wengine</p>
            <Button variant="outline" className="w-full">
              Tazama Bidhaa
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bidhaa za Hivi Karibuni</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Hakuna bidhaa za kuonyesha kwa sasa</p>
            <p className="text-sm text-gray-500">Bidhaa zitaonekana hapa baada ya kuwekwa sokoni</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
