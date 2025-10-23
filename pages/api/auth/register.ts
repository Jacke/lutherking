import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../drizzle/db';
import { users } from '../../../drizzle/schema';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  const existing = await db.select().from(users).where(users.email.eq(email)).get();
  if (existing) return res.status(409).json({ error: 'User already exists' });

  const hash = await bcrypt.hash(password, 10);
  await db.insert(users).values({ email, password: hash }).run();
  return res.status(201).json({ success: true });
} 