/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandLayout, styles, APP_URL } from './brand-layout.tsx'

interface Props {
  name?: string
  missing?: string[]   // e.g. ['TIN', 'NIDA']
  contractStatus?: string
  expiresAt?: string
  daysLeft?: number
  adminMessage?: string
}

const Email = ({ name, missing = [], contractStatus, expiresAt, daysLeft, adminMessage }: Props) => (
  <BrandLayout
    audience="owner"
    preview="Kumbusho: Kamilisha Sheria yako ya biashara"
    heading="Kumbusho la Sheria"
    intro={`Habari${name ? ' ' + name : ''}, biashara yako inahitaji kukamilisha taarifa za sheria.`}
    ctaUrl={`${APP_URL}/settings?tab=sheria`}
    ctaLabel="Kamilisha Sheria"
    recordUrl={`${APP_URL}/settings?tab=sheria`}
    recordLabel="Fungua Sheria"
  >
    {missing.length > 0 && (
      <div style={styles.card}>
        <Text style={styles.label}>Hazijakamilika</Text>
        <Text style={styles.warning}>{missing.join(' · ')}</Text>
      </div>
    )}
    {contractStatus && (
      <div style={styles.card}>
        <Text style={styles.label}>Mkataba</Text>
        <Text style={styles.value}>{contractStatus}</Text>
        {expiresAt && <Text style={styles.label}>Inaisha: {new Date(expiresAt).toLocaleDateString('sw-TZ')}</Text>}
        {typeof daysLeft === 'number' && (
          <Text style={daysLeft <= 3 ? styles.warning : styles.value}>Siku zilizobaki: {daysLeft}</Text>
        )}
      </div>
    )}
    {adminMessage && (
      <div style={styles.card}>
        <Text style={styles.label}>Ujumbe kutoka kwa Admin</Text>
        <Text style={styles.text}>{adminMessage}</Text>
      </div>
    )}
    <Text style={styles.text}>
      Tafadhali kamilisha haraka iwezekanavyo ili kuepuka kufungiwa kwa akaunti yako.
    </Text>
  </BrandLayout>
)

export const template = {
  component: Email,
  subject: (d) => d?.adminMessage ? 'Ujumbe kutoka Kiduka — Sheria' : 'Kumbusho: Kamilisha Sheria ya biashara yako',
  displayName: 'Owner — Compliance Reminder',
  previewData: {
    name: 'Juma',
    missing: ['TIN', 'NIDA'],
    contractStatus: 'Inahitaji kusainiwa',
    daysLeft: 5,
  },
} satisfies TemplateEntry
