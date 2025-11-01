# 🎙️ Тестирование WebRTC записи голоса

## 📋 Оглавление
1. [Архитектура WebRTC в проекте](#архитектура)
2. [Текущее покрытие тестами](#текущее-покрытие)
3. [Стратегии тестирования](#стратегии-тестирования)
4. [Unit тесты](#unit-тесты)
5. [Integration тесты](#integration-тесты)
6. [E2E тесты](#e2e-тесты)
7. [Запуск тестов](#запуск-тестов)

---

## 🏗️ Архитектура

### Полный flow записи голоса:

```
┌──────────────────────────────────────────────────────────┐
│ 1. BROWSER (WebRTC)                                      │
│                                                          │
│  getUserMedia() → MediaRecorder → Audio Chunks → Blob   │
│                                                          │
│  app/call/page.tsx:64-99                                │
└──────────────────────────────────────────────────────────┘
                        ↓ FormData
┌──────────────────────────────────────────────────────────┐
│ 2. UPLOAD ENDPOINT                                       │
│                                                          │
│  formidable → Parse multipart → Save to disk            │
│                                                          │
│  pages/api/call/upload.ts:16-90                         │
└──────────────────────────────────────────────────────────┘
                        ↓ wavPath
┌──────────────────────────────────────────────────────────┐
│ 3. END CALL ENDPOINT                                     │
│                                                          │
│  Verify wavPath → Trigger AI evaluation                 │
│                                                          │
│  pages/api/call/end.ts:16-66                            │
└──────────────────────────────────────────────────────────┘
                        ↓ sessionId
┌──────────────────────────────────────────────────────────┐
│ 4. AI EVALUATION                                         │
│                                                          │
│  Whisper transcription → GPT-4 analysis                 │
│                                                          │
│  pages/api/eval.ts:46-96                                │
└──────────────────────────────────────────────────────────┘
```

---

## ✅ Текущее покрытие

### Что УЖЕ тестируется:

| Компонент | Тесты | Покрытие | Файл |
|-----------|-------|----------|------|
| `/api/call/start` | 5 тестов | 100% | `__tests__/api/call.test.ts` |
| `/api/call/end` | 5 тестов | 100% | `__tests__/api/call.test.ts` |
| `/api/eval` | 6 тестов | 100% | `__tests__/api/eval.test.ts` |
| **`/api/call/upload`** | ❌ **0 тестов** | **0%** | **НЕТ** |
| **WebRTC UI** | ❌ **0 тестов** | **0%** | **НЕТ** |

### Что НЕ тестируется:

1. ❌ **MediaRecorder API** - запись audio chunks
2. ❌ **FormData upload** - отправка файла на сервер
3. ❌ **formidable parsing** - обработка multipart/form-data
4. ❌ **File system operations** - сохранение файлов в `/storage/`
5. ❌ **Audio visualization** - Canvas + Web Audio API

---

## 🎯 Стратегии тестирования

### 1. Unit тесты (Fast, Isolated)

**Цель:** Тестировать отдельные функции и API endpoints

**Что тестируем:**
- ✅ API endpoints (start, end, upload, eval)
- ✅ Валидация входных данных
- ✅ Обработка ошибок
- ✅ Database операции (с моками)

**Преимущества:**
- Быстрые (< 3 секунды)
- Изолированные
- Легко дебажить

**Недостатки:**
- Не тестируют реальное взаимодействие компонентов
- Используют моки вместо реальных API

---

### 2. Integration тесты (Medium Speed, Real APIs)

**Цель:** Тестировать взаимодействие между компонентами

**Что тестируем:**
- ✅ Полный flow: start → upload → end → eval
- ✅ Реальные файловые операции
- ✅ Реальная база данных (test DB)
- ⚠️ Mock OpenAI API (экономия денег)

**Преимущества:**
- Тестируют реальное взаимодействие
- Выявляют integration проблемы

**Недостатки:**
- Медленнее (5-10 секунд)
- Требуют настройки test DB
- Сложнее дебажить

---

### 3. E2E тесты (Slow, Real Browser)

**Цель:** Тестировать весь user journey в реальном браузере

**Что тестируем:**
- ✅ WebRTC запись в браузере
- ✅ UI взаимодействие
- ✅ Navigation flow
- ✅ Error handling в UI

**Преимущества:**
- Тестируют реальный UX
- Выявляют browser-specific проблемы

**Недостатки:**
- Очень медленные (30-60 секунд)
- Требуют headless browser
- Сложны в настройке

---

## 🧪 Unit тесты

### Создан: `__tests__/api/upload.test.ts`

**Покрытие:**
```typescript
✅ should upload audio file successfully
✅ should reject if sessionId is missing
✅ should reject if audio file is missing
✅ should reject if session not found
✅ should reject invalid HTTP method
✅ should handle file system errors
```

**Запуск:**
```bash
npm test __tests__/api/upload.test.ts
```

**Что мокается:**
- `formidable` - парсинг FormData
- `drizzle/db` - database операции
- `fs` - файловые операции

---

## 🔗 Integration тесты

### Пример: `__tests__/integration/call-flow.test.ts`

**Сейчас:** Только placeholders

**Нужно реализовать:**

```typescript
describe('Full Call Flow Integration', () => {
  let testDb;
  let testUser;
  let sessionId;

  beforeAll(async () => {
    // Setup test database
    testDb = await setupTestDatabase();
    testUser = await createTestUser(testDb);
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDb);
  });

  it('should complete full recording flow', async () => {
    // 1. Start call
    const startRes = await fetch('/api/call/start', {
      method: 'POST',
      body: JSON.stringify({ challengeId: 1 }),
    });
    const { sessionId } = await startRes.json();
    expect(startRes.status).toBe(200);

    // 2. Upload audio file
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('audio', createTestAudioBlob(), 'test.webm');

    const uploadRes = await fetch('/api/call/upload', {
      method: 'POST',
      body: formData,
    });
    expect(uploadRes.status).toBe(200);

    // 3. End call
    const endRes = await fetch('/api/call/end', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
    expect(endRes.status).toBe(200);

    // 4. Verify file saved
    const session = await testDb
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .get();

    expect(session.wavPath).toBeTruthy();
    expect(fs.existsSync(session.wavPath)).toBe(true);

    // 5. Verify callHistory created
    const history = await testDb
      .select()
      .from(callHistory)
      .where(eq(callHistory.sessionId, sessionId))
      .get();

    expect(history).toBeTruthy();
    expect(history.clarityScore).toBeGreaterThan(0);
  });
});
```

---

## 🌐 E2E тесты

### Создан: `e2e/call-recording.spec.ts`

**Требования:**
```bash
npm install -D @playwright/test
npx playwright install
```

**Запуск:**
```bash
npx playwright test
```

**Что тестируется:**
```typescript
✅ should record and upload audio successfully
✅ should show error if microphone access denied
✅ should handle upload failures gracefully
✅ should upload real audio file (integration)
```

**Mock getUserMedia:**
```typescript
page.addInitScript(() => {
  navigator.mediaDevices.getUserMedia = async () => {
    // Fake audio stream
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const dst = audioContext.createMediaStreamDestination();
    oscillator.connect(dst);
    oscillator.start();
    return dst.stream;
  };
});
```

---

## 🚀 Запуск тестов

### Unit тесты:
```bash
# Все тесты
npm test

# Только upload тесты
npm test upload

# С coverage
npm test -- --coverage
```

### Integration тесты:
```bash
# Требует запущенного сервера
npm run dev &
npm test integration
```

### E2E тесты:
```bash
# Требует установки Playwright
npm install -D @playwright/test
npx playwright install

# Запуск
npx playwright test

# С UI
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

---

## 📊 Рекомендуемое покрытие

| Тип теста | Количество | Время | Приоритет |
|-----------|------------|-------|-----------|
| Unit | 40+ тестов | 2-3s | 🔴 Высокий |
| Integration | 5-10 тестов | 10-20s | 🟡 Средний |
| E2E | 3-5 тестов | 60-120s | 🟢 Низкий |

**Текущее состояние:**
- ✅ Unit: 33/40 (83%)
- ⚠️ Integration: 0/5 (placeholders)
- ❌ E2E: 0/5

---

## 🎯 Roadmap

### Неделя 1: Unit тесты
- [x] Auth API (12 тестов)
- [x] Call API (10 тестов)
- [x] Credits API (4 тестов)
- [x] Eval API (6 тестов)
- [ ] **Upload API (6 тестов)** ← СЛЕДУЮЩИЙ ШАГ

### Неделя 2: Integration тесты
- [ ] Full call flow (start → upload → end → eval)
- [ ] Error handling (no credits, no audio, AI failure)
- [ ] Data consistency (credits, sessions, callHistory)

### Неделя 3: E2E тесты
- [ ] WebRTC recording flow
- [ ] Microphone permissions
- [ ] Upload failures
- [ ] Results page

---

## 💡 Best Practices

### 1. Моки vs Реальные API

**Unit тесты:**
- ✅ Mock всё (database, filesystem, external APIs)
- Цель: скорость и изоляция

**Integration тесты:**
- ✅ Реальная database (test DB)
- ✅ Реальный filesystem (temp directory)
- ⚠️ Mock OpenAI (дорого)

**E2E тесты:**
- ✅ Всё реально
- ⚠️ Может быть медленно и дорого

### 2. Test Fixtures

Создавайте реюзабельные тестовые данные:

```typescript
// test/fixtures/audio.ts
export function createTestAudioBlob(): Blob {
  // 1 second of silence
  const sampleRate = 44100;
  const buffer = new Float32Array(sampleRate);
  return new Blob([buffer], { type: 'audio/webm' });
}

export function createTestAudioFile(): string {
  return path.join(__dirname, 'fixtures', 'test-audio.webm');
}
```

### 3. Cleanup

Всегда очищайте тестовые данные:

```typescript
afterEach(async () => {
  // Delete test files
  const testFiles = fs.readdirSync('/storage/sessions')
    .filter(f => f.includes('test-'));
  testFiles.forEach(f => fs.unlinkSync(f));

  // Clear test DB
  await db.delete(sessions).where(like(sessions.sessionId, 'test-%'));
});
```

---

## ❓ FAQ

### Q: Как тестировать MediaRecorder без микрофона?

**A:** Используйте mock getUserMedia:

```typescript
navigator.mediaDevices.getUserMedia = jest.fn().mockResolvedValue({
  getTracks: () => [{
    stop: jest.fn(),
  }],
});
```

### Q: Как тестировать file upload без реальных файлов?

**A:** Используйте Buffer или Blob:

```typescript
const testFile = Buffer.from('fake audio data');
formData.append('audio', testFile, 'test.webm');
```

### Q: Нужно ли тестировать Canvas visualization?

**A:** Низкий приоритет. Это UI-элемент, лучше тестировать E2E или визуально.

### Q: Как избежать расходов на OpenAI API в тестах?

**A:** Всегда мокайте OpenAI в unit и integration тестах:

```typescript
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: jest.fn().mockResolvedValue({ text: 'Test transcription' }),
      },
    },
  })),
}));
```

---

## 📚 Ресурсы

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [WebRTC Testing Guide](https://webrtc.org/getting-started/testing)
- [Testing Next.js](https://nextjs.org/docs/testing)
