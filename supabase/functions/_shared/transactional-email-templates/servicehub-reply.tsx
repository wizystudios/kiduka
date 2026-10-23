import * as React from 'npm:react@18.3.1';
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22';
import type { TemplateEntry } from './registry.ts';
const Email = ({ message, reference }: { message?: string; reference?: string }) => <Html lang="sw"><Head/><Preview>Jibu la ombi lako la ServiceHUB</Preview><Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}><Container style={{ padding: '28px' }}><Heading>Kiduka ServiceHUB</Heading><Text>Kumbukumbu ya ombi lako: {reference?.slice(0,8).toUpperCase()}</Text><Text style={{ whiteSpace: 'pre-wrap' }}>{message}</Text><Text>Unaweza kuwasiliana nasi WhatsApp +255 797 813 597 ukitaja kumbukumbu ya ombi lako.</Text></Container></Body></Html>;
export const template = { component: Email, subject: 'Jibu la ombi lako — Kiduka ServiceHUB' } satisfies TemplateEntry;
