/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandLayout, styles, APP_URL } from './brand-layout.tsx'

interface Props { customerName?: string; productName?: string; productSlug?: string; storeSlug?: string; rating?: number }

const Email = ({ customerName, productName, productSlug, storeSlug, rating }: Props) => (
  <BrandLayout
    audience="customer"
    preview="Asante kwa maoni yako"
    heading="Asante kwa maoni yako!"
    intro={`Habari${customerName ? ' ' + customerName : ''}, tunakushukuru kwa kushiriki maoni yako${productName ? ' kuhusu ' + productName : ''}.`}
    ctaUrl={storeSlug ? `${APP_URL}/duka/${storeSlug}` : `${APP_URL}/sokoni`}
    ctaLabel="Endelea Kununua"
  >
    <div style={styles.card}>
      {rating ? (<><Text style={styles.label}>Ulitoa</Text><Text style={styles.value}>{'⭐'.repeat(Math.max(1, Math.min(5, rating)))}</Text></>) : null}
      <Text style={styles.text}>Maoni yako yanasaidia wateja wengine na muuzaji kuboresha huduma.</Text>
    </div>
  </BrandLayout>
)

export const template = {
  component: Email,
  subject: 'Asante kwa maoni yako · Kiduka',
  displayName: 'Customer — Review Thanks',
  previewData: { customerName: 'Neema', productName: 'Sukari 1kg', storeSlug: 'asha', rating: 5 },
} satisfies TemplateEntry
