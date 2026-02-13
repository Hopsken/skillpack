import { join } from 'node:path';
import { readLockfile } from '../core/lockfile.js';
import { installSkill, verifyIntegrity } from '../core/installer.js';
import { getSkillsDir, exists } from '../util/fs.js';
import { log, spinner } from '../util/logger.js';

export async function installCommand(
  opts: { frozen?: boolean; global?: boolean },
): Promise<void> {
  const lock = await readLockfile();
  const entries = Object.entries(lock.skills);

  if (entries.length === 0) {
    log.info('No skills in lock file. Run `skillpack add` first.');
    return;
  }

  const skillsDir = getSkillsDir(opts.global);
  let installed = 0;
  let skipped = 0;

  for (const [name, entry] of entries) {
    const installPath = join(skillsDir, name);

    // Skip if already installed with matching integrity
    if (await exists(installPath)) {
      if (await verifyIntegrity(installPath, entry.integrity)) {
        skipped++;
        continue;
      }
    }

    if (opts.frozen) {
      log.error(`Integrity mismatch for "${name}" — aborting (--frozen mode)`);
      process.exit(1);
    }

    const spin = spinner(`Installing ${name}`);
    try {
      const { integrity } = await installSkill(name, entry.resolved, {
        global: opts.global,
      });

      if (integrity !== entry.integrity) {
        spin.warn(`${name} installed — integrity differs (upstream content changed)`);
      } else {
        spin.succeed(`Installed ${name}`);
      }
      installed++;
    } catch (err) {
      spin.fail(`Failed to install ${name}`);
      log.error(err instanceof Error ? err.message : String(err));
    }
  }

  log.success(`${installed} installed, ${skipped} up-to-date`);
}
