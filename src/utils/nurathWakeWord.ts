export type NurathWakeMatch = {
  heardText: string;
  normalizedText: string;
  matchedAlias: string | null;
  triggered: boolean;
  command: string;
};

export const NURATH_AUTO_LISTEN_KEY = 'kiduka_nurath_handsfree_enabled';

export const WAKE_WORD_ALIASES = [
  'nurath', 'nurat', 'nurathi', 'nurati', 'nurad', 'nuradi', 'nurahi', 'norath', 'norat', 'norahi',
  'nura', 'nuru', 'nora', 'noor', 'noora', 'nourath', 'nuwrath', 'nuwrat', 'nuhrath', 'nurta',
  'nuratha', 'nyurath', 'nyurat', 'nuratth', 'nuraz',
];

export const WAKE_WORD_PHRASES = [
  'new wrath', 'new rat', 'new route', 'no wrath', 'no rat', 'nura t', 'nur a', 'nu rath',
  'noor ath', 'new oath', 'noo rath', 'new arth', 'nyu rath', 'nuh rath',
];

export const NURATH_OFF_PATTERNS = [
  /\boff\b/i,
  /\bzima\b/i,
  /\bsimama\b/i,
  /\blala\b/i,
  /\bnyamaza\b/i,
  /\bturn ?off\b/i,
  /\bstop listening\b/i,
  /\bgo to sleep\b/i,
];

export const normalizeNurathText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const editDistanceWithinOne = (value: string, target: string) => {
  if (Math.abs(value.length - target.length) > 1) return false;
  if (value === target) return true;

  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < value.length && j < target.length) {
    if (value[i] === target[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (value.length > target.length) i += 1;
    else if (value.length < target.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return edits + (value.length - i) + (target.length - j) <= 1;
};

export const stripNurathWakeWord = (value: string) => {
  let out = value;
  for (const phrase of WAKE_WORD_PHRASES) {
    out = out.replace(new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'gi'), '');
  }
  for (const alias of WAKE_WORD_ALIASES) {
    out = out.replace(new RegExp(`\\b${alias}\\b`, 'gi'), '');
  }
  return out.replace(/\s+/g, ' ').trim();
};

export const detectNurathWakePhrase = (spokenText: string): NurathWakeMatch => {
  const normalizedText = normalizeNurathText(spokenText);
  const tokens = normalizedText.split(' ').filter(Boolean);

  const matchedAlias = WAKE_WORD_ALIASES.find((alias) =>
    normalizedText.includes(alias) ||
    tokens.some((token) =>
      token === alias ||
      (token.length >= 4 && (token.startsWith(alias) || alias.startsWith(token) || editDistanceWithinOne(token, alias)))
    ),
  ) ?? WAKE_WORD_PHRASES.find((phrase) =>
    normalizedText.includes(phrase) || normalizeNurathText(phrase).replace(/\s/g, '') === tokens.slice(0, 2).join(''),
  ) ?? null;

  return {
    heardText: spokenText,
    normalizedText,
    matchedAlias,
    triggered: Boolean(matchedAlias),
    command: stripNurathWakeWord(spokenText),
  };
};