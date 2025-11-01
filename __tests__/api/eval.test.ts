/**
 * Tests for eval endpoint
 * /api/eval
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import fs from 'fs';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      audio: {
        transcriptions: {
          create: jest.fn().mockResolvedValue({
            text: 'Тестовая транскрипция речи с некоторыми словами-паразитами типа эм и ну.',
          }),
        },
      },
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  clarity_score: 75,
                  filler_words: 'эм (2 раза), ну (1 раз)',
                  tone: 'confident',
                  confidence: 80,
                  highlights: ['Хорошая структура', 'Четкое произношение', 'Слишком много пауз'],
                  text: 'Ваша речь демонстрирует хорошую структуру и уверенность.',
                }),
              },
            }],
          }),
        },
      },
    })),
  };
});

// Mock database
jest.mock('../../drizzle/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
  },
}));

// Mock fs
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  createReadStream: jest.fn(),
  statSync: jest.fn(),
}));

import { db } from '../../drizzle/db';

const mockDb = db as any;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Eval API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/eval', () => {
    it('should evaluate audio and return AI analysis', async () => {
      const mockSession = {
        id: 1,
        userId: 1,
        sessionId: 'test-session-id',
        wavPath: '/storage/sessions/test.webm',
        startedAt: Date.now() - 30000, // 30 seconds ago
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockSession),
          }),
        }),
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          run: jest.fn().mockResolvedValue(undefined),
        }),
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.createReadStream.mockReturnValue({} as any);
      mockFs.statSync.mockReturnValue({
        size: 100000, // 100KB
      } as any);

      const evalHandler = (await import('../../pages/api/eval')).default;

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'test-session-id',
          wavPath: '/storage/sessions/test.webm',
        },
      });

      await evalHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());

      expect(data).toHaveProperty('clarity_score');
      expect(data).toHaveProperty('filler_words');
      expect(data).toHaveProperty('tone');
      expect(data).toHaveProperty('confidence');
      expect(data).toHaveProperty('highlights');
      expect(data).toHaveProperty('text');
      expect(data).toHaveProperty('transcript');
      expect(data).toHaveProperty('duration');

      expect(typeof data.clarity_score).toBe('number');
      expect(data.clarity_score).toBeGreaterThanOrEqual(0);
      expect(data.clarity_score).toBeLessThanOrEqual(100);
    });

    it('should reject if sessionId is missing', async () => {
      const evalHandler = (await import('../../pages/api/eval')).default;

      const { req, res } = createMocks({
        method: 'POST',
        body: {},
      });

      await evalHandler(req, res);

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

      const evalHandler = (await import('../../pages/api/eval')).default;

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'non-existent-id',
        },
      });

      await evalHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });

    it('should reject if audio file does not exist', async () => {
      const mockSession = {
        id: 1,
        userId: 1,
        sessionId: 'test-session-id',
        wavPath: '/storage/sessions/missing.webm',
        startedAt: Date.now(),
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockSession),
          }),
        }),
      });

      mockFs.existsSync.mockReturnValue(false);

      const evalHandler = (await import('../../pages/api/eval')).default;

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'test-session-id',
        },
      });

      await evalHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Audio file');
    });

    it('should reject invalid HTTP method', async () => {
      const evalHandler = (await import('../../pages/api/eval')).default;

      const { req, res } = createMocks({
        method: 'GET',
      });

      await evalHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });

    it('should handle OpenAI API errors gracefully', async () => {
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

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          run: jest.fn().mockResolvedValue(undefined),
        }),
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.createReadStream.mockReturnValue({} as any);
      mockFs.statSync.mockReturnValue({
        size: 100000,
      } as any);

      // Mock OpenAI to throw error
      const OpenAI = (await import('openai')).default;
      const openaiInstance = new OpenAI();
      (openaiInstance.audio.transcriptions.create as jest.Mock).mockRejectedValueOnce(
        new Error('OpenAI API error')
      );

      const evalHandler = (await import('../../pages/api/eval')).default;

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'test-session-id',
        },
      });

      await evalHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
    });
  });
});
