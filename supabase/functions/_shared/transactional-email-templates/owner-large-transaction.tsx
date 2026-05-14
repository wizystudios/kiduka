/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandLayout, styles, fmtTsh, APP_URL } from './brand-layout.tsx'

interface Props { name?: string; amount?: number; saleId?: string; paymentMethod?: string; createdAt?: string }

const Email = ({ name, amount, saleId, paymentMethod, createdAt }: Props) => (
  <BrandLayout
    audience="owner"
    preview="Muamala mkubwa umetokea kwenye biashara yako"
    heading="Muamala mkubwa umerekodiwa"
    intro={`Habari${name ? ' ' + name : ''}, muamala mkubwa umefanyika sasa hivi.`}
    ctaUrl={saleId ? `${APP_URL}/sales/${saleId}` : `${APP_URL}/sales`}
    ctaLabel="Fungua Muamala"
  >
    <div style={styles.card}>
      <Text style={styles.label}>Kiasi</Text>
      <Text style={styles.amount}>{fmtTsh(amount)}</Text>
      <Text style={styles.label}>Njia ya Malipo</Text>
      <Text style={styles.value}>{paymentMethod ?? '—'}</Text>
      <Text style={styles.label}>Wakati</Text>
      <Text style={styles.value}>{createdAt ?? new Date().toLocaleString('sw-TZ')}</Text>
    </div>
  </BrandLayout>
)

export const template = {
  component: Email,
  subject: (d) => `Muamala mkubwa: ${fmtTsh(d?.amount)}`,
  displayName: 'Owner — Large Transaction',
  previewData: { name: 'Asha', amount: 1250000, saleId: 'sale-123', paymentMethod: 'M-Pesa', createdAt: '14 Mei 2026, 14:22' },
} satisfies TemplateEntry
