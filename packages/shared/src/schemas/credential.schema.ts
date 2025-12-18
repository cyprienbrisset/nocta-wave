import { z } from 'zod';

// API Key credential schema
export const ApiKeyCredentialSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  headerName: z.string().default('Authorization'),
  prefix: z.string().default('Bearer'),
});

// OAuth2 credential schema
export const OAuth2CredentialSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  tokenUrl: z.string().url('Invalid token URL'),
  authorizationUrl: z.string().url().optional(),
  scope: z.string().optional(),
  expiresAt: z.string().optional(),
});

// Basic auth credential schema
export const BasicAuthCredentialSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// Custom credential schema
export const CustomCredentialSchema = z.record(z.string());

// Credential data schema (union)
export const CredentialDataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('api_key'),
    data: ApiKeyCredentialSchema,
  }),
  z.object({
    type: z.literal('oauth2'),
    data: OAuth2CredentialSchema,
  }),
  z.object({
    type: z.literal('basic_auth'),
    data: BasicAuthCredentialSchema,
  }),
  z.object({
    type: z.literal('custom'),
    data: CustomCredentialSchema,
  }),
]);

// Create credential schema
export const CreateCredentialSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['api_key', 'oauth2', 'basic_auth', 'custom']),
  data: z.union([
    ApiKeyCredentialSchema,
    OAuth2CredentialSchema,
    BasicAuthCredentialSchema,
    CustomCredentialSchema,
  ]),
});

// Update credential schema
export const UpdateCredentialSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  data: z
    .union([
      ApiKeyCredentialSchema,
      OAuth2CredentialSchema,
      BasicAuthCredentialSchema,
      CustomCredentialSchema,
    ])
    .optional(),
});
