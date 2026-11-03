import { toast } from 'sonner';
import { NotificationLinks } from '@/components/NotificationBridge';

const TEST_PREFIX = 'test-';
export const isTestSaleId = (id?: string | null) => !!id && id.startsWith(TEST_PREFIX);

export interface TestSale { id: string; businessName: string; createdAt: string; items: { name: string; quantity: number; unit_price: number; subtotal: number }[]; total: number }

/** Saves an isolated practice sale in this browser tab only — never in the database or stock. */
export const createTestSale = (businessName: string): TestSale => {
  const items = [
    { name: 'Bidhaa ya majaribio A', quantity: 2, unit_price: 1500, subtotal: 3000 },
    { name: 'Bidhaa ya majaribio B', quantity: 1, unit_price: 2000, subtotal: 2000 },
  ];
  const sale: TestSale = { id: `${TEST_PREFIX}${Date.now()}`, businessName, createdAt: new Date().toISOString(), items, total: 5000 };
  sessionStorage.setItem(`kiduka_test_sale_${sale.id}`, JSON.stringify(sale));
  return sale;
};
export const readTestSale = (id: string): TestSale | null => {
  try { return JSON.parse(sessionStorage.getItem(`kiduka_test_sale_${id}`) || 'null'); } catch { return null; }
};

export const testSalePath = (sale: TestSale) => `/jaribio/risiti/${sale.id}#${encodeURIComponent(JSON.stringify(sale))}`;
export const readSharedTestSale = (id: string): TestSale | null => {
  try {
    const sale = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
    if (sale.id !== id || !isTestSaleId(id) || sale.total !== 5000 || !Array.isArray(sale.items) || sale.items.length !== 2) return null;
    // Only explicitly artificial items can travel in this public practice link.
    if (sale.items[0].name !== 'Bidhaa ya majaribio A' || sale.items[1].name !== 'Bidhaa ya majaribio B') return null;
    return { ...sale, businessName: 'Kiduka — JARIBIO' };
  } catch { return null; }
};

/** Notification with a QR code and "Ona zaidi" that opens the full detail. */
export const qrNotification = (opts: { id?: string; title: string; summary: string; path: string; kind?: 'success' | 'info' }) => {
  const url = `${window.location.origin}${opts.path}`;
  const fn = opts.kind === 'info' ? toast.info : toast.success;
  fn(opts.title, {
    id: opts.id,
    duration: 8000,
    description: (
      <NotificationLinks path={opts.path}>{opts.summary}</NotificationLinks>
    ),
  });
};

/** Success message for a completed sale with a QR/link to the sale summary. */
export const saleSuccessToast = (saleId: string | null | undefined, total: number, title = 'Mauzo yamekamilika!') => {
  const summary = `Jumla: TSh ${Math.round(total || 0).toLocaleString()}`;
  if (!saleId) { toast.success(title, { description: summary }); return; }
  const practice = isTestSaleId(saleId) ? readTestSale(saleId) : null;
  qrNotification({ id: `sale-${saleId}`, title, summary, path: practice ? testSalePath({ ...practice, businessName: 'Kiduka — JARIBIO' }) : `/mauzo/${saleId}` });
};
