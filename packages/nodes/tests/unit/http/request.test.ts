import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { httpRequest, HttpRequestSchema } from '../../../src/http/request';
import { createMockContext, createMockInput, mockFetch, mockFetchError, resetFetchMock } from '../../mocks';

describe('HTTP Request Node', () => {
  beforeEach(() => {
    resetFetchMock();
  });

  afterEach(() => {
    resetFetchMock();
  });

  describe('Schema Validation', () => {
    it('should require valid URL', () => {
      expect(() => HttpRequestSchema.parse({ url: 'invalid' })).toThrow();
    });

    it('should parse valid config', () => {
      const config = HttpRequestSchema.parse({
        url: 'https://api.example.com/data',
      });
      expect(config.url).toBe('https://api.example.com/data');
      expect(config.method).toBe('GET');
      expect(config.timeout).toBe(30000);
      expect(config.followRedirects).toBe(true);
      expect(config.responseType).toBe('json');
    });

    it('should accept all HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      methods.forEach(method => {
        const config = HttpRequestSchema.parse({
          url: 'https://api.example.com',
          method,
        });
        expect(config.method).toBe(method);
      });
    });

    it('should validate timeout range', () => {
      expect(() => HttpRequestSchema.parse({
        url: 'https://api.example.com',
        timeout: 500, // Too low
      })).toThrow();

      expect(() => HttpRequestSchema.parse({
        url: 'https://api.example.com',
        timeout: 500000, // Too high
      })).toThrow();
    });
  });

  describe('Node Definition', () => {
    it('should have correct type', () => {
      expect(httpRequest.type).toBe('http.request');
    });

    it('should have correct category', () => {
      expect(httpRequest.category).toBe('http');
    });

    it('should have required inputs', () => {
      const inputNames = httpRequest.inputs.map(i => i.name);
      expect(inputNames).toContain('url');
      expect(inputNames).toContain('method');
      expect(inputNames).toContain('headers');
      expect(inputNames).toContain('body');
    });

    it('should have multiple outputs', () => {
      const outputNames = httpRequest.outputs.map(o => o.name);
      expect(outputNames).toContain('response');
      expect(outputNames).toContain('statusCode');
      expect(outputNames).toContain('headers');
      expect(outputNames).toContain('body');
    });

    it('should support credentials', () => {
      expect(httpRequest.credentials).toContain('api_key');
      expect(httpRequest.credentials).toContain('oauth2');
      expect(httpRequest.credentials).toContain('basic_auth');
    });
  });

  describe('Node Runner', () => {
    const context = createMockContext();

    it('should make GET request', async () => {
      mockFetch({
        status: 200,
        body: { message: 'success' },
      });

      const input = createMockInput({
        data: {},
        config: {
          url: 'https://api.example.com/data',
          method: 'GET',
          timeout: 30000,
          followRedirects: true,
          responseType: 'json',
        },
      });

      const result = await httpRequest.runner(input, context);

      expect(result.data.statusCode).toBe(200);
      expect(result.data.body).toEqual({ message: 'success' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should make POST request with body', async () => {
      mockFetch({
        status: 201,
        body: { id: 1 },
      });

      const input = createMockInput({
        data: {},
        config: {
          url: 'https://api.example.com/data',
          method: 'POST',
          body: { name: 'test' },
          timeout: 30000,
          followRedirects: true,
          responseType: 'json',
        },
      });

      const result = await httpRequest.runner(input, context);

      expect(result.data.statusCode).toBe(201);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        })
      );
    });

    it('should add query parameters', async () => {
      mockFetch({ status: 200, body: {} });

      const input = createMockInput({
        data: {},
        config: {
          url: 'https://api.example.com/search',
          method: 'GET',
          queryParams: { q: 'test', limit: '10' },
          timeout: 30000,
          followRedirects: true,
          responseType: 'json',
        },
      });

      await httpRequest.runner(input, context);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=test'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
    });

    it('should add custom headers', async () => {
      mockFetch({ status: 200, body: {} });

      const input = createMockInput({
        data: {},
        config: {
          url: 'https://api.example.com/data',
          method: 'GET',
          headers: { 'X-Custom-Header': 'custom-value' },
          timeout: 30000,
          followRedirects: true,
          responseType: 'json',
        },
      });

      await httpRequest.runner(input, context);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });

    it('should inject API key credentials', async () => {
      mockFetch({ status: 200, body: {} });

      const input = createMockInput({
        data: {},
        config: {
          url: 'https://api.example.com/data',
          method: 'GET',
          timeout: 30000,
          followRedirects: true,
          responseType: 'json',
        },
        credentials: {
          apiKey: 'secret-api-key',
          prefix: 'Bearer',
        },
      });

      await httpRequest.runner(input, context);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer secret-api-key',
          }),
        })
      );
    });

    it('should inject basic auth credentials', async () => {
      mockFetch({ status: 200, body: {} });

      const input = createMockInput({
        data: {},
        config: {
          url: 'https://api.example.com/data',
          method: 'GET',
          timeout: 30000,
          followRedirects: true,
          responseType: 'json',
        },
        credentials: {
          username: 'user',
          password: 'pass',
        },
      });

      await httpRequest.runner(input, context);

      const expectedAuth = `Basic ${Buffer.from('user:pass').toString('base64')}`;
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expectedAuth,
          }),
        })
      );
    });

    it('should handle error responses', async () => {
      mockFetch({
        status: 404,
        statusText: 'Not Found',
        body: { error: 'Resource not found' },
      });

      const input = createMockInput({
        data: {},
        config: {
          url: 'https://api.example.com/missing',
          method: 'GET',
          timeout: 30000,
          followRedirects: true,
          responseType: 'json',
        },
      });

      const result = await httpRequest.runner(input, context);

      expect(result.data.statusCode).toBe(404);
      expect(result.data.body).toEqual({ error: 'Resource not found' });
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should log request details', async () => {
      mockFetch({ status: 200, body: {} });

      const mockContext = createMockContext();
      const input = createMockInput({
        data: {},
        config: {
          url: 'https://api.example.com/data',
          method: 'POST',
          timeout: 30000,
          followRedirects: true,
          responseType: 'json',
        },
      });

      await httpRequest.runner(input, mockContext);

      expect(mockContext.logger.info).toHaveBeenCalledWith(
        'HTTP Request: POST https://api.example.com/data'
      );
    });
  });
});
