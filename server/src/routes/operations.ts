import { FastifyInstance } from 'fastify';
import { mkdir } from 'node:fs/promises';
import { deleteFile, moveFile, copyFileTo } from '../services/file.service.js';
import { resolveSafePath, validatePath } from '../utils/path.util.js';
import { config } from '../config.js';

export async function operationsRoutes(app: FastifyInstance): Promise<void> {
  // DELETE /api/files?path=xxx
  app.delete('/api/files', async (request, reply) => {
    const { path } = request.query as { path?: string };

    if (!path) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PATH', message: 'Path parameter is required' },
      });
    }

    try {
      await deleteFile(path);
      return reply.send({ success: true, data: { deleted: path } });
    } catch (err: any) {
      const code = err.code || 'INTERNAL_ERROR';
      const statusMap: Record<string, number> = {
        PATH_TRAVERSAL: 403,
        FILE_NOT_FOUND: 404,
      };
      return reply.status(statusMap[code] || 500).send({
        success: false,
        error: { code, message: err.message },
      });
    }
  });

  // POST /api/files/move — body: { from, to }
  app.post('/api/files/move', async (request, reply) => {
    const { from, to } = (request.body || {}) as { from?: string; to?: string };

    if (!from || !to) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PATH', message: 'Both "from" and "to" paths are required' },
      });
    }

    try {
      await moveFile(from, to);
      return reply.send({ success: true, data: { from, to } });
    } catch (err: any) {
      const code = err.code || 'INTERNAL_ERROR';
      const statusMap: Record<string, number> = {
        PATH_TRAVERSAL: 403,
        FILE_NOT_FOUND: 404,
      };
      return reply.status(statusMap[code] || 500).send({
        success: false,
        error: { code, message: err.message },
      });
    }
  });

  // POST /api/files/copy — body: { from, to }
  app.post('/api/files/copy', async (request, reply) => {
    const { from, to } = (request.body || {}) as { from?: string; to?: string };

    if (!from || !to) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PATH', message: 'Both "from" and "to" paths are required' },
      });
    }

    try {
      await copyFileTo(from, to);
      return reply.send({ success: true, data: { from, to } });
    } catch (err: any) {
      const code = err.code || 'INTERNAL_ERROR';
      const statusMap: Record<string, number> = {
        PATH_TRAVERSAL: 403,
        FILE_NOT_FOUND: 404,
      };
      return reply.status(statusMap[code] || 500).send({
        success: false,
        error: { code, message: err.message },
      });
    }
  });

  // POST /api/files/mkdir — body: { path }
  app.post('/api/files/mkdir', async (request, reply) => {
    const { path: dirPath } = (request.body || {}) as { path?: string };

    if (!dirPath) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PATH', message: 'Path is required' },
      });
    }

    // Path safety
    const safe = resolveSafePath(dirPath, config.fileStorageRoot);
    if (!safe.valid || !safe.resolved) {
      return reply.status(403).send({
        success: false,
        error: { code: 'PATH_TRAVERSAL', message: 'Access denied: path traversal detected' },
      });
    }

    try {
      await mkdir(safe.resolved, { recursive: true });
      return reply.send({ success: true, data: { created: dirPath } });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'UPLOAD_FAILED', message: err.message },
      });
    }
  });
}
