export const normalizeTzPhoneDigits = (input: string): string => {
  const digits = (input || '').replace(/\D/g, '');
  if (!digits) return '';

  // Tanzania
  if (digits.startsWith('255') && digits.length === 12) return digits;
  if (digits.length === 9) return `255${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `255${digits.slice(1)}`;

  // If user already included country code with +, it becomes digits-only above
  if (digits.length === 12 && digits.startsWith('255')) return digits;

  return digits;
};

export const formatTzPhoneE164 = (input: string): string => {
  const digits = normalizeTzPhoneDigits(input);
  return digits ? `+${digits}` : '';
};
