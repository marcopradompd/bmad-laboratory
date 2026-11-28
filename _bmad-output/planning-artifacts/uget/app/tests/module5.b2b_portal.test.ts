/**
 * uGet — Suíte de Testes Ponta a Ponta do Módulo 5 (Portal Web B2B Multi-Tenant & RBAC)
 * Valida:
 *  1. Isolamento RBAC: usuário comum bloqueado com HTTP 403 no Portal B2B
 *  2. CLUB_MANAGER só visualiza/cria/pausa convênios do próprio clube (multi-tenant)
 *  3. PARTNER_MANAGER valida uGet Pass no caixa apenas do próprio parceiro (cross-tenant bloqueado!)
 *  4. Relatórios agregados 100% livres de PII (nenhum e-mail/CPF/nome de associado vaza no dashboard)
 *  5. Serving do Portal B2B (/b2b, /b2b.js) com ugetds e CSP estrito
 *
 * Execução: node --experimental-strip-types tests/module5.b2b_portal.test.ts
 */
import assert from 'node:assert/strict';
import { createUgetServer } from '../src/server.ts';
import { securityStore } from '../src/repositories/securityStore.ts';
import { catalogStore } from '../src/repositories/catalogStore.ts';
import { passStore } from '../src/repositories/passStore.ts';
import { rateLimiter } from '../src/security/owaspGuard.ts';
import { registerUser } from '../src/services/authService.ts';
import { ROLES } from '../src/types/security.ts';

async function runTests() {
  securityStore.clearForTests();
  catalogStore.seed();
  catalogStore.resetUserStateForTests();
  passStore.clearForTests();
  rateLimiter.reset();

  const server = createUgetServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 4000;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const csrfRes = await fetch(`${baseUrl}/api/v1/security/csrf`);
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
    const csrfHeaders = {
      'Content-Type': 'application/json',
      Cookie: `uget_csrf=${csrfToken}`,
      'X-CSRF-Token': csrfToken
    };

    async function loginAs(email: string, password: string) {
      const r = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: csrfHeaders,
        body: JSON.stringify({ email, password })
      });
      const data = (await r.json()) as { accessToken: string };
      return {
        token: data.accessToken,
        headers: { ...csrfHeaders, Authorization: `Bearer ${data.accessToken}` }
      };
    }

    // Cria 1 associado comum, 1 CLUB_MANAGER (OAB-BA), 2 PARTNER_MANAGERs (Drogaria Vida e Café Origem)
    await registerUser({
      name: 'Associada Sigilosa PII',
      email: 'sigilosa@uget.app',
      cpf: '987.654.321-00',
      password: 'UserB2bPassword2026',
      acceptTerms: true,
      consentGps: true,
      consentPush: true
    });
    await registerUser({
      name: 'Gestor OAB-BA',
      email: 'gestor.oab@uget.app',
      password: 'OabB2bPassword2026',
      role: ROLES.CLUB_MANAGER,
      tenantId: 'club-oab-ba',
      acceptTerms: true
    });
    await registerUser({
      name: 'Gerente Drogaria Vida',
      email: 'gerente.drogaria@uget.app',
      password: 'DrogariaB2bPassword2026',
      role: ROLES.PARTNER_MANAGER,
      tenantId: 'ptr-drogaria-vida',
      acceptTerms: true
    });
    await registerUser({
      name: 'Gerente Café Origem',
      email: 'gerente.cafe@uget.app',
      password: 'CafeB2bPassword2026',
      role: ROLES.PARTNER_MANAGER,
      tenantId: 'ptr-cafe-origem',
      acceptTerms: true
    });

    const userSession = await loginAs('sigilosa@uget.app', 'UserB2bPassword2026');
    const oabSession = await loginAs('gestor.oab@uget.app', 'OabB2bPassword2026');
    const drogariaSession = await loginAs('gerente.drogaria@uget.app', 'DrogariaB2bPassword2026');
    const cafeSession = await loginAs('gerente.cafe@uget.app', 'CafeB2bPassword2026');

    // 1. Usuário comum bloqueado no Portal B2B (RBAC)
    const userBlocked = await fetch(`${baseUrl}/api/v1/b2b/dashboard`, {
      headers: { Authorization: `Bearer ${userSession.token}` }
    });
    assert.equal(userBlocked.status, 403);
    console.log('✓ 1. RBAC bloqueia usuário comum (USER_ASSOCIATE) no Portal B2B com HTTP 403');

    // 2. CLUB_MANAGER (OAB-BA): escopo isolado + criar/pausar convênio apenas do próprio clube
    const oabDashRes = await fetch(`${baseUrl}/api/v1/b2b/dashboard`, {
      headers: { Authorization: `Bearer ${oabSession.token}` }
    });
    assert.equal(oabDashRes.status, 200);
    const oabDash = (await oabDashRes.json()) as {
      scope: { tenantId: string; aggregatedOnly: boolean };
      benefits: Array<{ clubId: string }>;
    };
    assert.equal(oabDash.scope.tenantId, 'club-oab-ba');
    assert.ok(oabDash.benefits.every((b) => b.clubId === 'club-oab-ba'));

    // Tentativa de criar benefício para outro clube (club-abm) -> 403
    const crossClubCreate = await fetch(`${baseUrl}/api/v1/b2b/benefits`, {
      method: 'POST',
      headers: oabSession.headers,
      body: JSON.stringify({
        clubId: 'club-abm',
        partnerId: 'ptr-drogaria-vida',
        title: 'Tentativa Cruzada',
        discountLabel: '50% OFF',
        rules: 'Deve ser bloqueado'
      })
    });
    assert.equal(crossClubCreate.status, 403);

    // Criar benefício válido no próprio clube (club-oab-ba) + sanitização XSS
    const okCreate = await fetch(`${baseUrl}/api/v1/b2b/benefits`, {
      method: 'POST',
      headers: oabSession.headers,
      body: JSON.stringify({
        clubId: 'club-oab-ba',
        partnerId: 'ptr-drogaria-vida',
        title: '<script>x()</script>Vacinas & Testes Rápidos OAB',
        discountLabel: '30% OFF',
        rules: 'Apresente o uGet Pass na sala de vacinas.'
      })
    });
    assert.equal(okCreate.status, 201);
    const { benefit: createdBenefit } = (await okCreate.json()) as {
      benefit: { id: string; title: string; isActive: boolean };
    };
    assert.ok(!createdBenefit.title.includes('<script>'));
    assert.equal(createdBenefit.isActive, true);

    // Pausar convênio do próprio clube
    const pauseRes = await fetch(`${baseUrl}/api/v1/b2b/benefits/${createdBenefit.id}/status`, {
      method: 'PATCH',
      headers: oabSession.headers,
      body: JSON.stringify({ isActive: false })
    });
    assert.equal(pauseRes.status, 200);
    assert.equal(((await pauseRes.json()) as { benefit: { isActive: boolean } }).benefit.isActive, false);
    console.log('✓ 2. CLUB_MANAGER isolado por tenant (criar/pausar convênios + bloqueio cross-tenant)');

    // 3. Fluxo Completo Caixa B2B: Associada emite uGet Pass -> Outro parceiro bloqueado -> Parceiro certo valida!
    const redeemRes = await fetch(`${baseUrl}/api/v1/pass/redeem`, {
      method: 'POST',
      headers: userSession.headers,
      body: JSON.stringify({ benefitId: 'ben-drogaria-oab' })
    });
    assert.equal(redeemRes.status, 201);
    const { redemption } = (await redeemRes.json()) as {
      redemption: { id: string; signedCode: string };
    };

    // Café Origem tentando validar pass da Drogaria Vida -> 403!
    const wrongPartnerValidate = await fetch(`${baseUrl}/api/v1/b2b/checkout/validate`, {
      method: 'POST',
      headers: cafeSession.headers,
      body: JSON.stringify({ signedCode: redemption.signedCode })
    });
    assert.equal(wrongPartnerValidate.status, 403);

    // Drogaria Vida valida com sucesso -> 200!
    const okPartnerValidate = await fetch(`${baseUrl}/api/v1/b2b/checkout/validate`, {
      method: 'POST',
      headers: drogariaSession.headers,
      body: JSON.stringify({ signedCode: redemption.signedCode })
    });
    assert.equal(okPartnerValidate.status, 200);
    const valData = (await okPartnerValidate.json()) as { valid: boolean; status: string };
    assert.equal(valData.valid, true);
    assert.equal(valData.status, 'VALIDATED');
    console.log('✓ 3. Validador de Caixa B2B valida uGet Pass HMAC e bloqueia cross-partner');

    // 4. Relatório Agregado B2B com ZERO vazamento de PII (LGPD)
    await fetch(`${baseUrl}/api/v1/lgpd/consents`, {
      method: 'POST',
      headers: userSession.headers,
      body: JSON.stringify({ purpose: 'surveys', granted: true })
    });
    await fetch(`${baseUrl}/api/v1/surveys`, {
      method: 'POST',
      headers: userSession.headers,
      body: JSON.stringify({
        benefitId: 'ben-drogaria-oab',
        redemptionId: redemption.id,
        rating: 5,
        discountHonored: true,
        savedEstimateBrl: 60
      })
    });

    const drogariaDashRes = await fetch(`${baseUrl}/api/v1/b2b/dashboard`, {
      headers: { Authorization: `Bearer ${drogariaSession.token}` }
    });
    assert.equal(drogariaDashRes.status, 200);
    const drogariaDashRaw = await drogariaDashRes.text();
    const drogariaDash = JSON.parse(drogariaDashRaw) as {
      kpis: { totalRedemptionsValidated: number; averageRating: number; totalEstimatedSavingsBrl: number };
    };
    assert.equal(drogariaDash.kpis.totalRedemptionsValidated, 1);
    assert.equal(drogariaDash.kpis.averageRating, 5);
    assert.equal(drogariaDash.kpis.totalEstimatedSavingsBrl, 60);
    assert.ok(!drogariaDashRaw.includes('sigilosa@uget.app'));
    assert.ok(!drogariaDashRaw.includes('98765432100'));
    assert.ok(!drogariaDashRaw.includes('Associada Sigilosa PII'));
    console.log('✓ 4. Dashboard B2B retorna KPIs agregados (1 validado, ★ 5, R$ 60) com 0 PII');

    // 5. Serving do Portal B2B (/b2b, /b2b.js) com ugetds e CSP estrito
    const b2bHtmlRes = await fetch(`${baseUrl}/b2b`);
    assert.equal(b2bHtmlRes.status, 200);
    const b2bHtml = await b2bHtmlRes.text();
    assert.ok(b2bHtml.includes('/ugetds/ugetds.css'));
    assert.ok(b2bHtml.includes('/b2b.js'));
    assert.ok(b2bHtmlRes.headers.get('content-security-policy')?.includes("script-src 'self'"));

    const b2bJsRes = await fetch(`${baseUrl}/b2b.js`);
    assert.equal(b2bJsRes.status, 200);
    console.log('✓ 5. Portal B2B (/b2b, /b2b.js) servido com ugetds e CSP estrito');

    console.log('\n🎉 TODOS OS 5 TESTES DO MÓDULO 5 PASSARAM COM SUCESSO!\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes do Módulo 5:', err);
  process.exit(1);
});
