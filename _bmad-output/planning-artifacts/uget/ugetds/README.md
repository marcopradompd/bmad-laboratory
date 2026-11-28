# ugetds — uGet Design System (v1.0)

Design System oficial e escalável para o **uGet** — plataforma digital que conecta consumidores a benefícios e convênios de associações, sindicatos e instituições usando **geolocalização e notificações inteligentes**.

## Síntese Visual & Referências
- **Marca & Paleta (Identidade uGet):** Roxo Royal (`#6B2F8F`, Pin `G`), Berry (`#9B246D`, ofertas & descontos), Deep Navy (`#03223A`, contraste VIP), Mist (`#DCE6EE`, fundo da marca) e **formas geométricas em Chevron 45° + Pin `G`**.
- **Componentes & Tipografia (Referência Revolut):** Botões pill táteis (`9999px`), cards elevados (`28px`), `Plus Jakarta Sans` + `Inter` + `JetBrains Mono`, inputs arredondados com ação GPS e carteirinha digital com **3D Tilt**.
- **Motion & Micro-interações (Referência Gemini):** Blur-Up Scroll Reveal, Clip-Path Masked Text, 1px Conic Shimmer Beam CTA, Flashlight Spotlight, Interactive 3-Card Deck e Infinite Alpha-Mask Marquee.

## Arquivos em `ugetds/`
- `index.html` — Showcase vivo e documentação interativa completa (com radar GPS e simulador de notificações).
- `ugetds.css` — Tokens `:root`, componentes, formas geométricas e animações (com `prefers-reduced-motion`).
- `ugetds.js` — 16 ícones SVG autorais do domínio uGet (`[data-uget-icon]`), scroll observer, flashlight, 3D tilt, 3-card deck e `UgetDS.geoNotify(...)`.
- `ugetds-tokens.json` — Design tokens estruturados para CSS, JS ou Figma.
