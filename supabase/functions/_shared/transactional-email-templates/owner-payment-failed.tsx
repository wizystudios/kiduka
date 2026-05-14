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
  reason?: string
  retryUrl?: string
}

const Email = ({ name, amount, reference, paymentMethod, reason, retryUrl }: Props) => (
  <BrandLayout
    audience="owner"
    preview="Malipo yameshindikana"
    heading="Malipo Yameshindikana"
    intro={`Habari${name ? ' ' + name : ''}, malipo yako hayakufanikiwa.`}
    ctaUrl={retryUrl || `${APP_URL}/subscription`}
    ctaLabel="Jaribu Tena"
  >
    <div style={styles.card}>
      <Text style={styles.label}>Kiasi</Text>
      <Text style={styles.warning}>{fmtTsh(amount)}</Text>
      {paymentMethod && (<><Text style={styles.label}>Njia</Text><Text style={styles.value}>{paymentMethod}</Text></>)}
      {reference && (<><Text style={styles.label}>Rejeo</Text><Text style={styles.value}>{reference}</Text></>)}
      <Text style={styles.label}>Sababu</Text>
      <Text style={styles.text}>{reason || 'Hakuna maelezo zaidi'}</Text>
    </div>
    <Text style={styles.text}>Hakikisha una salio la kutosha kisha jaribu tena.</Text>
  </BrandLayout>
)

export const template = {
  component: Email,
  subject: 'Malipo yameshindikana — Kiduka',
  displayName: 'Owner — Payment Failed',
  previewData: { name: 'Juma', amount: 30000, reference: 'KDK-XYZ', paymentMethod: 'M-Pesa', reason: 'Salio halitoshi' },
} satisfies TemplateEntry
