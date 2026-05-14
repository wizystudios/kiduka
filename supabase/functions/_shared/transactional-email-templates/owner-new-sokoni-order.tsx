/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandLayout, styles, fmtTsh, APP_URL } from './brand-layout.tsx'

interface Props { name?: string; orderId?: string; trackingCode?: string; total?: number; itemCount?: number; customerName?: string }

const Email = ({ name, orderId, trackingCode, total, itemCount, customerName }: Props) => (
  <BrandLayout
    audience="owner"
    preview="Oda mpya kwenye Sokoni"
    heading="Oda mpya kwenye Sokoni"
    intro={`Habari${name ? ' ' + name : ''}, mteja ametuma oda mpya kupitia duka lako.`}
    ctaUrl={orderId ? `${APP_URL}/sokoni/orders` : `${APP_URL}/sokoni/orders`}
    ctaLabel="Fungua Oda"
  >
    <div style={styles.card}>
      <Text style={styles.label}>Tracking</Text>
      <Text style={styles.value}>{trackingCode ?? '—'}</Text>
      <Text style={styles.label}>Mteja</Text>
      <Text style={styles.value}>{customerName ?? '—'}</Text>
      <Text style={styles.label}>Bidhaa</Text>
      <Text style={styles.value}>{itemCount ?? 0}</Text>
      <Text style={styles.label}>Jumla</Text>
      <Text style={styles.amount}>{fmtTsh(total)}</Text>
    </div>
  </BrandLayout>
)

export const template = {
  component: Email,
  subject: (d) => `Oda mpya Sokoni · ${d?.trackingCode ?? ''}`,
  displayName: 'Owner — New Sokoni Order',
  previewData: { name: 'Asha', orderId: 'o-1', trackingCode: 'SKN-AB12CD', total: 78000, itemCount: 3, customerName: 'Neema J.' },
} satisfies TemplateEntry
