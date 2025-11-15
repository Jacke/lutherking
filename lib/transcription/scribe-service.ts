/**
 * ElevenLabs Scribe v2 Real-time Transcription Service
 */

import fs from 'fs';
import WebSocket from 'ws';
import type { TranscriptionService, TranscriptionResult } from './types';
import { convertToPCM } from '../audio/converter';

interface ScribeWord {
  text: string;
  start: number;
  end: number;
}

interface ScribeMessage {
  message_type: 'session_started' | 'partial_transcript' | 'committed_transcript' | 'committed_transcript_with_timestamps' | 'error';
  transcript?: string;
  words?: ScribeWord[];
  error?: {
    type: string;
    message: string;
  };
}

export class ScribeTranscriptionService implements TranscriptionService {
  private apiKey: string;
  public readonly supportsStreaming = true;
  public readonly modelName = 'scribe' as const;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Transcribe audio file using ElevenLabs Scribe v2
   * This method reads the file and streams it to the WebSocket
   *
   * Automatically converts WebM/WAV/MP3 files to PCM 16kHz format if needed.
   */
  async transcribe(audioPath: string): Promise<TranscriptionResult> {
    // Check file format and convert if necessary
    const ext = audioPath.toLowerCase().split('.').pop();
    let pcmPath = audioPath;

    if (ext !== 'pcm' && ext !== 'raw') {
      console.log(`[Scribe] Audio file is ${ext} format, converting to PCM 16kHz...`);
      try {
        pcmPath = await convertToPCM(audioPath);
        console.log(`[Scribe] Conversion successful: ${pcmPath}`);
      } catch (error) {
        const errorMsg = `Failed to convert ${ext} to PCM format: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[Scribe] ${errorMsg}`);
        throw new Error(errorMsg);
      }
    }

    return new Promise(async (resolve, reject) => {
      try {
        // Generate single-use token
        console.log('[Scribe] Requesting single-use token...');
        const token = await this.getSingleUseToken();
        console.log('[Scribe] Token received:', token.substring(0, 10) + '...');

        // Connect to WebSocket
        const wsUrl = `wss://api.elevenlabs.io/v1/speech-to-text/realtime?audio_format=pcm_16000`;
        console.log('[Scribe] Connecting to WebSocket:', wsUrl);
        const ws = new WebSocket(wsUrl, {
          headers: {
            'xi-api-key': token,
          },
        });
        console.log('[Scribe] WebSocket created, waiting for connection...');

        let fullTranscript = '';
        let allWords: ScribeWord[] = [];
        let sessionStarted = false;

        ws.on('open', async () => {
          console.log('Scribe WebSocket connected');

          // Read audio file and send in chunks
          try {
            await this.streamAudioFile(ws, pcmPath);

            // Send final commit signal
            ws.send(JSON.stringify({
              message_type: 'input_audio_chunk',
              audio_base_64: '',
              commit: true,
              sample_rate: 16000
            }));
          } catch (error) {
            console.error('Error streaming audio:', error);
            ws.close();
            reject(error);
          }
        });

        ws.on('message', (data: WebSocket.Data) => {
          try {
            const message: ScribeMessage = JSON.parse(data.toString());

            switch (message.message_type) {
              case 'session_started':
                sessionStarted = true;
                console.log('Scribe session started');
                break;

              case 'partial_transcript':
                // Ignore partial transcripts for file processing
                break;

              case 'committed_transcript':
                if (message.transcript) {
                  fullTranscript += (fullTranscript ? ' ' : '') + message.transcript;
                }
                break;

              case 'committed_transcript_with_timestamps':
                if (message.transcript) {
                  fullTranscript += (fullTranscript ? ' ' : '') + message.transcript;
                }
                if (message.words) {
                  allWords = allWords.concat(message.words);
                }
                break;

              case 'error':
                console.error('Scribe error:', message.error);
                ws.close();
                reject(new Error(message.error?.message || 'Scribe transcription error'));
                break;
            }
          } catch (error) {
            console.error('Error parsing Scribe message:', error);
          }
        });

        ws.on('close', () => {
          console.log('Scribe WebSocket closed');

          if (fullTranscript) {
            resolve({
              text: fullTranscript.trim(),
              words: allWords.map(w => ({
                word: w.text,
                start: w.start,
                end: w.end,
              })),
            });
          } else {
            reject(new Error('No transcription received from Scribe'));
          }
        });

        ws.on('error', (error: any) => {
          console.error('[Scribe] WebSocket error:', error);
          console.error('[Scribe] Error details:', {
            message: error.message,
            code: error.code,
            type: error.type,
          });
          reject(new Error(`WebSocket connection error: ${error.message || 'Unknown error'}`));
        });

        // Timeout after 5 minutes
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
            reject(new Error('Transcription timeout'));
          }
        }, 5 * 60 * 1000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get single-use token for WebSocket authentication
   */
  private async getSingleUseToken(): Promise<string> {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Scribe] Token request failed:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(`Failed to get token (${response.status}): ${response.statusText}. ${errorText}`);
      }

      const data = await response.json();
      if (!data.token) {
        throw new Error('No token in response');
      }
      return data.token;
    } catch (error) {
      console.error('[Scribe] Error getting single-use token:', error);
      throw new Error(`Failed to authenticate with ElevenLabs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream audio file to WebSocket in chunks
   * 
   * ⚠️ CRITICAL: Scribe API requires PCM 16kHz format!
   * This method assumes the file is already in PCM format (checked in transcribe method).
   */
  private async streamAudioFile(ws: WebSocket, audioPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(audioPath, {
        highWaterMark: 4096, // 4KB chunks
      });

      stream.on('data', (chunk: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          // Convert to base64
          const base64Audio = chunk.toString('base64');

          ws.send(JSON.stringify({
            message_type: 'input_audio_chunk',
            audio_base_64: base64Audio,
            commit: false,
            sample_rate: 16000,
          }));
        }
      });

      stream.on('end', () => {
        console.log('Audio file streaming completed');
        resolve();
      });

      stream.on('error', (error) => {
        console.error('Error reading audio file:', error);
        reject(error);
      });
    });
  }
}
