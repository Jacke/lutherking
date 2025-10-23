import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '../../../drizzle/db';
import { users, sessions } from '../../../drizzle/schema';
import { randomUUID } from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).end();
  const { challengeId } = req.body;
  if (!challengeId) return res.status(400).json({ error: 'Missing challengeId' });
  const user = await db.select().from(users).where(users.email.eq(session.user.email)).get();
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.credits < 1) return res.status(400).json({ error: 'Insufficient credits' });
  const newCredits = user.credits - 1;
  await db.update(users).set({ credits: newCredits }).where(users.id.eq(user.id)).run();
  const sessionId = randomUUID();
  await db.insert(sessions).values({ userId: user.id, sessionId, startedAt: Date.now() }).run();
  return res.status(200).json({ sessionId });
} 