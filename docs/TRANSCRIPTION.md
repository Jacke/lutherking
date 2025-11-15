# Transcription Models Guide

Orator AI now supports multiple transcription models for converting speech to text. This guide explains how to use and configure different transcription providers.

## Available Models

### 1. OpenAI Whisper
- **Provider**: OpenAI
- **Model**: whisper-1
- **Features**:
  - Multilingual support (90+ languages)
  - High accuracy
  - Word-level timestamps
  - Robust to accents and background noise
- **Latency**: ~5-15 seconds for typical recordings
- **Cost**: ~$0.006 per minute
- **Configuration**: Requires `OPENAI_API_KEY`

### 2. ElevenLabs Scribe v2
- **Provider**: ElevenLabs
- **Model**: scribe_v2_realtime
- **Features**:
  - Real-time transcription
  - Ultra-low latency (milliseconds)
  - WebSocket streaming support
  - Word-level timestamps with high precision
- **Latency**: Real-time (partial transcripts available immediately)
- **Cost**: Check ElevenLabs pricing
- **Configuration**: Requires `ELEVENLABS_API_KEY`

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Choose default model: "whisper" or "scribe"
TRANSCRIPTION_MODEL=whisper

# OpenAI API Key (for Whisper)
OPENAI_API_KEY=sk-your-openai-api-key

# ElevenLabs API Key (for Scribe v2)
ELEVENLABS_API_KEY=your-elevenlabs-api-key
```

### Setting Default Model

The `TRANSCRIPTION_MODEL` environment variable determines the default model used when users don't specify a preference:

```bash
# Use OpenAI Whisper (default)
TRANSCRIPTION_MODEL=whisper

# Use ElevenLabs Scribe v2
TRANSCRIPTION_MODEL=scribe
```

## Usage

### User Interface

Users can select their preferred transcription model when starting a challenge:

1. Navigate to a challenge page
2. Select transcription model from the available options
3. Click "Start Call"
4. The selected model will be used for transcription

### API Usage

#### Starting a Call with Model Selection

```typescript
POST /api/call/start
Content-Type: application/json

{
  "challengeId": 1,
  "transcriptionModel": "scribe" // or "whisper"
}
```

#### Getting Available Models

```typescript
GET /api/transcription/models

Response:
{
  "models": [
    {
      "id": "whisper",
      "name": "OpenAI Whisper",
      "description": "High-quality transcription from OpenAI",
      "available": true,
      "supportsStreaming": false,
      "features": ["Multilingual", "Word-level timestamps", "High accuracy"]
    },
    {
      "id": "scribe",
      "name": "ElevenLabs Scribe v2",
      "description": "Real-time transcription with ultra-low latency",
      "available": true,
      "supportsStreaming": true,
      "features": ["Real-time", "Low latency", "WebSocket streaming"]
    }
  ],
  "availableModels": ["whisper", "scribe"],
  "defaultModel": "whisper"
}
```

## Architecture

### Service Layer

The transcription system uses a service factory pattern for flexibility:

```
lib/transcription/
├── types.ts                 # Type definitions
├── factory.ts               # Service factory
├── whisper-service.ts       # OpenAI Whisper implementation
├── scribe-service.ts        # ElevenLabs Scribe v2 implementation
└── index.ts                 # Module exports
```

### Database Schema

Transcription model tracking is stored in the database:

```typescript
// sessions table
{
  ...
  transcriptionModel: 'whisper' | 'scribe'  // Model used for this session
}

// callHistory table
{
  ...
  transcript: string                         // Full transcription text
  transcriptionModel: string                 // Model used
}
```

## Implementation Details

### OpenAI Whisper Service

```typescript
import { WhisperTranscriptionService } from '@/lib/transcription';

const service = new WhisperTranscriptionService(apiKey);
const result = await service.transcribe('/path/to/audio.wav');

console.log(result.text);        // Full transcript
console.log(result.words);       // Word-level timestamps
console.log(result.language);    // Detected language
```

### ElevenLabs Scribe v2 Service

```typescript
import { ScribeTranscriptionService } from '@/lib/transcription';

const service = new ScribeTranscriptionService(apiKey);
const result = await service.transcribe('/path/to/audio.wav');

console.log(result.text);        // Full transcript
console.log(result.words);       // Word-level timestamps with high precision
```

### Using the Factory

```typescript
import { TranscriptionServiceFactory } from '@/lib/transcription';

// Create service based on environment default
const service = TranscriptionServiceFactory.createDefault();

// Create specific service
const whisperService = TranscriptionServiceFactory.create('whisper');
const scribeService = TranscriptionServiceFactory.create('scribe');

// Check availability
const hasWhisper = TranscriptionServiceFactory.isModelAvailable('whisper');
const hasScribe = TranscriptionServiceFactory.isModelAvailable('scribe');

// Get all available models
const models = TranscriptionServiceFactory.getAvailableModels();
```

## Cost Optimization

### Choosing the Right Model

- **Whisper**: Best for:
  - High accuracy requirements
  - Multiple languages
  - Cost-sensitive applications
  - Batch processing

- **Scribe v2**: Best for:
  - Real-time applications
  - Low-latency requirements
  - Live transcription needs
  - Interactive experiences

### Recommendations

1. **Default Setup**: Use Whisper as default for reliability and cost
2. **Premium Feature**: Offer Scribe v2 as premium option for real-time features
3. **User Choice**: Let users select based on their preferences
4. **Monitoring**: Track usage and costs per model

## Troubleshooting

### Model Not Available

If a model shows as unavailable in the UI:
1. Check that the corresponding API key is set in `.env`
2. Verify the API key is valid
3. Restart the development server

### Transcription Fails

Common issues:
1. **Invalid API Key**: Check environment variables
2. **Audio Format**: Ensure audio is in supported format (WAV, MP3, etc.)
3. **File Size**: Large files may timeout
4. **Network Issues**: Check connectivity to API providers

### WebSocket Errors (Scribe v2)

If you encounter WebSocket errors:
1. Ensure `ws` package is installed: `npm install ws @types/ws`
2. Check firewall/proxy settings
3. Verify ElevenLabs API key has real-time access
4. Review logs for specific error messages

## Future Enhancements

Potential improvements:
- [ ] Add support for more transcription providers (Azure, Google, AWS)
- [ ] Implement real-time streaming UI for Scribe v2
- [ ] Add language selection in UI
- [ ] Support for custom vocabulary/training
- [ ] Transcription quality metrics
- [ ] A/B testing between models
- [ ] Cost tracking dashboard

## References

- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [ElevenLabs Scribe v2 Documentation](https://elevenlabs.io/docs/cookbooks/speech-to-text/streaming)
- [WebRTC Audio Recording](./WEBRTC_FLOW.md)
