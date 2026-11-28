/**
 * uGet — Repositório de Dados de Segurança, Sessões, Consentimentos LGPD e Auditoria
 * Interface pronta para PostgreSQL (001_module1_security_lgpd.sql) com store em memória
 * para desenvolvimento e testes automatizados sem dependências externas.
 */
import crypto from 'node:crypto';
import type {
  AuditLogRecord,
  LgpdConsentRecord,
  LgpdPurpose,
  RefreshTokenRecord,
  UserRecord
} from '../types/security.ts';

export class InMemorySecurityStore {
  private usersById = new Map<string, UserRecord>();
  private usersByEmailHash = new Map<string, string>();
  private refreshTokensByHash = new Map<string, RefreshTokenRecord>();
  private consents: LgpdConsentRecord[] = [];
  private auditLogs: AuditLogRecord[] = [];
  private auditSeq = 1;

  createUser(record: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): UserRecord {
    if (this.usersByEmailHash.has(record.emailHash)) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }
    const now = new Date().toISOString();
    const user: UserRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    this.usersById.set(user.id, user);
    this.usersByEmailHash.set(user.emailHash, user.id);
    return { ...user };
  }

  findUserByEmailHash(emailHash: string): UserRecord | null {
    const id = this.usersByEmailHash.get(emailHash);
    if (!id) return null;
    const u = this.usersById.get(id);
    return u ? { ...u } : null;
  }

  findUserById(id: string): UserRecord | null {
    const u = this.usersById.get(id);
    return u ? { ...u } : null;
  }

  updateUser(id: string, patch: Partial<UserRecord>): UserRecord | null {
    const existing = this.usersById.get(id);
    if (!existing) return null;
    if (patch.emailHash && patch.emailHash !== existing.emailHash) {
      this.usersByEmailHash.delete(existing.emailHash);
      this.usersByEmailHash.set(patch.emailHash, id);
    }
    const updated: UserRecord = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.usersById.set(id, updated);
    return { ...updated };
  }

  /* Refresh Tokens */
  saveRefreshToken(rec: Omit<RefreshTokenRecord, 'id' | 'createdAt'>): RefreshTokenRecord {
    const full: RefreshTokenRecord = {
      ...rec,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.refreshTokensByHash.set(full.tokenHash, full);
    return { ...full };
  }

  findRefreshToken(tokenHash: string): RefreshTokenRecord | null {
    const rec = this.refreshTokensByHash.get(tokenHash);
    return rec ? { ...rec } : null;
  }

  revokeRefreshToken(tokenHash: string): void {
    const rec = this.refreshTokensByHash.get(tokenHash);
    if (rec) rec.revoked = true;
  }

  revokeTokenFamily(familyId: string): void {
    for (const rec of this.refreshTokensByHash.values()) {
      if (rec.familyId === familyId) rec.revoked = true;
    }
  }

  revokeAllUserTokens(userId: string): void {
    for (const rec of this.refreshTokensByHash.values()) {
      if (rec.userId === userId) rec.revoked = true;
    }
  }

  /* Consentimentos LGPD (Append-only) */
  appendConsent(rec: Omit<LgpdConsentRecord, 'id' | 'recordedAt'>): LgpdConsentRecord {
    const full: LgpdConsentRecord = {
      ...rec,
      id: crypto.randomUUID(),
      recordedAt: new Date().toISOString()
    };
    this.consents.push(full);
    return { ...full };
  }

  getUserConsents(userId: string): LgpdConsentRecord[] {
    return this.consents.filter((c) => c.userId === userId).map((c) => ({ ...c }));
  }

  getLatestConsentMap(userId: string): Record<LgpdPurpose, LgpdConsentRecord | null> {
    const map: Record<LgpdPurpose, LgpdConsentRecord | null> = {
      terms: null,
      gps: null,
      push: null,
      surveys: null
    };
    for (const c of this.consents) {
      if (c.userId === userId) {
        map[c.purpose] = { ...c };
      }
    }
    return map;
  }

  /* Logs de Auditoria Imutáveis (Append-only) */
  appendAuditLog(entry: Omit<AuditLogRecord, 'id' | 'createdAt'>): AuditLogRecord {
    const full: AuditLogRecord = {
      ...entry,
      id: this.auditSeq++,
      createdAt: new Date().toISOString()
    };
    this.auditLogs.push(Object.freeze(full));
    return full;
  }

  listAuditLogs(limit = 50): AuditLogRecord[] {
    return this.auditLogs.slice(-limit).reverse();
  }

  clearForTests(): void {
    this.usersById.clear();
    this.usersByEmailHash.clear();
    this.refreshTokensByHash.clear();
    this.consents = [];
    this.auditLogs = [];
    this.auditSeq = 1;
  }
}

export const securityStore = new InMemorySecurityStore();
