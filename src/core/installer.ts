import { join } from 'node:path';
import type { ResolvedSkill } from '../types.js';
import { downloadAndExtract } from '../util/tar.js';
import { copyDir, ensureDir, removeDir, exists, getSkillsDir } from '../util/fs.js';
import { computeIntegrity } from './integrity.js';
import { tarballUrl } from '../sources/github.js';

export interface InstallResult {
  integrity: string;
  installPath: string;
}

export async function installSkill(
  name: string,
  resolved: ResolvedSkill,
  opts: { global?: boolean } = {},
): Promise<InstallResult> {
  const skillsDir = getSkillsDir(opts.global);
  const installPath = join(skillsDir, name);

  if (resolved.type === 'local') {
    await ensureDir(skillsDir);
    await removeDir(installPath);
    await copyDir(resolved.localPath!, installPath);
    const integrity = await computeIntegrity(installPath);
    return { integrity, installPath };
  }

  const { owner, repo, commit } = resolved;
  if (!owner || !repo || !commit) {
    throw new Error('Cannot install: missing owner, repo, or commit in resolved skill');
  }

  const url = tarballUrl(owner, repo, commit);
  const { tempDir, contentDir } = await downloadAndExtract(url);

  try {
    let sourceDir = contentDir;
    if (resolved.skill_path) {
      sourceDir = join(contentDir, resolved.skill_path);
      if (!(await exists(sourceDir))) {
        throw new Error(
          `Skill path "${resolved.skill_path}" not found in extracted tarball`,
        );
      }
    }

    await ensureDir(skillsDir);
    await removeDir(installPath);
    await copyDir(sourceDir, installPath);
    const integrity = await computeIntegrity(installPath);
    return { integrity, installPath };
  } finally {
    await removeDir(tempDir);
  }
}

export async function verifyIntegrity(installPath: string, expected: string): Promise<boolean> {
  if (!(await exists(installPath))) return false;
  const actual = await computeIntegrity(installPath);
  return actual === expected;
}
