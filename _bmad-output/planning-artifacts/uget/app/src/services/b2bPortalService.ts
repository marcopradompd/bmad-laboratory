/**
 * uGet — Serviço do Portal Web B2B Multi-Tenant (Módulo 5: Clubes & Parceiros)
 * - Isolamento estrito por tenantId (RBAC)
 * - Relatórios 100% agregados (ZERO PII: sem nomes, e-mails ou CPFs de associados)
 * - Gestão de convênios (criar / ativar / pausar) com sanitização anti-XSS e auditoria
 * - Validador de Caixa uGet Pass respeitando escopo do parceiro/clube
 */
import crypto from 'node:crypto';
import { catalogStore } from '../repositories/catalogStore.ts';
import { passStore } from '../repositories/passStore.ts';
import { assertTenantAccess, hasPermission } from '../security/rbac.ts';
import { sanitizeText } from '../security/owaspGuard.ts';
import { verifyAndValidatePassCode } from './passSurveyService.ts';
import { recordAudit } from './auditService.ts';
import { ROLES, type AccessTokenPayload } from '../types/security.ts';
import type { BenefitRecord } from '../types/catalog.ts';

function isB2bActor(actor: AccessTokenPayload): boolean {
  return (
    actor.role === ROLES.SUPER_ADMIN ||
    actor.role === ROLES.CLUB_MANAGER ||
    actor.role === ROLES.PARTNER_MANAGER
  );
}

export function listTenantScopedBenefits(actor: AccessTokenPayload) {
  if (!isB2bActor(actor) || !hasPermission(actor.role, 'reports:read_tenant')) {
    throw new Error('FORBIDDEN:Acesso restrito a gestores B2B (Clubes, Parceiros ou Super Admin).');
  }

  const all = catalogStore.listBenefits(true);
  const filtered = all.filter((b) => {
    if (actor.role === ROLES.SUPER_ADMIN) return true;
    if (actor.role === ROLES.CLUB_MANAGER) return b.clubId === actor.tenantId;
    if (actor.role === ROLES.PARTNER_MANAGER) return b.partnerId === actor.tenantId;
    return false;
  });

  return filtered.map((b) => ({
    ...b,
    clubName: catalogStore.getClubById(b.clubId)?.name || b.clubId,
    partnerName: catalogStore.getPartnerById(b.partnerId)?.name || b.partnerId
  }));
}

export function getTenantDashboard(actor: AccessTokenPayload) {
  if (!isB2bActor(actor) || !hasPermission(actor.role, 'reports:read_tenant')) {
    throw new Error('FORBIDDEN:Acesso restrito a gestores B2B.');
  }

  const scopedBenefits = listTenantScopedBenefits(actor);
  const redemptions = passStore.listAllRedemptions().filter((r) => {
    if (actor.role === ROLES.SUPER_ADMIN) return true;
    if (actor.role === ROLES.CLUB_MANAGER) return r.clubId === actor.tenantId;
    if (actor.role === ROLES.PARTNER_MANAGER) return r.partnerId === actor.tenantId;
    return false;
  });

  const surveys = passStore.listAllSurveys().filter((s) => {
    if (actor.role === ROLES.SUPER_ADMIN) return true;
    if (actor.role === ROLES.CLUB_MANAGER) return s.clubId === actor.tenantId;
    if (actor.role === ROLES.PARTNER_MANAGER) return s.partnerId === actor.tenantId;
    return false;
  });

  const validatedCount = redemptions.filter((r) => r.status === 'VALIDATED').length;
  const averageRating =
    surveys.length > 0
      ? Number((surveys.reduce((acc, s) => acc + s.rating, 0) / surveys.length).toFixed(2))
      : 0;
  const honoredRatePct =
    surveys.length > 0
      ? Math.round((surveys.filter((s) => s.discountHonored).length / surveys.length) * 100)
      : 100;
  const totalEstimatedSavingsBrl = Number(
    surveys.reduce((acc, s) => acc + s.savedEstimateBrl, 0).toFixed(2)
  );

  return {
    scope: {
      role: actor.role,
      tenantId: actor.tenantId || 'ALL',
      aggregatedOnly: true
    },
    kpis: {
      totalBenefits: scopedBenefits.length,
      activeBenefits: scopedBenefits.filter((b) => b.isActive).length,
      totalRedemptionsIssued: redemptions.length,
      totalRedemptionsValidated: validatedCount,
      surveyResponses: surveys.length,
      averageRating,
      honoredRatePct,
      totalEstimatedSavingsBrl
    },
    benefits: scopedBenefits,
    clubs: catalogStore.listClubs(),
    partners: catalogStore.listPartners()
  };
}

export function createTenantBenefit(
  actor: AccessTokenPayload,
  input: {
    clubId: string;
    partnerId: string;
    title: string;
    discountLabel: string;
    rules: string;
    validFromHour?: number;
    validToHour?: number;
    isVip?: boolean;
  },
  ctx: { ip: string; correlationId: string }
): BenefitRecord {
  const canManageClub = hasPermission(actor.role, 'club:manage_own');
  const canManagePartner = hasPermission(actor.role, 'partner:manage_own');
  if (!canManageClub && !canManagePartner) {
    throw new Error('FORBIDDEN:Permissão insuficiente para criar convênios.');
  }

  const clubId = String(input.clubId || '').trim();
  const partnerId = String(input.partnerId || '').trim();

  if (actor.role === ROLES.CLUB_MANAGER && !assertTenantAccess(actor, clubId)) {
    throw new Error('FORBIDDEN:CLUB_MANAGER só pode criar convênios para o próprio clube (multi-tenant).');
  }
  if (actor.role === ROLES.PARTNER_MANAGER && !assertTenantAccess(actor, partnerId)) {
    throw new Error('FORBIDDEN:PARTNER_MANAGER só pode criar convênios para o próprio parceiro (multi-tenant).');
  }

  if (!catalogStore.getClubById(clubId)) throw new Error('VALIDATION:Clube inválido.');
  if (!catalogStore.getPartnerById(partnerId)) throw new Error('VALIDATION:Parceiro inválido.');

  const title = sanitizeText(String(input.title || ''));
  const discountLabel = sanitizeText(String(input.discountLabel || ''));
  const rules = sanitizeText(String(input.rules || ''));
  if (title.length < 4 || discountLabel.length < 2 || rules.length < 6) {
    throw new Error('VALIDATION:Preencha título, desconto e regras válidas.');
  }

  const fromH = Math.max(0, Math.min(23, Number(input.validFromHour ?? 8)));
  const toH = Math.max(0, Math.min(23, Number(input.validToHour ?? 20)));
  const pad = (n: number) => String(n).padStart(2, '0');

  const created = catalogStore.createBenefit({
    id: `ben-${crypto.randomBytes(4).toString('hex')}`,
    clubId,
    partnerId,
    title,
    discountLabel,
    rules,
    validFromHour: fromH,
    validToHour: toH,
    validWindowLabel: `Todos os dias · ${pad(fromH)}h às ${pad(toH)}h`,
    isVip: Boolean(input.isVip),
    isActive: true
  });

  recordAudit({
    correlationId: ctx.correlationId,
    actorId: actor.sub,
    actorRole: actor.role,
    action: 'B2B_BENEFIT_CREATED',
    resource: `benefit:${created.id}`,
    status: 'SUCCESS',
    ip: ctx.ip,
    metadata: { clubId, partnerId }
  });

  return created;
}

export function toggleTenantBenefitStatus(
  actor: AccessTokenPayload,
  benefitId: string,
  isActive: boolean,
  ctx: { ip: string; correlationId: string }
): BenefitRecord {
  const existing = catalogStore.getBenefitById(benefitId);
  if (!existing) throw new Error('VALIDATION:Benefício não encontrado.');

  if (actor.role === ROLES.USER_ASSOCIATE) {
    throw new Error('FORBIDDEN:Acesso restrito a gestores B2B.');
  }
  if (actor.role === ROLES.CLUB_MANAGER && !assertTenantAccess(actor, existing.clubId)) {
    throw new Error('FORBIDDEN:Não é permitido alterar convênios de outro clube.');
  }
  if (actor.role === ROLES.PARTNER_MANAGER && !assertTenantAccess(actor, existing.partnerId)) {
    throw new Error('FORBIDDEN:Não é permitido alterar convênios de outro parceiro.');
  }

  const updated = catalogStore.setBenefitActive(benefitId, isActive)!;
  recordAudit({
    correlationId: ctx.correlationId,
    actorId: actor.sub,
    actorRole: actor.role,
    action: 'B2B_BENEFIT_STATUS_UPDATED',
    resource: `benefit:${benefitId}`,
    status: 'SUCCESS',
    ip: ctx.ip,
    metadata: { isActive }
  });
  return updated;
}

export function validatePassAtB2bCheckout(
  actor: AccessTokenPayload,
  signedCode: string,
  ctx: { ip: string; correlationId: string }
) {
  if (!isB2bActor(actor)) {
    throw new Error('FORBIDDEN:Apenas operadores de parceiro, clube ou admin podem validar no caixa.');
  }

  const result = verifyAndValidatePassCode({
    signedCode,
    actorId: actor.sub,
    actorRole: actor.role,
    ip: ctx.ip,
    correlationId: ctx.correlationId
  });

  if (!result.valid) {
    return result;
  }

  // Verifica isolamento multi-tenant caso o código esteja associado a um resgate específico
  if (result.redemption) {
    if (actor.role === ROLES.PARTNER_MANAGER && !assertTenantAccess(actor, result.redemption.partnerId)) {
      throw new Error('FORBIDDEN:Este uGet Pass pertence a outro parceiro.');
    }
    if (actor.role === ROLES.CLUB_MANAGER && !assertTenantAccess(actor, result.redemption.clubId)) {
      throw new Error('FORBIDDEN:Este uGet Pass pertence a outro clube.');
    }
  }

  return {
    valid: true,
    status: result.redemption?.status || 'VALIDATED',
    partnerName: result.redemption?.partnerName || null,
    discountLabel: result.redemption?.discountLabel || null,
    validatedAt: result.redemption?.validatedAt || new Date().toISOString()
  };
}
