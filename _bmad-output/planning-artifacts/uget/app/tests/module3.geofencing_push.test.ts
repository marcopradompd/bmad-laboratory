/**
 * uGet — Suíte de Testes Ponta a Ponta do Módulo 3 (Geofencing & Push Notifications HA)
 * Valida:
 *  1. Registro e renovação transparente de tokens de dispositivo (criptografados em repouso)
 *  2. Preferências de notificação (raio, DND/Não Perturbe, cooldown)
 *  3. Motor de Geofencing: LGPD consent check, DND quiet hours, RN-01 clubes, RN-02 cooldown 24h
 *  4. Idempotência estrita na fila Outbox (nunca duplica alertas no mesmo dia)
 *  5. Push HA: Retries automáticos com exponential backoff + jitter até sucesso
 *  6. Push HA: Invalidação automática de token expirado + Dead Letter Queue (DLQ) + Replay Admin
 *
 * Execução: node --experimental-strip-types tests/module3.geofencing_push.test.ts
 */
import assert from 'node:assert/strict';
import { createUgetServer } from '../src/server.ts';
import { securityStore } from '../src/repositories/securityStore.ts';
import { catalogStore } from '../src/repositories/catalogStore.ts';
import { pushStore } from '../src/repositories/pushStore.ts';
import { rateLimiter } from '../src/security/owaspGuard.ts';
import { registerUser } from '../src/services/authService.ts';
import { ROLES } from '../src/types/security.ts';
import {
  computeBackoffWithJitterMs,
  processPushOutboxBatch,
  resetPushDeliveryProvider,
  setPushDeliveryProvider
} from '../src/services/pushHaService.ts';

async function runTests() {
  securityStore.clearForTests();
  catalogStore.resetUserStateForTests();
  pushStore.clearForTests();
  rateLimiter.reset();
  resetPushDeliveryProvider();

  const server = createUgetServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 4000;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Setup CSRF + Usuário padrão + Super Admin
    const csrfRes = await fetch(`${baseUrl}/api/v1/security/csrf`);
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
    const csrfHeaders = {
      'Content-Type': 'application/json',
      Cookie: `uget_csrf=${csrfToken}`,
      'X-CSRF-Token': csrfToken
    };

    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: csrfHeaders,
      body: JSON.stringify({
        name: 'Carlos Geofence',
        email: 'carlos@uget.app',
        password: 'UgetGeoPassword2026',
        acceptTerms: true,
        consentGps: true,
        consentPush: true
      })
    });
    assert.equal(regRes.status, 201);
    const { user } = (await regRes.json()) as { user: { id: string } };

    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: csrfHeaders,
      body: JSON.stringify({ email: 'carlos@uget.app', password: 'UgetGeoPassword2026' })
    });
    const { accessToken } = (await loginRes.json()) as { accessToken: string };
    const authHeaders = { ...csrfHeaders, Authorization: `Bearer ${accessToken}` };

    await registerUser({
      name: 'Admin uGet',
      email: 'admin@uget.app',
      password: 'UgetAdminPassword2026',
      role: ROLES.SUPER_ADMIN,
      acceptTerms: true
    });
    const adminLogin = (await (
      await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: csrfHeaders,
        body: JSON.stringify({ email: 'admin@uget.app', password: 'UgetAdminPassword2026' })
      })
    ).json()) as { accessToken: string };
    const adminHeaders = { ...csrfHeaders, Authorization: `Bearer ${adminLogin.accessToken}` };

    // 1. Registro + Renovação Transparente de Token (criptografado em repouso)
    const dev1 = await fetch(`${baseUrl}/api/v1/push/devices`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        deviceId: 'iphone-carlos-01',
        platform: 'apns',
        token: 'apns_token_v1_secret_999999999'
      })
    });
    assert.equal(dev1.status, 201);
    const dev1Data = (await dev1.json()) as { device: { rotated: boolean; status: string } };
    assert.equal(dev1Data.device.rotated, false);
    assert.equal(dev1Data.device.status, 'ACTIVE');

    // Rotação transparente no mesmo deviceId
    const dev2 = await fetch(`${baseUrl}/api/v1/push/devices`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        deviceId: 'iphone-carlos-01',
        platform: 'apns',
        token: 'apns_token_v2_secret_888888888'
      })
    });
    assert.equal(dev2.status, 200);
    const dev2Data = (await dev2.json()) as { device: { rotated: boolean; status: string } };
    assert.equal(dev2Data.device.rotated, true);

    // Verifica que o token em repouso está criptografado e só 1 está ACTIVE
    const storedTokens = pushStore.listUserTokens(user.id, false);
    assert.equal(storedTokens.length, 2);
    assert.equal(storedTokens.filter((t) => t.status === 'ACTIVE').length, 1);
    assert.equal(storedTokens.filter((t) => t.status === 'ROTATED').length, 1);
    assert.ok(storedTokens.every((t) => t.tokenEncrypted.startsWith('v1:')));
    console.log('✓ 1. Registro e renovação transparente de tokens (AES-256-GCM em repouso)');

    // 2. Preferências de Notificação + Modo Não Perturbe (DND)
    const prefRes = await fetch(`${baseUrl}/api/v1/push/preferences`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ radiusMeters: 800, dndStartHour: 22, dndEndHour: 7, cooldownHours: 24 })
    });
    assert.equal(prefRes.status, 200);

    // Ping às 23h deve ser suprimido por DND
    const dndPing = await fetch(`${baseUrl}/api/v1/geofencing/ping`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ lat: -13.0098, lon: -38.5315, currentHour: 23 })
    });
    assert.equal(dndPing.status, 200);
    const dndData = (await dndPing.json()) as { evaluation: { evaluated: boolean; reason: string } };
    assert.equal(dndData.evaluation.evaluated, false);
    assert.equal(dndData.evaluation.reason, 'SUPPRESSED_DND');
    console.log('✓ 2. Preferências + Modo Não Perturbe (DND 22h-07h bloqueia alertas noturnos)');

    // 3. Geofencing Ping às 12h na Barra -> Dispara push + Entrega HA + Cooldown 24h (RN-02)
    const ping1 = await fetch(`${baseUrl}/api/v1/geofencing/ping`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ lat: -13.0098, lon: -38.5315, currentHour: 12 })
    });
    assert.equal(ping1.status, 200);
    const ping1Data = (await ping1.json()) as {
      evaluation: { enqueuedJobs: Array<{ id: string }> };
      delivery: { delivered: number };
    };
    assert.ok(ping1Data.evaluation.enqueuedJobs.length >= 2);
    assert.equal(ping1Data.delivery.delivered, ping1Data.evaluation.enqueuedJobs.length);

    // Segundo ping imediato no mesmo local deve ser bloqueado pelo Cooldown 24h (RN-02)
    const ping2 = await fetch(`${baseUrl}/api/v1/geofencing/ping`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ lat: -13.0098, lon: -38.5315, currentHour: 12 })
    });
    const ping2Data = (await ping2.json()) as {
      evaluation: { enqueuedJobs: unknown[]; skippedCooldownIds: string[] };
    };
    assert.equal(ping2Data.evaluation.enqueuedJobs.length, 0);
    assert.ok(ping2Data.evaluation.skippedCooldownIds.length >= 2);

    // Feed de notificações entregues do usuário
    const inboxRes = await fetch(`${baseUrl}/api/v1/push/notifications`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    assert.equal(inboxRes.status, 200);
    const inboxData = (await inboxRes.json()) as { notifications: Array<{ status: string }> };
    assert.ok(inboxData.notifications.length >= 2);
    assert.ok(inboxData.notifications.every((n) => n.status === 'DELIVERED'));
    console.log('✓ 3. Geofencing entrega alertas HA + Anti-spam Cooldown 24h (RN-02)');

    // 4. Conformidade LGPD: revogar consentimento de GPS bloqueia geofencing imediatamente
    await fetch(`${baseUrl}/api/v1/lgpd/consents`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ purpose: 'gps', granted: false })
    });
    const lgpdPing = await fetch(`${baseUrl}/api/v1/geofencing/ping`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ lat: -13.0098, lon: -38.5315, currentHour: 12 })
    });
    const lgpdData = (await lgpdPing.json()) as { evaluation: { evaluated: boolean; reason: string } };
    assert.equal(lgpdData.evaluation.evaluated, false);
    assert.equal(lgpdData.evaluation.reason, 'BLOCKED_LGPD_CONSENT');
    console.log('✓ 4. Conformidade LGPD: revogação de GPS bloqueia motor de Geofencing');

    // 5. Push HA: Idempotência + Retries com Exponential Backoff + Jitter até sucesso
    const backoff1 = computeBackoffWithJitterMs(1, 1000, 60_000, () => 0.5);
    const backoff2 = computeBackoffWithJitterMs(2, 1000, 60_000, () => 0.5);
    assert.ok(backoff2 > backoff1);

    const t0 = 1_700_000_000_000;
    const { job: retryJob, deduplicated: d1 } = pushStore.enqueueJob({
      idempotencyKey: 'ha-retry-test-001',
      userId: user.id,
      benefitId: 'ben-drogaria-oab',
      partnerUnitId: 'unit-drogaria-barra',
      title: 'Teste HA Retry',
      body: 'Simulação de falha transiente 503',
      deepLink: '/?benefit=ben-drogaria-oab',
      discountLabel: '25% OFF',
      distanceLabel: '120 m',
      maxAttempts: 3,
      nowMs: t0
    });
    const { deduplicated: d2 } = pushStore.enqueueJob({
      idempotencyKey: 'ha-retry-test-001',
      userId: user.id,
      benefitId: 'ben-drogaria-oab',
      partnerUnitId: 'unit-drogaria-barra',
      title: 'Duplicado',
      body: 'Deve ser ignorado',
      deepLink: '/?benefit=ben-drogaria-oab',
      discountLabel: '25% OFF',
      distanceLabel: '120 m',
      nowMs: t0
    });
    assert.equal(d1, false);
    assert.equal(d2, true);

    let callCount = 0;
    setPushDeliveryProvider({
      async send() {
        callCount++;
        if (callCount <= 2) {
          return { status: 'TRANSIENT_ERROR', error: 'FCM_503_UNAVAILABLE' };
        }
        return { status: 'OK', providerMessageId: 'fcm_recovered_ok' };
      }
    });

    // Tentativa 1 falha -> RETRY_SCHEDULED
    const r1 = await processPushOutboxBatch({ nowMs: t0, baseDelayMs: 1000, randomFn: () => 0.5 });
    assert.equal(r1.retried, 1);
    const after1 = pushStore.getJobById(retryJob.id)!;
    assert.equal(after1.status, 'RETRY_SCHEDULED');
    assert.ok(after1.nextAttemptAt > t0);

    // Tentativa 2 falha -> RETRY_SCHEDULED com delay maior
    const r2 = await processPushOutboxBatch({ nowMs: after1.nextAttemptAt, baseDelayMs: 1000, randomFn: () => 0.5 });
    assert.equal(r2.retried, 1);
    const after2 = pushStore.getJobById(retryJob.id)!;
    assert.equal(after2.status, 'RETRY_SCHEDULED');

    // Tentativa 3 recupera e entrega!
    const r3 = await processPushOutboxBatch({ nowMs: after2.nextAttemptAt, baseDelayMs: 1000, randomFn: () => 0.5 });
    assert.equal(r3.delivered, 1);
    assert.equal(pushStore.getJobById(retryJob.id)!.status, 'DELIVERED');
    console.log('✓ 5. Push HA: Idempotência + Retries com Exponential Backoff + Jitter até entrega');

    // 6. Push HA: Invalidação automática de Token Expirado -> DLQ -> Replay Admin
    setPushDeliveryProvider({
      async send() {
        return { status: 'TOKEN_EXPIRED', error: 'APNS_UNREGISTERED_DEVICE' };
      }
    });

    const { job: dlqJob } = pushStore.enqueueJob({
      idempotencyKey: 'ha-dlq-expired-token-001',
      userId: user.id,
      benefitId: 'ben-cafe-oab',
      partnerUnitId: 'unit-cafe-barra',
      title: 'Teste Token Expirado',
      body: 'Deve invalidar token e mover para DLQ',
      deepLink: '/?benefit=ben-cafe-oab',
      discountLabel: '20% OFF',
      distanceLabel: '200 m',
      nowMs: t0 + 100_000
    });

    const expBatch = await processPushOutboxBatch({ nowMs: t0 + 100_000 });
    assert.equal(expBatch.expiredTokensInvalidated, 1);
    assert.equal(expBatch.deadLettered, 1);
    assert.equal(pushStore.getJobById(dlqJob.id)!.status, 'DEAD_LETTER');
    assert.equal(pushStore.listUserTokens(user.id, true).length, 0);

    // Painel Admin Health (RBAC: usuário comum bloqueado, SUPER_ADMIN autorizado)
    const deniedHealth = await fetch(`${baseUrl}/api/v1/admin/push/health`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    assert.equal(deniedHealth.status, 403);

    const adminHealth = await fetch(`${baseUrl}/api/v1/admin/push/health`, {
      headers: { Authorization: `Bearer ${adminLogin.accessToken}` }
    });
    assert.equal(adminHealth.status, 200);
    const healthData = (await adminHealth.json()) as {
      health: { queue: { deadLetter: number }; tokens: { expired: number } };
      deadLetters: Array<{ jobId: string }>;
    };
    assert.equal(healthData.health.queue.deadLetter, 1);
    assert.equal(healthData.health.tokens.expired, 1);

    // Usuário renova token + Admin faz replay da DLQ com provider restaurado!
    resetPushDeliveryProvider();
    await fetch(`${baseUrl}/api/v1/push/devices`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        deviceId: 'iphone-carlos-01',
        platform: 'apns',
        token: 'apns_token_v3_renewed_777777777'
      })
    });

    const replayRes = await fetch(`${baseUrl}/api/v1/admin/push/dlq/${dlqJob.id}/replay`, {
      method: 'POST',
      headers: adminHeaders
    });
    assert.equal(replayRes.status, 200);
    const replayData = (await replayRes.json()) as { delivery: { delivered: number } };
    assert.equal(replayData.delivery.delivered, 1);
    assert.equal(pushStore.getJobById(dlqJob.id)!.status, 'DELIVERED');
    console.log('✓ 6. Push HA: Invalidação de token expirado -> DLQ -> Renovação + Replay SUPER_ADMIN');

    console.log('\n🎉 TODOS OS 6 TESTES DO MÓDULO 3 PASSARAM COM SUCESSO!\n');
  } finally {
    resetPushDeliveryProvider();
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes do Módulo 3:', err);
  process.exit(1);
});
