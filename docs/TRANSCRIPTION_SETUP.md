# 🎙️ Transcription Models Setup Guide

Quick start guide for setting up transcription models in Orator AI.

## 🚀 Quick Setup

### Step 1: Choose Your Model(s)

You can use one or both transcription models:

| Model | Provider | Best For | Setup Time |
|-------|----------|----------|------------|
| **Whisper** | OpenAI | High accuracy, multilingual | 2 minutes |
| **Scribe v2** | ElevenLabs | Real-time, ultra-low latency | 2 minutes |

### Step 2: Get API Keys

#### Option A: OpenAI Whisper
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new API key
3. Copy the key (starts with `sk-`)

#### Option B: ElevenLabs Scribe v2
1. Go to [ElevenLabs](https://elevenlabs.io/)
2. Sign up/login
3. Navigate to Profile → API Keys
4. Create new API key
5. Copy the key

### Step 3: Configure Environment

Edit your `.env` file:

```bash
# OpenAI Whisper (recommended for most use cases)
OPENAI_API_KEY=sk-your-openai-key-here

# ElevenLabs Scribe v2 (optional, for real-time features)
ELEVENLABS_API_KEY=your-elevenlabs-key-here

# Set default model (whisper or scribe)
TRANSCRIPTION_MODEL=whisper
```

### Step 4: Install Dependencies

```bash
npm install
```

The `ws` package for WebSocket support (used by Scribe v2) is already included in `package.json`.

### Step 5: Update Database

```bash
npx drizzle-kit push
```

This adds the `transcriptionModel` field to your database tables.

### Step 6: Restart Server

```bash
npm run dev
```

## ✅ Verify Setup

1. Navigate to any challenge page
2. You should see the transcription model selector
3. Available models will have checkmarks
4. Unavailable models will show "API ключ не настроен"

## 🎨 User Interface

### Model Selection Card

Users see a beautiful card-based selector:

```
┌─────────────────────────────────────────────┐
│ Модель транскрипции                         │
├─────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐ │
│  │ OpenAI Whisper ✓ │  │ Scribe v2      ✓ │ │
│  │ [Real-time]      │  │ [Real-time]      │ │
│  │                  │  │                  │ │
│  │ High-quality     │  │ Ultra-low        │ │
│  │ transcription    │  │ latency          │ │
│  │                  │  │                  │ │
│  │ • Multilingual   │  │ • Real-time      │ │
│  │ • Word timestamps│  │ • Low latency    │ │
│  │ • High accuracy  │  │ • WebSocket      │ │
│  └──────────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────┘
```

### Features

- **Visual Selection**: Cards highlight when selected
- **Availability Status**: Shows which models are configured
- **Real-time Badge**: Indicates streaming capabilities
- **Feature Pills**: Lists key benefits of each model
- **Disabled State**: Grayed out with overlay for unconfigured models

## 🔧 Configuration Options

### Use Only Whisper

```bash
OPENAI_API_KEY=sk-your-key
TRANSCRIPTION_MODEL=whisper
# ELEVENLABS_API_KEY not needed
```

### Use Only Scribe v2

```bash
ELEVENLABS_API_KEY=your-key
TRANSCRIPTION_MODEL=scribe
# OPENAI_API_KEY not needed
```

### Use Both (Recommended)

```bash
OPENAI_API_KEY=sk-your-key
ELEVENLABS_API_KEY=your-key
TRANSCRIPTION_MODEL=whisper  # default for new users
```

## 📊 Model Comparison

| Feature | Whisper | Scribe v2 |
|---------|---------|-----------|
| **Accuracy** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Speed** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Languages** | 90+ | Limited |
| **Cost/min** | ~$0.006 | Varies |
| **Real-time** | ❌ | ✅ |
| **Streaming** | ❌ | ✅ |
| **Word Timestamps** | ✅ | ✅ |
| **Noise Handling** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## 💡 Recommendations

### For Most Users
- **Use Whisper as default** - Best accuracy and cost balance
- **Enable Scribe v2** - Let users choose for real-time needs

### For Real-time Applications
- **Use Scribe v2 as default** - Ultra-low latency
- **Keep Whisper available** - For batch processing

### For Cost Optimization
- **Whisper only** - Most cost-effective
- **Monitor usage** - Track transcription costs per model

## 🐛 Troubleshooting

### "API ключ не настроен"
**Problem**: Model shows as unavailable
**Solution**:
1. Check `.env` file has correct API key
2. Restart development server
3. Verify API key is valid on provider website

### Transcription Fails
**Problem**: Error during transcription
**Solution**:
1. Check API key permissions
2. Verify audio file exists
3. Check console logs for specific error
4. Ensure API credits/quota available

### WebSocket Connection Failed (Scribe v2)
**Problem**: Cannot connect to ElevenLabs
**Solution**:
1. Ensure `ws` package installed: `npm install ws`
2. Check firewall/proxy settings
3. Verify internet connection
4. Review ElevenLabs status page

### Model Not Saving
**Problem**: Selected model doesn't persist
**Solution**:
1. Run database migration: `npx drizzle-kit push`
2. Check database file permissions
3. Restart server

## 📚 Related Documentation

- [TRANSCRIPTION.md](./TRANSCRIPTION.md) - Detailed technical documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [WEBRTC_FLOW.md](./WEBRTC_FLOW.md) - Audio recording flow
- [CLAUDE.md](./CLAUDE.md) - Project overview

## 🎯 Next Steps

After setup:
1. Test both models with sample recordings
2. Compare results and choose default
3. Monitor transcription quality
4. Track costs per model
5. Gather user feedback

## 💬 Support

If you encounter issues:
1. Check this guide first
2. Review error logs in console
3. Verify API keys are valid
4. Check provider status pages
5. Open GitHub issue with details

---

**Ready to go?** Head to `/challenge/1` and try selecting a transcription model! 🚀
