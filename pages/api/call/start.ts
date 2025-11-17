import type { NextApiRequest, NextApiResponse } from 'next';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '../../../lib/auth/options';
import { getMockUser } from '../../../lib/auth/mock';
import { db } from '../../../drizzle/db';
import { users, sessions } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { logger, createTimer } from '../../../lib/telemetry/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const timer = createTimer();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // MOCK AUTH - TODO: Re-enable real auth when ready
  // const session = await getServerSession(req, res, authOptions);
  // if (!session?.user?.email) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  const { challengeId, transcriptionModel } = req.body;

  if (!challengeId) {
    return res.status(400).json({ error: 'Missing challengeId' });
  }

  // Validate transcription model if provided
  const model = transcriptionModel || process.env.TRANSCRIPTION_MODEL || 'whisper';
  if (!['whisper', 'scribe'].includes(model)) {
    return res.status(400).json({ error: 'Invalid transcription model' });
  }

  try {
    // MOCK AUTH - Get mock user
    const user = await getMockUser();

    // Original auth code (commented out):
    // const user = await db
    //   .select()
    //   .from(users)
    //   .where(eq(users.email, session.user.email))
    //   .get();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check credits
    if (user.credits < 1) {
      return res.status(400).json({ error: 'Insufficient credits. Please purchase more credits.' });
    }

    // Deduct 1 credit
    const newCredits = user.credits - 1;
    await db
      .update(users)
      .set({ credits: newCredits })
      .where(eq(users.id, user.id))
      .run();

    // Create new session
    const sessionId = randomUUID();
    await db.insert(sessions).values({
      userId: user.id,
      sessionId,
      startedAt: new Date(),
      transcriptionModel: model,
    }).run();

    console.log(`Call session started: ${sessionId} for user ${user.id}, credits remaining: ${newCredits}`);

    // Log telemetry
    await logger.logAPI('call_start', {
      method: req.method,
      path: '/api/call/start',
      statusCode: 200,
      requestBody: { challengeId, transcriptionModel: model },
    }, {
      userId: user.id,
      sessionId,
      ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      duration: timer.end(),
    });

    await logger.logUser('call_start', {
      event: 'call_start',
      challengeId,
      transcriptionModel: model,
      credits: newCredits,
    }, {
      userId: user.id,
      sessionId,
      ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    return res.status(200).json({
      sessionId,
      creditsRemaining: newCredits,
    });
  } catch (error) {
    console.error('Start call error:', error);

    // Log error telemetry
    await logger.logAPI('call_start', {
      method: req.method,
      path: '/api/call/start',
      statusCode: 500,
    }, {
      level: 'error',
      duration: timer.end(),
      error: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    return res.status(500).json({
      error: 'Failed to start call',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 