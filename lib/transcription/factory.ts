/**
 * Transcription Service Factory
 */

import type { TranscriptionService, TranscriptionModel } from './types';
import { WhisperTranscriptionService } from './whisper-service';
import { ScribeTranscriptionService } from './scribe-service';

export class TranscriptionServiceFactory {
  /**
   * Create transcription service based on model type
   */
  static create(model: TranscriptionModel): TranscriptionService {
    switch (model) {
      case 'whisper': {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY is not configured');
        }
        return new WhisperTranscriptionService(apiKey);
      }

      case 'scribe': {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          throw new Error('ELEVENLABS_API_KEY is not configured');
        }
        return new ScribeTranscriptionService(apiKey);
      }

      default:
        throw new Error(`Unknown transcription model: ${model}`);
    }
  }

  /**
   * Get default transcription service based on environment
   */
  static createDefault(): TranscriptionService {
    const model = (process.env.TRANSCRIPTION_MODEL || 'whisper') as TranscriptionModel;
    return this.create(model);
  }

  /**
   * Check if a model is available (API key is configured)
   */
  static isModelAvailable(model: TranscriptionModel): boolean {
    switch (model) {
      case 'whisper':
        return !!process.env.OPENAI_API_KEY;
      case 'scribe':
        return !!process.env.ELEVENLABS_API_KEY;
      default:
        return false;
    }
  }

  /**
   * Get list of available models
   */
  static getAvailableModels(): TranscriptionModel[] {
    const models: TranscriptionModel[] = [];

    if (this.isModelAvailable('whisper')) {
      models.push('whisper');
    }

    if (this.isModelAvailable('scribe')) {
      models.push('scribe');
    }

    return models;
  }
}
