---
stepsCompleted: ["step-01-init", "step-02-discovery", "step-03-core-experience", "step-04-emotional-response"]
inputDocuments: ["prd.md"]
---

# UX Design Specification - Web App de Previsão de Ondas

**Author:** Marco
**Date:** 2026-04-23

---

## Executive Summary

### Project Vision

Web app mobile-first que recomenda automaticamente o melhor pico para surfar em tempo real, processando dados críticos de ondulação, vento, período e energia em interface ultra-rápida e intuitiva.

### Target Users

- **Perfil:** Surfistas de Salvador (casual e experientes)
- **Contexto:** Acesso via mobile durante manhã ou noite
- **Solo ou grupo:** Flexível (ambos)
- **Comportamento:** Toma decisão em segundos, depois vai surfar ou compartilha com amigos

### Key Design Challenges

1. **Velocidade de Decisão** — Usuário precisa decidir em segundos; UI deve ser scannable e compreensível à primeira vista
2. **Densidade de Informação** — 4 gráficos críticos (ondulação, vento, período, energia) sem poluir a interface mobile
3. **Confiança na Recomendação** — IA precisa comunicar claramente por que escolheu aquela praia
4. **Integração Social** — Compartilhamento fácil da recomendação com amigos de forma atraente

### Design Opportunities

1. **Dashboard Visual Minimalista** — Recomendação top em destaque com 4 gráficos pequenos e scanneáveis abaixo
2. **Componentes Otimizados para Mobile** — Sparkline charts + cores + ícones para comunicação rápida vs. gráficos complexos
3. **CTAs Claros e Proeminentes** — Botões "IR SURFAR" e "COMPARTILHAR" com contexto rápido (nome praia + hora ideal)
4. **Modo Comparativo Opcional** — Deslizar para ver outras praias, mas default é recomendação TOP

---

## Core User Experience

### Defining Experience

Experiência imediata e confiável: abrir app → receber recomendação automática do melhor pico → explorar as 3 praias de Salvador → compartilhar ou ir surfar. Cada interação deve ser tão intuitiva que o usuário nunca pensa, apenas age.

### Platform Strategy

Web app responsivo (não nativo) que funciona em qualquer smartphone com restrições de rede. Offline-first: dados são cacheados e atualizados automaticamente quando conexão volta.

### Effortless Interactions

- **Recomendação automática** na abertura do app (zero cliques para começar)
- **Compartilhamento inteligente** que gera mensagem formatada para WhatsApp, Instagram, Email (pronta para copiar/enviar)
- **Atualização automática** de recomendações em background
- **Visual hierarchy clara** — praia com melhores condições é imediatamente óbvia

### Critical Success Moments

1. **Abertura do app** — Recomendação aparece instantaneamente (confiança inicial)
2. **Exploração** — Ver as 3 praias, mas saber qual é a melhor (decisão fácil)
3. **Compartilhamento** — Mensagem formatada pronta para enviar (engajamento social)
4. **Validação na praia** — Surfista confirma que estava correto (memorabilidade + confiança)

### Experience Principles

1. **Speed & Simplicity** — Menos cliques, mais ação
2. **Confiança através da precisão** — Recomendação correta = usuário volta
3. **Social-first** — Compartilhamento fácil amplifica adoção
4. **Offline-resilient** — Funciona sempre, atualiza quando possível
---

## Desired Emotional Response

### Primary Emotional Goals

**Satisfação** é a emoção central do app. O usuário deve sentir satisfação ao tomar uma decisão confiante baseada na recomendação inteligente, e essa satisfação é confirmada quando chega na praia e valida que estava correto.

### Emotional Journey Mapping

**Abertura do App:** Confiança imediata
- Recomendação aparece com dados precisos
- Usuário pensa: "Esse app sabe o que eu preciso"

**Exploração das 3 Praias:** Segurança na decisão
- Vê as alternativas, mas a melhor praia é visualmente óbvia
- Usuário pensa: "Tenho certeza disso, a escolha é fácil"

**Compartilhamento:** Orgulho
- Mensagem formatada pronta, compartilha com amigos
- Usuário pensa: "Estou recomendando algo confiável"

**Chegada na Praia:** Satisfação Confirmada
- Validação: "Tinha razão, estava ótimo aqui"
- Usuário pensa: "Vou usar esse app sempre"

**Se Errar:** Frustração controlada
- Feedback do usuário alimenta o sistema
- Usuário pensa: "Pelo menos posso reportar e ajudar a melhorar"

### Micro-Emotions

- **Confiança:** Conquistada por dados precisos e design limpo
- **Segurança:** Decisão simplificada (recomendação óbvia vs. comparar 3 praias)
- **Orgulho:** Compartilhar uma recomendação acertada com amigos
- **Empoderamento:** Tomar decisão rápida e estar correto
- **Comunidade:** Compartilhar a experiência amplifica senso de pertencimento

### Design Implications

- **Dados Precisos:** Atualização em tempo real, fontes confiáveis
- **Visual Hierarchy:** Praia recomendada é imediatamente óbvia (não requer comparação)
- **Feedback Loop:** Sistema de report quando algo está errado
- **Compartilhamento Social:** Formato atraente que gera orgulho em compartilhar
- **Transparência:** Mostrar por que aquela praia é a melhor (4 gráficos)

### Emotional Design Principles

1. **Confiança através da Precisão** — Recomendação correta = usuário volta
2. **Decisão Empoderada, Não Complexa** — Uma recomendação clara é melhor que 3 opções
3. **Validação Social** — Compartilhamento amplifica satisfação e comunidade
4. **Feedback Contínuo** — Reports do usuário melhoram confiança do sistema
5. **Satisfação Memorável** — O diferencial é a recomendação automática, não a consulta manual