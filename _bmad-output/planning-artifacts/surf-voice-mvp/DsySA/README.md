# DsySA — Design System SurfAgent (v1.0)

O **DsySA (Design System SurfAgent)** é o sistema de design oficial do **SurfAgent**, extraído integralmente da estética dark-futurista, telemetria luminosa e microinterações da referência `mira-growth.aura.build` e adaptado para a experiência multimodal (Voz + Abas Inteligentes + Oceanografia em Tempo Real).

---

## 📁 Estrutura do Diretório `DsySA/`

- [`tokens.json`](./tokens.json) — Design Tokens estruturados (cores, superfícies, tipografia, espaçamentos, bordas, sombras e animações).
- [`dsysa.css`](./dsysa.css) — Folha de estilos completa com variáveis CSS, máscaras de borda gradiente (`--border-gradient`), `@keyframes`, botões Laser-Edge Glow, abas persistentes e utilitários.
- [`dsysa.js`](./dsysa.js) — Motor JavaScript com `IntersectionObserver` para animações de scroll (`fadeSlideIn`), inicializador WebGL Aura (`UnicornStudio`) e fábricas de gráficos Chart.js (`createDsySASwellChart` e `createDsySADoughnutChart`).
- [`index.html`](./index.html) — **Catálogo Interativo Vivo (Showcase DsySA + Console SurfAgent Completo)** com todos os componentes, gráficos, animações, alertas, abas e voz funcionando ao vivo.

---

## 1. Fundações Visuais (Cores, Fundos & Atmosfera)

### 1.1 Superfícies & Backgrounds (Dark Ocean Telemetry)
| Token / Classe | Hex / Valor | Aplicação no SurfAgent |
| :--- | :--- | :--- |
| `--dsysa-bg-canvas` / `bg-black` | `#000000` | Fundo global absoluto com contraste máximo. |
| `--dsysa-bg-midnight` / `bg-[#02010A]` | `#02010A` | Containers principais de seção com glow radial indigo/blue no topo. |
| `--dsysa-bg-telemetry` / `bg-[#05080F]` | `#05080F` | Painéis internos de radar GPS, gráficos de ondulação, feixes SVG e barras de score. |
| `--dsysa-bg-glass-dark` / `bg-[#0A0A10]/90` | `#0A0A10` | Cards flutuantes com `backdrop-blur-xl` (Alertas de Swell, Resumo de Voz da IA, Score Breakdown). |
| `Aura WebGL Shader` | `UnicornStudio (bcBYZIStYXwiogchBNHO)` | Background interativo no Hero com máscara vertical (`mask-image: linear-gradient(transparent, black 0%, black 80%, transparent)`). |
| `Dot Matrix Grid` | `radial-gradient(rgba(255,255,255,0.1) 1px, transparent 0)` | Grade pontilhada `16px × 16px` para fundos de órbita de IA e sensores oceânicos. |

### 1.1-B Background Dinâmico Reativo ao Clima (`DsySA Weather Aura` — `setDsySAWeatherBackground`)
O background do aplicativo muda automaticamente conforme a condição climática da praia aberta na aba ativa (ou via seletor de simulação):
- **☀️ Ensolarado (`.weather-sunny`):** Background azulado oceânico luminoso (`#031B38` → `#073B6B`) junto com um grande **sol amarelo/dourado** (`#FACC15` / `#F59E0B`) com pulso suave (`@keyframes dsysa-sun-pulse`).
- **⛅ Parcialmente Nublado (`.weather-partly_cloudy`):** Background mesclando tons azulados suaves (`#0B2545` → `#1E3A5F`), brilho solar amarelo difuso e camadas de nuvens translúcidas em movimento (`@keyframes dsysa-cloud-drift`).
- **🌧️ Chuvoso (`.weather-rainy`):** Background **acinzentado atmosférico** (`#273244` → `#334155` → `#111827`) com véu de chuva diagonal contínuo (`@keyframes dsysa-rain-fall`).
- **⛈️ Chuva com Raios (`.weather-thunderstorm`):** Background **acinzentado escuro de tempestade** (`#111827` → `#1E293B` → `#090D16`) com chuva densa e **efeito de piscar de raios (`@keyframes dsysa-lightning-flash`) + feixe de relâmpago no céu (`@keyframes dsysa-bolt-strike`)**.

### 1.2 Cores Semânticas do SurfAgent
- **Sky & Blue (`#38BDF8` / `#3B82F6`):** Ondulação (Swell), Energia da Onda (kJ), Período (s) e voz ativa do Agente IA.
- **Emerald (`#10B981` / `#34D399` + `shadow-[0_0_8px_#10b981]`):** **Melhor Pico Agora**, **Vento Terral Liso** e **Match de Nível de Surfe**.
- **Cyan (`#22D3EE` / `#06B6D4`):** Direção do vento, temperatura da água e ações rápidas da IA.
- **Indigo & Purple (`#6366F1` / `#8B5CF6` / `#A855F7`):** Radar GPS dos **4 Picos Mais Próximos** e Astronomia Costeira (**Fases da Maré e da Lua**).
- **Amber (`#FCD34D` / `#FB923C`):** Vento lateral/cruzado ou maré em transição.
- **Rose (`#F43F5E` / `#FB7185` + `shadow-[0_0_8px_#f43f5e]`):** **Swell Spike (Mar Pesado / Alta Energia)** e indicador de microfone gravando voz.

---

## 2. Tipografia & Hierarquia

1. **`Inter` (`--dsysa-font-sans`):** Fonte primária de interface, métricas numéricas, botões, abas e cartões técnicos (`tracking-tight`).
2. **`Playfair Display Italic` (`--dsysa-font-serif`):** Fonte editorial usada em palavras de destaque emocional nos títulos (ex.: *"ondas perfeitas"*, *"condição épica"*).
3. **`Geist` (`--dsysa-font-geist`):** Fonte técnica para painéis de telemetria, radar e arquitetura de sinais.
4. **`Monospace` (`font-mono`):** Usada nas barras de consulta do Agente de IA (`Query: Nível = Intermediário | Swell > 1.2m & Vento = Terral`).
5. **Eyebrows:** `text-[11px] uppercase font-medium tracking-[0.2em] text-sky-300` (ou `text-cyan-400`).

---

## 3. Bordas, Cantos & Sombras

- **Borda Gradiente com Máscara CSS (`[style*="--border-gradient"]::before`):**
  Cria uma borda de `1px` luminosa com `mask-composite: exclude` usando `linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0))`.
- **Bordas Hairline Internas:** `border border-white/5` (cards padrão), `border-white/10` (inputs/modais) e `hover:border-emerald-500/30` ou `hover:border-blue-500/30`.
- **Brilho Superior Interno (Top Specular Highlight):** `shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]`.

---

## 4. Botões (Adaptados para Voz e Navegação)

1. **Laser-Edge Glow Button (`.dsysa-btn-laser`):** Botão principal de comando de voz (`🎙️ PERGUNTAR POR VOZ`) com 4 feixes lineares luminosos nas bordas (`left`, `right`, `top`, `bottom`), `blur-[4px]` constante e `blur-[10px]` + `radial-gradient` sky/rose no hover/escuta.
2. **Sky-to-Blue Pill CTA:** `rounded-full bg-gradient-to-r from-sky-400 to-blue-500 text-slate-950 shadow-[0_14px_40px_rgba(56,189,248,0.45)]`.
3. **Abas Persistentes de Picos (`.dsysa-tab`):** Abas em formato pill com estado padrão glass, estado ativo em gradiente Sky/Blue e variante `.best-spot` em Emerald (`★ MELHOR AGORA`).
4. **Prompt Chips do Agente de IA:** Botões rápidos com ícone (`bg-slate-950/60 hover:bg-slate-900/70 rounded-xl px-3 py-2 text-[11px]`) usados tanto para perguntas rápidas quanto para responder ***"Você deseja saber de acordo com o seu nível de surfe?"***.

---

## 5. Gráficos, Radar & Visualizações de Dados

1. **Gráfico DsySA de Altura, Período e Direção Primária das Ondas (`renderDsySAWavePeriodChart`):**
   - **Decomposição Espectral em 4 Sub-Abas Interativas:** `Altura total`, `Vagas`, `Swell A` e `Swell B`.
   - **Linha do Tempo Multi-Dias + Faixas Diurnas/Noturnas:** Cabeçalhos de dias (`Ontem`, `TER 17`, `QUA 18`, `QUI 19`, `SEX 20`, `SÁB 21`, `DOM 22`) com marcador luminoso `AGORA` e sombreamento de colunas por turno.
   - **Eixo Y Duplo (Esquerda e Direita em `metros`):** Linhas tracejadas horizontais em `0.5m`, `1.0m`, `1.5m`, `2.0m`, `2.5m` e `3.0m`.
   - **Barras Verticais Coloridas pelo Período Primário (`2s` a `21+s`):** A altura representa o tamanho da onda em metros e a cor mapeia diretamente o período primário em segundos (`--dsysa-period-2` a `--dsysa-period-21`), com brilho neon e leitura detalhada de `Altura | Período | Direção | Energia (kJ)` ao passar o mouse.
   - **Linha de Direção Primária (`direção primária`):** Badges circulares azuis (`dsysa-dir-circle`) com setas SVG rotacionadas no ângulo exato da ondulação + sigla cardeal (`SE`, `ESE`, `SSE`, `L`, `S`).
   - **Escala Espectral de Cores (`2` a `21+` segundos):** Régua cromática de 20 níveis que destaca automaticamente o bloco correspondente ao período da barra em foco.
   - **Scroll Horizontal Infinito Progressivo (`attachDsySAInfiniteTouchScroll`):** Suporta arrastar com o dedo em telas touch (celulares/tablets via `touchstart`/`touchmove`/`touchend` e `touch-action: pan-x`), arrastar com o mouse (*drag-to-scroll*) e roda do mouse (wheel). Carrega novos dias de previsão automaticamente conforme o usuário avança e, ao atingir o limite de dados disponíveis, exibe o card final e o alerta: ***"Neste momento só temos previsão até sexta 27/11"***.
2. **Gráfico DsySA de Vento de Superfície Médio (`renderDsySAWindChart`):**
   - **Seletor de Zona (`COSTEIRO` | `MARÍTIMO` | `?`):** Alterna entre a previsão costeira (influenciada pelo relevo e terral matinal na praia) e marítima (alto-mar aberto), acompanhado de botão de ajuda explicativo e nota sobre unidades.
   - **Conversão Dinâmica em 4 Unidades (`Nós (KT)`, `Km/H`, `M/S`, `MPH`):** Ao alternar a aba de unidade, ambos os eixos Y (esquerdo e direito), as linhas de referência tracejadas e o readout de toque/hover convertem automaticamente todas as velocidades.
   - **Barras Empilhadas (`Vento` `#FACC15` + `Rajadas` `#F97316`):** Segmento inferior amarelo exibindo o vento sustentado médio e topo laranja exibindo as rajadas.
   - **Linha de Direção Média (`direção média`) + `CORES DAS SETAS`:** Círculos direcionais com setas SVG rotacionadas e código cardeal (`N`, `ONO`, `E`, `NNO`, `ESE`, `NE`, `NNE`, `NO`, `ENE`), coloridos conforme a qualidade para o surfe:
     - **`fraco`** (`#818CF8` — Indigo/Lavanda)
     - **`terral`** (`#16A34A` — Verde/Esmeralda)
     - **`cruzado`** (`#EA580C` — Laranja/Âmbar)
     - **`maral`** (`#991B1B` — Vermelho/Carmesim)
   - **Scroll Horizontal Infinito por Toque/Mouse:** Mesmo comportamento progressivo do gráfico de ondas, exibindo ***"Neste momento só temos previsão até sexta 27/11"*** ao chegar ao final.
3. **Gráfico DsySA de Previsão de Energia das Ondas (`renderDsySAWaveEnergyChart`):**
   - **Decomposição Espectral em 4 Sub-Abas:** `Energia total`, `Vagas`, `Swell A` e `Swell B`, além de seletor rápido de unidade (`kJ` vs. `J/m²`) e botão de ajuda `?` explicando a relação física $E \propto H^2 \cdot T$.
   - **Eixo Y Duplo (Esquerda e Direita em `kJ` / `J/m²`):** Linhas tracejadas horizontais de `200 kJ` a `1200 kJ`.
   - **Barras Coloridas por Intensidade Hidrodinâmica + Valores no Topo:** Cada barra exibe o valor numérico de energia e recebe a cor correspondente da escala de potência DsySA (`100 Fraca`, `200 Suave`, `350 Moderada`, `500 Boa`, `750 Forte`, `1000 Pesada`, `1500 Grande`, `2000+ Extrema`).
   - **Linha de Direção Primária + Scroll Horizontal Infinito por Toque/Mouse:** Suporta arrastar com o dedo em celulares e mouse no desktop até o limite da previsão (**"Neste momento só temos previsão até sexta 27/11"**).
4. **Componente DsySA de Tábua de Marés e Horas dos Astros (`renderDsySATideChart` — `ALTURA DA MARÉ`):**
   - **Pino de Porto de Referência (`📍 porto de salvador`):** Identifica automaticamente o porto astronômico de referência da praia ativa.
   - **Seção Superior `Horas dos astros`:** Exibe para cada dia o nascer do sol (`4:57h` ▲), pôr do sol (`17:41h` ▼), fase da lua (`crescente` / `cheia`), nascer da lua (`10:42h` ▲) e pôr da lua (`23:35h` ▼).
   - **Curva Senoidal Bicolor Contínua (`Enchendo` vs. `Vazante`):** Área preenchida em Ciano Luminoso (`#00E5FF`) durante a maré enchendo e Azul Oceano (`#0284C7`) durante a maré vazante, com escala vertical de `0 m`, `1 m` e `2 m`.
   - **Marcador Interativo de Hora e Altura Atual (`20:30h | 1.7 m`):** Badge em carmesim (`#BE123C`) com linha tracejada vertical e ponteiro triangular sobre a curva (clicável para inspecionar qualquer horário).
   - **Caixas Escalonadas de Preamar e Baixamar:** Duas linhas abaixo do eixo horário (`0h 3h 6h 9h 12h 15h 18h 21h`) destacando todas as marés cheias (`#00E5FF`) e marés secas (`#0284C7`).
   - **Mini-Mapa Panorâmico de 8 Dias + Modos `GRÁFICOS | TABELAS | MÊS`:** Barra panorâmica inferior para salto rápido entre dias e alternância entre visualização gráfica, tabela completa de marés/astros e visão lunar mensal.
   - **Scroll Horizontal Infinito por Toque/Mouse:** Mesmo comportamento progressivo até o limite da previsão (**"Neste momento só temos previsão até sexta 27/11"**).
5. **Gráfico Doughnut (Chart.js — Balanço das Condições):** `cutout: "70%"` mostrando o peso de Ondulação/Energia, Vento e Maré.
3. **Anel Multi-Segmento SVG (`Spot Condition Score 0–100`):** 4 arcos concêntricos coloridos (`#10b981`, `#06b6d4`, `#8b5cf6`, `#f43f5e`) com rotação suave de `1000ms` no hover.
4. **Barras de Telemetria Animadas (`@keyframes aura-bar`):** Barras horizontais com glow neon para Tamanho da Ondulação (`m`), Período (`s`), Energia (`kJ`) e Força do Vento (`km/h`).
5. **Curva SVG Animada (`@keyframes aura-spark`):** Sparkline contínua com preenchimento em gradiente e ponto luminoso pulsante para representar **Fases da Maré (Enchendo/Vazante)** e trem de ondas.
6. **Radar GPS Conic Sweep (`4 Picos Mais Próximos`):** Radar circular com varredura cônica (`animate-[spin_6s_linear_infinite]`) e pontos pulsantes (`animate-ping`) representando os 4 picos próximos ao usuário e destacando a janela ideal.
7. **Hub de Feixes SVG (`#beam-glow`):** Feixes animados (`stroke-dashoffset`) conectando os 6 sinais oceânicos (**Ondulação, Período, Energia, Vento, Maré & Lua, Temp. da Água**) ao núcleo de IA do **SurfAgent**.

