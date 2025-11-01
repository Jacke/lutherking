import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../drizzle/db';
import { users } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    // Check if user already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password and create user
    const hash = await bcrypt.hash(password, 10);
    await db.insert(users).values({
      email,
      password: hash,
      credits: 0, // Start with 0 credits
    }).run();

    return res.status(200).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: 'Failed to register user',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 