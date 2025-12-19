/**
 * Mock HTTP responses for testing HTTP-based nodes
 */
import { vi } from 'vitest';

export interface MockResponse {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: unknown;
  ok?: boolean;
}

/**
 * Create a mock fetch response
 */
export function createMockResponse(response: MockResponse): Response {
  const headers = new Headers(response.headers || {});

  return {
    ok: response.ok ?? (response.status >= 200 && response.status < 300),
    status: response.status,
    statusText: response.statusText || 'OK',
    headers,
    json: vi.fn().mockResolvedValue(response.body),
    text: vi.fn().mockResolvedValue(
      typeof response.body === 'string'
        ? response.body
        : JSON.stringify(response.body)
    ),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    blob: vi.fn().mockResolvedValue(new Blob()),
    formData: vi.fn().mockResolvedValue(new FormData()),
    clone: vi.fn(),
    body: null,
    bodyUsed: false,
    redirected: false,
    type: 'basic',
    url: '',
  } as unknown as Response;
}

/**
 * Mock fetch to return specific responses
 */
export function mockFetch(responses: MockResponse | MockResponse[]): void {
  const responseArray = Array.isArray(responses) ? responses : [responses];
  let callIndex = 0;

  (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const response = responseArray[callIndex] || responseArray[responseArray.length - 1];
    callIndex++;
    return Promise.resolve(createMockResponse(response));
  });
}

/**
 * Mock fetch to throw an error
 */
export function mockFetchError(error: Error | string): void {
  (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
    typeof error === 'string' ? new Error(error) : error
  );
}

/**
 * Reset fetch mock
 */
export function resetFetchMock(): void {
  (global.fetch as ReturnType<typeof vi.fn>).mockReset();
}
