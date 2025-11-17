/**
 * Test ElevenLabs Scribe v2 Real-time Transcription
 *
 * This script supports TWO MODES:
 *
 * MODE 1: File-based transcription (original)
 *   - node test-scribe-realtime.js [path-to-pcm-file]
 *
 * MODE 2: Real-time microphone transcription (NEW!)
 *   - node test-scribe-realtime.js --mic
 *   - npm install mic (required)
 *   - Uses system microphone for live transcription
 */

const fs = require('fs');
const WebSocket = require('ws');
const readline = require('readline');

// Load environment variables
require('dotenv').config();

// Configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const AUDIO_FILE = './storage/sessions/18c5a86e-8bb9-4fab-a78f-1579807b702c.webm';

// Validate API key
if (!ELEVENLABS_API_KEY) {
  console.error('❌ Error: ELEVENLABS_API_KEY not found in environment variables!');
  console.log('\n💡 Please set it in your .env file:');
  console.log('   ELEVENLABS_API_KEY=sk_your_api_key_here\n');
  process.exit(1);
}

// Check if running in microphone mode
const USE_MICROPHONE = process.argv.includes('--mic') || process.argv.includes('-m');

/**
 * Test microphone transcription in real-time
 */
async function testMicrophoneRealtime() {
  console.log('\n🎤 Testing ElevenLabs Scribe v2 with MICROPHONE\n');
  console.log('🔴 Press Ctrl+C to stop recording\n');

  let mic;
  try {
    // Dynamically require mic module
    mic = require('mic');
  } catch (err) {
    console.error('❌ The "mic" module is not installed!');
    console.log('\n💡 Install it with:');
    console.log('   npm install mic\n');
    console.log('📦 Also ensure you have audio dependencies:');
    console.log('   macOS: brew install sox');
    console.log('   Linux: sudo apt-get install sox libsox-fmt-all');
    console.log('   Windows: Download and install SoX from https://sourceforge.net/projects/sox/\n');
    process.exit(1);
  }

  try {
    // Setup microphone
    const micInstance = mic({
      rate: '16000',
      channels: '1',
      debug: false,
      exitOnSilence: 0,
      fileType: 'raw',
      encoding: 'signed-integer',
      bitwidth: '16',
    });

    const micInputStream = micInstance.getAudioStream();

    // Connect to Scribe WebSocket
    const wsUrl = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&include_timestamps=true&audio_format=pcm_16000&language_code=ru';
    console.log('[Mic] 🔌 Connecting to Scribe WebSocket...');

    const ws = new WebSocket(wsUrl, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    let fullTranscript = '';
    let isRecording = false;

    // Setup readline for keyboard input
    function setupKeyboardControls() {
      readline.emitKeypressEvents(process.stdin);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }

      process.stdin.on('keypress', (_str, key) => {
        if (key.ctrl && key.name === 'c') {
          // Ctrl+C - exit
          console.log('\n\n[Mic] 🛑 Stopping recording...');
          cleanup();
        } else if (key.name === 'q' || key.name === 'escape') {
          // Q or ESC - stop and show results
          console.log('\n\n[Mic] ⏹️  Finishing session...');
          cleanup();
        } else if (key.name === 'return' || key.name === 'enter') {
          // Enter - commit current audio and continue
          console.log('\n[Mic] 📌 Committing current phrase...');
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              message_type: 'input_audio_chunk',
              audio_base_64: '',
              commit: true,
              sample_rate: 16000,
            }));
          }
        }
      });
    }

    // Handle WebSocket events
    ws.on('open', () => {
      console.log('[Mic] ✅ WebSocket connected!\n');
      console.log('🎙️  Starting microphone...\n');

      micInstance.start();
      isRecording = true;

      console.log('┌──────────────────────────────────────────────────────┐');
      console.log('│  🔴 RECORDING - Speak into your microphone          │');
      console.log('│                                                      │');
      console.log('│  Controls:                                           │');
      console.log('│    Enter - Commit current phrase                     │');
      console.log('│    Q/ESC - Stop recording & show results             │');
      console.log('│  Ctrl+C  - Force exit                                │');
      console.log('└──────────────────────────────────────────────────────┘\n');

      // Enable keyboard controls
      setupKeyboardControls();
    });

    let lastPartialText = '';
    let hasPartialLine = false;

    let messagesReceived = 0;

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        messagesReceived++;

        // Debug: log all message types
        if (process.env.DEBUG_WS) {
          console.log(`\n[DEBUG] Message #${messagesReceived}:`, message.message_type);
        }

        switch (message.message_type) {
          case 'session_started':
            console.log('[Mic] 🎬 Transcription session started!\n');
            break;

          case 'partial_transcript':
            if (message.text && message.text !== lastPartialText) {
              lastPartialText = message.text;
              // Clear line and show partial transcript (max 80 chars)
              const displayText = message.text.length > 180
                ? '...' + message.text.slice(-77)
                : message.text;
              process.stdout.write('\r\x1b[K'); // Clear line
              process.stdout.write('💬 ' + displayText);
              hasPartialLine = true;
            }
            break;

          case 'committed_transcript':
          case 'committed_transcript_with_timestamps':
            if (message.text) {
              // Clear partial line if exists
              if (hasPartialLine) {
                process.stdout.write('\r\x1b[K'); // Clear line
                hasPartialLine = false;
              }

              // Print committed transcript on new line
              console.log('✅ ' + message.text);
              fullTranscript += (fullTranscript ? ' ' : '') + message.text;
              lastPartialText = ''; // Reset partial text
            }
            break;

          case 'error':
          case 'auth_error':
            console.error('\n❌ Scribe error:', message);
            cleanup();
            break;

          default:
            // Log unknown message types
            console.log(`\n[Mic] ⚠️ Unknown message type: ${message.message_type}`);
        }
      } catch (err) {
        console.error('\n[Mic] Error parsing message:', err);
      }
    });

    ws.on('close', () => {
      console.log('\n\n[Mic] 🔌 WebSocket closed');
      cleanup();
    });

    ws.on('error', (error) => {
      console.error('\n[Mic] ❌ WebSocket error:', error.message);
      cleanup();
    });

    // Stream microphone audio to Scribe
    let chunkCount = 0;
    micInputStream.on('data', (chunk) => {
      if (ws.readyState === WebSocket.OPEN && isRecording) {
        chunkCount++;

        // Convert to base64
        const base64Audio = chunk.toString('base64');

        // Send to Scribe
        ws.send(JSON.stringify({
          message_type: 'input_audio_chunk',
          audio_base_64: base64Audio,
          commit: false,
          sample_rate: 16000,
        }));
      }
    });

    micInputStream.on('error', (err) => {
      console.error('\n[Mic] ❌ Microphone error:', err);
      console.log('\n💡 Troubleshooting:');
      console.log('   - Check if microphone is connected');
      console.log('   - Grant microphone permissions');
      console.log('   - Verify SoX is installed (required by mic module)');
      cleanup();
    });

    // Cleanup function
    function cleanup() {
      // Clear partial line if exists
      if (hasPartialLine) {
        process.stdout.write('\r\x1b[K');
      }

      if (isRecording) {
        isRecording = false;
        console.log('\n[Mic] ⏹️  Stopping microphone...');
        micInstance.stop();
      }

      // Restore terminal settings
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();

      if (ws.readyState === WebSocket.OPEN) {
        console.log('[Mic] 📤 Sending final commit...');
        // Send final commit
        ws.send(JSON.stringify({
          message_type: 'input_audio_chunk',
          audio_base_64: '',
          commit: true,
          sample_rate: 16000,
        }));

        // Wait a bit for final transcription
        setTimeout(() => {
          ws.close();
          showResults();
        }, 1000);
      } else {
        showResults();
      }
    }

    function showResults() {
      console.log('\n' + '='.repeat(60));
      console.log('📝 FULL TRANSCRIPT:\n');

      if (fullTranscript) {
        console.log(fullTranscript);
        console.log('\n📊 Stats:');
        console.log('   - Characters:', fullTranscript.length);
        console.log('   - Words:', fullTranscript.split(' ').filter(w => w).length);
        console.log('   - Chunks sent:', chunkCount);
        console.log('   - Messages received:', messagesReceived);
      } else {
        console.log('(No transcription received)');
        console.log('\n🔍 Debug info:');
        console.log('   - Chunks sent:', chunkCount);
        console.log('   - Messages received:', messagesReceived);
        console.log('   - Last partial text:', lastPartialText || '(none)');
        console.log('\n💡 Possible reasons:');
        console.log('   1. No speech detected (microphone might not be working)');
        console.log('   2. Audio was too quiet or too short');
        console.log('   3. No permission to access microphone');
        console.log('   4. SoX audio backend issue');
        console.log('\n🔧 Troubleshooting:');
        console.log('   - Check microphone permissions');
        console.log('   - Try speaking louder');
        console.log('   - Verify SoX is installed: sox --version');
        console.log('   - Test with file mode: node test-scribe-realtime.js ./path/to/file.pcm');
      }

      console.log('='.repeat(60) + '\n');

      setTimeout(() => process.exit(0), 500);
    }

  } catch (error) {
    console.error('\n❌ Microphone test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

async function testScribeRealtime(pcmFilePath) {
  console.log('\n🧪 Testing ElevenLabs Scribe v2 Real-time Transcription\n');
  console.log('📁 Audio file:', pcmFilePath);

  // Check if file exists
  if (!fs.existsSync(pcmFilePath)) {
    console.error('❌ PCM file not found!');
    console.log('\n💡 First convert WebM to PCM:');
    console.log('   ffmpeg -i ' + AUDIO_FILE + ' -ar 16000 -ac 1 -f s16le output.pcm');
    process.exit(1);
  }

  const fileStats = fs.statSync(pcmFilePath);
  console.log('📊 File size:', Math.round(fileStats.size / 1024), 'KB');
  console.log('⏱️  Estimated duration:', Math.round(fileStats.size / 32000), 'seconds\n');

  try {
    // Try DIRECT API key with HEADERS (for Node.js ws library)
    console.log('[Test] 🔑 Using direct API key in headers...');
    const apiKey = ELEVENLABS_API_KEY;

    // Step 2: Connect to Scribe WebSocket
    // For Node.js 'ws' library, use headers (NOT query parameter!)
    // Hardcoded Russian language support
    const wsUrl = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&include_timestamps=true&audio_format=pcm_16000&language_code=ru';
    console.log('[Test] 🔌 Connecting to Scribe WebSocket...');
    console.log('[Test] URL:', wsUrl);
    console.log('[Test] Language Code: Russian (ru)');
    console.log('[Test] Auth: xi-api-key header');

    const ws = new WebSocket(wsUrl, {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    let fullTranscript = '';
    let partialTranscript = '';
    let wordCount = 0;
    let sessionStarted = false;

    // Handle WebSocket events
    ws.on('open', async () => {
      console.log('[Test] ✅ WebSocket connected!\n');
      console.log('📤 Streaming audio chunks...\n');

      // Stream audio file in chunks
      const readStream = fs.createReadStream(pcmFilePath, {
        highWaterMark: 4096, // 4KB chunks (0.125 seconds at 16kHz)
      });

      let chunkCount = 0;

      readStream.on('data', (chunk) => {
        if (ws.readyState === WebSocket.OPEN) {
          chunkCount++;

          // Convert to base64
          const base64Audio = chunk.toString('base64');

          // Send to Scribe
          ws.send(JSON.stringify({
            message_type: 'input_audio_chunk',
            audio_base_64: base64Audio,
            commit: false,
            sample_rate: 16000,
          }));

          // Progress indicator
          if (chunkCount % 10 === 0) {
            process.stdout.write('.');
          }
        }
      });

      readStream.on('end', () => {
        console.log('\n\n[Test] 📤 All chunks sent, sending final commit...');

        // Send final commit signal
        ws.send(JSON.stringify({
          message_type: 'input_audio_chunk',
          audio_base_64: '',
          commit: true,
          sample_rate: 16000,
        }));

        console.log('[Test] ⏳ Waiting for final transcription...\n');
      });

      readStream.on('error', (err) => {
        console.error('[Test] ❌ Error reading file:', err);
        ws.close();
      });
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        // LOG ALL MESSAGES FOR DEBUGGING
        console.log('\n[DEBUG] Received message:', JSON.stringify(message, null, 2));

        switch (message.message_type) {
          case 'session_started':
            sessionStarted = true;
            console.log('[Test] 🎬 Session started!');
            break;

          case 'partial_transcript':
            // API returns "text" not "transcript"
            if (message.text) {
              partialTranscript = message.text;
              process.stdout.write('\r[Partial] ' + partialTranscript.substring(0, 60) + '...');
            }
            break;

          case 'committed_transcript':
            // API returns "text" not "transcript"
            if (message.text) {
              fullTranscript += (fullTranscript ? ' ' : '') + message.text;
              console.log('\n[Committed] ' + message.text);
            }
            break;

          case 'committed_transcript_with_timestamps':
            // API returns "text" not "transcript"
            if (message.text) {
              fullTranscript += (fullTranscript ? ' ' : '') + message.text;
              console.log('\n[Committed+Time] ' + message.text);
            }
            if (message.words) {
              wordCount += message.words.length;
            }
            break;

          case 'error':
          case 'auth_error':
            console.error('\n[Test] ❌ Scribe error:', JSON.stringify(message, null, 2));
            ws.close();
            break;

          default:
            console.log('[Test] ⚠️  Unknown message type:', message.message_type);
            console.log('[Test] Full message:', JSON.stringify(message, null, 2));
        }
      } catch (err) {
        console.error('[Test] Error parsing message:', err);
        console.error('[Test] Raw data:', data.toString());
      }
    });

    ws.on('close', () => {
      console.log('\n\n[Test] 🔌 WebSocket closed');

      if (fullTranscript) {
        console.log('\n' + '='.repeat(60));
        console.log('✅ TRANSCRIPTION SUCCESS!\n');
        console.log('📝 Full transcript:');
        console.log(fullTranscript);
        console.log('\n📊 Stats:');
        console.log('   - Characters:', fullTranscript.length);
        console.log('   - Words:', wordCount || fullTranscript.split(' ').length);
        console.log('='.repeat(60) + '\n');
      } else {
        console.log('\n⚠️  No transcription received');
      }
    });

    ws.on('error', (error) => {
      console.error('\n[Test] ❌ WebSocket error:', error.message);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        type: error.type,
      });
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log('\n[Test] ⏱️  Timeout reached, closing connection...');
        ws.close();
      }
    }, 2 * 60 * 1000);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Main execution
if (USE_MICROPHONE) {
  // MODE 2: Real-time microphone transcription
  testMicrophoneRealtime();
} else {
  // MODE 1: File-based transcription
  const pcmFile = process.argv[2] || './storage/sessions/18c5a86e-8bb9-4fab-a78f-1579807b702c.pcm';

  // Check if we need to convert first
  if (pcmFile.endsWith('.pcm') && !fs.existsSync(pcmFile)) {
    const webmFile = pcmFile.replace('.pcm', '.webm');

    if (fs.existsSync(webmFile)) {
      console.log('⚠️  PCM file not found, but WebM exists');
      console.log('💡 Run this first to convert:');
      console.log('   ffmpeg -i ' + webmFile + ' -ar 16000 -ac 1 -f s16le ' + pcmFile);
      console.log('\nOr use the converter:');
      console.log('   node -e "require(\'./lib/audio/converter.ts\').convertToPCM(\'' + webmFile + '\').then(console.log)"');
      process.exit(1);
    }
  }

  testScribeRealtime(pcmFile);
}
