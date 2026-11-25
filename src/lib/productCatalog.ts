// Product catalog hierarchy: Sekta -> Kundi (category) -> Chapa (brand) -> Ukubwa (variant).
// Only the taxonomy is pre-loaded; barcodes come from real shop entries (no invented data).
export interface SectorDef { name: string; categories: { name: string; brands: string[] }[] }

export const CATALOG: SectorDef[] = [
  { name: 'Vinywaji', categories: [
    { name: 'Maji', brands: ['Kilimanjaro', 'Uhai', 'Dasani', 'Afya', 'Hill'] },
    { name: 'Soda', brands: ['Coca-Cola', 'Fanta', 'Sprite', 'Pepsi', 'Mirinda', '7Up', 'Mountain Dew', 'Azam Cola', 'Krest', 'Stoney'] },
    { name: 'Juisi', brands: ['Azam', 'Afya', 'Ceres', 'Minute Maid', 'Highlands'] },
    { name: 'Vinywaji vya nguvu', brands: ['Red Bull', 'Mo Xtra', 'Power Play', 'Rockboom'] },
    { name: 'Pombe', brands: ['Kilimanjaro Lager', 'Safari', 'Serengeti', 'Castle Lite', 'Balimi', 'Konyagi', 'Smirnoff'] },
    { name: 'Maziwa', brands: ['Azam', 'Tanga Fresh', 'Asas', 'Dar Fresh'] },
  ] },
  { name: 'Vyakula', categories: [
    { name: 'Nafaka na unga', brands: ['Azam', 'Sembe', 'Dona', 'Mchele', 'Ngano'] },
    { name: 'Mafuta ya kupikia', brands: ['Korie', 'Sundrop', 'Kimbo', 'Safi', 'Mount Meru'] },
    { name: 'Sukari na chumvi', brands: ['Kilombero', 'Mtibwa', 'Kagera', 'Sea Salt'] },
    { name: 'Vitafunwa', brands: ['Azam', 'Biskuti', 'Pipi', 'Chipsi', 'Karanga'] },
    { name: 'Viungo', brands: ['Royco', 'Simba Mbili', 'Pilipili', 'Chai'] },
    { name: 'Vyakula vya makopo', brands: ['Tomato paste', 'Maharage', 'Samaki'] },
  ] },
  { name: 'Hardware', categories: [
    { name: 'Saruji', brands: ['Twiga', 'Simba', 'Dangote', 'Tembo'] },
    { name: 'Rangi', brands: ['Goldstar', 'Sadolin', 'Crown', 'Plascon'] },
    { name: 'Mabati na chuma', brands: ['ALAF', 'Kiboko', 'Nondo'] },
    { name: 'Misumari na skrubu', brands: [] },
    { name: 'Umeme', brands: ['Waya', 'Swichi', 'Balbu', 'Soketi'] },
    { name: 'Mabomba', brands: ['PVC', 'PPR', 'Bomba za chuma'] },
    { name: 'Vifaa vya mkono', brands: [] },
  ] },
  { name: 'Dawa na Afya', categories: [
    { name: 'Dawa za maumivu', brands: ['Panadol', 'Paracetamol', 'Ibuprofen'] },
    { name: 'Vitamini', brands: [] },
    { name: 'Huduma ya kwanza', brands: [] },
  ] },
  { name: 'Usafi na Urembo', categories: [
    { name: 'Sabuni', brands: ['Omo', 'Foma', 'Jamaa', 'Kipande', 'Protex', 'Geisha'] },
    { name: 'Dawa ya meno', brands: ['Colgate', 'Whitedent', 'Close Up'] },
    { name: 'Mafuta ya mwili', brands: ['Vaseline', 'Nivea', 'Movit'] },
    { name: 'Nywele', brands: [] },
    { name: 'Pedi na nepi', brands: ['Always', 'Softcare', 'Pampers'] },
  ] },
  { name: 'Elektroniki', categories: [
    { name: 'Simu', brands: ['Tecno', 'Infinix', 'Itel', 'Samsung', 'iPhone'] },
    { name: 'Vifaa vya simu', brands: ['Chaja', 'Earphones', 'Power bank', 'Kava'] },
    { name: 'Vocha na muda wa maongezi', brands: ['Vodacom', 'Airtel', 'Tigo/Yas', 'Halotel', 'TTCL'] },
    { name: 'Betri', brands: [] },
  ] },
  { name: 'Mavazi', categories: [
    { name: 'Nguo za kiume', brands: [] }, { name: 'Nguo za kike', brands: [] },
    { name: 'Nguo za watoto', brands: [] }, { name: 'Viatu', brands: [] },
  ] },
  { name: 'Vifaa vya shule na ofisi', categories: [
    { name: 'Madaftari', brands: [] }, { name: 'Kalamu', brands: ['Bic'] }, { name: 'Karatasi', brands: [] },
  ] },
];

export const NO_VALUE = '__none__';

export interface CatalogFields { sector?: string | null; category?: string | null; brand?: string | null; variant_name?: string | null }

const clean = (v?: string | null) => (v ?? '').trim();
const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean))).sort((x, y) => x.localeCompare(y));

/** Sector names: templates plus the shop's own custom values. */
export function sectorOptions(products: CatalogFields[] = []): string[] {
  return uniq([...CATALOG.map(s => s.name), ...products.map(p => clean(p.sector))]);
}
export function categoryOptions(sector: string, products: CatalogFields[] = []): string[] {
  const tpl = CATALOG.find(s => s.name === sector)?.categories.map(c => c.name) ?? [];
  return uniq([...tpl, ...products.filter(p => clean(p.sector) === sector).map(p => clean(p.category))]);
}
export function brandOptions(sector: string, category: string, products: CatalogFields[] = []): string[] {
  const tpl = CATALOG.find(s => s.name === sector)?.categories.find(c => c.name === category)?.brands ?? [];
  return uniq([...tpl, ...products.filter(p => clean(p.sector) === sector && clean(p.category) === category).map(p => clean(p.brand))]);
}

export interface CatalogFilter { sector?: string; category?: string; brand?: string }

/** Filter products at any level; empty levels match everything. */
export function matchesCatalogFilter(p: CatalogFields, f: CatalogFilter): boolean {
  if (f.sector && clean(p.sector) !== f.sector) return false;
  if (f.category && clean(p.category) !== f.category) return false;
  if (f.brand && clean(p.brand) !== f.brand) return false;
  return true;
}

export type CatalogLevel = 'sector' | 'category' | 'brand' | 'variant';
export const LEVEL_LABEL: Record<CatalogLevel, string> = { sector: 'Sekta', category: 'Kundi', brand: 'Chapa', variant: 'Ukubwa / Aina' };
export const UNCATEGORISED = 'Haijapangwa';

/** Sum revenue/quantity of sale items grouped by a catalog level. */
export function groupByLevel(
  items: { quantity: number; subtotal: number; product?: (CatalogFields & { name?: string }) | null }[],
  level: CatalogLevel,
) {
  const map = new Map<string, { name: string; revenue: number; quantity: number }>();
  for (const it of items) {
    const p = it.product ?? {};
    const raw = level === 'variant' ? [clean(p.brand) || clean((p as any).name), clean(p.variant_name)].filter(Boolean).join(' ') : clean((p as any)[level]);
    const key = raw || UNCATEGORISED;
    const cur = map.get(key) ?? { name: key, revenue: 0, quantity: 0 };
    cur.revenue += Number(it.subtotal) || 0;
    cur.quantity += Number(it.quantity) || 0;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

/** A barcode worth sharing: real-looking codes only, not Kiduka-generated internal codes. */
export function isShareableBarcode(code?: string | null): boolean {
  const c = clean(code);
  return /^[0-9A-Za-z-]{6,32}$/.test(c);
}
