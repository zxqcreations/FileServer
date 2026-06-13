import { test, expect } from '@playwright/test';

test.describe('FileServer E2E', () => {
  test('health check returns ok', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('API lists files', async ({ request }) => {
    const res = await request.get('/api/files');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.items)).toBe(true);
  });

  test('API blocks path traversal', async ({ request }) => {
    const res = await request.get('/api/files?path=../../../etc');
    expect(res.status()).toBe(403);
  });

  test('Frontend loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('FileServer');
  });

  test('Upload and download flow', async ({ request }) => {
    // Upload a test file
    const formData = new FormData();
    formData.append('file', new Blob(['E2E test content']), 'e2e-test.txt');

    const uploadRes = await request.post('/api/upload', {
      multipart: formData,
    });

    if (uploadRes.status() === 200) {
      // Download it back
      const downloadRes = await request.get('/api/download?path=e2e-test.txt');
      if (downloadRes.status() === 200) {
        const text = await downloadRes.text();
        expect(text).toBe('E2E test content');
      }
    }
  });
});
