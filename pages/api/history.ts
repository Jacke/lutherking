import type { NextApiRequest, NextApiResponse } from 'next';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '../../lib/auth/options';
import { getMockUser } from '../../lib/auth/mock';
import { db } from '../../drizzle/db';
import { users, callHistory, challenges } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // MOCK AUTH - TODO: Re-enable real auth when ready
  // const session = await getServerSession(req, res, authOptions);
  // if (!session) return res.status(401).json({ error: 'Unauthorized' });
  // const user = await db.select().from(users).where(eq(users.email, session.user.email)).get();

  const user = await getMockUser();
  if (!user) return res.status(404).json({ error: 'User not found' });
  const history = await db
    .select()
    .from(callHistory)
    .where(eq(callHistory.userId, user.id))
    .orderBy(callHistory.startedAt.desc())
    .all();
  // Optionally join with challenges for title
  for (const h of history) {
    if (h.challengeId) {
      const challenge = await db.select().from(challenges).where(eq(challenges.id, h.challengeId)).get();
      h.challengeTitle = challenge?.title || '';
    }
  }
  res.status(200).json(history);
} 