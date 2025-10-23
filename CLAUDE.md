# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Orator AI** is a production-ready Next.js 14 application for AI-powered voice challenges with authentication, credit-based payments, and AI feedback. Users register, purchase credits, take voice challenges via WebRTC, and receive AI-generated performance analysis from ElevenLabs.

## Technology Stack

- **Framework**: Next.js 14 (App Router, Server Components, Server Actions)
- **Language**: TypeScript (strict mode)
- **Database**: SQLite via Drizzle ORM (better-sqlite3 driver)
- **Auth**: NextAuth v4.24 with JWT and Drizzle adapter
- **Payments**: Stripe and Paddle webhooks
- **Styling**: Tailwind CSS + shadcn/ui components
- **Audio**: WebRTC adapter, ElevenLabs TTS/LLM integration
- **Testing**: Jest with ts-jest

## Common Commands

```bash
# Development
npm run dev          # Start dev server on localhost:3000
npm run build        # Build production bundle
npm start            # Start production server
npm run lint         # Run ESLint
npm test             # Run Jest tests

# Database (Drizzle)
npx drizzle-kit generate:sqlite  # Generate migrations from schema
npx drizzle-kit push:sqlite      # Push schema changes to database
npx drizzle-kit studio           # Open Drizzle Studio (DB GUI)

# Docker
docker-compose up --build        # Build and run production container
```

## Architecture & Key Patterns

### Directory Structure

```
/app                 # Next.js App Router pages (client/server components)
/components          # Reusable UI components
/pages/api           # API routes (all backend logic)
/drizzle             # Database schema and connection
  ├── schema.ts      # Table definitions (users, sessions, challenges, payments, callHistory)
  └── db.ts          # SQLite connection instance
/lib                 # Shared utilities and auth configuration
/storage             # Local file storage (SQLite DB + WAV recordings)
```

### Database Schema

Five main tables:
- **users**: Authentication (email/password) and credit balance
- **sessions**: Active/completed call sessions with audio file paths
- **challenges**: Predefined voice challenge templates
- **payments**: Transaction history for credit purchases
- **callHistory**: AI feedback and performance metrics per call

All timestamps use `integer` with `mode: 'timestamp'`. Foreign keys link users to their sessions, payments, and call history.

### Call Flow Architecture

1. **Start Call**: `/api/call/start` deducts 1 credit, creates session with UUID, returns sessionId
2. **Live Call**: `/call` page displays audio visualizer, records via WebRTC, streams to ElevenLabs
3. **End Call**: `/api/call/end` saves WAV to `/storage/sessions/`, marks session complete, generates AI feedback
4. **Results**: `/result` page displays clarity score, filler words, tone, confidence, and highlights from callHistory

### Authentication Flow

- NextAuth configured in `/lib/auth/options.ts` with CredentialsProvider
- Passwords hashed with bcryptjs
- JWT sessions stored client-side
- Protected routes use `getServerSession()` server-side
- Drizzle adapter handles session persistence

### Payment Integration

- **Stripe**: Creates checkout sessions, webhook at `/api/payments/stripe` updates credits
- **Paddle**: Alternative payment provider via SDK
- **Generic**: Custom payment provider support
- All transactions logged in `payments` table with provider, amount, and credits received

## Important Implementation Details

### Server Components vs Client Components

- Most pages in `/app` are Server Components by default (can use `getServerSession` directly)
- Client-interactive components (forms, buttons, audio UI) marked with `'use client'`
- Server Actions enabled in `next.config.js` for form submissions

### Database Access Pattern

```typescript
import { db } from '@/drizzle/db';
import { users, sessions } from '@/drizzle/schema';

// Always use Drizzle ORM, never raw SQL
const user = await db.select().from(users).where(eq(users.email, email));
```

### File Storage

- WAV recordings stored at `/storage/sessions/{sessionId}.wav`
- SQLite database at `/storage/orator.sqlite`
- Both mounted as Docker volumes for persistence

### Environment Variables Required

See `.env.example` for complete list. Key variables:
- `NEXTAUTH_SECRET`: JWT signing key
- `NEXTAUTH_URL`: Application base URL
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`: Stripe integration
- `PADDLE_*`: Paddle payment credentials
- `ELEVENLABS_API_KEY`: AI voice/feedback integration

## Testing

- Test files use `.test.ts` or `.spec.ts` suffix
- Jest configured with ts-jest for TypeScript support
- Test environment: Node.js (not jsdom)
- Run single test: `npm test -- path/to/file.test.ts`

## Deployment

### Docker (Production)

Multi-stage Dockerfile builds optimized production image:
1. `deps` stage installs dependencies
2. `builder` stage runs `next build`
3. `runner` stage uses Node 20 Alpine with minimal footprint

Uses `docker-compose.yml` for local/production deployment with volume mounts for `/storage`.

### Railway

- Connect GitHub repo to Railway
- Set environment variables from `.env.example`
- Deploy automatically on push to main branch
- Ensure `/storage` directory persists between deployments

## Common Gotchas

- **Schema changes**: After modifying `/drizzle/schema.ts`, run `npx drizzle-kit push:sqlite` to update database
- **NextAuth sessions**: Must wrap app with `SessionProvider` (already in `/app/layout.tsx`)
- **API routes**: Use Next.js API routes in `/pages/api`, NOT App Router route handlers
- **Credit system**: Always check user credits before starting call session, atomic deduction in transaction
- **Timestamps**: Drizzle stores as Unix milliseconds, convert with `new Date(timestamp)` when needed

## Code Style

- TypeScript strict mode enabled
- ESLint with Next.js config for linting
- Tailwind utility classes for styling (avoid custom CSS)
- Async/await preferred over .then() chains
- Error handling with try/catch in API routes, return appropriate HTTP status codes
