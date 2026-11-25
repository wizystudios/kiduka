import { Button } from '@/components/ui/button';
import { UNCATEGORISED, type CatalogFields, type CatalogFilter } from '@/lib/productCatalog';

interface Props { products: CatalogFields[]; value: CatalogFilter; onChange: (f: CatalogFilter) => void }

const values = (list: CatalogFields[], key: keyof CatalogFields) =>
  Array.from(new Set(list.map(p => (p[key] ?? '').toString().trim()).filter(Boolean))).sort();

/** Chips to narrow products by Sekta, then Kundi, then Chapa. */
export function CatalogFilterBar({ products, value, onChange }: Props) {
  const sectors = values(products, 'sector');
  const inSector = value.sector ? products.filter(p => (p.sector ?? '').trim() === value.sector) : [];
  const cats = value.sector ? values(inSector, 'category') : [];
  const inCat = value.category ? inSector.filter(p => (p.category ?? '').trim() === value.category) : [];
  const brands = value.category ? values(inCat, 'brand') : [];
  if (sectors.length === 0) return null;

  const row = (items: string[], active: string | undefined, pick: (v?: string) => void, allLabel: string) => (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      <Button type="button" size="sm" variant={!active ? 'default' : 'outline'} className="h-7 rounded-full text-xs shrink-0" onClick={() => pick(undefined)}>{allLabel}</Button>
      {items.map(i => (
        <Button key={i} type="button" size="sm" variant={active === i ? 'default' : 'outline'} className="h-7 rounded-full text-xs shrink-0" onClick={() => pick(i)}>{i || UNCATEGORISED}</Button>
      ))}
    </div>
  );

  return (
    <div className="space-y-1" aria-label="Chuja kwa kundi">
      {row(sectors, value.sector, s => onChange({ sector: s }), 'Zote')}
      {value.sector && cats.length > 0 && row(cats, value.category, c => onChange({ sector: value.sector, category: c }), `${value.sector} zote`)}
      {value.category && brands.length > 0 && row(brands, value.brand, b => onChange({ ...value, brand: b }), `${value.category} zote`)}
    </div>
  );
}
