/**
 * Tests for call endpoints
 * /api/call/start
 * /api/call/end
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock database
jest.mock('../../drizzle/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth';
import { db } from '../../drizzle/db';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockDb = db as any;

describe('Call API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/call/start', () => {
    it('should start a call session with valid credentials', async () => {
      // Mock authenticated session
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any);

      // Mock database responses
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        credits: 5,
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockUser),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            run: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          run: jest.fn().mockResolvedValue(undefined),
        }),
      });

      const startHandler = (await import('../../pages/api/call/start')).default;

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          challengeId: 1,
        },
      });

      await startHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('sessionId');
      expect(data).toHaveProperty('creditsRemaining');
      expect(data.creditsRemaining).toBe(4);
    });

    it('should reject if user has no credits', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any);

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        credits: 0,
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockUser),
          }),
        }),
      });

      const startHandler = (await import('../../pages/api/call/start')).default;

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          challengeId: 1,
        },
      });

      await startHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('credits');
    });

    it('should reject if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const startHandler = (await import('../../pages/api/call/start')).default;

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          challengeId: 1,
        },
      });

      await startHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
    });

    it('should reject if challengeId is missing', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any);

      const startHandler = (await import('../../pages/api/call/start')).default;

      const { req, res } = createMocks({
        method: 'POST',
        body: {},
      });

      await startHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('challengeId');
    });

    it('should reject invalid HTTP method', async () => {
      const startHandler = (await import('../../pages/api/call/start')).default;

      const { req, res } = createMocks({
        method: 'GET',
      });

      await startHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });

  describe('POST /api/call/end', () => {
    it('should end a call session successfully', async () => {
      const mockSession = {
        id: 1,
        userId: 1,
        sessionId: 'test-session-id',
        wavPath: '/storage/sessions/test.webm',
        startedAt: Date.now(),
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockSession),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            run: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      // Mock fetch for /api/eval
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          clarity_score: 75,
          filler_words: 'эм, ну',
          tone: 'confident',
          confidence: 80,
          highlights: ['Good structure'],
          text: 'Well done!',
        }),
      }) as any;

      const endHandler = (await import('../../pages/api/call/end')).default;

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'test-session-id',
        },
      });

      await endHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
    });

    it('should reject if sessionId is missing', async () => {
      const endHandler = (await import('../../pages/api/call/end')).default;

      const { req, res } = createMocks({
        method: 'POST',
        body: {},
      });

      await endHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('sessionId');
    });

    it('should reject if session not found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      const endHandler = (await import('../../pages/api/call/end')).default;

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'non-existent-id',
        },
      });

      await endHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });

    it('should reject if audio not uploaded', async () => {
      const mockSession = {
        id: 1,
        userId: 1,
        sessionId: 'test-session-id',
        wavPath: null, // No audio uploaded
        startedAt: Date.now(),
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockSession),
          }),
        }),
      });

      const endHandler = (await import('../../pages/api/call/end')).default;

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'test-session-id',
        },
      });

      await endHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('audio');
    });
  });
});
