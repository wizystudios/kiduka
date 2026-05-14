/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandLayout, styles, fmtTsh, APP_URL } from './brand-layout.tsx'

interface Props { customerName?: string; orderId?: string; trackingCode?: string; total?: number; storeName?: string; storeSlug?: string }

const Email = ({ customerName, orderId, trackingCode, total, storeName, storeSlug }: Props) => (
  <BrandLayout
    audience="customer"
    preview="Tumepokea oda yako"
    heading="Asante! Tumepokea oda yako"
    intro={`Habari${customerName ? ' ' + customerName : ''}, oda yako${storeName ? ' kutoka ' + storeName : ''} imepokelewa kwa mafanikio.`}
    ctaUrl={trackingCode ? `${APP_URL}/track?code=${trackingCode}` : `${APP_URL}`}
    ctaLabel="Fuatilia Oda"
  >
    <div style={styles.card}>
      <Text style={styles.label}>Tracking Code</Text>
      <Text style={styles.value}>{trackingCode ?? '—'}</Text>
      <Text style={styles.label}>Jumla</Text>
      <Text style={styles.amount}>{fmtTsh(total)}</Text>
      {storeSlug ? (<><Text style={styles.label}>Duka</Text><Text style={styles.value}>{storeName ?? storeSlug}</Text></>) : null}
    </div>
    <Text style={styles.text}>Tutakutumia email nyingine pindi muuzaji atakapothibitisha oda.</Text>
  </BrandLayout>
)

export const template = {
  component: Email,
  subject: (d) => `Oda imepokelewa · ${d?.trackingCode ?? 'Kiduka'}`,
  displayName: 'Customer — Order Confirmation',
  previewData: { customerName: 'Neema', orderId: 'o-1', trackingCode: 'SKN-AB12CD', total: 78000, storeName: 'Duka la Asha', storeSlug: 'asha' },
} satisfies TemplateEntry
