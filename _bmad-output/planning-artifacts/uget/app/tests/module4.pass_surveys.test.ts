/**
 * uGet — Suíte de Testes Ponta a Ponta do Módulo 4 (Carteirinha uGet Pass 3D Offline & Micro-pesquisa Pós-Visita)
 * Execução: node --experimental-strip-types tests/module4.pass_surveys.test.ts
 */
import assert from 'node:assert/strict';
import { createUgetServer } from '../src/server.ts';
import { securityStore } from '../src/repositories/securityStore.ts';
import { catalogStore } from '../src/repositories/catalogStore.ts';
import { passStore } from '../src/repositories/passStore.ts';
import { rateLimiter } from '../src/security/owaspGuard.ts';

async function runTests() {
  securityStore.clearForTests();
  catalogStore.resetUserStateForTests();
  passStore.clearForTests();
  rateLimiter.reset();

  const server = createUgetServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 4000;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Setup CSRF + Usuário autenticado
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
        name: 'Juliana Pass 3D',
        email: 'juliana@uget.app',
        password: 'UgetPassPassword2026',
        acceptTerms: true,
        consentGps: true,
        consentPush: true
      })
    });
    assert.equal(regRes.status, 201);

    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: csrfHeaders,
      body: JSON.stringify({ email: 'juliana@uget.app', password: 'UgetPassPassword2026' })
    });
    const { accessToken } = (await loginRes.json()) as { accessToken: string };
    const authHeaders = { ...csrfHeaders, Authorization: `Bearer ${accessToken}` };

    // 1. Carteirinha uGet Pass Offline (assinada HMAC + matriz QR 21x21)
    const cardRes = await fetch(`${baseUrl}/api/v1/pass/card`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    assert.equal(cardRes.status, 200);
    const { card } = (await cardRes.json()) as {
      card: {
        holderName: string;
        signedCode: string;
        qrMatrixSize: number;
        qrBits: number[];
        activeClubs: Array<{ id: string }>;
      };
    };
    assert.equal(card.holderName, 'Juliana Pass 3D');
    assert.ok(card.signedCode.startsWith('UGET.'));
    assert.equal(card.qrMatrixSize, 21);
    assert.equal(card.qrBits.length, 441);
    assert.ok(card.activeClubs.length >= 1);
    console.log('✓ 1. GET /api/v1/pass/card (uGet Pass assinado HMAC + matriz QR 21x21 offline)');

    // 2. Emissão de resgate uGet Pass (RN-01 exige clube ativo) + Validação anti-fraude
    const blockedRedeem = await fetch(`${baseUrl}/api/v1/pass/redeem`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ benefitId: 'ben-emporio-croba' }) // CROBA não está nos clubes padrão
    });
    assert.equal(blockedRedeem.status, 403);

    const okRedeem = await fetch(`${baseUrl}/api/v1/pass/redeem`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ benefitId: 'ben-drogaria-oab' })
    });
    assert.equal(okRedeem.status, 201);
    const { redemption } = (await okRedeem.json()) as {
      redemption: { id: string; signedCode: string; status: string };
    };
    assert.equal(redemption.status, 'ISSUED');

    // Código adulterado deve ser rejeitado (HTTP 400)
    const tamperedVerify = await fetch(`${baseUrl}/api/v1/pass/verify`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ signedCode: `${redemption.signedCode}X` })
    });
    assert.equal(tamperedVerify.status, 400);

    // Código legítimo é validado e marcado como VALIDATED
    const validVerify = await fetch(`${baseUrl}/api/v1/pass/verify`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ signedCode: redemption.signedCode })
    });
    assert.equal(validVerify.status, 200);
    const verifyData = (await validVerify.json()) as {
      valid: boolean;
      redemption: { status: string };
    };
    assert.equal(verifyData.valid, true);
    assert.equal(verifyData.redemption.status, 'VALIDATED');
    console.log('✓ 2. POST /api/v1/pass/redeem (RN-01) + /verify (HMAC anti-fraude)');

    // 3. Micro-pesquisa Pós-Visita exige consentimento LGPD 'surveys'
    const surveyDenied = await fetch(`${baseUrl}/api/v1/surveys`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        benefitId: 'ben-drogaria-oab',
        redemptionId: redemption.id,
        rating: 5,
        discountHonored: true,
        savedEstimateBrl: 42.5
      })
    });
    assert.equal(surveyDenied.status, 403);

    // Ativa consentimento LGPD para 'surveys'
    const consentRes = await fetch(`${baseUrl}/api/v1/lgpd/consents`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ purpose: 'surveys', granted: true })
    });
    assert.equal(consentRes.status, 201);

    // Envia micro-pesquisa com tentativa de XSS no comentário -> sanitizada!
    const surveyOk = await fetch(`${baseUrl}/api/v1/surveys`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        benefitId: 'ben-drogaria-oab',
        redemptionId: redemption.id,
        rating: 5,
        discountHonored: true,
        savedEstimateBrl: 42.5,
        comment: '<script>evil()</script>Desconto aplicado na hora!'
      })
    });
    assert.equal(surveyOk.status, 201);
    const surveyData = (await surveyOk.json()) as {
      survey: { comment: string; savedEstimateBrl: number };
      partnerSummary: { averageRating: number; honoredRatePct: number };
    };
    assert.ok(!surveyData.survey.comment.includes('<script>'));
    assert.equal(surveyData.partnerSummary.averageRating, 5);
    assert.equal(surveyData.partnerSummary.honoredRatePct, 100);

    // Duplicidade de pesquisa para o mesmo redemptionId deve retornar 409 Conflict
    const surveyDup = await fetch(`${baseUrl}/api/v1/surveys`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        benefitId: 'ben-drogaria-oab',
        redemptionId: redemption.id,
        rating: 4,
        discountHonored: true
      })
    });
    assert.equal(surveyDup.status, 409);
    console.log('✓ 3. POST /api/v1/surveys (LGPD consent + anti-XSS + unicidade por resgate)');

    // 4. Histórico de pesquisas & economia total do usuário
    const mySurveysRes = await fetch(`${baseUrl}/api/v1/surveys/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    assert.equal(mySurveysRes.status, 200);
    const mySurveys = (await mySurveysRes.json()) as {
      surveys: unknown[];
      totalSavedBrl: number;
    };
    assert.equal(mySurveys.surveys.length, 1);
    assert.equal(mySurveys.totalSavedBrl, 42.5);
    console.log('✓ 4. GET /api/v1/surveys/me (economia acumulada R$ 42,50)');

    // 5. Frontend Web App contém abas uGet Pass 3D, Raio & Central LGPD e Modal de Pesquisa
    const html = await (await fetch(`${baseUrl}/`)).text();
    assert.ok(html.includes('viewPass'));
    assert.ok(html.includes('viewPrivacy'));
    assert.ok(html.includes('radiusSlider'));
    assert.ok(html.includes('surveyModal'));
    console.log('✓ 5. Web App ugetds contém uGet Pass 3D, Slider de Raio, Central LGPD e Pesquisa');

    console.log('\n🎉 TODOS OS 5 TESTES DO MÓDULO 4 PASSARAM COM SUCESSO!\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes do Módulo 4:', err);
  process.exit(1);
});
