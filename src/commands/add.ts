import {
  expandBatchSpecifier,
  parseSpecifier,
  deriveSkillName,
  serializeSpecifier,
} from '../core/specifier.js';
import { readManifest, writeManifest } from '../core/manifest.js';
import { readLockfile, writeLockfile } from '../core/lockfile.js';
import { resolve } from '../core/resolver.js';
import { installSkill } from '../core/installer.js';
import { log, spinner } from '../util/logger.js';

export async function addCommand(
  specifiers: string[],
  opts: { global?: boolean },
): Promise<void> {
  const manifest = await readManifest();
  const lock = await readLockfile();

  for (const input of specifiers) {
    const expanded = expandBatchSpecifier(input);

    for (const raw of expanded) {
      const spec = parseSpecifier(raw);
      const name = deriveSkillName(spec);
      const specString = serializeSpecifier(spec);

      const spin = spinner(`Resolving ${name}`);

      try {
        const { resolved, integrity: localIntegrity } = await resolve(spec);

        spin.text = `Installing ${name}`;
        const { integrity } = await installSkill(name, resolved, {
          global: opts.global,
        });

        manifest.skills[name] = specString;
        lock.skills[name] = {
          specifier: specString,
          resolved,
          integrity: localIntegrity || integrity,
          resolved_at: new Date().toISOString(),
        };

        spin.succeed(`Added ${name}`);
      } catch (err) {
        spin.fail(`Failed to add ${name}`);
        log.error(err instanceof Error ? err.message : String(err));
      }
    }
  }

  await writeManifest(manifest);
  await writeLockfile(lock);
}
