/**
 * uGet — Serviço de Criptografia em Repouso (AES-256-GCM) & Hash de Senhas (scrypt OWASP)
 * Atende RNF-06 (criptografia forte de PII e senhas) e RNF-08 (pseudonimização irreversível).
 */
import crypto from 'node:crypto';
import { env } from '../config/env.ts';

const GCM_ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

function getKeyBuffer(version: string): Buffer {
  const hex = env.piiKeys[version];
  if (!hex || hex.length !== 64) {
    throw new Error(`Chave de criptografia PII inválida para versão: ${version}`);
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Criptografa PII em repouso com AES-256-GCM autenticado.
 * Formato: "<keyVersion>:<iv_b64>:<authTag_b64>:<ciphertext_b64>"
 */
export function encryptPii(plaintext: string): string {
  const version = env.piiKeyVersion;
  const key = getKeyBuffer(version);
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(GCM_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${version}:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Descriptografa PII autenticada verificando integridade da AuthTag (detecta adulteração).
 */
export function decryptPii(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 4) {
    throw new Error('Formato de dado criptografado inválido');
  }
  const [version, ivB64, tagB64, cipherB64] = parts;
  const key = getKeyBuffer(version);
  const decipher = crypto.createDecipheriv(GCM_ALGO, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(cipherB64, 'base64')), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Hash determinístico SHA-256 para lookup indexado (ex.: e-mail normalizado) ou anonimização de IP.
 */
export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase(), 'utf8').digest('hex');
}

/**
 * Hash forte de senha usando scrypt (memory-hard, salt único de 16 bytes).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      SCRYPT_PARAMS.keylen,
      { N: SCRYPT_PARAMS.N, r: SCRYPT_PARAMS.r, p: SCRYPT_PARAMS.p },
      (err, key) => (err ? reject(err) : resolve(key))
    );
  });
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

/**
 * Verificação de senha em tempo constante (previne timing attacks).
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');

  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, expected.length, { N, r, p }, (err, key) =>
      err ? reject(err) : resolve(key)
    );
  });
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}
