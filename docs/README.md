# 📚 Orator AI Documentation

Welcome to the Orator AI documentation directory. All project documentation is organized here for easy access and maintenance.

## 📖 Table of Contents

### 🚀 Quick Start Guides
- **[SETUP.md](./SETUP.md)** - Complete project setup guide
- **[TRANSCRIPTION_SETUP.md](./TRANSCRIPTION_SETUP.md)** - Quick setup for transcription models (Whisper + Scribe v2)

### 🏗️ Architecture & Design
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete system architecture diagrams and data flows
- **[WEBRTC_FLOW.md](./WEBRTC_FLOW.md)** - Detailed explanation of WebRTC recording and transcription flow
- **[TRANSCRIPTION.md](./TRANSCRIPTION.md)** - Comprehensive transcription models documentation

### 🛠️ Development
- **[TODO.md](./TODO.md)** - Project roadmap and current tasks
- **[TESTING.md](./TESTING.md)** - Testing documentation and guidelines
- **[RUN_TESTS.md](./RUN_TESTS.md)** - How to run and interpret tests
- **[CLAUDE.md](./CLAUDE.md)** - AI assistant guidelines and project context
- **[AUTH_DISABLED.md](./AUTH_DISABLED.md)** - ⚠️ Authentication disabled (mock mode) - how to restore

### 📊 Status & Reports
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Current project status and metrics
- **[TEST_RESULTS.md](./TEST_RESULTS.md)** - Latest test results and coverage
- **[REMAINING_TASKS.md](./REMAINING_TASKS.md)** - Outstanding tasks and issues

### 📝 Feature Documentation
- **[TRANSCRIPTION_SUMMARY.md](./TRANSCRIPTION_SUMMARY.md)** - Complete overview of dual transcription system integration

### 🔗 Resources
- **[RESOURCES.md](./RESOURCES.md)** - AI tools, speech analysis resources, and useful links

## 🗂️ Documentation Structure

```
docs/
├── README.md                    # This file - documentation index
├── SETUP.md                     # Project setup
├── TRANSCRIPTION_SETUP.md       # Transcription setup
├── ARCHITECTURE.md              # System architecture
├── WEBRTC_FLOW.md              # Audio recording flow
├── TRANSCRIPTION.md            # Transcription details
├── TODO.md                     # Roadmap
├── TESTING.md                  # Testing guide
├── RUN_TESTS.md               # Test execution
├── CLAUDE.md                   # AI assistant guide
├── PROJECT_STATUS.md          # Project status
├── TEST_RESULTS.md            # Test results
├── REMAINING_TASKS.md         # Open tasks
├── TRANSCRIPTION_SUMMARY.md   # Feature summary
└── RESOURCES.md               # External resources
```

## 📋 Documentation Guidelines

When creating or updating documentation:

1. **Location**: All `.md` files (except root `README.md`) go in `/docs`
2. **Links**: Use relative paths from current location
3. **Organization**: Follow the category structure above
4. **Naming**: Use UPPERCASE for document names (e.g., `SETUP.md`)
5. **Index**: Update this README when adding new docs

## 🎯 Quick Navigation by Task

### I want to...

**Set up the project for the first time**
→ Start with [SETUP.md](./SETUP.md)

**Configure transcription models**
→ See [TRANSCRIPTION_SETUP.md](./TRANSCRIPTION_SETUP.md)

**Understand the architecture**
→ Read [ARCHITECTURE.md](./ARCHITECTURE.md)

**Learn about WebRTC recording**
→ Check [WEBRTC_FLOW.md](./WEBRTC_FLOW.md)

**Run tests**
→ Follow [RUN_TESTS.md](./RUN_TESTS.md)

**See what's planned**
→ View [TODO.md](./TODO.md)

**Check project status**
→ Look at [PROJECT_STATUS.md](./PROJECT_STATUS.md)

**Configure AI assistant**
→ Read [CLAUDE.md](./CLAUDE.md)

**Find external resources**
→ Browse [RESOURCES.md](./RESOURCES.md)

## 🌟 Recent Updates

### Latest Features (2024)
- ✅ **Dual Transcription System** - OpenAI Whisper + ElevenLabs Scribe v2
- ✅ **Beautiful Model Selector UI** - Modern card-based selection
- ✅ **Service Layer Architecture** - Extensible transcription framework
- ✅ **Enhanced Challenge Pages** - Gradient design with model selection
- ✅ **Complete Documentation** - Comprehensive guides for all features

See [TRANSCRIPTION_SUMMARY.md](./TRANSCRIPTION_SUMMARY.md) for details.

## 📞 Support

For questions or issues:
1. Check relevant documentation first
2. Review [TROUBLESHOOTING](./TRANSCRIPTION_SETUP.md#troubleshooting) section
3. Open GitHub issue with details

## 🤝 Contributing to Documentation

When adding new features:
1. Create corresponding documentation in `/docs`
2. Update this index (`docs/README.md`)
3. Link from main [README.md](../README.md)
4. Update [CLAUDE.md](./CLAUDE.md) if AI-relevant

---

**Happy coding!** 🎙️✨
