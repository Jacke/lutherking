/**
 * API endpoint to get available transcription models
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { TranscriptionServiceFactory } from '@/lib/transcription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const availableModels = TranscriptionServiceFactory.getAvailableModels();
    const defaultModel = process.env.TRANSCRIPTION_MODEL || 'whisper';

    const modelsInfo = [
      {
        id: 'whisper',
        name: 'OpenAI Whisper',
        description: 'High-quality transcription from OpenAI',
        available: TranscriptionServiceFactory.isModelAvailable('whisper'),
        supportsStreaming: false,
        features: ['Multilingual', 'Word-level timestamps', 'High accuracy'],
      },
      {
        id: 'scribe',
        name: 'ElevenLabs Scribe v2',
        description: 'Real-time transcription with ultra-low latency',
        available: TranscriptionServiceFactory.isModelAvailable('scribe'),
        supportsStreaming: true,
        features: ['Real-time', 'Low latency', 'WebSocket streaming'],
      },
    ];

    return res.status(200).json({
      models: modelsInfo,
      availableModels,
      defaultModel,
    });
  } catch (error) {
    console.error('Error getting transcription models:', error);
    return res.status(500).json({
      error: 'Failed to get transcription models',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
