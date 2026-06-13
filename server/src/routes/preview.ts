import { FastifyInstance } from 'fastify';
import { resolveSafePath, validatePath } from '../utils/path.util.js';
import { config } from '../config.js';
import { openAsBlob } from 'node:fs';
import { realpath } from 'node:fs/promises';

const DEFAULT_MAX_BYTES = 1 * 1024 * 1024; // 1 MB
const HARD_MAX_BYTES = 5 * 1024 * 1024; // 5 MB hard limit
const PREVIEW_HEAD_BYTES = 64 * 1024; // 64 KB head for "first portion"

export async function previewRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/preview', async (request, reply) => {
    const { path, maxBytes: maxBytesRaw } = request.query as { path?: string; maxBytes?: string };

    if (!path) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PATH', message: 'Path parameter is required' },
      });
    }

    // Parse maxBytes, clamp to limits
    let maxBytes = DEFAULT_MAX_BYTES;
    if (maxBytesRaw) {
      const parsed = parseInt(maxBytesRaw, 10);
      if (!isNaN(parsed) && parsed > 0) {
        maxBytes = Math.min(parsed, HARD_MAX_BYTES);
      }
    }

    // Path safety
    const safe = resolveSafePath(path, config.fileStorageRoot);
    if (!safe.valid || !safe.resolved) {
      return reply.status(403).send({
        success: false,
        error: { code: 'PATH_TRAVERSAL', message: 'Access denied: path traversal detected' },
      });
    }

    // Symlink check
    let realPath: string;
    try {
      realPath = await realpath(safe.resolved);
      const validation = validatePath(realPath, config.fileStorageRoot);
      if (!validation.valid) {
        return reply.status(403).send({
          success: false,
          error: { code: 'PATH_TRAVERSAL', message: 'Access denied: path traversal via symlink' },
        });
      }
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return reply.status(404).send({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
        });
      }
      throw err;
    }

    // Read file content (up to maxBytes)
    let content: string;
    let truncated = false;
    try {
      const blob = await openAsBlob(realPath);
      const totalSize = blob.size;
      const readSize = Math.min(totalSize, maxBytes);
      const buf = Buffer.from(await blob.slice(0, readSize).arrayBuffer());

      // Try UTF-8 decode; fall back to latin1 if it fails
      try {
        content = new TextDecoder('utf-8', { fatal: true }).decode(buf);
      } catch {
        content = new TextDecoder('latin1').decode(buf);
      }

      truncated = totalSize > maxBytes;
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'UPLOAD_FAILED', message: `Failed to read file: ${err.message}` },
      });
    }

    return reply.send({
      success: true,
      data: {
        content,
        truncated,
        totalBytes: maxBytes, // not the real file size, just what we allowed
        maxBytes,
      },
    });
  });
}
