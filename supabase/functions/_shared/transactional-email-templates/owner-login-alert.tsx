/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandLayout, styles, APP_URL } from './brand-layout.tsx'

interface Props { name?: string; device?: string; ipAddress?: string; location?: string; loginAt?: string }

const Email = ({ name, device, ipAddress, location, loginAt }: Props) => (
  <BrandLayout
    audience="owner"
    preview="Kuingia kupya kwenye akaunti yako ya Kiduka"
    heading="Kuingia kupya kwenye akaunti yako"
    intro={`Habari${name ? ' ' + name : ''}, tumegundua kuingia kupya kwenye akaunti yako ya Kiduka.`}
    ctaUrl={`${APP_URL}/settings?tab=profile`}
    ctaLabel="Angalia Akaunti"
  >
    <div style={styles.card}>
      <Text style={styles.label}>Wakati</Text>
      <Text style={styles.value}>{loginAt ?? new Date().toLocaleString('sw-TZ')}</Text>
      <Text style={styles.label}>Kifaa</Text>
      <Text style={styles.value}>{device ?? 'Haijulikani'}</Text>
      {location ? (<><Text style={styles.label}>Eneo</Text><Text style={styles.value}>{location}</Text></>) : null}
      {ipAddress ? (<><Text style={styles.label}>IP</Text><Text style={styles.value}>{ipAddress}</Text></>) : null}
    </div>
    <Text style={styles.warning}>Kama si wewe, badilisha nenosiri mara moja.</Text>
  </BrandLayout>
)

export const template = {
  component: Email,
  subject: 'Kuingia kupya kwenye akaunti yako ya Kiduka',
  displayName: 'Owner — Login Alert',
  previewData: { name: 'Asha', device: 'Chrome / Android', ipAddress: '41.x.x.x', location: 'Dar es Salaam', loginAt: '14 Mei 2026, 10:42' },
} satisfies TemplateEntry
