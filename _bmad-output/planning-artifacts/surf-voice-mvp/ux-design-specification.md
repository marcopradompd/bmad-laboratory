---
stepsCompleted: ["step-01-init", "step-02-discovery", "step-03-core-experience", "step-04-voice-and-tabs-architecture", "step-05-visual-hierarchy"]
inputDocuments: ["SurfAgent.md"]
productName: "SurfAgent"
---

# UX Design Specification — SurfAgent (MVP)

**Author:** Marco  
**Date:** 2026-11-17  
**Product:** SurfAgent — Assistente de Surfe por Voz e Abas Inteligentes

---

## 1. Visão Geral da Experiência (UX Vision)

O **SurfAgent** foi projetado sob o princípio **"Pergunte falando, decida olhando"**. Diferente dos apps tradicionais abarrotados de tabelas e mapas complexos, a interface do SurfAgent é dividida em apenas **3 zonas claras e leves**:
1. **Barra de Abas Persistentes (Topo):** Mostra os picos abertos (sejam os 4 picos mais próximos ou picos específicos consultados), destacando com um selo dourado/verde o pico com a **Melhor Condição Agora**, além de indicar que todas as abas foram atualizadas automaticamente ao abrir o app.
2. **Painel Visual do Pico Ativo (Centro):** Cartões limpos e escaneáveis em menos de 3 segundos contendo **Ondulação (Tamanho, Período, Direção, Energia)**, **Vento (Força, Direção, Terral/Maral)**, **Maré & Lua (Fase da maré + Fase da lua)** e **Clima & Água (Tempo + Temperatura da água)**.
3. **Dock do Agente de Voz IA (Base Fixa / Interativa):** Botão central de microfone com ondas sonoras animadas, transcrição ao vivo do Agente e *chips* rápidos de resposta quando o Agente pergunta: *"Você deseja saber de acordo com o seu nível de surfe?"*.

---

## 2. Desafios de Design e Soluções

| Desafio de UX | Solução no SurfAgent |
| :--- | :--- |
| **1. Distinguir Consulta de Pico Específico vs. Recomendação "Melhor Hoje"** | Na consulta de **pico específico**, o app não interrompe o usuário com perguntas extras: abre direto a aba da praia e fala suas condições. Já na consulta **"Qual o melhor pico hoje?"**, o Agente abre um diálogo rápido perguntando se o usuário deseja filtrar pelo **nível de surfe** (*Sim: Iniciante / Intermediário / Avançado* ou *Não: Onda boa, bem formada e forte*). |
| **2. Comparar 4 picos próximos sem poluir a tela** | Em vez de empilhar 4 listas gigantes, os 4 picos mais próximos abrem em **4 abas horizontais**. A aba vencedora recebe o selo `★ Melhor Agora` e já abre selecionada. O usuário alterna entre as 4 abas com um único toque. |
| **3. Exibir 10 indicadores técnicos de forma leve** | Agrupamento semântico em **4 Cards Visuais (2x2)**: Card 1 (Ondulação + Energia), Card 2 (Vento + Relação com a Praia), Card 3 (Maré + Fase da Lua) e Card 4 (Clima + Temperatura da Água). |
| **4. Retorno ao app sem retrabalho** | As abas ficam salvas localmente (`localStorage`). Ao abrir o app, um indicador sutil mostra *"Abas salvas atualizadas agora"* com todos os dados renovados. |

---

## 3. Fluxos de Interação (User Flows)

### Fluxo 1: "Falar com o SurfAgent" (Triagem por Voz & Máquina de Estados)
1. **Ação do Usuário:** Toca no botão principal **"Falar com o SurfAgent"** (ou atalho de microfone).
2. **Estado 1 (Geolocalização Inicial e Top 4 Próximos):**
   - No primeiro acesso, o app solicita permissão de GPS e calcula as distâncias reais via fórmula de Haversine contra a base de picos.
   - Renderiza os **4 picos mais próximos** em abas no topo da interface.
   - Caso a localização seja negada, exibe o aviso discreto: `📍 Localização desativada · Usando Salvador como padrão · [Ativar Localização]`.
3. **Estado 2 (Saudação e Triagem de Nível por Voz):**
   - O SurfAgent fala com voz natural sintetizada:
     > *"Você gostaria de saber a previsão de acordo com o seu nível? Se sim, diga qual dos níveis é o seu: avançado, intermediário ou iniciante. Caso não, apenas diga: apenas me traga a praia com as melhores condições."*
   - A interface exibe o balão de transcrição e 4 chips táteis de clique rápido:
     - `🌊 Melhores Condições (Sem Nível)`
     - `🟢 Iniciante`
     - `🟡 Intermediário`
     - `🔴 Avançado`
4. **Estado 3 (Processamento da Resposta do Usuário via STT):**
   - O sistema classifica a fala do usuário em uma das 4 intenções:
     - `INTENT_NO_LEVEL` (Sem nível / onda boa e forte / "não precisa" / "melhores condições")
     - `INTENT_BEGINNER` (Iniciante / "básico" / "começando")
     - `INTENT_INTERMEDIATE` (Intermediário / "médio" / "evolução")
     - `INTENT_ADVANCED` (Avançado / "experiente" / "pro" / "pressão")
5. **Estado 4 (Ranqueamento Técnico & Resposta Falada):**
   - O motor `rankSpotsForSurfer` pontua os 4 picos (0 a 100) ponderando:
     - **Altura da onda (30%)**
     - **Vento terral/intensidade (30%)**
     - **Período e Energia (25%)**
     - **Compatibilidade com a maré atual e tipo de fundo (15%)**
   - **Contexto de Maré:** Se a maré ideal virar nas próximas 2 horas, o SurfAgent inclui a dica de horário na fala.
   - **Fallback Inteligente:** Se nenhum pico atingir score $> 60$, indica o pico mais abrigado e relata a restrição (ex: mar flat ou maral tempestuoso).
6. **Estado 5 (Sincronização Visual):**
   - A aba do pico vencedor é focada (adicionada à barra caso nova) com a insígnia `★ MELHOR AGORA`.
   - O gráfico de ondas, bússola e telemetria atualizam instantaneamente.

### Fluxo 2: Consulta de Praia Específica (Ex.: *"Como está Maresias?"* ou busca direta)
1. **Ação do Usuário:** Pergunta diretamente sobre uma praia ou digita na barra de busca.
2. **Resposta Direta (Sem pergunta de nível):**
   - O SurfAgent **não pergunta o nível de surfe**.
   - Adiciona o pico como uma **nova aba** na lista de abas existentes (sem duplicatas) e ativa-a imediatamente.
   - Dispara a requisição meteorológica e narra por voz as condições daquele pico.

### Fluxo 3: Reabertura do App (Abas Persistentes e Revalidação Automática)
1. O usuário reabre o SurfAgent.
2. As abas abertas na última sessão são restauradas do `localStorage` na mesma ordem.
3. O app dispara automaticamente uma nova requisição para a API meteorológica (Open-Meteo), garantindo que os dados, marés e gráficos estejam 100% atualizados para o momento do acesso.

---

## 4. Arquitetura da Tela (Wireframe Estrutural)

```text
+-------------------------------------------------------------------+
| 🌊 SurfAgent                     📍 GPS Ativo | 🔄 Atualizado agora |
+-------------------------------------------------------------------+
| ABAS SALVAS (Persistentes e Auto-atualizáveis):                   |
| [ ★ 1. Itacimirim (Melhor) ] [ 2. Guarajuba ] [ 3. Stella ] [ + ] |
+-------------------------------------------------------------------+
| DESTAQUE DO PICO ATIVO                                            |
| Praia de Itacimirim • A 6,4 km de você                            |
| Badge: [ ★ Melhor Condição: Onda Boa, Bem Formada e Forte ]       |
| 🔊 Resumo IA: "1.6m com 13s de SE, 610 kJ e vento terral fraco."  |
+-------------------------------------------------------------------+
| PAINEL DE CONDIÇÕES (Grid 2x2 Leve e Escaneável)                  |
| +-------------------------------+ +-----------------------------+ |
| | 🌊 ONDULAÇÃO (SWELL)          | | 💨 VENTO                    | |
| | Tamanho: 1.6 m                | | Força: 8 km/h (Fraco)       | |
| | Período: 13 s                 | | Direção: NO 315° (↗)        | |
| | Direção: SE 135° (↖)          | | Condição: [ TERRAL LISO ]   | |
| | Energia: 610 kJ (Forte)       | |                             | |
| +-------------------------------+ +-----------------------------+ |
| +-------------------------------+ +-----------------------------+ |
| | 🌙 MARÉ & LUA                 | | ☀️ TEMPO & ÁGUA             | |
| | Fase da Maré: Enchendo (0.9m) | | Clima: Sol (28 °C)          | |
| | Próx. Cheia: 14:20 (1.9m)     | | Temp. da Água: 26 °C        | |
| | Fase da Lua: 🌕 Lua Cheia     | | Sugestão: Lycra / Boardshort| |
| +-------------------------------+ +-----------------------------+ |
+-------------------------------------------------------------------+
| DOCK DE VOZ DO SURFAGENT (Fixo na Base)                           |
| 💬 "Você deseja saber de acordo com o seu nível de surfe?"        |
| [ Iniciante ] [ Intermediário ] [ Avançado ] [ Não (Onda Forte) ] |
|                (( 🎙️ Segure ou Toque para Falar ))                |
+-------------------------------------------------------------------+
```

---

## 5. Diretrizes Visuais (DsySA), Background Reativo ao Clima e Áudio

### 5.1 Sistema de Background Dinâmico de Acordo com o Clima (`DsySA Weather Aura`)
O background do **SurfAgent** é uma superfície viva que muda automaticamente de acordo com as condições meteorológicas da praia selecionada na aba ativa, comunicando o clima de forma sensorial antes mesmo de o usuário ler os números:

| Condição Climática | Comportamento Visual do Background (`DsySA`) | Paleta & Efeitos Atmosféricos |
| :--- | :--- | :--- |
| **☀️ Ensolarado (`sunny`)** | Background **azulado oceânico luminoso** combinado com **brilho amarelo sol** irradiando no topo direito/central. | Gradiente azul celeste/oceano (`#041E42` → `#0284C7`) + Orbe solar amarelo/dourado (`#FACC15` / `#F59E0B`) com pulso suave (`@keyframes dsysa-sun-pulse`). |
| **⛅ Parcialmente Nublado (`partly_cloudy`)** | Background condizente que equilibra **tons azulados suaves**, **feixe solar amarelo difuso** e **camadas de nuvens translúcidas** flutuando lentamente. | Azul-ardósia suave (`#0B2545` → `#334155`) + halo solar ameno (`rgba(250, 204, 21, 0.22)`) + camadas nebulosas (`@keyframes dsysa-cloud-drift`). |
| **🌧️ Chuvoso (`rainy`)** | Background **acinzentado atmosférico** com véu de chuva diagonal contínuo e suave. | Cinza-chumbo / ardósia (`#1E293B` → `#334155` → `#0F172A`) + feixes diagonais de chuva (`@keyframes dsysa-rain-fall`). |
| **⛈️ Chuva com Raios (`thunderstorm`)** | Background **acinzentado escuro de tempestade** com chuva intensa e **efeito de piscar de raios (clarões elétricos / relâmpagos)** no céu. | Cinza-tempestade profundo (`#090D16` → `#1E293B`) + chuva + **animação de clarão e raio (`@keyframes dsysa-lightning-flash`)** iluminando momentaneamente o céu. |

### 5.2 Gráficos Costeiros com Scroll Horizontal Infinito por Toque (Mobile-First)
- **Gráfico de Altura, Período e Direção Primária das Ondas:** 4 sub-abas (`Altura total`, `Vagas`, `Swell A`, `Swell B`), barras coloridas pelo período primário (`2s` a `21+s`), eixo Y duplo em metros e setas de direção primária.
- **Gráfico de Vento de Superfície Médio:** Seletor `COSTEIRO` | `MARÍTIMO`, conversão dinâmica entre `Nós (KT)`, `Km/H`, `M/S` e `MPH`, barras empilhadas (`Vento` amarelo + `Rajadas` laranja) e setas coloridas (`fraco`, `terral`, `cruzado`, `maral`).
- **Scroll Horizontal Infinito por Toque (Dedo):** Ambos os gráficos e a barra de abas permitem arrastar com o dedo em celulares (`touch-action: pan-x`), carregando mais dias até o limite da previsão e exibindo ***"Neste momento só temos previsão até sexta 27/11"***.

### 5.3 Voz do Agente (TTS) e Microinterações
- **Voz do Agente (TTS):** Respostas curtas, diretas e naturais, usando vocabulário real de surfista (*terral, maré enchendo, série, energia*).
- **Microinterações (`DsySA`):** Botão de voz *Laser-Edge Glow*, indicador de pulso durante escuta/fala e transição suave de `700ms` no background climático ao alternar entre abas de picos.

