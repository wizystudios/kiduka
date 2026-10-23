import { test, expect } from 'bun:test';
import { SERVICE_HUB_WHATSAPP, hubWhatsAppLink, serviceHubMessage, appointmentToIso } from '../src/lib/serviceHub.ts';
test('official WhatsApp contact is the requested number', () => { expect(SERVICE_HUB_WHATSAPP).toBe('255797813597'); expect(hubWhatsAppLink('Miadi', true)).toBe('https://wa.me/255797813597?text=Miadi'); });
test('appointments use Dar es Salaam time regardless of visitor timezone', () => { expect(appointmentToIso('2026-10-24T10:00')).toBe('2026-10-24T07:00:00.000Z'); });
test('shared service message points to the public hub', () => { expect(serviceHubMessage()).toContain('https://kiduka.shop/servicehub'); });
