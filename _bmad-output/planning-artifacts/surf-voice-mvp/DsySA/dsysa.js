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

  /* ==========================================================================
     8. COMPONENTE 3: GRÁFICO DSYSA DE PREVISÃO DE ENERGIA DAS ONDAS ("ENERGIA DAS ONDAS")
     (Energia total | Vagas | Swell A | Swell B + Escala kJ/Joules + Scroll Infinito)
     ========================================================================== */
  const ENERGY_TIERS = [
    { key: "e100",  max: 150,  bg: "#0284C7", label: "100",   desc: "Fraca",    lightText: true },
    { key: "e200",  max: 260,  bg: "#06B6D4", label: "200",   desc: "Suave",    lightText: false },
    { key: "e350",  max: 420,  bg: "#10B981", label: "350",   desc: "Moderada", lightText: false },
    { key: "e500",  max: 600,  bg: "#84CC16", label: "500",   desc: "Boa",      lightText: false },
    { key: "e750",  max: 850,  bg: "#EAB308", label: "750",   desc: "Forte",    lightText: false },
    { key: "e1000", max: 1200, bg: "#F97316", label: "1000",  desc: "Pesada",   lightText: false },
    { key: "e1500", max: 1700, bg: "#EF4444", label: "1500",  desc: "Grande",   lightText: true },
    { key: "e2000", max: 9999, bg: "#D946EF", label: "2000+", desc: "Extrema",  lightText: true }
  ];

  window.getDsySAEnergyTier = function (kj) {
    for (let i = 0; i < ENERGY_TIERS.length; i++) {
      if (kj <= ENERGY_TIERS[i].max) return ENERGY_TIERS[i];
    }
    return ENERGY_TIERS[ENERGY_TIERS.length - 1];
  };

  window.renderDsySAWaveEnergyChart = function (containerEl, spotConfig) {
    if (!containerEl) return;

    const baseEnergyKj = parseInt(spotConfig?.energy, 10) || 520;
    const basePeriod = parseInt(spotConfig?.swellPeriod, 10) || 12;
    const baseDir = (spotConfig?.swellDir || "SE")
      .split(" ")[0]
      .replace("L-SE", "ESE")
      .replace("S-SE", "SSE")
      .replace("S-SO", "SSO");

    const state = containerEl.__energyChartState || {
      subTab: "total", // 'total' | 'vagas' | 'swellA' | 'swellB'
      unit: "kj",      // 'kj' | 'joules'
      showHelp: false,
      loadedDaysCount: 5,
      collapsed: false,
      savedScrollLeft: 0,
      reachedEnd: false
    };
    containerEl.__energyChartState = state;

    const visibleDays = ALL_FORECAST_DAYS.slice(0, state.loadedDaysCount);
    const allDaysLoaded = state.loadedDaysCount >= ALL_FORECAST_DAYS.length;

    const modeMultipliers = {
      total:  { eMult: 1.0,  pDelta: 0,  dirOverride: null,    label: "Energia total (Potência Combinada)" },
      vagas:  { eMult: 0.28, pDelta: -5, dirOverride: "L",     label: "Vagas (Energia de Vento Local)" },
      swellA: { eMult: 0.85, pDelta: +1, dirOverride: baseDir, label: "Swell A (Energia Primária)" },
      swellB: { eMult: 0.35, pDelta: +3, dirOverride: "SSE",   label: "Swell B (Energia Secundária)" }
    };
    const activeMod = modeMultipliers[state.subTab] || modeMultipliers.total;
    const unitFactor = state.unit === "joules" ? 10 : 1; // Exibição em kJ ou J/m² (x10)
    const unitLabel = state.unit === "joules" ? "J/m²" : "kJ";

    const slots = [];
    const hours = ["00h", "06h", "12h", "18h"];
    const bandTypes = ["night", "twilight", "daylight", "twilight"];

    visibleDays.forEach((day, dIdx) => {
      hours.forEach((hr, hIdx) => {
        const globalIdx = dIdx * 4 + hIdx;
        const envelope = Math.sin((globalIdx / 20) * Math.PI) * 0.55 + 0.72;
        const rawKj = Math.max(
          65,
          Math.min(1350, Math.round(baseEnergyKj * activeMod.eMult * envelope + (hIdx % 2 === 0 ? 25 : -20)))
        );
        const tier = window.getDsySAEnergyTier(rawKj);
        const period = Math.max(5, Math.min(20, Math.round(basePeriod + activeMod.pDelta + Math.sin(globalIdx * 0.4) * 1.5)));
        const dirCode = activeMod.dirOverride || (globalIdx % 5 === 0 ? "SE" : baseDir || "ESE");

        slots.push({
          dayLabel: day.label,
          fullDate: day.fullDate,
          hour: hr,
          band: bandTypes[hIdx],
          isDayEnd: hIdx === 3,
          isNow: Boolean(day.isToday && hIdx === 2),
          kj: rawKj,
          displayVal: Math.round(rawKj * unitFactor),
          tierKey: tier.key,
          tierDesc: tier.desc,
          color: tier.bg,
          period,
          dir: dirCode,
          angle: DIR_ANGLES[dirCode] !== undefined ? DIR_ANGLES[dirCode] : 300
        });
      });
    });

    const maxScaleKj = 1400; // Escala vertical até 1400 kJ (com linhas tracejadas em 200, 400, 600, 800, 1000, 1200 kJ)
    const slotWidthPx = 34;
    const endCapWidthPx = allDaysLoaded ? 190 : 0;
    const totalGridWidthPx = slots.length * slotWidthPx + endCapWidthPx;
    const yStepsKj = [1200, 1000, 800, 600, 400, 200];

    const renderEnergyYAxisTicks = () =>
      yStepsKj
        .map((v, idx) => {
          const val = Math.round(v * unitFactor);
          const showUnit = idx % 2 === 0;
          return `<div>--- ${val} ---${showUnit ? `<span class="unit-label">${unitLabel}</span>` : ""}</div>`;
        })
        .join("");

    containerEl.innerHTML = `
      <div class="dsysa-wave-panel mt-4" style="--border-gradient: linear-gradient(135deg, rgba(16, 185, 129, 0.32), rgba(56, 189, 248, 0.06)); --border-radius-before: 16px;">
        <!-- TOP HEADER: ENERGIA DAS ONDAS -->
        <div class="dsysa-wave-topbar">
          <div class="dsysa-wave-topbar-title">
            <span class="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]"></span>
            <span>ENERGIA DAS ONDAS (POTÊNCIA)</span>
            <span class="text-[11px] font-inter font-normal text-emerald-300/90 ml-2 hidden sm:inline">
              · ${activeMod.label}
            </span>
          </div>
          <div class="flex items-center gap-3">
            <span class="dsysa-energy-readout text-[11px] font-mono text-emerald-300 hidden md:inline">
              Toque ou passe o mouse p/ ver Energia (${unitLabel}), Período e Direção
            </span>
            <button type="button" class="dsysa-EnergyHelpBtn flex h-6 w-6 items-center justify-center rounded-full bg-slate-800/90 border border-white/15 text-sky-300 hover:text-white text-xs font-bold" title="Como ler a Energia das Ondas?">
              ?
            </button>
            <button type="button" class="dsysa-EnergyCollapseBtn flex h-6 w-6 items-center justify-center rounded bg-slate-800/90 border border-white/10 text-slate-200 hover:text-white text-xs">
              ${state.collapsed ? "▼" : "▲"}
            </button>
          </div>
        </div>

        <div class="${state.collapsed ? "hidden" : "block"}">
          ${
            state.showHelp
              ? `
            <div class="mx-4 mt-2.5 rounded-lg bg-slate-900/95 border border-emerald-400/30 px-3.5 py-2 text-[11px] text-slate-300">
              <strong class="text-emerald-300">O que é a Energia da Onda (${unitLabel})?</strong> A energia hidrodinâmica combina a altura da onda ao quadrado com o período (<em>E ∝ H² × T</em>). Duas ondas de 1,2m têm forças completamente diferentes se uma tiver 7s (180 kJ — fraca) e a outra 14s (560 kJ — forte e com pressão).
            </div>
          `
              : ""
          }

          <!-- SUB-MODE TABS: Energia total | Vagas | Swell A | Swell B  +  Unidade kJ / Joules -->
          <div class="dsysa-wind-subtabs-row">
            <div class="flex items-end gap-1 overflow-x-auto dsysa-touch-scroll">
              <button type="button" data-esubtab="total" class="dsysa-wave-subtab ${state.subTab === "total" ? "active" : ""}">Energia total</button>
              <button type="button" data-esubtab="vagas" class="dsysa-wave-subtab ${state.subTab === "vagas" ? "active" : ""}">Vagas</button>
              <button type="button" data-esubtab="swellA" class="dsysa-wave-subtab ${state.subTab === "swellA" ? "active" : ""}">Swell A</button>
              <button type="button" data-esubtab="swellB" class="dsysa-wave-subtab ${state.subTab === "swellB" ? "active" : ""}">Swell B</button>
            </div>
            <div class="flex items-center gap-1.5 pb-1.5 text-[10.5px]">
              <span class="text-slate-400">Escala:</span>
              <button type="button" data-eunit="kj" class="px-2 py-0.5 rounded font-semibold ${state.unit === "kj" ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-300"}">kJ</button>
              <button type="button" data-eunit="joules" class="px-2 py-0.5 rounded font-semibold ${state.unit === "joules" ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-300"}">J/m²</button>
            </div>
          </div>

          <!-- MATRIX: Left Y-Axis | Horizontal Infinite Scroll Viewport | Right Y-Axis -->
          <div class="dsysa-wave-matrix-wrap">
            <!-- LEFT Y-AXIS -->
            <div class="dsysa-wave-yaxis left">
              <div class="dsysa-wave-yaxis-spacer"></div>
              <div class="dsysa-wave-yaxis-ticks" style="height: 215px; padding: 12px 2px 16px; font-size: 9.5px;">
                ${renderEnergyYAxisTicks()}
              </div>
              <div class="dsysa-wave-dir-box">
                direção<br>primária
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

                <!-- ENERGY BARS PLOT AREA (215px height) -->
                <div class="dsysa-wave-plot-area" style="height: 215px; grid-template-columns: repeat(${slots.length}, ${slotWidthPx}px) ${allDaysLoaded ? `${endCapWidthPx}px` : ""};">
                  ${yStepsKj
                    .map((valKj) => {
                      const bottomPct = (valKj / maxScaleKj) * 100;
                      const isMajor = valKj === 400 || valKj === 800 || valKj === 1200;
                      return `<div class="dsysa-wave-gridline ${isMajor ? "major" : ""}" style="bottom: ${bottomPct.toFixed(1)}%;"></div>`;
                    })
                    .join("")}

                  ${slots
                    .map((s) => {
                      const heightPct = Math.min(92, Math.max(8, (s.kj / maxScaleKj) * 100));
                      return `
                        <div class="dsysa-wave-slot-col ${s.band} ${s.isDayEnd ? "day-divider" : ""} ${s.isNow ? "is-now" : ""}"
                             data-day="${s.dayLabel} (${s.fullDate})"
                             data-hour="${s.hour}"
                             data-energy="${s.displayVal} ${unitLabel}"
                             data-tier="${s.tierKey}"
                             data-desc="${s.tierDesc}"
                             data-period="${s.period}s"
                             data-dir="${s.dir}">
                          <span class="dsysa-energy-val-tag">${s.displayVal}</span>
                          <div class="dsysa-energy-bar"
                               style="height: ${heightPct.toFixed(1)}%; background: linear-gradient(180deg, ${s.color} 0%, ${s.color}cc 100%); box-shadow: 0 0 12px ${s.color}55, inset 0 1px 0 rgba(255,255,255,0.5);">
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
                      <span class="mt-2 text-[9.5px] text-slate-400">Energia calculada via Swell</span>
                    </div>
                  `
                      : ""
                  }
                </div>

                <!-- PRIMARY DIRECTION & PERIOD ROW -->
                <div class="dsysa-wave-dirs-row" style="grid-template-columns: repeat(${slots.length}, ${slotWidthPx}px) ${allDaysLoaded ? `${endCapWidthPx}px` : ""};">
                  ${slots
                    .map(
                      (s) => `
                    <div class="dsysa-wave-dir-cell ${s.isDayEnd ? "day-divider" : ""}" title="Direção: ${s.dir} · Período: ${s.period}s">
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

            <!-- RIGHT Y-AXIS -->
            <div class="dsysa-wave-yaxis right">
              <div class="dsysa-wave-yaxis-spacer"></div>
              <div class="dsysa-wave-yaxis-ticks" style="height: 215px; padding: 12px 2px 16px; font-size: 9.5px;">
                ${renderEnergyYAxisTicks()}
              </div>
              <div class="dsysa-wave-dir-box">
                direção<br>primária
              </div>
            </div>
          </div>

          <!-- ENERGY SCALE LEGEND BAR: 100 to 2000+ kJ -->
          <div class="dsysa-period-legend-wrap">
            <div class="dsysa-energy-scale-bar">
              ${ENERGY_TIERS.map(
                (t) => `
                <div class="dsysa-energy-cell ${t.lightText ? "light-text" : ""}" data-energy-cell="${t.key}" style="background-color: ${t.bg};">
                  ${t.label}
                  <span>${t.desc}</span>
                </div>
              `
              ).join("")}
            </div>
            <div class="dsysa-period-caption">
              cores do gráfico: energia primária das ondas em quilojoules (kJ) · força hidrodinâmica
            </div>
          </div>

          <!-- INFINITE HORIZONTAL SCROLL STATUS & END-OF-FORECAST MESSAGE -->
          <div class="dsysa-scroll-status-bar ${state.reachedEnd ? "at-end" : ""}">
            <div class="flex items-center gap-2">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
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
      () => window.renderDsySAWaveEnergyChart(containerEl, spotConfig),
      statusBar,
      endBanner
    );

    // Eventos das 4 sub-abas (Energia total | Vagas | Swell A | Swell B)
    containerEl.querySelectorAll("[data-esubtab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.subTab = btn.getAttribute("data-esubtab");
        window.renderDsySAWaveEnergyChart(containerEl, spotConfig);
      });
    });

    // Eventos de escala kJ / Joules
    containerEl.querySelectorAll("[data-eunit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.unit = btn.getAttribute("data-eunit");
        window.renderDsySAWaveEnergyChart(containerEl, spotConfig);
      });
    });

    // Botão de ajuda (?)
    const helpBtn = containerEl.querySelector(".dsysa-EnergyHelpBtn");
    if (helpBtn) {
      helpBtn.addEventListener("click", () => {
        state.showHelp = !state.showHelp;
        window.renderDsySAWaveEnergyChart(containerEl, spotConfig);
      });
    }

    // Botão recolher/expandir
    const collapseBtn = containerEl.querySelector(".dsysa-EnergyCollapseBtn");
    if (collapseBtn) {
      collapseBtn.addEventListener("click", () => {
        state.collapsed = !state.collapsed;
        window.renderDsySAWaveEnergyChart(containerEl, spotConfig);
      });
    }

    // Readout interativo e destaque na escala cromática de energia
    const readout = containerEl.querySelector(".dsysa-energy-readout");
    containerEl.querySelectorAll(".dsysa-wave-slot-col").forEach((col) => {
      const showEnergyInfo = () => {
        const d = col.getAttribute("data-day");
        const h = col.getAttribute("data-hour");
        const e = col.getAttribute("data-energy");
        const desc = col.getAttribute("data-desc");
        const p = col.getAttribute("data-period");
        const dir = col.getAttribute("data-dir");
        const tierKey = col.getAttribute("data-tier");

        if (readout) {
          readout.classList.remove("hidden");
          readout.textContent = `${d} (${h}) → Energia: ${e} (${desc}) | Período: ${p} | Direção: ${dir}`;
        }
        containerEl.querySelectorAll("[data-energy-cell]").forEach((cell) => {
          if (cell.getAttribute("data-energy-cell") === tierKey) {
            cell.style.transform = "scale(1.12)";
            cell.style.boxShadow = "0 0 10px #fff";
            cell.style.zIndex = "5";
          } else {
            cell.style.transform = "none";
            cell.style.boxShadow = "none";
          }
        });
      };
      col.addEventListener("mouseenter", showEnergyInfo);
      col.addEventListener("touchstart", showEnergyInfo, { passive: true });
    });
  };

  /* ==========================================================================
     9. COMPONENTE 4: TÁBUA DE MARÉS E HORAS DOS ASTROS ("ALTURA DA MARÉ")
     (Porto de Referência, Nascer/Pôr do Sol e Lua, Fase Lunar, Curva Senoidal Bicolor
      Enchendo/Vazante, Marcador 20:30h 1.7m, Caixas Preamar/Baixamar, Mini-Mapa e
      Modos GRÁFICOS | TABELAS | MÊS + Scroll Horizontal Infinito por Toque/Mouse)
     ========================================================================== */
  window.renderDsySATideChart = function (containerEl, spotConfig) {
    if (!containerEl) return;

    const spotNameLower = (spotConfig?.name || "").toLowerCase();
    let harborName = "porto de salvador";
    if (spotNameLower.includes("maresias") || spotNameLower.includes("sebasti")) {
      harborName = "porto de são sebastião";
    } else if (spotNameLower.includes("arpoador") || spotNameLower.includes("rio")) {
      harborName = "porto do rio de janeiro";
    } else if (spotNameLower.includes("itamambuca") || spotNameLower.includes("ubatuba")) {
      harborName = "porto de ubatuba";
    } else if (spotNameLower.includes("pipeline")) {
      harborName = "haleiwa harbor · oahu";
    }

    const state = containerEl.__tideChartState || {
      viewMode: "graficos", // 'graficos' | 'tabelas' | 'mes'
      loadedDaysCount: 5,
      collapsed: false,
      savedScrollLeft: 0,
      reachedEnd: false,
      cursorDayIdx: 1,
      cursorHourFloat: 20.5, // 20:30h
      cursorHeight: 1.7
    };
    containerEl.__tideChartState = state;

    const visibleDays = ALL_FORECAST_DAYS.slice(0, state.loadedDaysCount);
    const allDaysLoaded = state.loadedDaysCount >= ALL_FORECAST_DAYS.length;

    // Gera dados astronômicos e 4 extremos de maré (2 baixamares e 2 preamares) por dia
    const dayTideData = visibleDays.map((day, dIdx) => {
      const shiftMin = dIdx * 48; // Atraso lunar diário ~48 min
      const fmtTime = (baseMinutes) => {
        const total = (baseMinutes + shiftMin) % (24 * 60);
        const hh = String(Math.floor(total / 60)).padStart(2, "0");
        const mm = String(total % 60).padStart(2, "0");
        return { str: `${hh}:${mm}h`, hourFloat: total / 60 };
      };

      const low1 = fmtTime(1 * 60 + 49);   // ex: 01:49h
      const high1 = fmtTime(8 * 60 + 34);  // ex: 08:34h
      const low2 = fmtTime(14 * 60 + 23);  // ex: 14:23h
      const high2 = fmtTime(20 * 60 + 51); // ex: 20:51h

      const low1H = +(0.8 + Math.sin(dIdx) * 0.1).toFixed(1);
      const high1H = +(1.7 + Math.cos(dIdx * 0.5) * 0.1).toFixed(1);
      const low2H = +(1.0 - Math.sin(dIdx * 0.7) * 0.1).toFixed(1);
      const high2H = +(1.8 + Math.sin(dIdx * 0.4) * 0.1).toFixed(1);

      const moonRise = fmtTime(10 * 60 + 42);
      const moonSet = fmtTime(23 * 60 + 35);

      const fullHeaderLabel = day.label
        .replace("TER ", "TERÇA ")
        .replace("QUA ", "QUARTA ")
        .replace("QUI ", "QUINTA ")
        .replace("SEX ", "SEXTA ")
        .replace("SÁB ", "SÁBADO ")
        .replace("DOM ", "DOMINGO ")
        .replace("SEG ", "SEGUNDA ");

      return {
        ...day,
        fullHeaderLabel,
        sunrise: "4:57h",
        sunset: dIdx === 0 ? "17:40h" : "17:41h",
        moonPhaseLabel: dIdx === 1 ? "crescente" : dIdx >= 4 ? "cheia" : "",
        moonRise: moonRise.str,
        moonSet: moonSet.str,
        extrema: [
          { type: "low",  ...low1,  height: low1H },
          { type: "high", ...high1, height: high1H },
          { type: "low",  ...low2,  height: low2H },
          { type: "high", ...high2, height: high2H }
        ]
      };
    });

    const dayWidthPx = 248; // Largura por dia para caberem 3 dias completos na janela inicial (como na referência)
    const endCapWidthPx = allDaysLoaded ? 190 : 0;
    const totalTrackWidthPx = visibleDays.length * dayWidthPx + endCapWidthPx;
    const plotHeightPx = 138;
    const maxTideMeters = 2.4;

    // Função matemática contínua da altura da maré (m) em função de (diaIdx + hora/24)
    const getTideHeightAt = (globalHours) => {
      // Dois ciclos semidiurnos por dia (~12.42h de período)
      const rad = ((globalHours - 2.1) / 12.42) * 2 * Math.PI;
      return +(1.32 - 0.48 * Math.cos(rad)).toFixed(2);
    };
    const isTideRisingAt = (globalHours) => {
      return getTideHeightAt(globalHours + 0.15) >= getTideHeightAt(globalHours - 0.15);
    };

    // Constrói os polígonos SVG bicolores (Enchendo = #00E5FF | Vazante = #0284C7) ao longo dos dias visíveis
    const totalHours = visibleDays.length * 24;
    const stepHours = 0.5; // 1 ponto a cada 30 min
    const svgSegments = [];
    let currentSegmentPoints = [];
    let currentRising = isTideRisingAt(0);

    for (let h = 0; h <= totalHours; h += stepHours) {
      const x = (h / 24) * dayWidthPx;
      const m = getTideHeightAt(h);
      const y = plotHeightPx - (m / maxTideMeters) * plotHeightPx;
      const rising = isTideRisingAt(h);

      currentSegmentPoints.push({ x, y, m, h });

      if (rising !== currentRising || h === totalHours) {
        if (currentSegmentPoints.length >= 2) {
          const firstX = currentSegmentPoints[0].x.toFixed(1);
          const lastX = currentSegmentPoints[currentSegmentPoints.length - 1].x.toFixed(1);
          const polyPts = currentSegmentPoints.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");
          const fillColor = currentRising ? "#00E5FF" : "#0284C7";
          svgSegments.push(`
            <polygon points="${firstX},${plotHeightPx} ${polyPts} ${lastX},${plotHeightPx}" fill="${fillColor}" fill-opacity="0.92" />
            <polyline points="${polyPts}" fill="none" stroke="#e0f2fe" stroke-width="1.5" />
          `);
        }
        const lastPt = currentSegmentPoints[currentSegmentPoints.length - 1];
        currentSegmentPoints = [lastPt];
        currentRising = rising;
      }
    }

    // Posição do marcador vermelho de hora/altura atual (ex: TERÇA 17 às 20:30h -> 1.7 m)
    const markerGlobalHours = state.cursorDayIdx * 24 + state.cursorHourFloat;
    const markerX = (markerGlobalHours / 24) * dayWidthPx;
    const markerMeters = getTideHeightAt(markerGlobalHours);
    const markerY = plotHeightPx - (markerMeters / maxTideMeters) * plotHeightPx;
    const markerHH = String(Math.floor(state.cursorHourFloat)).padStart(2, "0");
    const markerMM = String(Math.round((state.cursorHourFloat % 1) * 60)).padStart(2, "0");
    const markerTimeStr = `${markerHH}:${markerMM === "60" ? "00" : markerMM}h`;

    // Constrói o SVG da Mini-Strip de 8 dias na base
    const miniDays = ALL_FORECAST_DAYS.slice(0, 8);
    const miniCurvePts = [];
    for (let h = 0; h <= miniDays.length * 24; h += 1.5) {
      const mx = (h / (miniDays.length * 24)) * 800;
      const mm = getTideHeightAt(h);
      const my = 44 - (mm / 2.4) * 38;
      miniCurvePts.push(`${mx.toFixed(1)},${my.toFixed(1)}`);
    }

    containerEl.innerHTML = `
      <div class="dsysa-wave-panel mt-4" style="--border-gradient: linear-gradient(135deg, rgba(0, 229, 255, 0.32), rgba(2, 132, 199, 0.06)); --border-radius-before: 16px;">
        <!-- TOP HEADER: ALTURA DA MARÉ -->
        <div class="dsysa-wave-topbar">
          <div class="dsysa-wave-topbar-title">
            <span class="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00e5ff]"></span>
            <span>ALTURA DA MARÉ</span>
            <span class="text-[11px] font-inter font-normal text-cyan-300/90 ml-2 hidden sm:inline">
              · Tábua de Marés & Horas dos Astros
            </span>
          </div>
          <div class="flex items-center gap-3">
            <span class="dsysa-tide-readout text-[11px] font-mono text-cyan-300 hidden md:inline">
              Toque na curva ou arraste horizontalmente p/ ver os próximos dias →
            </span>
            <button type="button" class="dsysa-TideCollapseBtn flex h-6 w-6 items-center justify-center rounded bg-slate-800/90 border border-white/10 text-slate-200 hover:text-white text-xs">
              ${state.collapsed ? "▼" : "▲"}
            </button>
          </div>
        </div>

        <div class="${state.collapsed ? "hidden" : "block"}">
          <!-- HARBOR PIN BAR: 📍 porto de salvador -->
          <div class="dsysa-tide-harbor-bar">
            <div class="dsysa-tide-harbor-pin">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="text-sky-400">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>
              </svg>
              <span>${harborName}</span>
            </div>
            <div class="flex items-center gap-3 text-[11px] text-slate-300">
              <span class="inline-flex items-center gap-1.5">
                <span class="h-2.5 w-2.5 rounded-sm bg-[#00E5FF]"></span> Enchendo
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="h-2.5 w-2.5 rounded-sm bg-[#0284C7]"></span> Vazante
              </span>
            </div>
          </div>

          ${
            state.viewMode === "graficos"
              ? `
          <!-- MODO 1: GRÁFICO SENOIDAL + HORAS DOS ASTROS + CAIXAS PREAMAR/BAIXAMAR -->
          <div class="dsysa-tide-matrix-wrap">
            <!-- LEFT Y-AXIS (Horas dos astros + 2m / 1m / 0m) -->
            <div class="dsysa-tide-yaxis">
              <div class="dsysa-wave-yaxis-spacer"></div>
              <div class="dsysa-tide-astro-label">
                <span>Horas dos<br>astros</span>
              </div>
              <div class="dsysa-tide-meters-ticks">
                <div>— 2 —<span class="block text-[9px] text-slate-500">m</span></div>
                <div>— 1 —<span class="block text-[9px] text-slate-500">m</span></div>
                <div>— 0 —<span class="block text-[9px] text-slate-500">m</span></div>
              </div>
              <div style="height: 82px; border-top: 1px solid rgba(255,255,255,0.06); background: rgba(2,6,23,0.95);"></div>
            </div>

            <!-- SCROLLABLE MULTI-DAY TIDE & ASTRONOMY VIEWPORT -->
            <div class="dsysa-wave-viewport">
              <div class="dsysa-wave-canvas-grid" style="width: ${totalTrackWidthPx}px;">
                <!-- DAY HEADERS ROW: Ontem | TERÇA 17 | QUARTA 18 ... -->
                <div class="dsysa-wave-days-row" style="grid-template-columns: repeat(${dayTideData.length}, ${dayWidthPx}px) ${allDaysLoaded ? `${endCapWidthPx}px` : ""};">
                  ${dayTideData
                    .map(
                      (d) => `
                    <div class="dsysa-wave-day-cell ${d.isPast ? "is-past" : ""} ${d.isToday ? "is-today" : ""}">
                      <span>${d.fullHeaderLabel}</span>
                    </div>
                  `
                    )
                    .join("")}
                  ${allDaysLoaded ? `<div class="dsysa-wave-day-cell" style="background: rgba(245, 158, 11, 0.16); color: #fde68a; font-size: 10px;">LIMITE DA PREVISÃO</div>` : ""}
                </div>

                <!-- ASTRONOMY + TIDE CURVE AREA -->
                <div class="relative flex" style="height: 250px;">
                  ${dayTideData
                    .map(
                      (d, dIdx) => `
                    <div class="dsysa-tide-day-col relative shrink-0" style="width: ${dayWidthPx}px; height: 250px;">
                      <!-- Faixas verticais Noite (0-6h) | Dia (6-18h) | Noite (18-24h) -->
                      <div class="absolute inset-0 flex pointer-events-none">
                        <div class="w-1/4 h-full" style="background: rgba(15, 23, 42, 0.65);"></div>
                        <div class="w-2/4 h-full" style="background: rgba(20, 184, 166, 0.18);"></div>
                        <div class="w-1/4 h-full" style="background: rgba(15, 23, 42, 0.65);"></div>
                      </div>

                      <!-- HORAS DOS ASTROS (Topo: 112px de altura) -->
                      <div class="relative z-10 h-[112px] w-full text-[10px] font-semibold text-slate-100">
                        <!-- Nascer do Sol (4:57h) -->
                        <div class="absolute left-[18%] top-2 flex flex-col items-center">
                          <svg width="24" height="18" viewBox="0 0 24 18" fill="none" stroke="#f8fafc" stroke-width="1.6">
                            <path d="M12 2v3M5 5l2 2M19 5l-2 2M3 11h18"/>
                            <path d="M8 11a4 4 0 0 1 8 0" fill="#f8fafc"/>
                            <polygon points="12,13 8,17 16,17" fill="#f8fafc" stroke="none"/>
                          </svg>
                          <span class="mt-0.5">${d.sunrise}</span>
                        </div>

                        <!-- Fase da Lua Central (ex: crescente) -->
                        <div class="absolute left-1/2 -translate-x-1/2 top-2 flex flex-col items-center">
                          <div class="w-6 h-6 rounded-full border border-slate-300 overflow-hidden flex bg-slate-950 shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                            <div class="w-1/2 h-full bg-slate-950"></div>
                            <div class="w-1/2 h-full bg-slate-100"></div>
                          </div>
                          ${d.moonPhaseLabel ? `<span class="mt-0.5 text-[9.5px] text-amber-200 font-bold">${d.moonPhaseLabel}</span>` : ""}
                        </div>

                        <!-- Pôr do Sol (17:40h / 17:41h) -->
                        <div class="absolute right-[16%] top-2 flex flex-col items-center">
                          <svg width="24" height="18" viewBox="0 0 24 18" fill="none" stroke="#f8fafc" stroke-width="1.6">
                            <path d="M12 2v3M5 5l2 2M19 5l-2 2M3 11h18"/>
                            <path d="M8 11a4 4 0 0 1 8 0" fill="#f8fafc"/>
                            <polygon points="12,17 8,13 16,13" fill="#f8fafc" stroke="none"/>
                          </svg>
                          <span class="mt-0.5">${d.sunset}</span>
                        </div>

                        <!-- Nascer da Lua (ex: 10:42h / 11:30h) -->
                        <div class="absolute left-[46%] -translate-x-1/2 bottom-2 flex flex-col items-center">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="1.8">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                          </svg>
                          <span class="text-[8px] leading-none">▲</span>
                          <span>${d.moonRise}</span>
                        </div>

                        <!-- Pôr da Lua (ex: 23:35h / 00:12h) -->
                        <div class="absolute right-[4%] bottom-2 flex flex-col items-center">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="1.8">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                          </svg>
                          <span class="text-[8px] leading-none">▼</span>
                          <span>${d.moonSet}</span>
                        </div>
                      </div>
                    </div>
                  `
                    )
                    .join("")}

                  ${
                    allDaysLoaded
                      ? `
                    <div class="dsysa-end-cap-col shrink-0" style="width: ${endCapWidthPx}px; height: 250px;">
                      <span class="text-base mb-1">⏳</span>
                      <p class="text-[11px] font-semibold text-amber-200 leading-snug">
                        Neste momento só temos previsão até<br>
                        <strong class="text-amber-300 underline decoration-amber-400/50">${LAST_FORECAST_DATE_LABEL}</strong>
                      </p>
                      <span class="mt-2 text-[9.5px] text-slate-400">Efemérides astronômicas</span>
                    </div>
                  `
                      : ""
                  }

                  <!-- CAMADA SVG CONTÍNUA DA CURVA DE MARÉ BICOLOR (Posição bottom: 0, height: 138px) -->
                  <div class="absolute left-0 bottom-0 pointer-events-auto cursor-crosshair" id="dsysaTideSvgInteractive" style="width: ${visibleDays.length * dayWidthPx}px; height: ${plotHeightPx}px;">
                    <!-- Linhas tracejadas de 2m e 1m -->
                    <div class="dsysa-wave-gridline major" style="bottom: ${((2.0 / maxTideMeters) * 100).toFixed(1)}%;"></div>
                    <div class="dsysa-wave-gridline major" style="bottom: ${((1.0 / maxTideMeters) * 100).toFixed(1)}%;"></div>

                    <svg width="${visibleDays.length * dayWidthPx}" height="${plotHeightPx}" viewBox="0 0 ${visibleDays.length * dayWidthPx} ${plotHeightPx}" class="overflow-visible">
                      ${svgSegments.join("")}

                      <!-- Linha vertical tracejada vermelha + Triângulo no ponto ativo (20:30h 1.7m) -->
                      <line x1="${markerX.toFixed(1)}" y1="${(markerY - 22).toFixed(1)}" x2="${markerX.toFixed(1)}" y2="${plotHeightPx}"
                            stroke="#f43f5e" stroke-width="1.8" stroke-dasharray="3 3" />
                      <polygon points="${markerX.toFixed(1)},${(markerY - 5).toFixed(1)} ${(markerX - 5).toFixed(1)},${(markerY + 5).toFixed(1)} ${(markerX + 5).toFixed(1)},${(markerY + 5).toFixed(1)}"
                               fill="#be123c" stroke="#ffffff" stroke-width="1.2" />
                    </svg>

                    <!-- Callout Vermelho: 20:30h / 1.7 m -->
                    <div class="dsysa-tide-now-callout absolute -translate-x-1/2"
                         style="left: ${markerX.toFixed(1)}px; top: ${Math.max(-28, markerY - 48).toFixed(1)}px;">
                      <div>${markerTimeStr}</div>
                      <div>${markerMeters.toFixed(1)} m</div>
                    </div>
                  </div>
                </div>

                <!-- EIXO X DE HORAS (0h 3h 6h 9h 12h 15h 18h 21h) + 2 LINHAS DE BADGES (PREAMAR E BAIXAMAR) -->
                <div class="relative flex bg-slate-950 border-t border-white/15" style="height: 82px;">
                  ${dayTideData
                    .map(
                      (d) => `
                    <div class="relative shrink-0 border-r border-white/15" style="width: ${dayWidthPx}px; height: 82px;">
                      <!-- Horas de 3 em 3h -->
                      <div class="grid grid-cols-8 text-[9.5px] text-slate-400 font-medium pt-1 text-center">
                        <span>0h</span><span>3h</span><span>6h</span><span>9h</span><span>12h</span><span>15h</span><span>18h</span><span>21h</span>
                      </div>

                      <!-- Badges de Preamar (Linha Superior Ciano #00E5FF) e Baixamar (Linha Inferior Azul #0284C7) -->
                      ${d.extrema
                        .map((ex) => {
                          const leftPct = Math.min(88, Math.max(12, (ex.hourFloat / 24) * 100));
                          const isHigh = ex.type === "high";
                          return `
                            <div class="${isHigh ? "dsysa-tide-badge-high" : "dsysa-tide-badge-low"} absolute -translate-x-1/2"
                                 style="left: ${leftPct.toFixed(1)}%; top: ${isHigh ? "20px" : "48px"};">
                              <div>${ex.str}</div>
                              <div>${ex.height.toFixed(1)} m</div>
                            </div>
                          `;
                        })
                        .join("")}
                    </div>
                  `
                    )
                    .join("")}
                </div>
              </div>
            </div>
          </div>

          <!-- MINI-MAPA PANORÂMICO DE 8 DIAS (ONTEM | TER 17 | QUA 18 | QUI 19 | SEX 20 | SAB 21 | DOM 22 | SEG 23) -->
          <div class="dsysa-tide-ministrip-wrap">
            <div class="grid grid-cols-8 text-[9.5px] font-bold text-center border-b border-white/10">
              ${miniDays
                .map(
                  (md, idx) => `
                <button type="button" data-jump-day="${idx}" class="py-1 px-1 truncate transition-colors ${
                    idx === 0
                      ? "bg-[#072238] text-white"
                      : idx <= 2
                      ? "bg-sky-500/20 text-sky-300"
                      : "bg-slate-900/90 text-slate-300 hover:text-white"
                  } border-r border-white/10 last:border-r-0">
                  ${md.label.toUpperCase()}
                </button>
              `
                )
                .join("")}
            </div>
            <div class="relative h-12 w-full bg-gradient-to-r from-teal-900/35 via-sky-900/25 to-slate-900/60">
              <svg width="100%" height="48" viewBox="0 0 800 48" preserveAspectRatio="none">
                <polyline points="${miniCurvePts.join(" ")}" fill="none" stroke="#00E5FF" stroke-width="2.2" />
              </svg>
            </div>
          </div>
          `
              : state.viewMode === "tabelas"
              ? `
          <!-- MODO 2: TABELA DETALHADA DE MARÉS E ASTROS -->
          <div class="p-4 overflow-x-auto dsysa-touch-scroll">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-white/10 text-[10px] uppercase tracking-wider text-sky-300">
                  <th class="py-2 px-3">Dia</th>
                  <th class="py-2 px-3">1ª Baixamar</th>
                  <th class="py-2 px-3">1ª Preamar</th>
                  <th class="py-2 px-3">2ª Baixamar</th>
                  <th class="py-2 px-3">2ª Preamar</th>
                  <th class="py-2 px-3">Sol (Nascer / Pôr)</th>
                  <th class="py-2 px-3">Lua (Nascer / Pôr)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 text-slate-200">
                ${dayTideData
                  .map(
                    (d) => `
                  <tr class="hover:bg-white/5">
                    <td class="py-2.5 px-3 font-semibold text-white">${d.fullHeaderLabel} <span class="text-slate-400 font-normal">(${d.fullDate})</span></td>
                    <td class="py-2.5 px-3"><span class="dsysa-tide-badge-low inline-block">${d.extrema[0].str} · ${d.extrema[0].height}m</span></td>
                    <td class="py-2.5 px-3"><span class="dsysa-tide-badge-high inline-block">${d.extrema[1].str} · ${d.extrema[1].height}m</span></td>
                    <td class="py-2.5 px-3"><span class="dsysa-tide-badge-low inline-block">${d.extrema[2].str} · ${d.extrema[2].height}m</span></td>
                    <td class="py-2.5 px-3"><span class="dsysa-tide-badge-high inline-block">${d.extrema[3].str} · ${d.extrema[3].height}m</span></td>
                    <td class="py-2.5 px-3 text-amber-300">☀️ ${d.sunrise} / ${d.sunset}</td>
                    <td class="py-2.5 px-3 text-indigo-300">🌙 ${d.moonRise} / ${d.moonSet}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          `
              : `
          <!-- MODO 3: VISÃO MENSAL DE COEFICIENTES E FASES DA LUA -->
          <div class="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="rounded-xl bg-slate-900/80 border border-white/10 p-3 text-center">
              <div class="text-xl mb-1">🌑</div>
              <div class="text-xs font-bold text-white">Lua Nova · Sizígia</div>
              <div class="text-[11px] text-cyan-300 mt-1">Amplitude: 0.2m → 2.3m</div>
            </div>
            <div class="rounded-xl bg-sky-500/15 border border-sky-400/40 p-3 text-center">
              <div class="text-xl mb-1">🌓</div>
              <div class="text-xs font-bold text-sky-300">Lua Crescente (Atual)</div>
              <div class="text-[11px] text-slate-200 mt-1">Amplitude: 0.8m → 1.8m</div>
            </div>
            <div class="rounded-xl bg-slate-900/80 border border-white/10 p-3 text-center">
              <div class="text-xl mb-1">🌕</div>
              <div class="text-xs font-bold text-white">Lua Cheia · Maré Viva</div>
              <div class="text-[11px] text-emerald-300 mt-1">Amplitude: 0.1m → 2.4m</div>
            </div>
            <div class="rounded-xl bg-slate-900/80 border border-white/10 p-3 text-center">
              <div class="text-xl mb-1">🌗</div>
              <div class="text-xs font-bold text-white">Lua Minguante</div>
              <div class="text-[11px] text-slate-300 mt-1">Amplitude: 0.7m → 1.7m</div>
            </div>
          </div>
          `
          }

          <!-- SELETOR INFERIOR: GRÁFICOS | TABELAS | MÊS -->
          <div class="dsysa-tide-mode-bar">
            <div class="dsysa-tide-mode-group">
              <button type="button" data-tidemode="graficos" class="dsysa-tide-mode-btn ${state.viewMode === "graficos" ? "active" : ""}">
                GRÁFICOS
              </button>
              <button type="button" data-tidemode="tabelas" class="dsysa-tide-mode-btn ${state.viewMode === "tabelas" ? "active" : ""}">
                TABELAS
              </button>
              <button type="button" data-tidemode="mes" class="dsysa-tide-mode-btn ${state.viewMode === "mes" ? "active" : ""}">
                MÊS
              </button>
            </div>
          </div>

          <!-- INFINITE HORIZONTAL SCROLL STATUS & END-OF-FORECAST MESSAGE -->
          <div class="dsysa-scroll-status-bar ${state.reachedEnd ? "at-end" : ""}">
            <div class="flex items-center gap-2">
              <span class="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
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

    if (viewport) {
      window.attachDsySAInfiniteTouchScroll(
        viewport,
        state,
        ALL_FORECAST_DAYS.length,
        () => window.renderDsySATideChart(containerEl, spotConfig),
        statusBar,
        endBanner
      );
    }

    // Interatividade no clique/toque sobre a curva de maré para reposicionar o marcador vermelho (20:30h 1.7m)
    const svgArea = containerEl.querySelector("#dsysaTideSvgInteractive");
    const readout = containerEl.querySelector(".dsysa-tide-readout");
    if (svgArea) {
      svgArea.addEventListener("click", (ev) => {
        const rect = svgArea.getBoundingClientRect();
        const clickX = ev.clientX - rect.left;
        const totalHoursClicked = (clickX / dayWidthPx) * 24;
        const dayIdx = Math.max(0, Math.min(visibleDays.length - 1, Math.floor(totalHoursClicked / 24)));
        const hrFloat = Math.max(0, Math.min(23.75, totalHoursClicked % 24));
        state.cursorDayIdx = dayIdx;
        state.cursorHourFloat = hrFloat;
        window.renderDsySATideChart(containerEl, spotConfig);
      });
      svgArea.addEventListener("mousemove", (ev) => {
        if (!readout) return;
        const rect = svgArea.getBoundingClientRect();
        const hoverX = Math.max(0, ev.clientX - rect.left);
        const gHours = (hoverX / dayWidthPx) * 24;
        const dIdx = Math.min(visibleDays.length - 1, Math.floor(gHours / 24));
        const hFloat = gHours % 24;
        const hh = String(Math.floor(hFloat)).padStart(2, "0");
        const mm = String(Math.floor((hFloat % 1) * 60)).padStart(2, "0");
        const mVal = getTideHeightAt(gHours);
        const rising = isTideRisingAt(gHours);
        readout.classList.remove("hidden");
        readout.textContent = `${visibleDays[dIdx].label} (${hh}:${mm}h) → Maré: ${mVal.toFixed(1)}m (${rising ? "Enchendo ↑" : "Vazante ↓"})`;
      });
    }

    // Mini-mapa: pular para o dia clicado
    containerEl.querySelectorAll("[data-jump-day]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetDay = parseInt(btn.getAttribute("data-jump-day"), 10);
        if (targetDay >= state.loadedDaysCount) {
          state.loadedDaysCount = Math.min(ALL_FORECAST_DAYS.length, targetDay + 2);
        }
        state.savedScrollLeft = Math.max(0, (targetDay - 1) * dayWidthPx);
        window.renderDsySATideChart(containerEl, spotConfig);
      });
    });

    // Alternar entre GRÁFICOS | TABELAS | MÊS
    containerEl.querySelectorAll("[data-tidemode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.viewMode = btn.getAttribute("data-tidemode");
        window.renderDsySATideChart(containerEl, spotConfig);
      });
    });

    // Recolher / Expandir
    const collapseBtn = containerEl.querySelector(".dsysa-TideCollapseBtn");
    if (collapseBtn) {
      collapseBtn.addEventListener("click", () => {
        state.collapsed = !state.collapsed;
        window.renderDsySATideChart(containerEl, spotConfig);
      });
    }
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

  /* ==========================================================================
     9. ENGINE DE BACKGROUND DINÂMICO REATIVO AO CLIMA (DsySA Weather Aura)
     (sunny | partly_cloudy | rainy | thunderstorm)
     ========================================================================== */
  window.mountDsySAWeatherStage = function () {
    let stage = document.getElementById("dsysaWeatherStage");
    if (stage) return stage;
    stage = document.createElement("div");
    stage.id = "dsysaWeatherStage";
    stage.className = "dsysa-weather-stage weather-sunny";
    stage.innerHTML = `
      <!-- Sol Amarelo Radiante (Ensolarado & Parcialmente Nublado) -->
      <div class="dsysa-sun-orb"></div>
      <div class="dsysa-sun-core"></div>

      <!-- Camada de Nuvens Translúcidas (Parcialmente Nublado, Chuvoso & Tempestade) -->
      <div class="dsysa-clouds-layer">
        <div class="dsysa-cloud-blob" style="top: 4%; right: 6%; width: 520px; height: 180px;"></div>
        <div class="dsysa-cloud-blob" style="top: 10%; left: 10%; width: 620px; height: 210px;"></div>
        <div class="dsysa-cloud-blob" style="top: 22%; right: 25%; width: 480px; height: 160px;"></div>
      </div>

      <!-- Camada de Chuva Diagonal (Chuvoso & Chuva com Raios) -->
      <div class="dsysa-rain-layer"></div>

      <!-- Camada de Piscar de Raios / Relâmpagos (Chuva com Raios) -->
      <div class="dsysa-lightning-overlay"></div>
      <svg class="dsysa-lightning-svg" viewBox="0 0 200 360" fill="none">
        <path d="M115 0 L65 130 L110 135 L50 260 L95 260 L35 360 L135 235 L90 235 L150 115 L102 110 Z"
              fill="rgba(224, 242, 254, 0.92)" stroke="#38bdf8" stroke-width="2"></path>
      </svg>
    `;
    document.body.prepend(stage);
    return stage;
  };

  window.inferDsySAWeatherMode = function (weatherText) {
    const t = (weatherText || "").toLowerCase();
    if (t.includes("raio") || t.includes("tempestade") || t.includes("trovoada") || t.includes("⛈")) {
      return "thunderstorm";
    }
    if (t.includes("chuv") || t.includes("🌧")) {
      return "rainy";
    }
    if (t.includes("parcial") || t.includes("nuven") || t.includes("nublado") || t.includes("⛅")) {
      return "partly_cloudy";
    }
    return "sunny";
  };

  window.setDsySAWeatherBackground = function (modeOrText) {
    const stage = window.mountDsySAWeatherStage();
    const validModes = ["sunny", "partly_cloudy", "rainy", "thunderstorm"];
    const mode = validModes.includes(modeOrText)
      ? modeOrText
      : window.inferDsySAWeatherMode(modeOrText);

    stage.className = `dsysa-weather-stage weather-${mode}`;
    window.__currentDsySAWeather = mode;

    // Atualiza botões seletores de clima na interface (se presentes)
    document.querySelectorAll("[data-weather-btn]").forEach((btn) => {
      const bMode = btn.getAttribute("data-weather-btn");
      if (bMode === mode) {
        btn.classList.add("ring-2", "ring-sky-400", "bg-white/15", "text-white");
      } else {
        btn.classList.remove("ring-2", "ring-sky-400", "bg-white/15", "text-white");
      }
    });

    const labels = {
      sunny: "☀️ Ensolarado (BG Azulado + Amarelo Sol)",
      partly_cloudy: "⛅ Parcialmente Nublado (BG Azul Suave + Sol & Nuvens)",
      rainy: "🌧️ Chuvoso (BG Acinzentado + Chuva)",
      thunderstorm: "⛈️ Chuva com Raios (BG Tempestade + Piscar de Raios)"
    };
    const badge = document.getElementById("activeWeatherBgLabel");
    if (badge) {
      badge.textContent = labels[mode] || labels.sunny;
    }
    return mode;
  };

  document.addEventListener("DOMContentLoaded", () => {
    window.mountDsySAWeatherStage();
    window.initDsySAAnimations();
    document.querySelectorAll(".dsysa-touch-scroll").forEach((el) => {
      window.enableDsySAHorizontalTouchDrag(el);
    });
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });
})();
