// Delivery estimation utility based on Tanzania regions with real coordinates

// Approximate center coordinates for each region (lat, lng)
const REGION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Coastal / Eastern
  'Dar es Salaam': { lat: -6.7924, lng: 39.2083 },
  'Pwani': { lat: -7.3, lng: 38.7 },
  'Morogoro': { lat: -6.8214, lng: 37.6614 },
  'Lindi': { lat: -9.9969, lng: 39.7143 },
  'Mtwara': { lat: -10.2736, lng: 40.1828 },
  // Northern
  'Arusha': { lat: -3.3869, lng: 36.6830 },
  'Kilimanjaro': { lat: -3.0674, lng: 37.3556 },
  'Tanga': { lat: -5.0689, lng: 39.0989 },
  'Manyara': { lat: -4.0, lng: 36.0 },
  // Central
  'Dodoma': { lat: -6.1630, lng: 35.7516 },
  'Singida': { lat: -4.8163, lng: 34.7438 },
  'Tabora': { lat: -5.0167, lng: 32.8000 },
  // Lake Zone
  'Mwanza': { lat: -2.5164, lng: 32.9175 },
  'Shinyanga': { lat: -3.6618, lng: 33.4232 },
  'Simiyu': { lat: -3.0, lng: 34.0 },
  'Geita': { lat: -2.8714, lng: 32.2318 },
  'Kagera': { lat: -1.8, lng: 31.5 },
  'Mara': { lat: -1.7485, lng: 34.0 },
  // Western
  'Kigoma': { lat: -4.8770, lng: 29.6266 },
  'Katavi': { lat: -6.5, lng: 31.0 },
  'Rukwa': { lat: -8.0, lng: 31.5 },
  // Southern Highlands
  'Iringa': { lat: -7.7700, lng: 35.6917 },
  'Njombe': { lat: -9.3333, lng: 34.7667 },
  'Mbeya': { lat: -8.9000, lng: 33.4500 },
  'Songwe': { lat: -8.5, lng: 32.5 },
  'Ruvuma': { lat: -10.6833, lng: 35.6333 },
  // Zanzibar
  'Unguja Kaskazini': { lat: -5.95, lng: 39.3 },
  'Unguja Kusini': { lat: -6.3, lng: 39.45 },
  'Unguja Mjini Magharibi': { lat: -6.1659, lng: 39.2026 },
  'Pemba Kaskazini': { lat: -5.0, lng: 39.8 },
  'Pemba Kusini': { lat: -5.3, lng: 39.75 },
};

// Haversine formula to calculate distance in km between two lat/lng points
const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Average road speed factor (roads are ~1.4x straight-line distance in TZ)
const ROAD_FACTOR = 1.4;
// Average delivery speed in km/day (considering logistics, not just driving)
const AVG_KM_PER_DAY = 150;

export const estimateDeliveryDays = (
  sellerRegion: string | null,
  buyerRegion: string | null
): { min: number; max: number; label: string; distanceKm?: number } => {
  if (!sellerRegion || !buyerRegion) {
    return { min: 2, max: 7, label: 'Siku 2-7' };
  }

  if (sellerRegion === buyerRegion) {
    return { min: 1, max: 2, label: 'Siku 1-2', distanceKm: 0 };
  }

  const sellerCoords = REGION_COORDINATES[sellerRegion];
  const buyerCoords = REGION_COORDINATES[buyerRegion];

  if (!sellerCoords || !buyerCoords) {
    return { min: 2, max: 7, label: 'Siku 2-7' };
  }

  const straightDistance = haversineDistance(
    sellerCoords.lat, sellerCoords.lng,
    buyerCoords.lat, buyerCoords.lng
  );
  const roadDistance = Math.round(straightDistance * ROAD_FACTOR);

  // Calculate days based on road distance
  const baseDays = roadDistance / AVG_KM_PER_DAY;
  // Min = base + 1 day processing, Max = base * 1.5 + 1 day buffer
  const min = Math.max(1, Math.ceil(baseDays + 0.5));
  const max = Math.max(min + 1, Math.ceil(baseDays * 1.5 + 1));

  return {
    min,
    max,
    label: `Siku ${min}-${max}`,
    distanceKm: roadDistance,
  };
};

export const getDeliveryEstimateColor = (days: number): string => {
  if (days <= 2) return 'text-green-600';
  if (days <= 5) return 'text-yellow-600';
  return 'text-orange-600';
};

export const getDistanceLabel = (km: number | undefined): string => {
  if (!km) return '';
  if (km < 100) return `~${km} km`;
  return `~${Math.round(km / 10) * 10} km`;
};
