/**
 * uGet — Serviço de Carteirinha uGet Pass (HMAC-SHA256 Offline-Ready) & Micro-pesquisa Pós-Visita
 */
import crypto from 'node:crypto';
import { env } from '../config/env.ts';
import { securityStore } from '../repositories/securityStore.ts';
import { catalogStore } from '../repositories/catalogStore.ts';
import { passStore } from '../repositories/passStore.ts';
import { decryptPii } from '../security/cryptoService.ts';
import { sanitizeText } from '../security/owaspGuard.ts';
import { recordAudit } from './auditService.ts';
import { ROLES } from '../types/security.ts';
import type {
  PassRedemptionRecord,
  PostVisitSurveyRecord,
  UgetPassCardView
} from '../types/pass.ts';

function signPassPayload(payloadObj: Record<string, unknown>): string {
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', env.jwtAccessSecret)
    .update(`uget_pass:${payloadB64}`)
    .digest('base64url')
    .slice(0, 22);
  return `UGET.${payloadB64}.${sig}`;
}

export function verifySignedPassCode(code: string, nowMs = Date.now()): {
  valid: boolean;
  reason?: string;
  payload?: { uid: string; cid?: string; bid?: string; exp: number };
} {
  const parts = String(code || '').trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'UGET') {
    return { valid: false, reason: 'FORMATO_INVALIDO' };
  }
  const [, payloadB64, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', env.jwtAccessSecret)
    .update(`uget_pass:${payloadB64}`)
    .digest('base64url')
    .slice(0, 22);

  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, reason: 'ASSINATURA_INVALIDA' };
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      uid: string;
      cid?: string;
      bid?: string;
      exp: number;
    };
    if (!parsed.exp || nowMs > parsed.exp) {
      return { valid: false, reason: 'CODIGO_EXPIRADO', payload: parsed };
    }
    return { valid: true, payload: parsed };
  } catch {
    return { valid: false, reason: 'PAYLOAD_CORROMPIDO' };
  }
}

/**
 * Gera matriz 21x21 estilo QR Code (com 3 finder patterns oficiais nos cantos)
 * a partir do hash SHA-256 do código assinado — 100% determinístico e offline.
 */
export function buildDeterministicQrMatrix(signedCode: string, size = 21): number[] {
  const hash1 = crypto.createHash('sha256').update(signedCode).digest();
  const hash2 = crypto.createHash('sha256').update(`${signedCode}:ext`).digest();
  const bits = new Array<number>(size * size).fill(0);

  const setFinder = (ox: number, oy: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        bits[(oy + r) * size + (ox + c)] = isBorder || isCenter ? 1 : 0;
      }
    }
  };

  setFinder(0, 0);
  setFinder(size - 7, 0);
  setFinder(0, size - 7);

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTL = r < 8 && c < 8;
      const inTR = r < 8 && c >= size - 8;
      const inBL = r >= size - 8 && c < 8;
      if (inTL || inTR || inBL) continue;
      const byteArr = bitIdx < 256 ? hash1 : hash2;
      const localIdx = bitIdx % 256;
      const byteVal = byteArr[Math.floor(localIdx / 8)];
      bits[r * size + c] = (byteVal >> (localIdx % 8)) & 1;
      bitIdx++;
    }
  }
  return bits;
}

export function buildUserPassCard(userId: string): UgetPassCardView | null {
  const user = securityStore.findUserById(userId);
  if (!user || user.isAnonymized) return null;

  const holderName = decryptPii(user.nameEncrypted);
  const clubIds = catalogStore.getUserClubs(userId);
  const activeClubs = clubIds
    .map((id) => catalogStore.getClubById(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({ id: c.id, name: c.name, segment: c.segment }));

  const nowMs = Date.now();
  const ttlHours = 24;
  const expiresMs = nowMs + ttlHours * 3600 * 1000;
  const memberCode = `UG-${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

  const signedCode = signPassPayload({
    uid: userId,
    cid: activeClubs[0]?.id || 'none',
    iat: nowMs,
    exp: expiresMs
  });

  return {
    holderName,
    memberCode,
    activeClubs,
    signedCode,
    issuedAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(expiresMs).toISOString(),
    offlineCacheTtlHours: ttlHours,
    qrMatrixSize: 21,
    qrBits: buildDeterministicQrMatrix(signedCode, 21)
  };
}

export function issueBenefitPassRedemption(input: {
  userId: string;
  benefitId: string;
  ip?: string;
  correlationId?: string;
}): PassRedemptionRecord {
  const benefit = catalogStore.getBenefitById(input.benefitId);
  if (!benefit) throw new Error('VALIDATION:Benefício não encontrado.');
  const partner = catalogStore.getPartnerById(benefit.partnerId);
  if (!partner) throw new Error('VALIDATION:Parceiro não encontrado.');

  // Garante RN-01: o usuário precisa pertencer ao clube do benefício
  const userClubs = catalogStore.getUserClubs(input.userId);
  if (!userClubs.includes(benefit.clubId)) {
    throw new Error('FORBIDDEN:Você precisa ativar o clube deste benefício antes de emitir o uGet Pass.');
  }

  const nowMs = Date.now();
  const expiresMs = nowMs + 15 * 60 * 1000; // 15 min de validade no caixa
  const signedCode = signPassPayload({
    uid: input.userId,
    cid: benefit.clubId,
    bid: benefit.id,
    nonce: crypto.randomBytes(4).toString('hex'),
    iat: nowMs,
    exp: expiresMs
  });

  const passCodeHash = crypto.createHash('sha256').update(signedCode).digest('hex');
  const record = passStore.saveRedemption({
    userId: input.userId,
    benefitId: benefit.id,
    clubId: benefit.clubId,
    partnerId: partner.id,
    partnerName: partner.name,
    discountLabel: benefit.discountLabel,
    signedCode,
    passCodeHash,
    status: 'ISSUED',
    expiresAt: new Date(expiresMs).toISOString(),
    validatedAt: null
  });

  recordAudit({
    correlationId: input.correlationId || crypto.randomUUID(),
    actorId: input.userId,
    actorRole: ROLES.USER,
    action: 'UGET_PASS_ISSUED',
    resource: `benefit:${benefit.id}`,
    status: 'SUCCESS',
    ip: input.ip || '0.0.0.0',
    metadata: { redemptionId: record.id, clubId: benefit.clubId }
  });

  return record;
}

export function verifyAndValidatePassCode(input: {
  signedCode: string;
  actorId: string;
  actorRole: string;
  ip?: string;
  correlationId?: string;
}) {
  const check = verifySignedPassCode(input.signedCode);
  if (!check.valid) {
    return { valid: false, reason: check.reason };
  }
  const hash = crypto.createHash('sha256').update(input.signedCode.trim()).digest('hex');
  const redemption = passStore.findRedemptionByCodeHash(hash);
  if (redemption && redemption.status === 'ISSUED') {
    const validated = passStore.markRedemptionValidated(redemption.id);
    recordAudit({
      correlationId: input.correlationId || crypto.randomUUID(),
      actorId: input.actorId,
      actorRole: input.actorRole as typeof ROLES.USER,
      action: 'UGET_PASS_VALIDATED',
      resource: `redemption:${redemption.id}`,
      status: 'SUCCESS',
      ip: input.ip || '0.0.0.0'
    });
    return { valid: true, redemption: validated, payload: check.payload };
  }
  return { valid: true, redemption, payload: check.payload };
}

export function submitPostVisitSurvey(input: {
  userId: string;
  benefitId: string;
  redemptionId?: string | null;
  rating: number;
  discountHonored: boolean;
  savedEstimateBrl?: number;
  comment?: string;
  ip?: string;
  correlationId?: string;
}): { survey: PostVisitSurveyRecord; partnerSummary: ReturnType<typeof passStore.getPartnerSatisfaction> } {
  // Conformidade LGPD: exige consentimento ativo para 'surveys'
  const consents = securityStore.getLatestConsentMap(input.userId);
  if (!consents.surveys?.granted) {
    throw new Error('FORBIDDEN:Consentimento LGPD para pesquisas pós-visita não está ativo.');
  }

  const rating = Math.round(Number(input.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error('VALIDATION:Nota da avaliação deve ser entre 1 e 5.');
  }

  const benefit = catalogStore.getBenefitById(input.benefitId);
  if (!benefit) throw new Error('VALIDATION:Benefício não encontrado.');

  if (input.redemptionId) {
    if (passStore.hasSurveyForRedemption(input.redemptionId)) {
      throw new Error('CONFLICT:Este resgate já foi avaliado.');
    }
  }

  const savedEstimateBrl = Math.max(0, Math.min(50_000, Number(input.savedEstimateBrl || 0)));
  const cleanComment = sanitizeText(String(input.comment || '')).slice(0, 400);

  const survey = passStore.saveSurvey({
    userId: input.userId,
    redemptionId: input.redemptionId || null,
    partnerId: benefit.partnerId,
    benefitId: benefit.id,
    clubId: benefit.clubId,
    rating,
    discountHonored: Boolean(input.discountHonored),
    savedEstimateBrl: Number.isFinite(savedEstimateBrl) ? savedEstimateBrl : 0,
    comment: cleanComment
  });

  recordAudit({
    correlationId: input.correlationId || crypto.randomUUID(),
    actorId: input.userId,
    actorRole: ROLES.USER,
    action: 'POST_VISIT_SURVEY_SUBMITTED',
    resource: `partner:${benefit.partnerId}`,
    status: 'SUCCESS',
    ip: input.ip || '0.0.0.0',
    metadata: { rating, discountHonored: survey.discountHonored }
  });

  return {
    survey,
    partnerSummary: passStore.getPartnerSatisfaction(benefit.partnerId)
  };
}
