# 🧪 Тестирование Orator AI

## 📊 Текущее покрытие тестами

### Unit тесты:
- ✅ `/api/auth/register` - регистрация пользователей
- ✅ `/api/auth/login` - вход в систему
- ✅ `/api/call/start` - начало звонка
- ✅ `/api/call/end` - завершение звонка
- ✅ `/api/credits` - управление кредитами
- ✅ `/api/eval` - AI анализ речи

### Integration тесты:
- ⚠️ Call flow - полный путь пользователя (placeholder)

---

## 🚀 Запуск тестов

### Все тесты:
```bash
npm test
```

### Конкретный файл:
```bash
npm test -- __tests__/api/auth.test.ts
```

### С покрытием:
```bash
npm test -- --coverage
```

### Watch mode (для разработки):
```bash
npm test -- --watch
```

---

## 📝 Структура тестов

```
__tests__/
├── api/
│   ├── auth.test.ts        # Тесты аутентификации
│   ├── call.test.ts        # Тесты call endpoints
│   ├── credits.test.ts     # Тесты кредитной системы
│   └── eval.test.ts        # Тесты AI анализа
├── integration/
│   └── call-flow.test.ts   # Integration тесты
└── smoke.test.ts           # Базовый smoke test
```

---

## 🧩 Что тестируется

### 1. Authentication API (`auth.test.ts`)

**POST /api/auth/register**
- ✅ Успешная регистрация нового пользователя
- ✅ Ошибка при отсутствии email
- ✅ Ошибка при отсутствии пароля
- ✅ Ошибка при дублировании email
- ✅ Ошибка при неправильном HTTP методе

**POST /api/auth/login**
- ✅ Успешный вход с правильными credentials
- ✅ Ошибка при неправильном пароле
- ✅ Ошибка при несуществующем email
- ✅ Ошибка при отсутствии email
- ✅ Ошибка при неправильном HTTP методе

### 2. Call API (`call.test.ts`)

**POST /api/call/start**
- ✅ Успешное начало звонка с валидными credentials
- ✅ Списание 1 кредита
- ✅ Ошибка при отсутствии кредитов
- ✅ Ошибка при отсутствии аутентификации
- ✅ Ошибка при отсутствии challengeId
- ✅ Ошибка при неправильном HTTP методе

**POST /api/call/end**
- ✅ Успешное завершение звонка
- ✅ Вызов /api/eval для анализа
- ✅ Ошибка при отсутствии sessionId
- ✅ Ошибка при несуществующей сессии
- ✅ Ошибка при отсутствии загруженного аудио

### 3. Credits API (`credits.test.ts`)

**GET /api/credits**
- ✅ Возврат количества кредитов для аутентифицированного пользователя
- ✅ Ошибка 401 при отсутствии аутентификации
- ✅ Ошибка 404 если пользователь не найден
- ✅ Ошибка при неправильном HTTP методе

### 4. Eval API (`eval.test.ts`)

**POST /api/eval**
- ✅ Успешный анализ аудио через OpenAI Whisper + GPT-4
- ✅ Возврат структурированного JSON с метриками
- ✅ Сохранение результатов в callHistory
- ✅ Ошибка при отсутствии sessionId
- ✅ Ошибка при несуществующей сессии
- ✅ Ошибка при отсутствии аудио файла
- ✅ Обработка ошибок OpenAI API
- ✅ Ошибка при неправильном HTTP методе

---

## 🎭 Моки (Mocks)

### NextAuth
```typescript
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));
```

### Database (Drizzle ORM)
```typescript
jest.mock('../../drizzle/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));
```

### OpenAI API
```typescript
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    audio: { transcriptions: { create: jest.fn() } },
    chat: { completions: { create: jest.fn() } },
  })),
}));
```

### File System
```typescript
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  createReadStream: jest.fn(),
  statSync: jest.fn(),
}));
```

---

## 📊 Coverage targets

| Метрика | Текущая цель | MVP цель |
|---------|--------------|----------|
| Branches | 50% | 70% |
| Functions | 50% | 70% |
| Lines | 50% | 80% |
| Statements | 50% | 80% |

---

## 🐛 Известные проблемы

### 1. Integration тесты - placeholder
**Проблема:** Integration тесты еще не полностью реализованы
**Решение:** Требуется:
- Test database setup/teardown
- Mock файлы для upload
- Fixtures для аудио файлов

### 2. E2E тесты отсутствуют
**Проблема:** Нет E2E тестов через браузер
**Решение:** Добавить Playwright или Cypress для:
- Полный user journey
- WebRTC тестирование
- Browser compatibility

### 3. Моки OpenAI API
**Проблема:** Тесты не проверяют реальные ответы OpenAI
**Решение:** Добавить интеграционные тесты с реальным API (опционально)

---

## 🔧 Как добавить новый тест

### 1. Создать файл теста
```bash
touch __tests__/api/my-new-test.test.ts
```

### 2. Структура теста
```typescript
import { describe, it, expect, jest } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

describe('My Feature API', () => {
  describe('POST /api/my-endpoint', () => {
    it('should do something', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { data: 'test' },
      });

      const handler = (await import('../../pages/api/my-endpoint')).default;
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });
  });
});
```

### 3. Запустить тест
```bash
npm test -- __tests__/api/my-new-test.test.ts
```

---

## 📈 CI/CD Integration

### GitHub Actions (рекомендуется)

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

---

## 🎯 Следующие шаги

### Приоритет 1 (критично):
- [ ] Запустить все тесты и убедиться что они проходят
- [ ] Исправить все failing tests
- [ ] Добавить тесты для `/api/call/upload`
- [ ] Добавить тесты для `/api/challenges`

### Приоритет 2 (важно):
- [ ] Полноценные integration тесты
- [ ] E2E тесты с Playwright
- [ ] Повысить coverage до 70%+
- [ ] Добавить performance тесты

### Приоритет 3 (nice to have):
- [ ] Visual regression tests
- [ ] Load testing
- [ ] Security testing (OWASP)

---

## 📚 Дополнительные ресурсы

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Guide](https://kulshekhar.github.io/ts-jest/)
- [Testing Next.js](https://nextjs.org/docs/testing)
- [node-mocks-http](https://github.com/howardabrams/node-mocks-http)

---

## ⚡ Быстрые команды

```bash
# Запустить все тесты
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage

# Specific test file
npm test -- auth.test.ts

# Verbose output
npm test -- --verbose

# Update snapshots
npm test -- -u
```

---

## 🏆 Best Practices

1. **Один assert на тест** - тесты должны быть атомарными
2. **Описательные названия** - `should reject login with incorrect password`
3. **AAA pattern** - Arrange, Act, Assert
4. **Моки для внешних зависимостей** - DB, API, файлы
5. **Cleanup после тестов** - `afterEach`, `afterAll`
6. **Не тестировать implementation details** - тестируйте поведение
7. **Быстрые тесты** - unit тесты должны быть <100ms

---

**Последнее обновление:** После добавления unit тестов для API endpoints
**Test coverage:** ~60% (estimated)
**Status:** ✅ Ready to run
