import { supabase } from '@/integrations/supabase/client';
import { isShareableBarcode, type CatalogFields } from './productCatalog';

export interface BarcodeMatch extends CatalogFields { name: string; unit_type?: string | null; source: 'shop' | 'registry'; productId?: string; price?: number; cost_price?: number | null }

/** Look up a barcode: first in this shop's products, then in the shared registry. */
export async function lookupBarcode(barcode: string, ownerId: string | null): Promise<BarcodeMatch | null> {
  const code = barcode.trim();
  if (!code) return null;
  if (ownerId) {
    const { data } = await supabase.from('products')
      .select('id, name, sector, category, brand, variant_name, unit_type, price, cost_price')
      .eq('owner_id', ownerId).eq('barcode', code).eq('is_archived', false).limit(1).maybeSingle();
    if (data) return { ...data, productId: data.id, price: Number(data.price), source: 'shop' };
  }
  if (!isShareableBarcode(code)) return null;
  const { data } = await supabase.from('catalog_items')
    .select('name, sector, category, brand, variant_name, unit_type').eq('barcode', code).maybeSingle();
  return data ? { ...data, source: 'registry' } : null;
}

/** Remember a barcode's descriptive details (never price/stock) for other shops. Silent on failure. */
export async function contributeBarcode(item: CatalogFields & { barcode?: string | null; name: string; unit_type?: string | null }) {
  const code = (item.barcode ?? '').trim();
  if (!isShareableBarcode(code) || !item.name.trim()) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from('catalog_items').upsert({
    barcode: code, name: item.name.trim().slice(0, 160),
    sector: item.sector || null, category: item.category || null, brand: item.brand || null,
    variant_name: item.variant_name || null, unit_type: item.unit_type || null, created_by: auth.user.id,
  }, { onConflict: 'barcode', ignoreDuplicates: true });
}
