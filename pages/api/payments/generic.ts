import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../drizzle/db';
import { users, payments } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, amount, provider } = req.body;
  if (!email || !amount || !provider) return res.status(400).json({ error: 'Missing fields' });
  const credits = Math.floor(Number(amount));
  const user = await db.select().from(users).where(eq(users.email, email)).get();
  if (user) {
    await db.update(users).set({ credits: user.credits + credits }).where(eq(users.id, user.id)).run();
    await db.insert(payments).values({ userId: user.id, provider, amount, credits }).run();
  }
  res.status(200).json({ received: true });
} 