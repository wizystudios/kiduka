import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type CatalogFields, type CatalogFilter } from '@/lib/productCatalog';

interface Props { products: CatalogFields[]; value: CatalogFilter; onChange: (f: CatalogFilter) => void }

const ALL = '__all__';
const values = (list: CatalogFields[], key: keyof CatalogFields) =>
  Array.from(new Set(list.map(p => (p[key] ?? '').toString().trim()).filter(Boolean))).sort();

/** Dropdowns to narrow products by Sekta, then Kundi, then Chapa. */
export function CatalogFilterBar({ products, value, onChange }: Props) {
  const sectors = values(products, 'sector');
  const inSector = value.sector ? products.filter(p => (p.sector ?? '').trim() === value.sector) : [];
  const cats = value.sector ? values(inSector, 'category') : [];
  const inCat = value.category ? inSector.filter(p => (p.category ?? '').trim() === value.category) : [];
  const brands = value.category ? values(inCat, 'brand') : [];
  if (sectors.length === 0) return null;

  const drop = (label: string, items: string[], active: string | undefined, pick: (v?: string) => void) => (
    <Select value={active ?? ALL} onValueChange={(v) => pick(v === ALL ? undefined : v)}>
      <SelectTrigger className="h-8 text-xs rounded-2xl min-w-0" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label}: Zote</SelectItem>
        {items.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <div className="grid grid-cols-3 gap-1.5" aria-label="Chuja kwa kundi">
      {drop('Sekta', sectors, value.sector, s => onChange({ sector: s }))}
      {value.sector && cats.length > 0 ? drop('Kundi', cats, value.category, c => onChange({ sector: value.sector, category: c })) : <span />}
      {value.category && brands.length > 0 ? drop('Chapa', brands, value.brand, b => onChange({ ...value, brand: b })) : <span />}
    </div>
  );
}
