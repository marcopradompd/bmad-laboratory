/**
 * uGet — Controlador do Frontend Web App (Módulos 2, 3 & 4)
 * Explorar/Clubes, Simulador Push HA, Carteirinha uGet Pass 3D Offline,
 * Slider de Raio, Central LGPD e Micro-pesquisa Pós-Visita.
 * 100% compatível com CSP estrita (script-src 'self', zero eval/inline handlers).
 */
(function () {
  'use strict';

  const OFFLINE_PASS_KEY = 'uget_offline_pass_v1';
  const LOCAL_SURVEYS_KEY = 'uget_local_surveys_v1';

  /* Fallback local caso o usuário abra index.html direto via file:/// sem o servidor Node */
  const FALLBACK_CLUBS = [
    { id: 'club-oab-ba', name: 'OAB-BA · CAAB', segment: 'Entidade de Classe' },
    { id: 'club-abm', name: 'ABM · Associação Médica', segment: 'Entidade de Classe' },
    { id: 'club-croba', name: 'CROBA · Odontologia', segment: 'Entidade de Classe' },
    { id: 'club-esquadrao', name: 'Sócio Esquadrão', segment: 'Clube Esportivo' },
    { id: 'club-atarde', name: 'Clube A Tarde+', segment: 'Rede de Comunicação' },
    { id: 'club-alpha', name: 'AlphaClub Benefícios', segment: 'Bem-Estar & Fitness' }
  ];

  const FALLBACK_BENEFITS = [
    {
      id: 'ben-drogaria-oab', title: 'Desconto em Medicamentos & Dermocosméticos', discountLabel: '25% OFF',
      rules: '25% OFF em genéricos e 15% OFF em dermocosméticos apresentando o uGet Pass.',
      validWindowLabel: 'Todos os dias · 07h às 22h', isValidNow: true, isVip: false,
      club: { id: 'club-oab-ba', name: 'OAB-BA · CAAB' },
      partner: { name: 'Drogaria Vida Barra', category: 'Saúde', phone: '+557133331010', website: 'https://drogariavida.exemplo.com.br', rating: 4.9 },
      unit: { address: 'Av. Oceânica, 420', neighborhood: 'Barra', city: 'Salvador', state: 'BA', lat: -13.0098, lon: -38.5315 }
    },
    {
      id: 'ben-cafe-oab', title: 'Almoço Executivo & Cafés Especiais', discountLabel: '20% OFF',
      rules: '20% OFF no almoço executivo e cafés especiais para o titular + 1 acompanhante.',
      validWindowLabel: 'Almoço · 11h às 15h', isValidNow: true, isVip: false,
      club: { id: 'club-oab-ba', name: 'OAB-BA · CAAB' },
      partner: { name: 'Café & Bistrô Origem', category: 'Gastronomia', phone: '+557133332020', website: 'https://cafeorigem.exemplo.com.br', rating: 4.8 },
      unit: { address: 'Av. Sete de Setembro, 3680', neighborhood: 'Barra', city: 'Salvador', state: 'BA', lat: -13.0052, lon: -38.5322 }
    },
    {
      id: 'ben-pulse-esquadrao', title: 'Plano Anual VIP + Isenção de Matrícula', discountLabel: '30% OFF',
      rules: 'Isenção total da matrícula + 30% OFF na mensalidade do plano completo.',
      validWindowLabel: 'Seg a Sáb · 06h às 22h', isValidNow: true, isVip: true,
      club: { id: 'club-esquadrao', name: 'Sócio Esquadrão' },
      partner: { name: 'Rede Academia Pulse', category: 'Bem-Estar', phone: '+557133333030', website: 'https://academiapulse.exemplo.com.br', rating: 4.9 },
      unit: { address: 'Av. Octávio Mangabeira, 1180', neighborhood: 'Pituba', city: 'Salvador', state: 'BA', lat: -13.0038, lon: -38.4585 }
    },
    {
      id: 'ben-lab-abm', title: 'Check-up Completo & Exames Particulares', discountLabel: '35% OFF',
      rules: 'Desconto especial sobre tabela particular para associados ABM e dependentes.',
      validWindowLabel: 'Seg a Sáb · 06h às 17h', isValidNow: true, isVip: true,
      club: { id: 'club-abm', name: 'ABM · Associação Médica' },
      partner: { name: 'Laboratório Diagnóstica', category: 'Saúde', phone: '+557133335050', website: 'https://labdiagnostica.exemplo.com.br', rating: 4.8 },
      unit: { address: 'Rua da Graça, 145', neighborhood: 'Graça', city: 'Salvador', state: 'BA', lat: -12.9985, lon: -38.5230 }
    }
  ];

  function calcHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  const state = {
    lat: -13.0082,
    lon: -38.5318,
    radius: 5000,
    category: 'Todos',
    query: '',
    clubs: [],
    selectedClubIds: new Set(['club-oab-ba', 'club-esquadrao', 'club-abm']),
    items: [],
    activeDetail: null,
    surveyRating: 5,
    consents: { gps: true, push: true, surveys: true }
  };

  const els = {
    locationPreset: document.getElementById('locationPreset'),
    radiusSelect: document.getElementById('radiusSelect'),
    useRealGpsBtn: document.getElementById('useRealGpsBtn'),
    simulatePushBtn: document.getElementById('simulatePushBtn'),
    searchInput: document.getElementById('searchInput'),
    nearbySummaryBadge: document.getElementById('nearbySummaryBadge'),
    radarPinsLayer: document.getElementById('radarPinsLayer'),
    clubsGrid: document.getElementById('clubsGrid'),
    activeClubsCount: document.getElementById('activeClubsCount'),
    categoryChips: document.getElementById('categoryChips'),
    benefitsGrid: document.getElementById('benefitsGrid'),
    detailModal: document.getElementById('detailModal'),
    closeDetailBtn: document.getElementById('closeDetailBtn'),
    detailClubBadge: document.getElementById('detailClubBadge'),
    detailDiscountBadge: document.getElementById('detailDiscountBadge'),
    detailDistanceBadge: document.getElementById('detailDistanceBadge'),
    detailPartnerName: document.getElementById('detailPartnerName'),
    detailBenefitTitle: document.getElementById('detailBenefitTitle'),
    detailRouteLink: document.getElementById('detailRouteLink'),
    detailPhoneLink: document.getElementById('detailPhoneLink'),
    detailSiteLink: document.getElementById('detailSiteLink'),
    detailRules: document.getElementById('detailRules'),
    detailAddress: document.getElementById('detailAddress'),
    detailWindow: document.getElementById('detailWindow'),
    redeemBenefitBtn: document.getElementById('redeemBenefitBtn'),
    // Módulo 4 — Pass 3D, Preferências, LGPD e Pesquisa
    passQrContainer: document.getElementById('passQrContainer'),
    passClubsPills: document.getElementById('passClubsPills'),
    passMemberCode: document.getElementById('passMemberCode'),
    passValidUntil: document.getElementById('passValidUntil'),
    refreshOfflinePassBtn: document.getElementById('refreshOfflinePassBtn'),
    openDemoSurveyBtn: document.getElementById('openDemoSurveyBtn'),
    totalSavedMetric: document.getElementById('totalSavedMetric'),
    totalSurveysMetric: document.getElementById('totalSurveysMetric'),
    radiusSlider: document.getElementById('radiusSlider'),
    radiusSliderValue: document.getElementById('radiusSliderValue'),
    dndStartInput: document.getElementById('dndStartInput'),
    dndEndInput: document.getElementById('dndEndInput'),
    savePrefsBtn: document.getElementById('savePrefsBtn'),
    consentGpsToggle: document.getElementById('consentGpsToggle'),
    consentPushToggle: document.getElementById('consentPushToggle'),
    consentSurveysToggle: document.getElementById('consentSurveysToggle'),
    exportLgpdBtn: document.getElementById('exportLgpdBtn'),
    anonymizeLgpdBtn: document.getElementById('anonymizeLgpdBtn'),
    surveyModal: document.getElementById('surveyModal'),
    closeSurveyBtn: document.getElementById('closeSurveyBtn'),
    surveyForm: document.getElementById('surveyForm'),
    surveyTitle: document.getElementById('surveyTitle'),
    surveyStarRow: document.getElementById('surveyStarRow'),
    surveyHonoredInput: document.getElementById('surveyHonoredInput'),
    surveySavedInput: document.getElementById('surveySavedInput'),
    surveyCommentInput: document.getElementById('surveyCommentInput')
  };

  function formatRadiusLabel(meters) {
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
  }

  function renderQrSvg(seedText, size) {
    const n = size || 21;
    let hash = 2166136261;
    for (let i = 0; i < seedText.length; i++) {
      hash ^= seedText.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const cells = [];
    const isFinder = (r, c) =>
      (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        let on = false;
        if (isFinder(r, c)) {
          const lr = r < 7 ? r : r - (n - 7);
          const lc = c < 7 ? c : c - (n - 7);
          on = lr === 0 || lr === 6 || lc === 0 || lc === 6 || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
        } else {
          const v = Math.imul(hash ^ (r * 31 + c * 17), 2654435761) >>> 0;
          on = (v & 1) === 1;
        }
        if (on) {
          cells.push(`<rect x="${c}" y="${r}" width="1" height="1" fill="#03223A"/>`);
        }
      }
    }
    return `<svg width="92" height="92" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label="QR Code uGet Pass">${cells.join('')}</svg>`;
  }

  function syncOfflinePassCard() {
    const activeClubs = state.clubs.filter((c) => state.selectedClubIds.has(c.id));
    const memberCode = `UG-${Array.from(state.selectedClubIds).join('').slice(0, 6).toUpperCase() || 'DEMO'}26`;
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toLocaleString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
    const passSnapshot = {
      memberCode,
      clubs: activeClubs.map((c) => c.name),
      syncedAt: new Date().toISOString(),
      expiresAt
    };

    try {
      localStorage.setItem(OFFLINE_PASS_KEY, JSON.stringify(passSnapshot));
    } catch {
      // ignore storage quota errors
    }

    if (els.passMemberCode) els.passMemberCode.textContent = memberCode;
    if (els.passValidUntil) els.passValidUntil.textContent = `Offline válido até ${expiresAt}`;
    if (els.passQrContainer) {
      els.passQrContainer.innerHTML = renderQrSvg(`${memberCode}:${passSnapshot.clubs.join('|')}`, 21);
    }
    if (els.passClubsPills) {
      els.passClubsPills.innerHTML = activeClubs
        .map((c) => `<span class="uget-badge" style="background:rgba(255,255,255,0.14); color:#fff; font-size:0.7rem;">${c.name}</span>`)
        .join('');
    }
  }

  function loadSurveyMetrics() {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(LOCAL_SURVEYS_KEY) || '[]');
    } catch {
      list = [];
    }
    const totalSaved = list.reduce((acc, s) => acc + Number(s.saved || 0), 0);
    if (els.totalSavedMetric) els.totalSavedMetric.textContent = `R$ ${totalSaved.toFixed(2).replace('.', ',')}`;
    if (els.totalSurveysMetric) els.totalSurveysMetric.textContent = String(list.length);
  }

  async function fetchClubs() {
    try {
      const res = await fetch('/api/v1/clubs');
      if (!res.ok) throw new Error('offline');
      const data = await res.json();
      state.clubs = data.clubs || [];
    } catch {
      state.clubs = FALLBACK_CLUBS;
    }
    renderClubs();
    syncOfflinePassCard();
  }

  function renderClubs() {
    if (!els.clubsGrid) return;
    els.activeClubsCount.textContent = `${state.selectedClubIds.size} clube(s) ativo(s)`;
    els.clubsGrid.innerHTML = '';

    state.clubs.forEach((club) => {
      const selected = state.selectedClubIds.has(club.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `club-toggle-card${selected ? ' is-selected' : ''}`;
      btn.innerHTML = `
        <div>
          <strong style="display:block; font-size:0.9rem; color:var(--uget-ink-primary);">${club.name}</strong>
          <span style="font-size:0.75rem; color:var(--uget-ink-muted);">${club.segment}</span>
        </div>
        <span class="uget-badge ${selected ? 'uget-badge-purple' : ''}">${selected ? 'Ativo' : 'Ativar'}</span>
      `;
      btn.addEventListener('click', () => {
        if (state.selectedClubIds.has(club.id)) {
          state.selectedClubIds.delete(club.id);
        } else {
          state.selectedClubIds.add(club.id);
        }
        renderClubs();
        syncOfflinePassCard();
        fetchNearbyBenefits();
      });
      els.clubsGrid.appendChild(btn);
    });
  }

  async function fetchNearbyBenefits() {
    if (state.selectedClubIds.size === 0) {
      state.items = [];
      renderBenefits();
      renderRadarPins();
      return;
    }

    const params = new URLSearchParams({
      lat: String(state.lat),
      lon: String(state.lon),
      radius: String(state.radius),
      clubIds: Array.from(state.selectedClubIds).join(',')
    });
    if (state.category && state.category !== 'Todos') params.set('category', state.category);
    if (state.query) params.set('q', state.query);

    try {
      const res = await fetch(`/api/v1/benefits/nearby?${params.toString()}`);
      if (!res.ok) throw new Error('offline');
      const data = await res.json();
      state.items = data.items || [];
    } catch {
      const q = state.query.toLowerCase();
      state.items = FALLBACK_BENEFITS
        .map((b) => {
          const dist = calcHaversine(state.lat, state.lon, b.unit.lat, b.unit.lon);
          return {
            ...b,
            distanceMeters: dist,
            distanceLabel: dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${dist} m`,
            mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${b.unit.lat},${b.unit.lon}`
          };
        })
        .filter((b) => state.selectedClubIds.has(b.club.id))
        .filter((b) => b.distanceMeters <= state.radius)
        .filter((b) => state.category === 'Todos' || b.partner.category === state.category)
        .filter((b) => !q || b.partner.name.toLowerCase().includes(q) || b.title.toLowerCase().includes(q))
        .sort((a, b) => a.distanceMeters - b.distanceMeters);
    }
    renderBenefits();
    renderRadarPins();
  }

  function renderRadarPins() {
    if (!els.radarPinsLayer) return;
    els.radarPinsLayer.innerHTML = '';
    const positions = [
      { top: '24px', left: '20px' },
      { bottom: '28px', left: '18px' },
      { top: '42px', right: '18px' }
    ];

    state.items.slice(0, 3).forEach((item, idx) => {
      const pos = positions[idx];
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'uget-radar-pin';
      Object.assign(pin.style, pos);
      pin.innerHTML = `<span style="width:8px; height:8px; border-radius:50%; background:${item.isVip ? '#10B981' : '#9B246D'};"></span><span>${item.partner.name.split(' ')[0]} · ${item.discountLabel}</span>`;
      pin.addEventListener('click', () => openBenefitDetail(item.id));
      els.radarPinsLayer.appendChild(pin);
    });
  }

  function renderBenefits() {
    if (!els.benefitsGrid) return;
    els.nearbySummaryBadge.textContent = `${state.items.length} benefício(s) no raio de ${formatRadiusLabel(state.radius)}`;

    if (state.items.length === 0) {
      els.benefitsGrid.innerHTML = `
        <div class="uget-card" style="grid-column:1 / -1; text-align:center; padding:42px 24px;">
          <h3 class="uget-h4" style="margin-bottom:8px;">Nenhum benefício encontrado neste filtro</h3>
          <p class="uget-text">Ative mais clubes acima ou amplie o raio de alcance para descobrir convênios próximos.</p>
        </div>
      `;
      return;
    }

    els.benefitsGrid.innerHTML = '';
    state.items.forEach((item) => {
      const card = document.createElement('article');
      card.className = item.isVip
        ? 'uget-card uget-card-navy uget-flashlight is-dark'
        : 'uget-card uget-flashlight';
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:16px;">
          <span class="uget-badge ${item.isVip ? '' : 'uget-badge-purple'}" style="${item.isVip ? 'background:rgba(255,255,255,0.14); color:#fff;' : ''}">${item.club.name}</span>
          <span class="uget-badge uget-badge-berry uget-mono">${item.discountLabel}</span>
        </div>
        <h3 class="uget-h4" style="${item.isVip ? 'color:#fff;' : ''} margin-bottom:6px;">${item.partner.name}</h3>
        <p class="uget-text" style="${item.isVip ? 'color:#CBD5E1;' : ''} font-size:0.85rem; margin-bottom:18px;">${item.title}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:12px; border-top:1px solid ${item.isVip ? 'rgba(255,255,255,0.12)' : 'var(--uget-border-subtle)'};">
          <span class="uget-mono" style="font-size:0.75rem; color:${item.isVip ? '#D8B4FE' : 'var(--uget-purple)'};">${item.distanceLabel} · ${item.unit.neighborhood}</span>
          <span class="uget-badge ${item.isValidNow ? 'uget-badge-success' : ''}" style="font-size:0.68rem;">${item.isValidNow ? 'Ativo agora' : item.validWindowLabel}</span>
        </div>
      `;
      card.addEventListener('click', () => openBenefitDetail(item.id));
      els.benefitsGrid.appendChild(card);
    });

    if (window.UgetDS) window.UgetDS.initFlashlight();
  }

  async function openBenefitDetail(benefitId) {
    let item = null;
    try {
      const res = await fetch(`/api/v1/benefits/${encodeURIComponent(benefitId)}?lat=${state.lat}&lon=${state.lon}`);
      if (res.ok) {
        const data = await res.json();
        item = data.item;
      }
    } catch {
      item = state.items.find((i) => i.id === benefitId) || null;
    }
    if (!item) return;
    state.activeDetail = item;

    els.detailClubBadge.textContent = item.club.name;
    els.detailDiscountBadge.textContent = item.discountLabel;
    els.detailDistanceBadge.textContent = `${item.distanceLabel} · ★ ${item.partner.rating}`;
    els.detailPartnerName.textContent = item.partner.name;
    els.detailBenefitTitle.textContent = item.title;
    els.detailRouteLink.href = item.mapsUrl;
    els.detailPhoneLink.href = `tel:${item.partner.phone}`;
    els.detailSiteLink.href = item.partner.website;
    els.detailRules.textContent = item.rules;
    els.detailAddress.textContent = `${item.unit.address} · ${item.unit.neighborhood}, ${item.unit.city}/${item.unit.state}`;
    els.detailWindow.textContent = item.validWindowLabel;

    els.detailModal.classList.add('is-open');
    if (window.UgetDS) window.UgetDS.renderIcons(els.detailModal);
  }

  function closeDetail() {
    els.detailModal.classList.remove('is-open');
  }

  function openSurveyModal(partnerName) {
    if (!state.consents.surveys) {
      if (window.UgetDS) {
        window.UgetDS.geoNotify({
          title: 'Pesquisa desativada (LGPD)',
          message: 'Ative "Micro-pesquisa Pós-Visita" na Central LGPD para avaliar estabelecimentos.',
          badge: 'LGPD',
          discount: 'PRIVACIDADE'
        });
      }
      return;
    }
    if (els.surveyTitle) {
      els.surveyTitle.textContent = partnerName ? `Como foi em ${partnerName}?` : 'Como foi seu atendimento?';
    }
    els.surveyModal.classList.add('is-open');
  }

  function closeSurveyModal() {
    els.surveyModal.classList.remove('is-open');
  }

  function switchTab(viewId) {
    document.querySelectorAll('[data-view-tab]').forEach((b) => {
      b.classList.toggle('is-active', b.getAttribute('data-view-tab') === viewId);
    });
    document.querySelectorAll('.app-view').forEach((v) => {
      v.classList.toggle('is-active', v.id === viewId);
    });
    if (window.UgetDS) {
      window.UgetDS.renderIcons();
      window.UgetDS.initFlashlight();
      if (viewId === 'viewPass' && window.UgetDS.initTiltCards) {
        window.UgetDS.initTiltCards();
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadSurveyMetrics();
    fetchClubs().then(async () => {
      await fetchNearbyBenefits();
      const deepBenefitId = new URLSearchParams(window.location.search).get('benefit');
      if (deepBenefitId) openBenefitDetail(deepBenefitId);
    });

    // Navegação por abas
    document.querySelectorAll('[data-view-tab]').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.getAttribute('data-view-tab')));
    });

    if (els.simulatePushBtn) {
      els.simulatePushBtn.addEventListener('click', () => {
        if (!state.consents.gps || !state.consents.push) {
          if (window.UgetDS) {
            window.UgetDS.geoNotify({
              title: 'Alertas pausados pela LGPD',
              message: 'Reative GPS e Push na aba "Raio & Central LGPD" para receber alertas.',
              badge: 'LGPD',
              discount: 'BLOQUEADO'
            });
          }
          return;
        }
        const nearest = state.items[0];
        if (!nearest) {
          if (window.UgetDS) {
            window.UgetDS.geoNotify({
              title: 'Nenhum convênio no raio atual',
              message: 'Ative seus clubes ou aumente o raio para simular um alerta de proximidade.',
              badge: 'Geofencing',
              discount: 'RADAR'
            });
          }
          return;
        }
        if (window.UgetDS) {
          window.UgetDS.geoNotify({
            title: `${nearest.discountLabel} em ${nearest.partner.name}`,
            message: `Você está a ${nearest.distanceLabel} (${nearest.unit.neighborhood}). Convênio ${nearest.club.name} ativo agora!`,
            badge: `Push HA · ${nearest.distanceLabel}`,
            discount: nearest.discountLabel
          });
        }
        openBenefitDetail(nearest.id);
      });
    }

    els.locationPreset.addEventListener('change', () => {
      const [lat, lon] = els.locationPreset.value.split(',').map(Number);
      state.lat = lat;
      state.lon = lon;
      fetchNearbyBenefits();
    });

    els.radiusSelect.addEventListener('change', () => {
      state.radius = Number(els.radiusSelect.value);
      if (els.radiusSlider) els.radiusSlider.value = String(Math.min(10000, state.radius));
      if (els.radiusSliderValue) els.radiusSliderValue.textContent = formatRadiusLabel(state.radius);
      fetchNearbyBenefits();
    });

    if (els.radiusSlider) {
      els.radiusSlider.addEventListener('input', () => {
        state.radius = Number(els.radiusSlider.value);
        els.radiusSliderValue.textContent = formatRadiusLabel(state.radius);
        fetchNearbyBenefits();
      });
    }

    if (els.savePrefsBtn) {
      els.savePrefsBtn.addEventListener('click', () => {
        if (window.UgetDS) {
          window.UgetDS.geoNotify({
            title: 'Preferências salvas!',
            message: `Raio de ${formatRadiusLabel(state.radius)} e Não Perturbe (${els.dndStartInput.value}h às ${els.dndEndInput.value}h) atualizados.`,
            badge: 'Geofencing',
            discount: 'SALVO'
          });
        }
      });
    }

    [
      [els.consentGpsToggle, 'gps'],
      [els.consentPushToggle, 'push'],
      [els.consentSurveysToggle, 'surveys']
    ].forEach(([el, key]) => {
      if (!el) return;
      el.addEventListener('change', () => {
        state.consents[key] = el.checked;
      });
    });

    if (els.exportLgpdBtn) {
      els.exportLgpdBtn.addEventListener('click', () => {
        const payload = {
          exportedAt: new Date().toISOString(),
          activeClubs: Array.from(state.selectedClubIds),
          preferences: { radiusMeters: state.radius, dndStart: els.dndStartInput.value, dndEnd: els.dndEndInput.value },
          consents: state.consents
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'uget-meus-dados-lgpd.json';
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (els.anonymizeLgpdBtn) {
      els.anonymizeLgpdBtn.addEventListener('click', () => {
        localStorage.removeItem(OFFLINE_PASS_KEY);
        localStorage.removeItem(LOCAL_SURVEYS_KEY);
        loadSurveyMetrics();
        if (window.UgetDS) {
          window.UgetDS.geoNotify({
            title: 'Cache local & dados limpos',
            message: 'Em contas autenticadas, a API /api/v1/lgpd/anonymize revoga sessões e anonimiza PII irreversivelmente.',
            badge: 'LGPD Art. 18',
            discount: 'ANONIMIZADO'
          });
        }
      });
    }

    if (els.refreshOfflinePassBtn) {
      els.refreshOfflinePassBtn.addEventListener('click', () => {
        syncOfflinePassCard();
        if (window.UgetDS) {
          window.UgetDS.geoNotify({
            title: 'uGet Pass sincronizado!',
            message: 'QR Code assinado salvo localmente para uso sem internet por 24h.',
            badge: 'Offline Ready',
            discount: 'OK'
          });
        }
      });
    }

    if (els.openDemoSurveyBtn) {
      els.openDemoSurveyBtn.addEventListener('click', () => {
        openSurveyModal(state.items[0]?.partner.name || 'Parceiro uGet');
      });
    }

    els.useRealGpsBtn.addEventListener('click', () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          state.lat = pos.coords.latitude;
          state.lon = pos.coords.longitude;
          fetchNearbyBenefits();
        },
        () => {
          if (window.UgetDS) {
            window.UgetDS.geoNotify({
              title: 'GPS não autorizado',
              message: 'Use o seletor de bairros no topo para explorar benefícios.',
              badge: 'Aviso',
              discount: 'MANUAL'
            });
          }
        }
      );
    });

    let searchTimer = null;
    els.searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.query = els.searchInput.value.trim();
        fetchNearbyBenefits();
      }, 220);
    });

    els.categoryChips.querySelectorAll('[data-cat]').forEach((chip) => {
      chip.addEventListener('click', () => {
        els.categoryChips.querySelectorAll('[data-cat]').forEach((c) => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        state.category = chip.getAttribute('data-cat') || 'Todos';
        fetchNearbyBenefits();
      });
    });

    els.closeDetailBtn.addEventListener('click', closeDetail);
    els.detailModal.addEventListener('click', (e) => {
      if (e.target === els.detailModal) closeDetail();
    });

    els.redeemBenefitBtn.addEventListener('click', () => {
      if (!state.activeDetail) return;
      const partnerName = state.activeDetail.partner.name;
      if (window.UgetDS) {
        window.UgetDS.geoNotify({
          title: `uGet Pass pronto: ${partnerName}`,
          message: `Apresente seu convênio ${state.activeDetail.club.name} no caixa para validar ${state.activeDetail.discountLabel}.`,
          badge: state.activeDetail.distanceLabel,
          discount: state.activeDetail.discountLabel
        });
      }
      closeDetail();
      switchTab('viewPass');
      setTimeout(() => openSurveyModal(partnerName), 450);
    });

    // Estrelas e envio da Micro-pesquisa Pós-Visita
    if (els.surveyStarRow) {
      els.surveyStarRow.querySelectorAll('[data-star]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.surveyRating = Number(btn.getAttribute('data-star'));
          els.surveyStarRow.querySelectorAll('[data-star]').forEach((b) => {
            b.classList.toggle('is-active', Number(b.getAttribute('data-star')) <= state.surveyRating);
          });
        });
      });
    }

    if (els.closeSurveyBtn) els.closeSurveyBtn.addEventListener('click', closeSurveyModal);
    if (els.surveyModal) {
      els.surveyModal.addEventListener('click', (e) => {
        if (e.target === els.surveyModal) closeSurveyModal();
      });
    }

    if (els.surveyForm) {
      els.surveyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const saved = Math.max(0, Number(els.surveySavedInput.value || 0));
        let list = [];
        try {
          list = JSON.parse(localStorage.getItem(LOCAL_SURVEYS_KEY) || '[]');
        } catch {
          list = [];
        }
        list.push({
          rating: state.surveyRating,
          honored: els.surveyHonoredInput.checked,
          saved,
          comment: els.surveyCommentInput.value.trim(),
          at: new Date().toISOString()
        });
        localStorage.setItem(LOCAL_SURVEYS_KEY, JSON.stringify(list));
        loadSurveyMetrics();
        closeSurveyModal();
        if (window.UgetDS) {
          window.UgetDS.geoNotify({
            title: 'Obrigado pela avaliação!',
            message: `Economia de R$ ${saved.toFixed(2).replace('.', ',')} registrada no seu histórico uGet.`,
            badge: `★ ${state.surveyRating}/5`,
            discount: 'AVALIADO'
          });
        }
      });
    }
  });
})();
