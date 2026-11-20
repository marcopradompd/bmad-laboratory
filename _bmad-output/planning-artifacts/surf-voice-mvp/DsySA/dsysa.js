/**
 * DsySA — Design System SurfAgent v1.4 (Clean Edition)
 * Motor JS: Ondas/Período + Energia das Ondas + Vento de Superfície + Tábua de Marés + Background Climático
 * Com Scroll Horizontal Infinito (Toque Mobile + Mouse Drag + Wheel)
 */

(function () {
  window.initDsySAAnimations = function () {};
  window.initDsySAAuraBackground = function () {};

  /* 3. Calendário Compartilhado de Previsão Dinâmica a Partir de HOJE */
  function getTodayIsoDate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function generateDynamicForecastDays(count = 14) {
    const dayNames = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
    const fullDayNames = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
    const days = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const dayOfWeek = d.getDay();
      const dayNum = d.getDate();
      const monthNum = d.getMonth() + 1;
      const formattedDate = `${String(dayNum).padStart(2, "0")}/${String(monthNum).padStart(2, "0")}`;
      const dateStr = `${d.getFullYear()}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      days.push({
        dateStr,
        label: i === 0 ? "Hoje" : `${dayNames[dayOfWeek]} ${dayNum}`,
        fullDate: `${fullDayNames[dayOfWeek]} ${formattedDate}`,
        isToday: i === 0,
        isPast: false,
        points: []
      });
    }
    return days;
  }

  const ALL_FORECAST_DAYS = generateDynamicForecastDays(14);
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
    N: 180,
    NNE: 202,
    NE: 225,
    ENE: 247,
    E: 270,
    L: 270,
    ESE: 292,
    SE: 315,
    SSE: 337,
    S: 0,
    SSW: 22,
    SSO: 22,
    SW: 45,
    SO: 45,
    WSW: 67,
    OSO: 67,
    W: 90,
    O: 90,
    WNW: 112,
    ONO: 112,
    NW: 135,
    NO: 135,
    NNW: 157,
    NNO: 157
  };

  /* Helper Universal: Extração Dinâmica de Dias e Slots da Previsão (Open-Meteo) a partir de HOJE */
  function getDsySAFiniteDays(spotConfig) {
    const todayStr = getTodayIsoDate();
    if (spotConfig?.forecastData?.timeline && spotConfig.forecastData.timeline.length > 0) {
      const timeline = spotConfig.forecastData.timeline;
      const daysMap = new Map();
      const dayNames = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
      const fullDayNames = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

      timeline.forEach((pt) => {
        const dateStr = pt.timestamp.slice(0, 10);
        // Exibe apenas a partir de HOJE em diante, descartando qualquer dia passado
        if (dateStr < todayStr) return;

        if (!daysMap.has(dateStr)) {
          const [y, m, d] = dateStr.split("-").map(Number);
          const dateObj = new Date(y, m - 1, d);
          const dayOfWeek = dateObj.getDay();
          const isToday = dateStr === todayStr;
          const formattedDate = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
          daysMap.set(dateStr, {
            dateStr,
            label: isToday ? "Hoje" : `${dayNames[dayOfWeek]} ${d}`,
            fullDate: `${fullDayNames[dayOfWeek]} ${formattedDate}`,
            isToday,
            isPast: false,
            points: []
          });
        }
        daysMap.get(dateStr).points.push(pt);
      });

      if (daysMap.size > 0) {
        return Array.from(daysMap.values());
      }
    }
    return generateDynamicForecastDays(14);
  }

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

    const allDays = getDsySAFiniteDays(spotConfig);
    const visibleDays = allDays.slice(0, state.loadedDaysCount);
    const allDaysLoaded = state.loadedDaysCount >= allDays.length;
    const lastDateLabel = allDays[allDays.length - 1]?.fullDate || LAST_FORECAST_DATE_LABEL;

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
        let rawH, rawP, dirCode, angle, energyKj;

        if (day.points && day.points.length > 0) {
          const targetHourInt = parseInt(hr, 10);
          const pt = day.points.find(p => parseInt(p.timestamp.slice(11, 13), 10) === targetHourInt) ||
            day.points[Math.min(day.points.length - 1, hIdx * 6)];

          if (state.subTab === "swellA") {
            rawH = pt.swell.primary.heightM || 0.8;
            rawP = pt.swell.primary.periodS || 9;
            dirCode = pt.swell.primary.directionCardinal || "SE";
            angle = pt.swell.primary.directionDeg !== null ? pt.swell.primary.directionDeg : 135;
          } else if (state.subTab === "swellB") {
            rawH = pt.swell.secondary.heightM || 0.4;
            rawP = pt.swell.secondary.periodS || 8;
            dirCode = pt.swell.secondary.directionCardinal || "E";
            angle = pt.swell.secondary.directionDeg !== null ? pt.swell.secondary.directionDeg : 90;
          } else if (state.subTab === "vagas") {
            rawH = Math.max(0.2, Number(((pt.swell.totalHeightM || 1.0) - ((pt.swell.primary.heightM || 0.7) * 0.75)).toFixed(1)));
            rawP = Math.max(4, Math.round((pt.swell.primary.periodS || 10) * 0.55));
            dirCode = pt.wind.directionCardinal || "E";
            angle = pt.wind.directionDeg !== null ? pt.wind.directionDeg : 90;
          } else {
            rawH = pt.swell.totalHeightM || 1.1;
            rawP = pt.swell.primary.periodS || 9;
            dirCode = pt.swell.primary.directionCardinal || "SE";
            angle = pt.swell.primary.directionDeg !== null ? pt.swell.primary.directionDeg : 135;
          }
          energyKj = Math.round(rawH * rawH * rawP * 28);
        } else {
          const waveEnvelope = Math.sin((globalIdx / 22) * Math.PI) * 0.42 + 0.78;
          rawH = Math.max(
            0.3,
            Math.min(3.1, +(baseHeight * activeMod.hMult * waveEnvelope + (hIdx % 2 === 0 ? 0.08 : -0.05)).toFixed(1))
          );
          rawP = Math.max(
            4,
            Math.min(20, Math.round(basePeriod + activeMod.pDelta + Math.sin(globalIdx * 0.45) * 1.8))
          );
          dirCode = activeMod.dirOverride || (globalIdx % 5 === 0 ? "SE" : baseDir || "ESE");
          angle = DIR_ANGLES[dirCode] !== undefined ? DIR_ANGLES[dirCode] : 300;
          energyKj = Math.round(rawH * rawH * rawP * 28);
        }

        const now = new Date();
        const exactNowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const slotTime = hr.includes(':') ? hr : `${hr.replace('h', '').padStart(2, '0')}:00`;
        const isNowSlot = Boolean(day.isToday && (now.getHours() >= parseInt(hr, 10) && now.getHours() < parseInt(hr, 10) + 6));

        slots.push({
          dayLabel: day.label,
          fullDate: day.fullDate,
          hour: hr,
          displayTime: isNowSlot ? exactNowTime : slotTime,
          displayVal: (typeof rawH === "number" ? rawH : parseFloat(rawH || 1.5)).toFixed(1),
          band: bandTypes[hIdx],
          isDayEnd: hIdx === 3,
          isNow: isNowSlot,
          height: rawH,
          period: rawP,
          color: window.getDsySAPeriodColor(rawP),
          dir: dirCode,
          angle: angle,
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
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" aria-hidden="true">
              <path d="M2 7c1.2.9 2.4 1.3 4 1.3 3.2 0 3.2-2.6 6.4-2.6 3.2 0 3.2 2.6 6.4 2.6 1.6 0 2.4-.4 3.2-1.3"></path>
              <path d="M2 13c1.2.9 2.4 1.3 4 1.3 3.2 0 3.2-2.6 6.4-2.6 3.2 0 3.2 2.6 6.4 2.6 1.6 0 2.4-.4 3.2-1.3"></path>
              <path d="M2 19c1.2.9 2.4 1.3 4 1.3 3.2 0 3.2-2.6 6.4-2.6 3.2 0 3.2 2.6 6.4 2.6 1.6 0 2.4-.4 3.2-1.3"></path>
            </svg>
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
                      const isSelected = state.selectedSlotIdx === idx || (state.selectedSlotIdx === undefined && s.isNow);
                      const calloutPosStyle = heightPct > 82 ? "top: 2px;" : `bottom: calc(${heightPct.toFixed(1)}% + 3px);`;
                      return `
                        <div class="dsysa-wave-slot-col ${s.band} ${s.isDayEnd ? "day-divider" : ""} ${s.isNow ? "is-now" : ""} ${isSelected ? "is-selected" : ""}"
                             data-slot-idx="${idx}"
                             data-day="${s.dayLabel} (${s.fullDate})"
                             data-hour="${s.hour}"
                             data-time="${s.displayTime}"
                             data-height="${s.height}m"
                             data-period="${s.period}s"
                             data-dir="${s.dir}"
                             data-energy="${s.energy} kJ">
                          <div class="dsysa-bar-callout callout-wave" style="${calloutPosStyle}">
                            <span class="dsysa-bar-callout-time">${s.displayTime}</span>
                            <span class="dsysa-bar-callout-val wave-val">${s.displayVal}</span>
                          </div>
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
                        <strong class="text-amber-300 underline decoration-amber-400/50">${lastDateLabel}</strong>
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
              <span>Exibindo <strong>${visibleDays.length} de ${allDays.length} dias</strong> · Arraste com o dedo ou mouse</span>
            </div>
            <div class="dsysa-end-banner ${state.reachedEnd ? "dsysa-end-forecast-msg" : "hidden"}">
              <span>⚠️</span>
              <span>Neste momento só temos previsão até <strong>${lastDateLabel}</strong></span>
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
      allDays.length,
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
      const idx = parseInt(col.getAttribute("data-slot-idx"), 10);
      const selectSlot = () => {
        state.selectedSlotIdx = idx;
        containerEl.querySelectorAll(".dsysa-wave-slot-col").forEach(c => c.classList.remove("is-selected"));
        col.classList.add("is-selected");

        const d = col.getAttribute("data-day");
        const t = col.getAttribute("data-time") || col.getAttribute("data-hour");
        const m = col.getAttribute("data-height");
        const p = col.getAttribute("data-period");
        const dir = col.getAttribute("data-dir");
        const e = col.getAttribute("data-energy");
        if (readout) {
          readout.classList.remove("hidden");
          readout.textContent = `${d} (${t}) → Onda: ${m} | Período: ${p} | Direção: ${dir} | Energia: ${e}`;
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
      col.addEventListener("click", selectSlot);
      col.addEventListener("mouseenter", selectSlot);
      col.addEventListener("touchstart", selectSlot, { passive: true });
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

    const allDays = getDsySAFiniteDays(spotConfig);
    const visibleDays = allDays.slice(0, state.loadedDaysCount);
    const allDaysLoaded = state.loadedDaysCount >= allDays.length;
    const lastDateLabel = allDays[allDays.length - 1]?.fullDate || LAST_FORECAST_DATE_LABEL;

    // Configuração de conversão de unidades (base = Km/h, topo da escala = 55 Km/h)
    const UNIT_CONFIG = {
      kt:  { label: "KT",   factor: 0.539957, decimals: 0 },
      kmh: { label: "Km/h", factor: 1.0,      decimals: 0 },
      ms:  { label: "m/s",  factor: 0.277778, decimals: 1 },
      mph: { label: "mph",  factor: 0.621371, decimals: 0 }
    };
    const activeUnit = UNIT_CONFIG[state.unit] || UNIT_CONFIG.kmh;
    const zoneMultiplier = state.zone === "maritimo" ? 1.28 : 1.0;

    // Sequência de fallback caso a API ainda não tenha retornado
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
        let rawSustainedKmh, rawGustKmh, dirCode, arrowType, angle;

        if (day.points && day.points.length > 0) {
          const targetHourInt = parseInt(hr, 10);
          const pt = day.points.find(p => parseInt(p.timestamp.slice(11, 13), 10) === targetHourInt) ||
            day.points[Math.min(day.points.length - 1, hIdx * 6)];

          const knots = pt.wind?.speedKnots || 5;
          const gusts = pt.wind?.gustsKnots || (knots * 1.35);
          rawSustainedKmh = Math.round(knots * 1.852 * zoneMultiplier);
          rawGustKmh = Math.round(gusts * 1.852 * zoneMultiplier);
          dirCode = pt.wind?.directionCardinal || "E";
          angle = pt.wind?.directionDeg !== null && pt.wind?.directionDeg !== undefined ? pt.wind.directionDeg : 90;

          if (rawSustainedKmh <= 7) {
            arrowType = "fraco";
          } else if (['O', 'W', 'ONO', 'WNW', 'NO', 'NW', 'NNO', 'NNW', 'N'].includes(dirCode)) {
            arrowType = "terral";
          } else if (['ESE', 'SE', 'SSE', 'S'].includes(dirCode)) {
            arrowType = "maral";
          } else {
            arrowType = "cruzado";
          }
        } else {
          const pattern = windSequence[globalIdx % windSequence.length];
          rawSustainedKmh = Math.max(4, Math.min(40, Math.round((baseWindKmh + 8) * pattern.vMult * zoneMultiplier)));
          rawGustKmh = Math.max(rawSustainedKmh + 3, Math.min(50, Math.round((baseWindKmh + 10) * pattern.gMult * zoneMultiplier)));
          arrowType = rawSustainedKmh <= 7 ? "fraco" : pattern.type;
          dirCode = globalIdx === 6 ? baseWindDir : pattern.dir;
          angle = DIR_ANGLES[dirCode] !== undefined ? DIR_ANGLES[dirCode] : 180;
        }

        const convSustained = +(rawSustainedKmh * activeUnit.factor).toFixed(activeUnit.decimals);
        const convGust = +(rawGustKmh * activeUnit.factor).toFixed(activeUnit.decimals);

        const now = new Date();
        const exactNowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const slotTime = hr.includes(':') ? hr : `${hr.replace('h', '').padStart(2, '0')}:00`;
        const isNowSlot = Boolean(day.isToday && (now.getHours() >= parseInt(hr, 10) && now.getHours() < parseInt(hr, 10) + 6));

        slots.push({
          dayLabel: day.label,
          fullDate: day.fullDate,
          hour: hr,
          displayTime: isNowSlot ? exactNowTime : slotTime,
          displayVal: `${convSustained}${activeUnit.label.toLowerCase()}`,
          band: bandTypes[hIdx],
          isDayEnd: hIdx === 3,
          isNow: isNowSlot,
          sustainedKmh: rawSustainedKmh,
          gustKmh: rawGustKmh,
          convSustained,
          convGust,
          dir: dirCode,
          angle: angle,
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
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" aria-hidden="true">
              <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"></path>
              <path d="M9.6 4.6A2 2 0 1 1 11 8H2"></path>
              <path d="M12.6 19.4A2 2 0 1 0 14 16H2"></path>
            </svg>
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
                    .map((s, idx) => {
                      const totalHeightPct = Math.min(96, Math.max(8, (s.gustKmh / maxScaleKmh) * 100));
                      const sustainedRatioPct = Math.min(100, Math.max(25, (s.sustainedKmh / s.gustKmh) * 100));
                      const gustRatioPct = Math.max(0, 100 - sustainedRatioPct);
                      const isSelected = state.selectedSlotIdx === idx || (state.selectedSlotIdx === undefined && s.isNow);
                      const calloutPosStyle = totalHeightPct > 82 ? "top: 2px;" : `bottom: calc(${totalHeightPct.toFixed(1)}% + 3px);`;

                      return `
                        <div class="dsysa-wave-slot-col ${s.band} ${s.isDayEnd ? "day-divider" : ""} ${s.isNow ? "is-now" : ""} ${isSelected ? "is-selected" : ""}"
                             data-slot-idx="${idx}"
                             data-day="${s.dayLabel} (${s.fullDate})"
                             data-hour="${s.hour}"
                             data-time="${s.displayTime}"
                             data-wind="${s.convSustained} ${activeUnit.label}"
                             data-gust="${s.convGust} ${activeUnit.label}"
                             data-dir="${s.dir}"
                             data-type="${s.arrowType.toUpperCase()}">
                          <div class="dsysa-bar-callout callout-wind" style="${calloutPosStyle}">
                            <span class="dsysa-bar-callout-time">${s.displayTime}</span>
                            <span class="dsysa-bar-callout-val wind-val">${s.displayVal}</span>
                          </div>
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
                        <strong class="text-amber-300 underline decoration-amber-400/50">${lastDateLabel}</strong>
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
              <span>Exibindo <strong>${visibleDays.length} de ${allDays.length} dias</strong> · Arraste com o dedo ou mouse</span>
            </div>
            <div class="dsysa-end-banner ${state.reachedEnd ? "dsysa-end-forecast-msg" : "hidden"}">
              <span>⚠️</span>
              <span>Neste momento só temos previsão até <strong>${lastDateLabel}</strong></span>
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
      allDays.length,
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

    // Readout interativo e seleção ao clicar / tocar / hover nas barras de vento
    const readout = containerEl.querySelector(".dsysa-wind-readout");
    containerEl.querySelectorAll(".dsysa-wave-slot-col").forEach((col) => {
      const idx = parseInt(col.getAttribute("data-slot-idx"), 10);
      const selectWindSlot = () => {
        state.selectedSlotIdx = idx;
        containerEl.querySelectorAll(".dsysa-wave-slot-col").forEach(c => c.classList.remove("is-selected"));
        col.classList.add("is-selected");

        const d = col.getAttribute("data-day");
        const t = col.getAttribute("data-time") || col.getAttribute("data-hour");
        const w = col.getAttribute("data-wind");
        const g = col.getAttribute("data-gust");
        const dir = col.getAttribute("data-dir");
        const type = col.getAttribute("data-type");
        if (readout) {
          readout.classList.remove("hidden");
          readout.textContent = `${d} (${t}) → Vento: ${w} | Rajadas: ${g} | Direção: ${dir} (${type})`;
        }
      };
      col.addEventListener("click", selectWindSlot);
      col.addEventListener("mouseenter", selectWindSlot);
      col.addEventListener("touchstart", selectWindSlot, { passive: true });
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

    const allDays = getDsySAFiniteDays(spotConfig);
    const visibleDays = allDays.slice(0, state.loadedDaysCount);
    const allDaysLoaded = state.loadedDaysCount >= allDays.length;
    const lastDateLabel = allDays[allDays.length - 1]?.fullDate || LAST_FORECAST_DATE_LABEL;

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
        let rawKj, period, dirCode, angle;

        if (day.points && day.points.length > 0) {
          const targetHourInt = parseInt(hr, 10);
          const pt = day.points.find(p => parseInt(p.timestamp.slice(11, 13), 10) === targetHourInt) ||
            day.points[Math.min(day.points.length - 1, hIdx * 6)];

          let h = pt.swell.totalHeightM || 1.1;
          let p = pt.swell.primary.periodS || 9;
          dirCode = pt.swell.primary.directionCardinal || "SE";
          angle = pt.swell.primary.directionDeg !== null && pt.swell.primary.directionDeg !== undefined ? pt.swell.primary.directionDeg : 135;

          if (state.subTab === "swellA") {
            h = pt.swell.primary.heightM || 1.0;
            p = pt.swell.primary.periodS || 9;
          } else if (state.subTab === "swellB") {
            h = pt.swell.secondary.heightM || 0.4;
            p = pt.swell.secondary.periodS || 8;
            dirCode = pt.swell.secondary.directionCardinal || "E";
            angle = pt.swell.secondary.directionDeg !== null && pt.swell.secondary.directionDeg !== undefined ? pt.swell.secondary.directionDeg : 90;
          } else if (state.subTab === "vagas") {
            h = Math.max(0.2, Number((pt.swell.totalHeightM - (pt.swell.primary.heightM * 0.75)).toFixed(1)));
            p = Math.max(4, Math.round((pt.swell.primary.periodS || 10) * 0.55));
            dirCode = pt.wind.directionCardinal || "E";
            angle = pt.wind.directionDeg !== null && pt.wind.directionDeg !== undefined ? pt.wind.directionDeg : 90;
          }

          rawKj = Math.round(h * h * p * 28);
          period = p;
        } else {
          const envelope = Math.sin((globalIdx / 20) * Math.PI) * 0.55 + 0.72;
          rawKj = Math.max(
            65,
            Math.min(1350, Math.round(baseEnergyKj * activeMod.eMult * envelope + (hIdx % 2 === 0 ? 25 : -20)))
          );
          period = Math.max(5, Math.min(20, Math.round(basePeriod + activeMod.pDelta + Math.sin(globalIdx * 0.4) * 1.5)));
          dirCode = activeMod.dirOverride || (globalIdx % 5 === 0 ? "SE" : baseDir || "ESE");
          angle = DIR_ANGLES[dirCode] !== undefined ? DIR_ANGLES[dirCode] : 300;
        }

        const tier = window.getDsySAEnergyTier(rawKj);
        const now = new Date();
        const exactNowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const slotTime = hr.includes(':') ? hr : `${hr.replace('h', '').padStart(2, '0')}:00`;
        const isNowSlot = Boolean(day.isToday && (now.getHours() >= parseInt(hr, 10) && now.getHours() < parseInt(hr, 10) + 6));

        slots.push({
          dayLabel: day.label,
          fullDate: day.fullDate,
          hour: hr,
          displayTime: isNowSlot ? exactNowTime : slotTime,
          band: bandTypes[hIdx],
          isDayEnd: hIdx === 3,
          isNow: isNowSlot,
          kj: rawKj,
          displayVal: Math.round(rawKj * unitFactor),
          tierKey: tier.key,
          tierDesc: tier.desc,
          color: tier.bg,
          period,
          dir: dirCode,
          angle: angle
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
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" aria-hidden="true">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
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
                    .map((s, idx) => {
                      const heightPct = Math.min(92, Math.max(8, (s.kj / maxScaleKj) * 100));
                      const isSelected = state.selectedSlotIdx === idx || (state.selectedSlotIdx === undefined && s.isNow);
                      const calloutPosStyle = heightPct > 82 ? "top: 2px;" : `bottom: calc(${heightPct.toFixed(1)}% + 3px);`;

                      return `
                        <div class="dsysa-wave-slot-col ${s.band} ${s.isDayEnd ? "day-divider" : ""} ${s.isNow ? "is-now" : ""} ${isSelected ? "is-selected" : ""}"
                             data-slot-idx="${idx}"
                             data-day="${s.dayLabel} (${s.fullDate})"
                             data-hour="${s.hour}"
                             data-time="${s.displayTime}"
                             data-energy="${s.displayVal} ${unitLabel}"
                             data-tier="${s.tierKey}"
                             data-desc="${s.tierDesc}"
                             data-period="${s.period}s"
                             data-dir="${s.dir}">
                          <div class="dsysa-bar-callout callout-energy" style="${calloutPosStyle}">
                            <span class="dsysa-bar-callout-time">${s.displayTime}</span>
                            <span class="dsysa-bar-callout-val energy-val">${s.displayVal}</span>
                          </div>
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
                        <strong class="text-amber-300 underline decoration-amber-400/50">${lastDateLabel}</strong>
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
              <span>Exibindo <strong>${visibleDays.length} de ${allDays.length} dias</strong> · Arraste com o dedo ou mouse</span>
            </div>
            <div class="dsysa-end-banner ${state.reachedEnd ? "dsysa-end-forecast-msg" : "hidden"}">
              <span>⚠️</span>
              <span>Neste momento só temos previsão até <strong>${lastDateLabel}</strong></span>
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
      allDays.length,
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

    // Readout interativo e seleção ao clicar / tocar / hover nas barras de energia
    const readout = containerEl.querySelector(".dsysa-energy-readout");
    containerEl.querySelectorAll(".dsysa-wave-slot-col").forEach((col) => {
      const idx = parseInt(col.getAttribute("data-slot-idx"), 10);
      const selectEnergySlot = () => {
        state.selectedSlotIdx = idx;
        containerEl.querySelectorAll(".dsysa-wave-slot-col").forEach(c => c.classList.remove("is-selected"));
        col.classList.add("is-selected");

        const d = col.getAttribute("data-day");
        const t = col.getAttribute("data-time") || col.getAttribute("data-hour");
        const e = col.getAttribute("data-energy");
        const desc = col.getAttribute("data-desc");
        const p = col.getAttribute("data-period");
        const dir = col.getAttribute("data-dir");
        const tierKey = col.getAttribute("data-tier");

        if (readout) {
          readout.classList.remove("hidden");
          readout.textContent = `${d} (${t}) → Energia: ${e} (${desc}) | Período: ${p} | Direção: ${dir}`;
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
      col.addEventListener("click", selectEnergySlot);
      col.addEventListener("mouseenter", selectEnergySlot);
      col.addEventListener("touchstart", selectEnergySlot, { passive: true });
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

    const curHour = new Date().getHours() + new Date().getMinutes() / 60;
    const state = containerEl.__tideChartState || {
      viewMode: "graficos", // 'graficos' | 'tabelas' | 'mes'
      loadedDaysCount: 5,
      collapsed: false,
      savedScrollLeft: 0,
      reachedEnd: false,
      cursorDayIdx: 0,
      cursorHourFloat: +curHour.toFixed(2),
      cursorHeight: 1.5
    };
    containerEl.__tideChartState = state;

    const allDays = getDsySAFiniteDays(spotConfig);
    const visibleDays = allDays.slice(0, state.loadedDaysCount);
    const allDaysLoaded = state.loadedDaysCount >= allDays.length;
    const lastDateLabel = allDays[allDays.length - 1]?.fullDate || LAST_FORECAST_DATE_LABEL;

    // Gera dados astronômicos e extremos de maré reais (Open-Meteo) calibrados com a Marinha do Brasil
    const dayTideData = visibleDays.map((day, dIdx) => {
      let extrema = [];
      if (day.points && day.points.length > 0) {
        day.points.forEach((pt) => {
          if (pt.tide && pt.tide.type) {
            const h = parseInt(pt.timestamp.slice(11, 13), 10);
            const m = parseInt(pt.timestamp.slice(14, 16), 10) || 0;
            const hourFloat = pt.tide.hourFloat !== null && pt.tide.hourFloat !== undefined ? pt.tide.hourFloat : (h + m / 60);
            const nauticalHeight = pt.tide.peakNauticalHeightM || +(pt.tide.heightM + 1.25).toFixed(1);
            extrema.push({
              type: pt.tide.type === "HIGH" ? "high" : "low",
              str: pt.tide.exactTime || `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}h`,
              hourFloat: Math.max(0, Math.min(23.9, hourFloat)),
              height: Math.max(0.1, nauticalHeight)
            });
          }
        });
      }

      if (extrema.length === 0) {
        // Fallback astronômico harmônico preciso calibrado com a tábua da Marinha do Brasil (Salvador)
        const shiftMin = dIdx * 50; // Atraso lunar diário de ~50 min
        const fmtTime = (baseMinutes) => {
          const total = (baseMinutes + shiftMin) % (24 * 60);
          const hh = String(Math.floor(total / 60)).padStart(2, "0");
          const mm = String(total % 60).padStart(2, "0");
          return { str: `${hh}:${mm}h`, hourFloat: +(total / 60).toFixed(2) };
        };

        const ampCoeff = 0.55 + 0.35 * Math.sin((dIdx / 14) * Math.PI);
        const low1 = fmtTime(4 * 60 + 30);
        const high1 = fmtTime(11 * 60 + 10);
        const low2 = fmtTime(17 * 60 + 10);
        const high2 = fmtTime(23 * 60 + 15);

        extrema = [
          { type: "low",  ...low1,  height: +(1.25 - ampCoeff * 0.9).toFixed(1) },
          { type: "high", ...high1, height: +(1.25 + ampCoeff * 1.0).toFixed(1) },
          { type: "low",  ...low2,  height: +(1.25 - ampCoeff * 0.8).toFixed(1) },
          { type: "high", ...high2, height: +(1.25 + ampCoeff * 1.1).toFixed(1) }
        ];
      }

      // Ordena cronologicamente os extremos do dia
      extrema.sort((a, b) => a.hourFloat - b.hourFloat);

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
        moonRise: "10:42h",
        moonSet: "23:35h",
        extrema
      };
    });

    const dayWidthPx = 248; // Largura por dia para caberem 3 dias completos na janela inicial
    const endCapWidthPx = allDaysLoaded ? 190 : 0;
    const totalTrackWidthPx = visibleDays.length * dayWidthPx + endCapWidthPx;
    const plotHeightPx = 138;
    const maxTideMeters = 2.4;

    // Função de altura da maré (m): interpolação precisa com conversão para cota náutica da Marinha
    const getTideHeightAt = (globalHours) => {
      const dIdx = Math.floor(globalHours / 24);
      const hInDay = Math.max(0, globalHours - dIdx * 24);
      const targetDay = visibleDays[Math.min(visibleDays.length - 1, Math.max(0, dIdx))];
      if (targetDay && targetDay.points && targetDay.points.length > 0) {
        const pts = targetDay.points;
        const h1 = Math.max(0, Math.min(pts.length - 1, Math.floor(hInDay)));
        const h2 = Math.max(0, Math.min(pts.length - 1, Math.ceil(hInDay)));
        const frac = hInDay - Math.floor(hInDay);
        const m1 = (pts[h1].tide?.nauticalHeightM || ((pts[h1].tide?.heightM || 0) + 1.25));
        const m2 = (pts[h2].tide?.nauticalHeightM || ((pts[h2].tide?.heightM || 0) + 1.25));
        return +(m1 * (1 - frac) + m2 * frac).toFixed(2);
      }
      const rad = ((globalHours - 4.5) / 12.42) * 2 * Math.PI;
      return +(1.35 - 0.75 * Math.cos(rad)).toFixed(2);
    };
    const isTideRisingAt = (globalHours) => {
      return getTideHeightAt(globalHours + 0.25) >= getTideHeightAt(globalHours - 0.25);
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

    // Constrói o SVG da Mini-Strip de 8 dias na base (a partir de HOJE)
    const miniDays = visibleDays.slice(0, 8);
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
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" aria-hidden="true">
              <path d="M12 3v9"></path>
              <path d="m8.5 6.5 3.5-3.5 3.5 3.5"></path>
              <path d="M2 16c1.5 1 3 1.5 5 1.5 3.5 0 3.5-2.5 7-2.5 3.5 0 3.5 2.5 7 2.5 1 0 1.8-.2 2.5-.6"></path>
              <path d="M2 20.5c1.5 1 3 1.5 5 1.5 3.5 0 3.5-2.5 7-2.5 3.5 0 3.5 2.5 7 2.5 1 0 1.8-.2 2.5-.6"></path>
            </svg>
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
                        <strong class="text-amber-300 underline decoration-amber-400/50">${lastDateLabel}</strong>
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
                  .map((d) => {
                    const lows = (d.extrema || []).filter((e) => e.type === "low");
                    const highs = (d.extrema || []).filter((e) => e.type === "high");
                    const low1Str = lows[0] ? `${lows[0].str} · ${lows[0].height.toFixed(1)}m` : "—";
                    const high1Str = highs[0] ? `${highs[0].str} · ${highs[0].height.toFixed(1)}m` : "—";
                    const low2Str = lows[1] ? `${lows[1].str} · ${lows[1].height.toFixed(1)}m` : "—";
                    const high2Str = highs[1] ? `${highs[1].str} · ${highs[1].height.toFixed(1)}m` : "—";
                    return `
                  <tr class="hover:bg-white/5">
                    <td class="py-2.5 px-3 font-semibold text-white">${d.fullHeaderLabel} <span class="text-slate-400 font-normal">(${d.fullDate})</span></td>
                    <td class="py-2.5 px-3"><span class="dsysa-tide-badge-low inline-block">${low1Str}</span></td>
                    <td class="py-2.5 px-3"><span class="dsysa-tide-badge-high inline-block">${high1Str}</span></td>
                    <td class="py-2.5 px-3"><span class="dsysa-tide-badge-low inline-block">${low2Str}</span></td>
                    <td class="py-2.5 px-3"><span class="dsysa-tide-badge-high inline-block">${high2Str}</span></td>
                    <td class="py-2.5 px-3 text-amber-300">☀️ ${d.sunrise} / ${d.sunset}</td>
                    <td class="py-2.5 px-3 text-indigo-300">🌙 ${d.moonRise} / ${d.moonSet}</td>
                  </tr>
                `;
                  })
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
              <span>Exibindo <strong>${visibleDays.length} de ${allDays.length} dias</strong> · Arraste com o dedo ou mouse</span>
            </div>
            <div class="dsysa-end-banner ${state.reachedEnd ? "dsysa-end-forecast-msg" : "hidden"}">
              <span>⚠️</span>
              <span>Neste momento só temos previsão até <strong>${lastDateLabel}</strong></span>
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
        allDays.length,
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
     9. WEATHER THEME ENGINE & <DynamicWeatherBackground /> (Tempo Real WMO)
     Hierarquia: night (is_day=0) > storm (95/96/99) > cloudy/rain > sunny (0/1)
     ========================================================================== */
  const STORM_WMO_CODES = [95, 96, 99];
  const RAIN_WMO_CODES = [51, 53, 55, 61, 63, 65, 80, 81, 82];
  const CLOUDY_WMO_CODES = [2, 3, 45, 48, ...RAIN_WMO_CODES];

  window.mountDsySAWeatherStage = function () {
    let stage = document.getElementById("dsysaWeatherStage");
    if (stage) return stage;
    stage = document.createElement("div");
    stage.id = "dsysaWeatherStage";
    stage.setAttribute("aria-hidden", "true");
    stage.className = "dsysa-weather-stage weather-sunny";
    stage.innerHTML = `
      <!-- Camada Noturna: Estrelas + Brilho Lunar Difuso (is_day === 0) -->
      <div class="dsysa-stars-layer"></div>
      <div class="dsysa-moon-glow"></div>
      <div class="dsysa-moon-disc"></div>

      <!-- Camada Solar: Sol Radiante Costeiro (Ensolarado) -->
      <div class="dsysa-sun-orb"></div>
      <div class="dsysa-sun-core"></div>

      <!-- Camada de Nuvens Translúcidas (Nublado & Tempestade) -->
      <div class="dsysa-clouds-layer">
        <div class="dsysa-cloud-blob" style="top: 4%; right: 6%; width: 520px; height: 180px;"></div>
        <div class="dsysa-cloud-blob" style="top: 10%; left: 10%; width: 620px; height: 210px;"></div>
        <div class="dsysa-cloud-blob" style="top: 22%; right: 25%; width: 480px; height: 160px;"></div>
      </div>

      <!-- Camada de Chuva Diagonal Sutil (Chuva & Tempestade) -->
      <div class="dsysa-rain-layer"></div>

      <!-- Camada de Flashes / Raios Orgânicos (Tempestade Diurna ou Noturna) -->
      <div class="dsysa-lightning-overlay"></div>
      <svg class="dsysa-lightning-svg" viewBox="0 0 200 360" fill="none">
        <path d="M115 0 L65 130 L110 135 L50 260 L95 260 L35 360 L135 235 L90 235 L150 115 L102 110 Z"
              fill="rgba(224, 242, 254, 0.9)" stroke="#38bdf8" stroke-width="2"></path>
      </svg>
    `;
    document.body.prepend(stage);
    return stage;
  };

  window.WeatherThemeEngine = {
    resolveTheme({ isDay = 1, weatherCode = 0, cloudCover = 0 } = {}) {
      const code = Number(weatherCode) || 0;
      const hasStorm = STORM_WMO_CODES.includes(code);
      const hasRain = RAIN_WMO_CODES.includes(code) || hasStorm;

      // Estado 1: Noite (Prioridade Máxima)
      if (Number(isDay) === 0) {
        return { theme: "night", hasStorm, hasRain, isDay: 0, weatherCode: code, cloudCover };
      }

      // Estado 2: Tempestade Elétrica (WMO 95, 96, 99)
      if (hasStorm) {
        return { theme: "storm", hasStorm: true, hasRain: true, isDay: 1, weatherCode: code, cloudCover };
      }

      // Estado 3: Nublado / Encoberto / Chuva sem trovoadas
      if (CLOUDY_WMO_CODES.includes(code) || Number(cloudCover) >= 65) {
        return { theme: "cloudy", hasStorm: false, hasRain, isDay: 1, weatherCode: code, cloudCover };
      }

      // Estado 4: Ensolarado / Céu Limpo (WMO 0, 1)
      return { theme: "sunny", hasStorm: false, hasRain: false, isDay: 1, weatherCode: code, cloudCover };
    },

    describeWmoCode(weatherCode, isDay = 1, tempC = null) {
      const code = Number(weatherCode) || 0;
      const tempSuffix = tempC !== null && tempC !== undefined ? ` (${Math.round(tempC)} °C)` : "";
      if (STORM_WMO_CODES.includes(code)) return `⛈️ Tempestade elétrica${tempSuffix}`;
      if (RAIN_WMO_CODES.includes(code)) return `🌧️ Chuvoso${tempSuffix}`;
      if (Number(isDay) === 0) {
        return CLOUDY_WMO_CODES.includes(code) ? `☁️ Noite nublada${tempSuffix}` : `🌙 Noite limpa${tempSuffix}`;
      }
      if (code === 2) return `⛅ Parcialmente nublado${tempSuffix}`;
      if (code === 3 || code === 45 || code === 48) return `☁️ Nublado / Encoberto${tempSuffix}`;
      return `☀️ Ensolarado${tempSuffix}`;
    },

    applyTheme(stateObj) {
      const stage = window.mountDsySAWeatherStage();
      const theme = ["sunny", "cloudy", "storm", "night"].includes(stateObj?.theme) ? stateObj.theme : "sunny";
      const classes = ["dsysa-weather-stage", `weather-${theme}`];
      if (stateObj?.hasRain) classes.push("has-rain");
      if (stateObj?.hasStorm) classes.push("has-storm");

      stage.className = classes.join(" ");
      document.body.setAttribute("data-weather-theme", theme);
      window.__currentDsySAWeather = theme;

      const labels = {
        sunny: "☀️ Ensolarado (Céu Azul + Sol Radiante)",
        cloudy: stateObj?.hasRain ? "🌧️ Nublado com Chuva Sutil" : "⛅ Nublado / Encoberto",
        storm: "⛈️ Tempestade Elétrica (Raios Intermitentes)",
        night: stateObj?.hasStorm ? "🌙⛈️ Noite com Tempestade Elétrica" : "🌙 Noite (Céu Estrelado + Lua)"
      };
      const badge = document.getElementById("activeWeatherBgLabel");
      if (badge) badge.textContent = labels[theme] || labels.sunny;

      return theme;
    },

    applyFromSpot(spot) {
      if (spot && spot.currentWeather) {
        const resolved = this.resolveTheme(spot.currentWeather);
        return this.applyTheme(resolved);
      }

      // Fallback inteligente antes da resposta da API: respeita horário local noturno (<6h ou >=18h)
      const hr = new Date().getHours();
      const isNightNow = hr < 6 || hr >= 18;
      const inferred = window.inferDsySAWeatherMode(spot?.weather || "");
      if (isNightNow) {
        return this.applyTheme({
          theme: "night",
          hasStorm: inferred === "storm",
          hasRain: inferred === "storm" || inferred === "rainy"
        });
      }
      if (inferred === "storm") return this.applyTheme({ theme: "storm", hasStorm: true, hasRain: true });
      if (inferred === "rainy") return this.applyTheme({ theme: "cloudy", hasStorm: false, hasRain: true });
      if (inferred === "cloudy") return this.applyTheme({ theme: "cloudy", hasStorm: false, hasRain: false });
      return this.applyTheme({ theme: "sunny", hasStorm: false, hasRain: false });
    }
  };

  window.inferDsySAWeatherMode = function (weatherText) {
    const t = (weatherText || "").toLowerCase();
    if (t.includes("noite") || t.includes("🌙")) return "night";
    if (t.includes("raio") || t.includes("tempestade") || t.includes("trovoada") || t.includes("⛈")) return "storm";
    if (t.includes("chuv") || t.includes("🌧")) return "rainy";
    if (t.includes("parcial") || t.includes("nuven") || t.includes("nublado") || t.includes("encoberto") || t.includes("⛅") || t.includes("☁")) return "cloudy";
    return "sunny";
  };

  window.setDsySAWeatherBackground = function (modeOrText) {
    if (modeOrText && typeof modeOrText === "object") {
      return window.WeatherThemeEngine.applyFromSpot(modeOrText);
    }
    const mapLegacy = {
      sunny: { theme: "sunny", hasRain: false, hasStorm: false },
      cloudy: { theme: "cloudy", hasRain: false, hasStorm: false },
      partly_cloudy: { theme: "cloudy", hasRain: false, hasStorm: false },
      rainy: { theme: "cloudy", hasRain: true, hasStorm: false },
      storm: { theme: "storm", hasRain: true, hasStorm: true },
      thunderstorm: { theme: "storm", hasRain: true, hasStorm: true },
      night: { theme: "night", hasRain: false, hasStorm: false }
    };
    if (mapLegacy[modeOrText]) {
      return window.WeatherThemeEngine.applyTheme(mapLegacy[modeOrText]);
    }
    const inferred = window.inferDsySAWeatherMode(modeOrText);
    return window.WeatherThemeEngine.applyTheme(mapLegacy[inferred] || mapLegacy.sunny);
  };

  /* ==========================================================================
     10. COMPONENTE 5: BÚSSOLA FUNCIONAL DE POSICIONAMENTO DA PRAIA & MODAL
     (Anel graduado 0°-350°, Rosa dos Ventos N/NE/E/SE/S/SW/W/NW, Agulha Bicolor
      Vermelha/Azul, Arco Costeiro da Praia, Vetores de Swell/Vento e Modal Ampliado)
     ========================================================================== */
  function parseDegFromText(str, fallbackDeg) {
    if (!str) return fallbackDeg;
    const m = String(str).match(/(\d{1,3})\s*°/);
    if (m) return parseInt(m[1], 10) % 360;
    const tok = String(str).trim().split(/\s+/)[0].toUpperCase();
    return DIR_ANGLES[tok] !== undefined ? (DIR_ANGLES[tok] + 180) % 360 : fallbackDeg;
  }

  function inferBeachOrientation(spotConfig) {
    const name = (spotConfig?.name || "").toLowerCase();
    const swellDeg = parseDegFromText(spotConfig?.swellDir, 135);
    const windDeg = parseDegFromText(spotConfig?.windDir, 315);

    let beachFaceDeg = 130;
    let beachFaceCardinal = "SE (Sudeste)";
    let coastlineNote = "A faixa de areia olha diretamente para o quadrante Sudeste (130°), recebendo em cheio as ondulações de SE/L-SE e ficando protegida pelo vento terral de Noroeste (315°).";

    if (name.includes("stella")) {
      beachFaceDeg = 140;
      beachFaceCardinal = "SE (Sudeste)";
      coastlineNote = "A bancada de Stella Maris está voltada para SE (140°), alinhada com ondulações de Sudeste e vento terral do quadrante Oeste/Noroeste.";
    } else if (name.includes("guarajuba")) {
      beachFaceDeg = 120;
      beachFaceCardinal = "L-SE (Leste-Sudeste)";
      coastlineNote = "Os recifes externos de Guarajuba abrem para L-SE (120°), filtrando a ondulação e criando uma piscina natural protegida.";
    } else if (name.includes("pedra do sal")) {
      beachFaceDeg = 148;
      beachFaceCardinal = "S-SE (Sul-Sudeste)";
      coastlineNote = "O pico da Pedra do Sal volta-se para S-SE (148°), próximo ao farol e às formações rochosas.";
    } else if (name.includes("maresias")) {
      beachFaceDeg = 165;
      beachFaceCardinal = "S-SE (Sul-Sudeste)";
      coastlineNote = "A enseada de Maresias está posicionada voltada para S-SE (165°), ideal para swells de Sul/Sudeste e terral de Norte.";
    } else if (name.includes("arpoador")) {
      beachFaceDeg = 200;
      beachFaceCardinal = "S-SO (Sul-Sudoeste)";
      coastlineNote = "Ao lado da ponta de pedra, o Arpoador olha para S-SO (200°), encaixando ondulações de Sul/Sudoeste com terral de Nordeste.";
    } else if (name.includes("itamambuca")) {
      beachFaceDeg = 140;
      beachFaceCardinal = "SE (Sudeste)";
      coastlineNote = "A foz do rio em Itamambuca abre para SE (140°), recebendo swells de Sudeste com vento terral de Noroeste.";
    } else if (name.includes("pipeline")) {
      beachFaceDeg = 315;
      beachFaceCardinal = "NO (Noroeste)";
      coastlineNote = "No North Shore de Oahu, a bancada de Pipeline olha para NO (315°), recebendo swells de inverno de O-NO e terral de Leste.";
    }

    return {
      spotName: spotConfig?.name || "Itacimirim (A Espera)",
      region: spotConfig?.region || "Litoral Norte · A 5,8 km de você",
      beachFaceDeg,
      beachFaceCardinal,
      swellDeg,
      swellLabel: spotConfig?.swellDir || "SE 135°",
      windDeg,
      windLabel: spotConfig?.windDir || "NO 315°",
      windRelation: spotConfig?.windRelation || "Terral Liso",
      coastlineNote
    };
  }

  window.buildDsySACompassSvg = function (info, rotationDeg, sizePx, isDetailedModal) {
    const rot = Number(rotationDeg) || 0;
    const cx = 150;
    const cy = 150;

    // 1. Marcas de graduação (0° a 355° de 5 em 5 graus + rótulos de 10 em 10 graus como na referência)
    const ticksHtml = [];
    for (let deg = 0; deg < 360; deg += 2) {
      const isTen = deg % 10 === 0;
      const isFive = deg % 5 === 0;
      if (!isDetailedModal && !isFive) continue;
      const rOuter = 143;
      const rInner = isTen ? 134 : isFive ? 137 : 139.5;
      const strokeW = isTen ? 1.4 : isFive ? 0.9 : 0.55;
      const strokeCol = isTen ? "#e2e8f0" : isFive ? "#94a3b8" : "#475569";
      ticksHtml.push(
        `<line x1="${cx}" y1="${cy - rOuter}" x2="${cx}" y2="${cy - rInner}" stroke="${strokeCol}" stroke-width="${strokeW}" transform="rotate(${deg} ${cx} ${cy})" />`
      );
      if (isTen) {
        ticksHtml.push(
          `<text x="${cx}" y="${cy - 122}" text-anchor="middle" fill="#cbd5e1" font-family="Inter, sans-serif" font-size="7.2" font-weight="600" transform="rotate(${deg} ${cx} ${cy})">${deg}</text>`
        );
      }
    }

    // 2. Arco indicando a Face da Praia (Mar Aberto vs. Areia/Costa)
    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians)
      };
    };
    const describeArc = (x, y, radius, startAngle, endAngle) => {
      const start = polarToCartesian(x, y, radius, endAngle);
      const end = polarToCartesian(x, y, radius, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
      return ["M", start.x.toFixed(1), start.y.toFixed(1), "A", radius, radius, 0, largeArcFlag, 0, end.x.toFixed(1), end.y.toFixed(1)].join(" ");
    };

    const seaArcPath = describeArc(cx, cy, 108, info.beachFaceDeg - 55, info.beachFaceDeg + 55);
    const sandArcPath = describeArc(cx, cy, 108, info.beachFaceDeg + 125, info.beachFaceDeg + 235);

    return `
      <svg class="dsysa-compass-svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 300 300" style="max-width: 100%; height: auto;" aria-label="Bússola de Posicionamento da Praia">
        <defs>
          <radialGradient id="dsysaCompassDialGrad" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stop-color="#0f2942" />
            <stop offset="65%" stop-color="#071324" />
            <stop offset="100%" stop-color="#030712" />
          </radialGradient>
          <linearGradient id="dsysaCompassBezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.55" />
            <stop offset="50%" stop-color="#1e293b" stop-opacity="0.9" />
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.45" />
          </linearGradient>
        </defs>

        <!-- Anel Externo Fixo + Indicador Superior de Leitura -->
        <circle cx="150" cy="150" r="147" fill="#020617" stroke="url(#dsysaCompassBezelGrad)" stroke-width="2.2" />
        <polygon points="150,1 145,10 155,10" fill="#38bdf8" />

        <!-- ROTOR DA BÚSSOLA (Gira conforme orientação/arraste do usuário) -->
        <g class="dsysa-compass-rotor" style="transform: rotate(${rot}deg);">
          <!-- Fundo do Mostrador -->
          <circle cx="150" cy="150" r="143" fill="url(#dsysaCompassDialGrad)" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
          <circle cx="150" cy="150" r="133" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="0.8" />
          <circle cx="150" cy="150" r="114" fill="rgba(2, 6, 23, 0.55)" stroke="rgba(148, 163, 184, 0.2)" stroke-width="1" />
          <circle cx="150" cy="150" r="68" fill="none" stroke="rgba(148, 163, 184, 0.16)" stroke-width="0.9" stroke-dasharray="3 3" />

          <!-- Graduação 0° a 350° -->
          ${ticksHtml.join("")}

          <!-- Setores Costeiros: Mar Aberto (Ciano) vs. Faixa de Areia/Costa (Âmbar) -->
          <path d="${seaArcPath}" fill="none" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" stroke-opacity="0.55" />
          <path d="${sandArcPath}" fill="none" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" stroke-opacity="0.4" stroke-dasharray="4 4" />

          <!-- Rosa dos Ventos de 8 Pontas (Inspirada na referência clássica enviada) -->
          <!-- 4 Pontas Intercardeais (NE, SE, SW, NW) -->
          <g transform="rotate(45 150 150)">
            <polygon points="150,66 157,143 150,150" fill="rgba(125, 211, 252, 0.35)" />
            <polygon points="150,66 143,143 150,150" fill="rgba(56, 189, 248, 0.18)" />
            <polygon points="150,234 157,157 150,150" fill="rgba(125, 211, 252, 0.35)" />
            <polygon points="150,234 143,157 150,150" fill="rgba(56, 189, 248, 0.18)" />
            <polygon points="66,150 143,143 150,150" fill="rgba(125, 211, 252, 0.35)" />
            <polygon points="66,150 143,157 150,150" fill="rgba(56, 189, 248, 0.18)" />
            <polygon points="234,150 157,143 150,150" fill="rgba(125, 211, 252, 0.35)" />
            <polygon points="234,150 157,157 150,150" fill="rgba(56, 189, 248, 0.18)" />
          </g>

          <!-- Pontas Leste (E) e Oeste (W) da Rosa -->
          <polygon points="244,150 150,141 150,150" fill="rgba(186, 230, 253, 0.52)" />
          <polygon points="244,150 150,159 150,150" fill="rgba(125, 211, 252, 0.26)" />
          <polygon points="56,150 150,141 150,150" fill="rgba(186, 230, 253, 0.52)" />
          <polygon points="56,150 150,159 150,150" fill="rgba(125, 211, 252, 0.26)" />

          <!-- Rótulos Cardeais (N, E, S, W) e Intercardeais (NE, SE, SW, NW) -->
          <text x="150" y="54" text-anchor="middle" fill="#f8fafc" font-family="'Playfair Display', Georgia, serif" font-size="26" font-weight="700">N</text>
          <text x="150" y="256" text-anchor="middle" fill="#f8fafc" font-family="'Playfair Display', Georgia, serif" font-size="25" font-weight="700">S</text>
          <text x="249" y="158" text-anchor="middle" fill="#f8fafc" font-family="'Playfair Display', Georgia, serif" font-size="24" font-weight="700">E</text>
          <text x="51" y="158" text-anchor="middle" fill="#f8fafc" font-family="'Playfair Display', Georgia, serif" font-size="24" font-weight="700">W</text>

          <text x="204" y="98" text-anchor="middle" fill="#bae6fd" font-family="'Playfair Display', Georgia, serif" font-size="13" font-weight="600" transform="rotate(45 204 94)">NE</text>
          <text x="204" y="209" text-anchor="middle" fill="#bae6fd" font-family="'Playfair Display', Georgia, serif" font-size="13" font-weight="600" transform="rotate(135 204 205)">SE</text>
          <text x="96" y="209" text-anchor="middle" fill="#bae6fd" font-family="'Playfair Display', Georgia, serif" font-size="13" font-weight="600" transform="rotate(-135 96 205)">SW</text>
          <text x="96" y="98" text-anchor="middle" fill="#bae6fd" font-family="'Playfair Display', Georgia, serif" font-size="13" font-weight="600" transform="rotate(-45 96 94)">NW</text>

          <!-- Marcador de Direção do Swell (Onda) no anel -->
          <g transform="rotate(${info.swellDeg} 150 150)">
            <circle cx="150" cy="40" r="7.5" fill="#0ea5e9" stroke="#e0f2fe" stroke-width="1.3" />
            <polygon points="150,51 146,43 154,43" fill="#38bdf8" />
            <text x="150" y="42.5" text-anchor="middle" fill="#020617" font-family="Inter, sans-serif" font-size="6.5" font-weight="800">🌊</text>
          </g>

          <!-- Marcador de Direção do Vento (Terral/Maral) no anel -->
          <g transform="rotate(${info.windDeg} 150 150)">
            <circle cx="150" cy="40" r="7.5" fill="#10b981" stroke="#d1fae5" stroke-width="1.3" />
            <polygon points="150,51 146,43 154,43" fill="#34d399" />
            <text x="150" y="42.5" text-anchor="middle" fill="#022c22" font-family="Inter, sans-serif" font-size="6.5" font-weight="800">💨</text>
          </g>

          <!-- AGULHA MAGNÉTICA PRINCIPAL BICOLOR (Vermelho Norte / Azul Sul exatamente como na imagem) -->
          <!-- Metade Norte (Vermelha Facetada) -->
          <polygon points="150,48 140,150 150,150" fill="#f43f5e" />
          <polygon points="150,48 160,150 150,150" fill="#dc2626" />
          <!-- Metade Sul (Azul Facetada) -->
          <polygon points="150,252 140,150 150,150" fill="#38bdf8" />
          <polygon points="150,252 160,150 150,150" fill="#2563eb" />
          <!-- Pino Central -->
          <circle cx="150" cy="150" r="5.5" fill="#f8fafc" stroke="#0f172a" stroke-width="2" />
        </g>
      </svg>
    `;
  };

  function bindInteractiveCompassRotation(svgEl, stateObj, onRotate) {
    if (!svgEl) return;
    let dragging = false;
    let startAngle = 0;
    let initialRot = stateObj.rotationDeg || 0;

    const getPointerAngle = (clientX, clientY) => {
      const rect = svgEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
    };

    const startDrag = (clientX, clientY) => {
      // Se a bússola ao vivo estiver ativa, desativa suavemente para permitir giro manual
      if (window.DsySACompass?.compass?.isActive) {
        window.DsySACompass.compass.stop();
      }
      dragging = true;
      startAngle = getPointerAngle(clientX, clientY);
      initialRot = stateObj.rotationDeg || 0;
      const rotor = svgEl.querySelector(".dsysa-compass-rotor");
      if (rotor) rotor.classList.add("dragging");
    };

    const moveDrag = (clientX, clientY) => {
      if (!dragging) return;
      const currentAngle = getPointerAngle(clientX, clientY);
      const delta = currentAngle - startAngle;
      let nextRot = Math.round((initialRot + delta) % 360);
      if (nextRot < 0) nextRot += 360;
      stateObj.rotationDeg = nextRot;
      const rotor = svgEl.querySelector(".dsysa-compass-rotor");
      if (rotor) {
        rotor.style.transform = `rotate(${nextRot}deg)`;
      }
      if (onRotate) onRotate(nextRot);
    };

    const stopDrag = () => {
      if (!dragging) return;
      dragging = false;
      const rotor = svgEl.querySelector(".dsysa-compass-rotor");
      if (rotor) rotor.classList.remove("dragging");
    };

    svgEl.addEventListener("mousedown", (e) => {
      e.preventDefault();
      startDrag(e.clientX, e.clientY);
    });
    window.addEventListener("mousemove", (e) => moveDrag(e.clientX, e.clientY));
    window.addEventListener("mouseup", stopDrag);

    svgEl.addEventListener(
      "touchstart",
      (e) => {
        if (!e.touches || !e.touches[0]) return;
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: true }
    );
    svgEl.addEventListener(
      "touchmove",
      (e) => {
        if (!e.touches || !e.touches[0]) return;
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: true }
    );
    svgEl.addEventListener("touchend", stopDrag, { passive: true });
  }

  /* Helper de Feedback Visual / Toast para Sensores da Bússola */
  function showCompassToast(parentEl, message, durationMs = 3800) {
    if (!parentEl) return;
    let toast = parentEl.querySelector(".dsysa-compass-live-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "dsysa-compass-live-toast";
      parentEl.style.position = "relative";
      parentEl.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = "inline-flex";
    clearTimeout(toast.__hideTimer);
    toast.__hideTimer = setTimeout(() => {
      if (toast) toast.style.display = "none";
    }, durationMs);
  }

  /* ==========================================================================
     9. COMPONENTE 4: BÚSSOLA FUNCIONAL DE POSICIONAMENTO DA PRAIA
     ========================================================================== */
  window.renderDsySACompassCard = function (containerEl, spotConfig) {
    if (!containerEl) return;
    window.__lastCompassSpotConfig = spotConfig;

    const info = inferBeachOrientation(spotConfig);
    const state = containerEl.__compassState || {
      rotationDeg: 0,
      collapsed: false
    };
    containerEl.__compassState = state;

    const compassService = window.DsySACompass?.compass;
    const isLiveActive = compassService ? (compassService.isActive || !compassService.userDisabled) : true;

    containerEl.innerHTML = `
      <div class="dsysa-wave-panel mt-4" style="--border-gradient: linear-gradient(135deg, rgba(56, 189, 248, 0.32), rgba(16, 185, 129, 0.08)); --border-radius-before: 16px;">
        <!-- TOP HEADER: BÚSSOLA DE POSICIONAMENTO DA PRAIA -->
        <div class="dsysa-wave-topbar">
          <div class="dsysa-wave-topbar-title">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
            </svg>
            <span>BÚSSOLA</span>
            <span class="text-[11px] font-inter font-normal text-sky-300/90 ml-2 hidden sm:inline">
              · Orientação Costeira (${info.beachFaceCardinal})
            </span>
          </div>
          <div class="flex items-center gap-3">
            <span class="dsysa-compass-angle-readout text-[11px] font-mono text-emerald-300">
              Azimute: ${state.rotationDeg}° · Face: ${info.beachFaceDeg}°
            </span>
            <button type="button" class="dsysa-CompassCollapseBtn flex h-6 w-6 items-center justify-center rounded bg-slate-800/90 border border-white/10 text-slate-200 hover:text-white text-xs">
              ${state.collapsed ? "▼" : "▲"}
            </button>
          </div>
        </div>

        <div class="${state.collapsed ? "hidden" : "block"}">
          <div class="dsysa-compass-body">
            <!-- ESQUERDA: Bússola Funcional Interativa -->
            <div class="dsysa-compass-dial-wrap">
              ${window.buildDsySACompassSvg(info, state.rotationDeg, 188, false)}
              <span class="mt-1.5 text-[10px] text-slate-400 font-mono">
                Arraste o disco p/ girar (${state.rotationDeg}°)
              </span>
            </div>

            <!-- DIREITA: Texto Explicativo + Indicadores + Botão "Ampliar bússola" -->
            <div class="dsysa-compass-info">
              <div class="inline-flex items-center gap-2 self-start rounded-full bg-sky-500/15 border border-sky-400/30 px-2.5 py-0.5 text-[10px] font-semibold text-sky-300">
                <span>🧭 ${info.spotName}</span>
                <span>·</span>
                <span>Face Costeira: ${info.beachFaceDeg}°</span>
              </div>

              <h3 class="dsysa-compass-headline">
                Veja a posição da praia onde você está.
              </h3>

              <p class="dsysa-compass-desc">
                ${info.coastlineNote}
              </p>

              <div class="dsysa-compass-badges">
                <span class="dsysa-compass-pill">
                  <span class="h-2 w-2 rounded-full bg-sky-400"></span>
                  <span>Mar Aberto: <strong>${info.beachFaceCardinal} (${info.beachFaceDeg}°)</strong></span>
                </span>
                <span class="dsysa-compass-pill">
                  <span>🌊 Swell: <strong class="text-sky-300">${info.swellLabel}</strong></span>
                </span>
                <span class="dsysa-compass-pill">
                  <span>💨 Vento: <strong class="text-emerald-300">${info.windLabel} (${info.windRelation})</strong></span>
                </span>
              </div>

              <div class="pt-1 flex flex-wrap items-center gap-2.5">
                <!-- Botão 1: Bússola ao Vivo (Sensores Mobile iOS / Android) -->
                <button type="button" class="dsysa-btn-live-compass ${isLiveActive ? "active" : ""}" data-toggle-live-compass="true" title="Alinhar automaticamente com o Norte magnético real usando o sensor do celular">
                  <span class="dsysa-compass-live-dot"></span>
                  <span class="dsysa-live-compass-text">${isLiveActive ? "Bússola ao Vivo Ativa" : "Bússola ao Vivo"}</span>
                </button>

                <!-- Botão 2: Ampliar Bússola Modal -->
                <button type="button" class="dsysa-btn-expand-compass" data-open-compass-modal="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <polyline points="9 21 3 21 3 15"></polyline>
                    <line x1="21" y1="3" x2="14" y2="10"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                  </svg>
                  <span>Ampliar bússola</span>
                </button>

                <!-- Botões Rápidos de Alinhamento -->
                <button type="button" data-reset-compass="0" class="px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-[11px] font-medium text-slate-300 transition-colors">
                  Norte (0°)
                </button>
                <button type="button" data-align-beach="${(360 - info.beachFaceDeg) % 360}" class="px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-[11px] font-medium text-sky-300 transition-colors">
                  Alinhar c/ o Mar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const svgEl = containerEl.querySelector(".dsysa-compass-svg");
    const rotorEl = svgEl ? svgEl.querySelector(".dsysa-compass-rotor") : null;
    const readoutEl = containerEl.querySelector(".dsysa-compass-angle-readout");
    const captionEl = containerEl.querySelector(".dsysa-compass-dial-wrap span");
    const liveBtn = containerEl.querySelector("[data-toggle-live-compass]");
    const liveTextEl = containerEl.querySelector(".dsysa-live-compass-text");

    bindInteractiveCompassRotation(svgEl, state, (deg) => {
      if (readoutEl) readoutEl.textContent = `Azimute: ${deg}° · Face: ${info.beachFaceDeg}°`;
      if (captionEl) captionEl.textContent = `Arraste o disco p/ girar (${deg}°)`;
    });

    // Vincula o rotor SVG do card ao serviço de bússola
    if (compassService && rotorEl) {
      compassService.attachElement(rotorEl);

      // Limpeza prévia do subscription anterior no container
      if (containerEl.__compassUnsub) {
        containerEl.__compassUnsub();
      }

      containerEl.__compassUnsub = compassService.subscribe((cState) => {
        if (!containerEl.isConnected) return;
        if (cState.isActive) {
          if (liveBtn) liveBtn.classList.add("active");
          if (liveTextEl) liveTextEl.textContent = `Bússola Ativa (${cState.heading}° ${cState.cardinal})`;
          if (readoutEl) {
            readoutEl.innerHTML = `<span class="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>Bússola: ${cState.heading}° ${cState.cardinal} · Face: ${info.beachFaceDeg}°`;
          }
          if (captionEl) {
            captionEl.innerHTML = `Orientação ao vivo: <strong class="text-emerald-300 font-mono">${cState.heading}° (${cState.cardinal})</strong>`;
          }
        } else {
          if (liveBtn) liveBtn.classList.remove("active");
          if (liveTextEl) liveTextEl.textContent = "Bússola ao Vivo";
          if (readoutEl && !readoutEl.textContent.includes("Azimute")) {
            readoutEl.textContent = `Azimute: ${state.rotationDeg}° · Face: ${info.beachFaceDeg}°`;
          }
        }

        if (cState.status === "unsupported" && cState.errorMessage) {
          showCompassToast(containerEl, cState.errorMessage, 4500);
        } else if (cState.status === "denied" && cState.errorMessage) {
          showCompassToast(containerEl, cState.errorMessage, 4500);
        } else if (cState.status === "insecure_context" && cState.errorMessage) {
          showCompassToast(containerEl, cState.errorMessage, 5000);
        }
      });

      // Modo ao Vivo ativado automaticamente como default
      if (typeof compassService.autoStartDefault === "function") {
        compassService.autoStartDefault();
      }
    }

    if (liveBtn) {
      liveBtn.addEventListener("click", async () => {
        if (!compassService) {
          showCompassToast(containerEl, "Módulo DsySACompass não encontrado.", 3000);
          return;
        }

        if (compassService.isActive) {
          compassService.userDisabled = true;
          compassService.stop();
          showCompassToast(containerEl, "Bússola ao vivo desativada.", 2000);
        } else {
          compassService.userDisabled = false;
          showCompassToast(containerEl, "Calibrando sensores de orientação...", 2200);
          const ok = await compassService.start();
          if (!ok) {
            const err = compassService.errorMessage || "Não foi possível ativar os sensores de orientação.";
            showCompassToast(containerEl, err, 4500);
          }
        }
      });
    }

    const openBtn = containerEl.querySelector("[data-open-compass-modal]");
    if (openBtn) {
      openBtn.addEventListener("click", () => {
        window.openDsySACompassModal(spotConfig, state.rotationDeg);
      });
    }

    const resetBtn = containerEl.querySelector("[data-reset-compass]");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (compassService && compassService.isActive) compassService.stop();
        state.rotationDeg = 0;
        window.renderDsySACompassCard(containerEl, spotConfig);
      });
    }

    const alignBtn = containerEl.querySelector("[data-align-beach]");
    if (alignBtn) {
      alignBtn.addEventListener("click", () => {
        if (compassService && compassService.isActive) compassService.stop();
        state.rotationDeg = parseInt(alignBtn.getAttribute("data-align-beach"), 10) || 0;
        window.renderDsySACompassCard(containerEl, spotConfig);
      });
    }

    const collapseBtn = containerEl.querySelector(".dsysa-CompassCollapseBtn");
    if (collapseBtn) {
      collapseBtn.addEventListener("click", () => {
        state.collapsed = !state.collapsed;
        window.renderDsySACompassCard(containerEl, spotConfig);
      });
    }
  };

  window.openDsySACompassModal = function (spotConfig, initialRotationDeg) {
    const activeSpot = spotConfig || window.__lastCompassSpotConfig || {};
    const info = inferBeachOrientation(activeSpot);
    const compassService = window.DsySACompass?.compass;

    let modalEl = document.getElementById("dsysaCompassModal");
    if (!modalEl) {
      modalEl = document.createElement("div");
      modalEl.id = "dsysaCompassModal";
      modalEl.className = "dsysa-compass-modal-backdrop";
      document.body.appendChild(modalEl);

      modalEl.addEventListener("click", (ev) => {
        if (ev.target === modalEl) {
          window.closeDsySACompassModal();
        }
      });
      document.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && modalEl.classList.contains("open")) {
          window.closeDsySACompassModal();
        }
      });
    }

    const modalState = {
      rotationDeg: initialRotationDeg !== undefined ? initialRotationDeg : 0
    };

    const renderModalContent = () => {
      const isLiveActive = compassService ? compassService.isActive : false;

      modalEl.innerHTML = `
        <div class="dsysa-compass-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="dsysaCompassModalTitle">
          <!-- Cabeçalho do Modal com Botão Fechar -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/90">
            <div class="flex items-center gap-2.5">
              <span class="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8]"></span>
              <div>
                <h3 id="dsysaCompassModalTitle" class="text-sm sm:text-base font-semibold text-white tracking-tight">
                  Bússola de Posicionamento da Praia — ${info.spotName}
                </h3>
                <p class="text-[11px] text-slate-400">
                  Veja a posição da praia onde você está · Rosa dos Ventos 360° de Alta Precisão
                </p>
              </div>
            </div>

            <button type="button" class="dsysa-btn-close-modal" id="dsysaCloseCompassModalBtn">
              <span>✕</span>
              <span>Fechar</span>
            </button>
          </div>

          <!-- Corpo do Modal -->
          <div class="p-4 sm:p-6 grid gap-5 md:grid-cols-12 items-center">
            <!-- Bússola Ampliada -->
            <div class="md:col-span-7 flex flex-col items-center justify-center bg-slate-950/80 border border-white/5 rounded-2xl p-3 sm:p-4 relative">
              <div id="dsysaModalCompassSvgHost" class="w-full flex justify-center">
                ${window.buildDsySACompassSvg(info, modalState.rotationDeg, typeof window !== "undefined" && window.innerWidth < 480 ? Math.min(270, window.innerWidth - 64) : 310, true)}
              </div>

              <!-- Slider de Rotação 0° a 360° + Botão Bússola ao Vivo -->
              <div class="w-full mt-4 px-2 space-y-2.5">
                <div class="flex items-center justify-between text-[11px] text-slate-300 font-mono">
                  <span>Girar Rosa dos Ventos:</span>
                  <strong id="dsysaModalAngleLabel" class="text-sky-300">${modalState.rotationDeg}°</strong>
                </div>
                <input type="range" id="dsysaModalRotateSlider" min="0" max="359" value="${modalState.rotationDeg}"
                       class="w-full accent-sky-400 cursor-pointer" />
                <div class="flex flex-wrap justify-center gap-2 pt-1">
                  <!-- Ativação da Bússola ao Vivo dentro do Modal -->
                  <button type="button" data-modal-toggle-live="true" class="dsysa-btn-live-compass ${isLiveActive ? "active" : ""}">
                    <span class="dsysa-compass-live-dot"></span>
                    <span id="dsysaModalLiveBtnText">${isLiveActive ? "Bússola ao Vivo Ativa" : "Bússola ao Vivo"}</span>
                  </button>

                  <button type="button" data-modal-rot="0" class="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] text-slate-200">
                    🧭 Norte no Topo (0°)
                  </button>
                  <button type="button" data-modal-rot="${(360 - info.beachFaceDeg) % 360}" class="px-3 py-1.5 rounded-full bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-[11px] text-sky-300 font-medium">
                    🌊 Olhar de Frente p/ o Mar (${info.beachFaceDeg}°)
                  </button>
                </div>
              </div>
            </div>

            <!-- Painel Lateral de Posicionamento Costeiro -->
            <div class="md:col-span-5 space-y-3.5 text-left">
              <div class="rounded-xl bg-slate-900/75 border border-white/10 p-3.5">
                <span class="text-[10px] uppercase tracking-[0.16em] text-sky-300 font-semibold">Posicionamento da Praia</span>
                <p class="text-sm font-semibold text-white mt-1">
                  Veja a posição da praia onde você está.
                </p>
                <p class="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  ${info.coastlineNote}
                </p>
              </div>

              <div class="space-y-2 text-xs">
                <div class="flex items-center justify-between rounded-xl bg-slate-950/90 border border-white/5 px-3.5 py-2.5">
                  <span class="text-slate-400">🏖️ Face da Praia (Mar Aberto)</span>
                  <strong class="text-sky-300 font-mono">${info.beachFaceCardinal} · ${info.beachFaceDeg}°</strong>
                </div>
                <div class="flex items-center justify-between rounded-xl bg-slate-950/90 border border-white/5 px-3.5 py-2.5">
                  <span class="text-slate-400">🌊 Entrada da Ondulação (Swell)</span>
                  <strong class="text-cyan-300 font-mono">${info.swellLabel}</strong>
                </div>
                <div class="flex items-center justify-between rounded-xl bg-slate-950/90 border border-white/5 px-3.5 py-2.5">
                  <span class="text-slate-400">💨 Direção do Vento</span>
                  <strong class="text-emerald-300 font-mono">${info.windLabel} (${info.windRelation})</strong>
                </div>
              </div>

              <div class="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-[11px] text-emerald-200 leading-relaxed">
                <strong>Leitura Rápida na Bússola:</strong> Aponte o topo do smartphone para o mar. A rosa dos ventos gira em tempo real e indica exatamente de onde a onda e o vento entram na sua praia!
              </div>

              <button type="button" id="dsysaCloseCompassModalBottomBtn" class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-white transition-colors">
                Fechar Modal da Bússola
              </button>
            </div>
          </div>
        </div>
      `;

      const closeTop = modalEl.querySelector("#dsysaCloseCompassModalBtn");
      const closeBottom = modalEl.querySelector("#dsysaCloseCompassModalBottomBtn");
      if (closeTop) closeTop.addEventListener("click", window.closeDsySACompassModal);
      if (closeBottom) closeBottom.addEventListener("click", window.closeDsySACompassModal);

      const modalSvg = modalEl.querySelector(".dsysa-compass-svg");
      const modalRotor = modalSvg ? modalSvg.querySelector(".dsysa-compass-rotor") : null;
      const angleLabel = modalEl.querySelector("#dsysaModalAngleLabel");
      const slider = modalEl.querySelector("#dsysaModalRotateSlider");
      const modalLiveBtn = modalEl.querySelector("[data-modal-toggle-live]");
      const modalLiveBtnText = modalEl.querySelector("#dsysaModalLiveBtnText");

      const syncRotationUI = (deg) => {
        if (angleLabel) angleLabel.textContent = `${deg}°`;
        if (slider) slider.value = String(deg);
        const mainCardEl = document.getElementById("dsysaCompassCardRoot");
        if (mainCardEl && mainCardEl.__compassState) {
          mainCardEl.__compassState.rotationDeg = deg;
          window.renderDsySACompassCard(mainCardEl, activeSpot);
        }
      };

      bindInteractiveCompassRotation(modalSvg, modalState, syncRotationUI);

      // Vincula o rotor ampliado do modal à bússola ao vivo
      if (compassService && modalRotor) {
        compassService.attachElement(modalRotor);

        if (modalEl.__compassModalUnsub) {
          modalEl.__compassModalUnsub();
        }

        modalEl.__compassModalUnsub = compassService.subscribe((cState) => {
          if (!modalEl.isConnected) return;
          if (cState.isActive) {
            if (modalLiveBtn) modalLiveBtn.classList.add("active");
            if (modalLiveBtnText) modalLiveBtnText.textContent = `Bússola Ativa (${cState.heading}° ${cState.cardinal})`;
            if (angleLabel) angleLabel.textContent = `Bússola: ${cState.heading}° ${cState.cardinal}`;
            if (slider) slider.value = String(cState.heading);
          } else {
            if (modalLiveBtn) modalLiveBtn.classList.remove("active");
            if (modalLiveBtnText) modalLiveBtnText.textContent = "Bússola ao Vivo";
          }
        });

        // Garante modo ao vivo ativo por padrão também ao abrir o modal
        if (typeof compassService.autoStartDefault === "function") {
          compassService.autoStartDefault();
        }
      }

      if (modalLiveBtn) {
        modalLiveBtn.addEventListener("click", async () => {
          if (!compassService) return;
          if (compassService.isActive) {
            compassService.userDisabled = true;
            compassService.stop();
          } else {
            compassService.userDisabled = false;
            showCompassToast(modalEl.querySelector(".dsysa-compass-modal-dialog"), "Iniciando Bússola ao Vivo...", 2000);
            const ok = await compassService.start();
            if (!ok) {
              const err = compassService.errorMessage || "Não foi possível ativar os sensores.";
              showCompassToast(modalEl.querySelector(".dsysa-compass-modal-dialog"), err, 4500);
            }
          }
        });
      }

      if (slider) {
        slider.addEventListener("input", () => {
          if (compassService && compassService.isActive) compassService.stop();
          const deg = parseInt(slider.value, 10) || 0;
          modalState.rotationDeg = deg;
          const rotor = modalEl.querySelector(".dsysa-compass-rotor");
          if (rotor) rotor.style.transform = `rotate(${deg}deg)`;
          syncRotationUI(deg);
        });
      }

      modalEl.querySelectorAll("[data-modal-rot]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (compassService && compassService.isActive) compassService.stop();
          modalState.rotationDeg = parseInt(btn.getAttribute("data-modal-rot"), 10) || 0;
          renderModalContent();
          syncRotationUI(modalState.rotationDeg);
        });
      });
    };

    renderModalContent();
    requestAnimationFrame(() => {
      modalEl.classList.add("open");
    });
  };

  window.closeDsySACompassModal = function () {
    const modalEl = document.getElementById("dsysaCompassModal");
    if (modalEl) {
      modalEl.classList.remove("open");
      const modalRotor = modalEl.querySelector(".dsysa-compass-rotor");
      if (modalRotor && window.DsySACompass?.compass) {
        window.DsySACompass.compass.detachElement(modalRotor);
      }
      if (modalEl.__compassModalUnsub) {
        modalEl.__compassModalUnsub();
        modalEl.__compassModalUnsub = null;
      }
    }
  };

  // =========================================================================
  // 10. DSYSA WEATHER FORECAST ACCORDION CARD (PREVISÃO DO TEMPO — 3 DIAS)
  //     Reaproveita Open-Meteo `daily` (weather_code, temp_min, temp_max)
  // =========================================================================
  const DSYSA_WEEKDAYS_PT = [
    "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"
  ];

  function getDsySAWeatherIconSvg(iconType) {
    if (iconType === "sunny") {
      return `
        <svg class="dsysa-weather-fc-svg" viewBox="0 0 64 52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <g stroke="#facc15" stroke-width="2.6" stroke-linecap="round">
            <line x1="32" y1="5" x2="32" y2="10"/>
            <line x1="32" y1="42" x2="32" y2="47"/>
            <line x1="11" y1="26" x2="16" y2="26"/>
            <line x1="48" y1="26" x2="53" y2="26"/>
            <line x1="17.2" y1="11.2" x2="20.7" y2="14.7"/>
            <line x1="43.3" y1="37.3" x2="46.8" y2="40.8"/>
            <line x1="46.8" y1="11.2" x2="43.3" y2="14.7"/>
            <line x1="20.7" y1="37.3" x2="17.2" y2="40.8"/>
          </g>
          <circle cx="32" cy="26" r="12" fill="#fde047" stroke="#f59e0b" stroke-width="1.5"/>
        </svg>`;
    }

    if (iconType === "storm") {
      return `
        <svg class="dsysa-weather-fc-svg" viewBox="0 0 64 52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <g stroke="#facc15" stroke-width="2.2" stroke-linecap="round">
            <line x1="41" y1="4" x2="41" y2="8"/>
            <line x1="51" y1="9" x2="48.5" y2="11.5"/>
            <line x1="55" y1="19" x2="51.5" y2="19"/>
            <line x1="31" y1="9" x2="33.5" y2="11.5"/>
          </g>
          <circle cx="41" cy="19" r="8.5" fill="#fde047" stroke="#f59e0b" stroke-width="1.2"/>
          <path d="M18 37h26a8 8 0 0 0 1.2-15.9A11 11 0 0 0 24.4 18a8.5 8.5 0 0 0-6.4 19Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.4" stroke-linejoin="round"/>
          <polygon points="33,28 26,38 31.5,38 28.5,46 38.5,34.5 33,34.5" fill="#facc15" stroke="#d97706" stroke-width="0.9" stroke-linejoin="round"/>
          <g stroke="#38bdf8" stroke-width="2" stroke-linecap="round">
            <line x1="20" y1="42" x2="18" y2="47"/>
            <line x1="42" y1="42" x2="40" y2="47"/>
          </g>
        </svg>`;
    }

    if (iconType === "rain_sun") {
      return `
        <svg class="dsysa-weather-fc-svg" viewBox="0 0 64 52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <g stroke="#facc15" stroke-width="2.2" stroke-linecap="round">
            <line x1="41" y1="4" x2="41" y2="8"/>
            <line x1="51" y1="9" x2="48.5" y2="11.5"/>
            <line x1="55" y1="19" x2="51.5" y2="19"/>
            <line x1="31" y1="9" x2="33.5" y2="11.5"/>
          </g>
          <circle cx="41" cy="19" r="8.5" fill="#fde047" stroke="#f59e0b" stroke-width="1.2"/>
          <path d="M18 37h26a8 8 0 0 0 1.2-15.9A11 11 0 0 0 24.4 18a8.5 8.5 0 0 0-6.4 19Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.4" stroke-linejoin="round"/>
          <g stroke="#38bdf8" stroke-width="2.1" stroke-linecap="round">
            <line x1="23" y1="41" x2="20.5" y2="47"/>
            <line x1="32" y1="41" x2="29.5" y2="47"/>
            <line x1="41" y1="41" x2="38.5" y2="47"/>
          </g>
        </svg>`;
    }

    if (iconType === "rain") {
      return `
        <svg class="dsysa-weather-fc-svg" viewBox="0 0 64 52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M16 35h30a8.5 8.5 0 0 0 1.3-16.9A12 12 0 0 0 24.2 15a9 9 0 0 0-8.2 20Z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.5" stroke-linejoin="round"/>
          <g stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round">
            <line x1="22" y1="40" x2="19.5" y2="47"/>
            <line x1="32" y1="40" x2="29.5" y2="47"/>
            <line x1="42" y1="40" x2="39.5" y2="47"/>
          </g>
        </svg>`;
    }

    if (iconType === "cloudy") {
      return `
        <svg class="dsysa-weather-fc-svg" viewBox="0 0 64 52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M23 28h25a7 7 0 0 0 1-13.9A9.5 9.5 0 0 0 30.8 11.5a7.5 7.5 0 0 0-7.8 16.5Z" fill="#94a3b8" opacity="0.65"/>
          <path d="M14 40h32a8.5 8.5 0 0 0 1.2-16.9A11.5 11.5 0 0 0 24.5 20a9 9 0 0 0-10.5 20Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.4" stroke-linejoin="round"/>
        </svg>`;
    }

    // Default: "partly_cloudy" (Sol brilhante atrás de nuvem cinza-clara)
    return `
      <svg class="dsysa-weather-fc-svg" viewBox="0 0 64 52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g stroke="#facc15" stroke-width="2.3" stroke-linecap="round">
          <line x1="39" y1="5" x2="39" y2="9"/>
          <line x1="49.5" y1="9.5" x2="46.8" y2="12.2"/>
          <line x1="54" y1="20" x2="50" y2="20"/>
          <line x1="28.5" y1="9.5" x2="31.2" y2="12.2"/>
        </g>
        <circle cx="39" cy="20" r="9.5" fill="#fde047" stroke="#f59e0b" stroke-width="1.2"/>
        <path d="M16 40h28a8.5 8.5 0 0 0 1.2-16.9A11.5 11.5 0 0 0 23.5 20a9 9 0 0 0-7.5 20Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.4" stroke-linejoin="round"/>
      </svg>`;
  }

  function translateWmoDaily(code) {
    const c = Number(code);
    if (c === 0) return { icon: "sunny", desc: "Céu limpo e ensolarado" };
    if (c === 1) return { icon: "partly_cloudy", desc: "Sol com poucas nuvens" };
    if (c === 2) return { icon: "partly_cloudy", desc: "Sol com muitas nuvens" };
    if (c === 3) return { icon: "cloudy", desc: "Tempo nublado e encoberto" };
    if (c === 45 || c === 48) return { icon: "cloudy", desc: "Neblina e nuvens baixas" };
    if (c >= 51 && c <= 57) return { icon: "rain", desc: "Garoa leve ao longo do dia" };
    if (c >= 61 && c <= 67) return { icon: "rain", desc: "Chuva moderada no litoral" };
    if (c >= 80 && c <= 82) return { icon: "rain_sun", desc: "Sol entre nuvens e pancadas de chuva" };
    if (c === 95 || c === 96 || c === 99) {
      return { icon: "storm", desc: "Sol entre nuvens e pancadas de chuva, com trovoadas" };
    }
    return { icon: "partly_cloudy", desc: "Sol com muitas nuvens" };
  }

  function formatDailyForecastLabel(dateStr, idx) {
    if (idx === 0) return "Hoje";
    if (idx === 1) return "Amanhã";
    if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      if (!isNaN(dt.getTime())) {
        return DSYSA_WEEKDAYS_PT[dt.getDay()];
      }
    }
    const fallbackDt = new Date();
    fallbackDt.setDate(fallbackDt.getDate() + idx);
    return DSYSA_WEEKDAYS_PT[fallbackDt.getDay()];
  }

  function resolveWeatherCardLocationName(spotConfig) {
    if (window.SurfeAgentSettings && typeof window.SurfeAgentSettings.inferSpotLocation === "function") {
      const loc = window.SurfeAgentSettings.inferSpotLocation(spotConfig);
      if (loc && loc.city) {
        return loc.city.split("(")[0].trim();
      }
    }
    return spotConfig?.name || "Litoral";
  }

  window.renderDsySAWeatherForecastCard = function (containerEl, spotConfig) {
    if (!containerEl) return;

    const spotKey = spotConfig?.id || "default";
    if (!containerEl.__weatherFcState) {
      containerEl.__weatherFcState = { collapsed: false };
    }
    const state = containerEl.__weatherFcState;

    const locationLabel = resolveWeatherCardLocationName(spotConfig);
    const rawDaily =
      (Array.isArray(spotConfig?.dailyWeather) && spotConfig.dailyWeather.length >= 3 && spotConfig.dailyWeather) ||
      (Array.isArray(spotConfig?.forecastData?.dailyWeather) && spotConfig.forecastData.dailyWeather.length >= 3 && spotConfig.forecastData.dailyWeather) ||
      null;

    // Fallback instantâneo enquanto a Open-Meteo retorna os 3 dias reais
    const baseTemp = typeof spotConfig?.currentWeather?.temperatureC === "number"
      ? Math.round(spotConfig.currentWeather.temperatureC)
      : 28;
    const baseCode = typeof spotConfig?.currentWeather?.weatherCode === "number"
      ? spotConfig.currentWeather.weatherCode
      : 2;

    const days = rawDaily
      ? rawDaily.slice(0, 3)
      : [
          { date: null, weatherCode: baseCode, tempMinC: baseTemp - 3, tempMaxC: baseTemp + 1 },
          { date: null, weatherCode: 80, tempMinC: baseTemp - 3, tempMaxC: baseTemp + 2 },
          { date: null, weatherCode: 2, tempMinC: baseTemp - 3, tempMaxC: baseTemp + 2 }
        ];

    const render = () => {
      const colsHtml = days.map((day, idx) => {
        const meta = translateWmoDaily(day.weatherCode);
        const dayLabel = formatDailyForecastLabel(day.date, idx);
        const minStr = day.tempMinC !== null && day.tempMinC !== undefined ? `${Math.round(day.tempMinC)}°` : "--°";
        const maxStr = day.tempMaxC !== null && day.tempMaxC !== undefined ? `${Math.round(day.tempMaxC)}°` : "--°";

        return `
          <div class="dsysa-weather-fc-col">
            <div class="dsysa-weather-fc-icon-wrap">
              ${getDsySAWeatherIconSvg(meta.icon)}
            </div>
            <div class="dsysa-weather-fc-day">${dayLabel}</div>
            <div class="dsysa-weather-fc-temps">
              <span class="dsysa-weather-fc-min" title="Temperatura mínima">${minStr}</span>
              <span class="dsysa-weather-fc-max" title="Temperatura máxima">${maxStr}</span>
            </div>
            <p class="dsysa-weather-fc-desc" title="${meta.desc}">${meta.desc}</p>
          </div>
        `;
      }).join("");

      containerEl.innerHTML = `
        <div class="dsysa-wave-panel" data-weather-fc-spot="${spotKey}" style="--border-gradient: linear-gradient(135deg, rgba(56, 189, 248, 0.28), rgba(250, 204, 21, 0.1)); --border-radius-before: 16px;">
          <!-- TOP HEADER ACCORDION DsySA: Ícone Sol Linear + "PREVISÃO DO TEMPO" + Collapse -->
          <div class="dsysa-wave-topbar">
            <div class="dsysa-wave-topbar-title">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f8fafc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 2v2"></path>
                <path d="M12 20v2"></path>
                <path d="m4.93 4.93 1.41 1.41"></path>
                <path d="m17.66 17.66 1.41 1.41"></path>
                <path d="M2 12h2"></path>
                <path d="M20 12h2"></path>
                <path d="m6.34 17.66-1.41 1.41"></path>
                <path d="m19.07 4.93-1.41 1.41"></path>
              </svg>
              <span>PREVISÃO DO TEMPO</span>
              <span class="text-[11px] font-inter font-normal text-sky-300/90 ml-2 hidden sm:inline">
                · Próximos 3 dias
              </span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-[11px] font-mono text-sky-300 hidden md:inline">
                ${locationLabel} · Mín / Máx
              </span>
              <button type="button" class="dsysa-WeatherFcCollapseBtn flex h-6 w-6 items-center justify-center rounded bg-slate-800/90 border border-white/10 text-slate-200 hover:text-white text-xs" aria-label="Recolher ou expandir Previsão do tempo">
                ${state.collapsed ? "▼" : "▲"}
              </button>
            </div>
          </div>

          <div class="${state.collapsed ? "hidden" : "block"} dsysa-weather-fc-body">
            <!-- Linha de Localização Centralizada com Pino Azul-Oceano -->
            <div class="dsysa-weather-fc-loc">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${locationLabel}</span>
            </div>

            <!-- Grid de 3 Colunas (Hoje | Amanhã | 3º Dia) com divisórias verticais sutis -->
            <div class="dsysa-weather-fc-grid">
              ${colsHtml}
            </div>
          </div>
        </div>
      `;

      const btn = containerEl.querySelector(".dsysa-WeatherFcCollapseBtn");
      if (btn) {
        btn.addEventListener("click", () => {
          state.collapsed = !state.collapsed;
          render();
        });
      }
    };

    render();
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
