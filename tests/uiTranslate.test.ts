import { describe, it, expect } from 'bun:test';
import { buildTranslator } from '../src/lib/uiTranslate';
import en from '../src/i18n/en.json';

describe('UI translation', () => {
  const tr = buildTranslator({ 'Ongeza bidhaa': 'Add product', 'Majaribio {0} yamebaki': '{0} attempts left' });
  it('translates exact text keeping surrounding spaces', () => expect(tr(' Ongeza bidhaa ')).toBe(' Add product '));
  it('fills placeholders', () => expect(tr('Majaribio 2 yamebaki')).toBe('2 attempts left'));
  it('leaves unknown text (user data) alone', () => expect(tr('Pepsi 500ml')).toBeNull());
  it('ships an English dictionary for the app', () => expect(Object.keys(en).length).toBeGreaterThan(3000));
});
