import { FastifyInstance } from 'fastify';
import { deleteFile, moveFile, copyFileTo } from '../services/file.service.js';

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
}
