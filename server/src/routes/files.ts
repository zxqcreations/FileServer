import { FastifyInstance } from 'fastify';
import { listFiles } from '../services/file.service.js';

export async function fileListRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/files', async (request, reply) => {
    const { path } = request.query as { path?: string };

    try {
      const result = await listFiles(path);
      return reply.send({ success: true, data: result });
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
