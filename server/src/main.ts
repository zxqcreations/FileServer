import { buildApp } from './app.js';
import { config } from './config.js';
import { mkdir } from 'node:fs/promises';

async function main() {
  // Ensure storage directory exists
  await mkdir(config.fileStorageRoot, { recursive: true });

  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`FileServer running at http://${config.host}:${config.port}`);
    app.log.info(`Storage root: ${config.fileStorageRoot}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
