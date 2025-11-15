/**
 * Test Scribe transcription with the fixed implementation
 */

async function testScribe() {
  console.log('🧪 Testing Scribe Transcription API...\n');

  const sessionId = '8e006aea-f28a-44ed-bc47-6d37185ad582';
  const wavPath = '/Users/stan/Dev/_PROJ/ORATOR/storage/sessions/8e006aea-f28a-44ed-bc47-6d37185ad582.webm';

  try {
    const response = await fetch('http://localhost:3001/api/eval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        wavPath,
      }),
    });

    console.log('Response status:', response.status);

    const data = await response.json();

    if (response.ok) {
      console.log('\n✅ SUCCESS! Transcription completed!\n');
      console.log('Transcript:', data.transcript);
      console.log('\nClarity Score:', data.clarity_score);
      console.log('Confidence:', data.confidence);
      console.log('Tone:', data.tone);
      console.log('Filler Words:', data.filler_words);
      console.log('Duration:', data.duration, 'seconds');
    } else {
      console.log('\n❌ FAILED!\n');
      console.log('Error:', data.error);
      console.log('Details:', data.details);
    }
  } catch (err) {
    console.error('\n❌ Request failed:', err.message);
  }
}

testScribe();
