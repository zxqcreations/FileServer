import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  fileStorageRoot: resolve(process.cwd(), process.env.FILE_STORAGE_ROOT || './file_storage'),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10737418240', 10), // 10GB
} as const;
