/**
 * Test server-side Scribe transcription through the ScribeTranscriptionService
 */
const path = require('path');

// Load environment variables
require('dotenv').config();

// Dynamically import the TypeScript service using ts-node
async function testScribeService() {
  console.log('\n🧪 Testing ScribeTranscriptionService\n');

  try {
    // Use dynamic import with ts-node/register
    require('ts-node/register');
    const { ScribeTranscriptionService } = require('./lib/transcription/scribe-service.ts');

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY not found in environment variables! Please set it in your .env file.');
    }

    const service = new ScribeTranscriptionService(apiKey);

    const audioPath = './storage/sessions/18c5a86e-8bb9-4fab-a78f-1579807b702c.webm';
    
    console.log('📁 Testing with WebM file:', audioPath);
    console.log('🔄 Service will auto-convert to PCM...\n');

    const result = await service.transcribe(audioPath);

    console.log('\n' + '='.repeat(60));
    console.log('✅ TRANSCRIPTION SUCCESS!\n');
    console.log('📝 Transcript:', result.text);
    console.log('📊 Word count:', result.words?.length || 0);
    if (result.words && result.words.length > 0) {
      console.log('🔤 First few words:', result.words.slice(0, 5).map(w => w.word).join(' '));
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testScribeService();
