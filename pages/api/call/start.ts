import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '../../../drizzle/db';
import { users, sessions } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { challengeId } = req.body;

  if (!challengeId) {
    return res.status(400).json({ error: 'Missing challengeId' });
  }

  try {
    // Get user from database
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .get();

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
      startedAt: Date.now(),
    }).run();

    console.log(`Call session started: ${sessionId} for user ${user.id}, credits remaining: ${newCredits}`);

    return res.status(200).json({
      sessionId,
      creditsRemaining: newCredits,
    });
  } catch (error) {
    console.error('Start call error:', error);
    return res.status(500).json({
      error: 'Failed to start call',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 