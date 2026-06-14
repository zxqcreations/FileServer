import { readdir, stat, mkdir, unlink, rmdir, realpath, rename, copyFile } from 'node:fs/promises';
import { createReadStream, createWriteStream, statSync, realpathSync } from 'node:fs';
import { join, basename, relative } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { resolveSafePath, validatePath } from '../utils/path.util.js';
import { getMimeType } from '../utils/mime.util.js';
import { config } from '../config.js';

export interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  mimeType?: string;
  lastModified: string;
}

export interface FileListResult {
  currentPath: string;
  parentPath: string | null;
  items: FileItem[];
}

export class FileTooLargeError extends Error {
  readonly code = 'FILE_TOO_LARGE';
  constructor(limit: number) {
    super(`File exceeds maximum size of ${limit} bytes`);
    this.name = 'FileTooLargeError';
  }
}

/**
 * Shared validation logic for a resolved realpath against the storage root.
 * Throws on ENOENT (file not found) or path traversal.
 */
async function resolveAndValidate(absolutePath: string): Promise<string> {
  try {
    const real = await realpath(absolutePath);
    const validation = validatePath(real, config.fileStorageRoot);
    if (!validation.valid) {
      throw Object.assign(new Error('Path traversal detected via symlink'), { code: 'PATH_TRAVERSAL' });
    }
    return real;
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw Object.assign(new Error('File or directory not found'), { code: 'FILE_NOT_FOUND' });
    }
    if (err.code === 'PATH_TRAVERSAL') throw err;
    throw err;
  }
}

function resolveAndValidateSync(absolutePath: string): string {
  try {
    const real = realpathSync(absolutePath);
    const validation = validatePath(real, config.fileStorageRoot);
    if (!validation.valid) {
      throw Object.assign(new Error('Path traversal detected via symlink'), { code: 'PATH_TRAVERSAL' });
    }
    return real;
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw Object.assign(new Error('File or directory not found'), { code: 'FILE_NOT_FOUND' });
    }
    if (err.code === 'PATH_TRAVERSAL') throw err;
    throw err;
  }
}

async function verifyRealPath(absolutePath: string): Promise<string> {
  return resolveAndValidate(absolutePath);
}

function verifyRealPathSync(absolutePath: string): string {
  return resolveAndValidateSync(absolutePath);
}

export async function listFiles(userPath?: string): Promise<FileListResult> {
  const safe = resolveSafePath(userPath, config.fileStorageRoot);
  if (!safe.valid || !safe.resolved) {
    throw Object.assign(new Error('Path traversal detected'), { code: 'PATH_TRAVERSAL' });
  }

  // Use the real (symlink-resolved) path for all filesystem operations
  const realPath = await verifyRealPath(safe.resolved);

  // Ensure the root directory exists
  await mkdir(config.fileStorageRoot, { recursive: true });

  // Verify target exists and is a directory
  let dirStat;
  try {
    dirStat = await stat(realPath);
  } catch {
    throw Object.assign(new Error('Directory not found'), { code: 'FILE_NOT_FOUND' });
  }

  if (!dirStat.isDirectory()) {
    throw Object.assign(new Error('Not a directory'), { code: 'NOT_A_DIRECTORY' });
  }

  const entries = await readdir(realPath, { withFileTypes: true });

  // Filter out hidden files (names starting with ".")
  const visibleEntries = entries.filter((entry) => !entry.name.startsWith('.'));

  const items: FileItem[] = await Promise.all(
    visibleEntries.map(async (entry): Promise<FileItem> => {
      const fullPath = join(realPath, entry.name);
      const entryStat = await stat(fullPath);
      if (entry.isDirectory()) {
        return {
          name: entry.name,
          type: 'directory',
          lastModified: entryStat.mtime.toISOString(),
        };
      }
      return {
        name: entry.name,
        type: 'file',
        size: entryStat.size,
        mimeType: getMimeType(entry.name),
        lastModified: entryStat.mtime.toISOString(),
      };
    })
  );

  // Sort: directories first, then files, both alphabetically
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const parentPath =
    realPath === config.fileStorageRoot
      ? null
      : relative(config.fileStorageRoot, join(realPath, '..')) || '';

  return {
    currentPath: realPath === config.fileStorageRoot ? '' : relative(config.fileStorageRoot, realPath),
    parentPath: parentPath === '' ? null : parentPath,
    items,
  };
}

export function createDownloadStream(userPath: string): {
  stream: NodeJS.ReadableStream;
  filename: string;
  mimeType: string;
  size: number;
} {
  const safe = resolveSafePath(userPath, config.fileStorageRoot);
  if (!safe.valid || !safe.resolved) {
    throw Object.assign(new Error('Path traversal detected'), { code: 'PATH_TRAVERSAL' });
  }

  // Use the real (symlink-resolved) path for all filesystem operations
  const realPath = verifyRealPathSync(safe.resolved);

  let fileStat;
  try {
    fileStat = statSync(realPath);
  } catch {
    throw Object.assign(new Error('File not found'), { code: 'FILE_NOT_FOUND' });
  }

  if (!fileStat.isFile()) {
    throw Object.assign(new Error('Not a file'), { code: 'NOT_A_DIRECTORY' });
  }

  const filename = basename(realPath);

  return {
    stream: createReadStream(realPath),
    filename,
    mimeType: getMimeType(filename),
    size: fileStat.size,
  };
}

export async function saveUploadedFile(
  fileStream: Readable,
  filename: string,
  targetDir: string
): Promise<{ name: string; size: number }> {
  const safeDir = resolveSafePath(targetDir, config.fileStorageRoot);
  if (!safeDir.valid || !safeDir.resolved) {
    throw Object.assign(new Error('Path traversal detected'), { code: 'PATH_TRAVERSAL' });
  }

  // Sanitize filename: strip path separators, null bytes
  const safeName = basename(filename).replace(/[\x00/\\]/g, '_');
  if (!safeName) {
    throw Object.assign(new Error('Invalid filename'), { code: 'INVALID_PATH' });
  }

  // Ensure target directory exists BEFORE resolving symlinks — realpath
  // requires the path to exist on disk, and we want auto-creation.
  await mkdir(safeDir.resolved, { recursive: true });

  // Resolve symlinks after directory creation to prevent TOCTOU
  const realDir = await verifyRealPath(safeDir.resolved);

  const filePath = join(realDir, safeName);
  const writeStream = createWriteStream(filePath);

  // Use a Transform stream that throws a typed error when size limit is exceeded
  let bytesWritten = 0;

  const sizeLimitTransform = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytesWritten += chunk.length;
      if (bytesWritten > config.maxFileSize) {
        // Unpipe and cleanup the write stream
        this.destroy();
        writeStream.destroy();
        callback(new FileTooLargeError(config.maxFileSize));
        return;
      }
      callback(null, chunk);
    },
    final(callback) {
      callback();
    },
  });

  try {
    await pipeline(fileStream, sizeLimitTransform, writeStream);
  } catch (err: unknown) {
    // Clean up the partial file on error
    unlink(filePath).catch(() => {});
    if (err instanceof FileTooLargeError) {
      throw err;
    }
    throw err;
  }

  return { name: safeName, size: bytesWritten };
}

export async function deleteFile(userPath: string): Promise<void> {
  const safe = resolveSafePath(userPath, config.fileStorageRoot);
  if (!safe.valid || !safe.resolved) {
    throw Object.assign(new Error('Path traversal detected'), { code: 'PATH_TRAVERSAL' });
  }

  // Use the real (symlink-resolved) path for all filesystem operations
  const realPath = await verifyRealPath(safe.resolved);

  const fileStat = await stat(realPath).catch(() => null);
  if (!fileStat) {
    throw Object.assign(new Error('File not found'), { code: 'FILE_NOT_FOUND' });
  }

  if (fileStat.isDirectory()) {
    await rmdir(realPath, { recursive: true });
  } else {
    await unlink(realPath);
  }
}

export async function moveFile(fromPath: string, toPath: string): Promise<void> {
  // Validate source
  const fromSafe = resolveSafePath(fromPath, config.fileStorageRoot);
  if (!fromSafe.valid || !fromSafe.resolved) {
    throw Object.assign(new Error('Path traversal detected in source'), { code: 'PATH_TRAVERSAL' });
  }
  const fromReal = await verifyRealPath(fromSafe.resolved);

  // Validate destination directory
  const toSafe = resolveSafePath(toPath, config.fileStorageRoot);
  if (!toSafe.valid || !toSafe.resolved) {
    throw Object.assign(new Error('Path traversal detected in destination'), { code: 'PATH_TRAVERSAL' });
  }

  // Ensure destination parent directory exists
  await mkdir(join(toSafe.resolved, '..'), { recursive: true });

  // Verify destination stays within root (realpath may fail if it doesn't exist yet, which is fine)
  try {
    const toParent = resolveSafePath(toSafe.resolved + '/..', config.fileStorageRoot);
    if (toParent.valid && toParent.resolved) {
      await verifyRealPath(toParent.resolved);
    }
  } catch (err: any) {
    if (err.code !== 'FILE_NOT_FOUND' && err.code !== 'ENOENT') throw err;
  }

  await rename(fromReal, toSafe.resolved);
}

export async function copyFileTo(fromPath: string, toPath: string): Promise<void> {
  // Validate source
  const fromSafe = resolveSafePath(fromPath, config.fileStorageRoot);
  if (!fromSafe.valid || !fromSafe.resolved) {
    throw Object.assign(new Error('Path traversal detected in source'), { code: 'PATH_TRAVERSAL' });
  }
  const fromReal = await verifyRealPath(fromSafe.resolved);

  // Validate destination
  const toSafe = resolveSafePath(toPath, config.fileStorageRoot);
  if (!toSafe.valid || !toSafe.resolved) {
    throw Object.assign(new Error('Path traversal detected in destination'), { code: 'PATH_TRAVERSAL' });
  }

  // Ensure destination parent directory exists
  await mkdir(join(toSafe.resolved, '..'), { recursive: true });

  await copyFile(fromReal, toSafe.resolved);
}
