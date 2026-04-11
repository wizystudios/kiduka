const SWAHILI_VOICE_PATTERNS = [/\bsw\b/i, /kiswahili/i, /swahili/i];
const EAST_AFRICA_ENGLISH_PATTERNS = [/en-ke/i, /en-tz/i, /kenya/i, /tanzania/i];

const splitIntoSpeechChunks = (text: string, maxLength = 180) => {
  const cleanText = text
    .replace(/TZS/gi, 'shilingi')
    .replace(/POS/gi, 'posi')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanText.length <= maxLength) {
    return [cleanText];
  }

  const parts = cleanText.split(/(?<=[.!?;,])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const part of parts) {
    if (!part) continue;

    if (`${current} ${part}`.trim().length <= maxLength) {
      current = `${current} ${part}`.trim();
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    if (part.length <= maxLength) {
      current = part;
      continue;
    }

    const words = part.split(' ');
    let buffer = '';

    for (const word of words) {
      if (`${buffer} ${word}`.trim().length <= maxLength) {
        buffer = `${buffer} ${word}`.trim();
      } else {
        if (buffer) chunks.push(buffer);
        buffer = word;
      }
    }

    current = buffer;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.filter(Boolean);
};

const loadVoices = async () => {
  if (!('speechSynthesis' in window)) {
    return [] as SpeechSynthesisVoice[];
  }

  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) {
    return existing;
  }

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const timeout = window.setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 1200);

    const handleVoicesChanged = () => {
      window.clearTimeout(timeout);
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged, { once: true });
  });
};

const selectBestVoice = (voices: SpeechSynthesisVoice[]) => {
  return (
    voices.find((voice) => SWAHILI_VOICE_PATTERNS.some((pattern) => pattern.test(voice.lang) || pattern.test(voice.name))) ||
    voices.find((voice) => EAST_AFRICA_ENGLISH_PATTERNS.some((pattern) => pattern.test(voice.lang) || pattern.test(voice.name))) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ||
    null
  );
};

const speakChunk = (chunk: string, voice: SpeechSynthesisVoice | null) =>
  new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = voice?.lang || 'sw-TZ';
    utterance.rate = voice?.lang.toLowerCase().startsWith('sw') ? 0.82 : 0.88;
    utterance.pitch = 1;
    utterance.volume = 1;

    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });

export const speakAssistantText = async (text: string) => {
  if (!('speechSynthesis' in window) || !text.trim()) return;

  window.speechSynthesis.cancel();

  const voices = await loadVoices();
  const voice = selectBestVoice(voices);
  const chunks = splitIntoSpeechChunks(text);

  for (const chunk of chunks) {
    await speakChunk(chunk, voice);
  }
};