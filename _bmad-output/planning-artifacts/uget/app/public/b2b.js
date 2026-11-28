/**
 * uGet — Controlador do Portal Web B2B Multi-Tenant (Módulo 5)
 * Funciona com a API real (http://localhost:4000/b2b) e também em modo demo offline (file:///).
 * 100% compatível com CSP estrita (script-src 'self', zero inline handlers).
 */
(function () {
  'use strict';

  const DEMO_CLUBS = [
    { id: 'club-oab-ba', name: 'OAB-BA · CAAB' },
    { id: 'club-abm', name: 'ABM · Associação Médica' },
    { id: 'club-esquadrao', name: 'Sócio Esquadrão' }
  ];

  const DEMO_PARTNERS = [
    { id: 'ptr-drogaria-vida', name: 'Drogaria Vida Barra' },
    { id: 'ptr-cafe-origem', name: 'Café & Bistrô Origem' },
    { id: 'ptr-livraria-atlantico', name: 'Livraria Atlântico' }
  ];

  const DEMO_BENEFITS = [
    {
      id: 'ben-drogaria-oab',
      clubId: 'club-oab-ba',
      clubName: 'OAB-BA · CAAB',
      partnerId: 'ptr-drogaria-vida',
      partnerName: 'Drogaria Vida Barra',
      title: 'Desconto em Medicamentos & Dermocosméticos',
      discountLabel: '25% OFF',
      isActive: true
    },
    {
      id: 'ben-cafe-oab',
      clubId: 'club-oab-ba',
      clubName: 'OAB-BA · CAAB',
      partnerId: 'ptr-cafe-origem',
      partnerName: 'Café & Bistrô Origem',
      title: 'Almoço Executivo & Cafés Especiais',
      discountLabel: '20% OFF',
      isActive: true
    },
    {
      id: 'ben-livraria-oab',
      clubId: 'club-oab-ba',
      clubName: 'OAB-BA · CAAB',
      partnerId: 'ptr-livraria-atlantico',
      partnerName: 'Livraria Atlântico',
      title: 'Obras Jurídicas, Técnicas & Literatura',
      discountLabel: '18% OFF',
      isActive: true
    }
  ];

  const state = {
    accessToken: null,
    csrfToken: null,
    dashboard: null,
    offlineMode: false,
    offlineRole: 'CLUB_MANAGER',
    offlineTenantId: 'club-oab-ba',
    offlineValidated: 14,
    offlineBenefits: DEMO_BENEFITS.map((b) => ({ ...b }))
  };

  const els = {
    authView: document.getElementById('b2bAuthView'),
    dashView: document.getElementById('b2bDashView'),
    scopeBadge: document.getElementById('b2bScopeBadge'),
    scopeSubtitle: document.getElementById('b2bScopeSubtitle'),
    logoutBtn: document.getElementById('b2bLogoutBtn'),
    loginForm: document.getElementById('b2bLoginForm'),
    emailInput: document.getElementById('b2bEmail'),
    passwordInput: document.getElementById('b2bPassword'),
    fillClubDemoBtn: document.getElementById('fillClubDemoBtn'),
    fillPartnerDemoBtn: document.getElementById('fillPartnerDemoBtn'),
    refreshBtn: document.getElementById('b2bRefreshBtn'),
    kpiActiveBenefits: document.getElementById('kpiActiveBenefits'),
    kpiValidated: document.getElementById('kpiValidated'),
    kpiRating: document.getElementById('kpiRating'),
    kpiSavings: document.getElementById('kpiSavings'),
    validateForm: document.getElementById('b2bValidateForm'),
    signedCodeInput: document.getElementById('signedCodeInput'),
    validateResultBox: document.getElementById('validateResultBox'),
    createBenefitForm: document.getElementById('b2bCreateBenefitForm'),
    newClubSelect: document.getElementById('newClubSelect'),
    newPartnerSelect: document.getElementById('newPartnerSelect'),
    newTitleInput: document.getElementById('newTitleInput'),
    newDiscountInput: document.getElementById('newDiscountInput'),
    newRulesInput: document.getElementById('newRulesInput'),
    benefitsTableCount: document.getElementById('benefitsTableCount'),
    benefitsBody: document.getElementById('b2bBenefitsBody')
  };

  async function ensureCsrf() {
    if (state.csrfToken) return state.csrfToken;
    const res = await fetch('/api/v1/security/csrf');
    if (!res.ok) throw new Error('API_OFFLINE');
    const data = await res.json();
    state.csrfToken = data.csrfToken;
    return state.csrfToken;
  }

  function authHeaders(withCsrf) {
    const h = { 'Content-Type': 'application/json' };
    if (state.accessToken) h.Authorization = `Bearer ${state.accessToken}`;
    if (withCsrf && state.csrfToken) h['X-CSRF-Token'] = state.csrfToken;
    return h;
  }

  function buildOfflineDashboard() {
    const scoped = state.offlineBenefits.filter((b) =>
      state.offlineRole === 'CLUB_MANAGER'
        ? b.clubId === state.offlineTenantId
        : b.partnerId === state.offlineTenantId
    );
    return {
      scope: {
        role: state.offlineRole,
        tenantId: state.offlineTenantId,
        aggregatedOnly: true
      },
      kpis: {
        totalBenefits: scoped.length,
        activeBenefits: scoped.filter((b) => b.isActive).length,
        totalRedemptionsIssued: state.offlineValidated + 4,
        totalRedemptionsValidated: state.offlineValidated,
        surveyResponses: 12,
        averageRating: 4.9,
        honoredRatePct: 100,
        totalEstimatedSavingsBrl: state.offlineValidated * 42.5
      },
      benefits: scoped,
      clubs: DEMO_CLUBS,
      partners: DEMO_PARTNERS
    };
  }

  function renderDashboardData(data) {
    state.dashboard = data;

    els.authView.classList.add('b2b-hidden');
    els.dashView.classList.remove('b2b-hidden');
    els.scopeBadge.classList.remove('b2b-hidden');
    els.logoutBtn.classList.remove('b2b-hidden');

    els.scopeBadge.textContent = `${data.scope.role} · ${data.scope.tenantId}${state.offlineMode ? ' (DEMO)' : ''}`;
    els.scopeSubtitle.textContent = `Escopo isolado: ${data.scope.tenantId} (${data.scope.role}). Nenhum dado pessoal de associado é exposto.${state.offlineMode ? ' · Modo demonstração local (rode npm run dev para API ao vivo).' : ''}`;

    els.kpiActiveBenefits.textContent = `${data.kpis.activeBenefits}/${data.kpis.totalBenefits}`;
    els.kpiValidated.textContent = String(data.kpis.totalRedemptionsValidated);
    els.kpiRating.textContent =
      data.kpis.surveyResponses > 0
        ? `★ ${data.kpis.averageRating} (${data.kpis.honoredRatePct}%)`
        : '100%';
    els.kpiSavings.textContent = `R$ ${Number(data.kpis.totalEstimatedSavingsBrl).toFixed(2).replace('.', ',')}`;

    els.newClubSelect.innerHTML = data.clubs
      .filter((c) => data.scope.role !== 'CLUB_MANAGER' || c.id === data.scope.tenantId)
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join('');

    els.newPartnerSelect.innerHTML = data.partners
      .filter((p) => data.scope.role !== 'PARTNER_MANAGER' || p.id === data.scope.tenantId)
      .map((p) => `<option value="${p.id}">${p.name}</option>`)
      .join('');

    renderBenefitsTable(data.benefits);
    if (window.UgetDS) {
      window.UgetDS.renderIcons();
      window.UgetDS.initFlashlight();
    }
  }

  async function loadDashboard() {
    if (state.offlineMode) {
      renderDashboardData(buildOfflineDashboard());
      return;
    }

    const res = await fetch('/api/v1/b2b/dashboard', { headers: authHeaders(false) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (window.UgetDS) {
        window.UgetDS.geoNotify({
          title: 'Acesso negado (RBAC)',
          message: err.error || 'Sua conta não possui permissão de gestor B2B.',
          badge: 'RBAC',
          discount: '403'
        });
      }
      return;
    }
    renderDashboardData(await res.json());
  }

  function renderBenefitsTable(benefits) {
    els.benefitsTableCount.textContent = `${benefits.length} convênio(s)`;
    els.benefitsBody.innerHTML = '';

    benefits.forEach((b) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong style="display:block;">${b.partnerName}</strong>
          <span style="font-size:0.78rem; color:var(--uget-ink-muted);">${b.title}</span>
        </td>
        <td><span class="uget-badge uget-badge-purple">${b.clubName}</span></td>
        <td><span class="uget-badge uget-badge-berry uget-mono">${b.discountLabel}</span></td>
        <td><span class="uget-badge ${b.isActive ? 'uget-badge-success' : ''}">${b.isActive ? 'Ativo' : 'Pausado'}</span></td>
        <td></td>
      `;
      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = 'uget-btn uget-btn-outline uget-btn-sm';
      actionBtn.textContent = b.isActive ? 'Pausar' : 'Reativar';
      actionBtn.addEventListener('click', async () => {
        if (state.offlineMode) {
          const item = state.offlineBenefits.find((x) => x.id === b.id);
          if (item) item.isActive = !item.isActive;
          loadDashboard();
          return;
        }
        await ensureCsrf();
        const res = await fetch(`/api/v1/b2b/benefits/${encodeURIComponent(b.id)}/status`, {
          method: 'PATCH',
          headers: authHeaders(true),
          body: JSON.stringify({ isActive: !b.isActive })
        });
        if (res.ok) loadDashboard();
      });
      tr.lastElementChild.appendChild(actionBtn);
      els.benefitsBody.appendChild(tr);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    els.fillClubDemoBtn.addEventListener('click', () => {
      els.emailInput.value = 'gestor@oab-ba.uget.app';
      els.passwordInput.value = 'UgetOabDemoPassword2026';
    });

    els.fillPartnerDemoBtn.addEventListener('click', () => {
      els.emailInput.value = 'parceiro@drogaria.uget.app';
      els.passwordInput.value = 'UgetPartnerDemoPassword2026';
    });

    els.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = els.emailInput.value.trim().toLowerCase();
      try {
        await ensureCsrf();
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: authHeaders(true),
          body: JSON.stringify({ email, password: els.passwordInput.value })
        });
        if (!res.ok) {
          if (window.UgetDS) {
            window.UgetDS.geoNotify({
              title: 'Falha no login',
              message: 'Verifique e-mail e senha corporativos.',
              badge: 'Auth',
              discount: 'ERRO'
            });
          }
          return;
        }
        const data = await res.json();
        state.offlineMode = false;
        state.accessToken = data.accessToken;
        await loadDashboard();
      } catch {
        // Fallback automático quando aberto via file:/// sem servidor Node rodando
        state.offlineMode = true;
        if (email.includes('parceiro') || email.includes('drogaria')) {
          state.offlineRole = 'PARTNER_MANAGER';
          state.offlineTenantId = 'ptr-drogaria-vida';
        } else {
          state.offlineRole = 'CLUB_MANAGER';
          state.offlineTenantId = 'club-oab-ba';
        }
        await loadDashboard();
        if (window.UgetDS) {
          window.UgetDS.geoNotify({
            title: 'Portal B2B aberto (Modo Demo)',
            message: 'Servidor local não detectado — exibindo painel interativo multi-tenant em modo demo.',
            badge: state.offlineTenantId,
            discount: 'DEMO'
          });
        }
      }
    });

    els.logoutBtn.addEventListener('click', () => {
      state.accessToken = null;
      state.dashboard = null;
      state.offlineMode = false;
      els.dashView.classList.add('b2b-hidden');
      els.scopeBadge.classList.add('b2b-hidden');
      els.logoutBtn.classList.add('b2b-hidden');
      els.authView.classList.remove('b2b-hidden');
    });

    els.refreshBtn.addEventListener('click', loadDashboard);

    els.validateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = els.signedCodeInput.value.trim();
      if (state.offlineMode) {
        const isOk = code.startsWith('UGET.') || code.startsWith('UG-');
        if (isOk) {
          state.offlineValidated += 1;
          els.validateResultBox.innerHTML = `
            <div class="uget-alert uget-alert-success">
              <div>
                <strong style="display:block;">uGet Pass Validado com Sucesso! (Demo)</strong>
                <span style="font-size:0.82rem;">Convênio verificado · Desconto autorizado no caixa</span>
              </div>
            </div>
          `;
          els.signedCodeInput.value = '';
          loadDashboard();
        } else {
          els.validateResultBox.innerHTML = `
            <div class="uget-alert uget-alert-error">
              <div>
                <strong style="display:block;">Formato Inválido</strong>
                <span style="font-size:0.82rem;">Use um código iniciado por UGET. ou UG- para testar a validação.</span>
              </div>
            </div>
          `;
        }
        return;
      }

      await ensureCsrf();
      const res = await fetch('/api/v1/b2b/checkout/validate', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ signedCode: code })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        els.validateResultBox.innerHTML = `
          <div class="uget-alert uget-alert-success">
            <div>
              <strong style="display:block;">uGet Pass Validado com Sucesso!</strong>
              <span style="font-size:0.82rem;">${data.partnerName || 'Convênio verificado'} · ${data.discountLabel || 'Desconto autorizado'}</span>
            </div>
          </div>
        `;
        els.signedCodeInput.value = '';
        loadDashboard();
      } else {
        els.validateResultBox.innerHTML = `
          <div class="uget-alert uget-alert-error">
            <div>
              <strong style="display:block;">Código Inválido ou Fora do Escopo</strong>
              <span style="font-size:0.82rem;">${data.error || data.reason || 'Não foi possível validar o código.'}</span>
            </div>
          </div>
        `;
      }
    });

    els.createBenefitForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (state.offlineMode) {
        const clubObj = DEMO_CLUBS.find((c) => c.id === els.newClubSelect.value) || DEMO_CLUBS[0];
        const partnerObj = DEMO_PARTNERS.find((p) => p.id === els.newPartnerSelect.value) || DEMO_PARTNERS[0];
        state.offlineBenefits.unshift({
          id: `ben-demo-${Date.now()}`,
          clubId: clubObj.id,
          clubName: clubObj.name,
          partnerId: partnerObj.id,
          partnerName: partnerObj.name,
          title: els.newTitleInput.value.trim(),
          discountLabel: els.newDiscountInput.value.trim(),
          isActive: true
        });
        els.newTitleInput.value = '';
        els.newDiscountInput.value = '';
        els.newRulesInput.value = '';
        if (window.UgetDS) {
          window.UgetDS.geoNotify({
            title: 'Convênio publicado (Demo)!',
            message: 'Novo benefício adicionado ao escopo do seu tenant.',
            badge: 'Portal B2B',
            discount: 'ATIVO'
          });
        }
        loadDashboard();
        return;
      }

      await ensureCsrf();
      const res = await fetch('/api/v1/b2b/benefits', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({
          clubId: els.newClubSelect.value,
          partnerId: els.newPartnerSelect.value,
          title: els.newTitleInput.value.trim(),
          discountLabel: els.newDiscountInput.value.trim(),
          rules: els.newRulesInput.value.trim()
        })
      });
      if (res.ok) {
        els.newTitleInput.value = '';
        els.newDiscountInput.value = '';
        els.newRulesInput.value = '';
        if (window.UgetDS) {
          window.UgetDS.geoNotify({
            title: 'Convênio publicado!',
            message: 'O novo benefício já está disponível no radar geoespacial dos associados.',
            badge: 'Portal B2B',
            discount: 'ATIVO'
          });
        }
        loadDashboard();
      }
    });
  });
})();
