import { useEffect } from "react";
import SokoniOrderManagement from "@/components/SokoniOrderManagement";

export const SokoniOrdersPage = () => {
  useEffect(() => {
    document.title = "Oda za Sokoni - Kiduka";
  }, []);

  return (
    <main className="p-2 pb-20">
      <SokoniOrderManagement />
    </main>
  );
};

export default SokoniOrdersPage;
