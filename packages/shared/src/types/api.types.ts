// API Types - Request/Response Types

// Pagination
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

// Error response
export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface ValidationError extends ApiError {
  code: 'VALIDATION_ERROR';
  details: {
    fields: Array<{
      field: string;
      message: string;
    }>;
  };
}

// Common error codes
export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMIT_EXCEEDED';

// Query types
export interface WorkflowQuery extends PaginationQuery {
  search?: string;
  isActive?: boolean;
  sort?: 'name' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}

export interface ExecutionQuery extends PaginationQuery {
  workflowId?: string;
  status?: string;
  from?: string;
  to?: string;
}

// Rate limit headers
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
}
