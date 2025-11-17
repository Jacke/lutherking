/**
 * Direct test of Scribe transcription (bypassing Next.js)
 */

import { ScribeTranscriptionService } from './lib/transcription/scribe-service.ts';
import { convertToPCM } from './lib/audio/converter.ts';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDirect() {
  console.log('🧪 Testing Scribe Transcription (Direct)...\n');

  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error('❌ Error: ELEVENLABS_API_KEY not found in environment variables!');
    console.log('\n💡 Please set it in your .env file:');
    console.log('   ELEVENLABS_API_KEY=sk_your_api_key_here\n');
    process.exit(1);
  }

  const webmFile = './storage/sessions/18c5a86e-8bb9-4fab-a78f-1579807b702c.webm';

  try {
    // Step 1: Convert WebM to PCM
    console.log('Step 1: Converting WebM to PCM...');
    const pcmFile = await convertToPCM(webmFile);
    console.log('✅ Conversion complete:', pcmFile);

    const stats = fs.statSync(pcmFile);
    console.log('PCM file size:', Math.round(stats.size / 1024), 'KB\n');

    // Step 2: Test Scribe transcription
    console.log('Step 2: Testing Scribe API...');
    const service = new ScribeTranscriptionService(apiKey);

    const result = await service.transcribe(webmFile);

    console.log('\n✅ SUCCESS!\n');
    console.log('Transcript:', result.text);
    console.log('Words:', result.words?.length || 0);

  } catch (err) {
    console.error('\n❌ FAILED:', err.message);
    console.error('\nStack:', err.stack);
    process.exit(1);
  }
}

testDirect();
