import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { config } from './config.js';
import { registerErrorHandler } from './middleware/error-handler.js';
import { fileListRoutes } from './routes/files.js';
import { downloadRoutes } from './routes/download.js';
import { uploadRoutes } from './routes/upload.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
    bodyLimit: config.maxFileSize,
    requestTimeout: 0,
    keepAliveTimeout: 7200000, // 2h for long connections
  });

  // Register plugins
  await app.register(cors, { origin: true });
  await app.register(multipart, {
    limits: {
      fileSize: config.maxFileSize,
      files: 100,
    },
  });

  // Error handler
  registerErrorHandler(app);

  // Routes
  await app.register(fileListRoutes);
  await app.register(downloadRoutes);
  await app.register(uploadRoutes);

  // Health check
  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

  // Serve frontend static files in production
  const clientDist = resolve(process.cwd(), 'client', 'dist');
  if (existsSync(clientDist)) {
    await app.register(fastifyStatic, {
      root: clientDist,
      prefix: '/',
      wildcard: false,
    });

    // SPA fallback: serve index.html for non-API routes
    app.setNotFoundHandler((_request, reply) => {
      reply.sendFile('index.html');
    });
  }

  return app;
}
