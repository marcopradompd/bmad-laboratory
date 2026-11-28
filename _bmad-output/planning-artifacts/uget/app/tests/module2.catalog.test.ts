/**
 * uGet — Suíte de Testes Ponta a Ponta do Módulo 2 (Clubes, Geoespacial, Catálogo & Web App ugetds)
 * Execução: node --experimental-strip-types tests/module2.catalog.test.ts
 */
import assert from 'node:assert/strict';
import { createUgetServer } from '../src/server.ts';
import { securityStore } from '../src/repositories/securityStore.ts';
import { catalogStore } from '../src/repositories/catalogStore.ts';
import { rateLimiter } from '../src/security/owaspGuard.ts';
import type { EnrichedBenefitItem } from '../src/types/catalog.ts';

async function runTests() {
  securityStore.clearForTests();
  catalogStore.resetUserStateForTests();
  rateLimiter.reset();

  const server = createUgetServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 4000;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Listagem de clubes & busca textual (?q=)
    const clubsRes = await fetch(`${baseUrl}/api/v1/clubs`);
    assert.equal(clubsRes.status, 200);
    const clubsData = (await clubsRes.json()) as { clubs: Array<{ id: string; name: string }> };
    assert.equal(clubsData.clubs.length, 6);

    const searchClubsRes = await fetch(`${baseUrl}/api/v1/clubs?q=OAB`);
    assert.equal(searchClubsRes.status, 200);
    const searchClubs = (await searchClubsRes.json()) as { clubs: Array<{ id: string }> };
    assert.equal(searchClubs.clubs.length, 1);
    assert.equal(searchClubs.clubs[0].id, 'club-oab-ba');
    console.log('✓ 1. GET /api/v1/clubs (6 clubes Bahia + filtro ?q=)');

    // 2. Busca geoespacial (Haversine) ordenada por proximidade na Barra (-13.0098, -38.5315)
    const nearbyRes = await fetch(
      `${baseUrl}/api/v1/benefits/nearby?lat=-13.0098&lon=-38.5315&radius=10000&hour=12`
    );
    assert.equal(nearbyRes.status, 200);
    const nearbyData = (await nearbyRes.json()) as { count: number; items: EnrichedBenefitItem[] };
    assert.equal(nearbyData.count, 7);
    assert.equal(nearbyData.items.length, 7);
    // Primeiro item deve ser Drogaria Vida Barra (0 m)
    assert.equal(nearbyData.items[0].id, 'ben-drogaria-oab');
    assert.ok(nearbyData.items[0].distanceMeters <= 10);
    // Verifica ordenação crescente por distância
    for (let i = 1; i < nearbyData.items.length; i++) {
      assert.ok(nearbyData.items[i].distanceMeters >= nearbyData.items[i - 1].distanceMeters);
    }
    console.log('✓ 2. GET /api/v1/benefits/nearby ordenado por distância Haversine');

    // 3. Filtro de raio + RN-01 (clubIds) + RF-06 (janela de horário) + categoria/busca
    const tightRadiusRes = await fetch(
      `${baseUrl}/api/v1/benefits/nearby?lat=-13.0098&lon=-38.5315&radius=1200&clubIds=club-oab-ba&hour=18`
    );
    assert.equal(tightRadiusRes.status, 200);
    const tightData = (await tightRadiusRes.json()) as { items: EnrichedBenefitItem[] };
    assert.ok(tightData.items.length >= 2);
    assert.ok(tightData.items.every((b) => b.club.id === 'club-oab-ba' && b.distanceMeters <= 1200));
    const cafeAt18 = tightData.items.find((b) => b.id === 'ben-cafe-oab');
    assert.ok(cafeAt18, 'Café Origem deveria estar no raio de 1200m na Barra');
    assert.equal(cafeAt18.isValidNow, false, 'Almoço (11h-15h) deve estar fora da janela às 18h');

    const catRes = await fetch(
      `${baseUrl}/api/v1/benefits/nearby?lat=-13.0098&lon=-38.5315&radius=10000&category=Sa%C3%BAde`
    );
    const catData = (await catRes.json()) as { items: EnrichedBenefitItem[] };
    assert.equal(catData.items.length, 2);
    assert.ok(catData.items.every((b) => b.partner.category === 'Saúde'));
    console.log('✓ 3. Filtros geoespaciais (raio, RN-01 clubIds, RF-06 horário, categoria)');

    // 4. Detalhe do benefício (T03: mapsUrl, telefone, website, regras)
    const detailRes = await fetch(
      `${baseUrl}/api/v1/benefits/ben-drogaria-oab?lat=-13.0098&lon=-38.5315`
    );
    assert.equal(detailRes.status, 200);
    const detailData = (await detailRes.json()) as { item: EnrichedBenefitItem };
    assert.equal(detailData.item.id, 'ben-drogaria-oab');
    assert.ok(detailData.item.mapsUrl.includes('google.com/maps/dir/'));
    assert.ok(detailData.item.partner.phone.startsWith('+55'));
    assert.ok(detailData.item.partner.website.startsWith('https://'));
    assert.ok(detailData.item.rules.length > 20);
    console.log('✓ 4. GET /api/v1/benefits/:id (T03 com rota Maps, telefone, site e regras)');

    // 5. Fluxo autenticado: PUT /api/v1/me/clubs (RN-01 persistido) + POST favorite (RF-11)
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
        name: 'Usuária Teste Módulo 2',
        email: 'modulo2@uget.app',
        password: 'UgetModule2Password2026',
        acceptTerms: true,
        consentGps: true,
        consentPush: true
      })
    });
    assert.equal(regRes.status, 201);

    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: csrfHeaders,
      body: JSON.stringify({ email: 'modulo2@uget.app', password: 'UgetModule2Password2026' })
    });
    const { accessToken } = (await loginRes.json()) as { accessToken: string };
    const authHeaders = { ...csrfHeaders, Authorization: `Bearer ${accessToken}` };

    const putClubsRes = await fetch(`${baseUrl}/api/v1/me/clubs`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ clubIds: ['club-abm', 'club-croba'] })
    });
    assert.equal(putClubsRes.status, 200);
    const putClubsData = (await putClubsRes.json()) as { clubIds: string[] };
    assert.deepEqual(putClubsData.clubIds, ['club-abm', 'club-croba']);

    // Agora nearby autenticado sem ?clubIds= deve respeitar os clubes salvos (RN-01)
    const authNearbyRes = await fetch(
      `${baseUrl}/api/v1/benefits/nearby?lat=-13.0098&lon=-38.5315&radius=10000`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const authNearby = (await authNearbyRes.json()) as { items: EnrichedBenefitItem[] };
    assert.equal(authNearby.items.length, 2);
    assert.ok(authNearby.items.every((b) => b.club.id === 'club-abm' || b.club.id === 'club-croba'));

    // Toggle favorito (RF-11)
    const fav1 = await fetch(`${baseUrl}/api/v1/benefits/ben-lab-abm/favorite`, {
      method: 'POST',
      headers: authHeaders
    });
    assert.equal(fav1.status, 200);
    assert.equal(((await fav1.json()) as { isFavorite: boolean }).isFavorite, true);

    const fav2 = await fetch(`${baseUrl}/api/v1/benefits/ben-lab-abm/favorite`, {
      method: 'POST',
      headers: authHeaders
    });
    assert.equal(fav2.status, 200);
    assert.equal(((await fav2.json()) as { isFavorite: boolean }).isFavorite, false);
    console.log('✓ 5. PUT /api/v1/me/clubs (RN-01) + POST /favorite (RF-11) com JWT + CSRF');

    // 6. Serving do Frontend Web App (T01/T02/T03) + Design System ugetds sem duplicação
    const htmlRes = await fetch(`${baseUrl}/`);
    assert.equal(htmlRes.status, 200);
    const html = await htmlRes.text();
    assert.ok(html.includes('/ugetds/ugetds.css'));
    assert.ok(html.includes('/app.js'));
    assert.ok(htmlRes.headers.get('content-security-policy')?.includes("script-src 'self'"));

    const appJsRes = await fetch(`${baseUrl}/app.js`);
    assert.equal(appJsRes.status, 200);

    const dsCssRes = await fetch(`${baseUrl}/ugetds/ugetds.css`);
    assert.equal(dsCssRes.status, 200);
    const dsCss = await dsCssRes.text();
    assert.ok(dsCss.includes('--uget-purple'));
    console.log('✓ 6. Web App (/, /app.js) e Design System (/ugetds/ugetds.css) servidos com CSP estrito');

    console.log('\n🎉 TODOS OS 6 TESTES DO MÓDULO 2 PASSARAM COM SUCESSO!\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes do Módulo 2:', err);
  process.exit(1);
});
