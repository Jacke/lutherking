/**
 * Admin Telemetry API
 *
 * Query and view telemetry events
 *
 * Endpoints:
 * - GET /api/admin/telemetry - Get telemetry events with filters
 * - DELETE /api/admin/telemetry/cleanup - Trigger cleanup of old events
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../drizzle/db';
import { telemetry } from '../../../drizzle/schema';
import { desc, eq, and, gte, lte, like } from 'drizzle-orm';
import { logger } from '../../../lib/telemetry/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // TODO: Add authentication check here for admin users
  // For now, this endpoint is open (should be protected in production)

  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'DELETE' && req.query.action === 'cleanup') {
    return handleCleanup(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET /api/admin/telemetry
 *
 * Query parameters:
 * - level: Filter by level (info, warn, error)
 * - category: Filter by category (api, user, system, external)
 * - userId: Filter by user ID
 * - sessionId: Filter by session ID
 * - action: Filter by action (partial match)
 * - startDate: Filter events after this date (ISO string)
 * - endDate: Filter events before this date (ISO string)
 * - limit: Number of results (default: 100, max: 1000)
 * - offset: Pagination offset (default: 0)
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      level,
      category,
      userId,
      sessionId,
      action,
      startDate,
      endDate,
      limit = '100',
      offset = '0',
    } = req.query;

    // Build filters
    const filters: any[] = [];

    if (level) {
      filters.push(eq(telemetry.level, level as string));
    }

    if (category) {
      filters.push(eq(telemetry.category, category as string));
    }

    if (userId) {
      filters.push(eq(telemetry.userId, parseInt(userId as string)));
    }

    if (sessionId) {
      filters.push(eq(telemetry.sessionId, sessionId as string));
    }

    if (action) {
      filters.push(like(telemetry.action, `%${action}%`));
    }

    if (startDate) {
      const start = new Date(startDate as string);
      filters.push(gte(telemetry.timestamp, start));
    }

    if (endDate) {
      const end = new Date(endDate as string);
      filters.push(lte(telemetry.timestamp, end));
    }

    // Parse pagination
    const limitNum = Math.min(parseInt(limit as string), 1000);
    const offsetNum = parseInt(offset as string);

    // Query telemetry
    let query = db
      .select()
      .from(telemetry)
      .orderBy(desc(telemetry.timestamp))
      .limit(limitNum)
      .offset(offsetNum);

    if (filters.length > 0) {
      query = query.where(and(...filters)) as any;
    }

    const events = await query.all();

    // Get total count (without pagination)
    let countQuery = db
      .select({ count: telemetry.id })
      .from(telemetry);

    if (filters.length > 0) {
      countQuery = countQuery.where(and(...filters)) as any;
    }

    const countResult = await countQuery.all();
    const total = countResult.length;

    // Parse metadata JSON strings
    const parsedEvents = events.map((event) => ({
      ...event,
      metadata: event.metadata ? JSON.parse(event.metadata) : null,
    }));

    return res.status(200).json({
      events: parsedEvents,
      total,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('[Telemetry API] Error querying telemetry:', error);
    return res.status(500).json({
      error: 'Failed to query telemetry',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * DELETE /api/admin/telemetry?action=cleanup
 *
 * Trigger cleanup of old telemetry events (90-day retention)
 */
async function handleCleanup(req: NextApiRequest, res: NextApiResponse) {
  try {
    const deletedCount = await logger.cleanup();

    return res.status(200).json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} old telemetry events`,
    });
  } catch (error) {
    console.error('[Telemetry API] Error cleaning up telemetry:', error);
    return res.status(500).json({
      error: 'Failed to cleanup telemetry',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
