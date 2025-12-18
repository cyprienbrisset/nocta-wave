// Credential Types

export type CredentialType = 'api_key' | 'oauth2' | 'basic_auth' | 'custom';

export interface Credential {
  id: string;
  name: string;
  type: CredentialType;
  teamId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

// Decrypted credential data (internal use only)
export interface CredentialData {
  type: CredentialType;
  data: ApiKeyCredential | OAuth2Credential | BasicAuthCredential | CustomCredential;
}

export interface ApiKeyCredential {
  apiKey: string;
  headerName?: string; // Default: Authorization
  prefix?: string; // Default: Bearer
}

export interface OAuth2Credential {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenUrl: string;
  authorizationUrl?: string;
  scope?: string;
  expiresAt?: string;
}

export interface BasicAuthCredential {
  username: string;
  password: string;
}

export interface CustomCredential {
  [key: string]: string;
}

// Create credential input (before encryption)
export interface CreateCredentialInput {
  name: string;
  type: CredentialType;
  data: ApiKeyCredential | OAuth2Credential | BasicAuthCredential | CustomCredential;
}

// Update credential input
export interface UpdateCredentialInput {
  name?: string;
  data?: ApiKeyCredential | OAuth2Credential | BasicAuthCredential | CustomCredential;
}
