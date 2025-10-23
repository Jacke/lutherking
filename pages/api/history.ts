import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { db } from '../../drizzle/db';
import { users, callHistory, challenges } from '../../drizzle/schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const user = await db.select().from(users).where(users.email.eq(session.user.email)).get();
  if (!user) return res.status(404).json({ error: 'User not found' });
  const history = await db
    .select()
    .from(callHistory)
    .where(callHistory.userId.eq(user.id))
    .orderBy(callHistory.startedAt.desc())
    .all();
  // Optionally join with challenges for title
  for (const h of history) {
    if (h.challengeId) {
      const challenge = await db.select().from(challenges).where(challenges.id.eq(h.challengeId)).get();
      h.challengeTitle = challenge?.title || '';
    }
  }
  res.status(200).json(history);
} 