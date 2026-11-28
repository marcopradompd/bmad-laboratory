/**
 * uGet — Suíte de Testes Ponta a Ponta do Módulo 1 (Segurança, OWASP, RBAC & LGPD)
 * Execução: node --experimental-strip-types tests/module1.security.test.ts
 */
import assert from 'node:assert/strict';
import { createUgetServer } from '../src/server.ts';
import { securityStore } from '../src/repositories/securityStore.ts';
import { rateLimiter } from '../src/security/owaspGuard.ts';
import { registerUser } from '../src/services/authService.ts';
import { ROLES } from '../src/types/security.ts';

async function runTests() {
  securityStore.clearForTests();
  rateLimiter.reset();

  const server = createUgetServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 4000;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Health + Security Headers
    const healthRes = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(healthRes.status, 200);
    assert.ok(healthRes.headers.get('content-security-policy')?.includes("default-src 'self'"));
    assert.ok(healthRes.headers.get('strict-transport-security')?.includes('max-age=31536000'));
    assert.equal(healthRes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(healthRes.headers.get('x-frame-options'), 'DENY');
    console.log('✓ 1. Security Headers (CSP, HSTS, X-Frame-Options, nosniff)');

    // 2. Anti-CSRF bloqueia POST sem token
    const blockedCsrf = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com' })
    });
    assert.equal(blockedCsrf.status, 403);
    console.log('✓ 2. Proteção Anti-CSRF (POST sem token bloqueado com HTTP 403)');

    // Emite CSRF cookie + token
    const csrfRes = await fetch(`${baseUrl}/api/v1/security/csrf`);
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
    const csrfHeaders = {
      'Content-Type': 'application/json',
      Cookie: `uget_csrf=${csrfToken}`,
      'X-CSRF-Token': csrfToken
    };

    // 3. Cadastro com sanitização XSS + Criptografia AES-256-GCM em repouso
    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: csrfHeaders,
      body: JSON.stringify({
        name: '<script>alert(1)</script>Marco Prado',
        email: 'marco@uget.app',
        password: 'UgetSecurePassword2026',
        cpf: '123.456.789-01',
        acceptTerms: true,
        consentGps: true,
        consentPush: true
      })
    });
    assert.equal(regRes.status, 201);
    const regData = (await regRes.json()) as { user: { id: string; name: string } };
    assert.equal(regData.user.name, 'alert(1)Marco Prado');
    assert.ok(!regData.user.name.includes('<script>'));

    const rawStored = securityStore.findUserById(regData.user.id);
    assert.ok(rawStored);
    assert.ok(rawStored.emailEncrypted.startsWith('v1:'));
    assert.ok(!rawStored.emailEncrypted.includes('marco@uget.app'));
    assert.ok(rawStored.cpfEncrypted?.startsWith('v1:'));
    assert.ok(rawStored.passwordHash.startsWith('scrypt$'));
    console.log('✓ 3. Sanitização XSS + Criptografia AES-256-GCM em repouso + scrypt');

    // 4. Login + Rotação de Refresh Token + Detecção de Reuso
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: csrfHeaders,
      body: JSON.stringify({ email: 'marco@uget.app', password: 'UgetSecurePassword2026' })
    });
    assert.equal(loginRes.status, 200);
    const loginData = (await loginRes.json()) as { accessToken: string; refreshToken: string };
    assert.ok(loginData.accessToken);
    assert.ok(loginData.refreshToken);

    const rotRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: csrfHeaders,
      body: JSON.stringify({ refreshToken: loginData.refreshToken })
    });
    assert.equal(rotRes.status, 200);
    const rotData = (await rotRes.json()) as { refreshToken: string; accessToken: string };

    // Reuso do refresh token antigo deve ser bloqueado e revogar a família inteira!
    const reuseRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: csrfHeaders,
      body: JSON.stringify({ refreshToken: loginData.refreshToken })
    });
    assert.equal(reuseRes.status, 401);

    const afterReuseRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: csrfHeaders,
      body: JSON.stringify({ refreshToken: rotData.refreshToken })
    });
    assert.equal(afterReuseRes.status, 401);
    console.log('✓ 4. JWT + Rotação de Refresh Token + Detecção de Reuso (família revogada)');

    // 5. RBAC & Isolamento Multi-Tenant
    const auditDenied = await fetch(`${baseUrl}/api/v1/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${rotData.accessToken}` }
    });
    assert.equal(auditDenied.status, 403);

    await registerUser({
      name: 'Gestor OAB',
      email: 'gestor@oab.org',
      password: 'OabManagerPassword2026',
      role: ROLES.CLUB_MANAGER,
      tenantId: 'clube-oab',
      acceptTerms: true
    });
    const mgrLogin = await (
      await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: csrfHeaders,
        body: JSON.stringify({ email: 'gestor@oab.org', password: 'OabManagerPassword2026' })
      })
    ).json() as { accessToken: string };

    const ownTenantRes = await fetch(`${baseUrl}/api/v1/tenants/clube-oab/reports`, {
      headers: { Authorization: `Bearer ${mgrLogin.accessToken}` }
    });
    assert.equal(ownTenantRes.status, 200);

    const otherTenantRes = await fetch(`${baseUrl}/api/v1/tenants/clube-abm/reports`, {
      headers: { Authorization: `Bearer ${mgrLogin.accessToken}` }
    });
    assert.equal(otherTenantRes.status, 403);
    console.log('✓ 5. RBAC + Isolamento Multi-Tenant (acesso cruzado bloqueado com HTTP 403)');

    // 6. LGPD: Consentimento Granular + Portabilidade + Anonimização Irreversível
    const consentRes = await fetch(`${baseUrl}/api/v1/lgpd/consents`, {
      method: 'POST',
      headers: { ...csrfHeaders, Authorization: `Bearer ${rotData.accessToken}` },
      body: JSON.stringify({ purpose: 'surveys', granted: true })
    });
    assert.equal(consentRes.status, 201);

    const exportRes = await fetch(`${baseUrl}/api/v1/lgpd/export`, {
      headers: { Authorization: `Bearer ${rotData.accessToken}` }
    });
    assert.equal(exportRes.status, 200);
    const exported = (await exportRes.json()) as { profile: { email: string; cpf: string }; consentsHistory: unknown[] };
    assert.equal(exported.profile.email, 'marco@uget.app');
    assert.equal(exported.profile.cpf, '12345678901');
    assert.ok(exported.consentsHistory.length >= 4);

    const anonRes = await fetch(`${baseUrl}/api/v1/lgpd/anonymize`, {
      method: 'POST',
      headers: { ...csrfHeaders, Authorization: `Bearer ${rotData.accessToken}` },
      body: JSON.stringify({ confirm: 'ANONIMIZAR' })
    });
    assert.equal(anonRes.status, 200);

    const afterAnon = securityStore.findUserById(regData.user.id);
    assert.equal(afterAnon?.isAnonymized, true);
    assert.equal(afterAnon?.cpfEncrypted, null);
    console.log('✓ 6. LGPD (Consentimento rastreável + Exportação JSON + Anonimização irreversível)');

    // 7. Rate Limiting (HTTP 429 em /api/v1/auth/login)
    let hit429 = false;
    for (let i = 0; i < 12; i++) {
      const r = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: csrfHeaders,
        body: JSON.stringify({ email: 'nobody@uget.app', password: 'WrongPassword123' })
      });
      if (r.status === 429) {
        hit429 = true;
        break;
      }
    }
    assert.equal(hit429, true);
    console.log('✓ 7. Rate Limiting ativo (HTTP 429 em excesso de tentativas de login)');

    // 8. Logs de Auditoria Imutáveis sem PII
    const logs = securityStore.listAuditLogs(50);
    assert.ok(logs.length >= 8);
    const serializedLogs = JSON.stringify(logs);
    assert.ok(!serializedLogs.includes('UgetSecurePassword2026'));
    assert.ok(!serializedLogs.includes('12345678901'));
    console.log(`✓ 8. Logs de Auditoria imutáveis verificados (${logs.length} eventos, 0 vazamentos de PII)`);

    console.log('\n🎉 TODOS OS 8 TESTES DO MÓDULO 1 PASSARAM COM SUCESSO!\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes do Módulo 1:', err);
  process.exit(1);
});
