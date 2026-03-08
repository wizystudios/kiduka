// Delivery estimation utility based on Tanzania regions

// Region groups for distance estimation (simplified geographic clusters)
const REGION_CLUSTERS: Record<string, number> = {
  // Coastal / Eastern
  'Dar es Salaam': 1, 'Pwani': 1, 'Morogoro': 2, 'Lindi': 2, 'Mtwara': 2,
  // Northern
  'Arusha': 3, 'Kilimanjaro': 3, 'Tanga': 3, 'Manyara': 3,
  // Central
  'Dodoma': 4, 'Singida': 4, 'Tabora': 5,
  // Lake Zone
  'Mwanza': 6, 'Shinyanga': 6, 'Simiyu': 6, 'Geita': 6, 'Kagera': 7, 'Mara': 7,
  // Western
  'Kigoma': 8, 'Katavi': 8, 'Rukwa': 8,
  // Southern Highlands
  'Iringa': 9, 'Njombe': 9, 'Mbeya': 9, 'Songwe': 9, 'Ruvuma': 10,
  // Zanzibar
  'Unguja Kaskazini': 1, 'Unguja Kusini': 1, 'Unguja Mjini Magharibi': 1,
  'Pemba Kaskazini': 1, 'Pemba Kusini': 1,
};

export const estimateDeliveryDays = (sellerRegion: string | null, buyerRegion: string | null): { min: number; max: number; label: string } => {
  if (!sellerRegion || !buyerRegion) {
    return { min: 2, max: 7, label: 'Siku 2-7' };
  }

  if (sellerRegion === buyerRegion) {
    return { min: 1, max: 2, label: 'Siku 1-2' };
  }

  const sellerCluster = REGION_CLUSTERS[sellerRegion] || 5;
  const buyerCluster = REGION_CLUSTERS[buyerRegion] || 5;
  const distance = Math.abs(sellerCluster - buyerCluster);

  if (distance <= 1) {
    return { min: 2, max: 3, label: 'Siku 2-3' };
  } else if (distance <= 3) {
    return { min: 3, max: 5, label: 'Siku 3-5' };
  } else if (distance <= 5) {
    return { min: 4, max: 7, label: 'Siku 4-7' };
  } else {
    return { min: 5, max: 10, label: 'Siku 5-10' };
  }
};

export const getDeliveryEstimateColor = (days: number): string => {
  if (days <= 2) return 'text-green-600';
  if (days <= 5) return 'text-yellow-600';
  return 'text-orange-600';
};
