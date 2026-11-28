---
documentType: PRD
productName: uGet — O Aplicativo de Alerta de Benefícios
tagline: "Fique Alerta!"
version: "1.0"
date: "2026-11-27"
designSystem: "../ugetds/index.html (ugetds v1.0)"
sourceDocuments:
  - "Plano-de-Negócio-UGet-2017.pdf"
  - "Apresentação UGet.pdf"
status: "Draft v1.0 — Pronto para Revisão antes da Spec de UX"
---

# Product Requirements Document (PRD) — uGet

## 1. Resumo Executivo

O **uGet** (*"O Aplicativo de Alerta de Benefícios · Fique Alerta!"*) é uma plataforma digital que conecta **consumidores (associados/clientes)** aos **benefícios, descontos e convênios** oferecidos por **associações, sindicatos, entidades de classe, clubes e programas de fidelidade**, operando de forma **pró-ativa** por meio de **geolocalização (geofencing)**, **gatilhos de horário** e **notificações inteligentes**.

Enquanto plataformas tradicionais de fidelidade são **passivas** (o usuário precisa lembrar que tem um convênio e procurar onde usá-lo), o uGet entrega o **estímulo certo, no local certo e na hora certa** — transformando a cadeia **Consumidor ↔ Instituição/Clube ↔ Estabelecimento Parceiro** em um ecossistema mensurável e de alto retorno.

---

## 2. Problema & Oportunidade de Mercado

### 2.1 O Problema
- **Baixíssima descoberta e uso real:** Apenas cerca de **10%** dos participantes de clubes e programas de convênios conhecem os benefícios a que têm direito, e apenas **~1%** os utilizam efetivamente.
- **ROI improdutivo em toda a cadeia:** Instituições e parceiros investem na negociação e divulgação de convênios usando canais ineficientes (e-mail marketing, PDFs estáticos, mala direta, portais pouco acessados) que atingem o consumidor **longe do ponto de venda e fora do momento de consumo**.
- **Concorrência passiva:** Ferramentas existentes (gestores de pontos/milhas e diretórios estáticos) exigem esforço ativo do usuário para lembrar e buscar ofertas.

### 2.2 A Oportunidade
- O consumidor decide grande parte das compras cotidianas (farmácia, gastronomia, serviços, varejo, bem-estar) **por proximidade e impulso**.
- Entidades de classe, sindicatos, clubes esportivos, redes de comunicação e clubes de assinatura (ex.: OAB, ABM, CROBA, servidores, sócio-torcedores, clubes de varejo) possuem bases de dezenas de milhares de associados, mas carecem de um canal **contextual e em tempo real** para fazer o benefício acontecer na ponta.

---

## 3. Visão do Produto & Proposta de Valor (Ecossistema Tripartite)

| Pilar | Papel na Plataforma | Proposta de Valor uGet |
| :--- | :--- | :--- |
| **1. Usuário (Associado / Consumidor)** | Descobre e utiliza benefícios no dia a dia | App gratuito que alerta automaticamente quando há um convênio ativo no seu raio de alcance e no horário certo — mostrando *o quê*, *onde* e *como chegar*, além do catálogo completo. |
| **2. Clube / Instituição (Associação, Sindicato, Programa)** | Disponibiliza rede de convênios e se relaciona com a base | Aumenta percepção de valor e retenção do associado, comunica benefícios no momento exato de uso, acompanha relatórios de interação e aplica pesquisas de satisfação sobre os convênios. |
| **3. Estabelecimento Parceiro (Comércio / Serviço)** | Oferece descontos/vantagens para atrair fluxo qualificado | Eleva drasticamente o ROI levando clientes prontos para consumir no ponto de venda, fixa a marca a cada alerta de proximidade e obtém feedback direto sobre atendimento e produto. |

---

## 4. Personas & Usuários-Alvo

### 4.1 Persona Primária — Associado Conectado (B2C)
- **Perfil:** Profissional vinculado a 1 ou mais instituições (ex.: advogado OAB, médico ABM, servidor público, sócio-torcedor, assinante de clube local), 25–55 anos, uso intenso de smartphone.
- **Dor:** Paga anuidade/mensalidade, sabe que "existem convênios", mas nunca lembra qual farmácia, restaurante ou serviço oferece desconto quando está na rua.
- **Objetivo:** Ser avisado sem esforço quando estiver perto de economizar, sem receber spam irrelevante.

### 4.2 Persona Secundária — Gestor de Benefícios / Diretor de Associação (B2B — Clube)
- **Perfil:** Responsável por parcerias e relacionamento em sindicato, entidade de classe ou clube.
- **Dor:** Baixa adesão aos convênios fechados, reclamações de associados que "não veem retorno" e falta de dados sobre quais parceiros realmente honram os descontos.
- **Objetivo:** Aumentar o uso visível dos convênios, auditar qualidade dos parceiros e comprovar valor aos associados.

### 4.3 Persona Terciária — Gestor do Estabelecimento Parceiro (B2B — Varejo/Serviço)
- **Perfil:** Dono ou gerente de restaurante, farmácia, academia, clínica ou loja conveniada.
- **Dor:** Concedeu desconto em convênio, mas quase nenhum associado aparece na loja.
- **Objetivo:** Atrair fluxo real de clientes qualificados que já passam perto do estabelecimento e impulsionar horários ociosos com alertas diretos.

---

## 5. Objetivos de Negócio & Métricas de Sucesso (KPIs)

### 5.1 Objetivos
1. Elevar a taxa de conhecimento e utilização de convênios muito acima da média de mercado (1%).
2. Construir base regional densa (estratégia inicial focada em associações/clubes locais — ex.: Bahia → expansão regional como Aracaju e demais capitais).
3. Viabilizar monetização sustentável baseada em **alertas diretos geolocalizados**, **pacotes de interações extras** e **pesquisas interativas de consumo/satisfação**.

### 5.2 KPIs Principais
| Métrica | Definição | Meta Inicial (MVP / Ano 1) |
| :--- | :--- | :--- |
| **Taxa de Ativação de GPS & Push** | % de novos usuários que concluem onboarding com 1+ clube e permissões ativas | ≥ 70% |
| **CTR de Notificação Inteligente** | % de alertas de proximidade clicados pelo usuário | ≥ 18% |
| **Taxa de Uso / Intenção (Rota, Ligação ou Resgate)** | % de visualizações do benefício que geram ação (Traçar Rota, Ligar, QR/Cupom) | ≥ 25% |
| **Retenção D30** | % de usuários que mantêm o app ativo após 30 dias | ≥ 40% |
| **Taxa de Opt-out / Silenciamento** | % de usuários que desativam notificações por fadiga de alertas | < 10% |
| **NPS do Benefício** | Avaliação média dos usuários sobre o atendimento e cumprimento do desconto | ≥ 70 |
| **Taxa de Entrega de Push (HA)** | % de notificações enfileiradas efetivamente entregues em dispositivos ativos | ≥ 98% (SLA ≥ 99,9%) |
| **Conformidade & Segurança** | Incidentes de vazamento de PII ou exposição indevida entre tenants (RBAC) | 0 incidentes |

---

## 6. Escopo do Produto (MVP vs. Evolução)

### 6.1 Dentro do Escopo — MVP (Fase 1: Tração & Validação)
- **App do Usuário (Mobile-first / PWA + iOS/Android):**
  - Onboarding simplificado (cadastro + seleção de clubes/associações/programas + permissão de localização e notificações).
  - Motor de **Geofencing & Notificações Inteligentes** respeitando **raio configurável pelo usuário**, **janela de horário do benefício** (ex.: almoço/jantar para restaurantes) e **regras anti-spam (cooldown)**.
  - Tela de **Detalhe do Benefício & Parceiro**: descrição clara da vantagem, regras de uso, endereço com botão **Traçar Rota** (Google Maps / Waze / Apple Maps), **Telefone (ligação direta)**, **Website/WhatsApp** e botão de **Resgate / Carteirinha Digital**.
  - **Radar / Mapa de Benefícios Próximos** + **Lista Completa Pesquisável e Filtrável** por categoria, clube, distância e desconto.
  - **Preferências do Usuário:** controle de clubes ativos, raio de alcance (ex.: 200m, 500m, 1km, 3km), categorias de interesse e modo "Não Perturbe".
  - **Avaliação Rápida pós-uso (Micro-pesquisa):** *"O parceiro honrou o benefício? Como foi sua experiência?"*.
- **Portal Web de Gestão (B2B — Admin / Clubes / Parceiros):**
  - Cadastro e gestão de Clubes/Instituições, Estabelecimentos Parceiros (com coordenadas lat/lon), Benefícios e horários de ativação.
  - Dashboard básico de métricas: alertas disparados, visualizações, cliques em rota/telefone e avaliações de satisfação.

### 6.2 Fase 2 — Monetização & Inteligência (Pós-MVP)
- **Campanhas de Alertas Diretos Geolocalizados** (venda de pacotes de interações extras e alertas promocionais instantâneos por raio/perfil).
- **Módulo de Pesquisas Interativas de Perfil de Consumo** encomendadas por clubes e parceiros.
- **Validação formal de vínculo de associado** (integração via CPF/matrícula ou API com associações/sindicatos + QR Code dinâmico auditável no caixa).
- **Motor de Recomendação com IA:** priorização de alertas conforme hábitos, horários e categorias mais clicadas pelo usuário.

### 6.3 Fora do Escopo no MVP
- Gestão completa de milhas aéreas ou saldo de pontos financeiros (previsto apenas como evolução futura).
- Gateway de pagamento / e-commerce transacional dentro do app (checkout ocorre no estabelecimento parceiro).
- Rede social ou feed comunitário aberto.

---

## 7. Requisitos Funcionais (RF)

### Módulo A — Onboarding, Conta & Clubes (Usuário)
- **RF-01 (Cadastro Simplificado):** O usuário deve poder criar conta rapidamente (e-mail/senha ou login social) em menos de 60 segundos.
- **RF-02 (Seleção de Clubes/Instituições):** No onboarding e a qualquer momento no perfil, o usuário seleciona em uma lista pesquisável quais associações, sindicatos, clubes ou programas deseja acompanhar.
- **RF-03 (Permissões Contextuais):** O app deve explicar claramente o valor da geolocalização e das notificações *antes* de solicitar as permissões do sistema operacional.

### Módulo B — Motor de Geolocalização & Alertas Inteligentes (Core Diferencial)
- **RF-04 (Configuração de Raio de Alcance):** O usuário deve poder definir seu raio preferido de detecção (ex.: `250m`, `500m`, `1 km`, `2 km`).
- **RF-05 (Disparo Pró-Ativo por Proximidade):** Quando o usuário entrar no raio configurado de um estabelecimento parceiro pertencente a um de seus clubes ativos, o sistema deve disparar uma notificação push clara contendo: nome do parceiro, benefício/desconto, clube vinculador e distância aproximada.
- **RF-06 (Gatilho Temporal Inteligente):** Benefícios com janelas específicas (ex.: almoço `11:30–14:30`, happy hour `17:30–20:30`, jantar `19:00–22:30`) só devem disparar notificações dentro dos dias e horários válidos.
- **RF-07 (Controle Anti-Fadiga / Cooldown):** O sistema não deve repetir o alerta do mesmo estabelecimento para o mesmo usuário dentro de uma janela mínima configurável (padrão: `24h` ou `7 dias`), além de respeitar o modo "Não Perturbe" do usuário.
- **RF-08 (Deep Link da Notificação):** Ao tocar na notificação, o app deve abrir diretamente a tela de detalhes do benefício/parceiro alertado.

### Módulo C — Descoberta, Detalhes & Ação no Ponto de Venda
- **RF-09 (Tela de Detalhe do Benefício e Parceiro):** Deve exibir nome e logo do parceiro, clube/instituição que concede o benefício, percentual/descrição da vantagem, regras de utilização, horários de funcionamento, distância atual e ações diretas:
  - **Traçar Rota** (abre app de mapas nativo com as coordenadas);
  - **Ligar / WhatsApp** (abre discador ou conversa direta);
  - **Acessar Website / Instagram**;
  - **Apresentar Benefício / Carteirinha Digital**.
- **RF-10 (Catálogo Completo & Busca):** O usuário deve poder explorar todos os benefícios a que tem direito via lista ou mapa, com busca por texto e filtros por categoria (Saúde, Gastronomia, Educação, Esporte, Serviços, Varejo), clube e proximidade.
- **RF-11 (Favoritos & Histórico de Alertas):** O usuário deve poder salvar parceiros favoritos e consultar o histórico dos últimos alertas recebidos (caso não tenha conseguido abrir a notificação na hora).

### Módulo D — Qualidade, Feedback & Pesquisas
- **RF-12 (Avaliação Pós-Visita / Auditoria de Benefício):** Após interação ou resgate, o app pode apresentar uma micro-pesquisa rápida (1–2 toques): se o parceiro honrou o benefício, nota de satisfação e comentário opcional.

### Módulo E — Portal B2B (Clubes, Parceiros & Administração)
- **RF-13 (Gestão de Clubes e Benefícios):** Administradores e clubes cadastram, editam, pausam e expiram convênios, definindo descrição, categoria, regras e janelas de horário.
- **RF-14 (Gestão de Estabelecimentos e Georreferenciamento):** Cadastro de endereços com validação de latitude/longitude (suportando redes com múltiplas unidades/filiais).
- **RF-15 (Relatórios de Interação):** Painel com volume de alertas enviados, taxa de abertura, cliques em rota/telefone/site e índice de satisfação por parceiro e por clube (exclusivamente com dados agregados e anonimizados).
- **RF-16 (Disparo de Promoções Instantâneas & Pesquisas — Fase 2):** Ferramenta para clubes e parceiros contratarem pacotes de alertas diretos segmentados por região/perfil e publicarem pesquisas interativas.

### Módulo F — Privacidade LGPD, Auditoria & Confiabilidade de Push
- **RF-17 (Central de Consentimento, Portabilidade & Anonimização LGPD):** O usuário deve conseguir gerenciar consentimentos granulares (Geolocalização, Push de Proximidade, Pesquisas), visualizar o histórico de termos aceitos, solicitar exportação dos seus dados cadastrais (JSON/CSV) e acionar exclusão/anonimização irreversível da conta.
- **RF-18 (Renovação Transparente & Continuidade de Push):** O aplicativo deve detectar automaticamente a rotação/expiração de tokens FCM/APNs/Web Push, re-registrar o dispositivo em segundo plano sem exigir novo login e suportar múltiplos dispositivos por usuário.

---

## 8. Requisitos Não Funcionais (RNF), Segurança & Alta Disponibilidade

- **RNF-01 (Eficiência Energética em Geofencing):** O monitoramento de localização em segundo plano deve usar APIs nativas de baixo consumo (Geofencing API / Significant Location Changes) para evitar drenagem excessiva de bateria (< 3% ao dia).
- **RNF-02 (Performance & Latência):** Carregamento inicial da tela principal em ≤ 2s em rede 4G; abertura da ficha do benefício a partir do push em ≤ 1s; suporte a cache offline do catálogo de benefícios e da carteirinha `uGet Pass`.
- **RNF-03 (Escalabilidade Geoespacial):** Banco de dados com indexação geoespacial (ex.: PostGIS) capaz de suportar centenas de milhares de usuários simultâneos e milhares de pontos de venda com consultas de raio em < 50ms.
- **RNF-04 (Acessibilidade):** Conformidade com WCAG 2.1 AA (contraste mínimo 4.5:1 usando a paleta `ugetds`, navegação clara, labels acessíveis e respeito a `prefers-reduced-motion`).
- **RNF-05 (Identidade Visual & Design System):** Toda a interface deve seguir rigorosamente os tokens, componentes, iconografia autoral e animações definidos no **`ugetds`** (`uget/ugetds/`).

### 8.1 Camada de Segurança, Blindagem & Conformidade LGPD (Obrigatório)
- **RNF-06 (Criptografia em Trânsito e em Repouso):**
  - **Em trânsito:** 100% do tráfego via **HTTPS / TLS 1.3** obrigatório (HSTS com `max-age >= 31536000; includeSubDomains`), bloqueio de conexões HTTP puras e certificados gerenciados com renovação automática.
  - **Em repouso:** Dados pessoais identificáveis (PII — nome, CPF/matrícula, e-mail, telefone) criptografados em repouso com **AES-256-GCM** (envelope encryption com chaves gerenciadas via KMS/Vault e rotação periódica); senhas armazenadas exclusivamente com hash forte **Argon2id** (ou `bcrypt` cost ≥ 12) com salt único.
- **RNF-07 (Controle de Acesso Baseado em Função — RBAC):**
  - Separação estrita de papéis com princípio do menor privilégio: `USER_ASSOCIATE`, `CLUB_MANAGER`, `PARTNER_MANAGER` e `SUPER_ADMIN`.
  - Autenticação via tokens JWT de curta duração (≤ 15 min) + Refresh Tokens rotacionáveis com detecção de reuso e revogação imediata; isolamento multi-tenant garantindo que um clube ou parceiro **nunca** acesse dados de outro.
- **RNF-08 (Conformidade Estrita com a LGPD — Lei nº 13.709/2018):**
  - **Consentimento rastreável (Opt-in):** Registro imutável de consentimento contendo `user_id`, finalidade (`gps`, `push`, `surveys`), versão do termo, timestamp UTC e canal.
  - **Minimização de dados de localização:** Coordenadas de GPS usadas em tempo real para avaliação de geofence **não** devem formar histórico contínuo de rastreamento pessoal; apenas eventos agregados/anonimizados alimentam relatórios B2B.
  - **Anonimização & Direito ao Esquecimento:** Pipeline automatizado que substitui PII por identificadores pseudonimizados irreversíveis e revoga tokens/dispositivos dentro do prazo legal, preservando integridade estatística sem reidentificação.
- **RNF-09 (Logs de Auditoria Imutáveis):**
  - Toda operação sensível (login, alteração de permissão RBAC, leitura/exportação de PII, alteração de convênios, exclusão/anonimização LGPD e falhas de autenticação) deve gerar log estruturado imutável (append-only) com `actor_id`, `role`, `action`, `resource`, `ip_hash`, `timestamp` e `correlation_id`, sem jamais gravar senhas, tokens ou PII em texto claro nos logs.
- **RNF-10 (Blindagem contra Invasões e Vazamentos — OWASP Top 10):**
  - **SQL Injection:** Uso exclusivo de queries parametrizadas / Prepared Statements (ou ORM com bind estrito) e conta de banco da aplicação sem privilégios DDL/superusuário.
  - **XSS (Cross-Site Scripting):** Sanitização rigorosa de todas as entradas no backend (allowlist/validação de schema) + escape contextual no frontend + cabeçalhos de segurança obrigatórios (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`) e cookies de sessão com `HttpOnly`, `Secure` e `SameSite=Strict`.
  - **CSRF (Cross-Site Request Forgery):** Proteção por token Anti-CSRF (Synchronizer Token / Double-Submit Cookie) combinada com validação estrita de `Origin`/`Referer` e CORS restrito aos domínios oficiais.
  - **Rate Limiting & Anti-Abuse:** Limitação distribuída (ex.: Redis sliding window) por IP e por conta em endpoints críticos (autenticação, cadastro, redefinição de senha, disparo de alertas e APIs públicas), com lockout progressivo contra força bruta e proteção WAF na borda.

### 8.2 Arquitetura de Push Notifications de Alta Disponibilidade (HA)
- **RNF-11 (Arquitetura Desacoplada & Entrega Confiável):**
  - Pipeline assíncrono baseado em **Fila Persistente com Múltiplos Workers Stateless** (ex.: Redis Streams / BullMQ, RabbitMQ ou AWS SQS) desacoplando o evento de geofence do envio aos provedores (**FCM** para Android/Web Push, **APNs** para iOS).
  - **Idempotência obrigatória:** Cada disparo possui chave única (`idempotency_key` combinando usuário + estabelecimento + janela), impedindo notificações duplicadas mesmo em reprocessamentos.
- **RNF-12 (Tratamento de Falhas, Retries Automáticos & DLQ):**
  - Falhas transitórias (HTTP 429, 5xx, timeout de rede) devem acionar **retries automáticos com Exponential Backoff + Jitter** (ex.: 5s → 30s → 2min, respeitando a validade temporal do benefício para não entregar um alerta de almoço horas depois).
  - Falhas persistentes são encaminhadas para uma **Dead-Letter Queue (DLQ)** com alerta operacional para inspeção.
- **RNF-13 (Gestão & Renovação Transparente de Tokens):**
  - Registro multi-dispositivo (`user_devices` com `platform`, `push_token`, `app_version`, `last_seen_at`).
  - Renovação transparente no cliente (`onTokenRefresh` / Service Worker) com sincronização silenciosa no backend; invalidação automática de tokens que retornarem `Unregistered` / `InvalidRegistration` para manter a base limpa e alta reputação nos gateways.
- **RNF-14 (Continuidade, SLA & Observabilidade):**
  - SLA alvo ≥ **99,9%** para o serviço de filas e despacho de notificações, com deploy redundante (multi-AZ / auto-scaling), *health checks*, *circuit breaker* por provedor e métricas em tempo real (taxa de entrega, latência p95, taxa de retry e tamanho da DLQ).

---

## 9. Regras de Negócio (RN)

- **RN-01:** Um usuário só recebe notificações de benefícios pertencentes a clubes/instituições que ele marcou como ativos (exceto campanhas abertas se ele optar por recebê-las).
- **RN-02:** Benefícios expirados ou pausados pelo clube/parceiro deixam de disparar alertas imediatamente e são removidos da lista ativa.
- **RN-03:** Cada unidade física de uma rede parceira possui seu próprio ponto geográfico (geofence), evitando alertas para filiais distantes.
- **RN-04:** A monetização na fase comercial (alertas diretos / pacotes de interações) deve respeitar os mesmos limites anti-spam do usuário, priorizando relevância contextual para preservar a retenção.

---

## 10. Histórias de Usuário & Critérios de Aceite (MVP)

### US-01: Onboarding e Escolha de Clubes
**Como** associado de uma instituição, **quero** cadastrar minha conta e escolher meus clubes em menos de 1 minuto **para** começar a ser avisado dos meus benefícios rapidamente.
- **Critérios de Aceite:**
  - Lista de clubes com busca instantânea e seleção múltipla;
  - Explicação clara antes dos prompts de GPS e Notificações;
  - Usuário cai direto na tela inicial já vendo benefícios próximos dos clubes escolhidos.

### US-02: Alerta Inteligente por Proximidade e Horário
**Como** usuário em deslocamento, **quero** receber uma notificação clara quando passar perto de um estabelecimento conveniado no horário válido **para** aproveitar o desconto sem precisar pesquisar.
- **Critérios de Aceite:**
  - Notificação exibe: Nome do Parceiro, Benefício (ex.: `25% OFF`), Clube e Distância;
  - Não dispara fora da janela de horário configurada para o benefício;
  - Não repete o alerta do mesmo local dentro do período de cooldown;
  - Tocar na notificação abre direto a ficha completa do parceiro.

### US-03: Ação Rápida no Ponto de Venda
**Como** usuário que recebeu um alerta ou encontrou uma oferta, **quero** ver as regras, traçar rota, ligar ou mostrar minha identificação de convênio em 1 toque **para** usar o benefício sem fricção.
- **Critérios de Aceite:**
  - Ficha exibe regras claras de uso e validade;
  - Botões funcionais de **Traçar Rota**, **Ligar/WhatsApp** e **Website**;
  - Acesso rápido à **Carteirinha / Identificação do Benefício**.

### US-04: Controle de Raio e Silenciamento
**Como** usuário, **quero** ajustar o raio de alcance dos alertas e pausar notificações quando quiser **para** manter o app útil e não invasivo.
- **Critérios de Aceite:**
  - Controle de raio (`250m` a `3 km`) salvo imediatamente;
  - Toggle global de pausar alertas e filtros por categoria.

### US-05: Acompanhamento de Resultados (Clube / Parceiro)
**Como** gestor de um clube ou parceiro, **quero** acompanhar quantos usuários foram impactados, abriram o benefício e avaliaram positivamente o uso **para** comprovar o ROI da parceria.
- **Critérios de Aceite:**
  - Relatório filtrável por período, clube e estabelecimento;
  - Métricas de alertas disparados, visualizações, cliques em ação e índice de satisfação (exclusivamente agregadas e anonimizadas);
  - Acesso estritamente isolado por RBAC ao escopo do próprio clube/parceiro.

### US-06: Controle de Privacidade, Consentimento & Anonimização (LGPD)
**Como** usuário titular dos dados, **quero** gerenciar meus consentimentos de GPS e notificações, exportar meus dados e solicitar a exclusão/anonimização da conta quando desejar **para** ter segurança e controle total conforme a LGPD.
- **Critérios de Aceite:**
  - Registro auditável de cada consentimento (finalidade, versão do termo e timestamp UTC);
  - Dados cadastrais trafegados exclusivamente via HTTPS/TLS 1.3 e criptografados em repouso (AES-256-GCM);
  - Exportação dos dados pessoais em JSON e anonimização irreversível sob confirmação dupla.

### US-07: Entrega Contínua e Confiável de Push Notifications
**Como** usuário, **quero** receber alertas de proximidade de forma contínua e sem intermitências mesmo após atualizações do sistema ou troca de rede **para** nunca perder um benefício válido.
- **Critérios de Aceite:**
  - Fila persistente com retries automáticos (Exponential Backoff + Jitter) em caso de falha transitória do provedor FCM/APNs;
  - Renovação transparente de tokens de dispositivo em segundo plano sem exigir novo login;
  - Garantia de idempotência (sem alertas duplicados) e encaminhamento de falhas definitivas para Dead-Letter Queue (DLQ).

---

## 11. Modelo de Monetização & Roadmap

### 11.1 Fases
1. **Fase 1 — MVP & Tração Local (Meses 1–12):**
   - App gratuito para usuários; onboarding de associações/entidades de classe, clubes e parceiros locais (foco inicial Bahia).
   - Validação de engajamento (CTR de notificações, cliques em rota/uso e retenção).
2. **Fase 2 — Monetização & Escala Regional (Ano 2+):**
   - Venda de **alertas diretos geolocalizados** (referência do plano de negócio: modelo por impacto/notificação ou pacotes mensais de interações extras).
   - **Pesquisas interativas** de perfil de consumo e auditoria de benefícios para clubes e marcas.
   - Expansão para novas praças (ex.: Aracaju e demais capitais).

---

## 12. Riscos & Mitigações

| Risco | Impacto | Mitigação |
| :--- | :--- | :--- |
| **Fadiga de notificações (spam)** | Alto (desinstalação / opt-out) | Regras rígidas de cooldown, filtro por horário útil do benefício, controle de raio e modo "Não Perturbe". |
| **Recusa de permissão de GPS "Sempre"** | Alto (reduz alertas pró-ativos) | Educação clara no onboarding + valor imediato mesmo com GPS "Durante o uso" (mapa/lista de benefícios próximos). |
| **Parceiro não honrar o desconto no caixa** | Alto (quebra de confiança) | Micro-pesquisa pós-visita + alerta automático ao clube gestor para auditoria do parceiro. |
| **Consumo elevado de bateria** | Médio | Uso exclusivo de Geofencing nativo de baixo consumo (sem polling contínuo de GPS). |
| **Vazamento de PII / Invasão (SQLi, XSS, CSRF)** | Crítico (jurídico / LGPD / reputação) | Criptografia TLS 1.3 + AES-256-GCM, RBAC estrito, queries parametrizadas, CSP + sanitização, Anti-CSRF, Rate Limiting, WAF e logs imutáveis de auditoria. |
| **Intermitência ou perda de Push Notifications** | Alto (quebra da proposta de valor) | Fila persistente com múltiplos workers, retries automáticos com backoff/jitter, DLQ, renovação transparente de tokens e circuit breaker. |

---

## 13. Próximo Passo
Após revisão e aprovação deste PRD (`uget_prd.md`), avançaremos para a elaboração da **Especificação de UX (`uget_ux_spec.md`)**, detalhando arquitetura de informação, fluxos de tela, micro-interações, anatomia das notificações inteligentes e mapeamento direto aos componentes do **`ugetds`**.
