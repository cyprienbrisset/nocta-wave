import * as crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const keyLength = 32;
const ivLength = 16;
const tagLength = 16;

const encryptionKey = process.env.ENCRYPTION_KEY;
if (!encryptionKey) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

const key = crypto.scryptSync(encryptionKey, 'salt', keyLength);

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(encryptedData: string): string {
  const iv = Buffer.from(encryptedData.slice(0, ivLength * 2), 'hex');
  const authTag = Buffer.from(
    encryptedData.slice(ivLength * 2, (ivLength + tagLength) * 2),
    'hex',
  );
  const encrypted = encryptedData.slice((ivLength + tagLength) * 2);

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Decrypt to an object (JSON)
 */
export function decryptObject<T = Record<string, any>>(encryptedData: string): T {
  const decrypted = decrypt(encryptedData);
  return JSON.parse(decrypted) as T;
}
