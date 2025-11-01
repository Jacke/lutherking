import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../drizzle/db';
import { sessions } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  try {
    // Get session from database
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .get();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if audio file was uploaded
    if (!session.wavPath) {
      return res.status(400).json({ error: 'Audio file not uploaded yet' });
    }

    // Update session end time
    await db
      .update(sessions)
      .set({ endedAt: Date.now() })
      .where(eq(sessions.id, session.id))
      .run();

    console.log(`Session ${sessionId} ended, starting evaluation...`);

    // Call /api/eval to analyze the audio
    // Note: We're calling our own API internally
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    try {
      const evalRes = await fetch(`${baseUrl}/api/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          wavPath: session.wavPath
        }),
      });

      if (!evalRes.ok) {
        const errorData = await evalRes.json();
        console.error('Eval API error:', errorData);
        throw new Error(errorData.error || 'Failed to evaluate audio');
      }

      const feedback = await evalRes.json();
      console.log(`Evaluation completed for session ${sessionId}`);

      return res.status(200).json({
        success: true,
        feedback
      });
    } catch (evalError) {
      console.error('Error calling eval API:', evalError);

      // Return success even if eval fails - user can see session in history
      return res.status(200).json({
        success: true,
        warning: 'Session saved but analysis failed. Please try again later.'
      });
    }
  } catch (error) {
    console.error('End call error:', error);
    return res.status(500).json({
      error: 'Failed to end call',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 