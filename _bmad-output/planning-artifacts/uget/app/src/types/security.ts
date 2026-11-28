/**
 * uGet — Tipos de Domínio de Segurança, RBAC, LGPD e Auditoria
 */

export const ROLES = {
  USER_ASSOCIATE: 'USER_ASSOCIATE',
  CLUB_MANAGER: 'CLUB_MANAGER',
  PARTNER_MANAGER: 'PARTNER_MANAGER',
  SUPER_ADMIN: 'SUPER_ADMIN'
} as const;

export type UgetRole = (typeof ROLES)[keyof typeof ROLES];

export type LgpdPurpose = 'terms' | 'gps' | 'push' | 'surveys';

export interface UserRecord {
  id: string;
  emailHash: string;
  emailEncrypted: string;
  nameEncrypted: string;
  cpfEncrypted: string | null;
  phoneEncrypted: string | null;
  passwordHash: string;
  role: UgetRole;
  tenantId: string | null;
  isAnonymized: boolean;
  anonymizedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  revoked: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface LgpdConsentRecord {
  id: string;
  userId: string;
  purpose: LgpdPurpose;
  granted: boolean;
  policyVersion: string;
  channel: string;
  ipHash: string | null;
  recordedAt: string;
}

export interface AuditLogRecord {
  id: number;
  correlationId: string;
  actorId: string | null;
  actorRole: UgetRole | 'ANONYMOUS';
  action: string;
  resource: string;
  status: 'SUCCESS' | 'DENIED' | 'ERROR';
  ipHash: string | null;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface AccessTokenPayload {
  sub: string;
  role: UgetRole;
  tenantId: string | null;
  iat: number;
  exp: number;
  jti: string;
}
