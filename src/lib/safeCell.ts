/**
 * Spreadsheet-safe values: text starting with = + - @ (or tab/CR) is prefixed with a
 * quote so Excel/Sheets show it as text instead of running it as a formula.
 * Real numbers stay numbers.
 */
export const safeCell = <T,>(value: T): T | string => {
  if (typeof value !== 'string') return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
};

/** One quoted CSV field, formula-neutralized. */
export const csvField = (value: unknown): string => {
  const v = value == null ? '' : safeCell(String(value));
  return `"${String(v).replace(/"/g, '""')}"`;
};

export const csvRow = (values: unknown[]): string => values.map(csvField).join(',');

/** Neutralize every string value in a row object before handing it to a spreadsheet writer. */
export const safeRow = <R extends Record<string, unknown>>(row: R): R =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k, safeCell(v)])) as R;

/** Escape text before it is placed inside printable HTML documents. */
export const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"'`]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]!));
