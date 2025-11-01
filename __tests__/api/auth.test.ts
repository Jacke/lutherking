/**
 * Tests for authentication endpoints
 * /api/auth/register
 * /api/auth/login
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import registerHandler from '../../pages/api/auth/register';
import loginHandler from '../../pages/api/auth/login';

describe('Authentication API', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('message');
      expect(data.message).toContain('registered');
    });

    it('should reject registration without email', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          password: testPassword,
        },
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
    });

    it('should reject registration without password', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: testEmail,
        },
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
    });

    it('should reject duplicate email registration', async () => {
      // Try to register same email twice
      const { req: req1, res: res1 } = createMocks({
        method: 'POST',
        body: {
          email: `duplicate-${Date.now()}@example.com`,
          password: testPassword,
        },
      });

      await registerHandler(req1, res1);
      expect(res1._getStatusCode()).toBe(200);

      // Try again with same email
      const { req: req2, res: res2 } = createMocks({
        method: 'POST',
        body: {
          email: `duplicate-${Date.now()}@example.com`,
          password: testPassword,
        },
      });

      await registerHandler(req2, res2);
      expect(res2._getStatusCode()).toBeGreaterThanOrEqual(400);
    });

    it('should reject invalid HTTP method', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      // Ensure test user exists
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: testEmail,
          password: testPassword,
        },
      });
      await registerHandler(req, res);
    });

    it('should login with correct credentials', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('token');
    });

    it('should reject login with incorrect password', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: testEmail,
          password: 'WrongPassword123!',
        },
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
    });

    it('should reject login with non-existent email', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'nonexistent@example.com',
          password: testPassword,
        },
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
    });

    it('should reject login without email', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          password: testPassword,
        },
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });

    it('should reject invalid HTTP method', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });
});
