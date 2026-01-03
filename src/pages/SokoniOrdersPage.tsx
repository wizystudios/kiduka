import { useEffect } from "react";
import SokoniOrderManagement from "@/components/SokoniOrderManagement";

export const SokoniOrdersPage = () => {
  useEffect(() => {
    document.title = "Oda za Sokoni - Kiduka POS";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Fuatilia na simamia oda za wateja kutoka Sokoni kwa Kiduka POS');
  }, []);

  return (
    <main className="p-2 pb-20 space-y-2">
      <header>
        <h1 className="text-sm font-bold">Oda za Sokoni</h1>
        <p className="text-xs text-muted-foreground">Angalia oda mpya, badilisha status, na wasiliana na mteja.</p>
      </header>
      <section aria-label="Sokoni orders management">
        <SokoniOrderManagement />
      </section>
    </main>
  );
};

export default SokoniOrdersPage;
