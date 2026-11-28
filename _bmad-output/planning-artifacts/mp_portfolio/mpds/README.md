# MPDs — Marco Prado Design System (v1.0)

Sistema de design sóbrio, editorial e arquitetônico criado para o portfólio de **UX / AI Designer** de Marco Prado.

## Origem & Síntese Visual
- **Fundações & Componentes (Referência `Architect`):** paleta Warm Stone (`#EAEAE5`), superfície branca elevada (`#FFFFFF`), ink `#1C1C1C`, bordas arquitetônicas `#D6D3D1`, grid suíço de 12 colunas (`max-width: 1400px`), tipografia `Inter` + `Geist Mono`, botões sólidos/outline pill, inputs, alertas sóbrios e ícones `Solar` (`iconify-icon`).
- **Física de Movimento & Micro-interações (Referência `Gemini`):** Blur-Up Scroll Reveal (`mpds-animate-on-scroll`), Clip-Path Masked Text Reveal (`mpds-text-mask`), botão assinatura 1px Conic Shimmer Beam (`mpds-btn-beam`), Flashlight Spotlight (`mpds-flashlight`), Interactive 3-Card Deck (`[data-mpds-deck]`) e Infinite Alpha-Mask Marquee (`mpds-marquee-wrap`), com suporte completo a `prefers-reduced-motion`.

## Arquivos em `mpds/`
- `mpds-tokens.json` — Design tokens estruturados (cores, tipografia, espaçamento, raios e motion).
- `mpds.css` — Folha de estilos completa com variáveis CSS `:root`, componentes e animações.
- `mpds.js` — Runtime leve sem dependências (scroll observer, flashlight cursor, deck switcher, alerts e toasts).
- `index.html` — Documentação viva e showcase interativo de todos os tokens, componentes e animações.

## Como usar no site portfólio
Inclua no `<head>` e antes de fechar o `</body>`:

```html
<link rel="stylesheet" href="./mpds/mpds.css" />
<script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>
<!-- ... conteúdo com <body class="mpds-body"> e <div class="mpds-shell"> ... -->
<script src="./mpds/mpds.js"></script>
```
