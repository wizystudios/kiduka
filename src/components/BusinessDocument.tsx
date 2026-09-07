import { forwardRef } from 'react';
import { BrandMark } from '@/components/BrandMark';

export interface BusinessDocumentItem {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface BusinessDocumentProps {
  /** Document kind — only changes the label, never the layout */
  kind: 'receipt' | 'invoice';
  businessName: string;
  documentNumber: string;
  documentDate: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  items: BusinessDocumentItem[];
  subtotal: number;
  taxAmount?: number;
  total: number;
  notes?: string;
  /** Fixed pixel width keeps html2canvas exports identical for both documents */
  width?: number;
}

const methodLabel = (m?: string) => {
  switch (m) {
    case 'cash': return 'Taslimu';
    case 'mobile':
    case 'mobile_money': return 'Pesa za Simu';
    case 'bank': return 'Benki';
    default: return m ? m.toUpperCase() : '—';
  }
};

const statusLabel = (s?: string) => {
  switch (s) {
    case 'paid':
    case 'completed':
    case 'complete':
    case 'success':
    case 'confirmed': return 'Amelipa';
    case 'partial': return 'Nusu';
    case 'unpaid':
    case 'pending': return 'Hajalipa';
    default: return s || 'Amelipa';
  }
};

/**
 * Single source of truth for the visual design of Kiduka receipts and invoices.
 * Both documents render exactly the same layout; only the title label differs.
 */
export const BusinessDocument = forwardRef<HTMLDivElement, BusinessDocumentProps>(
  (
    {
      kind,
      businessName,
      documentNumber,
      documentDate,
      customerName,
      customerPhone,
      paymentMethod,
      paymentStatus,
      items,
      subtotal,
      taxAmount = 0,
      total,
      notes,
      width = 360,
    },
    ref
  ) => {
    const title = kind === 'receipt' ? 'Risiti ya Mauzo' : 'Ankara ya Mauzo';

    return (
      <div
        ref={ref}
        className="mx-auto overflow-hidden rounded-3xl border shadow-sm"
        style={{ width, maxWidth: '100%', background: '#ffffff', color: '#111827' }}
      >
        <div style={{ padding: 20 }}>
          {/* Header */}
          <div
            className="flex items-center justify-center gap-2 text-center"
            style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 16 }}
          >
            <BrandMark size="md" iconOnly />
            <div className="text-left leading-tight">
              <p style={{ fontSize: 16, fontWeight: 900, color: '#111827', maxWidth: 230 }} className="truncate">
                {businessName}
              </p>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: '#6b7280' }}>
                {title} · Kiduka
              </p>
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3" style={{ padding: '16px 0', fontSize: 12 }}>
            <div>
              <p style={{ color: '#6b7280' }}>{kind === 'receipt' ? 'Risiti' : 'Ankara'}</p>
              <p className="font-mono" style={{ fontWeight: 700, color: '#111827' }}>#{documentNumber}</p>
            </div>
            <div className="text-right">
              <p style={{ color: '#6b7280' }}>Tarehe</p>
              <p style={{ fontWeight: 600, color: '#111827' }}>{documentDate}</p>
            </div>
            <div>
              <p style={{ color: '#6b7280' }}>Malipo</p>
              <p style={{ fontWeight: 600, color: '#111827' }}>{methodLabel(paymentMethod)}</p>
            </div>
            <div className="text-right">
              <p style={{ color: '#6b7280' }}>Hali</p>
              <p style={{ fontWeight: 600, color: '#111827' }}>{statusLabel(paymentStatus)}</p>
            </div>
            {(customerName || customerPhone) && (
              <>
                <div>
                  <p style={{ color: '#6b7280' }}>Mteja</p>
                  <p style={{ fontWeight: 600, color: '#111827' }}>{customerName || '—'}</p>
                </div>
                <div className="text-right">
                  <p style={{ color: '#6b7280' }}>Simu</p>
                  <p style={{ fontWeight: 600, color: '#111827' }}>{customerPhone || '—'}</p>
                </div>
              </>
            )}
          </div>

          {/* Items */}
          <div style={{ borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
            {items.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="flex items-start justify-between gap-3"
                style={{
                  padding: '12px 0',
                  fontSize: 14,
                  borderTop: index === 0 ? 'none' : '1px solid #f3f4f6',
                }}
              >
                <div className="min-w-0 flex-1">
                  <p style={{ fontWeight: 600, color: '#111827' }}>{item.name}</p>
                  <p style={{ fontSize: 12, color: '#6b7280' }}>
                    {item.quantity} × TSh {item.unit_price.toLocaleString()}
                  </p>
                </div>
                <p className="whitespace-nowrap" style={{ fontWeight: 700, color: '#111827' }}>
                  TSh {item.subtotal.toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ padding: '16px 0', fontSize: 14 }} className="space-y-2">
            <div className="flex justify-between" style={{ color: '#4b5563' }}>
              <span>Subtotal</span>
              <span>TSh {subtotal.toLocaleString()}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between" style={{ color: '#4b5563' }}>
                <span>Kodi</span>
                <span>TSh {taxAmount.toLocaleString()}</span>
              </div>
            )}
            <div
              className="flex justify-between"
              style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, fontSize: 18, fontWeight: 900, color: '#111827' }}
            >
              <span>JUMLA</span>
              <span>TSh {total.toLocaleString()}</span>
            </div>
          </div>

          {notes && <p style={{ fontSize: 12, color: '#6b7280', paddingBottom: 12 }}>{notes}</p>}

          <div
            className="text-center"
            style={{ borderRadius: 16, background: '#f9fafb', padding: 12, fontSize: 11, color: '#4b5563' }}
          >
            Asante kwa biashara yako · Powered by Kiduka
          </div>
        </div>
      </div>
    );
  }
);

BusinessDocument.displayName = 'BusinessDocument';
