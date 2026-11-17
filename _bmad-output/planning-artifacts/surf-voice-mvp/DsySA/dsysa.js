/**
 * DsySA — Design System SurfAgent v1.3
 * Motor JS completo: Matriz de Ondas/Período + Gráfico de Vento de Superfície Médio
 * Com Scroll Horizontal Infinito (Toque Mobile + Mouse Drag + Wheel)
 */

(function () {
  /* 1. IntersectionObserver para animações de entrada (.animate-on-scroll) */
  const once = true;
  if (!window.__inViewIO) {
    window.__inViewIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate");
            if (once) window.__inViewIO.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
  }

  window.initDsySAAnimations = function (selector = ".animate-on-scroll") {
    document.querySelectorAll(selector).forEach((el) => {
      window.__inViewIO.observe(el);
    });
  };

  /* 2. Inicializador do WebGL Aura Background (UnicornStudio) */
  window.initDsySAAuraBackground = function () {
    function initUnicornStudio() {
      if (window.UnicornStudio && !window.UnicornStudio.isInitialized) {
        window.UnicornStudio.init();
        window.UnicornStudio.isInitialized = true;
      }
    }
    if (!window.UnicornStudio || !window.UnicornStudio.init) {
      window.UnicornStudio = window.UnicornStudio || { isInitialized: false };
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js";
      s.onload = initUnicornStudio;
      (document.head || document.body).appendChild(s);
    } else {
      initUnicornStudio();
    }
  };

  /* 3. Calendário Compartilhado de Previsão (Até sexta 27/11) */
  const ALL_FORECAST_DAYS = [
    { label: "Ontem", fullDate: "segunda 16/11", isPast: true },
    { label: "TER 17", fullDate: "terça 17/11", isToday: true },
    { label: "QUA 18", fullDate: "quarta 18/11" },
    { label: "QUI 19", fullDate: "quinta 19/11" },
    { label: "SEX 20", fullDate: "sexta 20/11" },
    { label: "SÁB 21", fullDate: "sábado 21/11" },
    { label: "DOM 22", fullDate: "domingo 22/11" },
    { label: "SEG 23", fullDate: "segunda 23/11" },
    { label: "TER 24", fullDate: "terça 24/11" },
    { label: "QUA 25", fullDate: "quarta 25/11" },
    { label: "QUI 26", fullDate: "quinta 26/11" },
    { label: "SEX 27", fullDate: "sexta 27/11" }
  ];

  const LAST_FORECAST_DATE_LABEL = ALL_FORECAST_DAYS[ALL_FORECAST_DAYS.length - 1].fullDate;

  /* 4. Helper Universal de Scroll Horizontal Infinito com Suporte a Toque (Celular) + Mouse Drag + Wheel */
  window.attachDsySAInfiniteTouchScroll = function (viewport, state, totalAvailableDays, onRenderMore, statusBarEl, endBannerEl) {
    if (!viewport) return;

    if (state.savedScrollLeft > 0) {
      viewport.scrollLeft = state.savedScrollLeft;
    }

    const allDaysLoaded = state.loadedDaysCount >= totalAvailableDays;

    function checkScrollBounds() {
      state.savedScrollLeft = viewport.scrollLeft;
      const maxScroll = viewport.scrollWidth - viewport.clientWidth;
      const distanceToRight = maxScroll - viewport.scrollLeft;

      // Carrega mais dias automaticamente conforme o dedo ou mouse rola para a direita
      if (distanceToRight <= 70 && state.loadedDaysCount < totalAvailableDays) {
        state.loadedDaysCount = Math.min(totalAvailableDays, state.loadedDaysCount + 2);
        onRenderMore();
        return;
      }

      // Exibe a mensagem quando chega no fim da previsão disponível
      const isAtEnd = allDaysLoaded && distanceToRight <= 20;
      if (isAtEnd !== state.reachedEnd) {
        state.reachedEnd = isAtEnd;
        if (statusBarEl && endBannerEl) {
          if (isAtEnd) {
            statusBarEl.classList.add("at-end");
            endBannerEl.className = "dsysa-end-forecast-msg";
          } else {
            statusBarEl.classList.remove("at-end");
            endBannerEl.className = "hidden";
          }
        }
      }
    }

    viewport.addEventListener("scroll", checkScrollBounds, { passive: true });

    // Roda do mouse (Desktop)
    viewport.addEventListener(
      "wheel",
      (ev) => {
        if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) {
          ev.preventDefault();
          viewport.scrollLeft += ev.deltaY;
        }
      },
      { passive: false }
    );

    // Mouse Drag (Desktop)
    let isMouseDown = false;
    let mouseStartX = 0;
    let mouseScrollStart = 0;

    viewport.addEventListener("mousedown", (e) => {
      isMouseDown = true;
      viewport.classList.add("dragging");
      mouseStartX = e.pageX - viewport.offsetLeft;
      mouseScrollStart = viewport.scrollLeft;
    });
    viewport.addEventListener("mouseleave", () => {
      isMouseDown = false;
      viewport.classList.remove("dragging");
    });
    viewport.addEventListener("mouseup", () => {
      isMouseDown = false;
      viewport.classList.remove("dragging");
    });
    viewport.addEventListener("mousemove", (e) => {
      if (!isMouseDown) return;
      e.preventDefault();
      const x = e.pageX - viewport.offsetLeft;
      const walk = (x - mouseStartX) * 1.35;
      viewport.scrollLeft = mouseScrollStart - walk;
    });

    // Toque / Arrastar com o dedo (Mobile / Tablets)
    let touchStartX = 0;
    let touchScrollStart = 0;
    viewport.addEventListener(
      "touchstart",
      (e) => {
        if (!e.touches || e.touches.length === 0) return;
        touchStartX = e.touches[0].pageX;
        touchScrollStart = viewport.scrollLeft;
        viewport.classList.add("dragging");
      },
      { passive: true }
    );
    viewport.addEventListener(
      "touchmove",
      (e) => {
        if (!e.touches || e.touches.length === 0) return;
        const currentX = e.touches[0].pageX;
        const deltaX = touchStartX - currentX;
        viewport.scrollLeft = touchScrollStart + deltaX;
      },
      { passive: true }
    );
    viewport.addEventListener(
      "touchend",
      () => {
        viewport.classList.remove("dragging");
        checkScrollBounds();
      },
      { passive: true }
    );
  };

  /* Habilita arrastar por toque/mouse em qualquer barra horizontal simples (.dsysa-touch-scroll) */
  window.enableDsySAHorizontalTouchDrag = function (el) {
    if (!el || el.__touchDragBound) return;
    el.__touchDragBound = true;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    el.addEventListener("mousedown", (e) => {
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    });
    el.addEventListener("mouseleave", () => { isDown = false; });
    el.addEventListener("mouseup", () => { isDown = false; });
    el.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      el.scrollLeft = scrollLeft - (x - startX) * 1.2;
    });
  };

  /* 5. Tabela DsySA de Cores por Período Primário em Segundos (2s a 21+s) */
  const PERIOD_COLORS = {
    2:  { bg: "#3B5998", lightText: true },
    3:  { bg: "#4361EE", lightText: true },
    4:  { bg: "#0284C7", lightText: false },
    5:  { bg: "#0EA5E9", lightText: false },
    6:  { bg: "#00B4D8", lightText: false },
    7:  { bg: "#06B6D4", lightText: false },
    8:  { bg: "#22D3EE", lightText: false },
    9:  { bg: "#14B8A6", lightText: false },
    10: { bg: "#10B981", lightText: false },
    11: { bg: "#22C55E", lightText: false },
    12: { bg: "#84CC16", lightText: false },
    13: { bg: "#A3E635", lightText: false },
    14: { bg: "#EAB308", lightText: false },
    15: { bg: "#F59E0B", lightText: false },
    16: { bg: "#F97316", lightText: false },
    17: { bg: "#EA580C", lightText: false },
    18: { bg: "#EF4444", lightText: true },
    19: { bg: "#BE123C", lightText: true },
    20: { bg: "#A21CAF", lightText: true },
    21: { bg: "#D946EF", lightText: true }
  };

  window.getDsySAPeriodColor = function (seconds) {
    const clamped = Math.max(2, Math.min(21, Math.round(seconds)));
    return PERIOD_COLORS[clamped] ? PERIOD_COLORS[clamped].bg : "#22D3EE";
  };

  /* Conversão de direção cardeal para ângulo de propagação da seta */
  const DIR_ANGLES = {
    "N": 180,
    "NNE": 202,
    "NE": 225,
    "ENE": 247,
    "E": 270,
    "L": 270,
    "ESE": 292,
    "SE": 315,
    "SSE": 337,
    "S": 0,
    "SSO": 22,
    "SO": 45,
    "OSO": 67,
    "O": 90,
    "ONO": 112,
    "NO": 135,
    "NNO": 157
  };

  /* ==========================================================================
     6. COMPONENTE 1: GRÁFICO DSYSA DE ALTURA, PERÍODO E DIREÇÃO DAS ONDAS
     ========================================================================== */
  window.renderDsySAWavePeriodChart = function (containerEl, spotConfig) {
    if (!containerEl) return;

    const baseHeight = parseFloat(spotConfig?.swellSize) || 1.6;
    const basePeriod = parseInt(spotConfig?.swellPeriod, 10) || 12;
    const baseDir = (spotConfig?.swellDir || "SE")
      .split(" ")[0]
      .replace("L-SE", "ESE")
      .replace("S-SE", "SSE")
      .replace("S-SO", "SSO");

    const state = containerEl.__waveChartState || {
      subTab: "total",
      loadedDaysCount: 5,
      collapsed: false,
      savedScrollLeft: 0,
      reachedEnd: false
    };
    containerEl.__waveChartState = state;

    const visibleDays = ALL_FORECAST_DAYS.slice(0, state.loadedDaysCount);
    const allDaysLoaded = state.loadedDaysCount >= ALL_FORECAST_DAYS.length;

    const modeMultipliers = {
      total:  { hMult: 1.0,  pDelta: 0,  dirOverride: null,    label: "Altura total (Significativa)" },
      vagas:  { hMult: 0.52, pDelta: -5, dirOverride: "L",     label: "Vagas (Ondas de Vento Local)" },
      swellA: { hMult: 0.88, pDelta: +1, dirOverride: baseDir, label: "Swell A (Ondulação Primária)" },
      swellB: { hMult: 0.45, pDelta: +3, dirOverride: "SSE",   label: "Swell B (Ondulação Secundária)" }
    };
    const activeMod = modeMultipliers[state.subTab] || modeMultipliers.total;

    const slots = [];
    const hours = ["00h", "06h", "12h", "18h"];
    const bandTypes = ["night", "twilight", "daylight", "twilight"];

    visibleDays.forEach((day, dIdx) => {
      hours.forEach((hr, hIdx) => {
        const globalIdx = dIdx * 4 + hIdx;
        const waveEnvelope = Math.sin((globalIdx / 22) * Math.PI) * 0.42 + 0.78;
        const rawH = Math.max(
          0.3,
          Math.min(3.1, +(baseHeight * activeMod.hMult * waveEnvelope + (hIdx % 2 === 0 ? 0.08 : -0.05)).toFixed(1))
        );
        const rawP = Math.max(
          4,
          Math.min(20, Math.round(basePeriod + activeMod.pDelta + Math.sin(globalIdx * 0.45) * 1.8))
        );
        const dirCode = activeMod.dirOverride || (globalIdx % 5 === 0 ? "SE" : baseDir || "ESE");
        const energyKj = Math.round(rawH * rawH * rawP * 28);

        slots.push({
          dayLabel: day.label,
          fullDate: day.fullDate,
          hour: hr,
          band: bandTypes[hIdx],
          isDayEnd: hIdx === 3,
          isNow: Boolean(day.isToday && hIdx === 2),
          height: rawH,
          period: rawP,
          color: window.getDsySAPeriodColor(rawP),
          dir: dirCode,
          angle: DIR_ANGLES[dirCode] !== undefined ? DIR_ANGLES[dirCode] : 300,
          energy: energyKj
        });
      });
    });

    const maxScaleMeters = 3.4;
    const slotWidthPx = 34;
    const endCapWidthPx = allDaysLoaded ? 190 : 0;
    const totalGridWidthPx = slots.length * slotWidthPx + endCapWidthPx;

    containerEl.innerHTML = `
      <div class="dsysa-wave-panel" style="--border-gradient: linear-gradient(135deg, rgba(56, 189, 248, 0.28), rgba(59, 130, 246, 0.04)); --border-radius-before: 16px;">
        <div class="dsysa-wave-topbar">
          <div class="dsysa-wave-topbar-title">
            <span class="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"></span>
            <span>ALTURA E PERÍODO DAS ONDAS</span>
            <span class="text-[11px] font-inter font-normal text-sky-300/90 ml-2 hidden sm:inline">
              · ${activeMod.label}
            </span>
          </div>
          <div class="flex items-center gap-3">
            <span class="dsysa-wave-readout text-[11px] font-mono text-emerald-300 hidden md:inline">
              Arraste com o dedo ou mouse p/ ver mais dias →
            </span>
            <button type="button" class="dsysa-CollapseBtn flex h-6 w-6 items-center justify-center rounded bg-slate-800/90 border border-white/10 text-slate-200 hover:text-white text-xs">
              ${state.collapsed ? "▼" : "▲"}
            </button>
          </div>
        </div>

        <div class="${state.collapsed ? "hidden" : "block"}">
          <div class="dsysa-wave-subtabs dsysa-touch-scroll">
            <button type="button" data-subtab="total" class="dsysa-wave-subtab ${state.subTab === "total" ? "active" : ""}">Altura total</button>
            <button type="button" data-subtab="vagas" class="dsysa-wave-subtab ${state.subTab === "vagas" ? "active" : ""}">Vagas</button>
            <button type="button" data-subtab="swellA" class="dsysa-wave-subtab ${state.subTab === "swellA" ? "active" : ""}">Swell A</button>
            <button type="button" data-subtab="swellB" class="dsysa-wave-subtab ${state.subTab === "swellB" ? "active" : ""}">Swell B</button>
          </div>

          <div class="dsysa-wave-matrix-wrap">
            <div class="dsysa-wave-yaxis left">
              <div class="dsysa-wave-yaxis-spacer"></div>
              <div class="dsysa-wave-yaxis-ticks">
                <div>--- 3 ---<span class="unit-label">metros</span></div>
                <div>····2.5····</div>
                <div>--- 2 ---<span class="unit-label">metros</span></div>
                <div>····1.5····</div>
                <div>--- 1 ---<span class="unit-label">metros</span></div>
                <div>····0.5····</div>
              </div>
              <div class="dsysa-wave-dir-box">direção<br>primária</div>
            </div>

            <div class="dsysa-wave-viewport">
              <div class="dsysa-wave-canvas-grid" style="width: ${totalGridWidthPx}px;">
                <div class="dsysa-wave-days-row" style="grid-template-columns: repeat(${visibleDays.length}, ${slotWidthPx * 4}px) ${allDaysLoaded ? `${endCapWidthPx}px` : ""};">
                  ${visibleDays
                    .map(
                      (d) => `
                    <div class="dsysa-wave-day-cell ${d.isPast ? "is-past" : ""} ${d.isToday ? "is-today" : ""}">
                      <span>${d.label}</span>
                    </div>
                  `
                    )
                    .join("")}
                  ${allDaysLoaded ? `<div class="dsysa-wave-day-cell" style="background: rgba(245, 158, 11, 0.16); color: #fde68a; font-size: 10px;">LIMITE DA PREVISÃO</div>` : ""}
                </div>

                <div class="dsysa-wave-plot-area" style="grid-template-columns: repeat(${slots.length}, ${slotWidthPx}px) ${allDaysLoaded ? `${endCapWidthPx}px` : ""};">
                  ${[3.0, 2.5, 2.0, 1.5, 1.0, 0.5]
                    .map((m) => {
                      const bottomPct = (m / maxScaleMeters) * 100;
                      const isMajor = m === 1.0 || m === 2.0 || m === 3.0;
                      return `<div class="dsysa-wave-gridline ${isMajor ? "major" : ""}" style="bottom: ${bottomPct.toFixed(1)}%;"></div>`;
                    })
                    .join("")}

                  ${slots
                    .map((s, idx) => {
                      const heightPct = Math.min(96, Math.max(8, (s.height / maxScaleMeters) * 100));
                      return `
                        <div class="dsysa-wave-slot-col ${s.band} ${s.isDayEnd ? "day-divider" : ""} ${s.isNow ? "is-now" : ""}"
                             data-slot-idx="${idx}"
                             data-day="${s.dayLabel} (${s.fullDate})"
                             data-hour="${s.hour}"
                             data-height="${s.height}m"
                             data-period="${s.period}s"
                             data-dir="${s.dir}"
                             data-energy="${s.energy} kJ">
                          <div class="dsysa-wave-bar"
                               style="height: ${heightPct.toFixed(1)}%; background-color: ${s.color}; box-shadow: 0 0 12px ${s.color}55, inset 0 1px 0 rgba(255,255,255,0.45);">
                          </div>
                        </div>
                      `;
                    })
                    .join("")}

                  ${
                    allDaysLoaded
                      ? `
                    <div class="dsysa-end-cap-col h-full">
                      <span class="text-base mb-1">⏳</span>
                      <p class="text-[11px] font-semibold text-amber-200 leading-snug">
                        Neste momento só temos previsão até<br>
                        <strong class="text-amber-300 underline decoration-amber-400/50">${LAST_FORECAST_DATE_LABEL}</strong>
                      </p>
                      <span class="mt-2 text-[9.5px] text-slate-400">Novos dados a cada 6h</span>
                    </div>
                  `
                      : ""
                  }
                </div>

                <div class="dsysa-wave-dirs-row" style="grid-template-columns: repeat(${slots.length}, ${slotWidthPx}px) ${allDaysLoaded ? `${endCapWidthPx}px` : ""};">
                  ${slots
                    .map(
                      (s) => `
                    <div class="dsysa-wave-dir-cell ${s.isDayEnd ? "day-divider" : ""}" title="Direção Primária: ${s.dir} (${s.period}s)">
                      <div class="dsysa-dir-circle">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${s.angle}deg);">
                          <path d="M12 19V5"></path>
                          <path d="m5 12 7-7 7 7"></path>
                        </svg>
                      </div>
                      <span class="dsysa-dir-cardinal">${s.dir}</span>
                    </div>
                  `
                    )
                    .join("")}
                  ${allDaysLoaded ? `<div class="dsysa-wave-dir-cell" style="background: rgba(15, 23, 42, 0.9); color: #94a3b8; font-size: 9px;">Fim da grade</div>` : ""}
                </div>
              </div>
            </div>

            <div class="dsysa-wave-yaxis right">
              <div class="dsysa-wave-yaxis-spacer"></div>
              <div class="dsysa-wave-yaxis-ticks">
                <div>--- 3 ---<span class="unit-label">metros</span></div>
                <div>····2.5····</div>
                <div>--- 2 ---<span class="unit-label">metros</span></div>
                <div>····1.5····</div>
                <div>--- 1 ---<span class="unit-label">metros</span></div>
                <div>····0.5····</div>
              </div>
              <div class="dsysa-wave-dir-box">direção<br>primária</div>
            </div>
          </div>

          <div class="dsysa-period-legend-wrap">
            <div class="dsysa-period-scale-bar">
              ${Object.keys(PERIOD_COLORS)
                .map((sec) => {
                  const item = PERIOD_COLORS[sec];
                  const label = sec === "21" ? "21+" : sec;
                  return `<div class="dsysa-period-cell ${item.lightText ? "light-text" : ""}" data-period-cell="${sec}" style="background-color: ${item.bg};">${label}</div>`;
                })
                .join("")}
            </div>
            <div class="dsysa-period-caption">cores do gráfico: período primário em segundos (S)</div>
          </div>

          <div class="dsysa-scroll-status-bar ${state.reachedEnd ? "at-end" : ""}">
            <div class="flex items-center gap-2">
              <span class="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
              <span>Exibindo <strong>${visibleDays.length} de ${ALL_FORECAST_DAYS.length} dias</strong> · Arraste com o dedo ou mouse</span>
            </div>
            <div class="dsysa-end-banner ${state.reachedEnd ? "dsysa-end-forecast-msg" : "hidden"}">
              <span>⚠️</span>
              <span>Neste momento só temos previsão até <strong>${LAST_FORECAST_DATE_LABEL}</strong></span>
            </div>
          </div>
        </div>
      </div>
    `;

    const viewport = containerEl.querySelector(".dsysa-wave-viewport");
    const statusBar = containerEl.querySelector(".dsysa-scroll-status-bar");
    const endBanner = containerEl.querySelector(".dsysa-end-banner");

    window.attachDsySAInfiniteTouchScroll(
      viewport,
      state,
      ALL_FORECAST_DAYS.length,
      () => window.renderDsySAWavePeriodChart(containerEl, spotConfig),
      statusBar,
      endBanner
    );

    containerEl.querySelectorAll("[data-subtab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.subTab = btn.getAttribute("data-subtab");
        window.renderDsySAWavePeriodChart(containerEl, spotConfig);
      });
    });

    const collapseBtn = containerEl.querySelector(".dsysa-CollapseBtn");
    if (collapseBtn) {
      collapseBtn.addEventListener("click", () => {
        state.collapsed = !state.collapsed;
        window.renderDsySAWavePeriodChart(containerEl, spotConfig);
      });
    }

    const readout = containerEl.querySelector(".dsysa-wave-readout");
    containerEl.querySelectorAll(".dsysa-wave-slot-col").forEach((col) => {
      const showInfo = () => {
        const d = col.getAttribute("data-day");
        const h = col.getAttribute("data-hour");
        const m = col.getAttribute("data-height");
        const p = col.getAttribute("data-period");
        const dir = col.getAttribute("data-dir");
        const e = col.getAttribute("data-energy");
        if (readout) {
          readout.classList.remove("hidden");
          readout.textContent = `${d} (${h}) → Onda: ${m} | Período: ${p} | Direção: ${dir} | Energia: ${e}`;
        }
        const pNum = parseInt(p, 10);
        containerEl.querySelectorAll("[data-period-cell]").forEach((cell) => {
          if (parseInt(cell.getAttribute("data-period-cell"), 10) === pNum) {
            cell.style.transform = "scale(1.18)";
            cell.style.boxShadow = "0 0 10px #fff";
            cell.style.zIndex = "5";
          } else {
            cell.style.transform = "none";
            cell.style.boxShadow = "none";
          }
        });
      };
      col.addEventListener("mouseenter", showInfo);
      col.addEventListener("touchstart", showInfo, { passive: true });
    });
  };

  /* ==========================================================================
     7. COMPONENTE 2: GRÁFICO DSYSA DE VENTO DE SUPERFÍCIE MÉDIO
     (Costeiro | Marítimo, Unidades Nós/KmH/MS/MPH, Vento + Rajadas, Cores das Setas)
     ========================================================================== */
  window.renderDsySAWindChart = function (containerEl, spotConfig) {
    if (!containerEl) return;

    const baseWindKmh = parseFloat(spotConfig?.windSpeed) || 12;
    const baseWindDir = (spotConfig?.windDir || "NNO").split(" ")[0];

    const state = containerEl.__windChartState || {
      zone: "costeiro", // 'costeiro' | 'maritimo'
      unit: "kmh",      // 'kt' | 'kmh' | 'ms' | 'mph'
      showHelp: false,
      loadedDaysCount: 5,
      collapsed: false,
      savedScrollLeft: 0,
      reachedEnd: false
    };
    containerEl.__windChartState = state;

    const visibleDays = ALL_FORECAST_DAYS.slice(0, state.loadedDaysCount);
    const allDaysLoaded = state.loadedDaysCount >= ALL_FORECAST_DAYS.length;

    // Configuração de conversão de unidades (base = Km/h, topo da escala = 55 Km/h)
    const UNIT_CONFIG = {
      kt:  { label: "KT",   factor: 0.539957, decimals: 0 },
      kmh: { label: "Km/h", factor: 1.0,      decimals: 0 },
      ms:  { label: "m/s",  factor: 0.277778, decimals: 1 },
      mph: { label: "mph",  factor: 0.621371, decimals: 0 }
    };
    const activeUnit = UNIT_CONFIG[state.unit] || UNIT_CONFIG.kmh;
    const zoneMultiplier = state.zone === "maritimo" ? 1.28 : 1.0;

    // Sequência realista de direções médias e classificações (fraco, terral, cruzado, maral)
    const windSequence = [
      { dir: "N",   type: "terral",  vMult: 1.1, gMult: 1.65 },
      { dir: "ONO", type: "terral",  vMult: 1.2, gMult: 1.55 },
      { dir: "E",   type: "maral",   vMult: 0.6, gMult: 1.15 },
      { dir: "N",   type: "terral",  vMult: 1.4, gMult: 1.75 },
      { dir: "NNO", type: "terral",  vMult: 1.3, gMult: 1.80 },
      { dir: "NNO", type: "terral",  vMult: 1.0, gMult: 1.45 },
      { dir: "ESE", type: "maral",   vMult: 0.9, gMult: 1.20 },
      { dir: "NE",  type: "cruzado", vMult: 1.4, gMult: 1.85 },
      { dir: "NNE", type: "terral",  vMult: 1.1, gMult: 1.65 },
      { dir: "NO",  type: "terral",  vMult: 0.8, gMult: 1.55 },
      { dir: "E",   type: "cruzado", vMult: 1.2, gMult: 1.50 },
      { dir: "NE",  type: "cruzado", vMult: 1.1, gMult: 1.60 },
      { dir: "NNE", type: "cruzado", vMult: 0.9, gMult: 1.45 },
      { dir: "NNE", type: "terral",  vMult: 0.5, gMult: 0.95 },
      { dir: "E",   type: "cruzado", vMult: 1.6, gMult: 2.15 },
      { dir: "ENE", type: "cruzado", vMult: 1.4, gMult: 1.90 }
    ];

    const slots = [];
    const hours = ["00h", "06h", "12h", "18h"];
    const bandTypes = ["night", "twilight", "daylight", "twilight"];

    visibleDays.forEach((day, dIdx) => {
      hours.forEach((hr, hIdx) => {
        const globalIdx = dIdx * 4 + hIdx;
        const pattern = windSequence[globalIdx % windSequence.length];
        const rawSustainedKmh = Math.max(4, Math.min(40, Math.round((baseWindKmh + 8) * pattern.vMult * zoneMultiplier)));
        const rawGustKmh = Math.max(rawSustainedKmh + 3, Math.min(50, Math.round((baseWindKmh + 10) * pattern.gMult * zoneMultiplier)));

        const arrowType = rawSustainedKmh <= 7 ? "fraco" : pattern.type;
        const dirCode = globalIdx === 6 ? baseWindDir : pattern.dir;

        const convSustained = +(rawSustainedKmh * activeUnit.factor).toFixed(activeUnit.decimals);
        const convGust = +(rawGustKmh * activeUnit.factor).toFixed(activeUnit.decimals);

        slots.push({
          dayLabel: day.label,
          fullDate: day.fullDate,
          hour: hr,
          band: bandTypes[hIdx],
          isDayEnd: hIdx === 3,
          isNow: Boolean(day.isToday && hIdx === 2),
          sustainedKmh: rawSustainedKmh,
          gustKmh: rawGustKmh,
          convSustained,
          convGust,
          dir: dirCode,
          angle: DIR_ANGLES[dirCode] !== undefined ? DIR_ANGLES[dirCode] : 180,
          arrowType
        });
      });
    });

    const maxScaleKmh = 54; // Topo do gráfico = 54 Km/h (com linhas de 5 a 50 Km/h)
    const slotWidthPx = 34;
    const endCapWidthPx = allDaysLoaded ? 190 : 0;
    const totalGridWidthPx = slots.length * slotWidthPx + endCapWidthPx;

    // Gera os 10 níveis do eixo Y (50 down to 5 Km/h convertidos para a unidade ativa)
    const yStepsKmh = [50, 45, 40, 35, 30, 25, 20, 15, 10, 5];
    const renderYAxisTicks = () =>
      yStepsKmh
        .map((valKmh, i) => {
          const converted = +(valKmh * activeUnit.factor).toFixed(activeUnit.decimals);
          const showUnitLabel = i % 2 === 1;
          return `<div>--- ${converted} ---${showUnitLabel ? `<span class="unit-label">${activeUnit.label}</span>` : ""}</div>`;
        })
        .join("");

    containerEl.innerHTML = `
      <div class="dsysa-wave-panel mt-4" style="--border-gradient: linear-gradient(135deg, rgba(250, 204, 21, 0.25), rgba(56, 189, 248, 0.05)); --border-radius-before: 16px;">
        <!-- TOP HEADER: VENTO DE SUPERFÍCIE MÉDIO -->
        <div class="dsysa-wave-topbar">
          <div class="dsysa-wave-topbar-title">
            <span class="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#facc15]"></span>
            <span>VENTO DE SUPERFÍCIE MÉDIO</span>
            <span class="text-[11px] font-inter font-normal text-amber-300/90 ml-2 hidden sm:inline">
              · ${state.zone === "costeiro" ? "Zona Costeira (Praia)" : "Zona Marítima (Alto-Mar)"}
            </span>
          </div>
          <div class="flex items-center gap-3">
            <span class="dsysa-wind-readout text-[11px] font-mono text-amber-300 hidden md:inline">
              Toque ou passe o mouse nas barras p/ ver Vento, Rajadas e Direção
            </span>
            <button type="button" class="dsysa-WindCollapseBtn flex h-6 w-6 items-center justify-center rounded bg-slate-800/90 border border-white/10 text-slate-200 hover:text-white text-xs">
              ${state.collapsed ? "▼" : "▲"}
            </button>
          </div>
        </div>

        <div class="${state.collapsed ? "hidden" : "block"}">
          <!-- ZONE SELECTOR ROW: COSTEIRO | MARÍTIMO | ? + Nota de Unidade -->
          <div class="dsysa-wind-zone-bar">
            <div class="dsysa-wind-zone-group">
              <button type="button" data-zone="costeiro" class="dsysa-wind-zone-btn ${state.zone === "costeiro" ? "active" : ""}">
                COSTEIRO
              </button>
              <button type="button" data-zone="maritimo" class="dsysa-wind-zone-btn ${state.zone === "maritimo" ? "active" : ""}">
                MARÍTIMO
              </button>
              <button type="button" class="dsysa-wind-help-btn" title="O que é Costeiro vs Marítimo?">
                <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-950 font-bold text-xs">?</span>
              </button>
            </div>
            <p class="dsysa-wind-zone-note">
              * unidade de medição de vento mudará de acordo com a aba escolhida.
            </p>
          </div>

          ${
            state.showHelp
              ? `
            <div class="mx-4 mb-2 rounded-lg bg-slate-900/95 border border-sky-400/30 px-3.5 py-2 text-[11px] text-slate-300">
              <strong class="text-sky-300">Costeiro vs. Marítimo:</strong> O modo <em>Costeiro</em> considera o efeito térmico da areia e relevo na arrebentação (terral matinal). O modo <em>Marítimo</em> reflete o vento em alto-mar aberto sem proteção costeira.
            </div>
          `
              : ""
          }

          <!-- UNIT SUBTABS (Nós KT | Km/H | M/S | MPH) + VENTO / RAJADAS LEGEND -->
          <div class="dsysa-wind-subtabs-row">
            <div class="flex items-end gap-1 overflow-x-auto dsysa-touch-scroll">
              <button type="button" data-unit="kt" class="dsysa-wave-subtab ${state.unit === "kt" ? "active" : ""}">Nós (KT)</button>
              <button type="button" data-unit="kmh" class="dsysa-wave-subtab ${state.unit === "kmh" ? "active" : ""}">Km/H</button>
              <button type="button" data-unit="ms" class="dsysa-wave-subtab ${state.unit === "ms" ? "active" : ""}">M/S</button>
              <button type="button" data-unit="mph" class="dsysa-wave-subtab ${state.unit === "mph" ? "active" : ""}">MPH</button>
            </div>
            <div class="dsysa-wind-bars-legend">
              <span>Vento <span class="dsysa-wind-swatch sustained"></span></span>
              <span>Rajadas <span class="dsysa-wind-swatch gust"></span></span>
            </div>
          </div>

          <!-- MATRIX: Left Y-Axis | Horizontal Infinite Scroll Viewport | Right Y-Axis -->
          <div class="dsysa-wave-matrix-wrap">
            <!-- LEFT Y-AXIS -->
            <div class="dsysa-wave-yaxis left">
              <div class="dsysa-wave-yaxis-spacer"></div>
              <div class="dsysa-wave-yaxis-ticks" style="height: 240px; padding: 8px 2px 10px; font-size: 9px;">
                ${renderYAxisTicks()}
              </div>
              <div class="dsysa-wave-dir-box">
                direção<br>média
              </div>
            </div>

            <!-- CENTRAL HORIZONTAL INFINITE SCROLL VIEWPORT -->
            <div class="dsysa-wave-viewport">
              <div class="dsysa-wave-canvas-grid" style="width: ${totalGridWidthPx}px;">
                <!-- DAY HEADERS ROW -->
                <div class="dsysa-wave-days-row" style="grid-template-columns: repeat(${visibleDays.length}, ${slotWidthPx * 4}px) ${allDaysLoaded ? `${endCapWidthPx}px` : ""};">
                  ${visibleDays
                    .map(
                      (d) => `
                    <div class="dsysa-wave-day-cell ${d.isPast ? "is-past" : ""} ${d.isToday ? "is-today" : ""}">
                      <span>${d.label}</span>
                    </div>
                  `
                    )
                    .join("")}
                  ${allDaysLoaded ? `<div class="dsysa-wave-day-cell" style="background: rgba(245, 158, 11, 0.16); color: #fde68a; font-size: 10px;">LIMITE DA PREVISÃO</div>` : ""}
                </div>

                <!-- STACKED WIND + GUST BARS PLOT AREA (240px height) -->
                <div class="dsysa-wave-plot-area" style="height: 240px; grid-template-columns: repeat(${slots.length}, ${slotWidthPx}px) ${allDaysLoaded ? `${endCapWidthPx}px` : ""};">
                  ${yStepsKmh
                    .map((valKmh) => {
                      const bottomPct = (valKmh / maxScaleKmh) * 100;
                      const isMajor = valKmh % 10 === 0;
                      return `<div class="dsysa-wave-gridline ${isMajor ? "major" : ""}" style="bottom: ${bottomPct.toFixed(1)}%;"></div>`;
                    })
                    .join("")}

                  ${slots
                    .map((s) => {
                      const totalHeightPct = Math.min(96, Math.max(8, (s.gustKmh / maxScaleKmh) * 100));
                      const sustainedRatioPct = Math.min(100, Math.max(25, (s.sustainedKmh / s.gustKmh) * 100));
                      const gustRatioPct = Math.max(0, 100 - sustainedRatioPct);

                      return `
                        <div class="dsysa-wave-slot-col ${s.band} ${s.isDayEnd ? "day-divider" : ""} ${s.isNow ? "is-now" : ""}"
                             data-day="${s.dayLabel} (${s.fullDate})"
                             data-hour="${s.hour}"
                             data-wind="${s.convSustained} ${activeUnit.label}"
                             data-gust="${s.convGust} ${activeUnit.label}"
                             data-dir="${s.dir}"
                             data-type="${s.arrowType.toUpperCase()}">
                          <div class="dsysa-wind-bar-stack" style="height: ${totalHeightPct.toFixed(1)}%;">
                            <div class="dsysa-wind-bar-gust-part" style="height: ${gustRatioPct.toFixed(1)}%;"></div>
                            <div class="dsysa-wind-bar-sustained-part" style="height: ${sustainedRatioPct.toFixed(1)}%;"></div>
                          </div>
                        </div>
                      `;
                    })
                    .join("")}

                  ${
                    allDaysLoaded
                      ? `
                    <div class="dsysa-end-cap-col h-full">
                      <span class="text-base mb-1">⏳</span>
                      <p class="text-[11px] font-semibold text-amber-200 leading-snug">
                        Neste momento só temos previsão até<br>
                        <strong class="text-amber-300 underline decoration-amber-400/50">${LAST_FORECAST_DATE_LABEL}</strong>
                      </p>
                      <span class="mt-2 text-[9.5px] text-slate-400">Modelo atmosférico completo</span>
                    </div>
                  `
                      : ""
                  }
                </div>

                <!-- AVERAGE WIND DIRECTION ROW (Colored by fraco / terral / cruzado / maral) -->
                <div class="dsysa-wave-dirs-row" style="grid-template-columns: repeat(${slots.length}, ${slotWidthPx}px) ${allDaysLoaded ? `${endCapWidthPx}px` : ""};">
                  ${slots
                    .map(
                      (s) => `
                    <div class="dsysa-wave-dir-cell ${s.isDayEnd ? "day-divider" : ""}" title="Vento ${s.dir} (${s.arrowType})">
                      <div class="dsysa-wind-dir-circle ${s.arrowType}">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${s.angle}deg);">
                          <path d="M12 19V5"></path>
                          <path d="m5 12 7-7 7 7"></path>
                        </svg>
                      </div>
                      <span class="dsysa-dir-cardinal">${s.dir}</span>
                    </div>
                  `
                    )
                    .join("")}
                  ${allDaysLoaded ? `<div class="dsysa-wave-dir-cell" style="background: rgba(15, 23, 42, 0.9); color: #94a3b8; font-size: 9px;">Fim da grade</div>` : ""}
                </div>
              </div>
            </div>

            <!-- RIGHT Y-AXIS -->
            <div class="dsysa-wave-yaxis right">
              <div class="dsysa-wave-yaxis-spacer"></div>
              <div class="dsysa-wave-yaxis-ticks" style="height: 240px; padding: 8px 2px 10px; font-size: 9px;">
                ${renderYAxisTicks()}
              </div>
              <div class="dsysa-wave-dir-box">
                direção<br>média
              </div>
            </div>
          </div>

          <!-- CORES DAS SETAS LEGEND: fraco | terral | cruzado | maral -->
          <div class="dsysa-wind-arrows-legend-wrap">
            <span class="dsysa-wind-arrows-title">CORES DAS SETAS</span>
            <div class="dsysa-wind-arrows-grid">
              <div class="dsysa-wind-arrow-key fraco">fraco</div>
              <div class="dsysa-wind-arrow-key terral">terral</div>
              <div class="dsysa-wind-arrow-key cruzado">cruzado</div>
              <div class="dsysa-wind-arrow-key maral">maral</div>
            </div>
          </div>

          <!-- INFINITE HORIZONTAL SCROLL STATUS & END-OF-FORECAST MESSAGE -->
          <div class="dsysa-scroll-status-bar ${state.reachedEnd ? "at-end" : ""}">
            <div class="flex items-center gap-2">
              <span class="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
              <span>Exibindo <strong>${visibleDays.length} de ${ALL_FORECAST_DAYS.length} dias</strong> · Arraste com o dedo ou mouse</span>
            </div>
            <div class="dsysa-end-banner ${state.reachedEnd ? "dsysa-end-forecast-msg" : "hidden"}">
              <span>⚠️</span>
              <span>Neste momento só temos previsão até <strong>${LAST_FORECAST_DATE_LABEL}</strong></span>
            </div>
          </div>
        </div>
      </div>
    `;

    const viewport = containerEl.querySelector(".dsysa-wave-viewport");
    const statusBar = containerEl.querySelector(".dsysa-scroll-status-bar");
    const endBanner = containerEl.querySelector(".dsysa-end-banner");

    window.attachDsySAInfiniteTouchScroll(
      viewport,
      state,
      ALL_FORECAST_DAYS.length,
      () => window.renderDsySAWindChart(containerEl, spotConfig),
      statusBar,
      endBanner
    );

    // Eventos COSTEIRO / MARÍTIMO
    containerEl.querySelectorAll("[data-zone]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.zone = btn.getAttribute("data-zone");
        window.renderDsySAWindChart(containerEl, spotConfig);
      });
    });

    // Botão de ajuda (?)
    const helpBtn = containerEl.querySelector(".dsysa-wind-help-btn");
    if (helpBtn) {
      helpBtn.addEventListener("click", () => {
        state.showHelp = !state.showHelp;
        window.renderDsySAWindChart(containerEl, spotConfig);
      });
    }

    // Eventos de Unidades: Nós (KT) | Km/H | M/S | MPH
    containerEl.querySelectorAll("[data-unit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.unit = btn.getAttribute("data-unit");
        window.renderDsySAWindChart(containerEl, spotConfig);
      });
    });

    // Evento de recolher/expandir
    const collapseBtn = containerEl.querySelector(".dsysa-WindCollapseBtn");
    if (collapseBtn) {
      collapseBtn.addEventListener("click", () => {
        state.collapsed = !state.collapsed;
        window.renderDsySAWindChart(containerEl, spotConfig);
      });
    }

    // Readout interativo no hover / toque nas barras
    const readout = containerEl.querySelector(".dsysa-wind-readout");
    containerEl.querySelectorAll(".dsysa-wave-slot-col").forEach((col) => {
      const showWindInfo = () => {
        const d = col.getAttribute("data-day");
        const h = col.getAttribute("data-hour");
        const w = col.getAttribute("data-wind");
        const g = col.getAttribute("data-gust");
        const dir = col.getAttribute("data-dir");
        const t = col.getAttribute("data-type");
        if (readout) {
          readout.classList.remove("hidden");
          readout.textContent = `${d} (${h}) → Vento: ${w} | Rajadas: ${g} | Direção: ${dir} (${t})`;
        }
      };
      col.addEventListener("mouseenter", showWindInfo);
      col.addEventListener("touchstart", showWindInfo, { passive: true });
    });
  };

  /* 8. Chart.js Factory — Gráfico Doughnut (Composição de Qualidade do Pico) */
  window.createDsySADoughnutChart = function (canvasEl, dataValues, labels) {
    if (!canvasEl || !window.Chart) return null;
    if (canvasEl.__chartInstance) {
      canvasEl.__chartInstance.destroy();
    }
    const instance = new Chart(canvasEl, {
      type: "doughnut",
      data: {
        labels: labels || ["Swell & Energia", "Vento (Terral)", "Janela de Maré"],
        datasets: [
          {
            data: dataValues || [50, 30, 20],
            backgroundColor: [
              "rgba(56, 189, 248, 1)",
              "rgba(59, 130, 246, 1)",
              "rgba(30, 64, 175, 0.6)"
            ],
            borderWidth: 0,
            hoverOffset: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "#e5e7eb",
            bodyColor: "#e5e7eb",
            borderColor: "rgba(148, 163, 184, 0.4)",
            borderWidth: 1
          }
        }
      }
    });
    canvasEl.__chartInstance = instance;
    return instance;
  };

  document.addEventListener("DOMContentLoaded", () => {
    window.initDsySAAnimations();
    document.querySelectorAll(".dsysa-touch-scroll").forEach((el) => {
      window.enableDsySAHorizontalTouchDrag(el);
    });
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });
})();
