/**
 * Script de Sincronização Visual 100% DsySA/index.html -> Figma (SurfAgent)
 * Como executar no Figma Desktop (caso o limite de chamadas MCP Starter esteja bloqueado):
 * 1. No Figma Desktop, abra o menu: Plugins -> Development -> Show/Hide Console (ou Ctrl + Alt + I / Ctrl + Shift + I)
 * 2. Cole todo o conteúdo deste arquivo no Console e pressione Enter.
 */
(async () => {
  const availFonts = await figma.listAvailableFontsAsync();
  const hasFont = (family, style) =>
    availFonts.some((f) => f.fontName.family === family && f.fontName.style === style);

  const fontInterReg = { family: "Inter", style: "Regular" };
  const fontInterMed = { family: "Inter", style: hasFont("Inter", "Medium") ? "Medium" : "Regular" };
  const fontInterSemi = { family: "Inter", style: hasFont("Inter", "Semi Bold") ? "Semi Bold" : "Bold" };
  const fontInterBold = { family: "Inter", style: "Bold" };
  const fontPlayfairItalic = hasFont("Playfair Display", "Italic")
    ? { family: "Playfair Display", style: "Italic" }
    : hasFont("Playfair Display", "Regular")
    ? { family: "Playfair Display", style: "Regular" }
    : fontInterSemi;
  const fontMono = hasFont("JetBrains Mono", "Regular")
    ? { family: "JetBrains Mono", style: "Regular" }
    : fontInterMed;
  const fontMonoBold = hasFont("JetBrains Mono", "Bold")
    ? { family: "JetBrains Mono", style: "Bold" }
    : fontInterBold;

  // Carrega todas as fontes necessárias + fontes já existentes na página
  const fontsToLoad = new Map();
  for (const f of [fontInterReg, fontInterMed, fontInterSemi, fontInterBold, fontPlayfairItalic, fontMono, fontMonoBold]) {
    fontsToLoad.set(`${f.family}::${f.style}`, f);
  }
  for (const root of figma.currentPage.children) {
    const texts = root.findAllWithCriteria({ types: ["TEXT"] });
    for (const t of texts) {
      if (t.fontName && typeof t.fontName === "object" && "family" in t.fontName) {
        fontsToLoad.set(`${t.fontName.family}::${t.fontName.style}`, t.fontName);
      }
    }
  }
  await Promise.all([...fontsToLoad.values()].map((f) => figma.loadFontAsync(f)));

  const rgb = (hex) => {
    const h = hex.replace("#", "");
    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255
    };
  };
  const solid = (hex, opacity = 1) => [{ type: "SOLID", color: rgb(hex), opacity }];
  const gradLinear = (hex1, hex2, op1 = 1, op2 = 1) => [
    {
      type: "GRADIENT_LINEAR",
      gradientTransform: [
        [1, 0, 0],
        [0, 1, 0]
      ],
      gradientStops: [
        { position: 0, color: { ...rgb(hex1), a: op1 } },
        { position: 1, color: { ...rgb(hex2), a: op2 } }
      ]
    }
  ];

  // 1. Remove os fills brancos acidentais de containers Auto-Layout mantendo os botões brancos intencionais
  const intentionalWhiteIds = new Set(["10:26", "15:58", "14:117"]);
  for (const root of figma.currentPage.children) {
    const all = [root, ...("findAll" in root ? root.findAll(() => true) : [])];
    for (const n of all) {
      if (intentionalWhiteIds.has(n.id)) continue;
      if (n.name === "WHITE CONTRAST" || n.name === "Btn / Voz IA Ativa" || n.name === "Button / White Contrast") continue;
      if ((n.type === "FRAME" || n.type === "COMPONENT") && Array.isArray(n.fills) && n.fills.length === 1) {
        const f = n.fills[0];
        if (f.type === "SOLID" && f.color.r > 0.98 && f.color.g > 0.98 && f.color.b > 0.98 && (f.opacity ?? 1) > 0.9) {
          n.fills = [];
        }
      }
    }
  }

  // 2. Ajusta os Master Components (8:36)
  const masterTelemCard = await figma.getNodeByIdAsync("8:53");
  if (masterTelemCard && masterTelemCard.type === "COMPONENT") {
    masterTelemCard.fills = solid("#05080F", 1);
    masterTelemCard.strokes = solid("#FFFFFF", 0.08);
    masterTelemCard.cornerRadius = 12;
    masterTelemCard.resize(305, 83);
    masterTelemCard.primaryAxisSizingMode = "FIXED";
    const headRow = await figma.getNodeByIdAsync("8:54");
    if (headRow) headRow.fills = [];
  }

  const bestSpotTabComp = await figma.getNodeByIdAsync("8:38");
  if (bestSpotTabComp && bestSpotTabComp.type === "COMPONENT") {
    bestSpotTabComp.fills = gradLinear("#34D399", "#10B981");
    bestSpotTabComp.strokes = [];
    bestSpotTabComp.cornerRadius = 9999;
    bestSpotTabComp.effects = [
      {
        type: "DROP_SHADOW",
        color: { ...rgb("#10B981"), a: 0.45 },
        offset: { x: 0, y: 8 },
        radius: 28,
        spread: 0,
        visible: true,
        blendMode: "NORMAL"
      }
    ];
    for (const t of bestSpotTabComp.findAllWithCriteria({ types: ["TEXT"] })) {
      t.fontName = fontInterSemi;
      t.fills = solid("#022C22");
      t.characters = "★ MELHOR AGORA: Itacimirim (A Espera)  ×";
    }
  }

  // 3. Simplifica, iguala a altura (83px) e reposiciona as 4 Caixas de Telemetria (14:127) ANTES do Gráfico 1 (ALTURA E PERÍODO DAS ONDAS)
  const leftCol = await figma.getNodeByIdAsync("10:109");
  const tenMetrics = await figma.getNodeByIdAsync("14:127");
  if (leftCol && tenMetrics && "children" in leftCol) {
    // Reposiciona 14:127 no índice 1 (logo após Active Spot Header 10:111 e ANTES de Chart 1 12:10)
    leftCol.insertChild(1, tenMetrics);
    tenMetrics.fills = [];
    tenMetrics.itemSpacing = 12;

    const cardsSpec = [
      {
        instanceId: "14:130",
        cat: "1. ONDULAÇÃO (SWELL)",
        badge: "⚡ 640 kJ",
        val: "1.7 m · 13 s · SE 135°",
        sub: "Tamanho + Período + Direção + Energia em kJ"
      },
      {
        instanceId: "14:136",
        cat: "2. VENTO",
        badge: "Terral Liso",
        val: "7 km/h · NO 315°",
        sub: "Força + Direção + Relação com a Praia (Alisa a onda)"
      },
      {
        instanceId: "14:142",
        cat: "3. FASES DA MARÉ & LUA",
        badge: "🌕 Lua Cheia",
        val: "Enchendo (0.9m → 1.8m)",
        sub: "Maré Viva · Preamar às 20:51h (Porto de Salvador)"
      },
      {
        instanceId: "14:148",
        cat: "4. TEMPO & TEMP. DA ÁGUA",
        badge: "26 °C Água",
        val: "☀️ Ensolarado (29 °C)",
        sub: "Condição Climática + Temp. da Água (Boardshort)"
      }
    ];

    for (const spec of cardsSpec) {
      const cardInst = await figma.getNodeByIdAsync(spec.instanceId);
      if (cardInst) {
        // Garante que todas as 4 caixas tenham exatamente a mesma altura (83px) e largura (305px)
        cardInst.resize(305, 83);
        cardInst.layoutSizingHorizontal = "FILL";
        cardInst.layoutSizingVertical = "FIXED";

        for (const f of cardInst.findAllWithCriteria({ types: ["FRAME"] })) {
          f.fills = [];
        }
        for (const t of cardInst.findAllWithCriteria({ types: ["TEXT"] })) {
          if (t.name === "Category") {
            t.characters = spec.cat;
            t.fills = solid("#38BDF8");
          } else if (t.name === "Badge") {
            t.characters = spec.badge;
            t.fills = solid("#34D399");
          } else if (t.name === "PrimaryValue") {
            t.characters = spec.val;
            t.fills = solid("#F8FAFC");
          } else if (t.name === "Subtitle") {
            t.characters = spec.sub;
            t.fills = solid("#94A3B8");
          }
        }
      }
    }

    for (const rowId of ["14:128", "14:129"]) {
      const r = await figma.getNodeByIdAsync(rowId);
      if (r) {
        r.fills = [];
        r.layoutSizingVertical = "HUG";
      }
    }
    tenMetrics.layoutSizingVertical = "HUG";
  }

  // 4. Ajusta Hero Section (10:28) e Gráficos Costeiros
  const heroTopRow = await figma.getNodeByIdAsync("10:29");
  if (heroTopRow && "children" in heroTopRow) {
    if (heroTopRow.children.length > 1) {
      heroTopRow.children[1].remove();
    }
    heroTopRow.primaryAxisAlignItems = "CENTER";
  }

  const heroHeadline = await figma.getNodeByIdAsync("10:35");
  if (heroHeadline && "children" in heroHeadline) {
    for (const t of heroHeadline.findAllWithCriteria({ types: ["TEXT"] })) {
      if (t.characters.includes("ondas perfeitas")) {
        t.fontName = fontPlayfairItalic;
        t.fills = solid("#BAE6FD");
      } else {
        t.fontName = fontInterSemi;
        t.fills = solid("#F8FAFC");
      }
    }
  }

  for (const plotId of ["12:48", "12:213", "15:91", "14:48"]) {
    const plotNode = await figma.getNodeByIdAsync(plotId);
    if (plotNode && "fills" in plotNode) {
      plotNode.fills = [
        {
          type: "GRADIENT_LINEAR",
          gradientTransform: [
            [0, 1, 0],
            [-1, 0, 1]
          ],
          gradientStops: [
            { position: 0, color: { ...rgb("#082F49"), a: 0.42 } },
            { position: 1, color: { ...rgb("#0F766E"), a: 0.24 } }
          ]
        }
      ];
    }
  }

  const doughnutVec = await figma.getNodeByIdAsync("15:231");
  if (doughnutVec && "children" in doughnutVec) {
    for (const ch of doughnutVec.children) {
      if (Array.isArray(ch.fills) && ch.fills.length === 1 && ch.fills[0].type === "SOLID") {
        const c = ch.fills[0].color;
        if (c.r > 0.95 && c.g > 0.95 && c.b > 0.95) {
          ch.fills = solid("#020617");
        }
      }
    }
  }

  const rightCol = await figma.getNodeByIdAsync("10:110");

  // 5. Cria o Componente DsySA de Bússola Funcional de Posicionamento da Praia (Último card da Coluna Esquerda 10:109) + Preview do Modal na Coluna Direita
  const compassSvgMarkup = (size) => {
    const ticks = [];
    for (let deg = 0; deg < 360; deg += 10) {
      ticks.push(`<line x1="150" y1="7" x2="150" y2="16" stroke="#CBD5E1" stroke-width="1.5" transform="rotate(${deg} 150 150)"/>`);
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="150" cy="150" r="146" fill="#050C1A" stroke="#38BDF8" stroke-width="2" stroke-opacity="0.45"/>
      <circle cx="150" cy="150" r="133" fill="#071324" stroke="#94A3B8" stroke-width="1" stroke-opacity="0.25"/>
      <circle cx="150" cy="150" r="112" fill="#020617" stroke="#38BDF8" stroke-width="1" stroke-opacity="0.2"/>
      ${ticks.join("")}
      <path d="M 226 74 A 108 108 0 0 1 131 256" stroke="#38BDF8" stroke-width="5" stroke-linecap="round" stroke-opacity="0.6"/>
      <polygon points="242,150 150,141 150,159" fill="#7DD3FC" fill-opacity="0.45"/>
      <polygon points="58,150 150,141 150,159" fill="#7DD3FC" fill-opacity="0.45"/>
      <polygon points="208,92 144,144 156,156" fill="#38BDF8" fill-opacity="0.28"/>
      <polygon points="92,208 144,144 156,156" fill="#38BDF8" fill-opacity="0.28"/>
      <polygon points="208,208 156,144 144,156" fill="#38BDF8" fill-opacity="0.28"/>
      <polygon points="92,92 156,144 144,156" fill="#38BDF8" fill-opacity="0.28"/>
      <polygon points="150,46 139,150 150,150" fill="#F43F5E"/>
      <polygon points="150,46 161,150 150,150" fill="#DC2626"/>
      <polygon points="150,254 139,150 150,150" fill="#38BDF8"/>
      <polygon points="150,254 161,150 150,150" fill="#2563EB"/>
      <circle cx="150" cy="150" r="6" fill="#F8FAFC" stroke="#0F172A" stroke-width="2"/>
    </svg>`;
  };

  if (leftCol && "children" in leftCol) {
    const existingCompass = leftCol.children.find((c) => c.name.includes("Bússola de Posicionamento"));
    if (existingCompass) existingCompass.remove();

    const compassCard = figma.createAutoLayout("VERTICAL", {
      name: "Component / DsySA Card 5 — Bússola de Posicionamento da Praia",
      itemSpacing: 0,
      cornerRadius: 16
    });
    compassCard.fills = solid("#05080F", 0.98);
    compassCard.strokes = solid("#38BDF8", 0.28);
    compassCard.strokeWeight = 1;

    // Topbar
    const topbar = figma.createAutoLayout("HORIZONTAL", {
      name: "Card Header Bar",
      primaryAxisAlignItems: "SPACE_BETWEEN",
      counterAxisAlignItems: "CENTER",
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 10,
      paddingBottom: 10
    });
    topbar.fills = gradLinear("#0F172A", "#1E3A8A", 0.95, 0.35);
    const titleWrap = figma.createAutoLayout("HORIZONTAL", { name: "Title", itemSpacing: 8, counterAxisAlignItems: "CENTER" });
    titleWrap.fills = [];
    const dot = figma.createEllipse();
    dot.resize(8, 8);
    dot.fills = solid("#10B981");
    titleWrap.appendChild(dot);
    const tTitle = figma.createText();
    tTitle.fontName = fontInterBold;
    tTitle.fontSize = 12;
    tTitle.fills = solid("#F8FAFC");
    tTitle.characters = "BÚSSOLA DE POSICIONAMENTO DA PRAIA · Orientação Costeira (SE 130°)";
    titleWrap.appendChild(tTitle);
    topbar.appendChild(titleWrap);

    const tAz = figma.createText();
    tAz.fontName = fontMono;
    tAz.fontSize = 11;
    tAz.fills = solid("#34D399");
    tAz.characters = "Azimute: 0° · Face: 130°";
    topbar.appendChild(tAz);

    compassCard.appendChild(topbar);
    topbar.layoutSizingHorizontal = "FILL";

    // Body (Compass Left + Info & Button Right)
    const body = figma.createAutoLayout("HORIZONTAL", {
      name: "Compass Card Body",
      itemSpacing: 20,
      paddingLeft: 18,
      paddingRight: 18,
      paddingTop: 18,
      paddingBottom: 18,
      counterAxisAlignItems: "CENTER"
    });
    body.fills = [];

    const dialCol = figma.createAutoLayout("VERTICAL", {
      name: "Functional Compass Dial (0°-350°)",
      itemSpacing: 6,
      counterAxisAlignItems: "CENTER"
    });
    dialCol.fills = [];
    const svgNode = figma.createNodeFromSvg(compassSvgMarkup(176));
    svgNode.name = "Compass Rose Vector (N/NE/E/SE/S/SW/W/NW)";
    dialCol.appendChild(svgNode);
    const dialHint = figma.createText();
    dialHint.fontName = fontMono;
    dialHint.fontSize = 10;
    dialHint.fills = solid("#94A3B8");
    dialHint.characters = "N (0°) Topo · S (180°) Base";
    dialCol.appendChild(dialHint);
    body.appendChild(dialCol);

    const infoCol = figma.createAutoLayout("VERTICAL", {
      name: "Beach Positioning Info & Modal Action",
      itemSpacing: 10
    });
    infoCol.fills = [];

    const spotBadge = figma.createAutoLayout("HORIZONTAL", {
      name: "Spot Orientation Badge",
      paddingLeft: 10,
      paddingRight: 10,
      paddingTop: 3,
      paddingBottom: 3,
      cornerRadius: 9999
    });
    spotBadge.fills = solid("#0EA5E9", 0.15);
    spotBadge.strokes = solid("#38BDF8", 0.3);
    const sbText = figma.createText();
    sbText.fontName = fontInterSemi;
    sbText.fontSize = 10;
    sbText.fills = solid("#7DD3FC");
    sbText.characters = "🧭 Itacimirim (A Espera) · Face Costeira: SE 130°";
    spotBadge.appendChild(sbText);
    infoCol.appendChild(spotBadge);

    const mainHeading = figma.createText();
    mainHeading.fontName = fontInterSemi;
    mainHeading.fontSize = 16;
    mainHeading.fills = solid("#F8FAFC");
    mainHeading.characters = "Veja a posição da praia onde você está.";
    infoCol.appendChild(mainHeading);

    const descText = figma.createText();
    descText.fontName = fontInterReg;
    descText.fontSize = 12;
    descText.fills = solid("#CBD5E1");
    descText.resize(380, 36);
    descText.textAutoResize = "HEIGHT";
    descText.characters =
      "A faixa de areia olha diretamente para o quadrante Sudeste (130°), recebendo as ondulações de SE 135° e vento terral de NO 315°.";
    infoCol.appendChild(descText);
    descText.layoutSizingHorizontal = "FILL";

    const expandBtn = figma.createAutoLayout("HORIZONTAL", {
      name: "Button / Ampliar bússola",
      itemSpacing: 8,
      paddingLeft: 18,
      paddingRight: 18,
      paddingTop: 9,
      paddingBottom: 9,
      cornerRadius: 9999,
      counterAxisAlignItems: "CENTER"
    });
    expandBtn.fills = gradLinear("#38BDF8", "#3B82F6");
    expandBtn.effects = [
      {
        type: "DROP_SHADOW",
        color: { ...rgb("#38BDF8"), a: 0.4 },
        offset: { x: 0, y: 10 },
        radius: 26,
        spread: 0,
        visible: true,
        blendMode: "NORMAL"
      }
    ];
    const btnLbl = figma.createText();
    btnLbl.fontName = fontInterBold;
    btnLbl.fontSize = 11.5;
    btnLbl.fills = solid("#020617");
    btnLbl.characters = "🔍 Ampliar bússola";
    expandBtn.appendChild(btnLbl);
    infoCol.appendChild(expandBtn);

    body.appendChild(infoCol);
    infoCol.layoutSizingHorizontal = "FILL";

    compassCard.appendChild(body);
    body.layoutSizingHorizontal = "FILL";

    // Adiciona como ÚLTIMO card da coluna esquerda (10:109)
    leftCol.appendChild(compassCard);
    compassCard.layoutSizingHorizontal = "FILL";
  }

  // Adiciona também o Preview do Modal da Bússola Ampliada (com botão Fechar) na Coluna Direita (10:110)
  if (rightCol && "children" in rightCol) {
    const existingModalPreview = rightCol.children.find((c) => c.name.includes("Modal / Bússola Ampliada"));
    if (existingModalPreview) existingModalPreview.remove();

    const modalCard = figma.createAutoLayout("VERTICAL", {
      name: "Modal / Bússola Ampliada (Estado Aberto c/ Botão Fechar)",
      itemSpacing: 12,
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 16,
      paddingBottom: 16,
      cornerRadius: 16
    });
    modalCard.fills = solid("#070B14", 0.98);
    modalCard.strokes = solid("#38BDF8", 0.4);
    modalCard.strokeWeight = 1;

    const modalHeader = figma.createAutoLayout("HORIZONTAL", {
      name: "Modal Header",
      primaryAxisAlignItems: "SPACE_BETWEEN",
      counterAxisAlignItems: "CENTER"
    });
    modalHeader.fills = [];
    const mTitle = figma.createText();
    mTitle.fontName = fontInterSemi;
    mTitle.fontSize = 13;
    mTitle.fills = solid("#F8FAFC");
    mTitle.characters = "🧭 Modal: Bússola Ampliada (360°)";
    modalHeader.appendChild(mTitle);

    const closeBtn = figma.createAutoLayout("HORIZONTAL", {
      name: "Button / Fechar Modal",
      paddingLeft: 12,
      paddingRight: 12,
      paddingTop: 5,
      paddingBottom: 5,
      cornerRadius: 9999
    });
    closeBtn.fills = solid("#F43F5E", 0.18);
    closeBtn.strokes = solid("#F43F5E", 0.45);
    const closeTxt = figma.createText();
    closeTxt.fontName = fontInterSemi;
    closeTxt.fontSize = 11;
    closeTxt.fills = solid("#FDA4AF");
    closeTxt.characters = "✕ Fechar";
    closeBtn.appendChild(closeTxt);
    modalHeader.appendChild(closeBtn);

    modalCard.appendChild(modalHeader);
    modalHeader.layoutSizingHorizontal = "FILL";

    const modalDialWrap = figma.createAutoLayout("VERTICAL", {
      name: "Enlarged Compass Dial",
      itemSpacing: 8,
      counterAxisAlignItems: "CENTER",
      paddingTop: 8,
      paddingBottom: 8
    });
    modalDialWrap.fills = solid("#020617", 0.85);
    modalDialWrap.cornerRadius = 12;
    const bigSvg = figma.createNodeFromSvg(compassSvgMarkup(220));
    bigSvg.name = "Compass 360° Vector (Ampliada)";
    modalDialWrap.appendChild(bigSvg);
    modalCard.appendChild(modalDialWrap);
    modalDialWrap.layoutSizingHorizontal = "FILL";

    rightCol.appendChild(modalCard);
    modalCard.layoutSizingHorizontal = "FILL";
    rightCol.layoutSizingVertical = "HUG";
  }

  // 6. Torna a altura do card "SurfAgent Voice Assistant" estritamente HUG (ajuste ao conteúdo interno) no Figma
  const voiceCard = (await figma.getNodeByIdAsync("15:252")) ||
    (rightCol && "children" in rightCol
      ? rightCol.children.find((c) => c.name.toLowerCase().includes("voice assistant") || c.name.toLowerCase().includes("surfagent voice"))
      : null);

  if (voiceCard) {
    if ("layoutSizingVertical" in voiceCard) {
      voiceCard.layoutSizingVertical = "HUG";
      voiceCard.layoutSizingHorizontal = "FILL";
      voiceCard.layoutGrow = 0;
      voiceCard.minHeight = null;
      voiceCard.maxHeight = null;
    }
    if ("children" in voiceCard) {
      for (const child of voiceCard.children) {
        if ("layoutSizingVertical" in child) {
          child.layoutSizingVertical = "HUG";
        }
        if ("layoutGrow" in child) {
          child.layoutGrow = 0;
        }
      }
    }
    console.log("✅ Card 'SurfAgent Voice Assistant' configurado como HUG vertical estrito (ajuste ao conteúdo interno) no Figma!");
  }

  if (rightCol) {
    rightCol.primaryAxisAlignItems = "MIN";
    rightCol.layoutSizingVertical = "HUG";
  }

  if (leftCol) leftCol.layoutSizingVertical = "HUG";
  const consoleGrid = await figma.getNodeByIdAsync("10:108");
  if (consoleGrid) consoleGrid.layoutSizingVertical = "HUG";
  const consoleSec = await figma.getNodeByIdAsync("10:69");
  if (consoleSec) consoleSec.layoutSizingVertical = "HUG";
  const mainFrame = await figma.getNodeByIdAsync("10:2");
  if (mainFrame) mainFrame.layoutSizingVertical = "HUG";

  console.log("✅ Bússola de Posicionamento da Praia + Modal c/ Botão Fechar adicionados e sincronizados!");
})();
