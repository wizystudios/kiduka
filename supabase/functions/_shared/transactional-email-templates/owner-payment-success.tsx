/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandLayout, styles, APP_URL, fmtTsh } from './brand-layout.tsx'

interface Props {
  name?: string
  amount?: number
  reference?: string
  paymentMethod?: string
  purpose?: string  // 'order' | 'subscription'
  recordUrl?: string
}

const Email = ({ name, amount, reference, paymentMethod, purpose, recordUrl }: Props) => (
  <BrandLayout
    audience="owner"
    preview={`Malipo yamefanikiwa: ${fmtTsh(amount)}`}
    heading="Malipo Yamefanikiwa"
    intro={`Habari${name ? ' ' + name : ''}, malipo yako yamepokelewa kwa mafanikio.`}
    ctaUrl={recordUrl || `${APP_URL}/dashboard`}
    ctaLabel="Fungua Dashboard"
  >
    <div style={styles.card}>
      <Text style={styles.label}>Kiasi</Text>
      <Text style={styles.amount}>{fmtTsh(amount)}</Text>
      {paymentMethod && (<><Text style={styles.label}>Njia ya malipo</Text><Text style={styles.value}>{paymentMethod}</Text></>)}
      {reference && (<><Text style={styles.label}>Rejeo</Text><Text style={styles.value}>{reference}</Text></>)}
      {purpose && (<><Text style={styles.label}>Aina</Text><Text style={styles.value}>{purpose === 'subscription' ? 'Usajili (Subscription)' : 'Oda'}</Text></>)}
    </div>
  </BrandLayout>
)

export const template = {
  component: Email,
  subject: (d) => `Malipo yamepokelewa — ${fmtTsh(d?.amount)}`,
  displayName: 'Owner — Payment Success',
  previewData: { name: 'Juma', amount: 30000, reference: 'KDK-ABC123', paymentMethod: 'M-Pesa', purpose: 'subscription' },
} satisfies TemplateEntry
