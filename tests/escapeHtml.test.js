import { describe, expect, test } from 'bun:test';
import { escapeHtml } from '../src/lib/safeCell.ts';

describe('printable report escaping', () => {
  test('script tags in spoken transcripts or business names become inert text', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
  test('attribute-breaking quotes are escaped', () => {
    expect(escapeHtml(`" onload='x'`)).toBe('&quot; onload=&#39;x&#39;');
  });
  test('empty values print as empty text', () => {
    expect(escapeHtml(null)).toBe('');
  });
});
