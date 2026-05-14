/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandLayout, styles, APP_URL } from './brand-layout.tsx'

interface Props { name?: string; section?: string; changedAt?: string; summary?: string }

const Email = ({ name, section, changedAt, summary }: Props) => (
  <BrandLayout
    audience="owner"
    preview="Mabadiliko ya mipangilio ya akaunti yako"
    heading="Mipangilio yako imebadilishwa"
    intro={`Habari${name ? ' ' + name : ''}, tumeona mabadiliko kwenye mipangilio ya akaunti yako ya Kiduka.`}
    ctaUrl={`${APP_URL}/settings`}
    ctaLabel="Fungua Mipangilio"
  >
    <div style={styles.card}>
      <Text style={styles.label}>Sehemu</Text>
      <Text style={styles.value}>{section ?? 'Mipangilio ya jumla'}</Text>
      <Text style={styles.label}>Wakati</Text>
      <Text style={styles.value}>{changedAt ?? new Date().toLocaleString('sw-TZ')}</Text>
      {summary ? (<><Text style={styles.label}>Muhtasari</Text><Text style={styles.text}>{summary}</Text></>) : null}
    </div>
    <Text style={styles.warning}>Kama hujabadilisha haya, fungua app na thibitisha akaunti yako.</Text>
  </BrandLayout>
)

export const template = {
  component: Email,
  subject: 'Mipangilio yako imebadilishwa',
  displayName: 'Owner — Settings Changed',
  previewData: { name: 'Juma', section: 'WhatsApp', summary: 'Namba mpya imewekwa.' },
} satisfies TemplateEntry
