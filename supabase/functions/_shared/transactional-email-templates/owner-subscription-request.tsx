/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandLayout, styles, fmtTsh, APP_URL } from './brand-layout.tsx'

interface Props { name?: string; amount?: number; months?: number; subscriptionId?: string }

const Email = ({ name, amount, months, subscriptionId }: Props) => (
  <BrandLayout
    audience="owner"
    preview="Ombi lako la malipo limepokelewa"
    heading="Tumepokea ombi lako la malipo"
    intro={`Asante${name ? ' ' + name : ''}! Ombi lako limetumwa kwa idhini ya msimamizi.`}
    ctaUrl={`${APP_URL}/subscription`}
    ctaLabel="Angalia Hali ya Malipo"
  >
    <div style={styles.card}>
      <Text style={styles.label}>Kiasi</Text>
      <Text style={styles.amount}>{fmtTsh(amount)}</Text>
      <Text style={styles.label}>Muda</Text>
      <Text style={styles.value}>{months ?? 1} mwezi</Text>
      {subscriptionId ? (<><Text style={styles.label}>Kumbukumbu</Text><Text style={styles.value}>{subscriptionId.slice(0,8)}</Text></>) : null}
    </div>
    <Text style={styles.text}>Tutakutumia email nyingine pindi malipo yatakapothibitishwa.</Text>
  </BrandLayout>
)

export const template = {
  component: Email,
  subject: 'Ombi lako la malipo limepokelewa — Kiduka',
  displayName: 'Owner — Subscription Request',
  previewData: { name: 'Mary', amount: 35000, months: 1, subscriptionId: 'a1b2c3d4-1111' },
} satisfies TemplateEntry
