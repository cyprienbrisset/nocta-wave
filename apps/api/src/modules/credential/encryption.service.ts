import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');

    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    // Derive a key from the provided encryption key
    this.key = crypto.scryptSync(encryptionKey, 'salt', this.keyLength);
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(data: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV + AuthTag + EncryptedData
    return (
      iv.toString('hex') + authTag.toString('hex') + encrypted
    );
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(encryptedData: string): string {
    // Extract IV, AuthTag, and encrypted content
    const iv = Buffer.from(encryptedData.slice(0, this.ivLength * 2), 'hex');
    const authTag = Buffer.from(
      encryptedData.slice(this.ivLength * 2, (this.ivLength + this.tagLength) * 2),
      'hex',
    );
    const encrypted = encryptedData.slice((this.ivLength + this.tagLength) * 2);

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt an object (JSON)
   */
  encryptObject(obj: Record<string, any>): string {
    return this.encrypt(JSON.stringify(obj));
  }

  /**
   * Decrypt to an object (JSON)
   */
  decryptObject<T = Record<string, any>>(encryptedData: string): T {
    const decrypted = this.decrypt(encryptedData);
    return JSON.parse(decrypted) as T;
  }

  /**
   * Hash a value (for API key storage)
   */
  hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Generate a random API key
   */
  generateApiKey(): { key: string; prefix: string; hash: string } {
    const key = `wsf_${crypto.randomBytes(32).toString('hex')}`;
    const prefix = key.slice(0, 12);
    const hash = this.hash(key);

    return { key, prefix, hash };
  }
}
