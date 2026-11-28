# Mpdownloader v2.0 — Captura Offline com Playwright + Chromium (MPDs)

Captura páginas web modernas (JavaScript, SPAs, animações, fontes `@font-face` e imagens com *lazy loading*) usando um navegador **Chromium real** via Playwright, empacotando tudo em `.zip` offline pronto para abrir por duplo clique ou servidor local.

## 1. Rodar no seu PC (com Chromium real)
Dentro da pasta `mpdownloader`:

```bash
npm run setup
npm start
```

Depois abra no navegador:
**http://localhost:3333**

## 2. Subir na nuvem com 1 clique (Railway / Render / Fly.io / Coolify)
O `Dockerfile` já usa a imagem oficial `mcr.microsoft.com/playwright:v1.49.0-noble` com Node.js + Chromium pré-instalados:
1. Suba a pasta `mpdownloader/` para um repositório Git.
2. No **Railway** ou **Render**, crie um **Web Service** escolhendo **Docker** (ele detecta o `Dockerfile` automaticamente).
3. Pronto — seu Mpdownloader roda com Chromium real na nuvem!

## 3. Arquivos da pasta
- `index.html` — Interface enxuta (MPDs v1.0).
- `opcao-2.html` — Interface completa com seções e histórico.
- `server.js` — Backend Node.js com **Playwright + Chromium** (e proteção SSRF).
- `package.json` & `Dockerfile` — Configuração pronta para PC local e deploy em nuvem.
- `api.php` — Alternativa leve em PHP puro para sites abertos em cPanel.
- `mpds/` — Assets autocontidos do Design System MPDs (`mpds.css` e `mpds.js`).
