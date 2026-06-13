import { resolve, normalize, sep } from 'node:path';

export interface PathValidationResult {
  valid: boolean;
  error?: string;
}

export interface SafePathResult extends PathValidationResult {
  resolved?: string;
}

/**
 * Check if a resolved absolute path stays within the allowed root.
 *
 * **IMPORTANT:** This checks path STRINGS only, not filesystem reality.
 * Symlinks inside the storage root that point outside will NOT be caught.
 * Consumers MUST call `fs.realpath` and re-validate before performing
 * filesystem operations.
 */
export function validatePath(resolvedPath: string, rootPath: string): PathValidationResult {
  const normalizedRoot = normalize(rootPath) + sep;
  const normalizedPath = normalize(resolvedPath) + sep;

  if (!normalizedPath.startsWith(normalizedRoot)) {
    return { valid: false, error: 'PATH_TRAVERSAL' };
  }

  return { valid: true };
}

/**
 * Resolve a user-supplied path safely within the file storage root.
 * Accepts undefined (returns root). Rejects paths that escape the root.
 */
export function resolveSafePath(
  userPath: string | undefined,
  rootPath: string
): SafePathResult {
  // Default to root if no path provided
  const rawPath = userPath ?? '.';

  // Reject null bytes (can be used to truncate paths)
  if (rawPath.includes('\0')) {
    return { valid: false, error: 'PATH_TRAVERSAL' };
  }

  // Defense in depth: reject bare .. segments
  const segments = rawPath.split(/[/\\]/);
  if (segments.includes('..')) {
    return { valid: false, error: 'PATH_TRAVERSAL' };
  }

  // Resolve to absolute path
  const absolutePath = resolve(rootPath, rawPath);

  // Validate the resolved path stays within root
  const validation = validatePath(absolutePath, rootPath);
  if (!validation.valid) {
    return { valid: false, error: validation.error };
  }

  return { valid: true, resolved: absolutePath };
}
