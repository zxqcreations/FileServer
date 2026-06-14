import { FastifyInstance } from 'fastify';
import { saveUploadedFile } from '../services/file.service.js';
import { broadcast } from '../ws.js';

interface UploadResult {
  name: string;
  size: number;
}

interface UploadFailure {
  name: string;
  reason: string;
}

export async function uploadRoutes(app: FastifyInstance): Promise<void> {
  // Single file upload
  app.post('/api/upload', async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PATH', message: 'No file provided' },
      });
    }

    const targetPath = (request.query as Record<string, string>)?.path || '';

    const uploaded: UploadResult[] = [];
    const failed: UploadFailure[] = [];

    try {
      const result = await saveUploadedFile(data.file, data.filename, targetPath);
      uploaded.push(result);
      broadcast({
        type: 'upload',
        path: targetPath,
        files: [result.name],
      });
    } catch (err: any) {
      failed.push({
        name: data.filename,
        reason: err.message || 'Upload failed',
      });
    }

    return reply.send({
      success: failed.length === 0,
      data: { uploaded, failed },
    });
  });

  // Multi-file upload
  app.post('/api/upload/multi', async (request, reply) => {
    const parts = request.files();
    const targetPath = (request.query as Record<string, string>)?.path || '';

    const uploaded: UploadResult[] = [];
    const failed: UploadFailure[] = [];

    for await (const part of parts) {
      try {
        const result = await saveUploadedFile(part.file, part.filename, targetPath);
        uploaded.push(result);
      } catch (err: any) {
        failed.push({
          name: part.filename,
          reason: err.message || 'Upload failed',
        });
      }
    }

    if (uploaded.length > 0) {
      broadcast({
        type: 'upload',
        path: targetPath,
        files: uploaded.map((u) => u.name),
      });
    }

    return reply.send({
      success: failed.length === 0,
      data: { uploaded, failed },
    });
  });
}
