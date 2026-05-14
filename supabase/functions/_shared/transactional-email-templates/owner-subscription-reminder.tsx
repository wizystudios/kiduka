/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandLayout, styles, APP_URL, fmtTsh } from './brand-layout.tsx'

interface Props {
  name?: string
  daysLeft?: number
  endsAt?: string
  amount?: number
}

const Email = ({ name, daysLeft, endsAt, amount }: Props) => {
  const urgent = (daysLeft ?? 99) <= 1
  return (
    <BrandLayout
      audience="owner"
      preview={`Usajili wako unaisha ${urgent ? 'kesho' : `baada ya siku ${daysLeft}`}`}
      heading={urgent ? 'Usajili wako unaisha hivi karibuni!' : 'Kumbusho: Usajili unakaribia kuisha'}
      intro={`Habari${name ? ' ' + name : ''}, usajili wako wa Kiduka utakwisha hivi karibuni.`}
      ctaUrl={`${APP_URL}/subscription`}
      ctaLabel="Lipa Sasa"
    >
      <div style={styles.card}>
        {typeof daysLeft === 'number' && (<><Text style={styles.label}>Siku zilizobaki</Text>
          <Text style={urgent ? styles.warning : styles.value}>{daysLeft}</Text></>)}
        {endsAt && (<><Text style={styles.label}>Tarehe ya mwisho</Text>
          <Text style={styles.value}>{new Date(endsAt).toLocaleDateString('sw-TZ')}</Text></>)}
        {amount && (<><Text style={styles.label}>Kiasi cha mwezi</Text>
          <Text style={styles.amount}>{fmtTsh(amount)}</Text></>)}
      </div>
      <Text style={styles.text}>Lipa sasa ili usikatishwe huduma za biashara yako.</Text>
    </BrandLayout>
  )
}

export const template = {
  component: Email,
  subject: (d) => `Usajili wa Kiduka unaisha baada ya siku ${d?.daysLeft ?? '?'}`,
  displayName: 'Owner — Subscription Reminder',
  previewData: { name: 'Juma', daysLeft: 3, endsAt: new Date(Date.now() + 3*86400000).toISOString(), amount: 30000 },
} satisfies TemplateEntry
