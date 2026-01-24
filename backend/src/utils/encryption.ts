import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

/**
 * Get the encryption key from environment variable
 * Read lazily to ensure env vars are loaded
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  if (key.length < 64) {
    throw new Error(`ENCRYPTION_KEY must be at least 64 hex characters (got ${key.length})`);
  }
  return Buffer.from(key.slice(0, 64), 'hex');
}

/**
 * Encrypt a string using AES-256-CBC
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a string using AES-256-CBC
 */
export function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0] || '', 'hex');
  const encryptedText = parts[1] || '';
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
