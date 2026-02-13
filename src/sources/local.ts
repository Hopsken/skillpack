import { resolve } from 'node:path';
import { exists } from '../util/fs.js';
import { computeIntegrity } from '../core/integrity.js';
import type { ResolvedSkill } from '../types.js';

export async function resolveLocal(
  localPath: string,
): Promise<{ resolved: ResolvedSkill; integrity: string }> {
  const absPath = resolve(localPath);
  if (!(await exists(absPath))) {
    throw new Error(`Local skill path not found: ${absPath}`);
  }

  const integrity = await computeIntegrity(absPath);

  return {
    resolved: {
      type: 'local',
      localPath: absPath,
    },
    integrity,
  };
}
