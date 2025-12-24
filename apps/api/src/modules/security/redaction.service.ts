import { Injectable, Logger } from '@nestjs/common';

/**
 * RedactionService - Masks sensitive data before logging/storage
 *
 * SECURITY: This service prevents secrets from being stored in plain text
 * in execution logs, database records, and external storage.
 *
 * Detection methods:
 * 1. Key-based: Field names matching sensitive patterns (password, secret, token, etc.)
 * 2. Pattern-based: Values matching known secret formats (API keys, JWTs, etc.)
 * 3. Credential-aware: Fields explicitly marked as credentials
 */

const REDACTED = '******';

// Field names that indicate sensitive data (case-insensitive)
const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /apikey/i,
  /auth/i,
  /credential/i,
  /private[_-]?key/i,
  /privatekey/i,
  /access[_-]?key/i,
  /accesskey/i,
  /secret[_-]?key/i,
  /secretkey/i,
  /bearer/i,
  /jwt/i,
  /session/i,
  /cookie/i,
  /oauth/i,
  /client[_-]?secret/i,
  /clientsecret/i,
  /refresh[_-]?token/i,
  /refreshtoken/i,
  /encryption[_-]?key/i,
  /encryptionkey/i,
  /signing[_-]?key/i,
  /signingkey/i,
  /webhook[_-]?secret/i,
  /webhooksecret/i,
  /ssh[_-]?key/i,
  /sshkey/i,
  /passphrase/i,
  /pin/i,
  /cvv/i,
  /ssn/i,
  /credit[_-]?card/i,
  /creditcard/i,
  /card[_-]?number/i,
  /cardnumber/i,
];

// Value patterns that indicate secrets (regardless of field name)
const SECRET_VALUE_PATTERNS = [
  // JWT tokens
  /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
  // Bearer tokens
  /^Bearer\s+[A-Za-z0-9_-]+/i,
  // AWS access keys
  /^AKIA[A-Z0-9]{16}$/,
  // AWS secret keys (40 chars)
  /^[A-Za-z0-9/+=]{40}$/,
  // Generic API keys (long alphanumeric strings)
  /^[A-Za-z0-9_-]{32,}$/,
  // GitHub tokens
  /^gh[ps]_[A-Za-z0-9]{36,}$/,
  // Stripe keys
  /^sk_(live|test)_[A-Za-z0-9]{24,}$/,
  /^pk_(live|test)_[A-Za-z0-9]{24,}$/,
  // Basic auth
  /^Basic\s+[A-Za-z0-9+/=]+$/i,
  // Private keys (PEM format)
  /-----BEGIN.*PRIVATE KEY-----/,
  // Connection strings with passwords
  /(?:mongodb|postgres|mysql|redis):\/\/[^:]+:[^@]+@/i,
];

// Fields that should never be redacted (whitelist)
const SAFE_FIELDS = new Set([
  'id',
  'name',
  'type',
  'status',
  'createdAt',
  'updatedAt',
  'timestamp',
  'duration',
  'count',
  'size',
  'length',
  'index',
  'version',
  'description',
  'label',
  'title',
  'message',
  'error',
  'success',
  'enabled',
  'active',
  'visible',
  'url',
  'path',
  'method',
  'headers', // Headers are checked individually
  'body', // Body is checked recursively
  'data', // Data is checked recursively
  'config', // Config is checked recursively
  'options', // Options is checked recursively
  'result', // Result is checked recursively
  'output', // Output is checked recursively
  'input', // Input is checked recursively
]);

export interface RedactionOptions {
  /** Maximum depth for recursive redaction (default: 10) */
  maxDepth?: number;
  /** Whether to redact based on value patterns (default: true) */
  redactByValuePattern?: boolean;
  /** Additional field patterns to redact */
  additionalPatterns?: RegExp[];
  /** Fields to always preserve (even if they match patterns) */
  preserveFields?: string[];
}

export interface RedactionResult {
  data: unknown;
  redactedCount: number;
  redactedFields: string[];
}

@Injectable()
export class RedactionService {
  private readonly logger = new Logger(RedactionService.name);

  /**
   * Redact sensitive data from an object
   */
  redact(data: unknown, options: RedactionOptions = {}): RedactionResult {
    const {
      maxDepth = 10,
      redactByValuePattern = true,
      additionalPatterns = [],
      preserveFields = [],
    } = options;

    const redactedFields: string[] = [];
    const preserveSet = new Set(preserveFields);

    const result = this.redactRecursive(
      data,
      '',
      0,
      maxDepth,
      redactByValuePattern,
      additionalPatterns,
      preserveSet,
      redactedFields,
    );

    if (redactedFields.length > 0) {
      this.logger.debug(`Redacted ${redactedFields.length} sensitive fields`);
    }

    return {
      data: result,
      redactedCount: redactedFields.length,
      redactedFields,
    };
  }

  /**
   * Quick redaction without tracking redacted fields
   */
  redactQuick(data: unknown): unknown {
    return this.redact(data).data;
  }

  /**
   * Check if a field name indicates sensitive data
   */
  isSensitiveField(fieldName: string): boolean {
    // Check if field is in safe list
    if (SAFE_FIELDS.has(fieldName.toLowerCase())) {
      return false;
    }

    // Check against sensitive patterns
    return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(fieldName));
  }

  /**
   * Check if a value looks like a secret
   */
  isSensitiveValue(value: string): boolean {
    // Skip short values (likely not secrets)
    if (value.length < 16) {
      return false;
    }

    return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  }

  private redactRecursive(
    data: unknown,
    path: string,
    depth: number,
    maxDepth: number,
    redactByValuePattern: boolean,
    additionalPatterns: RegExp[],
    preserveSet: Set<string>,
    redactedFields: string[],
  ): unknown {
    // Prevent infinite recursion
    if (depth > maxDepth) {
      return data;
    }

    // Handle null/undefined
    if (data === null || data === undefined) {
      return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map((item, index) =>
        this.redactRecursive(
          item,
          `${path}[${index}]`,
          depth + 1,
          maxDepth,
          redactByValuePattern,
          additionalPatterns,
          preserveSet,
          redactedFields,
        ),
      );
    }

    // Handle objects
    if (typeof data === 'object') {
      const result: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(data)) {
        const fieldPath = path ? `${path}.${key}` : key;

        // Check if field should be preserved
        if (preserveSet.has(key)) {
          result[key] = value;
          continue;
        }

        // Check if field name indicates sensitive data
        const isSensitiveFieldName =
          this.isSensitiveField(key) ||
          additionalPatterns.some((p) => p.test(key));

        if (isSensitiveFieldName && value !== null && value !== undefined) {
          result[key] = REDACTED;
          redactedFields.push(fieldPath);
          continue;
        }

        // Recursively process nested objects/arrays
        if (typeof value === 'object' && value !== null) {
          result[key] = this.redactRecursive(
            value,
            fieldPath,
            depth + 1,
            maxDepth,
            redactByValuePattern,
            additionalPatterns,
            preserveSet,
            redactedFields,
          );
          continue;
        }

        // Check string values for secret patterns
        if (
          redactByValuePattern &&
          typeof value === 'string' &&
          this.isSensitiveValue(value)
        ) {
          result[key] = REDACTED;
          redactedFields.push(fieldPath);
          continue;
        }

        result[key] = value;
      }

      return result;
    }

    // Handle primitive string values at root level (rare case)
    if (
      redactByValuePattern &&
      typeof data === 'string' &&
      this.isSensitiveValue(data)
    ) {
      redactedFields.push(path || 'root');
      return REDACTED;
    }

    return data;
  }

  /**
   * Redact sensitive data from HTTP headers
   */
  redactHeaders(headers: Record<string, string>): Record<string, string> {
    const sensitiveHeaders = new Set([
      'authorization',
      'x-api-key',
      'x-auth-token',
      'cookie',
      'set-cookie',
      'x-csrf-token',
      'x-xsrf-token',
      'proxy-authorization',
      'www-authenticate',
    ]);

    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.has(key.toLowerCase())) {
        result[key] = REDACTED;
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Create a partial redaction that shows first/last characters
   * Useful for debugging while still protecting secrets
   */
  partialRedact(value: string, visibleChars: number = 4): string {
    if (value.length <= visibleChars * 2) {
      return REDACTED;
    }

    const start = value.substring(0, visibleChars);
    const end = value.substring(value.length - visibleChars);
    return `${start}...${end}`;
  }
}
