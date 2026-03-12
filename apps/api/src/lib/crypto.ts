/**
 * 密码哈希与 API Token 生成工具
 */
import * as crypto from 'node:crypto';
import { API_TOKEN_PREFIX } from '@sentinel/shared';

// ── 密码 ──
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derivedHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derivedHash, 'hex'));
}

// ── JWT Secret ──
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret.replace(/^["']|["']$/g, '');
}

// ── API Token ──
export function generateApiToken(): { raw: string; hash: string; prefix: string } {
  const randomPart = crypto.randomBytes(32).toString('base64url');
  const raw = `${API_TOKEN_PREFIX}${randomPart}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.slice(0, API_TOKEN_PREFIX.length + 8);
  return { raw, hash, prefix };
}

export function hashApiToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── AES 加密 (用于存储 LLM API keys) ──
const ENC_ALGORITHM = 'aes-256-gcm';

export function encryptValue(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENC_ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decryptValue(ciphertext: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, data] = ciphertext.split(':');
  if (!ivHex || !tagHex || !data) throw new Error('Invalid encrypted value format');
  const decipher = crypto.createDecipheriv(ENC_ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY environment variable is required');
  const cleaned = raw.replace(/^["']|["']$/g, '');
  // 如果是有效的 64 字符 hex 字符串，直接使用
  if (/^[0-9a-fA-F]{64}$/.test(cleaned)) {
    return Buffer.from(cleaned, 'hex');
  }
  // 否则将任意字符串哈希为确定性 32 字节 key
  return crypto.createHash('sha256').update(cleaned).digest();
}
