import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

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

/** Notification with a QR code and "Ona zaidi" that opens the full detail. */
export const qrNotification = (opts: { id?: string; title: string; summary: string; path: string; kind?: 'success' | 'info' }) => {
  const url = `${window.location.origin}${opts.path}`;
  const fn = opts.kind === 'info' ? toast.info : toast.success;
  fn(opts.title, {
    id: opts.id,
    duration: 8000,
    description: (
      <div className="mt-1 flex items-center gap-3">
        <a href={url} aria-label="Fungua maelezo kamili" className="shrink-0 rounded-xl bg-background p-1.5">
          <QRCodeSVG value={url} size={64} />
        </a>
        <div className="text-xs">
          <p className="font-semibold">{opts.summary}</p>
          <p className="opacity-80">Scan QR au bonyeza Ona zaidi</p>
        </div>
      </div>
    ),
    action: { label: 'Ona zaidi', onClick: () => window.location.assign(url) },
  });
};

/** Success message for a completed sale with a QR/link to the sale summary. */
export const saleSuccessToast = (saleId: string | null | undefined, total: number, title = 'Mauzo yamekamilika!') => {
  const summary = `Jumla: TSh ${Math.round(total || 0).toLocaleString()}`;
  if (!saleId) { toast.success(title, { description: summary }); return; }
  qrNotification({ id: `sale-${saleId}`, title, summary, path: `/mauzo/${saleId}` });
};
