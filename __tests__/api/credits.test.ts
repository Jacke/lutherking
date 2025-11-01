/**
 * Tests for credits endpoint
 * /api/credits
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock auth options to avoid ES modules import issues
jest.mock('../../lib/auth/options', () => ({
  authOptions: {},
}));

// Mock NextAuth (both constructor and getServerSession)
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => jest.fn()),
  getServerSession: jest.fn(),
}));

// Mock the [...nextauth] route handler
jest.mock('../../pages/api/auth/[...nextauth]', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock database
jest.mock('../../drizzle/db', () => ({
  db: {
    select: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth';
import { db } from '../../drizzle/db';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockDb = db as any;

describe('Credits API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/credits', () => {
    it('should return user credits when authenticated', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any);

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        credits: 10,
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockUser),
          }),
        }),
      });

      const creditsHandler = (await import('../../pages/api/credits')).default;

      const { req, res } = createMocks({
        method: 'GET',
      });

      await creditsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('credits');
      expect(data.credits).toBe(10);
    });

    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const creditsHandler = (await import('../../pages/api/credits')).default;

      const { req, res } = createMocks({
        method: 'GET',
      });

      await creditsHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
    });

    it('should return 404 if user not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'nonexistent@example.com' },
      } as any);

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      const creditsHandler = (await import('../../pages/api/credits')).default;

      const { req, res } = createMocks({
        method: 'GET',
      });

      await creditsHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });

    it('should reject invalid HTTP method', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any);

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        credits: 10,
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockUser),
          }),
        }),
      });

      const creditsHandler = (await import('../../pages/api/credits')).default;

      const { req, res } = createMocks({
        method: 'DELETE', // Invalid method
      });

      await creditsHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });
});
