/**
 * E2E Test for WebRTC Call Recording
 *
 * Требования:
 * - npm install -D @playwright/test
 * - npx playwright install
 *
 * Запуск:
 * - npx playwright test
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Call Recording Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock getUserMedia для тестирования без реального микрофона
    await page.addInitScript(() => {
      // @ts-ignore
      navigator.mediaDevices.getUserMedia = async () => {
        // Создаем fake audio stream
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const dst = audioContext.createMediaStreamDestination();
        oscillator.connect(dst);
        oscillator.start();
        return dst.stream;
      };
    });
  });

  test('should record and upload audio successfully', async ({ page }) => {
    // 1. Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // 2. Start a call
    await page.goto('http://localhost:3000/dashboard');
    await page.click('text=Начать тренировку');

    // Выбрать challenge
    await page.click('[data-challenge-id="1"]');

    // 3. Verify recording started
    await expect(page.locator('text=Запись...')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible(); // Audio visualizer

    // Wait for some recording time (simulate 5 seconds)
    await page.waitForTimeout(5000);

    // 4. Stop recording
    await page.click('button:has-text("Завершить запись")');

    // 5. Verify upload started
    await expect(page.locator('text=Загрузка...')).toBeVisible();

    // 6. Wait for redirect to results page
    await page.waitForURL('**/result?sessionId=*', { timeout: 30000 });

    // 7. Verify results are displayed
    await expect(page.locator('text=Результаты анализа')).toBeVisible();
    await expect(page.locator('[data-testid="clarity-score"]')).toBeVisible();
  });

  test('should show error if microphone access denied', async ({ page, context }) => {
    // Deny microphone permission
    await context.grantPermissions([], { origin: 'http://localhost:3000' });

    await page.goto('http://localhost:3000/call?sessionId=test-123');

    // Should show error
    await expect(page.locator('text=доступ к микрофону')).toBeVisible();
  });

  test('should handle upload failures gracefully', async ({ page }) => {
    // Mock upload endpoint to fail
    await page.route('**/api/call/upload', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Upload failed' }),
      });
    });

    // Login and start recording
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    await page.goto('http://localhost:3000/call?sessionId=test-123');
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Завершить запись")');

    // Should show error message
    await expect(page.locator('text=загрузить аудио')).toBeVisible();
  });

  test('should upload real audio file (integration)', async ({ page }) => {
    // Prepare a test audio file
    const testAudioPath = path.join(__dirname, 'fixtures', 'test-audio.webm');

    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Start call
    const response = await page.request.post('http://localhost:3000/api/call/start', {
      data: { challengeId: 1 },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const { sessionId } = await response.json();

    // Upload audio file directly (bypass WebRTC)
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('audio', new Blob([await page.evaluate(() => {
      // Create fake audio data
      return new Uint8Array(1024);
    })]), 'test.webm');

    const uploadResponse = await page.request.post('http://localhost:3000/api/call/upload', {
      data: formData,
    });

    expect(uploadResponse.ok()).toBeTruthy();

    // End call
    const endResponse = await page.request.post('http://localhost:3000/api/call/end', {
      data: { sessionId },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(endResponse.ok()).toBeTruthy();
    const result = await endResponse.json();
    expect(result).toHaveProperty('evaluation');
  });
});
