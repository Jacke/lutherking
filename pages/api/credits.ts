import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { db } from '../../drizzle/db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const user = await db.select().from(users).where(eq(users.email, session.user.email)).get();
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (req.method === 'GET') {
    return res.status(200).json({ credits: user.credits });
  } else if (req.method === 'POST') {
    const { delta } = req.body; // positive to add, negative to deduct
    if (typeof delta !== 'number') return res.status(400).json({ error: 'Invalid delta' });
    const newCredits = user.credits + delta;
    if (newCredits < 0) return res.status(400).json({ error: 'Insufficient credits' });
    await db.update(users).set({ credits: newCredits }).where(eq(users.id, user.id)).run();
    return res.status(200).json({ credits: newCredits });
  } else {
    return res.status(405).end();
  }
} 