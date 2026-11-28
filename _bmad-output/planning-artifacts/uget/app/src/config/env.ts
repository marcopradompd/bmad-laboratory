/**
 * uGet — Configuração centralizada com validação de segredos
 */
import crypto from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';

function requireSecret(envName: string, devFallback: string, minLen = 32): string {
  const val = process.env[envName];
  if (val && val.length >= minLen) return val;
  if (isProd) {
    throw new Error(`[SEGURANÇA] Variável obrigatória ausente ou fraca em produção: ${envName}`);
  }
  return devFallback;
}

const DEV_PII_KEY = crypto.createHash('sha256').update('uget-dev-pii-key-v1-do-not-use-in-prod').digest('hex');

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  port: Number(process.env.PORT || 4000),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:4000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  piiKeyVersion: process.env.PII_KEY_VERSION || 'v1',
  piiKeys: {
    v1: requireSecret('PII_ENCRYPTION_KEY_V1', DEV_PII_KEY, 64)
  } as Record<string, string>,
  jwtAccessSecret: requireSecret('JWT_ACCESS_SECRET', 'uget_dev_access_secret_minimum_64_chars_change_in_production_2026!!', 32),
  jwtRefreshSecret: requireSecret('JWT_REFRESH_SECRET', 'uget_dev_refresh_secret_minimum_64_chars_change_in_production_2026!', 32),
  jwtAccessTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS || 900),       // 15 min
  jwtRefreshTtlSeconds: Number(process.env.JWT_REFRESH_TTL_SECONDS || 604800),  // 7 dias
  policyVersion: '2026.11'
};
