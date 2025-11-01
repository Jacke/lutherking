/**
 * Tests for authentication endpoints
 * /api/auth/register
 * /api/auth/login
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock database before importing handlers
const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};

jest.mock('../../drizzle/db', () => ({
  db: mockDb,
}));

// Mock bcrypt
const mockHash = jest.fn().mockResolvedValue('$2a$10$mockedHashedPassword');
const mockCompare = jest.fn((password: string, hash: string) => {
  // Simple mock: return true if password is TestPassword123!
  return Promise.resolve(password === 'TestPassword123!');
});

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: mockHash,
    compare: mockCompare,
  },
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  },
}));

import registerHandler from '../../pages/api/auth/register';
import loginHandler from '../../pages/api/auth/login';

describe('Authentication API', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Mock: user doesn't exist yet
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(null), // No existing user
          }),
        }),
      });

      // Mock: successful insert
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          run: jest.fn().mockResolvedValue(undefined),
        }),
      });

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
      const duplicateEmail = `duplicate-${Date.now()}@example.com`;

      // First registration: user doesn't exist
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          run: jest.fn().mockResolvedValue(undefined),
        }),
      });

      const { req: req1, res: res1 } = createMocks({
        method: 'POST',
        body: {
          email: duplicateEmail,
          password: testPassword,
        },
      });

      await registerHandler(req1, res1);
      expect(res1._getStatusCode()).toBe(200);

      // Second registration: user already exists
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              id: 1,
              email: duplicateEmail,
              password: '$2a$10$mockedHashedPassword',
            }),
          }),
        }),
      });

      const { req: req2, res: res2 } = createMocks({
        method: 'POST',
        body: {
          email: duplicateEmail,
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
    it('should login with correct credentials', async () => {
      // Mock: user exists with matching password
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              id: 1,
              email: testEmail,
              password: '$2a$10$mockedHashedPassword',
              credits: 5,
            }),
          }),
        }),
      });

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
      expect(data).toHaveProperty('user');
      expect(data.user).toHaveProperty('email', testEmail);
    });

    it('should reject login with incorrect password', async () => {
      // Mock: user exists but password won't match
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              id: 1,
              email: testEmail,
              password: '$2a$10$mockedHashedPassword',
              credits: 5,
            }),
          }),
        }),
      });

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
      // Mock: user doesn't exist
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

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
