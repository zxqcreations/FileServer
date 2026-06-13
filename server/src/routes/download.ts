import { FastifyInstance } from 'fastify';
import { createDownloadStream } from '../services/file.service.js';

export async function downloadRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/download', async (request, reply) => {
    const { path } = request.query as { path?: string };

    if (!path) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PATH', message: 'Path parameter is required' },
      });
    }

    try {
      const { stream, filename, mimeType, size } = createDownloadStream(path);

      reply.header('Content-Type', mimeType);
      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      reply.header('Content-Length', size);
      reply.header('Cache-Control', 'no-cache');

      return reply.send(stream);
    } catch (err: any) {
      const code = err.code || 'INTERNAL_ERROR';
      const statusMap: Record<string, number> = {
        PATH_TRAVERSAL: 403,
        FILE_NOT_FOUND: 404,
        NOT_A_DIRECTORY: 400,
      };
      return reply.status(statusMap[code] || 500).send({
        success: false,
        error: { code, message: err.message },
      });
    }
  });
}
