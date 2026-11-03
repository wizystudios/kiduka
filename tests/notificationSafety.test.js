import { test, expect } from 'bun:test';
import { notificationPath, saveNotificationDetail, readNotificationDetail } from '../src/lib/notificationDetails.ts';

test('notification details remain tab-local and IDs resolve to the corresponding detail', () => {
  const values = new Map();
  globalThis.sessionStorage = { setItem: (k, v) => values.set(k, v), getItem: k => values.get(k) ?? null };
  const detail = { id: 'error-123', title: 'JARIBIO', description: 'Failure details', kind: 'error', createdAt: '2026-11-03T05:37:00Z', source: '/settings' };
  saveNotificationDetail(detail);
  expect(notificationPath(detail.id)).toBe('/arifa/error-123');
  expect(readNotificationDetail(detail.id)).toEqual(detail);
  expect(readNotificationDetail('other')).toBeNull();
  values.clear();
  expect(readNotificationDetail(detail.id)).toBeNull();
});