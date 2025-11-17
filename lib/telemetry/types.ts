/**
 * Telemetry Types
 *
 * Comprehensive event tracking for the ORATOR application
 */

export type TelemetryLevel = 'info' | 'warn' | 'error';

export type TelemetryCategory =
  | 'api'        // API endpoint calls
  | 'user'       // User actions
  | 'system'     // System operations
  | 'external';  // External API calls (OpenAI, ElevenLabs)

export interface TelemetryEvent {
  // Core fields
  timestamp: Date;
  level: TelemetryLevel;
  category: TelemetryCategory;
  action: string;

  // Context
  userId?: number;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;

  // Metadata (flexible JSON)
  metadata?: Record<string, any>;

  // Performance
  duration?: number;  // milliseconds

  // Error tracking
  error?: string;
  errorStack?: string;
}

// Specific event metadata types for type safety

export interface APIEventMetadata {
  method: string;
  path: string;
  statusCode?: number;
  requestBody?: any;
  responseBody?: any;
}

export interface UserEventMetadata {
  event: 'call_start' | 'call_end' | 'credit_purchase' | 'model_select' | 'view_results';
  challengeId?: number;
  transcriptionModel?: string;
  credits?: number;
}

export interface SystemEventMetadata {
  operation: 'transcription' | 'analysis' | 'conversion' | 'websocket';
  model?: string;
  fileSize?: number;
  audioFormat?: string;
  transcriptLength?: number;
}

export interface ExternalEventMetadata {
  service: 'openai' | 'elevenlabs';
  endpoint: string;
  tokens?: number;
  cost?: number;
  model?: string;
}
