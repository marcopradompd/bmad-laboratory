/**
 * uGet — Motor de Geofencing Inteligente (Módulo 3)
 * Orquestra:
 *  - Verificação de consentimento LGPD (gps + push)
 *  - Modo Não Perturbe (DND / Quiet Hours)
 *  - Limite diário de notificações
 *  - Filtragem estrita por clubes do usuário (RN-01) e janela horária (RF-06)
 *  - Cooldown anti-spam de 24h por parceiro/unidade (RN-02)
 *  - Enfileiramento idempotente no Push HA Outbox
 */
import crypto from 'node:crypto';
import type { GeofenceEvaluationResult, PushOutboxJob } from '../types/push.ts';
import { securityStore } from '../repositories/securityStore.ts';
import { catalogStore } from '../repositories/catalogStore.ts';
import { pushStore } from '../repositories/pushStore.ts';
import { listNearbyBenefits } from './geoCatalogService.ts';
import { recordAudit } from './auditService.ts';
import { ROLES } from '../types/security.ts';

export function isHourInDndWindow(hour: number, startHour: number, endHour: number): boolean {
  if (startHour === endHour) return false;
  if (startHour < endHour) {
    return hour >= startHour && hour < endHour;
  }
  // Janela que cruza a meia-noite (ex.: 22h às 07h)
  return hour >= startHour || hour < endHour;
}

export function evaluateGeofencePing(input: {
  userId: string;
  lat: number;
  lon: number;
  currentHour?: number;
  nowMs?: number;
  ip?: string;
  correlationId?: string;
}): GeofenceEvaluationResult {
  const nowMs = input.nowMs ?? Date.now();
  const dateObj = new Date(nowMs);
  const currentHour = input.currentHour ?? dateObj.getHours();
  const dateKey = dateObj.toISOString().slice(0, 10);
  const prefs = pushStore.getPreferences(input.userId);

  // 1. Conformidade LGPD estrita: GPS e Push devem estar consentidos
  const consents = securityStore.getLatestConsentMap(input.userId);
  if (!consents.gps?.granted || !consents.push?.granted) {
    return {
      evaluated: false,
      reason: 'BLOCKED_LGPD_CONSENT',
      radiusMeters: prefs.radiusMeters,
      matchedCount: 0,
      enqueuedJobs: [],
      skippedCooldownIds: [],
      skippedDuplicateIds: []
    };
  }

  // 2. Modo Não Perturbe (Quiet Hours)
  if (isHourInDndWindow(currentHour, prefs.dndStartHour, prefs.dndEndHour)) {
    return {
      evaluated: false,
      reason: 'SUPPRESSED_DND',
      radiusMeters: prefs.radiusMeters,
      matchedCount: 0,
      enqueuedJobs: [],
      skippedCooldownIds: [],
      skippedDuplicateIds: []
    };
  }

  // 3. Limite diário de alertas
  if (pushStore.getDailyCount(input.userId, dateKey) >= prefs.maxDailyPushes) {
    return {
      evaluated: false,
      reason: 'SUPPRESSED_DAILY_CAP',
      radiusMeters: prefs.radiusMeters,
      matchedCount: 0,
      enqueuedJobs: [],
      skippedCooldownIds: [],
      skippedDuplicateIds: []
    };
  }

  // 4. Busca geoespacial filtrada pelos clubes do usuário (RN-01) e janela horária (RF-06)
  const userClubs = catalogStore.getUserClubs(input.userId);
  const nearby = listNearbyBenefits({
    lat: input.lat,
    lon: input.lon,
    radiusMeters: prefs.radiusMeters,
    clubIds: userClubs,
    userId: input.userId,
    currentHour
  }).filter((item) => item.isValidNow);

  if (nearby.length === 0) {
    return {
      evaluated: true,
      reason: 'NO_MATCHES_IN_RADIUS',
      radiusMeters: prefs.radiusMeters,
      matchedCount: 0,
      enqueuedJobs: [],
      skippedCooldownIds: [],
      skippedDuplicateIds: []
    };
  }

  const enqueuedJobs: PushOutboxJob[] = [];
  const skippedCooldownIds: string[] = [];
  const skippedDuplicateIds: string[] = [];

  for (const item of nearby) {
    if (pushStore.getDailyCount(input.userId, dateKey) >= prefs.maxDailyPushes) {
      break;
    }

    // 5. Anti-spam Cooldown 24h por unidade (RN-02)
    if (pushStore.isInCooldown(input.userId, item.unit.id, prefs.cooldownHours, nowMs)) {
      skippedCooldownIds.push(item.id);
      continue;
    }

    // 6. Enfileiramento idempotente na fila Outbox HA
    const idempotencyKey = `geo:${input.userId}:${item.id}:${item.unit.id}:${dateKey}`;
    const { job, deduplicated } = pushStore.enqueueJob({
      idempotencyKey,
      userId: input.userId,
      benefitId: item.id,
      partnerUnitId: item.unit.id,
      title: `${item.discountLabel} em ${item.partner.name}`,
      body: `Você está a ${item.distanceLabel} (${item.unit.neighborhood}). Convênio ${item.club.name} ativo agora!`,
      deepLink: `/?benefit=${encodeURIComponent(item.id)}`,
      discountLabel: item.discountLabel,
      distanceLabel: item.distanceLabel,
      nowMs
    });

    if (deduplicated) {
      skippedDuplicateIds.push(item.id);
      continue;
    }

    pushStore.recordCooldown(input.userId, item.unit.id, nowMs);
    pushStore.incrementDailyCount(input.userId, dateKey);
    enqueuedJobs.push(job);
  }

  // Auditoria sem armazenar coordenadas brutas de GPS (minimização LGPD)
  if (enqueuedJobs.length > 0) {
    recordAudit({
      correlationId: input.correlationId || crypto.randomUUID(),
      actorId: input.userId,
      actorRole: ROLES.USER,
      action: 'GEOFENCE_ALERTS_ENQUEUED',
      resource: `user:${input.userId}:push_outbox`,
      status: 'SUCCESS',
      ip: input.ip || '0.0.0.0',
      metadata: { count: enqueuedJobs.length, radiusMeters: prefs.radiusMeters }
    });
  }

  return {
    evaluated: true,
    radiusMeters: prefs.radiusMeters,
    matchedCount: nearby.length,
    enqueuedJobs,
    skippedCooldownIds,
    skippedDuplicateIds
  };
}
