import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildTranslator, type Dict } from '@/lib/uiTranslate';

const ATTRS = ['placeholder', 'title', 'aria-label'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE']);

/** Swaps the app's built-in Swahili text for the chosen language on screen and restores it when switching back. */
export function UiTranslator() {
  const { language } = useLanguage();

  useEffect(() => {
    if (language === 'sw') return;
    let cancelled = false;
    const originals = new Map<Node, string>();
    const attrOriginals = new Map<Element, Record<string, string>>();
    let observer: MutationObserver | null = null;

    import('@/i18n/en.json').then(({ default: dict }) => {
      if (cancelled) return;
      const tr = buildTranslator(dict as Dict);
      const skip = (el: Element | null) => !!el?.closest('[data-no-translate],[contenteditable="true"]') || (!!el && SKIP.has(el.tagName));

      const doText = (n: Text) => {
        if (skip(n.parentElement)) return;
        const cur = n.nodeValue ?? '';
        const out = tr(cur);
        if (out && out !== cur) { if (!originals.has(n)) originals.set(n, cur); n.nodeValue = out; }
      };
      const doEl = (el: Element) => {
        if (skip(el)) return;
        for (const a of ATTRS) {
          const v = el.getAttribute(a); if (!v) continue;
          const out = tr(v);
          if (out && out !== v) {
            const rec = attrOriginals.get(el) ?? {}; if (!(a in rec)) rec[a] = v; attrOriginals.set(el, rec);
            el.setAttribute(a, out);
          }
        }
      };
      const walk = (root: Node) => {
        if (root.nodeType === Node.TEXT_NODE) return doText(root as Text);
        if (root.nodeType !== Node.ELEMENT_NODE) return;
        doEl(root as Element);
        const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let n: Node | null;
        while ((n = it.nextNode())) n.nodeType === Node.TEXT_NODE ? doText(n as Text) : doEl(n as Element);
      };

      walk(document.body);
      observer = new MutationObserver(muts => {
        for (const m of muts) {
          if (m.type === 'characterData') doText(m.target as Text);
          else if (m.type === 'attributes') doEl(m.target as Element);
          else m.addedNodes.forEach(walk);
        }
      });
      observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      originals.forEach((v, n) => { (n as Text).nodeValue = v; });
      attrOriginals.forEach((rec, el) => Object.entries(rec).forEach(([a, v]) => el.setAttribute(a, v)));
    };
  }, [language]);

  return null;
}
