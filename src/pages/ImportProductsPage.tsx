import { useEffect } from "react";
import BulkProductImport from "@/components/BulkProductImport";

export const ImportProductsPage = () => {
  useEffect(() => {
    document.title = "Import Bidhaa - Kiduka POS";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Ingiza bidhaa kwa wingi kutoka CSV au Excel haraka kwa Kiduka POS');
  }, []);

  return (
    <div className="p-2 pb-20 space-y-2">
      <h1 className="text-sm font-bold">Ingiza Bidhaa kwa Wingi</h1>
      <p className="text-xs text-muted-foreground">Pakua template, jaza bidhaa zako, kisha zipakie hapa kuharakisha uanzishaji wa hesabu.</p>
      <BulkProductImport />
    </div>
  );
};

export default ImportProductsPage;
