import { describe, test as it, expect } from 'bun:test';
import { matchesCatalogFilter, groupByLevel, categoryOptions, brandOptions } from '../src/lib/productCatalog.ts';

const pepsiSmall = { sector: 'Vinywaji', category: 'Soda', brand: 'Pepsi', variant_name: '350ml' };
const pepsiBig = { sector: 'Vinywaji', category: 'Soda', brand: 'Pepsi', variant_name: '1.5L' };
const water = { sector: 'Vinywaji', category: 'Maji', brand: 'Uhai', variant_name: '500ml' };

describe('product catalog', () => {
  it('filters at sector, category and brand levels', () => {
    expect([pepsiSmall, water].filter(p => matchesCatalogFilter(p, { sector: 'Vinywaji', category: 'Soda' }))).toEqual([pepsiSmall]);
    expect(matchesCatalogFilter(water, { sector: 'Vinywaji', brand: 'Pepsi' })).toBe(false);
  });
  it('reports Pepsi sizes separately with different revenue', () => {
    const rows = groupByLevel([
      { quantity: 2, subtotal: 1000, product: pepsiSmall },
      { quantity: 1, subtotal: 2500, product: pepsiBig },
      { quantity: 3, subtotal: 1500, product: water },
    ], 'variant');
    expect(rows.map(r => [r.name, r.revenue])).toEqual([['Pepsi 1.5L', 2500], ['Uhai 500ml', 1500], ['Pepsi 350ml', 1000]]);
    expect(groupByLevel([{ quantity: 1, subtotal: 3500, product: pepsiBig }, { quantity: 1, subtotal: 1500, product: water }], 'sector')).toEqual([{ name: 'Vinywaji', revenue: 5000, quantity: 2 }]);
  });
  it('offers template plus custom shop entries', () => {
    expect(categoryOptions('Vinywaji')).toContain('Soda');
    expect(brandOptions('Vinywaji', 'Soda', [{ sector: 'Vinywaji', category: 'Soda', brand: 'Bonite' }])).toEqual(expect.arrayContaining(['Pepsi', 'Coca-Cola', 'Bonite']));
  });
});
