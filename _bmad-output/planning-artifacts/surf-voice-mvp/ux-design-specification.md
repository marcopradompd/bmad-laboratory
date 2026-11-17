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

### Fluxo 1: "Qual o pico com as melhores condições para surfar hoje?"
1. **Ação do Usuário:** Toca no microfone (ou atalho de voz) e pergunta *"Qual o pico com as melhores condições para surfar hoje?"*.
2. **Resposta Imediata do SurfAgent (Voz + Balão Interativo):**
   - Localiza via GPS os 4 picos mais próximos.
   - Pergunta por voz e mostra na tela: ***"Você deseja saber de acordo com o seu nível de surfe?"***
3. **Caminho A — Usuário diz/toca "Sim" e escolhe o nível (Iniciante, Intermediário ou Avançado):**
   - O SurfAgent recalcula o score dos 4 picos mais próximos para aquele nível.
   - Abre 4 abas distintas, destaca a melhor para o nível escolhido e narra o resumo por voz.
4. **Caminho B — Usuário diz/toca "Não" (Sem nível específico):**
   - O SurfAgent seleciona entre os 4 picos mais próximos aquele com todas as combinações que geram uma **onda boa, bem formada e forte** (alta qualidade de swell, período, energia, maré e vento terral).
   - Abre as 4 abas, destaca a vencedora e narra o resumo por voz.

### Fluxo 2: Consulta de Praia Específica (Ex.: *"Como está Maresias?"* ou *"Condições em Stella Maris"*)
1. **Ação do Usuário:** Pergunta diretamente sobre uma praia de qualquer região.
2. **Resposta Direta (Sem pergunta de nível):**
   - O SurfAgent **não pergunta o nível de surfe**.
   - Abre (ou atualiza) imediatamente a aba daquela praia, mantendo as outras abas salvas do usuário, mostra apenas as condições completas do pico e responde por voz.

### Fluxo 3: Reabertura do App (Abas Persistentes)
1. O usuário abre o SurfAgent.
2. As abas da última sessão já estão abertas na barra superior e são atualizadas automaticamente com os dados do momento.

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

## 5. Diretrizes Visuais e de Áudio

- **Paleta Oceânica de Alto Contraste:** Azul profundo (`#0A2540`), Turquesa vibrante (`#00B4D8`), Verde Terral/Melhor Pico (`#10B981`) e fundo claro limpo (`#F4F8FB`) para leitura fácil sob sol forte na praia.
- **Voz do Agente (TTS):** Respostas curtas (máximo de 2 frases), diretas e naturais, usando vocabulário real de surfista (*terral, maré enchendo, série, energia*).
- **Microinterações:** Indicador visual de pulso quando o Agente está ouvindo ou falando, e transição instantânea entre abas.

