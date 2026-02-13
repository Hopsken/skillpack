import type { SkillSpecifier, ResolvedSkill } from '../types.js';
import * as github from '../sources/github.js';
import { resolveLocal } from '../sources/local.js';

export interface ResolveResult {
  resolved: ResolvedSkill;
  integrity?: string; // Only set for local sources
}

export async function resolve(spec: SkillSpecifier): Promise<ResolveResult> {
  if (spec.type === 'local') {
    const result = await resolveLocal(spec.localPath!);
    return { resolved: result.resolved, integrity: result.integrity };
  }

  const { owner, repo, skillName, versionRange } = spec;
  if (!owner || !repo) throw new Error('Missing owner/repo in specifier');

  let commit: string;
  let ref: string;
  let version: string | undefined;

  if (versionRange) {
    const result = await github.resolveVersionRange(owner, repo, versionRange);
    if (!result) {
      throw new Error(
        `No matching version for ${owner}/${repo}@${versionRange}. ` +
        `Try pinning a specific commit SHA instead.`,
      );
    }
    commit = result.sha;
    version = result.version;
    ref = /^[0-9a-f]{7,40}$/.test(versionRange) ? commit : `v${version}`;
  } else {
    const branch = await github.getDefaultBranch(owner, repo);
    commit = await github.getBranchHeadSha(owner, repo, branch);
    ref = branch;
  }

  // Discover skill_path for mono-repo skills
  let skill_path: string | undefined;
  if (skillName) {
    const candidates = [skillName, `skills/${skillName}`];
    for (const candidate of candidates) {
      if (await github.validatePathExists(owner, repo, commit, candidate)) {
        skill_path = candidate;
        break;
      }
    }
    if (!skill_path) {
      throw new Error(
        `Skill "${skillName}" not found in ${owner}/${repo}@${commit.slice(0, 7)}. ` +
        `Checked paths: ${candidates.join(', ')}`,
      );
    }
  }

  return {
    resolved: {
      type: 'github',
      owner,
      repo,
      commit,
      ref,
      skill_path,
      version,
    },
  };
}
