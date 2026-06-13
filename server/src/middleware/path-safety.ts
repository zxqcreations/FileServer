import { FastifyRequest, FastifyReply } from 'fastify';
import { resolveSafePath } from '../utils/path.util.js';
import { config } from '../config.js';

/**
 * Middleware factory that validates a `path` query/body parameter
 * is safe (no path traversal). Attaches the resolved absolute path
 * to the request for downstream handlers.
 */
export function createPathSafetyGuard(paramSource: 'query' | 'body' = 'query') {
  return async function pathSafetyGuard(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const userPath: string | undefined =
      paramSource === 'query'
        ? (request.query as Record<string, string>)?.path
        : (request.body as Record<string, string>)?.path;

    const safe = resolveSafePath(userPath, config.fileStorageRoot);

    if (!safe.valid) {
      reply.status(403).send({
        success: false,
        error: {
          code: safe.error || 'PATH_TRAVERSAL',
          message: 'Access denied: path traversal detected',
        },
      });
      return;
    }

    // Attach resolved path for downstream use
    (request as any).resolvedPath = safe.resolved;
  };
}
