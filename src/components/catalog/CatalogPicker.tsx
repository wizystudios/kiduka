import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { brandOptions, categoryOptions, sectorOptions, type CatalogFields } from '@/lib/productCatalog';

interface Props {
  value: CatalogFields;
  onChange: (next: CatalogFields) => void;
  shopProducts?: CatalogFields[];
  disabled?: boolean;
}

/** Sekta -> Kundi -> Chapa -> Ukubwa, with suggestions and free custom entries. */
export function CatalogPicker({ value, onChange, shopProducts = [], disabled }: Props) {
  const id = useId();
  const sector = value.sector ?? '';
  const category = value.category ?? '';
  const sectors = sectorOptions(shopProducts);
  const cats = sector ? categoryOptions(sector, shopProducts) : [];
  const brands = sector && category ? brandOptions(sector, category, shopProducts) : [];

  const field = (key: keyof CatalogFields, label: string, placeholder: string, list: string[], reset: Partial<CatalogFields> = {}) => (
    <div>
      <Label className="text-xs" htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`} list={list.length ? `${id}-${key}-list` : undefined} disabled={disabled}
        value={(value[key] as string) ?? ''} placeholder={placeholder} className="text-sm h-8 rounded-2xl"
        onChange={(e) => onChange({ ...value, ...reset, [key]: e.target.value })}
      />
      {list.length > 0 && <datalist id={`${id}-${key}-list`}>{list.map(o => <option key={o} value={o} />)}</datalist>}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {field('sector', 'Sekta', 'Vinywaji, Vyakula, Hardware...', sectors, { category: '', brand: '' })}
        {field('category', 'Kundi', sector ? 'Soda, Maji, Juisi...' : 'Chagua sekta kwanza', cats, { brand: '' })}
        {field('brand', 'Chapa', 'Pepsi, Coca-Cola...', brands)}
        {field('variant_name', 'Ukubwa / Aina', '350ml, 500ml, 1.5L...', [])}
      </div>
      <p className="text-[11px] text-muted-foreground">Chagua kutoka kwenye mapendekezo au andika yako mpya.</p>
    </div>
  );
}
