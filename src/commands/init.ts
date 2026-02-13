import { createManifest, writeManifest, manifestPath } from '../core/manifest.js';
import { exists } from '../util/fs.js';
import { log } from '../util/logger.js';

export async function initCommand(): Promise<void> {
  const path = manifestPath();
  if (await exists(path)) {
    log.warn('skillpack.json already exists');
    return;
  }

  const manifest = createManifest();
  await writeManifest(manifest);
  log.success('Created skillpack.json');
}
