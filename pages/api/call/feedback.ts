import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../drizzle/db';
import { callHistory, sessions } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
  
  // Check if feedback exists
  const feedback = await db.select().from(callHistory).where(eq(callHistory.sessionId, sessionId as string)).get();
  if (feedback) {
    return res.status(200).json(feedback);
  }
  
  // If no feedback, check session status to provide more context
  const session = await db.select().from(sessions).where(eq(sessions.sessionId, sessionId as string)).get();
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // Check if session has ended and audio exists
  const hasEnded = !!session.endedAt;
  const hasAudio = !!session.wavPath && fs.existsSync(session.wavPath);
  
  if (!hasEnded) {
    return res.status(404).json({ 
      error: 'Session not ended yet',
      status: 'recording'
    });
  }
  
  if (!hasAudio) {
    return res.status(404).json({ 
      error: 'Audio file not found',
      status: 'no_audio',
      canRetry: false
    });
  }
  
  // Session ended and audio exists, but no feedback - evaluation might have failed
  return res.status(404).json({ 
    error: 'Feedback not found',
    status: 'evaluation_failed',
    canRetry: true,
    sessionId: session.sessionId
  });
} 