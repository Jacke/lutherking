import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../drizzle/db';
import { challenges } from '../../drizzle/schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { id } = req.query;
    if (id) {
      const challenge = await db.select().from(challenges).where(challenges.id.eq(Number(id))).get();
      if (!challenge) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(challenge);
    } else {
      const all = await db.select().from(challenges).all();
      return res.status(200).json(all);
    }
  } else {
    res.status(405).end();
  }
} 