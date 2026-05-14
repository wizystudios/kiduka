/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandLayout, styles, fmtTsh, APP_URL } from './brand-layout.tsx'

interface Props { name?: string; customerName?: string; customerId?: string; amount?: number; dueDate?: string }

const Email = ({ name, customerName, customerId, amount, dueDate }: Props) => (
  <BrandLayout
    audience="owner"
    preview="Deni jipya limesajiliwa"
    heading="Deni jipya limeingia"
    intro={`Habari${name ? ' ' + name : ''}, mteja amechukua bidhaa kwa deni.`}
    ctaUrl={customerId ? `${APP_URL}/customers/${customerId}` : `${APP_URL}/customers`}
    ctaLabel="Angalia Mdaiwa"
  >
    <div style={styles.card}>
      <Text style={styles.label}>Mteja</Text>
      <Text style={styles.value}>{customerName ?? 'Mteja'}</Text>
      <Text style={styles.label}>Kiasi cha Deni</Text>
      <Text style={styles.amount}>{fmtTsh(amount)}</Text>
      {dueDate ? (<><Text style={styles.label}>Tarehe ya kulipa</Text><Text style={styles.value}>{dueDate}</Text></>) : null}
    </div>
  </BrandLayout>
)

export const template = {
  component: Email,
  subject: (d) => `Deni jipya: ${fmtTsh(d?.amount)}`,
  displayName: 'Owner — New Debt',
  previewData: { name: 'Asha', customerName: 'Saidi Mussa', customerId: 'c-1', amount: 45000, dueDate: '21 Mei 2026' },
} satisfies TemplateEntry
