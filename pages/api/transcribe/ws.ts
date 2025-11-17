/**
 * WebSocket Proxy for ElevenLabs Scribe v2 Real-time Transcription
 *
 * This endpoint proxies WebSocket connections from the client to ElevenLabs Scribe API.
 * Benefits:
 * - Keeps API key secure on server
 * - Single upstream connection per client
 * - Can add logging, rate limiting, etc.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';
import WebSocket from 'ws';
import { logger, createTimer } from '../../../lib/telemetry/logger';

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: NetSocket & {
    server: HTTPServer & {
      wss?: WebSocket.Server;
    };
  };
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  // Only allow WebSocket upgrade
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Check if WebSocket server is already running
  if (!res.socket.server.wss) {
    console.log('[WS] Creating WebSocket server...');
    const wss = new WebSocket.Server({ noServer: true });
    res.socket.server.wss = wss;

    // Handle upgrade requests
    res.socket.server.on('upgrade', (request, socket, head) => {
      const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

      if (pathname === '/api/transcribe/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    // Handle WebSocket connections
    wss.on('connection', async (clientWs, request) => {
      const wsTimer = createTimer();
      console.log('[WS] Client connected');

      // Extract sessionId from query parameters
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const sessionId = url.searchParams.get('sessionId');

      if (!sessionId) {
        console.error('[WS] No sessionId provided');
        clientWs.close(1008, 'Missing sessionId');
        return;
      }

      console.log(`[WS] Session: ${sessionId}`);

      let elevenLabsWs: WebSocket | null = null;

      try {
        // Get ElevenLabs API key from environment
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          throw new Error('ELEVENLABS_API_KEY not configured');
        }

        // Get single-use token from ElevenLabs
        console.log('[WS] Requesting ElevenLabs token...');
        const tokenResponse = await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
        });

        if (!tokenResponse.ok) {
          throw new Error(`Failed to get token: ${tokenResponse.status}`);
        }

        const { token } = await tokenResponse.json();
        console.log('[WS] Token received');

        // Connect to ElevenLabs Scribe WebSocket
        // Hardcoded Russian language support
        const elevenLabsUrl = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime?audio_format=pcm_16000&language_code=ru';
        elevenLabsWs = new WebSocket(elevenLabsUrl, {
          headers: {
            'xi-api-key': token,
          },
        });

        // Forward messages from ElevenLabs to client
        elevenLabsWs.on('message', (data) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data);
          }
        });

        // Forward messages from client to ElevenLabs
        clientWs.on('message', (data) => {
          if (elevenLabsWs && elevenLabsWs.readyState === WebSocket.OPEN) {
            elevenLabsWs.send(data);
          }
        });

        // Handle ElevenLabs connection events
        elevenLabsWs.on('open', async () => {
          console.log('[WS] Connected to ElevenLabs');

          // Log WebSocket connection telemetry
          await logger.logSystem('websocket_connected', {
            operation: 'websocket',
          }, {
            sessionId,
          });
        });

        elevenLabsWs.on('error', (error) => {
          console.error('[WS] ElevenLabs error:', error);
          clientWs.close(1011, 'Upstream connection error');
        });

        elevenLabsWs.on('close', () => {
          console.log('[WS] ElevenLabs connection closed');
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close();
          }
        });

        // Handle client disconnection
        clientWs.on('close', async () => {
          console.log('[WS] Client disconnected');

          // Log WebSocket disconnection telemetry
          await logger.logSystem('websocket_disconnected', {
            operation: 'websocket',
          }, {
            sessionId,
            duration: wsTimer.end(),
          });

          if (elevenLabsWs && elevenLabsWs.readyState === WebSocket.OPEN) {
            elevenLabsWs.close();
          }
        });

        clientWs.on('error', (error) => {
          console.error('[WS] Client error:', error);
          if (elevenLabsWs && elevenLabsWs.readyState === WebSocket.OPEN) {
            elevenLabsWs.close();
          }
        });

      } catch (error) {
        console.error('[WS] Setup error:', error);
        clientWs.close(1011, error instanceof Error ? error.message : 'Setup failed');
        if (elevenLabsWs) {
          elevenLabsWs.close();
        }
      }
    });

    console.log('[WS] WebSocket server initialized');
  }

  // For regular HTTP requests, return success
  res.status(200).json({ status: 'WebSocket server running' });
}
