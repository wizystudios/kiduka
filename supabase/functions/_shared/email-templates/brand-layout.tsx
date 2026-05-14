/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Link, Preview, Section, Text, Hr, Button, Row, Column,
} from 'npm:@react-email/components@0.0.22'

export const APP_URL = 'https://kiduka.shop'
export const LOGO_URL = 'https://qbjcuenvjrflfbdshogq.supabase.co/storage/v1/object/public/email-assets/kiduka-logo.png'
export const AD_IMAGE_URL = 'https://qbjcuenvjrflfbdshogq.supabase.co/storage/v1/object/public/email-assets/sokoni-ad.jpg'

interface AuthBrandLayoutProps {
  preview: string
  heading: string
  intro?: string
  children?: React.ReactNode
  ctaUrl?: string
  ctaLabel?: string
  expiryNote?: string
}

export const AuthBrandLayout = ({
  preview, heading, intro, children, ctaUrl, ctaLabel, expiryNote,
}: AuthBrandLayoutProps) => (
  <Html lang="sw" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Brand Header */}
        <Section style={headerBar}>
          <Row>
            <Column style={{ verticalAlign: 'middle', width: '64px' }}>
              <Img src={LOGO_URL} width="56" height="56" alt="Kiduka" style={logo} />
            </Column>
            <Column style={{ verticalAlign: 'middle', paddingLeft: '12px' }}>
              <Text style={brandName}>Kiduka</Text>
              <Text style={brandTagline}>Biashara Smart · Tanzania</Text>
            </Column>
          </Row>
        </Section>

        {/* Body */}
        <Section style={bodySection}>
          <Heading style={h1}>{heading}</Heading>
          {intro ? <Text style={text}>{intro}</Text> : null}
          {children}

          {ctaUrl ? (
            <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
              <Button href={ctaUrl} style={button}>{ctaLabel ?? 'Endelea'}</Button>
            </Section>
          ) : null}

          {expiryNote ? (
            <Text style={expiry}>{expiryNote}</Text>
          ) : null}
        </Section>

        {/* Promo / Ad Slot */}
        <Section style={adCard}>
          <Img src={AD_IMAGE_URL} width="528" height="220" alt="Kiduka Sokoni" style={adImage} />
          <Section style={adBody}>
            <Text style={adKicker}>KIDUKA SOKONI</Text>
            <Text style={adTitle}>Uza bidhaa zako mtandaoni — bila gharama ya ziada.</Text>
            <Text style={adDesc}>Sajili duka lako leo, fikia wateja kote Tanzania, na simamia oda zote mahali pamoja.</Text>
            <Button href={`${APP_URL}/sokoni`} style={adButton}>Tembelea Sokoni →</Button>
          </Section>
        </Section>

        {/* Footer with full link grid */}
        <Section style={footer}>
          <Row>
            <Column style={footerCol}>
              <Text style={footerHeading}>Biashara</Text>
              <Link href={`${APP_URL}/dashboard`} style={footerLink}>Dashboard</Link><br />
              <Link href={`${APP_URL}/products`} style={footerLink}>Bidhaa</Link><br />
              <Link href={`${APP_URL}/sales`} style={footerLink}>Mauzo</Link><br />
              <Link href={`${APP_URL}/reports`} style={footerLink}>Ripoti</Link>
            </Column>
            <Column style={footerCol}>
              <Text style={footerHeading}>Sokoni</Text>
              <Link href={`${APP_URL}/sokoni`} style={footerLink}>Tembelea</Link><br />
              <Link href={`${APP_URL}/sokoni-orders`} style={footerLink}>Oda</Link><br />
              <Link href={`${APP_URL}/wishlist`} style={footerLink}>Vipendwa</Link><br />
              <Link href={`${APP_URL}/order-tracking`} style={footerLink}>Fuatilia Oda</Link>
            </Column>
            <Column style={footerCol}>
              <Text style={footerHeading}>Akaunti</Text>
              <Link href={`${APP_URL}/settings`} style={footerLink}>Mipangilio</Link><br />
              <Link href={`${APP_URL}/subscription`} style={footerLink}>Michango</Link><br />
              <Link href={`${APP_URL}/notifications`} style={footerLink}>Arifa</Link><br />
              <Link href={`${APP_URL}/help`} style={footerLink}>Msaada</Link>
            </Column>
          </Row>

          <Hr style={hr} />

          <Text style={footerBrand}>
            <strong style={{ color: '#1d4ed8' }}>Kiduka</strong> — Mfumo kamili wa biashara wa Tanzania.
          </Text>
          <Text style={footerSmall}>
            Email hii ni ya usalama wa akaunti yako. Kama haukuiombwa, ipuuze.
          </Text>
          <Text style={footerSmall}>
            <Link href={APP_URL} style={mutedLink}>kiduka.shop</Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '24px 0' }
const container = { maxWidth: '600px', margin: '0 auto', padding: '0 16px' }

const headerBar = { padding: '8px 4px 20px', borderBottom: '1px solid #f1f5f9', marginBottom: '20px' }
const logo = { display: 'block', borderRadius: '14px' }
const brandName = { fontSize: '22px', fontWeight: 800, color: '#1d4ed8', margin: '0', letterSpacing: '-0.02em', lineHeight: '1' }
const brandTagline = { fontSize: '12px', color: '#16a34a', margin: '2px 0 0', fontWeight: 600 }

const bodySection = { backgroundColor: '#ffffff', padding: '4px 4px 8px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 14px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 14px' }
const expiry = { fontSize: '13px', color: '#64748b', textAlign: 'center' as const, margin: '14px 0 0', fontStyle: 'italic' as const }

const button = { backgroundColor: '#1d4ed8', color: '#ffffff', padding: '14px 32px', borderRadius: '999px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }

const adCard = { margin: '28px 0 24px', backgroundColor: '#f0fdf4', borderRadius: '20px', overflow: 'hidden' }
const adImage = { width: '100%', height: 'auto', display: 'block', objectFit: 'cover' as const }
const adBody = { padding: '18px 20px 20px' }
const adKicker = { fontSize: '11px', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 6px' }
const adTitle = { fontSize: '17px', color: '#0f172a', margin: '0 0 6px', fontWeight: 700, lineHeight: '1.3' }
const adDesc = { fontSize: '13px', color: '#475569', margin: '0 0 14px', lineHeight: '1.55' }
const adButton = { backgroundColor: '#16a34a', color: '#ffffff', padding: '10px 20px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }

const hr = { borderColor: '#e2e8f0', margin: '20px 0 14px' }
const footer = { padding: '8px 4px 0' }
const footerCol = { verticalAlign: 'top' as const, paddingRight: '12px', width: '33%' }
const footerHeading = { fontSize: '11px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 8px' }
const footerLink = { color: '#475569', textDecoration: 'none', fontSize: '13px', lineHeight: '1.9' }
const footerBrand = { fontSize: '13px', color: '#475569', margin: '4px 0 6px', textAlign: 'center' as const }
const footerSmall = { fontSize: '11px', color: '#94a3b8', margin: '4px 0', textAlign: 'center' as const }
const mutedLink = { color: '#64748b', textDecoration: 'underline' }

export const inlineText = text
export const codeBox = {
  fontSize: '32px', fontWeight: 800, letterSpacing: '0.3em', color: '#1d4ed8',
  textAlign: 'center' as const, padding: '20px', backgroundColor: '#f0f9ff',
  borderRadius: '16px', margin: '20px 0', fontFamily: 'monospace',
}
