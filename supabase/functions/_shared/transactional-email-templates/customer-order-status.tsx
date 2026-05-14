/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandLayout, styles, APP_URL } from './brand-layout.tsx'

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Imethibitishwa',
  shipped: 'Imesafirishwa',
  delivered: 'Imefika',
  cancelled: 'Imefutwa',
}

interface Props { customerName?: string; trackingCode?: string; status?: string; eta?: string; note?: string }

const Email = ({ customerName, trackingCode, status, eta, note }: Props) => {
  const label = STATUS_LABEL[status ?? ''] ?? (status ?? 'Imebadilika')
  return (
    <BrandLayout
      audience="customer"
      preview={`Hali ya oda yako: ${label}`}
      heading={`Oda yako: ${label}`}
      intro={`Habari${customerName ? ' ' + customerName : ''}, hali ya oda yako imebadilika.`}
      ctaUrl={trackingCode ? `${APP_URL}/track?code=${trackingCode}` : `${APP_URL}`}
      ctaLabel="Fuatilia Oda"
    >
      <div style={styles.card}>
        <Text style={styles.label}>Tracking</Text>
        <Text style={styles.value}>{trackingCode ?? '—'}</Text>
        <Text style={styles.label}>Hali</Text>
        <Text style={styles.value}>{label}</Text>
        {eta ? (<><Text style={styles.label}>Inategemewa</Text><Text style={styles.value}>{eta}</Text></>) : null}
        {note ? (<><Text style={styles.label}>Ujumbe</Text><Text style={styles.text}>{note}</Text></>) : null}
      </div>
    </BrandLayout>
  )
}

export const template = {
  component: Email,
  subject: (d) => `Oda yako: ${STATUS_LABEL[d?.status] ?? 'Habari mpya'}`,
  displayName: 'Customer — Order Status',
  previewData: { customerName: 'Neema', trackingCode: 'SKN-AB12CD', status: 'shipped', eta: '15 Mei 2026' },
} satisfies TemplateEntry
