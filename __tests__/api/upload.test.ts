/**
 * Tests for audio upload endpoint
 * /api/call/upload
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import fs from 'fs';
import path from 'path';

// Mock formidable
jest.mock('formidable', () => {
  return {
    IncomingForm: jest.fn().mockImplementation(() => ({
      parse: jest.fn((req, callback) => {
        // Mock successful file upload
        callback(null,
          { sessionId: 'test-session-id' }, // fields
          {
            audio: {
              filepath: '/tmp/mock-file.webm',
              originalFilename: 'recording.webm',
            }
          } // files
        );
      }),
    })),
    File: jest.fn(),
  };
});

// Mock database
const mockDb = {
  select: jest.fn(),
  update: jest.fn(),
};

jest.mock('../../drizzle/db', () => ({
  db: mockDb,
}));

// Mock fs
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  renameSync: jest.fn(),
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('Upload API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/call/upload', () => {
    it('should upload audio file successfully', async () => {
      // Mock session exists
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              id: 1,
              sessionId: 'test-session-id',
              userId: 1,
            }),
          }),
        }),
      });

      // Mock update success
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            run: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      const uploadHandler = (await import('../../pages/api/call/upload')).default;

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'multipart/form-data',
        },
      });

      await uploadHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('sessionId', 'test-session-id');
      expect(mockFs.renameSync).toHaveBeenCalled();
    });

    it('should reject if sessionId is missing', async () => {
      // Mock formidable to return missing sessionId
      const { IncomingForm } = await import('formidable');
      (IncomingForm as jest.Mock).mockImplementationOnce(() => ({
        parse: jest.fn((req, callback) => {
          callback(null,
            { sessionId: null }, // Missing sessionId
            { audio: { filepath: '/tmp/test.webm' } }
          );
        }),
      }));

      const uploadHandler = (await import('../../pages/api/call/upload')).default;

      const { req, res } = createMocks({
        method: 'POST',
      });

      await uploadHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('sessionId');
    });

    it('should reject if audio file is missing', async () => {
      // Mock formidable to return missing audio
      const { IncomingForm } = await import('formidable');
      (IncomingForm as jest.Mock).mockImplementationOnce(() => ({
        parse: jest.fn((req, callback) => {
          callback(null,
            { sessionId: 'test-session-id' },
            { audio: null } // Missing audio
          );
        }),
      }));

      const uploadHandler = (await import('../../pages/api/call/upload')).default;

      const { req, res } = createMocks({
        method: 'POST',
      });

      await uploadHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('audio');
    });

    it('should reject if session not found', async () => {
      // Mock session not exists
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(null), // Session not found
          }),
        }),
      });

      const uploadHandler = (await import('../../pages/api/call/upload')).default;

      const { req, res } = createMocks({
        method: 'POST',
      });

      await uploadHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Session not found');
    });

    it('should reject invalid HTTP method', async () => {
      const uploadHandler = (await import('../../pages/api/call/upload')).default;

      const { req, res } = createMocks({
        method: 'GET',
      });

      await uploadHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });

    it('should handle file system errors', async () => {
      // Mock session exists
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              id: 1,
              sessionId: 'test-session-id',
            }),
          }),
        }),
      });

      // Mock fs.renameSync to throw error
      mockFs.renameSync.mockImplementationOnce(() => {
        throw new Error('File system error');
      });

      const uploadHandler = (await import('../../pages/api/call/upload')).default;

      const { req, res } = createMocks({
        method: 'POST',
      });

      await uploadHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Failed to upload');
    });
  });
});
