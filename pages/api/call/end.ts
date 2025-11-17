import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../drizzle/db';
import { sessions } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { logger, createTimer } from '../../../lib/telemetry/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const timer = createTimer();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, realtimeTranscript } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  if (realtimeTranscript) {
    console.log(`[END] Received real-time transcript (${realtimeTranscript.length} chars) - will skip re-transcription`);
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
      .set({ endedAt: new Date() })
      .where(eq(sessions.id, session.id))
      .run();

    console.log(`[END] Session ${sessionId} ended, starting evaluation...`);
    console.log(`[END] Audio file path: ${session.wavPath}`);

    // Call /api/eval to analyze the audio
    // Note: We're calling our own API internally
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const evalUrl = `${baseUrl}/api/eval`;
    console.log(`[END] Calling eval API: ${evalUrl}`);

    try {
      const evalRes = await fetch(evalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          wavPath: session.wavPath,
          // Pass real-time transcript if available (Scribe model)
          ...(realtimeTranscript && { realtimeTranscript })
        }),
      });

      console.log(`[END] Eval API response status: ${evalRes.status}`);

      if (!evalRes.ok) {
        const errorData = await evalRes.json().catch(() => ({ error: 'Failed to parse error response' }));
        console.error(`[END] Eval API error (${evalRes.status}):`, errorData);
        throw new Error(errorData.error || `Failed to evaluate audio (status: ${evalRes.status})`);
      }

      const feedback = await evalRes.json();
      console.log(`[END] Evaluation completed successfully for session ${sessionId}`);
      console.log(`[END] Feedback preview: clarity=${feedback.clarity_score}, confidence=${feedback.confidence}`);

      // Log telemetry
      await logger.logAPI('call_end', {
        method: req.method,
        path: '/api/call/end',
        statusCode: 200,
      }, {
        userId: session.userId,
        sessionId,
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        duration: timer.end(),
      });

      await logger.logUser('call_end', {
        event: 'call_end',
        transcriptionModel: session.transcriptionModel || undefined,
      }, {
        userId: session.userId,
        sessionId,
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });

      return res.status(200).json({
        success: true,
        feedback
      });
    } catch (evalError) {
      console.error(`[END] ERROR calling eval API for session ${sessionId}:`, evalError);
      console.error(`[END] Error details:`, evalError instanceof Error ? evalError.stack : 'No stack trace');

      // Log warning telemetry
      await logger.logAPI('call_end', {
        method: req.method,
        path: '/api/call/end',
        statusCode: 200,
      }, {
        level: 'warn',
        userId: session.userId,
        sessionId,
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        duration: timer.end(),
        error: 'Evaluation failed but session saved',
      });

      // Return success even if eval fails - user can see session in history
      return res.status(200).json({
        success: true,
        warning: 'Session saved but analysis failed. Please try again later.'
      });
    }
  } catch (error) {
    console.error('End call error:', error);

    // Log error telemetry
    await logger.logAPI('call_end', {
      method: req.method,
      path: '/api/call/end',
      statusCode: 500,
    }, {
      level: 'error',
      duration: timer.end(),
      error: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    return res.status(500).json({
      error: 'Failed to end call',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 