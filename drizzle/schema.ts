import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  credits: integer('credits').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  sessionId: text('session_id').notNull().unique(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  wavPath: text('wav_path'),
  feedbackId: integer('feedback_id'),
  transcriptionModel: text('transcription_model').default('whisper'), // 'whisper' or 'scribe'
});

export const challenges = sqliteTable('challenges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  provider: text('provider').notNull(),
  amount: integer('amount').notNull(),
  credits: integer('credits').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const callHistory = sqliteTable('call_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  sessionId: text('session_id').notNull(),
  challengeId: integer('challenge_id').notNull().references(() => challenges.id),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  clarityScore: integer('clarity_score'),
  fillerWords: text('filler_words'),
  tone: text('tone'),
  confidence: integer('confidence'),
  highlights: text('highlights'),
  feedback: text('feedback'),
  transcript: text('transcript'), // Full transcription text
  transcriptionModel: text('transcription_model'), // Model used for transcription
});

export const telemetry = sqliteTable('telemetry', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  level: text('level').notNull(), // 'info' | 'warn' | 'error'
  category: text('category').notNull(), // 'api' | 'user' | 'system' | 'external'
  action: text('action').notNull(),

  // Context
  userId: integer('user_id').references(() => users.id),
  sessionId: text('session_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  // Metadata (stored as JSON)
  metadata: text('metadata'), // JSON string

  // Performance
  duration: integer('duration'), // milliseconds

  // Error tracking
  error: text('error'),
  errorStack: text('error_stack'),
}); 