import { test, expect } from 'bun:test';
import { analyticsRange } from '../src/lib/analyticsPeriod.ts';
import { paymentAmountError } from '../src/lib/paymentValidation.ts';
test('partial and full payments are allowed, but zero and excess payments are rejected', () => {
  expect(paymentAmountError(2000, 7000)).toBeNull();
  expect(paymentAmountError(7000, 7000)).toBeNull();
  expect(paymentAmountError(7001, 7000)).not.toBeNull();
  expect(paymentAmountError(0, 7000)).not.toBeNull();
});
test('Leo starts at midnight in Tanzania, not a rolling 24 hours', () => {
  expect(analyticsRange(1, new Date('2026-11-08T07:42:00Z')).start.toISOString()).toBe('2026-11-07T21:00:00.000Z');
});
test('seven calendar days include today and the previous six days', () => {
  expect(analyticsRange(7, new Date('2026-11-08T07:42:00Z')).start.toISOString()).toBe('2026-11-01T21:00:00.000Z');
});