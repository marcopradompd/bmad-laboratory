/**
 * uGet — Serviço Geoespacial de Benefícios (Módulo 2)
 * - Fórmula Haversine em metros (espelho de ST_DWithin do PostGIS)
 * - Filtragem por clubes ativos (RN-01), categoria, busca textual sanitizada e raio
 * - Validação de janela temporal do benefício (RF-06)
 */
import { catalogStore } from '../repositories/catalogStore.ts';
import { sanitizeText } from '../security/owaspGuard.ts';
import type { EnrichedBenefitItem } from '../types/catalog.ts';

const EARTH_RADIUS_M = 6371000;

export function calculateHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_M * c);
}

export function formatDistanceLabel(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function isHourWithinWindow(hour: number, fromHour: number, toHour: number): boolean {
  if (fromHour <= toHour) {
    return hour >= fromHour && hour <= toHour;
  }
  return hour >= fromHour || hour <= toHour;
}

export function listNearbyBenefits(params: {
  lat: number;
  lon: number;
  radiusMeters?: number;
  clubIds?: string[];
  category?: string;
  query?: string;
  userId?: string | null;
  currentHour?: number;
}): EnrichedBenefitItem[] {
  const radiusM = Math.min(50000, Math.max(100, Number(params.radiusMeters) || 5000));
  const activeClubSet = params.clubIds && params.clubIds.length > 0 ? new Set(params.clubIds) : null;
  const categoryFilter = sanitizeText(params.category, 40).toLowerCase();
  const qFilter = sanitizeText(params.query, 80).toLowerCase();
  const hourNow = typeof params.currentHour === 'number' ? params.currentHour : new Date().getHours();
  const favSet = params.userId ? catalogStore.getUserFavorites(params.userId) : new Set<string>();

  const results: EnrichedBenefitItem[] = [];

  for (const benefit of catalogStore.listBenefits()) {
    if (activeClubSet && !activeClubSet.has(benefit.clubId)) continue;

    const club = catalogStore.getClubById(benefit.clubId);
    const partner = catalogStore.getPartnerById(benefit.partnerId);
    if (!club || !partner || !partner.isActive) continue;

    if (categoryFilter && categoryFilter !== 'todos' && partner.category.toLowerCase() !== categoryFilter) {
      continue;
    }

    if (qFilter) {
      const haystack = `${partner.name} ${partner.category} ${benefit.title} ${benefit.discountLabel} ${club.name}`.toLowerCase();
      if (!haystack.includes(qFilter)) continue;
    }

    const units = catalogStore.listUnitsByPartner(partner.id);
    if (units.length === 0) continue;

    // Seleciona a unidade física mais próxima (RN-03)
    let closestUnit = units[0];
    let minDist = calculateHaversineMeters(params.lat, params.lon, closestUnit.lat, closestUnit.lon);
    for (let i = 1; i < units.length; i++) {
      const d = calculateHaversineMeters(params.lat, params.lon, units[i].lat, units[i].lon);
      if (d < minDist) {
        minDist = d;
        closestUnit = units[i];
      }
    }

    if (minDist > radiusM) continue;

    results.push({
      id: benefit.id,
      title: benefit.title,
      discountLabel: benefit.discountLabel,
      rules: benefit.rules,
      validFromHour: benefit.validFromHour,
      validToHour: benefit.validToHour,
      validWindowLabel: benefit.validWindowLabel,
      isValidNow: isHourWithinWindow(hourNow, benefit.validFromHour, benefit.validToHour),
      isVip: benefit.isVip,
      isFavorite: favSet.has(benefit.id),
      club: { id: club.id, slug: club.slug, name: club.name, segment: club.segment },
      partner: {
        id: partner.id,
        name: partner.name,
        category: partner.category,
        description: partner.description,
        phone: partner.phone,
        whatsapp: partner.whatsapp,
        website: partner.website,
        rating: partner.rating
      },
      unit: closestUnit,
      distanceMeters: minDist,
      distanceLabel: formatDistanceLabel(minDist),
      mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${closestUnit.lat},${closestUnit.lon}`
    });
  }

  return results.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export function getBenefitDetail(
  benefitId: string,
  lat = -13.008,
  lon = -38.53,
  userId?: string | null
): EnrichedBenefitItem | null {
  const all = listNearbyBenefits({
    lat,
    lon,
    radiusMeters: 50000,
    userId
  });
  return all.find((item) => item.id === benefitId) || null;
}
