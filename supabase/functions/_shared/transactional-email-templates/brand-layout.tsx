/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Link, Preview, Section, Text, Hr, Button,
} from 'npm:@react-email/components@0.0.22'

export const APP_URL = 'https://kiduka.shop'
export const LOGO_URL = 'https://qbjcuenvjrflfbdshogq.supabase.co/storage/v1/object/public/email-assets/kiduka-logo.png'

interface BrandLayoutProps {
  preview: string
  heading: string
  intro?: string
  children?: React.ReactNode
  ctaUrl?: string
  ctaLabel?: string
  audience?: 'owner' | 'customer'
}

export const BrandLayout = ({ preview, heading, intro, children, ctaUrl, ctaLabel, audience = 'owner' }: BrandLayoutProps) => (
  <Html lang="sw" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Img src={LOGO_URL} width="56" height="56" alt="Kiduka" style={logo} />
          <Text style={brandName}>Kiduka</Text>
          <Text style={brandTagline}>Biashara Smart</Text>
        </Section>

        {/* Body */}
        <Section style={body}>
          <Heading style={h1}>{heading}</Heading>
          {intro ? <Text style={text}>{intro}</Text> : null}
          {children}
          {ctaUrl ? (
            <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
              <Button href={ctaUrl} style={button}>{ctaLabel ?? 'Fungua Kiduka'}</Button>
            </Section>
          ) : null}
        </Section>

        <Hr style={hr} />

        {/* Ad slot — static promo for Kiduka ecosystem */}
        <Section style={adSlot}>
          <Text style={adKicker}>Kiduka Sokoni</Text>
          <Text style={adTitle}>Uza bidhaa zako mtandaoni — bila gharama ya ziada.</Text>
          <Link href={`${APP_URL}/sokoni`} style={adLink}>Tembelea Sokoni →</Link>
        </Section>

        <Hr style={hr} />

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            Kiduka — Mfumo wa biashara wa Tanzania.
          </Text>
          <Text style={footerLinks}>
            <Link href={APP_URL} style={footerLink}>Fungua App</Link>
            {' · '}
            <Link href={`${APP_URL}/settings?tab=profile`} style={footerLink}>Mipangilio ya Email</Link>
            {' · '}
            <Link href={`${APP_URL}/help`} style={footerLink}>Msaada</Link>
          </Text>
          <Text style={footerSmall}>
            {audience === 'owner'
              ? 'Unapokea email hii kama mmiliki wa biashara kwenye Kiduka.'
              : 'Unapokea email hii kuhusu oda yako kwenye Kiduka Sokoni.'}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }
const header = { textAlign: 'center' as const, padding: '12px 0 20px' }
const logo = { display: 'block', margin: '0 auto 8px', borderRadius: '14px' }
const brandName = { fontSize: '20px', fontWeight: 700, color: '#1d4ed8', margin: '0', letterSpacing: '-0.01em' }
const brandTagline = { fontSize: '12px', color: '#16a34a', margin: '2px 0 0', fontWeight: 500 }
const body = { backgroundColor: '#ffffff', padding: '8px 4px 4px' }
const h1 = { fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 12px' }
const button = { backgroundColor: '#1d4ed8', color: '#ffffff', padding: '12px 24px', borderRadius: '999px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0' }
const adSlot = { backgroundColor: '#f0fdf4', padding: '16px 18px', borderRadius: '16px' }
const adKicker = { fontSize: '11px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 4px' }
const adTitle = { fontSize: '14px', color: '#0f172a', margin: '0 0 8px', fontWeight: 600 }
const adLink = { fontSize: '13px', color: '#1d4ed8', fontWeight: 600, textDecoration: 'none' }
const footer = { textAlign: 'center' as const, padding: '8px 0 0' }
const footerText = { fontSize: '12px', color: '#64748b', margin: '0 0 6px' }
const footerLinks = { fontSize: '12px', color: '#64748b', margin: '0 0 8px' }
const footerLink = { color: '#1d4ed8', textDecoration: 'none' }
const footerSmall = { fontSize: '11px', color: '#94a3b8', margin: '6px 0 0' }

// Helper styles for use inside templates
export const styles = {
  text,
  label: { fontSize: '12px', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.04em', fontWeight: 600, margin: '0 0 4px' },
  value: { fontSize: '15px', color: '#0f172a', fontWeight: 600, margin: '0 0 12px' },
  amount: { fontSize: '24px', color: '#16a34a', fontWeight: 700, margin: '0 0 12px' },
  warning: { fontSize: '14px', color: '#dc2626', fontWeight: 600, margin: '0 0 12px' },
  card: { backgroundColor: '#f8fafc', borderRadius: '16px', padding: '16px', margin: '12px 0' },
}

export const fmtTsh = (amount: number | string | undefined) => {
  if (amount === undefined || amount === null) return 'TSh —'
  const n = typeof amount === 'string' ? Number(amount) : amount
  if (!Number.isFinite(n)) return 'TSh —'
  return 'TSh ' + Math.round(n).toLocaleString('en-US')
}
