import { describe, it, expect } from 'vitest';
import { resolveSafePath, validatePath } from '../src/utils/path.util.js';
import { resolve } from 'node:path';

const FILE_ROOT = resolve(process.cwd(), 'file_storage');

describe('validatePath', () => {
  it('accepts a valid path within file storage root', () => {
    const result = validatePath(resolve(FILE_ROOT, 'subdir', 'file.txt'), FILE_ROOT);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects path traversal via ..', () => {
    const result = validatePath(resolve(FILE_ROOT, '..', 'etc', 'passwd'), FILE_ROOT);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('PATH_TRAVERSAL');
  });

  it('rejects path traversal via nested ..', () => {
    const result = validatePath(resolve(FILE_ROOT, 'subdir', '..', '..', 'etc'), FILE_ROOT);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('PATH_TRAVERSAL');
  });

  it('accepts path that exactly matches root (at boundary)', () => {
    const result = validatePath(FILE_ROOT, FILE_ROOT);
    expect(result.valid).toBe(true);
  });
});

describe('resolveSafePath', () => {
  it('resolves a valid relative path', () => {
    const result = resolveSafePath('subdir/file.txt', FILE_ROOT);
    expect(result.valid).toBe(true);
    expect(result.resolved).toBe(resolve(FILE_ROOT, 'subdir', 'file.txt'));
  });

  it('resolves empty string as root', () => {
    const result = resolveSafePath('', FILE_ROOT);
    expect(result.valid).toBe(true);
    expect(result.resolved).toBe(FILE_ROOT);
  });

  it('rejects path with bare .. segment', () => {
    const result = resolveSafePath('../etc/passwd', FILE_ROOT);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('PATH_TRAVERSAL');
  });

  it('rejects path with embedded ..', () => {
    const result = resolveSafePath('subdir/../../etc', FILE_ROOT);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('PATH_TRAVERSAL');
  });

  it('rejects absolute path outside root', () => {
    const result = resolveSafePath('/etc/passwd', FILE_ROOT);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('PATH_TRAVERSAL');
  });

  it('rejects path with null byte injection', () => {
    const result = resolveSafePath('file.txt\0/../etc/passwd', FILE_ROOT);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('PATH_TRAVERSAL');
  });

  it('handles undefined path as root', () => {
    const result = resolveSafePath(undefined, FILE_ROOT);
    expect(result.valid).toBe(true);
    expect(result.resolved).toBe(FILE_ROOT);
  });
});
