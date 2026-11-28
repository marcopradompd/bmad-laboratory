# uGet — Módulo 1: Fundação, Segurança, RBAC & LGPD

## Stack Oficial do Projeto
- **Backend:** Node.js 22+ / TypeScript
- **Banco de Dados:** PostgreSQL 16 + PostGIS (`docker-compose.yml` + `db/migrations/001_module1_security_lgpd.sql`)
- **Cache, Rate Limit & Filas (Módulo 3):** Redis 7
- **Design System & Frontend (Módulos 2–5):** `ugetds` + React/Vite/TypeScript (PWA)

## O que está implementado neste Módulo 1
- **Criptografia em repouso (`src/security/cryptoService.ts`):** AES-256-GCM autenticado para PII (nome, e-mail, CPF, telefone) com versionamento de chaves + hash de senha `scrypt` OWASP com `timingSafeEqual`.
- **Autenticação & RBAC (`src/security/tokenService.ts`, `src/security/rbac.ts`, `src/services/authService.ts`):** JWT HS256 de curta duração (15 min), Refresh Token rotacionável com **detecção de reuso por família**, papéis (`USER_ASSOCIATE`, `CLUB_MANAGER`, `PARTNER_MANAGER`, `SUPER_ADMIN`) e isolamento multi-tenant.
- **Blindagem OWASP (`src/security/owaspGuard.ts`):** CSP estrita, HSTS, `X-Frame-Options: DENY`, sanitização XSS, Anti-CSRF (Double-Submit Cookie + `Origin`), Sliding-Window Rate Limiter (`HTTP 429`).
- **LGPD & Auditoria (`src/services/lgpdService.ts`, `src/services/auditService.ts`):** Consentimentos granulares imutáveis, exportação de dados (portabilidade JSON), anonimização irreversível e logs de auditoria *append-only* sem PII/senhas.

## Como rodar agora
```bash
# 1. Rodar suíte automatizada de segurança (8 testes ponta a ponta)
npm run test:module1

# 2. Subir API localmente (porta 4000)
npm run dev

# 3. (Opcional) Subir PostgreSQL + PostGIS + Redis via Docker
docker compose up -d
```
