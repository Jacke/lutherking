import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../drizzle/db';
import { users, payments } from '../../../drizzle/schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, amount } = req.body;
  if (!email || !amount) return res.status(400).json({ error: 'Missing fields' });
  const credits = Math.floor(Number(amount));
  const user = await db.select().from(users).where(users.email.eq(email)).get();
  if (user) {
    await db.update(users).set({ credits: user.credits + credits }).where(users.id.eq(user.id)).run();
    await db.insert(payments).values({ userId: user.id, provider: 'paddle', amount, credits }).run();
  }
  res.status(200).json({ received: true });
} 