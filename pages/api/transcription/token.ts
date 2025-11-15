/**
 * API endpoint to get single-use token for ElevenLabs Scribe WebSocket connection
 * This allows browser to connect directly to Scribe API for real-time transcription
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TOKEN] Failed to get token: ${response.status} ${errorText}`);
      return res.status(response.status).json({ 
        error: 'Failed to get token',
        details: errorText 
      });
    }

    const data = await response.json();
    return res.status(200).json({ token: data.token });
  } catch (error) {
    console.error('[TOKEN] Error getting token:', error);
    return res.status(500).json({
      error: 'Failed to get token',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

