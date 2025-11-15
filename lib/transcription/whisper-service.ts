/**
 * OpenAI Whisper Transcription Service
 */

import fs from 'fs';
import OpenAI from 'openai';
import type { TranscriptionService, TranscriptionResult } from './types';

export class WhisperTranscriptionService implements TranscriptionService {
  private client: OpenAI;
  public readonly supportsStreaming = false;
  public readonly modelName = 'whisper' as const;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(audioPath: string): Promise<TranscriptionResult> {
    try {
      const audioFile = fs.createReadStream(audioPath);

      // Try with word-level timestamps first, fallback to simple format if not supported
      let transcription: any;
      try {
        transcription = await this.client.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          language: 'ru',
          response_format: 'verbose_json',
          timestamp_granularities: ['word'],
        });
      } catch (timestampError) {
        // Fallback if timestamp_granularities is not supported
        console.warn('Word-level timestamps not supported, using simple format');
        const audioFileRetry = fs.createReadStream(audioPath);
        transcription = await this.client.audio.transcriptions.create({
          file: audioFileRetry,
          model: 'whisper-1',
          language: 'ru',
          response_format: 'verbose_json',
        });
      }

      // Extract word-level timestamps if available
      const words = transcription.words?.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
      }));

      return {
        text: transcription.text || '',
        words,
        language: transcription.language,
        duration: transcription.duration,
      };
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw new Error(
        `Whisper transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
