import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../drizzle/db';
import { callHistory } from '../../../drizzle/schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
  const feedback = await db.select().from(callHistory).where(callHistory.sessionId.eq(sessionId as string)).get();
  if (!feedback) return res.status(404).json({ error: 'Not found' });
  res.status(200).json(feedback);
} 