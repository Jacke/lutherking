/**
 * Transcription service types and interfaces
 */

export type TranscriptionModel = 'whisper' | 'scribe';

export interface TranscriptionResult {
  text: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  language?: string;
  duration?: number;
}

export interface TranscriptionService {
  transcribe(audioPath: string): Promise<TranscriptionResult>;
  transcribeStream?(audioStream: ReadableStream): Promise<TranscriptionResult>;
  supportsStreaming: boolean;
  modelName: TranscriptionModel;
}

export interface TranscriptionConfig {
  model: TranscriptionModel;
  language?: string;
  apiKey: string;
}
