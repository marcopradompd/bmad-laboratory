/**
 * uGet — Serviço de Tokens JWT (Curta Duração) & Refresh Tokens Rotacionáveis
 * Atende RNF-07 (sessões seguras, rotação e revogação por família contra reuso).
 */
import crypto from 'node:crypto';
import { env } from '../config/env.ts';
import type { AccessTokenPayload, UgetRole } from '../types/security.ts';

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64').toString('utf8');
}

export function signAccessToken(user: { id: string; role: UgetRole; tenantId: string | null }): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadObj: AccessTokenPayload = {
    sub: user.id,
    role: user.role,
    tenantId: user.tenantId,
    iat: nowSec,
    exp: nowSec + env.jwtAccessTtlSeconds,
    jti: crypto.randomUUID()
  };
  const payload = base64UrlEncode(JSON.stringify(payloadObj));
  const signature = crypto
    .createHmac('sha256', env.jwtAccessSecret)
    .update(`${header}.${payload}`)
    .digest();
  return `${header}.${payload}.${base64UrlEncode(signature)}`;
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;

    const expectedSig = crypto
      .createHmac('sha256', env.jwtAccessSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest();
    const actualSig = Buffer.from(
      sigB64.replace(/-/g, '+').replace(/_/g, '/') +
        (sigB64.length % 4 === 0 ? '' : '='.repeat(4 - (sigB64.length % 4))),
      'base64'
    );

    if (expectedSig.length !== actualSig.length || !crypto.timingSafeEqual(expectedSig, actualSig)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(payloadB64)) as AccessTokenPayload;
    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.sub || !payload.role || typeof payload.exp !== 'number' || payload.exp <= nowSec) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function generateOpaqueRefreshToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(48).toString('base64url');
  const tokenHash = crypto
    .createHmac('sha256', env.jwtRefreshSecret)
    .update(rawToken)
    .digest('hex');
  return { rawToken, tokenHash };
}

export function hashRefreshToken(rawToken: string): string {
  return crypto
    .createHmac('sha256', env.jwtRefreshSecret)
    .update(rawToken)
    .digest('hex');
}
