/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandLayout, styles, fmtTsh, APP_URL } from './brand-layout.tsx'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Inasubiri',
  approved: 'Imekubaliwa',
  rejected: 'Imekataliwa',
  refunded: 'Imerudishwa',
}

interface Props { customerName?: string; returnId?: string; status?: string; refundAmount?: number; reason?: string; note?: string }

const Email = ({ customerName, returnId, status, refundAmount, reason, note }: Props) => {
  const label = STATUS_LABEL[status ?? ''] ?? (status ?? '—')
  return (
    <BrandLayout
      audience="customer"
      preview={`Hali ya ombi la kurudisha bidhaa: ${label}`}
      heading={`Ombi la kurudisha: ${label}`}
      intro={`Habari${customerName ? ' ' + customerName : ''}, kuna habari mpya kuhusu ombi lako la kurudisha bidhaa.`}
      ctaUrl={returnId ? `${APP_URL}/returns/${returnId}` : `${APP_URL}/sokoni`}
      ctaLabel="Angalia Ombi"
    >
      <div style={styles.card}>
        <Text style={styles.label}>Hali</Text>
        <Text style={styles.value}>{label}</Text>
        {refundAmount ? (<><Text style={styles.label}>Kiasi cha Refund</Text><Text style={styles.amount}>{fmtTsh(refundAmount)}</Text></>) : null}
        {reason ? (<><Text style={styles.label}>Sababu</Text><Text style={styles.text}>{reason}</Text></>) : null}
        {note ? (<><Text style={styles.label}>Ujumbe wa Muuzaji</Text><Text style={styles.text}>{note}</Text></>) : null}
      </div>
    </BrandLayout>
  )
}

export const template = {
  component: Email,
  subject: (d) => `Ombi la kurudisha: ${STATUS_LABEL[d?.status] ?? 'Habari mpya'}`,
  displayName: 'Customer — Return Update',
  previewData: { customerName: 'Neema', returnId: 'r-1', status: 'approved', refundAmount: 25000, reason: 'Bidhaa haikufanana na picha' },
} satisfies TemplateEntry
