import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  credits: integer('credits').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(() => Date.now()),
});

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  sessionId: text('session_id').notNull().unique(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(() => Date.now()),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  wavPath: text('wav_path'),
  feedbackId: integer('feedback_id'),
});

export const challenges = sqliteTable('challenges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(() => Date.now()),
});

export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  provider: text('provider').notNull(),
  amount: integer('amount').notNull(),
  credits: integer('credits').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(() => Date.now()),
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
}); 