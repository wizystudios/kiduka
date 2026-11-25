/** Matches UI text (exact or with {n} placeholders) against a translation dictionary. */
export type Dict = Record<string, string>;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function buildTranslator(dict: Dict) {
  const exact = new Map<string, string>();
  const patterns: { re: RegExp; out: string }[] = [];
  for (const [src, out] of Object.entries(dict)) {
    if (/\{\d+\}/.test(src)) {
      const parts = src.split(/\{(\d+)\}/);
      let re = '^';
      for (let i = 0; i < parts.length; i++) re += i % 2 ? '(.+?)' : esc(parts[i]);
      patterns.push({ re: new RegExp(re + '$', 's'), out });
      const order = parts.filter((_, i) => i % 2).map(Number);
      (patterns[patterns.length - 1] as any).order = order;
    } else exact.set(src, out);
  }
  patterns.sort((a, b) => b.re.source.length - a.re.source.length);
  return (text: string): string | null => {
    const core = text.replace(/\s+/g, ' ').trim();
    if (!core) return null;
    const hit = exact.get(core);
    const wrap = (t: string) => text.replace(core.length === text.trim().length ? text.trim() : text, t);
    if (hit) return text.replace(text.trim(), hit);
    for (const p of patterns) {
      const m = core.match(p.re);
      if (!m) continue;
      const order: number[] = (p as any).order;
      const out = p.out.replace(/\{(\d+)\}/g, (_, n) => m[order.indexOf(Number(n)) + 1] ?? '');
      return wrap(out);
    }
    return null;
  };
}
