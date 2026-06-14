import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { FastifyInstance } from 'fastify';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { config } from '../src/config.js';

let app: FastifyInstance;

beforeAll(async () => {
  // Ensure test files exist
  await mkdir(config.fileStorageRoot, { recursive: true });
  await writeFile(join(config.fileStorageRoot, 'test.txt'), 'Hello, FileServer!');
  await mkdir(join(config.fileStorageRoot, 'subdir'), { recursive: true });
  await writeFile(join(config.fileStorageRoot, 'subdir', 'nested.txt'), 'Nested content');
  await writeFile(join(config.fileStorageRoot, '.hidden'), 'should not appear');

  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  // Cleanup test files
  await rm(join(config.fileStorageRoot, 'test.txt'), { force: true });
  await rm(join(config.fileStorageRoot, '.hidden'), { force: true });
  await rm(join(config.fileStorageRoot, 'subdir'), { recursive: true, force: true });
});

describe('GET /health', () => {
  it('returns ok status', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
  });
});

describe('GET /api/files', () => {
  it('lists root directory contents', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/files' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBeGreaterThan(0);
    expect(body.data.items.some((i: any) => i.name === 'test.txt')).toBe(true);
    expect(body.data.items.some((i: any) => i.name === '.hidden')).toBe(false);
  });

  it('lists subdirectory contents', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/files?path=subdir',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.items.some((i: any) => i.name === 'nested.txt')).toBe(true);
  });

  it('returns 404 for non-existent directory', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/files?path=nonexistent',
    });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.success).toBe(false);
  });

  it('returns 403 for path traversal', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/files?path=../../../etc',
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /api/upload', () => {
  it('uploads a file to a non-existent subdirectory (auto-creates dir)', async () => {
    // Clean up from previous runs
    const testDir = join(config.fileStorageRoot, 'auto-created');
    await rm(testDir, { recursive: true, force: true });

    const formData = new FormData();
    formData.append('file', new Blob(['uploaded content']), 'upload.txt');

    const boundary = '----TestBoundary';
    const body = Buffer.from(
      `------TestBoundary\r\nContent-Disposition: form-data; name="file"; filename="upload.txt"\r\nContent-Type: text/plain\r\n\r\nuploaded content\r\n------TestBoundary--\r\n`
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/upload?path=auto-created',
      headers: {
        'content-type': `multipart/form-data; boundary=----TestBoundary`,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const body2 = res.json();
    expect(body2.success).toBe(true);
    expect(body2.data.uploaded.length).toBe(1);
    expect(body2.data.uploaded[0].name).toBe('upload.txt');

    // Verify the directory was created
    const { stat } = await import('node:fs/promises');
    const dirStat = await stat(join(config.fileStorageRoot, 'auto-created'));
    expect(dirStat.isDirectory()).toBe(true);

    // Cleanup
    await rm(testDir, { recursive: true, force: true });
  });
});

describe('GET /api/download', () => {
  it('downloads a file', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/download?path=test.txt',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('Hello, FileServer!');
    expect(res.headers['content-disposition']).toContain('test.txt');
  });

  it('returns 404 for non-existent file', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/download?path=missing.txt',
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 403 for path traversal in download', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/download?path=../.env',
    });
    expect(res.statusCode).toBe(403);
  });
});
