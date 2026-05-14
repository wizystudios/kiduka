/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandLayout, styles, fmtTsh, APP_URL } from './brand-layout.tsx'

interface Props { customerName?: string; receiptId?: string; total?: number; paymentMethod?: string; storeName?: string }

const Email = ({ customerName, receiptId, total, paymentMethod, storeName }: Props) => (
  <BrandLayout
    audience="customer"
    preview="Risiti yako ya malipo"
    heading="Risiti yako"
    intro={`Asante${customerName ? ' ' + customerName : ''}! Hii ni risiti ya malipo yako${storeName ? ' kutoka ' + storeName : ''}.`}
    ctaUrl={receiptId ? `${APP_URL}/receipt/${receiptId}` : `${APP_URL}`}
    ctaLabel="Angalia Risiti Kamili"
  >
    <div style={styles.card}>
      <Text style={styles.label}>Risiti</Text>
      <Text style={styles.value}>#{receiptId ? receiptId.slice(0, 8) : '—'}</Text>
      <Text style={styles.label}>Jumla</Text>
      <Text style={styles.amount}>{fmtTsh(total)}</Text>
      <Text style={styles.label}>Njia ya Malipo</Text>
      <Text style={styles.value}>{paymentMethod ?? '—'}</Text>
    </div>
  </BrandLayout>
)

export const template = {
  component: Email,
  subject: (d) => `Risiti yako · ${fmtTsh(d?.total)}`,
  displayName: 'Customer — Order Receipt',
  previewData: { customerName: 'Neema', receiptId: 'rcpt-abc123', total: 78000, paymentMethod: 'M-Pesa', storeName: 'Duka la Asha' },
} satisfies TemplateEntry
