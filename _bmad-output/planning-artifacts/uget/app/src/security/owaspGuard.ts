/**
 * uGet — Blindagem OWASP Top 10 (RNF-10)
 * - Security Headers (CSP estrita, HSTS, X-Frame-Options, X-Content-Type-Options)
 * - Sanitização rigorosa de entradas (XSS / HTML injection)
 * - Proteção Anti-CSRF (Double-Submit Cookie + validação de Origin)
 * - Rate Limiting por IP e rota (Sliding Window)
 */
import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { env } from '../config/env.ts';

/* 1. Security Headers Obrigatórios */
export function applySecurityHeaders(res: ServerResponse): void {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  res.setHeader('Cache-Control', 'no-store');
}

/* 2. Sanitização de Entradas contra XSS / Injeção de Markup */
export function sanitizeText(input: unknown, maxLen = 160): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/<[^>]*>?/gm, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLen);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

export function isStrongPassword(password: string): boolean {
  return (
    typeof password === 'string' &&
    password.length >= 10 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

export function sanitizeCpf(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const digits = input.replace(/\D/g, '');
  return digits.length === 11 ? digits : null;
}

/* 3. Parsing de Cookies & Proteção Anti-CSRF (Double-Submit Cookie) */
export function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie || '';
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = decodeURIComponent(part.slice(idx + 1).trim());
    if (k) out[k] = v;
  }
  return out;
}

export function issueCsrfCookie(res: ServerResponse): string {
  const token = crypto.randomBytes(24).toString('base64url');
  const secureAttr = env.isProd ? '; Secure' : '';
  res.setHeader('Set-Cookie', `uget_csrf=${token}; Path=/; SameSite=Strict${secureAttr}`);
  return token;
}

export function verifyCsrfProtection(req: IncomingMessage): { ok: boolean; reason?: string } {
  const method = (req.method || 'GET').toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return { ok: true };

  // Validação de Origin quando presente
  const origin = req.headers.origin;
  if (origin && !env.allowedOrigins.includes(origin)) {
    return { ok: false, reason: 'Origem não autorizada (CSRF Origin check)' };
  }

  // Se o cliente usa cookies de sessão, exige par CSRF (cookie === header X-CSRF-Token)
  const cookies = parseCookies(req);
  const cookieToken = cookies['uget_csrf'];
  const headerToken = String(req.headers['x-csrf-token'] || '');
  if (!cookieToken || !headerToken) {
    return { ok: false, reason: 'Token Anti-CSRF ausente (cookie uget_csrf + header X-CSRF-Token obrigatórios)' };
  }
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'Token Anti-CSRF inválido' };
  }
  return { ok: true };
}

/* 4. Rate Limiting (Sliding Window por chave IP + grupo de rota) */
interface RateBucket {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private buckets = new Map<string, RateBucket>();

  check(key: string, maxRequests: number, windowMs: number): { allowed: boolean; retryAfterSec: number; remaining: number } {
    const now = Date.now();
    const cutoff = now - windowMs;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      this.buckets.set(key, bucket);
    }

    bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);
    if (bucket.timestamps.length >= maxRequests) {
      const oldest = bucket.timestamps[0] || now;
      const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      return { allowed: false, retryAfterSec, remaining: 0 };
    }

    bucket.timestamps.push(now);
    return {
      allowed: true,
      retryAfterSec: 0,
      remaining: Math.max(0, maxRequests - bucket.timestamps.length)
    };
  }

  reset(): void {
    this.buckets.clear();
  }
}

export const rateLimiter = new SlidingWindowRateLimiter();
