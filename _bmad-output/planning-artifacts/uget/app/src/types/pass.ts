/**
 * uGet — Contratos de Domínio do Módulo 4 (Carteirinha uGet Pass & Micro-pesquisa Pós-Visita)
 */

export type PassRedemptionStatus = 'ISSUED' | 'VALIDATED' | 'EXPIRED';

export interface UgetPassCardView {
  holderName: string;
  memberCode: string;
  activeClubs: Array<{ id: string; name: string; segment: string }>;
  signedCode: string;
  issuedAt: string;
  expiresAt: string;
  offlineCacheTtlHours: number;
  qrMatrixSize: number;
  qrBits: number[]; // 0 ou 1 para renderização SVG offline sem libs externas
}

export interface PassRedemptionRecord {
  id: string;
  userId: string;
  benefitId: string;
  clubId: string;
  partnerId: string;
  partnerName: string;
  discountLabel: string;
  signedCode: string;
  passCodeHash: string;
  status: PassRedemptionStatus;
  expiresAt: string;
  validatedAt: string | null;
  createdAt: string;
}

export interface PostVisitSurveyRecord {
  id: string;
  userId: string;
  redemptionId: string | null;
  partnerId: string;
  benefitId: string;
  clubId: string;
  rating: number;
  discountHonored: boolean;
  savedEstimateBrl: number;
  comment: string;
  createdAt: string;
}

export interface PartnerSatisfactionSummary {
  partnerId: string;
  totalResponses: number;
  averageRating: number;
  honoredRatePct: number;
  totalEstimatedSavingsBrl: number;
}
