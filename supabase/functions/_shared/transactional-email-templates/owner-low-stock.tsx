/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandLayout, styles, APP_URL } from './brand-layout.tsx'

interface Props { name?: string; productName?: string; productId?: string; stockQuantity?: number; threshold?: number }

const Email = ({ name, productName, productId, stockQuantity, threshold }: Props) => (
  <BrandLayout
    audience="owner"
    preview="Stock chini — bidhaa karibu kuisha"
    heading="Onyo: Stock iko chini"
    intro={`Habari${name ? ' ' + name : ''}, bidhaa moja imefika kiwango cha chini.`}
    ctaUrl={productId ? `${APP_URL}/products/${productId}` : `${APP_URL}/products`}
    ctaLabel="Fungua Bidhaa"
  >
    <div style={styles.card}>
      <Text style={styles.label}>Bidhaa</Text>
      <Text style={styles.value}>{productName ?? 'Bidhaa'}</Text>
      <Text style={styles.label}>Stock iliyobaki</Text>
      <Text style={styles.warning}>{stockQuantity ?? 0}{threshold ? ` (kiwango: ${threshold})` : ''}</Text>
    </div>
    <Text style={styles.text}>Ongeza stock kabla wateja hawajaikosa.</Text>
  </BrandLayout>
)

export const template = {
  component: Email,
  subject: (d) => `Stock chini: ${d?.productName ?? 'bidhaa'}`,
  displayName: 'Owner — Low Stock',
  previewData: { name: 'Juma', productName: 'Sukari 1kg', productId: 'p-1', stockQuantity: 3, threshold: 10 },
} satisfies TemplateEntry
