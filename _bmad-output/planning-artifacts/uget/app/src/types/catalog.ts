/**
 * uGet — Tipos de Domínio do Módulo 2 (Clubes, Parceiros Geoespaciais & Benefícios)
 */

export type BenefitCategory =
  | 'Saúde'
  | 'Gastronomia'
  | 'Bem-Estar'
  | 'Educação'
  | 'Serviços'
  | 'Varejo';

export interface ClubRecord {
  id: string;
  slug: string;
  name: string;
  segment: string;
  membersEstimate: number;
  isActive: boolean;
}

export interface PartnerUnitRecord {
  id: string;
  partnerId: string;
  unitName: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
}

export interface PartnerRecord {
  id: string;
  name: string;
  category: BenefitCategory;
  description: string;
  phone: string;
  whatsapp: string;
  website: string;
  rating: number;
  isActive: boolean;
}

export interface BenefitRecord {
  id: string;
  clubId: string;
  partnerId: string;
  title: string;
  discountLabel: string;
  rules: string;
  validFromHour: number;
  validToHour: number;
  validWindowLabel: string;
  isVip: boolean;
  isActive: boolean;
}

export interface EnrichedBenefitItem {
  id: string;
  title: string;
  discountLabel: string;
  rules: string;
  validFromHour: number;
  validToHour: number;
  validWindowLabel: string;
  isValidNow: boolean;
  isVip: boolean;
  isFavorite: boolean;
  club: { id: string; slug: string; name: string; segment: string };
  partner: {
    id: string;
    name: string;
    category: BenefitCategory;
    description: string;
    phone: string;
    whatsapp: string;
    website: string;
    rating: number;
  };
  unit: PartnerUnitRecord;
  distanceMeters: number;
  distanceLabel: string;
  mapsUrl: string;
}
