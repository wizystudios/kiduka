export const dayKey = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
export const formatDay = (date: Date) => new Intl.DateTimeFormat('sw-TZ', { timeZone: 'Africa/Dar_es_Salaam', day: 'numeric', month: 'short', year: 'numeric' }).format(date);
export function analyticsRange(days: number, now = new Date()) {
  const today = new Date(`${dayKey(now)}T00:00:00+03:00`);
  return { start: new Date(today.getTime() - (days - 1) * 86400000), end: now };
}