import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../drizzle/db';
import { sessions, callHistory } from '../../../drizzle/schema';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
  const session = await db.select().from(sessions).where(sessions.sessionId.eq(sessionId)).get();
  if (!session) return res.status(404).json({ error: 'Session not found' });

  // Placeholder: Save .wav file (simulate)
  const wavPath = path.join('storage', 'sessions', `${sessionId}.wav`);
  fs.writeFileSync(wavPath, Buffer.from('FAKE_WAV_DATA'));
  await db.update(sessions).set({ endedAt: Date.now(), wavPath }).where(sessions.id.eq(session.id)).run();

  // Call external /api/eval (simulate)
  const evalRes = await fetch('http://localhost:3000/api/eval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, wavPath }),
  });
  const feedback = evalRes.ok ? await evalRes.json() : null;

  // Store feedback in callHistory
  if (feedback) {
    await db.insert(callHistory).values({
      userId: session.userId,
      sessionId,
      challengeId: session.challengeId || 1,
      startedAt: session.startedAt,
      endedAt: Date.now(),
      clarityScore: feedback.clarity_score,
      fillerWords: feedback.filler_words,
      tone: feedback.tone,
      confidence: feedback.confidence,
      highlights: JSON.stringify(feedback.highlights),
      feedback: feedback.text,
    }).run();
  }

  res.status(200).json({ success: true });
} 