/**
 * uGet — Controle de Acesso Baseado em Função (RBAC) + Isolamento Multi-Tenant
 * Atende RNF-07 (princípio do menor privilégio e segregação de dados entre clubes/parceiros).
 */
import { ROLES, type AccessTokenPayload, type UgetRole } from '../types/security.ts';

export type Permission =
  | 'profile:read_own'
  | 'profile:manage_lgpd_own'
  | 'benefits:read'
  | 'club:manage_own'
  | 'partner:manage_own'
  | 'reports:read_tenant'
  | 'audit:read_all'
  | 'admin:manage_all';

const ROLE_PERMISSIONS: Record<UgetRole, ReadonlySet<Permission>> = {
  [ROLES.USER_ASSOCIATE]: new Set<Permission>([
    'profile:read_own',
    'profile:manage_lgpd_own',
    'benefits:read'
  ]),
  [ROLES.CLUB_MANAGER]: new Set<Permission>([
    'profile:read_own',
    'profile:manage_lgpd_own',
    'benefits:read',
    'club:manage_own',
    'reports:read_tenant'
  ]),
  [ROLES.PARTNER_MANAGER]: new Set<Permission>([
    'profile:read_own',
    'profile:manage_lgpd_own',
    'benefits:read',
    'partner:manage_own',
    'reports:read_tenant'
  ]),
  [ROLES.SUPER_ADMIN]: new Set<Permission>([
    'profile:read_own',
    'profile:manage_lgpd_own',
    'benefits:read',
    'club:manage_own',
    'partner:manage_own',
    'reports:read_tenant',
    'audit:read_all',
    'admin:manage_all'
  ])
};

export function hasPermission(role: UgetRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/**
 * Garante isolamento multi-tenant: gestores só acessam recursos do próprio tenantId.
 */
export function assertTenantAccess(actor: AccessTokenPayload, targetTenantId: string): boolean {
  if (actor.role === ROLES.SUPER_ADMIN) return true;
  if (!actor.tenantId || !targetTenantId) return false;
  return actor.tenantId === targetTenantId;
}
