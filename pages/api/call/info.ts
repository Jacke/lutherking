/**
 * API endpoint to get session information
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../drizzle/db';
import { sessions } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.query;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  try {
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .get();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.status(200).json({
      sessionId: session.sessionId,
      transcriptionModel: session.transcriptionModel || 'whisper',
      userId: session.userId,
      startedAt: session.startedAt,
    });
  } catch (error) {
    console.error('Error fetching session info:', error);
    return res.status(500).json({
      error: 'Failed to fetch session info',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

