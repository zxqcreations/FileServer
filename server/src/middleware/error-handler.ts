import { FastifyInstance } from 'fastify';

interface AppError extends Error {
  code?: string;
  statusCode?: number;
}

const ERROR_STATUS_MAP: Record<string, number> = {
  PATH_TRAVERSAL: 403,
  FILE_NOT_FOUND: 404,
  NOT_A_DIRECTORY: 400,
  UPLOAD_FAILED: 500,
  FILE_TOO_LARGE: 413,
  INVALID_PATH: 400,
};

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: AppError, _request, reply) => {
    const code = error.code || 'INTERNAL_ERROR';
    const statusCode = error.statusCode || ERROR_STATUS_MAP[code] || 500;

    app.log.error({ err: error, code }, 'Request error');

    reply.status(statusCode).send({
      success: false,
      error: {
        code,
        message: error.message || 'An unexpected error occurred',
      },
    });
  });
}
