---
stepsCompleted: ["step-01-init", "step-02-discovery", "step-02b-vision", "step-02c-executive-summary", "step-03-prioritization", "step-04-requirements"]
inputDocuments: []
workflowType: 'prd'
productName: 'SurfAgent'
classification:
  projectType: Mobile / Web App (PWA / App Nativo Leve)
  domain: Esportes / Surf Forecast / Voice AI
  complexity: Média
  projectContext: Greenfield (MVP Global)
  targetAudience:
    - Surfistas de todos os níveis (iniciantes, intermediários e avançados) em qualquer litoral
    - Surfistas em deslocamento (no carro, preparando equipamento) que precisam de interação hands-free por voz
  keyDifferentiators:
    - Interação Voice-First com Agente de IA conversacional (STT + LLM + TTS)
    - Interface Multimodal sincronizada (resposta falada + dados visuais em tela)
    - Cobertura aberta para todas as praias
    - Recomendação inteligente dos 4 picos mais próximos (personalizada por nível de surfe ou focada em onda boa, bem formada e forte)
    - Consulta direta de pico específico sem fricção (exibe apenas as condições do pico solicitado)
    - Navegação em abas persistentes por pico com atualização automática ao abrir o app
---

# Product Requirements Document (PRD) — SurfAgent (MVP)

**Product Name:** SurfAgent  
**Author:** Marco  
**Date:** 2026-11-17  
**Version:** 1.1 (MVP)

---

## 1. Resumo Executivo

Surfistas costumam perder tempo navegando por múltiplos gráficos, tabelas complexas e telas em aplicativos tradicionais de previsão de ondas, muitas vezes enquanto estão dirigindo, preparando a prancha ou acordando cedo.

O **SurfAgent** é o MVP de um **aplicativo de surfe leve, simples e prático**, aberto para todas as praias, que funciona **por comando de voz com um Agente de IA** que responde por voz e apresenta simultaneamente todas as informações em tela.

O aplicativo opera em dois modos principais de consulta:
1. **Consulta de praia específica:** O usuário pergunta sobre uma praia específica e o **SurfAgent** apresenta diretamente (por voz e em uma aba dedicada) apenas as informações sobre as condições atuais daquele pico.
2. **Recomendação do melhor pico hoje ("Onde surfar hoje?"):** O usuário pergunta qual o pico com as melhores condições para surfar hoje. O **SurfAgent** identifica a localização do usuário e pergunta: ***"Você deseja saber de acordo com o seu nível de surfe?"***
   - **Se SIM:** A IA avalia os **4 picos mais próximos** e destaca aquele com as melhores condições adequadas ao nível informado pelo surfista (Iniciante, Intermediário ou Avançado).
   - **Se NÃO:** A IA avalia os **4 picos mais próximos** e destaca o lugar que reúne todas as combinações que geram uma **onda boa, bem formada e forte**.

Todos os picos consultados ou recomendados são abertos em **abas distintas**, permitindo avaliação visual rápida, ficando salvos localmente e sendo atualizados automaticamente sempre que o usuário acessar o app para novas consultas.

---

## 2. Visão do Produto & Diferencial Competitivo

### 2.1 Declaração de Visão
Para surfistas em qualquer praia que buscam praticidade antes de cair na água, o **SurfAgent** é um assistente de surfe multimodal (voz + tela) que responde instantaneamente sobre qualquer pico ou recomenda o melhor entre os 4 picos mais próximos — adaptando-se opcionalmente ao nível do surfista — e mantém os picos abertos em abas persistentes e sempre atualizadas.

### 2.2 O Que Torna o SurfAgent Único
1. **Voice-First + Visual Sync:** O usuário pergunta por voz e recebe uma resposta falada objetiva enquanto os dados aparecem organizados na tela.
2. **Aberto para Todas as Praias:** Funciona com qualquer praia consultada pelo nome ou via geolocalização em qualquer litoral.
3. **Filtro Inteligente de Recomendação (Com ou Sem Nível de Surfe):**
   - Na busca pelo melhor pico, pergunta se o usuário quer filtrar pelo seu nível de surfe;
   - Se optar por informar o nível, recomenda a praia ideal para a segurança e evolução daquele perfil;
   - Se optar por não informar, prioriza a combinação clássica de **onda boa, bem formada e forte**.
4. **Consulta Direta sem Fricção para Pico Específico:** Ao perguntar de uma praia específica, vai direto ao ponto e mostra apenas as condições daquela praia, sem perguntas intermediárias.
5. **Abas Persistentes e Auto-Atualizáveis:** Cada pico abre em uma aba própria que fica salva e é atualizada automaticamente toda vez que o usuário abre o app.

---

## 3. Problema a Ser Resolvido

- **Excesso de complexidade visual:** Apps tradicionais exigem abrir várias telas e interpretar dezenas de números para comparar praias próximas.
- **Mãos ocupadas / surfista em movimento:** Dificuldade de digitar e navegar em menus enquanto dirige ou prepara o equipamento.
- **Recomendações genéricas:** Um mar perfeito para um surfista avançado (onda forte e pesada) pode ser inadequado para um iniciante; ao mesmo tempo, muitos surfistas querem apenas saber onde está quebrando a onda mais bem formada e forte do momento.
- **Retrabalho diário:** Ter que buscar novamente as mesmas praias toda vez que abre o aplicativo.

---

## 4. Objetivos do MVP

### 4.1 Objetivos de Produto
- Entregar uma experiência multimodal fluida (Voz + Tela em Abas) com tempo de resposta inferior a 3 segundos.
- Cobrir qualquer praia consultada via API global de previsão marítima e meteorológica.
- Validar a árvore de decisão do Agente de IA (Pico Específico vs. Top 4 Próximos com opção de Nível de Surfe).
- Manter o aplicativo ultraleve, simples e prático de usar.

### 4.2 Objetivos do Usuário
- Consultar rapidamente qualquer praia específica e ver/ouvir suas condições atuais.
- Descobrir qual dos 4 picos mais próximos está melhor hoje — seja para o seu nível de surfe, seja pela melhor combinação de onda boa, bem formada e forte.
- Visualizar os picos em abas separadas que ficam salvas e atualizadas a cada acesso.

---

## 5. Regras de Negócio e Fluxos Conversacionais do Agente de IA

```mermaid
flowchart TD
    Start["Usuário aciona voz no SurfAgent"] --> Intent{"Qual a intenção da pergunta?"}
    
    Intent -->|"Pico Específico (ex: Como está Maresias?)"| Specific["Busca dados atuais da praia"]
    Specific --> OpenOne["Abre/Atualiza aba do pico e responde por voz apenas as condições dele"]
    
    Intent -->|"Melhor Pico Hoje (ex: Qual o melhor pico hoje?)"| GPS["Identifica localização (GPS) e busca os 4 picos mais próximos"]
    GPS --> AskLevel["IA pergunta por voz e tela: 'Você deseja saber de acordo com o seu nível de surfe?'"]
    
    AskLevel -->|"SIM (Iniciante / Intermediário / Avançado)"| ScoreLevel["Avalia os 4 picos conforme o nível do surfista"]
    AskLevel -->|"NÃO (Padrão Geral)"| ScorePower["Avalia os 4 picos buscando onda boa, bem formada e forte"]
    
    ScoreLevel --> OpenFour["Abre 4 abas (uma por pico), destaca a melhor e responde por voz"]
    ScorePower --> OpenFour
```

### 5.1 Regra 1 — Consulta de Pico Específico
- **Gatilho:** O usuário pergunta sobre uma praia específica (ex.: *"Como estão as condições em Itamambuca?"* ou *"Como está o mar no Arpoador?"*).
- **Comportamento:**
  - O Agente **não pergunta o nível de surfe**.
  - O sistema busca os dados atuais daquela praia, abre (ou atualiza) uma aba exclusiva para ela e narra por voz o boletim objetivo das condições atuais.

### 5.2 Regra 2 — Consulta do Melhor Pico para Surfar Hoje (Top 4 Próximos)
- **Gatilho:** O usuário pergunta *"Qual o pico com as melhores condições para surfar hoje?"* (ou variação equivalente).
- **Passo 1 (Geolocalização):** O app identifica a localização atual do usuário e localiza os **4 picos de surfe mais próximos**.
- **Passo 2 (Pergunta de Nível):** O Agente pergunta por voz (e exibe botões rápidos na tela):
  > *"Você deseja saber de acordo com o seu nível de surfe?"*
- **Passo 3A — Usuário responde SIM (e informa Iniciante, Intermediário ou Avançado):**
  - **Iniciante:** Prioriza picos entre os 4 mais próximos com ondulação menor/controlada (ex.: 0,5m a 1,0m), energia moderada/baixa, período médio, vento fraco/terral e maré favorável.
  - **Intermediário:** Prioriza picos com ondas de parede bem definida (ex.: 0,8m a 1,5m), período médio/longo (9s–12s), energia moderada a boa e vento terral ou fraco.
  - **Avançado:** Prioriza picos com maior potencial de performance, ondas fortes, cavadas ou volumosas (ex.: > 1,2m), alta energia (kJ), período longo (> 11s) e vento terral.
- **Passo 3B — Usuário responde NÃO (ou prefere não informar o nível):**
  - O sistema seleciona entre os 4 picos mais próximos aquele que apresenta **todas as combinações que gerem uma onda boa, bem formada e forte** (alinhamento ideal da direção do swell com a praia + maior período e energia útil + vento terral/fraco + fase da maré adequada).
- **Passo 4 (Apresentação em Abas + Voz):**
  - Os **4 picos mais próximos** são abertos em **4 abas distintas**.
  - A aba do pico vencedor recebe destaque visual (*"Melhor Condição Agora"*) e fica ativa em tela enquanto o Agente explica por voz o resultado.

### 5.3 Regra 3 — Persistência e Atualização Automática das Abas
- Todas as abas abertas (sejam de consultas específicas ou dos 4 picos próximos) ficam salvas no dispositivo.
- Sempre que o usuário acessar o aplicativo novamente, as abas salvas são mantidas e seus dados são **atualizados automaticamente** em tempo real.

---

## 6. Especificação Completa dos Dados em Tela (Por Aba)

Cada aba de pico deve exibir de forma limpa, leve e visualmente escaneável os seguintes indicadores obrigatórios:

| Grupo | Indicador | Descrição / Exibição em Tela |
| :--- | :--- | :--- |
| **1. Ondulação (Swell)** | **Tamanho da Ondulação** | Altura significativa das ondas em metros (`ex: 1.5 m`). |
| | **Período** | Intervalo entre ondas em segundos (`ex: 12 s`). |
| | **Direção da Ondulação** | Ponto cardeal + graus + ícone de seta (`ex: SE 138°`). |
| | **Energia** | Energia da onda em quilojoules (`ex: 520 kJ`) indicando a força real da ondulação. |
| **2. Vento** | **Força do Vento** | Velocidade do vento em `km/h` (ou nós), com indicação clara (Fraco, Moderado, Forte). |
| | **Direção do Vento** | Ponto cardeal + graus + classificação em relação ao pico (**Terral**, **Maral** ou **Lateral/Cruzado**). |
| **3. Maré e Lua** | **Fases da Maré** | Estado atual (**Enchendo** ou **Vazante/Secando**), altura atual (`m`) e horários/alturas das próximas marés (cheia/seca). |
| | **Fase da Lua** | Fase lunar atual (Nova, Crescente, Cheia, Minguante) com ícone representativo (influência na amplitude da maré). |
| **4. Tempo e Água** | **Condições do Tempo** | Estado climático atual (Sol, Parcialmente Nublado, Chuva, etc.) + Temperatura do ar (`°C`). |
| | **Temperatura da Água** | Temperatura superficial do mar em graus Celsius (`ex: 24 °C`) + sugestão rápida (ex: *Água quente / Lycra* ou *Wetsuit 2mm*). |

---

## 7. Escopo do MVP

### 7.1 Dentro do Escopo (In-Scope)
- Cobertura global aberta para todas as praias (via geocoding + APIs oceânicas/meteorológicas globais).
- Botão de voz sempre visível com reconhecimento de fala (STT) e resposta falada pelo Agente de IA (TTS).
- Diálogo inteligente de recomendação com pergunta opcional sobre nível de surfe.
- Identificação automática dos 4 picos mais próximos via GPS.
- Interface baseada em abas persistentes com atualização automática ao abrir o app.
- Exibição completa de todos os 10 indicadores obrigatórios (tamanho, período, direção do swell, energia, força e direção do vento, fases da maré, fases da lua, condições do tempo e temperatura da água).

### 7.2 Fora do Escopo do MVP (Out-of-Scope)
- Câmeras ao vivo próprias.
- Rede social, feed de fotos ou chat entre usuários.
- Login/cadastro obrigatório (o app deve abrir direto nas abas salvas e no botão de voz).
- Gráficos científicos complexos ou múltiplos modelos numéricos sobrepostos na mesma tela.

---

## 8. Requisitos Funcionais (RF)

- **RF-01 (Interação por Voz Multimodal):** O usuário deve poder falar sua consulta e receber a resposta em voz sintetizada natural simultaneamente à atualização visual na tela.
- **RF-02 (Cobertura Aberta de Praias):** O sistema deve permitir consultar qualquer praia informada pelo usuário e buscar picos próximos em qualquer região costeira.
- **RF-03 (Consulta Direta de Pico Específico):** Ao identificar o nome de uma praia específica na fala do usuário, o sistema deve exibir e narrar apenas as condições daquela praia em sua aba, sem perguntar sobre nível de surfe.
- **RF-04 (Fluxo "Melhor Pico Hoje" com Pergunta de Nível):** Ao identificar a pergunta sobre qual o melhor pico para surfar hoje, o Agente deve perguntar: *"Você deseja saber de acordo com o seu nível de surfe?"* permitindo resposta por voz ou toque rápido.
- **RF-05 (Cálculo do Melhor Pico — Com Nível vs. Sem Nível):**
  - Se o usuário informar o nível, classificar os 4 picos mais próximos de acordo com a adequação ao nível (Iniciante, Intermediário, Avançado).
  - Se o usuário optar por não informar, classificar os 4 picos mais próximos priorizando a combinação que gera uma **onda boa, bem formada e forte**.
- **RF-06 (Abertura dos 4 Picos em Abas Distintas):** Na recomendação por proximidade, o app deve abrir os 4 picos mais próximos em 4 abas separadas, destacando visualmente o melhor pico.
- **RF-07 (Persistência e Auto-Atualização de Abas):** As abas abertas devem ficar salvas localmente e atualizar todos os seus indicadores automaticamente toda vez que o usuário abrir o aplicativo.
- **RF-08 (Painel Completo de Indicadores):** Cada aba deve exibir tamanho da ondulação, período, direção da ondulação, energia, força e direção do vento, fases da maré, fases da lua, condições do tempo e temperatura da água.

---

## 9. Requisitos Não Funcionais (RNF)

- **RNF-01 (Leveza e Simplicidade):** O aplicativo deve ser extremamente leve, carregar em menos de 1,5s e funcionar perfeitamente em conexões móveis.
- **RNF-02 (Baixa Latência de Voz):** Tempo de resposta entre a fala do usuário e o retorno do Agente inferior a 3 segundos.
- **RNF-03 (Usabilidade Hands-Free e Visual Claro):** Tanto a resposta por voz quanto os cartões visuais das abas devem ser compreendidos em poucos segundos, com alto contraste para leitura sob luz do sol.

---

## 10. Histórias de Usuário e Critérios de Aceite

### US-01: Consultar uma praia específica rapidamente
> **Como** surfista, **quero** perguntar por voz sobre as condições de uma praia específica **para** ver e ouvir imediatamente os dados daquele pico sem etapas extras.

**Critérios de Aceite:**
- O app não pergunta o nível de surfe quando o usuário pede uma praia específica.
- A aba da praia é aberta/atualizada exibindo ondulação (tamanho, período, direção, energia), vento (força e direção), maré, lua, tempo e temperatura da água.
- O Agente narra o resumo das condições daquela praia.

### US-02: Perguntar qual o melhor pico hoje de acordo com o nível de surfe
> **Como** surfista, **quero** perguntar qual o melhor pico para surfar hoje e escolher filtrar pelo meu nível de surfe **para** encontrar entre os 4 picos mais próximos aquele mais adequado para mim.

**Critérios de Aceite:**
- O Agente pergunta: *"Você deseja saber de acordo com o seu nível de surfe?"*
- Ao responder "Sim" e informar o nível (ex.: Iniciante, Intermediário ou Avançado), o app abre os 4 picos mais próximos em abas distintas e destaca o melhor pico para aquele nível.

### US-03: Perguntar qual o melhor pico hoje sem informar nível (Onda boa, bem formada e forte)
> **Como** surfista que busca a melhor condição absoluta do mar, **quero** optar por não informar meu nível quando perguntado **para** que o app destaque entre os 4 picos mais próximos aquele com uma onda boa, bem formada e forte.

**Critérios de Aceite:**
- Ao responder "Não" à pergunta de nível, o sistema avalia os 4 picos mais próximos pela qualidade/força da onda (energia, período, alinhamento de swell, vento terral e maré).
- Os 4 picos abrem em abas distintas com destaque visual e resposta falada para o pico vencedor.

### US-04: Manter abas salvas e atualizadas automaticamente
> **Como** usuário recorrente do SurfAgent, **quero** que as abas dos picos que consultei fiquem salvas e atualizadas sempre que eu abrir o app **para** checar as condições atuais com zero esforço.

**Critérios de Aceite:**
- As abas permanecem salvas ao fechar e reabrir o app.
- Ao abrir o app, todas as abas salvas atualizam seus dados automaticamente.

